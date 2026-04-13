# Proposal: Add Customizable System Logo

## Intent

Nursery operators want to brand the application with their own logo. The logo should be visible on the login page (as the primary branding element) and in the navigation bar (as the persistent brand mark) so that every user — authenticated or not — sees the nursery's identity.

## Scope

In scope:
- Upload a custom logo image via the settings page (admin)
- Display the logo on the login page, replacing the default icon
- Display the logo in the navigation bar, replacing the default PawPrint icon
- Serve the logo via the existing nursery settings API
- Fallback to the default PawPrint icon when no custom logo is set

Out of scope:
- Multiple logos (e.g., separate light/dark mode variants)
- Logo cropping or editing tools
- Favicon customization
- Logo on the registration page (inherits login page pattern if needed later)

## Approach

Extend the existing `NurserySetting` singleton model with an `ImageField` for the logo. Add upload/delete endpoints following the same pattern used for owner/pet profile pictures. On the frontend, create a shared hook or fetch the logo URL from the settings API and pass it to `Navigation` and the login page. Use the existing `ProfilePictureUpload` component pattern for the upload UI in settings.
