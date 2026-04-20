# Design: Always Use Merge Commits for Spec Changes

## Context

This repo uses OpenSpec (`openspec/specs/`, `openspec/changes/`) as its source of truth for behavioural specifications. Non-trivial work follows a three-step lifecycle:

1. **Propose**: create a branch and an `openspec/changes/<slug>/` folder with proposal/design/tasks and delta spec files.
2. **Implement**: code the change, keep the delta spec in lockstep, commit on the feature branch.
3. **Archive**: when merged, move `openspec/changes/<slug>/` to `openspec/changes/archive/YYYY-MM-DD-<slug>/` and fold the delta into `openspec/specs/`.

What's missing is a rule for the *merge step itself*. Today, `master` has a mostly-linear history (`git log --oneline` shows each archived change as its own individual commit on `master`). That is fine for small chores but hides the boundary between spec changes: if you revert `feat(owners): structured address with reusable Address abstract mixin`, you still have to separately revert its `chore: archive …` commit. And `git log --merges` returns nothing useful.

This change enforces a merge commit per spec change so that each change becomes one atomic, revertible, greppable node in the history graph.

## Decisions

### 1. Scope of the rule: "spec change branches"

A branch is a **spec change branch** if, compared to `master`, it adds:

- any new folder under `openspec/changes/<slug>/` (new proposal), AND/OR
- any new folder under `openspec/specs/<capability>/<feature>/` (new capability or new feature spec baseline), AND/OR
- a move of `openspec/changes/<slug>/` to `openspec/changes/archive/YYYY-MM-DD-<slug>/` (archival).

Any such branch SHALL be merged into `master` with `git merge --no-ff`.

All other branches (docstring typo, README polish, CI config tweaks with no spec implication) MAY fast-forward.

Why narrow: a per-PR merge commit is overkill for trivial chores and clutters history. Tying the rule to spec activity matches the project's decision that specs are what deserve ceremony.

Alternative considered: require merge commits for every branch. Rejected — noise, and not what the user asked for.

### 2. Merge commit message format

The merge commit message SHALL follow:

```
Merge change/<slug>

<one-line summary, imperative mood>

Archives openspec/changes/<slug> → openspec/changes/archive/<YYYY-MM-DD>-<slug>
```

- First line: `Merge change/<slug>` — consistent prefix so `git log --merges --grep '^Merge change/'` produces a clean list.
- Body: same style as conventional commits (imperative "add", "fix", …), but the `type(scope):` prefix is **not** required on the merge commit itself; the individual commits on the branch already carry that structure.
- If the merge also archives the change folder, the "Archives …" trailer lets a reader know that `openspec/changes/<slug>` no longer exists on `master` post-merge.

Why: it makes `git log --merges` double as the project's public changelog, with no additional tooling.

### 3. Archival: same merge or follow-up?

Two options:

(a) Archive in the same merge (the feature branch itself moves the folder before merging).
(b) Archive in a separate `chore: archive <slug>` commit *after* the merge — that's what the repo has historically done.

Decision: **support both, prefer (a)** going forward. The rule does not mandate archival-in-merge, because some changes need to stay in `openspec/changes/` for a period (e.g. a staged rollout). But when a change is fully complete at merge time, doing the archival on the branch is cleaner: one merge commit == one full change lifecycle node. Update `AGENTS.md` to describe both options.

### 4. Agent behaviour

Coding agents in this repo already do not push or merge; that stays. What changes is that when an agent describes the suggested merge command in its final message to the user, it SHALL suggest `git merge --no-ff -m "Merge change/<slug>" <branch>` for spec-change branches. This is documented in `AGENTS.md` so future agent runs pick it up by reading the entry-point doc.

### 5. Not in scope: server-side enforcement

We don't add a GitLab/GitHub "require merge commit" setting in this change because:

- The spec itself is the source of truth; server settings can be added later as a mechanical enforcement detail.
- The repository might be mirrored to multiple forges in the future; codifying the rule in-repo survives that.

## Risks / Trade-offs

- **History gets two layers**: `git log master` now shows merge commits with the changes as parents; contributors who prefer flat history need to use `--first-parent` (which reads very cleanly). Documented in AGENTS.md.
- **Some agents default to fast-forward when they suggest merges**: mitigated by the AGENTS.md update so they pick up the rule.
- **Retro-fitting is not required**: existing history stays as-is. Only future spec changes follow the rule. Mentioned explicitly in the spec so nobody spends time rewriting master.
- **"What counts as a spec change branch"** can be ambiguous for mixed branches (e.g. a refactor that also touches a spec). Decision: treat any branch touching `openspec/` as a spec change branch. Erring on the side of a merge commit is harmless; erring the other way loses the traceability benefit.
