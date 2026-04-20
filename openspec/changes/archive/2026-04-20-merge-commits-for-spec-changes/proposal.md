# Proposal: Always Use Merge Commits for Spec Changes

## Intent

Every non-trivial change in this repository lives inside an OpenSpec change folder (`openspec/changes/<slug>/`) and ends its life archived into `openspec/changes/archive/YYYY-MM-DD-<slug>/` with any delta spec content folded back into the live specs under `openspec/specs/`. Today, the git workflow on how these branches land on `master` is informal: contributors can rebase, fast-forward, or merge. This change codifies that spec-bearing branches SHALL be integrated into `master` with an explicit merge commit (`git merge --no-ff`).

Using a merge commit per spec change gives the project a single, greppable commit in `master`'s history that groups together:

- the implementation,
- the OpenSpec change folder that justified it,
- the archival step (when done in the same merge) or its follow-up,
- any migrations and tests that came with it.

This makes `git log --merges master` a reliable changelog of the product's evolution and makes reverts atomic (`git revert -m 1 <merge-sha>` rolls back the whole change, including its spec).

## Scope

In scope:
- Add a new tooling capability `openspec/specs/tooling/git-workflow/` that defines when merge commits are required and when they are not.
- Define the required merge behavior for any branch whose diff includes changes under `openspec/changes/<new-slug>/` or a new `openspec/specs/<capability>/<feature>/` directory (i.e. an OpenSpec change branch).
- Define the required merge commit message format so the merge commit is self-describing and links back to the change slug.
- Update the root `AGENTS.md` "Git workflow" and "OpenSpec workflow" sections so coding agents and human contributors point the user at `git merge --no-ff` when asked to suggest a merge command.
- Note that pushing and merging remain a user action (agents still do not push or merge), but when the user does merge, the rule stated here applies.

Out of scope:
- Enforcing the rule automatically through server-side hooks or GitLab/GitHub settings — that's an infrastructure concern and can be added later once the rule is documented.
- Changing the policy for non-spec branches (e.g. a trivial typo fix `fix/readme-typo` with no OpenSpec change folder). Those can still fast-forward; keeping the rule narrow avoids noisy merge commits for chores.
- Retroactively rewriting history for previously archived changes.

## Approach

- **New tooling spec**: add `openspec/specs/tooling/git-workflow/spec.md` with a single requirement — "Spec Change Merges Use Merge Commits" — and scenarios that cover the happy path, a chore-branch exception, and the commit message format.
- **AGENTS.md update**: add a short subsection under "Git workflow" titled "Merging spec changes" with the one-liner rule and the canonical command (`git checkout master && git merge --no-ff -m "Merge change/<slug>" <branch>`), and cross-reference the tooling spec.
- **Change folder**: place the delta for the new capability under `openspec/changes/merge-commits-for-spec-changes/specs/tooling/git-workflow/spec.md`, following the existing archived-change examples.
- No code changes, no CI changes, no scripts. The rule is enforced socially through the documented convention and, eventually, through the spec itself being visible to anyone reviewing a merge.
