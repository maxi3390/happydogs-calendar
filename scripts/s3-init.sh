#!/usr/bin/env bash
# s3-init.sh — bootstrap the bundled Garage instance for backend use.
#
# Idempotent: safe to re-run on an already-bootstrapped Garage. Exits 0
# in both fresh and steady-state runs; only errors if Garage isn't
# running or the operator's .env is incomplete.
#
# Steps (each guarded by an existence check):
#   1. Verify the ``garage`` Compose service is running under the s3 profile.
#   2. Create bucket $S3_BUCKET_NAME.
#   3. Import access key ($S3_ACCESS_KEY_ID, $S3_SECRET_ACCESS_KEY).
#   4. Grant the key read+write on the bucket.
#
# Spec: ``openspec/specs/tooling/object-storage/spec.md``.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"

# Source .env so the same vars docker compose interpolates into the
# garage service are visible to the bash side too.
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

cd "$REPO_ROOT"

: "${S3_BUCKET_NAME:?S3_BUCKET_NAME must be set in .env}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID must be set in .env}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY must be set in .env}"

# Convenience wrapper — every Garage CLI invocation runs inside the
# already-running container. ``-T`` disables TTY allocation so the
# output is greppable from CI.
garage() {
  docker compose --profile s3 exec -T garage /garage "$@"
}

# Step 1 — running guard.
if ! docker compose --profile s3 ps garage --format '{{.State}}' 2>/dev/null | grep -q running; then
  echo "[s3-init] ERROR: garage service is not running." >&2
  echo "  Start it first with:  docker compose --profile s3 up -d" >&2
  exit 1
fi

echo "[s3-init] Garage is up. Bootstrapping bucket=$S3_BUCKET_NAME key=$S3_ACCESS_KEY_ID..."

# Step 1.5 — assign single-node layout if the cluster has none. Garage
# 1.0 requires a layout before bucket / key operations work; without
# one, every CLI command returns "Could not reach quorum". The layout
# stays in metadata after the first apply, so subsequent runs detect
# "NO ROLE ASSIGNED" missing and skip this step.
if garage status 2>&1 | grep -q 'NO ROLE ASSIGNED'; then
  NODE_ID=$(garage status 2>&1 | awk '/^[a-f0-9]+/ { print $1; exit }')
  if [[ -z "$NODE_ID" ]]; then
    echo "[s3-init] ERROR: could not parse node id from 'garage status'." >&2
    exit 1
  fi
  # Node id has to come BEFORE the multi-value ``--tag`` flag,
  # otherwise the CLI parser reads it as a tag value and the
  # ``<node-ids>...`` positional ends up empty.
  garage layout assign "$NODE_ID" --capacity 100G --zone dc1 --tag local >/dev/null
  garage layout apply --version 1 >/dev/null
  echo "[s3-init]   single-node layout assigned (100G, zone=dc1)."
else
  echo "[s3-init]   layout already assigned — skipping."
fi

# Step 2 — create bucket if missing.
if garage bucket info "$S3_BUCKET_NAME" &>/dev/null; then
  echo "[s3-init]   bucket '$S3_BUCKET_NAME' already exists — skipping."
else
  garage bucket create "$S3_BUCKET_NAME" >/dev/null
  echo "[s3-init]   bucket '$S3_BUCKET_NAME' created."
fi

# Step 3 — import key if missing. ``key info`` prints to stdout if the
# key exists; the existence check uses its exit code.
#
# Garage 1.0 supports ``key import <id> <secret>`` non-interactively via
# the ``--yes`` flag (acknowledges that importing a known secret is the
# operator's responsibility). When the key already exists Garage errors
# out — we treat that as the success path here.
if garage key info "$S3_ACCESS_KEY_ID" &>/dev/null; then
  echo "[s3-init]   key '$S3_ACCESS_KEY_ID' already exists — skipping import."
else
  garage key import "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" --yes >/dev/null
  echo "[s3-init]   key '$S3_ACCESS_KEY_ID' imported."
fi

# Step 4 — grant read+write. ``bucket allow`` is idempotent — re-running
# with the same flags is a no-op once the key already has the perm.
garage bucket allow --read --write "$S3_BUCKET_NAME" --key "$S3_ACCESS_KEY_ID" >/dev/null
echo "[s3-init]   bucket allow read+write granted."

echo "[s3-init] Done. Backend uploads will now land in '$S3_BUCKET_NAME'."
