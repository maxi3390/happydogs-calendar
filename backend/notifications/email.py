"""Staff-facing email delivery for newly created notifications.

Each ``Notification`` row is one staff user's copy of one event. When
``email_enabled=True`` on that user's preference, we send an internal
email summarising the event. The email is *staff-internal*: it is
addressed to the staff member's account email, not the owner's. The
owner-facing forwarding affordance is rendered by the frontend and
fired by the staff member themselves (mailto: + api.whatsapp.com/send).

Subject and body are derived from the operator's ``NotificationTemplate``
when present, falling back to localised defaults under
``notifications.staff_email.<scope>.*`` in ``backend/translations/``.
Internal-only kinds (arrival / egress) have no operator-template entry;
they use the ``notifications.staff_email.<kind>.*`` key directly.
"""

from __future__ import annotations

import json
import os
from typing import Iterable

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification, NotificationPreference, NotificationTemplate
from .templating import render


def deliver(notifications: Iterable[Notification]) -> int:
    """Send one staff-internal email per ``notification`` whose
    recipient has ``email_enabled``. Returns the number of emails
    actually sent. Ignores rows whose recipient has no email address
    or has opted out.
    """
    sent = 0
    for notif in notifications:
        if _send_one(notif):
            sent += 1
    return sent


def _send_one(notif: Notification) -> bool:
    user = notif.recipient_user
    if not user.email:
        return False
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    if not prefs.email_enabled:
        return False

    subject, body = _render(notif, _user_language(user))
    if not subject and not body:
        return False

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return True


def _user_language(user) -> str:
    """Return the user's preferred language, defaulting to ``'es'`` (the
    product's primary language) when the field is missing or empty.
    Pre-migration rows that predate the ``language`` field will resolve
    to the same default.
    """
    return getattr(user, 'language', None) or 'es'


def _render(notif: Notification, lang: str = 'es') -> tuple[str, str]:
    """Resolve the subject + body to send for ``notif`` in ``lang``.

    For kinds that map to a NotificationTemplate scope (treatment_due,
    pet_birthday) the operator's template wins; an empty operator field
    falls back to the localised default. For internal-only kinds the
    fallback is keyed on the kind itself.
    """
    payload = notif.payload or {}
    scope = notif.template_scope
    if scope is not None:
        template, _ = NotificationTemplate.objects.get_or_create(scope=scope)
        subject = (
            render(template.email_subject, payload)
            if template.email_subject
            else _resolve_default(
                f'notifications.staff_email.{scope}.subject', payload, lang,
            )
        )
        body = (
            render(template.email_body, payload)
            if template.email_body
            else _resolve_default(
                f'notifications.staff_email.{scope}.body', payload, lang,
            )
        )
        return subject, body

    # Internal-only kinds — no operator template; lookup by kind.
    subject = _resolve_default(
        f'notifications.staff_email.{notif.kind}.subject', payload, lang,
    )
    body = _resolve_default(
        f'notifications.staff_email.{notif.kind}.body', payload, lang,
    )
    return subject, body


def _resolve_default(key: str, payload: dict, lang: str = 'es') -> str:
    """Look up a localised default string in ``backend/translations/``.

    Mirrors the logic in ``serializers._resolve_default`` but lives in
    its own module here so the email layer doesn't import the DRF
    serializer (and to keep the function importable from the cron
    worker process).
    """
    base = os.path.join(settings.BASE_DIR, 'translations')
    for candidate in [lang, 'en']:
        path = os.path.join(base, f'{candidate}.json')
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
        except (FileNotFoundError, json.JSONDecodeError):
            continue
        value = data
        for part in key.split('.'):
            if not isinstance(value, dict) or part not in value:
                value = None
                break
            value = value[part]
        if isinstance(value, str):
            return render(value, payload)
    return ''
