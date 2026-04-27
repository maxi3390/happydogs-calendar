#!/usr/bin/env bash
# run-scans.sh — orchestrate the OWASP-Top-10-aligned security scan.
#
# Runs five scanners in sequence, writes per-tool artefacts to
# `security-reports/`, then calls the aggregator which produces
# `security-reports/REPORT.md`. Exit status is the aggregator's exit
# status (non-zero when the report contains any `critical` finding).
#
# Each scanner runs in a try-and-continue posture: a single tool
# failure (e.g. pip-audit can't reach PyPI) doesn't abort the run; the
# error is captured into the artefact and surfaced in the report.

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." &>/dev/null && pwd)"
REPORT_DIR="$REPO_ROOT/security-reports"

mkdir -p "$REPORT_DIR"

# Wipe per-run artefacts but keep .gitkeep so the directory stays in
# git history.
find "$REPORT_DIR" -mindepth 1 ! -name '.gitkeep' -exec rm -rf {} +

echo "[security] Reports will be written to $REPORT_DIR"
echo

# 1. Bandit — Python static analysis on the backend.
echo "[security] [1/5] Running bandit..."
docker compose exec -T backend bandit \
  -r . \
  -c bandit.yaml \
  -f json \
  -o /tmp/bandit.json \
  >"$REPORT_DIR/bandit.stdout" 2>"$REPORT_DIR/bandit.stderr" || true
docker compose exec -T backend cat /tmp/bandit.json > "$REPORT_DIR/bandit.json" 2>/dev/null || \
  echo '{"errors": [{"reason": "bandit produced no JSON output"}], "results": []}' > "$REPORT_DIR/bandit.json"

# 2. pip-audit — Python deps CVE check.
echo "[security] [2/5] Running pip-audit..."
docker compose exec -T backend pip-audit \
  -r requirements.txt \
  --format json \
  --progress-spinner off \
  --output /tmp/pip-audit.json \
  >"$REPORT_DIR/pip-audit.stdout" 2>"$REPORT_DIR/pip-audit.stderr" || true
docker compose exec -T backend cat /tmp/pip-audit.json > "$REPORT_DIR/pip-audit.json" 2>/dev/null || \
  echo '{"dependencies": [], "errors": ["pip-audit produced no JSON output"]}' > "$REPORT_DIR/pip-audit.json"

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
  > "$REPORT_DIR/npm-audit.json" 2> "$REPORT_DIR/npm-audit.stderr" || true

# 4. Django check --deploy — framework misconfig check.
# DEBUG=False forces the deploy-mode warnings to surface (they are
# silently downgraded under DEBUG=True). We run inside the existing
# backend container.
echo "[security] [4/5] Running Django check --deploy..."
docker compose exec -T -e DEBUG=False backend python manage.py check --deploy --fail-level WARNING \
  >"$REPORT_DIR/django-check.txt" 2>&1 || true

# 5. Custom OWASP Django test suite.
echo "[security] [5/5] Running security_tests Django app..."
docker compose exec -T backend python manage.py test security_tests --verbosity 2 \
  >"$REPORT_DIR/owasp-tests.txt" 2>&1 || true

echo
echo "[security] Aggregating findings into REPORT.md..."
python3 "$SCRIPT_DIR/generate-report.py" "$REPORT_DIR"
status=$?

echo
if [[ "$status" -eq 0 ]]; then
  echo "[security] Done — no critical findings. Open the report:"
else
  echo "[security] Done — report contains CRITICAL findings (exit $status)."
  echo "[security] Read the 'Findings by OWASP category' section for details:"
fi
echo "  $REPORT_DIR/REPORT.md"
exit "$status"
