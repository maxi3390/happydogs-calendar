# MODIFIED: Backend / Documents

## MODIFIED Requirements

### Requirement: File Type Validation

The system MUST validate that uploaded files are of a supported type, based on
the file's **actual content** (its magic bytes), not the client-supplied
`Content-Type` header.

Supported file types SHALL be: JPEG, PNG, GIF, WEBP, PDF, DOC, and DOCX.

The system SHALL sniff the real MIME type from the file's bytes and compare it
against the applicable allow-list (`ALLOWED_IMAGE_TYPES` for image uploads such
as profile pictures and the logo; `ALLOWED_DOCUMENT_TYPES` for document
uploads). Files whose sniffed type is not in the allow-list SHALL be rejected,
regardless of the declared `Content-Type`. This validation applies to all
upload surfaces: pet and owner profile pictures, the system logo, and pet /
owner documents.

#### Scenario: A disguised executable is rejected

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a file whose bytes are an executable but whose declared
  `Content-Type` is `image/jpeg`
- Then the system SHALL reject the request with a validation error indicating
  the file type is not supported

#### Scenario: Content decides, not the declared label

- Given an authenticated user exists
- When the user uploads a genuine PNG image with a declared `Content-Type` of
  `image/jpeg`
- Then the system SHALL accept the upload, because the sniffed type
  (`image/png`) is in the image allow-list

#### Scenario: Uploading a supported image file (JPEG)

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads a genuine JPEG image file linked to that pet
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported document file (PDF)

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a genuine PDF file linked to that owner
- Then the system SHALL accept the upload

#### Scenario: Uploading a supported Office document (DOCX)

- Given an authenticated user exists
- And an owner with a known identifier exists
- When the user uploads a genuine DOCX file linked to that owner
- Then the system SHALL accept the upload, mapping libmagic's generic
  container type to the DOCX allow-list entry where necessary

#### Scenario: Uploading an unsupported file type

- Given an authenticated user exists
- And a pet with a known identifier exists
- When the user uploads an executable file (.exe) linked to that pet
- Then the system SHALL reject the request with a validation error indicating
  the file type is not supported
