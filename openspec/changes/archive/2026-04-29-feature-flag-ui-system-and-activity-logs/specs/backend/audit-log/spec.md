# ADDED: Backend / Audit Log

## ADDED Requirements

### Requirement: The activity feed endpoint SHALL be gated by the `activity_logs` feature flag

The unified activity feed endpoint (`GET /api/audit-log/activity/`) SHALL be gated by the `activity_logs` feature flag. When the flag is `enabled = False`, the endpoint SHALL return HTTP 404 to authenticated admins, mirroring the "page does not exist" framing used for other gated surfaces. The feature gate SHALL run AFTER the auth + admin permission checks so an unauthenticated caller continues to receive 401 and a non-admin continues to receive 403 — the surface's existence is not leaked to unauthorised readers via the gating shape.

The per-entity history endpoints (`GET /api/pets/<id>/history/`, `GET /api/owners/<id>/history/`, `GET /api/pets/<pet_id>/medical-notes/<id>/history/`, `GET /api/pets/<pet_id>/vaccinations/<id>/history/`) SHALL NOT be gated by this flag; they remain reachable so admins can still drill into a single entity's history when the cross-entity feed is hidden.

#### Scenario: Admin gets 404 when the flag is off

- GIVEN user Alice has admin role
- AND the `activity_logs` feature flag is `enabled = False`
- WHEN Alice `GET /api/audit-log/activity/`
- THEN the response SHALL be HTTP 404

#### Scenario: Non-admin gets 403 even when the flag is off

- GIVEN user Bob is a non-admin authenticated user
- AND the `activity_logs` feature flag is `enabled = False`
- WHEN Bob `GET /api/audit-log/activity/`
- THEN the response SHALL be HTTP 403 (the admin gate runs before the feature gate)

#### Scenario: Per-entity history stays reachable when the flag is off

- GIVEN user Alice has admin role
- AND the `activity_logs` feature flag is `enabled = False`
- WHEN Alice `GET /api/pets/<id>/history/`
- THEN the response SHALL be HTTP 200
- AND the per-entity history SHALL render normally
