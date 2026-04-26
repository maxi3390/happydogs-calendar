# Design — Repair `make lint`

## Why 120, not 100, not 79?

The existing code routinely reaches 100–115 columns. 79 is the default flake8 ships with, but it dates from a punch-card era; nobody on this project writes to that limit. Setting 100 would still surface ~120 violations of long-but-otherwise-fine lines (especially in `migrations/0001_initial.py` where Django auto-generates field definitions that exceed 100 columns). 120 catches the genuinely runaway lines (long string concats, deeply-nested ternaries) without forcing churn on code that's already readable.

If we ever want to enforce 100, the cleanest path is: bump the cap to 100 in a follow-up change, then fix the violations in the same change. That's a separate, opinionated, ~half-day refactor; it's not what this change is about.

## Why not just disable E501 entirely?

Two reasons:

1. **Genuinely huge lines do happen** — usually a 200-column f-string with twelve interpolations, which is unreadable. We want flake8 to flag those, just not the everyday 88-column ones.
2. **120 is a known pylint / black / pyflakes default**. Future contributors will recognise it; "we disabled line-length" looks like an oversight.

## Why exclude migrations?

Django migrations are auto-generated. They contain things like

```
('vet_override', models.ForeignKey(blank=True, help_text='Overrides the owner...', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='override_for_pets', to='pets.vet')),
```

…that no human will ever rewrap. Linting them is busywork that adds nothing.

We *don't* exclude data migrations the team writes by hand (`0002_seed_flags.py`, `0003_seed_deworming_tracking.py`, `0004_seed_notifications.py`) since those are ours and worth keeping clean. The exclude pattern is `migrations` *as a directory*; manual data-migration files inside it are still inside the exclude. We accept that trade — those files are short and not where bugs hide.

## Why a separate `backend/.flake8` and not put it under `backend/setup.cfg`?

Either works. `backend/.flake8` is what most projects use today (pyproject.toml + .flake8), and it keeps the linter config separate from packaging metadata. No `setup.cfg` exists yet either — adding one to host a single linter config is overkill.

## What about the residual warnings after the config lands?

Running `flake8 . --select=F,E305,E306,W291,W293` (genuine warnings only, no line-length) will tell us how much remains. If it's ≤ 30 lines and ≤ 10 files, fix them in the same PR — we have to do it eventually anyway. If it's >100, split the cleanup into a follow-up change so reviewers can audit the lint config separately from the cleanup edits.
