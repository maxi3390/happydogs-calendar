# Design: Fix Frontend TypeScript Errors Blocking `next build`

## Context

Running `make upgrade` against the current `master` fails at step 2 (`docker compose build`). The frontend Dockerfile runs `npm run build`, which runs `next build`, which runs a full TypeScript check and exits non-zero on the first error:

```
./src/app/owners/page.tsx:245:58
Type error: Property 'state' does not exist on type 'OwnerWithPets'.
```

Running `tsc --noEmit -p tsconfig.json` on the same tree surfaces 10 errors in total. `next build` only reports the first; standalone `tsc` reports them all. The errors aren't new — they predate the latest merges — but Docker layer caching masked them: the `frontend-builder` step was cached whenever `COPY . .` saw no source changes, so `npm run build` didn't re-run. The recent `feat/improve-nav-ux` merge changed frontend sources and invalidated the cache, surfacing the failure.

The goal of this change is to green the typecheck, unblock `make upgrade`, and make the invariant explicit so it doesn't drift again.

## Decisions

### 1. Backend is the source of truth for the `state` field name

The Address mixin (`backend/domain/addresses/models.py`) defines the DB column as `state` with `help_text="Localidad"`. The serializer (`backend/pets/serializers.py`) exposes it as `state` on the JSON payload. The UI maps the label to Spanish "Localidad" via the `owner.state` translation key.

At some point the frontend `Owner` type was renamed to `locality` — probably an aspirational rename that was never propagated to the backend or to the consuming components. As a result, every runtime call works (it's using the API's `state` field) but TypeScript disagrees with the code.

**Decision**: rename `Owner.locality` back to `Owner.state` to match the API. Reverse migration — changing the backend to `locality` — would be much larger (DB migration, serializer update, form data update, admin panel, tests) and offers no benefit now that the UI translation layer already decouples the column name from what the user sees.

Alternative considered: keep `locality` in the type and rename every `owner.state` consumer to `owner.locality`. Rejected — that would also require adding a serializer alias on the backend, doubling the drift surface.

### 2. Fill in the missing system-logo wiring

The `/settings` page's "System Logo" section references four symbols that don't exist in scope:

- `Image` — the intended icon next to the section title. Already used as a lucide-react icon elsewhere (e.g. `DocumentUpload.tsx`); just add it to the existing `lucide-react` import.
- `ProfilePictureUpload` — the reusable component used for owner/pet avatars. Already supports the same `currentUrl` / `onUpload` / `onDelete` contract the section needs; add a default import.
- `logoUrl` / `setLogoUrl` — local state for the logo preview. The settings response already contains `logo_url`; the fetch logic in `fetchData()` gets a `settingsData` object but only reads `settingsData.daily_booking_limit`. Add `const [logoUrl, setLogoUrl] = useState<string | null>(null)` and populate it in the same place (`setLogoUrl(settingsData.logo_url)`).

Typing the `file` parameter of the upload callback goes away for free once `ProfilePictureUpload` is imported — its prop signature constrains `onUpload: (file: File) => Promise<void> | void`.

**Decision**: restore the implementation rather than remove the section. The section is clearly intended to ship (Navigation reads the logo from the same endpoint and displays it); the code was just incomplete.

### 3. `tsconfig.json` target should match what `next build` auto-applies

`next build` says (paraphrased): "I updated your tsconfig to `target: "es2017"` because you need top-level await and some ES2015+ features you already use." Next.js does this invisibly at build time, so `next build` passes while standalone `tsc --noEmit` still uses TypeScript's default (ES3 / ES5 depending on the edition). The `Calendar.tsx` `new Set<number>` spread hits this divergence.

**Decision**: explicitly set `"target": "es2017"` in `tsconfig.json`. This has two benefits:

- Standalone `tsc --noEmit` now mirrors what `next build` actually type-checks, so baseline counts converge.
- Contributors running `tsc` locally (or in CI, when it happens) see the same errors the Docker build sees.

Alternative considered: add `"downlevelIteration": true` without changing `target`. Rejected — it hides the real issue (mismatched target) and leaves downlevel code emission hypothetically in play, which Next.js would re-override anyway.

### 4. Introduce `frontend/build-integrity` as a tiny tooling spec

The repository already spec'd `tooling/git-workflow` (merge commits) and `tooling/upgrade` (`make upgrade`). A new small capability `frontend/build-integrity` makes the "green typecheck / green build" contract explicit, so future agents and contributors know the invariant exists. The spec has three requirements:

- `next build` passes on `master`.
- `tsc --noEmit` passes on `master`.
- The `tsconfig.json` target matches what Next.js auto-upgrades to.

This is placed under `frontend/` rather than `tooling/` because the invariants are about the frontend artifact itself. It's separate from `tooling/upgrade`, which only describes the orchestration of `make upgrade`.

## Risks / Trade-offs

- **`Owner.state` rename is a breaking type change**. Mitigated because (a) no consumer currently reads `owner.locality` — grep confirms only the type itself mentioned it — and (b) the actual API payload uses `state`, so runtime is unchanged.
- **Settings page now actually mounts `ProfilePictureUpload` for the logo**. If the `upload_logo` / `delete_logo` endpoints weren't wired, clicking would 404; verified: they exist and the API client already calls them.
- **Target bump from default → ES2017**. Matches what Next.js already uses; no runtime change for consumers. Third-party libraries used here (`date-fns`, `lucide-react`, `react`) all publish ES2017+ output or lower.
- **Build-integrity spec is a new invariant to uphold**. Once in place, every future change needs to keep the build green — which was always true in spirit; we're just formalising it. No additional CI is introduced in this change (that would be a separate infrastructure task).
