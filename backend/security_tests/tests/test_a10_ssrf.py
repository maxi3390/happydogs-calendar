"""OWASP A10:2021 — Server-Side Request Forgery.

Coverage caveat: A10 in its full generality requires taint analysis
to track which URLs are user-supplied. This suite implements the cheap
half:

1. The codebase has no outbound HTTP call against a URL that flows
   from request data without going through an allowlist. Currently
   the application makes ZERO outbound HTTP calls (the notifications
   feature only sends email; everything else is local DB / file
   storage). This test enforces that property — adding a
   ``requests.get(...)`` or ``urllib.urlopen(...)`` to a viewset
   SHALL trip this test and force the developer to think about
   SSRF.

2. Bandit covers the obvious cases (B310 urllib_urlopen, B501
   request_with_no_cert_validation). The orchestrator runs bandit
   so those map to A10 in the report automatically.
"""
from __future__ import annotations

import pathlib
import re

from django.test import TestCase


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[2]


def _application_python_files() -> list[pathlib.Path]:
    """Application source minus tests, migrations, and `_tests/` apps.

    We exclude ``security_tests/`` so the regex-strings *in this very
    file* don't trip the matcher. We exclude ``data_portability`` ?
    No — data_portability is fine; it doesn't make outbound HTTP.
    """
    out: list[pathlib.Path] = []
    for path in BACKEND_ROOT.rglob('*.py'):
        parts = set(path.relative_to(BACKEND_ROOT).parts)
        if {'migrations', 'tests', '.venv', '__pycache__', 'security_tests'} & parts:
            continue
        out.append(path)
    return out


class A10_NoUnvettedOutboundHttp(TestCase):
    """Application code SHALL NOT initiate outbound HTTP without an allowlist.

    This is a coarse-grained guard: we ban every form of outbound
    HTTP call because the application doesn't legitimately make any
    today. The day someone needs one (e.g. a vet directory lookup),
    the right answer is to add it through a vetted helper that
    enforces an allowlist of trusted hosts and to update this test
    to allow that helper.
    """

    BANNED = (
        re.compile(r"\brequests\.(get|post|put|patch|delete|head|request|Session)\b"),
        re.compile(r"\burllib\.request\.(urlopen|Request)\b"),
        re.compile(r"\bhttplib2\."),
        re.compile(r"\bhttpx\.(get|post|put|patch|delete|Client)\b"),
        re.compile(r"\baiohttp\."),
    )

    def test_no_outbound_http_in_application_code(self):
        violations: list[str] = []
        for path in _application_python_files():
            text = path.read_text()
            for lineno, line in enumerate(text.splitlines(), start=1):
                if 'noqa: SSRF' in line or 'nosec' in line:
                    continue
                # Skip import lines — what we care about is call sites.
                if line.lstrip().startswith(('import ', 'from ')):
                    continue
                for rx in self.BANNED:
                    if rx.search(line):
                        violations.append(
                            f"{path}:{lineno}: outbound HTTP call "
                            f"({line.strip()}). Add an allowlist helper "
                            f"and exempt it explicitly if this is intentional."
                        )
                        break
        self.assertEqual(violations, [], '\n'.join(violations))
