#!/usr/bin/env bash
# setup-env.sh — guided bootstrap for the repository's .env file.
#
# Parses .env.example block by block (a block is a run of `# …` comment
# lines followed by a single KEY=default line), prompts the user for each
# variable, and writes .env at the repository root. Never overwrites an
# existing .env. Falls back to defaults silently when no TTY is attached.

set -euo pipefail

# Resolve the repository root relative to this script so `make env` works
# regardless of the invoker's working directory.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"

EXAMPLE="$REPO_ROOT/.env.example"
OUTPUT="$REPO_ROOT/.env"

if [[ -f "$OUTPUT" ]]; then
  echo "[env] .env already exists at $OUTPUT"
  echo "[env] Delete it first if you want to regenerate; this script will not overwrite."
  exit 0
fi

if [[ ! -f "$EXAMPLE" ]]; then
  echo "[env] ERROR: $EXAMPLE not found." >&2
  exit 1
fi

# Detect whether we can actually open /dev/tty for reading. Relying on
# `test -r /dev/tty` is not enough: the file can report as readable from
# the parent shell's perspective yet still fail to open when stdin has
# been redirected. An explicit open is the reliable probe.
INTERACTIVE=1
if ! { : < /dev/tty; } 2>/dev/null; then
  INTERACTIVE=0
fi

if [[ "$INTERACTIVE" -eq 0 ]]; then
  cp "$EXAMPLE" "$OUTPUT"
  echo "[env] No TTY detected; wrote $OUTPUT using defaults from .env.example."
  echo "[env] Edit the file by hand if any variable needs a non-default value."
  exit 0
fi

echo "[env] Guided bootstrap for $OUTPUT"
echo "[env] Press Enter at any prompt to accept the default (blank is OK for variables you don't need)."
echo

tmp_out="$(mktemp)"
trap 'rm -f "$tmp_out"' EXIT

flush_block() {
  local key="$1"
  local default="$2"
  local comments="$3"

  printf -- '── %s ──\n' "$key"
  if [[ -n "$comments" ]]; then
    # Print each comment line indented by two spaces for readability.
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      printf '  %s\n' "$line"
    done <<< "$comments"
  fi
  if [[ -n "$default" ]]; then
    printf '  [default: %s]\n' "$default"
  else
    printf '  [default: blank — leave empty if you do not need this variable]\n'
  fi
  printf 'Value: '

  local user_value
  case "$key" in
    # Password-bearing variables: read silently so the value does not
    # echo to the screen (and therefore does not enter `script` /
    # terminal-recording transcripts) and do not leak into shell
    # history.
    *PASSWORD*|*SECRET*|*TOKEN*)
      IFS= read -rs user_value < /dev/tty
      printf '\n'
      ;;
    *)
      IFS= read -r user_value < /dev/tty
      ;;
  esac
  local final_value="${user_value:-$default}"

  # Emit the original comment block into the generated .env so manual
  # editors keep the same guidance inline.
  if [[ -n "$comments" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      printf '# %s\n' "$line" >> "$tmp_out"
    done <<< "$comments"
  fi
  printf '%s=%s\n\n' "$key" "$final_value" >> "$tmp_out"
  echo
}

block_comments=""

while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  case "$raw_line" in
    '#'*)
      # Strip the leading "# " (or "#") so we can re-emit it cleanly.
      stripped="${raw_line#\#}"
      stripped="${stripped# }"
      block_comments+="$stripped"$'\n'
      ;;
    '')
      # Blank lines are block separators. The next KEY=default will
      # flush whatever comments we have accumulated so far. Keep
      # accumulating silently if comments have not yet been flushed.
      :
      ;;
    *=*)
      key="${raw_line%%=*}"
      default="${raw_line#*=}"
      flush_block "$key" "$default" "$block_comments"
      block_comments=""
      ;;
  esac
done < "$EXAMPLE"

# Remove trailing blank line if present to keep the file tidy.
if [[ -s "$tmp_out" ]]; then
  # Use sed to strip trailing blank lines in a portable way.
  awk 'BEGIN{RS=""; ORS="\n"} {print}' "$tmp_out" > "$tmp_out.trim"
  mv "$tmp_out.trim" "$tmp_out"
fi

mv "$tmp_out" "$OUTPUT"
trap - EXIT

echo "[env] Wrote $OUTPUT"
echo "[env] Re-run this script after deleting .env if you need to regenerate it."
