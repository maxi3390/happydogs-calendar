from django.db import models


class FeatureFlag(models.Model):
    """Global boolean toggle for a product surface.

    Keyed by a stable slug (``key``) rather than numeric id so code
    references survive re-seeding and the admin URL is human-readable.
    The source of truth for which flags exist is the seed migration in
    ``feature_flags/migrations/0002_seed_flags.py`` — flags added later
    should be added the same way.
    """

    key = models.SlugField(max_length=64, unique=True)
    label = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']

    def __str__(self) -> str:
        state = 'on' if self.enabled else 'off'
        return f'{self.key} ({state})'
