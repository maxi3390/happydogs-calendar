# Proposal: Bootstrap `.env` From Example With Guided `make env`

## Intent

A fresh clone of this repository starts with `.env.example` but no `.env`. Docker Compose silently expands unset variables to the empty string, which turns every Traefik `Host(${DOMAIN})` rule into `Host()` — matching nothing — and the whole stack returns 404 on `http://localhost/`. The only hint is a warning that scrolls past during container startup. This change adds a guided `make env` target that creates a working `.env` from `.env.example`, teaches `.env.example` to be self-documenting, and updates `AGENTS.md` so new contributors hit the happy path without any tribal knowledge.

## Scope

In scope:
- Introduce a new tooling capability `tooling/env-bootstrap` that defines the contract for how the repository bootstraps local `.env` configuration.
- Rewrite `.env.example` with per-variable comments that explain what each variable does, whether it is required for local development, and what the default should be. Prod-only variables (Cloudflare DNS token, Let's Encrypt email) get blank defaults so copying the file gives a working local stack.
- Add `scripts/setup-env.sh`: an interactive wizard that walks each variable, shows its documentation and default, prompts for a value, and accepts a blank entry either as "keep the default" or as "leave this variable empty because it is not needed for my setup". Runs non-destructively (refuses to overwrite an existing `.env`) and falls back to defaults when not attached to a TTY.
- Add a `make env` target that invokes the wizard.
- Make `make init` depend on a present `.env` so first-time setup can't silently 404 the stack. If `.env` is missing, `make init` invokes `make env` first.
- Teach `make upgrade` to warn (not fail) when `.env` is missing, so a broken production deployment isn't introduced by the rule but is still visibly called out.
- Document the new flow in the root `AGENTS.md`: add a `make env` row to the Makefile table, add a short "Environment variables" section explaining which variables exist and when they are required.

Out of scope:
- Mandating secrets management (Vault, SOPS, etc.). `.env` is a local-dev convenience, not a production secret store — this change doesn't speak to how production deployments obtain credentials.
- Rewriting the existing variable names. `DOMAIN`, `NEXT_PUBLIC_API_URL`, `DOCKER_SOCKET`, `CF_DNS_API_TOKEN`, and `ACME_EMAIL` keep their current keys.
- Validating the content of each variable (e.g. "is this a URL?"). The wizard stays simple; shape validation lives in the backend when the variable is actually consumed.
- CI enforcement. No CI job is added here to reject PRs that break the `.env.example` format; that's a separate infrastructure concern.

## Approach

- `.env.example` becomes the single source of truth for variable names, descriptions, and whether a variable is required for local development. Each variable is preceded by a comment block that humans (and the wizard) read.
- `scripts/setup-env.sh` parses the example file block-by-block. A "block" is a run of `#`-prefixed comment lines followed by a single `KEY=default` line. The wizard shows the comments, shows the default (or notes that the variable is optional when the default is blank), and accepts user input. Empty input means "use the default as-is" — which is also how blanks survive for prod-only variables.
- `make env` calls the wizard. It is idempotent: re-running on a project that already has `.env` prints a notice and exits 0 (never overwrites). If the user wants to regenerate, they delete `.env` first.
- `make init` gains an `env-check` prerequisite that invokes `make env` when `.env` is absent. Fresh clones now flow: clone → `make init` → wizard → stack comes up green.
- `make upgrade` prints a one-line warning (not an error) when `.env` is missing. Production operators usually want the upgrade to proceed; the message surfaces the missing file so they can remediate.
- `AGENTS.md` adds a table entry and a short "Environment variables" section that points at `make env` and describes which variables are local-dev-required vs production-only.
