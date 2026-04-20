# Tasks

## 1. Tooling spec (new capability)
- [x] 1.1 Create `openspec/specs/tooling/git-workflow/spec.md` with a "Spec Change Merges Use Merge Commits" requirement and its scenarios.
- [x] 1.2 Place the delta copy under `openspec/changes/merge-commits-for-spec-changes/specs/tooling/git-workflow/spec.md` marked as ADDED.

## 2. Agents documentation
- [x] 2.1 Update the root `AGENTS.md` "Git workflow" section with a short "Merging spec changes" subsection (the rule, the command, and the merge message format).
- [x] 2.2 Cross-reference the new spec path (`openspec/specs/tooling/git-workflow/`) from the AGENTS.md "OpenSpec workflow" section.

## 3. Verification
- [x] 3.1 `python -c "import json"` is not needed here (no JSON touched), but visually inspect that the spec files follow the same format as `openspec/specs/tooling/upgrade/spec.md`.
- [x] 3.2 Confirm the new `openspec/changes/merge-commits-for-spec-changes/` folder exists with proposal.md, design.md, tasks.md and the delta spec.
