'use client';

import { useEffect, useMemo, useState } from 'react';
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

type TemplateDraft = Pick<
  NotificationTemplate,
  'scope' | 'email_subject' | 'email_body' | 'whatsapp_text'
>;

/**
 * Operator-facing controls for the notifications system. Renders inside
 * ``/settings`` and is hidden when the master ``notifications`` feature
 * flag is off (the section title would be misleading).
 *
 * All edits are kept in local draft state and persisted by a single
 * "Save" button at the bottom; the click fans out to the three
 * underlying endpoints in parallel. The message-templates subsection
 * is only shown when the user has email notifications enabled — there's
 * no point editing email/WhatsApp text you've opted out of receiving.
 */
export default function NotificationsSettings() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const enabled = useFeatureFlag('notifications');
  const [settings, setSettings] = useState<NurserySetting | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [templates, setTemplates] = useState<TemplateDraft[]>([]);
  const [originalTemplates, setOriginalTemplates] = useState<NotificationTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (!enabled) return;
    api.nurserySettings.get().then(setSettings).catch(() => {});
    api.notifications.getPreferences().then(setPrefs).catch(() => {});
    api.notifications.listTemplates().then(rows => {
      setOriginalTemplates(rows);
      setTemplates(
        rows.map(r => ({
          scope: r.scope,
          email_subject: r.email_subject,
          email_body: r.email_body,
          whatsapp_text: r.whatsapp_text,
        })),
      );
    }).catch(() => {});
  }, [enabled]);

  const changedTemplates = useMemo(
    () => templates.filter(d => {
      const original = originalTemplates.find(o => o.scope === d.scope);
      if (!original) return true;
      return (
        original.email_subject !== d.email_subject
        || original.email_body !== d.email_body
        || original.whatsapp_text !== d.whatsapp_text
      );
    }),
    [templates, originalTemplates],
  );

  const handleSave = async () => {
    if (!settings || !prefs) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const calls: Promise<unknown>[] = [];
      if (isAdmin) {
        calls.push(api.nurserySettings.update({
          notifications_run_time: settings.notifications_run_time,
          deworming_default_due_days: settings.deworming_default_due_days,
          notification_recipient_lookback_days: settings.notification_recipient_lookback_days,
          notifications_vaccination_enabled: settings.notifications_vaccination_enabled,
          notifications_arrivals_enabled: settings.notifications_arrivals_enabled,
          notifications_egress_enabled: settings.notifications_egress_enabled,
          notifications_birthdays_enabled: settings.notifications_birthdays_enabled,
          notifications_deworming_enabled: settings.notifications_deworming_enabled,
        }).then(setSettings));
      }
      calls.push(
        api.notifications.updatePreferences({ email_enabled: prefs.email_enabled })
          .then(setPrefs),
      );
      // Templates only exist when the user has email enabled (they are
      // hidden otherwise), so we only persist them in that branch.
      if (isAdmin && prefs.email_enabled) {
        for (const draft of changedTemplates) {
          calls.push(api.notifications.updateTemplate(draft.scope, {
            email_subject: draft.email_subject,
            email_body: draft.email_body,
            whatsapp_text: draft.whatsapp_text,
          }));
        }
      }
      await Promise.all(calls);
      // Refresh originals so the diff resets after a save.
      const fresh = await api.notifications.listTemplates();
      setOriginalTemplates(fresh);
      setSaveStatus('ok');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) return null;

  const showTemplates = isAdmin && Boolean(prefs?.email_enabled);

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t('notifications.settings.header')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('notifications.settings.description')}</p>

        {!settings || !prefs ? (
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
                <label className="space-y-1">
                  <span className="text-sm font-medium">
                    {t('notifications.settings.recipientLookbackDays')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.notification_recipient_lookback_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notification_recipient_lookback_days: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg"
                  />
                  <span className="block text-xs text-muted-foreground">
                    {t('notifications.settings.recipientLookbackHint')}
                  </span>
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

              {!isAdmin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Admin-only.
                </p>
              )}
            </fieldset>

            <hr className="border-border/40" />

            <h3 className="font-semibold">{t('notifications.settings.preferences')}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.email_enabled}
                onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
              />
              {t('notifications.settings.emailMe')}
            </label>

            {showTemplates && templates.length > 0 && (
              <>
                <hr className="border-border/40" />
                <h3 className="font-semibold">{t('notifications.settings.templates')}</h3>
                {templates.map((tpl, idx) => (
                  <TemplateEditor
                    key={tpl.scope}
                    template={tpl}
                    onChange={(next) =>
                      setTemplates(prev => prev.map((p, i) => (i === idx ? { ...p, ...next } : p)))
                    }
                  />
                ))}
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {t('common.save')}
              </Button>
              {saveStatus === 'ok' && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {t('notifications.settings.saveSuccess')}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs text-destructive">
                  {t('notifications.settings.saveFailed')}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TemplateEditorProps {
  template: TemplateDraft;
  onChange: (next: Partial<Omit<TemplateDraft, 'scope'>>) => void;
}

function TemplateEditor({ template, onChange }: TemplateEditorProps) {
  const { t } = useTranslation();
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
          value={template.email_subject}
          onChange={(e) => onChange({ email_subject: e.target.value })}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-xs">{t('notifications.settings.emailBody')}</span>
        <textarea
          value={template.email_body}
          onChange={(e) => onChange({ email_body: e.target.value })}
          rows={3}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-xs">{t('notifications.settings.whatsappText')}</span>
        <textarea
          value={template.whatsapp_text}
          onChange={(e) => onChange({ whatsapp_text: e.target.value })}
          rows={3}
          className="w-full px-3 py-1.5 bg-background border border-border/50 rounded-lg text-sm"
        />
      </label>
    </div>
  );
}
