#!/usr/bin/env python3
"""Aggregate security-suite artefacts into one Markdown report.

Reads (inside the per-run directory passed as argv[1]):
  - bandit.json
  - pip-audit.json
  - npm-audit.json
  - django-check.txt
  - owasp-tests.txt

Writes:
  - REPORT.md (in the same per-run directory)

Exits non-zero when at least one finding has severity ``critical``,
zero otherwise. The orchestrator (`run-scans.sh`) propagates the exit
code so `make security` is suitable for CI gating.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


# ── Severity & OWASP framing ──────────────────────────────────────────

SEVERITY_ORDER = ('critical', 'warning', 'info')

OWASP_TITLES: dict[str, str] = {
    'A01': 'A01 — Broken Access Control',
    'A02': 'A02 — Cryptographic Failures',
    'A03': 'A03 — Injection',
    'A04': 'A04 — Insecure Design',
    'A05': 'A05 — Security Misconfiguration',
    'A06': 'A06 — Vulnerable and Outdated Components',
    'A07': 'A07 — Identification and Authentication Failures',
    'A08': 'A08 — Software and Data Integrity Failures',
    'A09': 'A09 — Security Logging and Monitoring Failures',
    'A10': 'A10 — Server-Side Request Forgery (SSRF)',
}

OWASP_NOTES: dict[str, str] = {
    'A04': (
        'No automated coverage; this category requires threat-modelling '
        'discipline that lives outside the scanner. Refer to the '
        'design notes in `openspec/specs/` and the change-folder '
        '`design.md` documents for the system\'s threat model.'
    ),
    'A10': (
        'Bandit covers the obvious cases (B310 `urllib.urlopen`, B501 '
        '`request_with_no_cert_validation`); full SSRF taint analysis '
        'is out of scope for this suite. The custom test '
        '`A10_NoUnvettedOutboundHttp` enforces a no-outbound-HTTP '
        'allowlist project-wide as a coarse-grained guard.'
    ),
}


@dataclass(frozen=True)
class Finding:
    category: str          # 'A01' .. 'A10'
    severity: str          # 'critical' | 'warning' | 'info'
    tool: str
    title: str
    location: str
    description: str = ''


@dataclass
class ToolStatus:
    """How a tool fared during this run."""
    name: str
    artefact: str
    ok: bool
    note: str = ''
    findings: list[Finding] = field(default_factory=list)


# ── Bandit ─────────────────────────────────────────────────────────────

# Bandit test-id → OWASP category. Generic Python checks tend to span
# multiple categories; we pick the one the team is most likely to act
# on per finding.
BANDIT_CATEGORY: dict[str, str] = {
    'B101': 'A05',  # assert_used (debug code shipped to prod)
    'B102': 'A03',  # exec_used
    'B103': 'A05',  # set_bad_file_permissions
    'B104': 'A05',  # hardcoded_bind_all_interfaces
    'B105': 'A02',  # hardcoded_password_string
    'B106': 'A02',  # hardcoded_password_funcarg
    'B107': 'A02',  # hardcoded_password_default
    'B108': 'A05',  # hardcoded_tmp_directory
    'B110': 'A09',  # try_except_pass (silently swallowed errors)
    'B112': 'A09',  # try_except_continue
    'B201': 'A05',  # flask_debug_true
    'B301': 'A08',  # pickle / cPickle
    'B302': 'A08',  # marshal
    'B303': 'A02',  # md5 / sha1
    'B304': 'A02',  # ciphers (DES / RC4)
    'B305': 'A02',  # cipher_modes (ECB)
    'B306': 'A05',  # mktemp_q
    'B307': 'A03',  # eval_used
    'B308': 'A05',  # mark_safe
    'B310': 'A10',  # urllib_urlopen — SSRF / open redirect surface
    'B311': 'A02',  # random (non-cryptographic randoms)
    'B313': 'A03',  # xml bad expat
    'B314': 'A03',  # xml bad ElementTree
    'B315': 'A03',  # xml bad expat reader
    'B316': 'A03',  # xml bad expatbuilder
    'B317': 'A03',  # xml bad sax
    'B318': 'A03',  # xml bad minidom
    'B319': 'A03',  # xml bad pulldom
    'B320': 'A03',  # xml bad etree
    'B321': 'A05',  # ftp / telnet (cleartext protocols)
    'B324': 'A02',  # hashlib insecure functions
    'B325': 'A05',  # tempnam
    'B501': 'A02',  # request without cert validation
    'B502': 'A02',  # ssl with bad version
    'B503': 'A02',  # ssl with bad defaults
    'B504': 'A02',  # ssl without explicit version
    'B505': 'A02',  # weak cryptographic key
    'B506': 'A08',  # yaml_load
    'B507': 'A02',  # ssh_no_host_key_verification
    'B601': 'A03',  # paramiko_calls
    'B602': 'A03',  # subprocess_popen_with_shell_equals_true
    'B603': 'A03',  # subprocess_without_shell_equals_true
    'B604': 'A03',  # any_other_function_with_shell_equals_true
    'B605': 'A03',  # start_process_with_a_shell
    'B606': 'A03',  # start_process_with_no_shell
    'B607': 'A03',  # start_process_with_partial_path
    'B608': 'A03',  # hardcoded_sql_expressions
    'B609': 'A03',  # linux_commands_wildcard_injection
    'B610': 'A03',  # django_extra_used
    'B611': 'A03',  # django_rawsql_used
    'B701': 'A03',  # jinja2_autoescape_false
    'B702': 'A03',  # use_of_mako_templates
    'B703': 'A03',  # django_mark_safe
}


def _bandit_severity(record: dict) -> str:
    issue = (record.get('issue_severity') or '').upper()
    if issue == 'HIGH':
        return 'critical'
    if issue in ('MEDIUM', 'LOW'):
        return 'warning'
    return 'info'


def parse_bandit(path: Path) -> ToolStatus:
    status = ToolStatus(name='bandit', artefact='bandit.json', ok=False)
    try:
        data = json.loads(path.read_text())
    except Exception as exc:  # broad on purpose — any decode failure
        status.note = f'Could not parse bandit.json: {exc}'
        return status

    errors = data.get('errors') or []
    if errors:
        status.note = '; '.join(
            e.get('reason') or e.get('message') or str(e) for e in errors
        )

    for r in data.get('results', []):
        test_id = r.get('test_id', '???')
        category = BANDIT_CATEGORY.get(test_id, 'A05')
        severity = _bandit_severity(r)
        status.findings.append(Finding(
            category=category,
            severity=severity,
            tool='bandit',
            title=f"{test_id}: {r.get('issue_text', 'untitled bandit finding')}",
            location=f"{r.get('filename')}:{r.get('line_number')}",
            description=(r.get('code') or '').strip().replace('\n', ' ')[:200],
        ))
    status.ok = True
    return status


# ── pip-audit ──────────────────────────────────────────────────────────

def _cve_severity(severity_text: str | None, has_fix: bool) -> str:
    """Map a pip-audit / npm advisory text severity → our three tiers.

    Conservative: if we can't classify confidently, default to warning.
    """
    if not severity_text:
        return 'warning'
    s = severity_text.lower()
    if 'critical' in s and has_fix:
        return 'critical'
    if 'high' in s and has_fix:
        return 'critical'
    return 'warning'


def parse_pip_audit(path: Path) -> ToolStatus:
    status = ToolStatus(name='pip-audit', artefact='pip-audit.json', ok=False)
    try:
        data = json.loads(path.read_text())
    except Exception as exc:
        status.note = f'Could not parse pip-audit.json: {exc}'
        return status

    if data.get('errors'):
        status.note = '; '.join(str(e) for e in data['errors'])

    # pip-audit can return the same advisory twice when it's recorded
    # under multiple aliases in the PyPA database; we dedupe on
    # (package, advisory id) to keep the report tidy.
    seen: set[tuple[str, str]] = set()

    for dep in data.get('dependencies', []):
        name = dep.get('name', '?')
        version = dep.get('version', '?')
        for v in dep.get('vulns') or []:
            advisory_id = v.get('id', '?')
            key = (name, advisory_id)
            if key in seen:
                continue
            seen.add(key)
            fix_versions = sorted(set(v.get('fix_versions') or []))
            sev = _cve_severity(
                # pip-audit's JSON doesn't always include a severity
                # field; we read CVSS scores from the `aliases` block
                # when present.
                _cvss_from_aliases(v.get('aliases') or []),
                has_fix=bool(fix_versions),
            )
            status.findings.append(Finding(
                category='A06',
                severity=sev,
                tool='pip-audit',
                title=(
                    f"{advisory_id}: {name} {version} "
                    f"→ fix in {', '.join(fix_versions) or 'no fix yet'}"
                ),
                location=f'{name}=={version}',
                description=(v.get('description') or '').strip()[:300],
            ))
    status.ok = True
    return status


def _cvss_from_aliases(aliases: list[str]) -> str | None:
    """pip-audit puts severity hints in alias strings sometimes."""
    for a in aliases:
        m = re.search(r'CVSS:[\d.]+/(\w+)', a)
        if m:
            return m.group(1)
    return None


# ── npm audit ──────────────────────────────────────────────────────────

NPM_SEVERITY_TO_OURS: dict[str, str] = {
    'critical': 'critical',
    'high': 'critical',
    'moderate': 'warning',
    'low': 'warning',
    'info': 'info',
}


def parse_npm_audit(path: Path) -> ToolStatus:
    status = ToolStatus(name='npm audit', artefact='npm-audit.json', ok=False)
    try:
        data = json.loads(path.read_text())
    except Exception as exc:
        status.note = f'Could not parse npm-audit.json: {exc}'
        return status

    # `npm audit --json` schema:
    #   data['vulnerabilities'][pkg] = { name, severity, via: [...], fixAvailable, ... }
    vulns = data.get('vulnerabilities') or {}
    for pkg, info in vulns.items():
        sev_raw = info.get('severity', 'warning')
        ours = NPM_SEVERITY_TO_OURS.get(sev_raw, 'warning')
        # No fix available → demote critical → warning to avoid
        # blocking releases on un-patchable advisories.
        fix_available = info.get('fixAvailable')
        if not fix_available and ours == 'critical':
            ours = 'warning'
        # via can be a list of advisory blocks (dicts) or strings.
        first_via = next(
            (v for v in (info.get('via') or []) if isinstance(v, dict)),
            None,
        )
        title = first_via.get('title') if first_via else f'{pkg} ({sev_raw})'
        url = first_via.get('url') if first_via else ''
        status.findings.append(Finding(
            category='A06',
            severity=ours,
            tool='npm audit',
            title=f'{pkg}: {title}',
            location=url or pkg,
            description=f'severity={sev_raw}, fixAvailable={bool(fix_available)}',
        ))
    status.ok = True
    return status


# ── Django check --deploy ──────────────────────────────────────────────

DJANGO_DEPLOY_LINE = re.compile(
    r'^\?:?\s*(?P<level>\(security\.[EW]\d+\))\s*(?P<message>.+)$'
)


def parse_django_check(path: Path) -> ToolStatus:
    status = ToolStatus(name='django check --deploy', artefact='django-check.txt', ok=False)
    try:
        text = path.read_text()
    except Exception as exc:
        status.note = f'Could not read django-check.txt: {exc}'
        return status

    for line in text.splitlines():
        m = DJANGO_DEPLOY_LINE.match(line.strip())
        if not m:
            continue
        level = m.group('level')
        message = m.group('message').strip()
        # security.E### = error; security.W### = warning.
        is_error = '.E' in level
        # Most Django deploy issues are misconfig (A05). Cookie /
        # session / SSL ones lean A02 in OWASP framing; we tag them
        # accordingly.
        category = (
            'A02' if any(k in message.lower() for k in (
                'ssl', 'hsts', 'secure', 'cookie',
            )) else 'A05'
        )
        status.findings.append(Finding(
            category=category,
            severity='critical' if is_error else 'warning',
            tool='django check --deploy',
            title=f'{level}: {message[:160]}',
            location='nursery/settings.py',
        ))
    status.ok = True
    return status


# ── OWASP test suite ───────────────────────────────────────────────────

OWASP_TESTS_FAILURE_RX = re.compile(
    r'^(?:FAIL|ERROR): test_\w+ \((?P<dotted>security_tests\.tests\.test_(?P<axx>a\d+)_\w+\.[\w_]+\.test_\w+)\)'
)
OWASP_TESTS_SUMMARY_RX = re.compile(r'^Ran (?P<n>\d+) tests? in')
OWASP_TESTS_OK_RX = re.compile(r'^OK\s*$')


def parse_owasp_tests(path: Path) -> ToolStatus:
    status = ToolStatus(name='owasp-tests', artefact='owasp-tests.txt', ok=False)
    try:
        text = path.read_text()
    except Exception as exc:
        status.note = f'Could not read owasp-tests.txt: {exc}'
        return status

    ran = 0
    overall_ok = False
    for line in text.splitlines():
        m = OWASP_TESTS_SUMMARY_RX.match(line.strip())
        if m:
            ran = int(m.group('n'))
            continue
        if OWASP_TESTS_OK_RX.match(line.strip()):
            overall_ok = True
            continue
        m = OWASP_TESTS_FAILURE_RX.match(line.strip())
        if m:
            axx = m.group('axx').upper()
            status.findings.append(Finding(
                category=axx,
                severity='critical',
                tool='owasp-tests',
                title=m.group('dotted'),
                location=path.name,
            ))
    if ran:
        status.note = f'{ran} tests ran; overall_ok={overall_ok}'
    status.ok = True
    return status


# ── Report rendering ───────────────────────────────────────────────────

def render_report(tools: list[ToolStatus]) -> tuple[str, int]:
    findings: list[Finding] = []
    for t in tools:
        findings.extend(t.findings)

    by_cat: dict[str, list[Finding]] = {axx: [] for axx in OWASP_TITLES}
    for f in findings:
        by_cat.setdefault(f.category, []).append(f)

    sev_counts = {s: 0 for s in SEVERITY_ORDER}
    for f in findings:
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    overall_ok = sev_counts['critical'] == 0
    exit_code = 0 if overall_ok else 1

    out: list[str] = []
    out.append('# Security report')
    out.append('')
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    out.append(f'_Generated {ts} by `make security`._')
    out.append('')
    badge = ' SECURITY OK ' if overall_ok else ' CRITICAL FINDINGS '
    out.append(f'**Status:** {badge}')
    out.append('')

    out.append('## Severity counts')
    out.append('')
    out.append('| Severity | Count |')
    out.append('|---|---|')
    for s in SEVERITY_ORDER:
        out.append(f'| {s.title()} | {sev_counts[s]} |')
    out.append('')

    out.append('## OWASP coverage')
    out.append('')
    out.append('| Category | Findings (Crit / Warn / Info) | Notes |')
    out.append('|---|---|---|')
    for axx, title in OWASP_TITLES.items():
        cat_findings = by_cat[axx]
        c = sum(1 for f in cat_findings if f.severity == 'critical')
        w = sum(1 for f in cat_findings if f.severity == 'warning')
        i = sum(1 for f in cat_findings if f.severity == 'info')
        note = OWASP_NOTES.get(axx, '')
        out.append(f'| {title} | {c} / {w} / {i} | {note} |')
    out.append('')

    out.append('## Tool results')
    out.append('')
    out.append('| Tool | Artefact | Status | Note |')
    out.append('|---|---|---|---|')
    for t in tools:
        ok = 'ok' if t.ok else 'failed'
        note = t.note.replace('|', '/') if t.note else ''
        # Artefact paths are relative to REPORT.md, which now lives
        # inside the per-run subdirectory next to the JSON / text
        # outputs. A bare filename keeps the link valid regardless of
        # which run the operator is reading.
        out.append(
            f'| {t.name} | `{t.artefact}` | {ok} | {note} |'
        )
    out.append('')

    out.append('## Findings by OWASP category')
    out.append('')
    for axx, title in OWASP_TITLES.items():
        out.append(f'### {title}')
        out.append('')
        note = OWASP_NOTES.get(axx)
        if note:
            out.append(f'> {note}')
            out.append('')
        cat_findings = by_cat[axx]
        if not cat_findings:
            out.append('_No findings._')
            out.append('')
            continue
        for sev in SEVERITY_ORDER:
            sev_findings = [f for f in cat_findings if f.severity == sev]
            if not sev_findings:
                continue
            out.append(f'#### {sev.title()} ({len(sev_findings)})')
            out.append('')
            for f in sev_findings:
                out.append(f'- **{f.title}**')
                out.append(f'    - tool: `{f.tool}`')
                out.append(f'    - location: `{f.location}`')
                if f.description:
                    out.append(f'    - {f.description}')
            out.append('')

    return '\n'.join(out), exit_code


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(
            'usage: generate-report.py <security-reports-dir>',
            file=sys.stderr,
        )
        return 2
    report_dir = Path(argv[1]).resolve()
    if not report_dir.is_dir():
        print(f'no such directory: {report_dir}', file=sys.stderr)
        return 2

    tools = [
        parse_bandit(report_dir / 'bandit.json'),
        parse_pip_audit(report_dir / 'pip-audit.json'),
        parse_npm_audit(report_dir / 'npm-audit.json'),
        parse_django_check(report_dir / 'django-check.txt'),
        parse_owasp_tests(report_dir / 'owasp-tests.txt'),
    ]

    text, exit_code = render_report(tools)
    (report_dir / 'REPORT.md').write_text(text)
    return exit_code


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
