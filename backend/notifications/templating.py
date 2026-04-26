"""Template rendering for owner-bound notification messages.

Operators type free-text into ``NotificationTemplate.email_subject`` /
``email_body`` / ``whatsapp_text`` using ``{placeholder}`` substitutions
(e.g. ``Hi {owner_first_name}, {pet_name}'s vaccination is due on
{due_date}.``). Rendering uses Python's ``str.format_map`` with a
defensive dict that returns the literal ``{key}`` when the key is
missing, so a typo in the operator's template doesn't 500 the API.
"""


class _SafeDict(dict):
    """A ``dict`` subclass whose ``__missing__`` returns the literal
    ``{key}`` instead of raising ``KeyError``. Used with
    ``str.format_map`` to keep template rendering crash-free even when
    operators reference unknown placeholders.
    """

    def __missing__(self, key):
        return '{' + key + '}'


def render(template_field: str, payload: dict) -> str:
    """Render ``template_field`` against ``payload`` using safe
    substitution. Returns the input verbatim when it contains no
    placeholders or when every placeholder is in the payload; returns
    the input with literal ``{unknown}`` markers preserved when an
    operator referenced something the payload doesn't carry.
    """
    if not template_field:
        return ''
    return template_field.format_map(_SafeDict(payload))
