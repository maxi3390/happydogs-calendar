"""Public helpers for reading feature-flag state from backend code."""
from __future__ import annotations

from .models import FeatureFlag


def is_feature_enabled(key: str) -> bool:
    """Return ``True`` iff the flag exists and is turned on.

    Fails closed — missing keys return ``False`` so adding a new call
    site before the corresponding seed migration lands does not
    accidentally unlock a surface.
    """
    return FeatureFlag.objects.filter(key=key, enabled=True).exists()
