'use client';

import { useState } from 'react';
import { Lock, Check, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { withAuth } from '@/lib/withAuth';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { useTranslation } from '@/lib/translations';
import { api } from '@/lib/api';
import { FieldErrors } from '@/domain/users/passwordApi';

const MIN_PASSWORD_LEN = 8;

function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successAt, setSuccessAt] = useState<number | null>(null);

  const showSuccess = successAt !== null && Date.now() - successAt < 3000;

  /** Local-first validation. Returns a non-empty errors map when the
   *  form should NOT be submitted. */
  function clientValidate(): FieldErrors {
    const e: FieldErrors = {};
    if (!oldPassword) e.old_password = [t('profile.errors.currentRequired') || 'Current password is required.'];
    if (!newPassword) e.new_password = [t('profile.errors.newRequired') || 'New password is required.'];
    else if (newPassword.length < MIN_PASSWORD_LEN) {
      e.new_password = [
        (t('profile.errors.minLength') || 'Password must be at least 8 characters.'),
      ];
    }
    if (newPassword && newPassword !== newPasswordConfirm) {
      e.new_password_confirm = [t('profile.errors.mismatch') || 'Passwords do not match.'];
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessAt(null);
    const local = clientValidate();
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    setSubmitting(true);
    setErrors({});
    const result = await api.users.changeOwnPassword(oldPassword, newPassword, newPasswordConfirm);
    setSubmitting(false);
    if (result.ok) {
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setSuccessAt(Date.now());
    } else {
      setErrors(result.fieldErrors);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('profile.title') || 'Profile'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('profile.subtitle') || 'Manage your account.'}
          </p>
        </div>

        {/* Account info — read-only for now. */}
        <section className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t('profile.account') || 'Account'}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.email') || 'Email'}
                </p>
                <p className="font-medium text-foreground">{user?.email || '—'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Change password */}
        <section className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t('profile.changePassword') || 'Change password'}
            </h2>
          </div>

          {errors._global_ && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errors._global_.join(' ')}</span>
            </div>
          )}

          {showSuccess && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
            >
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{t('profile.success') || 'Password changed successfully.'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('profile.currentPassword') || 'Current password'}
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              error={errors.old_password?.[0]}
              disabled={submitting}
            />
            <div>
              <Input
                label={t('profile.newPassword') || 'New password'}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                error={errors.new_password?.[0]}
                disabled={submitting}
              />
              <PasswordStrengthMeter value={newPassword} testId="profile-strength-meter" />
            </div>
            <Input
              label={t('profile.confirmNewPassword') || 'Confirm new password'}
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={e => setNewPasswordConfirm(e.target.value)}
              error={errors.new_password_confirm?.[0]}
              disabled={submitting}
            />
            <div className="pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? (t('profile.saving') || 'Saving…')
                  : (t('profile.savePassword') || 'Save new password')}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default withAuth(ProfilePage);
