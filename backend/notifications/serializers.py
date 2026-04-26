from rest_framework import serializers

from .models import Notification, NotificationPreference, NotificationTemplate
from .templating import render


class _PetMiniSerializer(serializers.Serializer):
    """Compact pet projection embedded in each Notification row."""
    id = serializers.IntegerField()
    name = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    pet = serializers.SerializerMethodField()
    forward = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'kind', 'pet', 'event_date', 'payload',
            'created_at', 'read_at', 'dismissed_at', 'forwarded_at',
            'forward',
        ]
        read_only_fields = fields

    def get_pet(self, obj):
        return {'id': obj.pet_id, 'name': obj.pet.name}

    def get_forward(self, obj):
        scope = obj.template_scope
        if scope is None:
            return None
        owner = obj.pet.owner
        owner_email = (owner.email if owner else '') or ''
        owner_phone = (owner.phone if owner else '') or ''

        # Look up the operator's per-nursery template, or materialise an
        # empty row so subsequent calls reuse it.
        template, _ = NotificationTemplate.objects.get_or_create(scope=scope)

        # Localised fallbacks live in the translations file under
        # ``notifications.forward.<scope>.*``. We don't load them here
        # (the frontend hits ``/api/translations/<lang>/`` separately);
        # instead we let an empty operator field pass through as ''.
        # The frontend's ``t()`` falls through to the translation when
        # given an empty string... actually we need to send the key. Use
        # the key directly when the field is empty so the frontend does
        # the substitution itself.
        request = self.context.get('request') if hasattr(self, 'context') else None
        lang = (
            request.headers.get('Accept-Language', 'en')[:2]
            if request else 'en'
        )

        payload = obj.payload or {}

        def field_or_default(field_value, default_key):
            """Return the operator's text rendered against the payload,
            or the localised default key (the frontend resolves it)."""
            if field_value:
                return render(field_value, payload)
            # Defer translation to the frontend by sending the key.
            return _resolve_default(default_key, lang, payload)

        result = {
            'email': {
                'subject': field_or_default(
                    template.email_subject,
                    f'notifications.forward.{scope}.email.subject',
                ),
                'body': field_or_default(
                    template.email_body,
                    f'notifications.forward.{scope}.email.body',
                ),
                'to': owner_email or None,
            },
            'whatsapp': {
                'text': field_or_default(
                    template.whatsapp_text,
                    f'notifications.forward.{scope}.whatsapp.text',
                ),
                'phone': owner_phone or None,
            },
        }
        return result


def _resolve_default(key, lang, payload):
    """Resolve a localised default by reading the static translation
    file directly. We avoid pulling translation infrastructure into a
    dedicated service here — the file is small and the JSON read is a
    one-shot per request that hits the OS page cache after the first
    call.
    """
    import json
    import os
    from django.conf import settings

    base = os.path.join(settings.BASE_DIR, 'translations')
    candidates = [lang, 'en']  # Always fall back to English
    for candidate in candidates:
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
    # Final fallback: return the key literal so missing translations
    # surface in the UI instead of silently rendering empty.
    return key


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['email_enabled', 'updated_at']
        read_only_fields = ['updated_at']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = ['scope', 'email_subject', 'email_body', 'whatsapp_text', 'updated_at']
        read_only_fields = ['scope', 'updated_at']
