# Tasks

## 1. Backend Model & Migration
- [x] 1.1 Add `logo` ImageField to NurserySetting model
- [x] 1.2 Run makemigrations to generate migration file

## 2. Backend API
- [x] 2.1 Add `logo_url` SerializerMethodField to NurserySettingSerializer
- [x] 2.2 Add `upload_logo` view (multipart POST)
- [x] 2.3 Add `delete_logo` view (DELETE)
- [x] 2.4 Add URL patterns for upload/delete

## 3. Frontend Types & API
- [x] 3.1 Add `logo_url` to NurserySetting TypeScript interface
- [x] 3.2 Add `uploadLogo` and `deleteLogo` to nurserySettingsApi

## 4. Frontend Display
- [x] 4.1 Update Navigation to fetch and display logo (with PawPrint fallback)
- [x] 4.2 Update login page to fetch and display logo (with LogIn icon fallback)

## 5. Frontend Settings Upload
- [x] 5.1 Add logo upload section to settings page using ProfilePictureUpload pattern
