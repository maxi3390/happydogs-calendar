# Design: Avatar Upload During Creation

## Technical Approach

The core change is making Pet and Owner ViewSets accept `multipart/form-data` on create and update, alongside the existing JSON support. When a multipart request arrives, the profile_picture file is extracted from `request.FILES` and passed through to the serializer. The serializer's existing `create()` and `update()` methods already handle the `profile_picture` field since it's declared on the model and included in `fields = '__all__'` — no serializer changes are needed.

On the frontend, both PetForm and OwnerForm gain a local `pendingProfilePicture` state (a `File | null`). In create mode, the ProfilePictureUpload component writes to this local state. On submit, if a pending file exists, the form builds a FormData object instead of sending JSON. In edit mode, the existing behavior is preserved — uploads go directly to the separate endpoint.

## Architecture Decisions

### Decision: Multipart Parser on Create/Update (Not a New Endpoint)

Adding `MultiPartParser` to the ViewSet's `parser_classes` allows the existing `POST /api/pets/` and `POST /api/owners/` endpoints to accept both JSON and multipart requests. No new endpoints needed.

**Why:** This is the least-invasive change. Existing JSON clients continue working. The profile_picture field is already on the model; we just need the parser to extract it from multipart requests.

**Tradeoffs:** The ViewSet now needs to handle two content types. Vaccinations data (nested JSON) arrives as a string field in multipart, requiring explicit JSON parsing. This adds a small amount of complexity to the create override.

### Decision: Local File State in Frontend Forms

In create mode, the selected file is stored in component state (`pendingProfilePicture`) and included in the FormData on submit. The ProfilePictureUpload component's `onUpload` callback stores the file locally instead of making an API call.

**Why:** The record doesn't exist yet, so we can't call the upload endpoint. Storing the file locally and sending it with the creation request keeps the flow simple.

**Tradeoffs:** The preview URL is created via `URL.createObjectURL()` which needs cleanup. The form must switch between JSON (no file) and FormData (with file) on submit based on whether a file is pending.

### Decision: Keep Separate Upload/Delete Endpoints

The existing `upload_profile_picture` and `delete_profile_picture` action endpoints remain unchanged. They are still used in edit mode for immediate upload/delete without resubmitting the entire form.

**Why:** Backward compatibility. The edit mode UX of instant upload/delete is good and shouldn't change.

## Data Flow

```
CREATE MODE (new):
  User selects file → stored in local state (pendingProfilePicture)
  User submits form → FormData built with all fields + profile_picture file
  POST /api/pets/ (multipart/form-data) → ViewSet extracts FILES → serializer.create()

EDIT MODE (unchanged):
  User selects file → POST /api/pets/{id}/upload_profile_picture/ (multipart)
  User deletes file → DELETE /api/pets/{id}/delete_profile_picture/
```

## Key Files

| File | Change |
|------|--------|
| `backend/pets/views.py` | Add MultiPartParser to OwnerViewSet and PetViewSet, override create/update to handle FILES |
| `frontend/src/components/PetForm.tsx` | Show ProfilePictureUpload in create mode, add pendingProfilePicture state, build FormData on submit |
| `frontend/src/components/OwnerForm.tsx` | Same pattern as PetForm |
| `frontend/src/domain/pets/api.ts` | Add createWithAvatar method using uploadFile |
| `frontend/src/domain/owners/api.ts` | Add createWithAvatar method using uploadFile |
| `backend/pets/tests/test_pet_api.py` | Add test for multipart create with profile_picture |
| `backend/pets/tests/test_owner_api.py` | Add test for multipart create with profile_picture |
