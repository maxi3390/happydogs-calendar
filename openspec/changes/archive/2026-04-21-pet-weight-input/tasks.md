# Tasks

## 1. Component
- [x] 1.1 Create `frontend/src/components/WeightInput.tsx`:
  - Controlled: `value: number | null` (kg), `onChange: (kg: number | null) => void`, plus `label`, `id`, `disabled`, `className`, `max` props.
  - Internal state: integer `cents`.
  - `onKeyDown`: digits → `cents = min(cents * 10 + d, 999999)`; `Backspace` / `Delete` → `cents = floor(cents / 10)`; let modifier / navigation / submit keys pass through.
  - `onPaste`: extract digits from the pasted text, apply sequentially, respect the clamp.
  - Render: `<label>` + `<input type="text" inputMode="decimal">`.

## 2. Integration
- [x] 2.1 Replace the `<input type="number">` weight block inside `frontend/src/components/PetForm.tsx` with `<WeightInput>`, passing `formData.weight` / `setFormData({ ...formData, weight })`.

## 3. Spec
- [x] 3.1 Add a MODIFIED delta for `frontend/pets` at `openspec/changes/pet-weight-input/specs/frontend/pets/spec.md` describing the new input interaction contract.
- [x] 3.2 Append the same requirement to the baseline `openspec/specs/frontend/pets/spec.md`.

## 4. Verification
- [x] 4.1 Frontend typecheck: `docker run --rm -v "$PWD/frontend":/app -w /app node:20-alpine sh -c "npx --no-install tsc --noEmit -p tsconfig.json"` exits 0.
- [x] 4.2 Backend tests still pass: `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` (nothing touched, but cheap sanity).
- [x] 4.3 Manual: open `/pets`, edit a pet, confirm the weight displays in `NN.NN`; type digits and verify the rolling behavior from the proposal example.
