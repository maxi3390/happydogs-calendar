# Proposal: Avatar Upload During Creation

## Intent

Currently, creating a pet or owner requires a two-step process: (1) create the record via JSON POST, then (2) upload the profile picture via a separate multipart POST. This forces users to save the form first, reopen it in edit mode, and only then upload a picture. The improvement allows uploading the profile picture as part of the initial creation request, making the form a single-step experience.

## Scope

In scope:
- Accept profile_picture in the same multipart request that creates a pet or owner
- Show the ProfilePictureUpload component in create mode (not just edit mode)
- Accept multipart/form-data on update (PATCH) as well for consistency
- Handle vaccinations data sent as JSON string within multipart form data (pets)
- Backend tests for the new multipart create flow

Out of scope:
- Changing the existing separate upload/delete endpoints (they remain for backward compatibility)
- Changing document upload (still requires existing record)
- Changing medical notes upload (still requires existing record)

## Approach

Backend: Add MultiPartParser and FormParser to the ViewSet's parser_classes. Override `create()` and `update()` on the ViewSets to extract profile_picture from request.FILES and pass remaining data to the serializer. For pets, vaccinations data arrives as a JSON string field when using multipart, so parse it back to a list.

Frontend: Move the ProfilePictureUpload component out of the `{pet && ...}` / `{owner && ...}` conditional in both forms. In create mode, store the selected file in local state and include it in the creation request as FormData instead of JSON. In edit mode, keep the existing behavior (upload via separate endpoint).
