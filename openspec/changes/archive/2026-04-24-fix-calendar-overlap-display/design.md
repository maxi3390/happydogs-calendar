# Design — fix-calendar-overlap-display

## Reproducing the silent-drop bug

For the week of 2026-04-19 → 2026-04-25 with the seeded DB the API returns five overlapping schedules:

| # | Pet   | Range            | Cols (Sun..Sat) | Range (days) |
|---|-------|------------------|-----------------|--------------|
| 3 | Mía   | 04-21 → 04-24    | 2..5            | 3            |
| 9 | Toby  | 04-21 → 04-24    | 2..5            | 3            |
| 4 | Rocco | 04-22 → 04-24    | 3..5            | 2            |
| 5 | Nala  | 04-22 → 04-25    | 3..6            | 3            |
| 23 | Luna | 04-23 → 04-23    | 4..4            | 0            |

The previous sort used:

```ts
const aLen = a.end_date.localeCompare(a.start_date);
```

That returns 1 for any multi-day schedule and 0 for a single-day schedule. So Mía / Toby / Rocco / Nala all tie at 1. Stable sort then keeps API order — and the API returns by `start_date, id` ASC — so Rocco comes before Nala because Rocco's id is 4 and Nala's is 5. Stacking gave:

| Step | Schedule | Row |
|------|----------|-----|
| 1    | Mía      | 0   |
| 2    | Toby     | 1   |
| 3    | Rocco    | 2   |
| 4    | **Nala** | **3** |
| 5    | Luna     | 4   |

`MAX_VISIBLE_BARS = 3` filters out rows 3+ across all columns. On Saturday only Nala spans the day; with row 3 the bar disappears.

The "+N more" indicator math compounded the bug:

```ts
const hiddenCount = dayBarCounts[colIdx] - MAX_VISIBLE_BARS;
if (hiddenCount <= 0) return null;
```

On Saturday `dayBarCounts[6] = 1` → `1 - 3 = -2` → no indicator. The bar was silently invisible with zero breadcrumb.

## The three fixes

### 1. Sort by actual range

```ts
const rangeDays = (s: Schedule) =>
  Math.round((Date.parse(s.end_date) - Date.parse(s.start_date)) / 86400000);
overlapping.sort((a, b) => {
  const diff = rangeDays(b) - rangeDays(a);
  if (diff !== 0) return diff;
  return a.start_date.localeCompare(b.start_date);
});
```

For the Apr 19–25 week the new order is `Mía, Toby, Nala, Rocco, Luna` (Mía/Toby/Nala all tie at 3 days; the start_date tie-breaker puts Mía and Toby first). Stacking then assigns:

| Schedule | Row |
|----------|-----|
| Mía      | 0   |
| Toby     | 1   |
| Nala     | 2   |
| Rocco    | 3   |
| Luna     | 4   |

Nala is now visible across all four of its days, including Saturday. Rocco and Luna are pushed to rows 3+ — those become the hidden ones.

### 2. Correct the "+N more" count

```ts
const dayBarCounts: number[] = Array(7).fill(0);
const dayHiddenCounts: number[] = Array(7).fill(0);
segments.forEach(seg => {
  for (let c = seg.startCol; c <= seg.endCol; c++) {
    dayBarCounts[c]++;
    if (seg.row >= MAX_VISIBLE_BARS) dayHiddenCounts[c]++;
  }
});

// at the indicator:
const hiddenCount = dayHiddenCounts[colIdx];
if (hiddenCount <= 0) return null;
```

After the new sort, on the Apr 22–25 days `dayHiddenCounts` shows `[0, 0, 0, 1, 2, 1, 0]`: Wed `+1`, Thu `+2`, Fri `+1` (the truly-hidden Rocco/Luna), Saturday `0` (Nala is now visible at row 2). On a different layout where the longest-first sort still leaves something hidden on Saturday, the indicator now renders correctly there too.

### 3. Click → expand the week in place

Component-local state:

```ts
const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

useEffect(() => { setExpandedWeeks(new Set()); }, [currentMonth]);

const toggleWeek = (weekIdx: number, expand: boolean) => {
  setExpandedWeeks(prev => {
    const next = new Set(prev);
    if (expand) next.add(weekIdx); else next.delete(weekIdx);
    return next;
  });
};
```

`expandedWeeks` keys by `weekIdx` — same index used by the rendering map. Membership decides:

- whether `visibleSegments` is filtered or full,
- whether the "+N more" indicators render or are suppressed,
- whether the "Show less" footer button renders.

The indicator (a `<button>` now, not a `<div>`) calls `toggleWeek(weekIdx, true)` and stops propagation so the day-cell click handler underneath does not also fire.

## Why per-week expand instead of a global toggle?

The previous proposal added a localStorage-backed checkbox under `/settings`:

- **Discovery problem.** The operator hits the bug on the home page, doesn't know to look in settings.
- **Reversibility problem.** A toggle a screen away has no in-context "back" — the operator may forget they enabled it.
- **All-or-nothing.** Either every week grows tall, or every week stays compact. Most months have only one or two busy weeks; growing them all is wasteful.

Per-week expand fixes each:

- The affordance is right next to the hidden content (the "+N more" link).
- "Show less" sits next to the expansion, in the same week.
- Expansion is week-by-week — quiet weeks stay compact while a single busy week opens up.

## Why reset on month navigation?

Carrying expansion state across navigation would mean an operator who expanded the week of Apr 22–25, paged forward to May, paged back to April, and would find the same row already expanded. That's *correct* but *unexpected* — most calendar users mentally model navigation as "fresh page". Persisting the state would also blur whether expansion is a transient inspection or a saved preference. We pick "transient": fresh navigation, fresh state.

## Tests

Frontend-only behaviour change with no API delta. Verification:

- `tsc --noEmit` (in `node:22-alpine` per AGENTS.md) — clean.
- `next build` — passes.
- Manual: open `/` in the seeded environment, navigate to April 2026 month view → confirm Nala's bar renders on Sat 25 Apr.
- Manual: confirm "+1 more" appears on Wed Apr 22 and Fri Apr 24, "+2 more" on Thu Apr 23.
- Manual: click "+2 more" on Thursday → the whole week row expands; Rocco's and Luna's bars render at rows 3 and 4. Other weeks stay compact.
- Manual: click "Show less" at the bottom of the expanded week → the row collapses back to three rows + indicators.
- Manual: navigate to May, then back to April → expansion is reset.
