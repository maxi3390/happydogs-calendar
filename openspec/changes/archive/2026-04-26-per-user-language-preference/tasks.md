# Tasks — Per-user language preference

## Phase 1 — Backend model + migration

- [x] Added `User.language` (`CharField` with `Language.choices`, default `Language.SPANISH`).
- [x] Migration `0002_user_language.py`.

## Phase 2 — Serializer + endpoints

- [x] `language` added to `UserSerializer.fields` so login / register / profile / admin user list all carry it.
- [x] New `UserLanguageSerializer` (only the `language` field is writable).
- [x] New `UserLanguageView` (`PATCH /api/users/me/language/`, auth required, returns the full user shape).
- [x] Choice validation is enforced by the model — invalid values return HTTP 400 from DRF.

## Phase 3 — Backend tests

- [x] `test_default_language_is_spanish`.
- [x] `test_login_response_includes_language`.
- [x] `test_register_response_defaults_to_spanish`.
- [x] `test_patch_self_succeeds`.
- [x] `test_patch_self_unknown_value_400`.
- [x] `test_patch_self_unauthenticated_401`.
- [x] `test_patch_self_only_affects_caller`.
- [x] `test_email_uses_recipient_language` — Spanish recipient's birthday email uses ES translations.
- [x] Updated existing email-default test to stamp `language='en'` on Alice/Bob so the EN-text assertions still match.

## Phase 4 — Frontend types + auth wiring

- [x] `language: 'en' | 'es'` added to `frontend/src/domain/auth/types.ts` and `frontend/src/domain/users/types.ts`.
- [x] `AuthContextType` gains `applyUser(user)` so the language switcher can refresh the cached user shape after a successful PATCH.
- [x] `usersApi.setLanguage(lang)` wrapper added.

## Phase 5 — Frontend UI

- [x] `TranslationProvider` walks `user.language` → `localStorage.preferred_language` → browser sniff → `'es'`.
- [x] `setLanguage()` updates localStorage; when authenticated, also fires `usersApi.setLanguage(lang)` and applies the response via `applyUser` (fire-and-forget; failures swallowed).

## Phase 6 — Frontend tests

- [x] New `tests/language-per-user.spec.ts` with two scenarios: `user.language` outranks stale `localStorage`, and authenticated change PATCHes + persists into `auth_user`.
- [x] Updated `tests/helpers.ts.setLanguage` to also patch the cached `auth_user.language` so existing tests' "start in English" assumptions stay valid.
- [x] Updated `tests/language.spec.ts` "should default to Spanish when no preference is set" to also clear the cached user's `language` field.

## Phase 7 — Spec + archive

- [x] Updated `openspec/specs/backend/auth/spec.md` with the User.language field, the PATCH endpoint, and the email-language requirement (six scenarios).
- [x] Updated `openspec/specs/frontend/i18n/spec.md` with the per-user precedence rule (three scenarios).
- [x] Updated `openspec/specs/frontend/auth/spec.md` to add `language` to the user shape (one scenario).
- [x] Archive this change folder.
