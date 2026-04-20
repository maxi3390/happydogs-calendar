# Delta for Tooling Git Workflow

## ADDED Requirements

### Requirement: Spec Change Merges Use Merge Commits

Any branch that touches the `openspec/` directory SHALL be integrated into `master` with an explicit merge commit (`git merge --no-ff`). Fast-forward merges and rebased linearisations SHALL NOT be used for such branches.

A branch "touches `openspec/`" if, compared to `master`, it adds, modifies, moves, or deletes any file under:

- `openspec/changes/<slug>/`,
- `openspec/changes/archive/`, or
- `openspec/specs/<capability>/<feature>/`.

Branches that do not touch `openspec/` MAY fast-forward.

#### Scenario: Merging a completed spec change branch

- GIVEN a feature branch named `feat/<slug>` that contains both an implementation and its `openspec/changes/<slug>/` folder
- WHEN the user integrates the branch into `master`
- THEN the integration SHALL use `git merge --no-ff`
- AND a merge commit SHALL appear in `master`'s history

#### Scenario: Merging a chore branch with no spec impact

- GIVEN a feature branch that only edits files outside `openspec/`
- WHEN the user integrates the branch into `master`
- THEN the integration MAY be a fast-forward merge

#### Scenario: Reverting a merged spec change

- GIVEN a spec change merged into `master` via a merge commit `<merge-sha>`
- WHEN the user runs `git revert -m 1 <merge-sha>`
- THEN the entire change (implementation, `openspec/changes/<slug>/` entries, archival moves) SHALL be removed in a single commit

### Requirement: Merge Commit Message Format

Merge commits for spec change branches SHALL follow the template:

```
Merge change/<slug>

<one-line summary in imperative mood>

Archives openspec/changes/<slug> → openspec/changes/archive/<YYYY-MM-DD>-<slug>
```

The "Archives …" trailer is REQUIRED when the merge also performs archival and OMITTED otherwise. The `Merge change/` prefix is REQUIRED.

#### Scenario: Greppable changelog

- GIVEN `master`'s history contains merge commits from multiple spec changes
- WHEN a maintainer runs `git log --merges --first-parent --grep "^Merge change/" master`
- THEN the output SHALL list one entry per spec change

### Requirement: Agents Recommend The Merge Command

Coding agents working in this repository SHALL NOT perform the merge themselves. When an agent completes a spec change branch, its final summary SHALL include:

```
git checkout master && git pull
git merge --no-ff -m "Merge change/<slug>" <branch-name>
```

#### Scenario: Agent-authored final summary

- GIVEN an agent finishes a spec change branch `feat/<slug>`
- WHEN the agent produces its summary for the user
- THEN the summary SHALL recommend `git merge --no-ff` with the `Merge change/<slug>` message

### Requirement: Historical Compatibility

The rule applies going forward. Previously merged changes SHALL NOT be retroactively rewritten.

#### Scenario: Existing history is preserved

- GIVEN `master` currently has a linear fast-forward history
- WHEN this spec is introduced
- THEN no prior commits SHALL be reworded, rebased, or re-merged
