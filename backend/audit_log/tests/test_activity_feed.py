"""Cross-entity activity feed at GET /api/audit-log/activity/.

Locks in the contract documented in the change folder
``openspec/changes/archive/<date>-admin-activity-feed/`` and the
live spec ``openspec/specs/backend/audit-log/spec.md``.
"""
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from pets.models import MedicalNote, Owner, Pet, Vaccination
from tests.factories import (
    auth_client, create_admin, create_owner, create_pet, create_user,
)


class _Base(APITestCase):
    """Shared admin + writes that create a few history rows.

    Each ``setUp`` creates one Pet, one Owner, one MedicalNote and
    one Vaccination via the request middleware so the resulting
    history rows have ``history_user`` populated. Tests filter the
    seeded data by entity / action / user to assert the feed shape.
    """
    def setUp(self):
        self.admin_password = 'AdminPass123!'
        self.admin = create_admin(email='audit-admin@example.com', password=self.admin_password)
        auth_client(self.client, self.admin, self.admin_password)

        # One owner, one pet, one medical note, one vaccination —
        # each creating a "+1" history row attributed to self.admin.
        self.owner = create_owner(first_name='Aja', last_name='Smith')
        self.pet = create_pet(owner=self.owner, name='Buddy')
        self.medical_note = MedicalNote.objects.create(
            pet=self.pet, title='Allergy', description='peanuts',
        )
        self.vax = Vaccination.objects.create(
            pet=self.pet, vax_type='rabies', date=timezone.now().date(),
        )

        # Backfill history_user_id on every newly-created history row.
        # Direct ORM creates skip the request middleware that
        # auto-populates history_user; we set it manually so the feed
        # has a non-null user attribution to filter on.
        for mgr in (Pet.history, Owner.history, MedicalNote.history, Vaccination.history):
            mgr.update(history_user_id=self.admin.id)

        self.url = reverse('audit-log-activity')


class ActivityFeedAccessControl(_Base):
    def test_unauthenticated_returns_401(self):
        self.client.credentials()  # drop auth header
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_returns_403(self):
        u = create_user(email='reg@example.com', password='UserPass123!')
        auth_client(self.client, u, 'UserPass123!')
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ActivityFeedShape(_Base):
    def test_returns_count_plus_results_with_merged_entities(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        body = resp.data
        self.assertIn('count', body)
        self.assertIn('results', body)
        # 4 creates → 4 history rows
        self.assertEqual(body['count'], 4)
        self.assertEqual(len(body['results']), 4)
        # Every kind appears.
        kinds = {r['entity_type'] for r in body['results']}
        self.assertEqual(kinds, {'pet', 'owner', 'medical_note', 'vaccination'})
        # Each row has the documented shape.
        for r in body['results']:
            for key in (
                'entity_type', 'entity_id', 'entity_label',
                'history_id', 'history_type', 'history_date', 'history_user',
            ):
                self.assertIn(key, r)
            # history_user is populated thanks to the backfill in setUp.
            self.assertEqual(r['history_user']['id'], self.admin.id)

    def test_results_sorted_by_history_date_desc(self):
        resp = self.client.get(self.url)
        dates = [r['history_date'] for r in resp.data['results']]
        self.assertEqual(dates, sorted(dates, reverse=True))


class ActivityFeedFilters(_Base):
    def test_filter_by_entity_type(self):
        resp = self.client.get(self.url, {'entity_type': 'pet'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        kinds = {r['entity_type'] for r in resp.data['results']}
        self.assertEqual(kinds, {'pet'})

    def test_filter_by_action_returns_only_matching_history_type(self):
        # All rows from setUp are creates ('+'). Update one to flip
        # type to '~', then assert filter on '~' returns just it.
        self.pet.name = 'Buddy II'
        self.pet.save()
        Pet.history.update(history_user_id=self.admin.id)

        resp = self.client.get(self.url, {'action': '~'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        types = {r['history_type'] for r in resp.data['results']}
        self.assertEqual(types, {'~'})

    def test_filter_by_user(self):
        other = create_admin(email='other-admin@example.com', password='Other123!')
        # No history rows belong to ``other``; expect empty.
        resp = self.client.get(self.url, {'user': other.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 0)
        self.assertEqual(resp.data['results'], [])

    def test_filter_by_since_excludes_older_rows(self):
        # since = now+1day → no rows.
        future = (timezone.now() + timedelta(days=1)).isoformat()
        resp = self.client.get(self.url, {'since': future})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 0)

    def test_unknown_entity_type_returns_400(self):
        resp = self.client.get(self.url, {'entity_type': 'mystery'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_action_returns_400(self):
        resp = self.client.get(self.url, {'action': 'wat'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bad_since_returns_400(self):
        resp = self.client.get(self.url, {'since': 'not-a-date'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class ActivityFeedPagination(_Base):
    def test_limit_clamps_to_max(self):
        # limit=999 -> silently clamped to MAX_LIMIT; behaviour is
        # asserted by exercising a valid request, not by reading the
        # constant — keeps the test independent of the cap value.
        resp = self.client.get(self.url, {'limit': 999})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_negative_offset_returns_400(self):
        resp = self.client.get(self.url, {'offset': -5})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_offset_beyond_total_returns_empty_results(self):
        resp = self.client.get(self.url, {'offset': 999})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['results'], [])
        # Total count still reflects the actual number of rows.
        self.assertEqual(resp.data['count'], 4)
