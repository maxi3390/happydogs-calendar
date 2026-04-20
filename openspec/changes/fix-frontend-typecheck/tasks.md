# Tasks

## 1. Owner type: state vs locality
- [x] 1.1 Rename `Owner.locality` → `Owner.state` in `frontend/src/domain/owners/types.ts`.
- [x] 1.2 Verify no other consumer uses `.locality` (grep). All reads and writes already use `state`.

## 2. Settings page: system-logo wiring
- [x] 2.1 Add `Image` to the `lucide-react` import in `frontend/src/app/settings/page.tsx`.
- [x] 2.2 Add `import ProfilePictureUpload from '@/components/ProfilePictureUpload'` .
- [x] 2.3 Add `const [logoUrl, setLogoUrl] = useState<string | null>(null)` next to the other hooks.
- [x] 2.4 Populate `setLogoUrl(settingsData.logo_url)` inside `fetchData` where `settingsData` is already resolved.
- [x] 2.5 Confirm the existing `file` upload callback now type-checks because `ProfilePictureUpload`'s prop types constrain it.

## 3. tsconfig target
- [x] 3.1 Add `"target": "es2017"` to `frontend/tsconfig.json` so standalone `tsc` matches what `next build` auto-upgrades.

## 4. Build-integrity spec
- [x] 4.1 Create baseline `openspec/specs/frontend/build-integrity/spec.md` with three requirements:
  - `next build` passes on `master`.
  - `tsc --noEmit` passes on `master`.
  - `tsconfig.json` target matches what Next.js would auto-upgrade to.
- [x] 4.2 Mirror the same content as ADDED in `openspec/changes/fix-frontend-typecheck/specs/frontend/build-integrity/spec.md`.

## 5. Verification
- [x] 5.1 `tsc --noEmit -p tsconfig.json` returns zero errors.
- [x] 5.2 `docker compose build frontend` (or `make upgrade` end-to-end) completes successfully.
- [x] 5.3 Backend tests remain at 222/222 pass.
- [x] 5.4 Existing Playwright suite still compiles (no removed exports).
