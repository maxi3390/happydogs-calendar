# Tasks

## 1. Backend Model & Migration
- [x] 1.1 Add `logo` ImageField to NurserySetting model
- [x] 1.2 Run makemigrations to generate migration file

## 2. Backend API
- [x] 2.1 Add `logo_url` SerializerMethodField to NurserySettingSerializer
- [x] 2.2 Add `upload_logo` view (multipart POST)
- [x] 2.3 Add `delete_logo` view (DELETE)
- [x] 2.4 Add URL patterns for upload/delete

## 3. Backend Tests
- [x] 3.1 Test settings response includes logo_url field
- [x] 3.2 Test logo_url is null when no logo uploaded
- [x] 3.3 Test logo_url is present after upload
- [x] 3.4 Test upload logo success (stores file, returns URL)
- [x] 3.5 Test upload replaces existing logo
- [x] 3.6 Test upload with no file returns 400
- [x] 3.7 Test upload rejects non-image files (PDF)
- [x] 3.8 Test upload rejects oversized files (>5 MB)
- [x] 3.9 Test delete logo success (removes file)
- [x] 3.10 Test delete logo clears URL in settings response
- [x] 3.11 Test delete when no logo exists returns 204
- [x] 3.12 Test logo persists across settings updates (singleton integrity)

## 4. Frontend Types & API
- [x] 4.1 Add `logo_url` to NurserySetting TypeScript interface
- [x] 4.2 Add `uploadLogo` and `deleteLogo` to nurserySettingsApi

## 5. Frontend Display
- [x] 5.1 Update Navigation to fetch and display logo (with PawPrint fallback)
- [x] 5.2 Update login page to fetch and display logo (with LogIn icon fallback)

## 6. Frontend Settings Upload
- [x] 6.1 Add logo upload section to settings page using ProfilePictureUpload pattern
