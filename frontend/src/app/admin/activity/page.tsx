'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity as ActivityIcon, Filter, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { api } from '@/lib/api';
import { withAdmin } from '@/lib/withAdmin';
import { useFeatureFlag } from '@/lib/feature-flags';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ActivityFilters, ActivityRow, EntityType, ActionType } from '@/domain/auditLog/types';

type EntityFilter = 'all' | EntityType;
type ActionFilter = 'all' | ActionType;
type PeriodFilter = 'all' | '7d' | '30d' | '90d';

const PAGE_SIZE = 50;

/** Action -> visual style. Pulled out of the component body so the
 *  table cells stay readable. */
const ACTION_STYLE: Record<ActionType, { key: string; classes: string }> = {
  '+': { key: 'audit.activity.action.created', classes: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  '~': { key: 'audit.activity.action.updated', classes: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' },
  '-': { key: 'audit.activity.action.deleted', classes: 'bg-destructive/10 border-destructive/20 text-destructive' },
};

const ENTITY_LABEL_KEY: Record<EntityType, string> = {
  pet: 'audit.activity.entity.pet',
  owner: 'audit.activity.entity.owner',
  medical_note: 'audit.activity.entity.medical_note',
  vaccination: 'audit.activity.entity.vaccination',
};

function ActivityFeedPage() {
  const { t } = useTranslation();
  const enabled = useFeatureFlag('activity_logs');
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters drive the API request; pagination is server-side via offset.
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [offset, setOffset] = useState(0);

  // Resetting offset whenever filters change keeps the user on a
  // page-of-results that exists. Without this, switching filters can
  // leave them on (e.g.) page 8 of an empty result set.
  useEffect(() => {
    setOffset(0);
  }, [entityFilter, actionFilter, periodFilter]);

  const apiFilters = useMemo<ActivityFilters>(() => {
    const f: ActivityFilters = { limit: PAGE_SIZE, offset };
    if (entityFilter !== 'all') f.entity_type = entityFilter;
    if (actionFilter !== 'all') f.action = actionFilter;
    if (periodFilter !== 'all') {
      const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      f.since = since.toISOString();
    }
    return f;
  }, [entityFilter, actionFilter, periodFilter, offset]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.auditLog.activity(apiFilters);
      setRows(data.results);
      setTotal(data.count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  // Skip the fetch when the flag is off — the backend would 404 anyway
  // and we'd just paint a useless error banner. The empty-state branch
  // below handles the visible UI.
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="activity-disabled">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('featureFlags.empty')}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Derive page numbers for the pagination strip. Server cap is 200;
  // we use 50 by default so a 1k-row log is still 20 pages.
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <ActivityIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-foreground">{t('audit.activity.title')}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t('audit.activity.description')}</p>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Filter row */}
          <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 shadow-sm flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-muted-foreground inline-flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              {t('audit.activity.filters.title')}
            </span>
            <FilterSelect
              label={t('audit.activity.filters.entity')}
              value={entityFilter}
              onChange={(v) => setEntityFilter(v as EntityFilter)}
              options={[
                { value: 'all', label: t('audit.activity.filters.all') },
                { value: 'pet', label: t('audit.activity.entity.pet') },
                { value: 'owner', label: t('audit.activity.entity.owner') },
                { value: 'medical_note', label: t('audit.activity.entity.medical_note') },
                { value: 'vaccination', label: t('audit.activity.entity.vaccination') },
              ]}
              testId="filter-entity"
            />
            <FilterSelect
              label={t('audit.activity.filters.action')}
              value={actionFilter}
              onChange={(v) => setActionFilter(v as ActionFilter)}
              options={[
                { value: 'all', label: t('audit.activity.filters.all') },
                { value: '+', label: t('audit.activity.action.created') },
                { value: '~', label: t('audit.activity.action.updated') },
                { value: '-', label: t('audit.activity.action.deleted') },
              ]}
              testId="filter-action"
            />
            <FilterSelect
              label={t('audit.activity.filters.period')}
              value={periodFilter}
              onChange={(v) => setPeriodFilter(v as PeriodFilter)}
              options={[
                { value: 'all', label: t('audit.activity.filters.all') },
                { value: '7d', label: t('audit.activity.filters.last7d') },
                { value: '30d', label: t('audit.activity.filters.last30d') },
                { value: '90d', label: t('audit.activity.filters.last90d') },
              ]}
              testId="filter-period"
            />
          </div>

          {/* Activity table */}
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="activity-table">
                <thead className="bg-secondary/10 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t('audit.activity.table.when')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t('audit.activity.table.who')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t('audit.activity.table.action')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t('audit.activity.table.entity')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {t('audit.activity.table.label')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((row) => {
                    const action = ACTION_STYLE[row.history_type];
                    return (
                      <tr key={`${row.entity_type}:${row.history_id}`} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-6 py-3 text-sm text-muted-foreground font-medium whitespace-nowrap">
                          {formatTimestamp(row.history_date)}
                        </td>
                        <td className="px-6 py-3">
                          {row.history_user ? (
                            <span className="text-sm text-foreground inline-flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              {row.history_user.email}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${action.classes}`}>
                            {t(action.key)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-foreground font-medium">
                          {t(ENTITY_LABEL_KEY[row.entity_type])}
                        </td>
                        <td className="px-6 py-3 text-sm text-foreground font-bold">
                          {row.entity_label || <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && rows.length === 0 && (
              <div className="text-center py-12">
                <ActivityIcon className="w-12 h-12 text-gray-300 dark:text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('audit.activity.empty')}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between" data-testid="pagination">
              <p className="text-sm text-muted-foreground">
                {(t('audit.activity.pagination.showing') || 'Showing {start}–{end} of {total}')
                  .replace('{start}', String(offset + 1))
                  .replace('{end}', String(Math.min(offset + PAGE_SIZE, total)))
                  .replace('{total}', String(total))}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  disabled={!canPrev}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('audit.activity.pagination.prev')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {(t('audit.activity.pagination.page') || 'Page {n} of {total}')
                    .replace('{n}', String(currentPage))
                    .replace('{total}', String(totalPages))}
                </span>
                <Button
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  disabled={!canNext}
                  variant="outline"
                  size="sm"
                >
                  {t('audit.activity.pagination.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 border border-border rounded-md bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export default withAdmin(ActivityFeedPage);
