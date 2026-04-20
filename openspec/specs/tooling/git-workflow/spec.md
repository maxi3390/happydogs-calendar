# Tooling: Git Workflow Specification

## Purpose

Define the git-level conventions that apply to every branch landing on `master` in this repository. These conventions complement the "Git workflow" section of the root `AGENTS.md` (branch naming, conventional commits, "never commit to master", "leave pushing and merging to the user"). They focus specifically on how integration happens, so that `master`'s history stays a useful, revertible record of the product's evolution.

## Requirements

### Requirement: Spec Change Merges Use Merge Commits

Any branch that touches the `openspec/` directory SHALL be integrated into `master` with an explicit merge commit (`git merge --no-ff`). Fast-forward merges and rebased linearisations SHALL NOT be used for such branches.

A branch "touches `openspec/`" if, compared to `master`, it adds, modifies, moves, or deletes any file under:

- `openspec/changes/<slug>/` (new proposal or in-progress change),
- `openspec/changes/archive/` (archival of a completed change), or
- `openspec/specs/<capability>/<feature>/` (new or modified baseline spec).

Branches that do not touch `openspec/` (e.g. a trivial README fix, CI tweak, typo correction) MAY fast-forward.

#### Scenario: Merging a completed spec change branch

- GIVEN a feature branch named `feat/<slug>` that contains both an implementation and its `openspec/changes/<slug>/` folder
- AND the branch has been reviewed and is ready to land
- WHEN the user integrates the branch into `master`
- THEN the integration SHALL use `git merge --no-ff`
- AND a merge commit SHALL appear in `master`'s history

#### Scenario: Merging a chore branch with no spec impact

- GIVEN a feature branch that only edits code or docs outside `openspec/` (e.g. a typo fix in `README.md`)
- WHEN the user integrates the branch into `master`
- THEN the integration MAY be a fast-forward merge
- AND no merge commit is required

#### Scenario: Archival-only branch

- GIVEN a branch whose sole purpose is to move `openspec/changes/<slug>/` to `openspec/changes/archive/YYYY-MM-DD-<slug>/` and fold the delta into `openspec/specs/`
- WHEN the user integrates the branch into `master`
- THEN the integration SHALL use `git merge --no-ff` because the branch touches `openspec/`

#### Scenario: Reverting a merged spec change

- GIVEN a spec change merged into `master` via a merge commit `<merge-sha>`
- WHEN the user decides to roll the change back
- THEN `git revert -m 1 <merge-sha>` SHALL be sufficient to remove the entire change (implementation, `openspec/changes/<slug>/` entries, archival moves) in one commit

### Requirement: Merge Commit Message Format

Merge commits for spec change branches SHALL use the following message template:

```
Merge change/<slug>

<one-line summary in imperative mood>

Archives openspec/changes/<slug> → openspec/changes/archive/<YYYY-MM-DD>-<slug>
```

The "Archives …" trailer is REQUIRED when the merge also performs the archival step, and OMITTED when the change remains in `openspec/changes/` post-merge.

The prefix `Merge change/` is REQUIRED so that `git log --merges --grep '^Merge change/'` produces a clean changelog.

#### Scenario: Authoring the merge commit

- GIVEN the user runs `git merge --no-ff <branch>` to integrate a spec change
- WHEN git prompts for (or receives via `-m`) the merge commit message
- THEN the first line SHALL match `Merge change/<slug>`
- AND the body SHALL contain a one-line imperative summary
- AND if the branch also archives the change folder, the body SHALL include the "Archives …" trailer

#### Scenario: Greppable changelog

- GIVEN `master`'s history contains multiple merged spec changes
- WHEN a maintainer runs `git log --merges --first-parent --grep "^Merge change/" master`
- THEN the output SHALL list one entry per spec change, each with its slug and summary
- AND this output SHALL serve as a human-readable changelog without additional tooling

### Requirement: Agents Recommend The Merge Command

Coding agents working in this repository SHALL NOT perform the merge themselves (this repository's general rule is "leave pushing and merging to the user"). When an agent completes a spec change branch and surfaces next steps to the user, it SHALL suggest the canonical merge command:

```
git checkout master
git pull
git merge --no-ff -m "Merge change/<slug>" <branch-name>
```

#### Scenario: Agent suggests the merge command after finishing a spec change

- GIVEN a coding agent has finished work on a spec change branch `feat/<slug>`
- WHEN the agent summarises next steps for the user
- THEN the suggestion SHALL use `git merge --no-ff` and the `Merge change/<slug>` message prefix
- AND the agent SHALL NOT run the merge itself

### Requirement: Historical Compatibility

This specification applies to spec changes merged after its introduction. Previously merged changes on `master` SHALL NOT be retroactively rewritten to comply.

#### Scenario: Existing history is not rewritten

- GIVEN `master`'s history before this spec exists as linear fast-forward merges
- WHEN this spec is introduced
- THEN no prior commits SHALL be reworded, rebased, or merged after the fact
- AND only future spec change branches SHALL follow the merge-commit rule
