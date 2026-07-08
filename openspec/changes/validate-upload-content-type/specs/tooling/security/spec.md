# MODIFIED: Tooling / Security Testing

## ADDED Requirements

### Requirement: The security suite SHALL guard content-based upload validation

The custom security test suite SHALL include a case asserting that an upload
whose bytes do not match an allowed type is rejected even when the client
declares an allowed `Content-Type`. A regression that reintroduces
`content_type`-only validation SHALL make `make security` fail.

This finding SHALL be categorised under A08 (Software and Data Integrity
Failures) — untrusted client-supplied metadata driving a trust decision.

#### Scenario: Spoofed-upload guard is exercised by `make security`

- GIVEN the security suite runs
- WHEN it submits a file with executable bytes and a declared
  `Content-Type: image/jpeg`
- THEN the upload SHALL be rejected
- AND if it were accepted, the corresponding `security_tests` case SHALL fail
  and `make security` SHALL exit non-zero
