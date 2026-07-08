"""OWASP A08:2021 — Software and Data Integrity Failures.

Application-level invariants:

1. The codebase MUST NOT deserialise untrusted data with ``pickle``,
   ``yaml.load``, or ``shelve``. Bandit's B301/B506 catch most of
   these; this test enforces the same rule project-wide so a
   reviewer doesn't have to remember to run bandit.
2. Uploaded files (avatars, documents) SHALL be size-validated and
   content-type-validated. We assert the validator is wired on the
   relevant model fields.
"""
from __future__ import annotations

import pathlib
import re
from io import BytesIO

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image as PILImage
from rest_framework.test import APITestCase

from domain.documents.models import Document
from domain.owners.models import Owner
from domain.pets.models import Pet
from tests.factories import create_and_auth_user, create_pet


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[2]


def _python_files() -> list[pathlib.Path]:
    out: list[pathlib.Path] = []
    for path in BACKEND_ROOT.rglob('*.py'):
        parts = set(path.relative_to(BACKEND_ROOT).parts)
        if {'migrations', 'tests', '.venv', '__pycache__', 'security_tests'} & parts:
            continue
        out.append(path)
    return out


class A08_NoUnsafeDeserialisation(TestCase):
    """Application code SHALL NOT call ``pickle.load(s)`` or ``yaml.load``.

    yaml.load with no Loader= is the trap that's bitten basically
    every Python project at some point. yaml.safe_load is the
    replacement and is allowed.
    """

    SUSPICIOUS = (
        re.compile(r"\bpickle\.(loads?|load_session)\b"),
        re.compile(r"\bcPickle\."),
        # yaml.load WITHOUT a Loader= kwarg.
        re.compile(r"\byaml\.load\(\s*[^,)]+\s*\)"),
        re.compile(r"\bshelve\.open\b"),
        re.compile(r"\bmarshal\.loads?\b"),
    )

    def test_source_has_no_unsafe_deserialisation(self):
        violations: list[str] = []
        for path in _python_files():
            text = path.read_text()
            for lineno, line in enumerate(text.splitlines(), start=1):
                if 'noqa: S301' in line or 'nosec' in line:
                    continue
                for rx in self.SUSPICIOUS:
                    if rx.search(line):
                        violations.append(
                            f"{path}:{lineno}: unsafe deserialisation "
                            f"({line.strip()})"
                        )
                        break
        self.assertEqual(violations, [], '\n'.join(violations))


class A08_FileUploadFieldsHaveValidators(TestCase):
    """Avatar / document fields SHALL run validate_file_size + validate_image_type."""

    def _validators_for(self, model, field_name):
        field = model._meta.get_field(field_name)
        return [v.__name__ for v in field.validators if hasattr(v, '__name__')]

    def test_pet_profile_picture_validators(self):
        names = self._validators_for(Pet, 'profile_picture')
        self.assertIn('validate_file_size', names)
        self.assertIn('validate_image_type', names)

    def test_owner_profile_picture_validators(self):
        names = self._validators_for(Owner, 'profile_picture')
        self.assertIn('validate_file_size', names)
        self.assertIn('validate_image_type', names)

    def test_document_file_validators(self):
        names = self._validators_for(Document, 'file')
        self.assertIn('validate_file_size', names)
        self.assertIn('validate_document_type', names)


class A08_UploadTypeValidatedByContent(APITestCase):
    """Upload validation SHALL trust the file's bytes, not the client-declared
    Content-Type. A file whose bytes are not an allowed type is rejected even
    when it claims to be an image; a genuine image whose declared type is
    "wrong" is still accepted because the sniffed type is allowed."""

    def setUp(self):
        self.user = create_and_auth_user(self.client)
        self.pet = create_pet()
        self.url = reverse('document-list')

    def _png_bytes(self):
        buf = BytesIO()
        PILImage.new('RGB', (10, 10), color='blue').save(buf, format='PNG')
        return buf.getvalue()

    def test_disguised_executable_is_rejected(self):
        # ELF/script-ish bytes declared as image/jpeg.
        evil = SimpleUploadedFile(
            'payload.jpg',
            b'\x7fELF\x02\x01\x01\x00' + b'\x00' * 64,
            content_type='image/jpeg',
        )
        resp = self.client.post(
            self.url, {'pet': self.pet.id, 'file': evil}, format='multipart',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Document.objects.count(), 0)

    def test_genuine_image_with_wrong_declared_type_is_accepted(self):
        # Real PNG bytes but the client lies about the type.
        f = SimpleUploadedFile('photo.jpg', self._png_bytes(), content_type='image/jpeg')
        resp = self.client.post(
            self.url, {'pet': self.pet.id, 'file': f}, format='multipart',
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(Document.objects.count(), 1)
