#!/usr/bin/env bash
# run-scans.sh — orchestrate the OWASP-Top-10-aligned security scan.
#
# Each invocation creates a timestamped subdirectory under
# `security-reports/` (e.g. `security-reports/2026-04-27-114740/`) and
# writes every per-tool artefact into it, then calls the aggregator
# which produces `…/REPORT.md` inside that same run directory. Exit
# status is the aggregator's exit status (non-zero when the report
# contains any `critical` finding).
#
# A `security-reports/latest` symlink always points at the most recent
# run, so `cat security-reports/latest/REPORT.md` is stable across
# runs without the operator having to remember the timestamp.
#
# Old runs are auto-trimmed: by default the last 10 are kept; override
# with `SECURITY_REPORT_KEEP=N` (set N=0 to disable trimming).
#
# Each scanner runs in a try-and-continue posture: a single tool
# failure (e.g. pip-audit can't reach PyPI) doesn't abort the run; the
# error is captured into the artefact and surfaced in the report.

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." &>/dev/null && pwd)"
REPORT_DIR="$REPO_ROOT/security-reports"
KEEP="${SECURITY_REPORT_KEEP:-10}"

# Opt-in DAST step. When unset (default), no ZAP work happens, no
# image pull, no e2e stack lifecycle. Set to 1 to add a 6th scanner
# that runs OWASP ZAP's baseline (passive) scan against the isolated
# e2e stack.
WITH_DAST="${WITH_DAST:-0}"
ZAP_IMAGE="${ZAP_IMAGE:-zaproxy/zap-stable}"
ZAP_TARGET="${ZAP_TARGET:-http://frontend-e2e:3000/}"
E2E_NETWORK="${E2E_NETWORK:-happy-calendar-e2e}"

# Per-run subdirectory. The format is `YYYY-MM-DD-HHMMSS` so a
# directory listing sorts chronologically without any extra plumbing.
RUN_NAME="$(date '+%Y-%m-%d-%H%M%S')"
RUN_DIR="$REPORT_DIR/$RUN_NAME"

mkdir -p "$RUN_DIR"

echo "[security] Run directory: $RUN_DIR"

# Several scanners run via `docker compose exec backend …`, which
# requires the backend service to be up. We don't want a silent run
# where every tool falls back to its empty-JSON placeholder because
# the operator forgot `make up` — that produces a clean-looking
# REPORT.md that's actually meaningless.
echo "[security] Ensuring the backend service is up..."
if ! docker compose up -d backend >/dev/null 2>&1; then
  echo "[security] ERROR: failed to start the backend service via docker compose." >&2
  echo "[security] Run \`make up\` manually and re-try, or inspect \`docker compose logs backend\`." >&2
  exit 1
fi

# Wait briefly for the container to be ready to exec into. A fresh
# `up -d` returns as soon as the container is created, but a
# `migrate && runserver` startup needs a couple of seconds before
# `exec` will work cleanly.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if docker compose exec -T backend python -c 'pass' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo

# 1. Bandit — Python static analysis on the backend.
echo "[security] [1/5] Running bandit..."
docker compose exec -T backend bandit \
  -r . \
  -c bandit.yaml \
  -f json \
  -o /tmp/bandit.json \
  >"$RUN_DIR/bandit.stdout" 2>"$RUN_DIR/bandit.stderr" || true
docker compose exec -T backend cat /tmp/bandit.json > "$RUN_DIR/bandit.json" 2>/dev/null || \
  echo '{"errors": [{"reason": "bandit produced no JSON output"}], "results": []}' > "$RUN_DIR/bandit.json"

# 2. pip-audit — Python deps CVE check.
echo "[security] [2/5] Running pip-audit..."
docker compose exec -T backend pip-audit \
  -r requirements.txt \
  --format json \
  --progress-spinner off \
  --output /tmp/pip-audit.json \
  >"$RUN_DIR/pip-audit.stdout" 2>"$RUN_DIR/pip-audit.stderr" || true
docker compose exec -T backend cat /tmp/pip-audit.json > "$RUN_DIR/pip-audit.json" 2>/dev/null || \
  echo '{"dependencies": [], "errors": ["pip-audit produced no JSON output"]}' > "$RUN_DIR/pip-audit.json"

# 3. npm audit — Node deps CVE check on the frontend.
echo "[security] [3/5] Running npm audit..."
# `npm audit` requires a populated node_modules. We reuse the project's
# pinned image (node:24-alpine matches frontend/Dockerfile) and install
# only when needed. The audit runs against the ALREADY-installed
# node_modules to keep the run fast on subsequent calls.
docker run --rm \
  -v "$REPO_ROOT/frontend:/app" \
  -w /app \
  node:24-alpine \
  sh -c 'if [ ! -d node_modules ]; then npm ci --silent; fi; npm audit --json' \
  > "$RUN_DIR/npm-audit.json" 2> "$RUN_DIR/npm-audit.stderr" || true

# 4. Django check --deploy — framework misconfig check.
# DEBUG=False forces the deploy-mode warnings to surface (they are
# silently downgraded under DEBUG=True). We run inside the existing
# backend container.
echo "[security] [4/5] Running Django check --deploy..."
docker compose exec -T -e DEBUG=False backend python manage.py check --deploy --fail-level WARNING \
  >"$RUN_DIR/django-check.txt" 2>&1 || true

total_steps=5
if [[ "$WITH_DAST" == "1" ]]; then
  total_steps=6
fi

# 5. Custom OWASP Django test suite.
echo "[security] [5/$total_steps] Running security_tests Django app..."
docker compose exec -T backend python manage.py test security_tests --verbosity 2 \
  >"$RUN_DIR/owasp-tests.txt" 2>&1 || true

# 6. (opt-in) OWASP ZAP baseline DAST against the isolated e2e stack.
#    Brings the e2e stack up if needed (idempotent), runs zap-baseline.py,
#    captures JSON + Markdown reports, and tears the stack back down.
if [[ "$WITH_DAST" == "1" ]]; then
  echo "[security] [6/6] Running OWASP ZAP baseline scan..."
  echo "[security]   Bringing up isolated e2e stack as DAST target..."
  if ! make -C "$REPO_ROOT" e2e-up >"$RUN_DIR/zap-baseline.setup.log" 2>&1; then
    echo "[security]   ERROR: failed to bring up e2e stack — DAST step skipped." >&2
    echo '{"site": [], "errors": ["e2e stack failed to come up"]}' > "$RUN_DIR/zap-baseline.json"
  else
    # ZAP runs as the `zap` user inside the container; the work
    # directory needs to be writable by that user. We mount the
    # run dir at /zap/wrk (ZAP's expected work-dir convention) and
    # let the JSON / Markdown reports land there.
    chmod a+rwx "$RUN_DIR"
    docker run --rm \
      --network="$E2E_NETWORK" \
      -v "$RUN_DIR:/zap/wrk:rw" \
      "$ZAP_IMAGE" \
      zap-baseline.py \
        -t "$ZAP_TARGET" \
        -J zap-baseline.json \
        -w zap-baseline.md \
        -I \
      >"$RUN_DIR/zap-baseline.stdout" 2>"$RUN_DIR/zap-baseline.stderr" || true

    if [[ ! -s "$RUN_DIR/zap-baseline.json" ]]; then
      echo '{"site": [], "errors": ["zap-baseline produced no JSON output"]}' > "$RUN_DIR/zap-baseline.json"
    fi

    echo "[security]   Tearing down e2e stack..."
    make -C "$REPO_ROOT" e2e-down >"$RUN_DIR/zap-baseline.teardown.log" 2>&1 || true
  fi
fi

echo
echo "[security] Aggregating findings into REPORT.md..."
python3 "$SCRIPT_DIR/generate-report.py" "$RUN_DIR"
status=$?

# Maintain a `latest` symlink that always points at the most recent
# run directory. Operators can `cat security-reports/latest/REPORT.md`
# without having to remember the timestamp. We use a relative target
# so the symlink stays valid if the repo is moved.
ln -snf "$RUN_NAME" "$REPORT_DIR/latest"

# Trim old runs. Default to keeping the most recent 10; override via
# SECURITY_REPORT_KEEP (set to 0 to disable). Only directories whose
# names match the timestamped run pattern are candidates for deletion;
# `.gitkeep`, `latest`, and any other directory are left untouched.
if [[ "$KEEP" -gt 0 ]]; then
  # Glob pattern (`YYYY-MM-DD-HHMMSS`) is portable between BSD find
  # (macOS) and GNU find (linux); -regex differs between them.
  old_runs=()
  while IFS= read -r d; do
    [[ -n "$d" ]] && old_runs+=("$d")
  done < <(
    find "$REPORT_DIR" -maxdepth 1 -type d \
      -name '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]' \
      | sort -r \
      | tail -n +"$((KEEP + 1))"
  )
  if [[ "${#old_runs[@]}" -gt 0 ]]; then
    echo "[security] Trimming ${#old_runs[@]} old run(s) (keeping the most recent $KEEP)..."
    for d in "${old_runs[@]}"; do
      rm -rf "$d"
    done
  fi
fi

echo
if [[ "$status" -eq 0 ]]; then
  echo "[security] Done — no critical findings. Open the report:"
else
  echo "[security] Done — report contains CRITICAL findings (exit $status)."
  echo "[security] Read the 'Findings by OWASP category' section for details:"
fi
echo "  $RUN_DIR/REPORT.md"
echo "  (also reachable as: $REPORT_DIR/latest/REPORT.md)"
exit "$status"
