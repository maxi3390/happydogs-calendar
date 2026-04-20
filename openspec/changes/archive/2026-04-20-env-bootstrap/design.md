# Design: Bootstrap `.env` From Example With Guided `make env`

## Context

Docker Compose reads shell-style `${VAR}` references in `docker-compose.yml` and expands unset variables to the empty string, with a warning printed once per invocation. This repo uses `Host(${DOMAIN})` and `${NEXT_PUBLIC_API_URL}` extensively; when `.env` is missing, the warnings scroll past and every Traefik Host rule matches nothing — the entire stack looks fine (`docker compose ps` shows everything Up) but every request returns 404.

Observed breakage: `http://localhost/` → 404 after a fresh clone, until the user runs `cp .env.example .env` by hand. The only signal that pointed at the root cause was the warning `"The DOMAIN variable is not set. Defaulting to a blank string."` printed every time `docker compose` was invoked.

We want three things:

1. A fresh clone must be able to reach a working stack via `make init` without the contributor reading any doc other than running the target.
2. The `.env.example` file must explain each variable well enough that editing it by hand is never guesswork.
3. The repository must fail loudly, not silently, when `.env` is missing at deployment time.

## Decisions

### 1. Introduce `tooling/env-bootstrap` as a new capability

`tooling/upgrade` exists and documents `make upgrade`. `tooling/build-integrity` (from the last change) documents the frontend-build invariants. "How local `.env` gets created" is a distinct concern from either, so we give it its own capability rather than overloading an existing one.

The new spec defines three requirements:

- `.env.example` is the source of truth for every variable the stack needs, with per-variable documentation.
- `make env` creates `.env` interactively or via defaults, and is idempotent (never overwrites).
- `make init` depends on a present `.env`; `make upgrade` warns when `.env` is missing.

### 2. `.env.example` format: block-per-variable, comments explain purpose and defaults

Each variable is preceded by one or more `# …` comment lines that describe:

- What the variable controls (plain English).
- Whether it is required for local development.
- What the default should be.

Example:

```
# Domain used by Traefik for Host-based routing. For local development
# set this to "localhost"; for a real deployment, set it to your public
# hostname (e.g. "nursery.example.com"). Required.
DOMAIN=localhost

# Cloudflare API token for Let's Encrypt DNS-01 challenges. Leave blank
# for local development; only required when issuing real TLS certificates
# via Cloudflare in production.
CF_DNS_API_TOKEN=
```

Why comments in `.env.example` rather than a separate metadata file? Because they travel with the variable, they survive renames, and because the wizard can read them without any separate schema. Users editing the file by hand get the same guidance.

### 3. `scripts/setup-env.sh` parses `.env.example` block by block

A "block" is: a run of `#`-prefixed comment lines, optional blank lines, then a single `KEY=default` line. The script parses the file line-by-line, accumulates comments until it sees a `KEY=default`, flushes a block (prints comments + prompts), then resets.

For each block:

- Print a short header (`-- KEY --`).
- Print the accumulated comments as human-readable guidance.
- Print the default (if non-blank) or a note that blank is acceptable for variables not needed for the user's setup.
- Prompt `Value: ` and read one line from `/dev/tty`.
- Empty input → use the default exactly as-is. This is how `DOMAIN=localhost` stays `localhost` and how `CF_DNS_API_TOKEN=` stays blank in a single uniform path.

The resulting `.env` preserves the comment blocks so a later contributor who opens it manually still sees the same guidance.

### 4. Idempotency and non-TTY fallback

- **Idempotency**: the script refuses to overwrite an existing `.env`. If the user wants to regenerate, they `rm .env` first. This avoids accidental clobbering of production credentials.
- **Non-TTY fallback**: `read < /dev/tty` fails in environments without a controlling terminal (e.g. CI, `docker exec` without `-it`). The script detects this (test with `[ -r /dev/tty ]`) and silently uses the defaults from `.env.example`, printing a single-line notice so the operator knows the non-interactive path was taken. This keeps `make env` safe to call from `make init` when stdout is piped somewhere.

### 5. Make target wiring

- `make env` → runs the wizard. Idempotent by the script's contract.
- `make init` → depends on a present `.env`. Implemented as `init: env-check build up migrate create-admin`, where `env-check` is a private target that invokes `$(MAKE) env` only when `.env` is missing. Fresh clone: `make init` runs the wizard first, then the usual flow.
- `make upgrade` → prints a warning (not an error) when `.env` is absent, pointing at `make env`. Production operators usually want the upgrade to proceed even with a stale or missing `.env`; we surface it loudly without breaking the pipeline.

### 6. Safe local-dev defaults in `.env.example`

Previously, `.env.example` had prod-oriented placeholders: `CF_DNS_API_TOKEN=your_cloudflare_api_token_here` and `ACME_EMAIL=cloudflare@email.com`. Copying that verbatim gave a `.env` that looked correct but contained obviously-fake Cloudflare credentials.

Change the prod-only variables to blank defaults: `CF_DNS_API_TOKEN=` and `ACME_EMAIL=`. Copying the example now yields a `.env` that boots a local stack cleanly; production deployers override these as part of their infrastructure setup anyway. The comments explicitly say "leave blank for local development".

### 7. AGENTS.md placement

The canonical agent doc gains:

- One new row in the "Makefile — essential commands" table: `make env` → "Create `.env` interactively from `.env.example`".
- A new "Environment variables" section right after that table, describing which variables are local-dev-required vs production-only, and pointing at `make env` as the canonical way to populate them.

## Risks / Trade-offs

- **Existing `.env` users unaffected** — the wizard is non-destructive. Anyone who already has a hand-written `.env` sees no change.
- **Comments in `.env.example` can drift** from reality. Mitigation: the wizard reads them live, so if the text is wrong, contributors edit the example file and all future `make env` runs benefit. The live spec requires `.env.example` to document every variable, giving a lint surface for future CI.
- **Shell portability**. `scripts/setup-env.sh` sticks to POSIX-ish bash (no `mapfile`, no `declare -A`). Tested against Bash 4+ and macOS `/bin/bash` (3.2). If someone is on pure POSIX `sh`, `make env` invokes `/usr/bin/env bash` explicitly.
- **`make init` now calls a sub-make** to recurse into `env`. Standard Make behavior; not a performance concern.
- **Production CI that runs `make upgrade` without `.env`** will now see a warning line. If that breaks a log parser, the warning can be suppressed via `ENV_WARN=0 make upgrade` — not implementing this until someone asks.
