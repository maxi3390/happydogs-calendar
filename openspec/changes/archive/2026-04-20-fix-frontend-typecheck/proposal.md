# Proposal: Fix Frontend TypeScript Errors Blocking `next build`

## Intent

`make upgrade` is currently broken: its `docker compose build` step runs `npm run build` (i.e. `next build`) which performs a full TypeScript check and stops on the first error. The frontend has 10 pre-existing TypeScript errors that had been masked by Docker layer caching on an unchanged frontend source tree. Once a merge actually invalidated the cache, the production build started failing. This change fixes all 10 errors so `next build` — and therefore `make upgrade` — succeeds end-to-end, and introduces a new tooling spec that makes the green-typecheck invariant explicit so this doesn't silently re-break in the future.

## Scope

In scope:
- Fix 10 pre-existing TypeScript errors reported by `tsc --noEmit -p tsconfig.json`:
  - `src/app/owners/page.tsx:245` — `Property 'state' does not exist on type 'OwnerWithPets'`
  - `src/components/OwnerForm.tsx:52` — `Property 'state' does not exist on type 'Owner'`
  - `src/app/settings/page.tsx:194` — `Image` used as JSX component (missing import)
  - `src/app/settings/page.tsx:208` — `Cannot find name 'ProfilePictureUpload'`
  - `src/app/settings/page.tsx:209, 212, 216` — `logoUrl` / `setLogoUrl` not defined
  - `src/app/settings/page.tsx:210` — parameter `file` has implicit `any`
  - `src/components/Calendar.tsx:103` — `Set<number>` iteration without downlevelIteration / ES2015+ target
- Introduce a new tooling capability `frontend/build-integrity` with a requirement that `next build` and `tsc --noEmit` SHALL pass on `master` at all times, and that any change that breaks this is rejected.
- Update `frontend/tsconfig.json` to align its `target` with what Next.js already auto-upgrades to at build time, so standalone `tsc` and `next build` behave identically.

Out of scope:
- Adopting stricter TS rules (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.) — that's a follow-up.
- Re-organising the `Owner` / `OwnerWithPets` types beyond fixing the field mismatch.
- Changing the `state` vs `locality` wording in the UI — Spanish still reads "Localidad" via the translation layer; only the TypeScript field name changes to match the backend API.
- Adding a CI job that enforces `tsc`/`build` — the repo-level CI setup is a separate concern.

## Approach

The 10 errors cluster into three independent root causes:

1. **Mismatched Owner address field name (Type ↔ API drift)**. The backend serializes the structured address field as `state` (see `backend/pets/serializers.py` and `backend/domain/addresses/models.py`). The frontend `Owner` type in `src/domain/owners/types.ts` was written with `locality` instead of `state`, so any consumer that reads `owner.state` (the pages and the form) fails type checking even though the runtime behavior is correct. Fix: rename `Owner.locality` → `Owner.state`. No other code uses `locality` (verified by grep).

2. **Incomplete system-logo implementation in the settings page**. `src/app/settings/page.tsx` renders a "System Logo" section that references `Image` (icon), `ProfilePictureUpload`, `logoUrl`, and `setLogoUrl` — none of which are declared in the file. A previous change added the JSX but never wired up the state or imports. Fix: add the `Image` icon import from `lucide-react`, the `ProfilePictureUpload` default import, the `logoUrl` / `setLogoUrl` state hook, and populate `logoUrl` from the nursery settings response already being fetched.

3. **Missing `target` in `tsconfig.json`**. `next build` auto-upgrades the `target` to ES2017, but standalone `tsc --noEmit` uses the TypeScript default (ES3), which refuses `Set<number>` spread iteration. Fix: add `"target": "es2017"` so `tsc` and `next build` share the same contract. Once this is set, `Calendar.tsx:103` and any future downlevel-iteration edges stop tripping the standalone check.

The new `frontend/build-integrity` tooling spec codifies three simple invariants: (a) `next build` succeeds on `master`, (b) `tsc --noEmit` succeeds on `master`, (c) the `tsconfig.json` `target` matches what Next.js would auto-upgrade to. This gives us a place to anchor future CI work.
