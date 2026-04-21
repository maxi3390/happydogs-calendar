'use client';

import { useState } from 'react';
import { Flag, AlertCircle, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { api } from '@/lib/api';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useTranslation } from '@/lib/translations';
import { withAdmin } from '@/lib/withAdmin';

function FeatureFlagsAdminPage() {
  const { t } = useTranslation();
  const { flags, loading, error, applyChange } = useFeatureFlags();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const handleToggle = async (key: string, next: boolean) => {
    setTogglingKey(key);
    setToggleError(null);
    try {
      const updated = await api.featureFlags.toggle(key, next);
      applyChange(updated);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : t('featureFlags.saveFailed'));
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 flex items-start gap-3">
          <Flag className="w-6 h-6 text-primary mt-1" />
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{t('featureFlags.title')}</h2>
            <p className="text-muted-foreground mt-1">{t('featureFlags.description')}</p>
          </div>
        </div>

        {toggleError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{toggleError}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading && flags.length === 0 ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-10 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        ) : flags.length === 0 ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-10 text-center text-muted-foreground">
            {t('featureFlags.empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map(flag => {
              const busy = togglingKey === flag.key;
              return (
                <div
                  key={flag.key}
                  className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold">{flag.label}</h3>
                      <code className="text-xs text-muted-foreground font-mono">{flag.key}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className={`text-xs font-medium ${flag.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                      {flag.enabled ? t('featureFlags.toggleEnable') : t('featureFlags.toggleDisable')}
                    </span>
                    <span className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        disabled={busy}
                        onChange={e => handleToggle(flag.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <span className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:bg-primary transition-colors" />
                      <span className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default withAdmin(FeatureFlagsAdminPage);
