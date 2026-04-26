'use client';

import { useEffect, useState } from 'react';
import { Bell, Save, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useFeatureFlag } from '@/lib/feature-flags';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  NurserySetting,
  NotificationPreference,
  NotificationTemplate,
} from '@/lib/api';

const TOGGLE_FIELDS: (keyof NurserySetting)[] = [
  'notifications_vaccination_enabled',
  'notifications_arrivals_enabled',
  'notifications_egress_enabled',
  'notifications_birthdays_enabled',
  'notifications_deworming_enabled',
];

const TOGGLE_LABEL_KEYS: Record<string, string> = {
  notifications_vaccination_enabled: 'notifications.settings.vaccinationEnabled',
  notifications_arrivals_enabled: 'notifications.settings.arrivalsEnabled',
  notifications_egress_enabled: 'notifications.settings.egressEnabled',
  notifications_birthdays_enabled: 'notifications.settings.birthdaysEnabled',
  notifications_deworming_enabled: 'notifications.settings.dewormingEnabled',
};

/**
 * Operator-facing controls for the notifications system. Renders inside
 * ``/settings`` and is hidden when the master ``notifications`` feature
 * flag is off (the section title would be misleading).
 *
 * Three independent forms:
 *   - **Nursery-wide** schedule + per-kind toggles. Admin-only writes;
 *     non-admins still see the values for context but cannot save.
 *   - **My preferences** — the logged-in user's email opt-in.
 *   - **Message templates** — operator overrides for ``treatment_due``
 *     and ``pet_birthday`` forward-to-owner content.
 */
export default function NotificationsSettings() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const enabled = useFeatureFlag('notifications');
  const [settings, setSettings] = useState<NurserySetting | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    api.nurserySettings.get().then(setSettings).catch(() => {});
    api.notifications.getPreferences().then(setPrefs).catch(() => {});
    api.notifications.listTemplates().then(setTemplates).catch(() => {});
  }, [enabled]);

  const flash = () => setSavedTick(n => n + 1);

  const saveSettings = async () => {
    if (!settings) return;
    const updated = await api.nurserySettings.update({
      notifications_run_time: settings.notifications_run_time,
      deworming_default_due_days: settings.deworming_default_due_days,
      notifications_vaccination_enabled: settings.notifications_vaccination_enabled,
      notifications_arrivals_enabled: settings.notifications_arrivals_enabled,
      notifications_egress_enabled: settings.notifications_egress_enabled,
      notifications_birthdays_enabled: settings.notifications_birthdays_enabled,
      notifications_deworming_enabled: settings.notifications_deworming_enabled,
    });
    setSettings(updated);
    flash();
  };

  const savePrefs = async (next: Partial<NotificationPreference>) => {
    const updated = await api.notifications.updatePreferences(next);
    setPrefs(updated);
    flash();
  };

  const saveTemplate = async (
    scope: string,
    next: Partial<Pick<NotificationTemplate, 'email_subject' | 'email_body' | 'whatsapp_text'>>,
  ) => {
    const updated = await api.notifications.updateTemplate(scope, next);
    setTemplates(prev => prev.map(p => (p.scope === scope ? updated : p)));
    flash();
  };

  if (!enabled) return null;

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t('notifications.settings.header')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('notifications.settings.description')}</p>

        {!settings ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : (
          <div className="space-y-4">
            <fieldset disabled={!isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium">{t('notifications.settings.runTime')}</span>
                  <input
                    type="time"
                    value={settings.notifications_run_time.slice(0, 5)}
                    onChange={(e) =>
                      setSettings({ ...settings, notifications_run_time: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">{t('notifications.settings.dewormingDueDays')}</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.deworming_default_due_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deworming_default_due_days: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg"
                  />
                </label>
              </div>

              <div className="space-y-2">
                {TOGGLE_FIELDS.map(field => (
                  <label key={field as string} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(settings[field])}
                      onChange={(e) =>
                        setSettings({ ...settings, [field]: e.target.checked } as NurserySetting)
                      }
                    />
                    {t(TOGGLE_LABEL_KEYS[field as string])}
                  </label>
                ))}
              </div>

              {isAdmin && (
                <Button onClick={saveSettings}>
                  <Save className="w-4 h-4 mr-1" />
                  {t('notifications.settings.saveSuccess')}
                </Button>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Admin-only.
                </p>
              )}
            </fieldset>

            <hr className="border-border/40" />

            <h3 className="font-semibold">{t('notifications.settings.preferences')}</h3>
            {prefs && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={(e) => savePrefs({ email_enabled: e.target.checked })}
                />
                {t('notifications.settings.emailMe')}
              </label>
            )}

            {isAdmin && templates.length > 0 && (
              <>
                <hr className="border-border/40" />
                <h3 className="font-semibold">{t('notifications.settings.templates')}</h3>
                {templates.map(tpl => (
                  <TemplateEditor
                    key={tpl.scope}
                    template={tpl}
                    onSave={(next) => saveTemplate(tpl.scope, next)}
                  />
                ))}
              </>
            )}

            {savedTick > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {t('notifications.settings.saveSuccess')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TemplateEditorProps {
  template: NotificationTemplate;
  onSave: (next: Partial<Pick<NotificationTemplate, 'email_subject' | 'email_body' | 'whatsapp_text'>>) => void | Promise<void>;
}

function TemplateEditor({ template, onSave }: TemplateEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    email_subject: template.email_subject,
    email_body: template.email_body,
    whatsapp_text: template.whatsapp_text,
  });
  const scopeLabelKey =
    template.scope === 'treatment_due'
      ? 'notifications.settings.templateScopeTreatmentDue'
      : 'notifications.settings.templateScopePetBirthday';

  return (
    <div className="space-y-2 border border-border/40 rounded-xl p-3">
      <p className="font-medium text-sm">{t(scopeLabelKey)}</p>
      <label className="space-y-1 block">
        <span className="text-xs">{t('notifications.settings.emailSubject')}</span>
        <input
          type="text"
          value={draft.email_subject}
          onChange={(e) => setDraft({ ...draft, email_subject: e.target.value })}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-xs">{t('notifications.settings.emailBody')}</span>
        <textarea
          value={draft.email_body}
          onChange={(e) => setDraft({ ...draft, email_body: e.target.value })}
          rows={3}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-xs">{t('notifications.settings.whatsappText')}</span>
        <textarea
          value={draft.whatsapp_text}
          onChange={(e) => setDraft({ ...draft, whatsapp_text: e.target.value })}
          rows={3}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
      <Button size="sm" onClick={() => onSave(draft)}>
        <Save className="w-3.5 h-3.5 mr-1" />
        {t('notifications.settings.saveSuccess')}
      </Button>
    </div>
  );
}
