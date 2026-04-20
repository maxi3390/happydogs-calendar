# Tasks

## 1. Backend: Accept Multipart on Create/Update
- [x] 1.1 Add MultiPartParser + FormParser to OwnerViewSet parser_classes
- [x] 1.2 Add MultiPartParser + FormParser to PetViewSet parser_classes
- [x] 1.3 Override PetViewSet.create() to parse vaccinations JSON from multipart
- [x] 1.4 Override PetViewSet.update() to parse vaccinations JSON from multipart

## 2. Backend Tests
- [x] 2.1 Test creating owner with profile_picture via multipart
- [x] 2.2 Test creating pet with profile_picture via multipart
- [x] 2.3 Test creating pet with profile_picture AND vaccinations via multipart
- [x] 2.4 Test that JSON create still works (backward compatible)

## 3. Frontend: PetForm
- [x] 3.1 Add pendingProfilePicture state
- [x] 3.2 Show ProfilePictureUpload in create mode (with local file handling)
- [x] 3.3 Build FormData on submit when pendingProfilePicture is set
- [x] 3.4 Add createWithAvatar to petsApi

## 4. Frontend: OwnerForm
- [x] 4.1 Add pendingProfilePicture state
- [x] 4.2 Show ProfilePictureUpload in create mode (with local file handling)
- [x] 4.3 Build FormData on submit when pendingProfilePicture is set
- [x] 4.4 Add createWithAvatar to ownersApi
