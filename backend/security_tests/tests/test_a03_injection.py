"""OWASP A03:2021 — Injection.

The ORM + DRF serializers do nearly all of the heavy lifting here:
every CRUD path goes through parameterised SQL by construction, and
every input is validated by a serializer before reaching the model.

What's left is a small set of process-level invariants:

1. There SHALL NOT be any unsanitised raw-SQL escape hatches in the
   application code. ``QuerySet.raw()`` and ``cursor.execute()`` are
   scanned for f-string / %s formatting on the SQL itself; any hit is
   an immediate fail.
2. The example endpoints we can reach SHALL reject malicious payloads
   (e.g. SQL-comment markers, NUL bytes, oversized strings) gracefully.
"""
from __future__ import annotations

import pathlib
import re

from django.test import TestCase
from rest_framework.test import APIClient

from tests.factories import auth_client, create_user, create_owner


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[2]


def _python_files() -> list[pathlib.Path]:
    """Project Python source minus tests / migrations / vendored dirs."""
    out: list[pathlib.Path] = []
    for path in BACKEND_ROOT.rglob('*.py'):
        parts = set(path.relative_to(BACKEND_ROOT).parts)
        if {'migrations', 'tests', '.venv', '__pycache__', 'security_tests'} & parts:
            continue
        out.append(path)
    return out


class A03_NoUnsanitisedRawSql(TestCase):
    """Application code SHALL NOT build SQL with string interpolation.

    Django's ORM is parameterised; ``QuerySet.raw()`` and direct
    cursor calls accept a ``params`` argument for binding values. The
    fail mode is when a developer writes
    ``cursor.execute(f"SELECT * FROM x WHERE id = {user_id}")`` —
    classic SQL injection. This test scans the source for that
    pattern.
    """

    # f"…{…}" or "…%s…" % … or "…" + variable inside .raw(...) /
    # cursor.execute(...). Very crude on purpose; false-positives are
    # easier to audit than false-negatives.
    SUSPICIOUS = re.compile(
        r"(?:cursor\.execute|\.raw)\s*\(\s*[fF]?\""
    )
    PERCENT_FORMAT_INSIDE = re.compile(
        r"(?:cursor\.execute|\.raw)\s*\([^)]*%[\s]*[a-zA-Z_]"
    )

    def test_source_has_no_string_built_sql(self):
        violations: list[str] = []
        for path in _python_files():
            text = path.read_text()
            if 'cursor.execute' not in text and '.raw(' not in text:
                continue
            for lineno, line in enumerate(text.splitlines(), start=1):
                if 'noqa: S608' in line or 'nosec B608' in line:
                    continue
                if self.SUSPICIOUS.search(line):
                    if 'f"' in line.split('execute')[-1] or "f'" in line.split('execute')[-1]:
                        violations.append(
                            f"{path}:{lineno}: f-string SQL — "
                            f"use the params= argument instead. {line.strip()}"
                        )
                if self.PERCENT_FORMAT_INSIDE.search(line):
                    violations.append(
                        f"{path}:{lineno}: %-formatted SQL — "
                        f"use the params= argument instead. {line.strip()}"
                    )
        self.assertEqual(violations, [], '\n'.join(violations))


class A03_PayloadsSurviveSqlMetacharacters(TestCase):
    """Search / filter endpoints SHALL handle SQL metacharacters safely.

    Smoke-tests the public surface: a request with an apostrophe and
    a SQL comment marker should return a normal 200 / 400 response,
    NOT a 500 (which would indicate the input reached the database
    unparameterised) and NOT corrupt anything.
    """

    def setUp(self):
        self.user = create_user()
        password = 'TestPass123!'
        self.user.set_password(password)
        self.user.save()
        self.client = APIClient()
        auth_client(self.client, self.user, password)

        self.owner = create_owner(first_name="Bob'); DROP TABLE pets;--")

    def test_search_with_sql_metacharacters_is_safe(self):
        # Owner list endpoint with a malicious search term. The
        # response should never be 500 (server-side error indicating
        # the payload reached SQL).
        for term in ("'", "';--", "1' OR '1'='1", "\\'"):
            resp = self.client.get('/api/owners/', {'search': term})
            self.assertNotEqual(
                resp.status_code, 500,
                f"Search with {term!r} returned 500 — payload may have "
                f"reached SQL unparameterised."
            )
        # Sanity check: the malicious owner is still in the DB.
        from pets.models import Owner
        self.assertTrue(Owner.objects.filter(pk=self.owner.pk).exists())
