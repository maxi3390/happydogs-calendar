'use client';

import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Plus, Trash2, Save, Info, Syringe, ToggleLeft, ToggleRight, CalendarClock, Image as ImageIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import DataBackupSection from '@/components/DataBackupSection';
import { useTranslation } from '@/lib/translations';
import { useFeatureFlag } from '@/lib/feature-flags';
import { api, Pet, PetIncompatibility, VaccinationType } from '@/lib/api';
import { translateTemperament } from '@/domain/pets/labels';
import { withAuth } from '@/lib/withAuth';
import { Button } from '@/components/ui/Button';

const LEGACY_LOCAL_KEY = 'pet_incompatibilities';
const MIGRATION_BANNER_DISMISSED_KEY = 'pet_incompatibilities_migration_banner_dismissed';

function SettingsPage() {
  const { t } = useTranslation();
  const dataBackupEnabled = useFeatureFlag('data_backup');
  const [pets, setPets] = useState<Pet[]>([]);
  const [incompatibilities, setIncompatibilities] = useState<PetIncompatibility[]>([]);
  const [migrationBannerVisible, setMigrationBannerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({ pet1_id: '', pet2_id: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [vaccinationTypes, setVaccinationTypes] = useState<VaccinationType[]>([]);
  const [showAddVaxForm, setShowAddVaxForm] = useState(false);
  const [newVaxType, setNewVaxType] = useState({ name: '', label: '' });
  const [dailyLimit, setDailyLimit] = useState<number>(0);
  const [dailyLimitSaving, setDailyLimitSaving] = useState(false);
  const [dailyLimitSaved, setDailyLimitSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [petsData, vaxTypesData, settingsData, incompatibilitiesData] = await Promise.all([
        api.pets.list(),
        api.vaccinationTypes.list(),
        api.nurserySettings.get(),
        api.petIncompatibilities.list(),
      ]);
      setPets(petsData);
      setVaccinationTypes(vaxTypesData);
      setDailyLimit(settingsData.daily_booking_limit);
      setLogoUrl(settingsData.logo_url);
      setIncompatibilities(incompatibilitiesData);

      // Show a one-time migration banner when (a) the legacy localStorage
      // key is still around with stale rules from before this change, and
      // (b) the user hasn't already dismissed it.
      const legacy = localStorage.getItem(LEGACY_LOCAL_KEY);
      const dismissed = localStorage.getItem(MIGRATION_BANNER_DISMISSED_KEY);
      if (legacy && !dismissed) {
        setMigrationBannerVisible(true);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissMigrationBanner = () => {
    localStorage.setItem(MIGRATION_BANNER_DISMISSED_KEY, '1');
    localStorage.removeItem(LEGACY_LOCAL_KEY);
    setMigrationBannerVisible(false);
  };

  const handleAddRule = async () => {
    if (!newRule.pet1_id || !newRule.pet2_id || !newRule.reason) {
      alert(t('settings.fillAllFields'));
      return;
    }
    if (newRule.pet1_id === newRule.pet2_id) {
      alert(t('settings.samePetError'));
      return;
    }
    try {
      const created = await api.petIncompatibilities.create({
        pet1: Number(newRule.pet1_id),
        pet2: Number(newRule.pet2_id),
        reason: newRule.reason,
      });
      setIncompatibilities([...incompatibilities, created]);
      setNewRule({ pet1_id: '', pet2_id: '', reason: '' });
      setShowAddForm(false);
    } catch (err) {
      // The serializer surfaces "duplicate" / "self-pair" errors as 400s.
      const message = err instanceof Error ? err.message : t('settings.ruleExists');
      alert(message);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm(t('settings.confirmDelete'))) return;
    try {
      await api.petIncompatibilities.delete(id);
      setIncompatibilities(incompatibilities.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleAddVaxType = async () => {
    if (!newVaxType.name || !newVaxType.label) {
      alert(t('settings.fillAllFields'));
      return;
    }
    if (vaccinationTypes.some(v => v.name === newVaxType.name)) {
      alert(t('settings.vaxNameExists'));
      return;
    }
    try {
      const created = await api.vaccinationTypes.create({
        name: newVaxType.name,
        label: newVaxType.label,
        enabled: true,
        order: vaccinationTypes.length,
      });
      setVaccinationTypes([...vaccinationTypes, created]);
      setNewVaxType({ name: '', label: '' });
      setShowAddVaxForm(false);
    } catch (error) {
      console.error('Failed to create vaccination type:', error);
    }
  };

  const handleToggleVaxType = async (vaxType: VaccinationType) => {
    try {
      const updated = await api.vaccinationTypes.update(vaxType.id, { enabled: !vaxType.enabled });
      setVaccinationTypes(vaccinationTypes.map(v => v.id === vaxType.id ? updated : v));
    } catch (error) {
      console.error('Failed to toggle vaccination type:', error);
    }
  };

  const handleDeleteVaxType = async (id: number) => {
    if (!confirm(t('settings.confirmDeleteVaxType'))) return;
    try {
      await api.vaccinationTypes.delete(id);
      setVaccinationTypes(vaccinationTypes.filter(v => v.id !== id));
    } catch (error) {
      console.error('Failed to delete vaccination type:', error);
    }
  };

  const handleSaveDailyLimit = async () => {
    setDailyLimitSaving(true);
    setDailyLimitSaved(false);
    try {
      const updated = await api.nurserySettings.update({ daily_booking_limit: dailyLimit });
      setDailyLimit(updated.daily_booking_limit);
      setDailyLimitSaved(true);
      setTimeout(() => setDailyLimitSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save daily limit:', error);
    } finally {
      setDailyLimitSaving(false);
    }
  };

  const dogPets = pets.filter(p => p.species === 'dog');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{t('settings.title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage system configurations and rules</p>
            </div>
          </div>
        </div>

        {/* System Logo Section */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden mb-8 hover:shadow-md transition-all">
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center gap-2 text-white">
              <ImageIcon className="w-5 h-5" />
              <h3 className="font-semibold">{t('settings.systemLogo') || 'System Logo'}</h3>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.systemLogoInfo')}
              </p>
            </div>

            <div className="flex justify-center">
              <ProfilePictureUpload
                currentUrl={logoUrl}
                onUpload={async (file) => {
                  const updated = await api.nurserySettings.uploadLogo(file);
                  setLogoUrl(updated.logo_url);
                }}
                onDelete={async () => {
                  await api.nurserySettings.deleteLogo();
                  setLogoUrl(null);
                }}
                initials="?"
              />
            </div>
          </div>
        </div>

        {/* Daily Booking Limit Section */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden mb-8 hover:shadow-md transition-all">
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center gap-2 text-white">
              <CalendarClock className="w-5 h-5" />
              <h3 className="font-semibold">{t('settings.dailyBookingLimit')}</h3>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.dailyBookingLimitInfo')}
              </p>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.dailyBookingLimitLabel')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={dailyLimit}
                  onChange={e => setDailyLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder={t('settings.dailyBookingLimitPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 focus:ring-2 focus:ring-ring focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {dailyLimit === 0 ? t('settings.unlimited') : `${dailyLimit} ${t('settings.dailyBookingLimitLabel').toLowerCase()}`}
                </p>
              </div>
              <Button
                onClick={handleSaveDailyLimit}
                disabled={dailyLimitSaving}
                variant="primary"
              >
                <Save className="w-4 h-4" />
                {dailyLimitSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>

            {dailyLimitSaved && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm text-center">
                {t('settings.dailyBookingLimitSaved')}
              </div>
            )}
          </div>
        </div>

        {/* Incompatibility Rules Section */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden mb-8 hover:shadow-md transition-all">
          <div className="p-5 sm:p-6 border-b border-border/50 bg-secondary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">{t('settings.incompatibilities')}</h3>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                {t('settings.addRule')}
              </Button>
            </div>
          </div>

          <div className="p-4">
            {/* Info Box */}
            <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.incompatibilityInfo')}
              </p>
            </div>

            {migrationBannerVisible && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t('settings.incompatibilityMigrationBanner')}
                  </p>
                </div>
                <Button
                  onClick={dismissMigrationBanner}
                  variant="ghost"
                  size="sm"
                >
                  {t('common.dismiss')}
                </Button>
              </div>
            )}

            {/* Add Form */}
            {showAddForm && (
              <div className="mb-4 p-4 bg-muted/50 dark:bg-slate-700/50 rounded-lg border border-border">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('settings.newRule')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.pet1')}
                    </label>
                    <select
                      value={newRule.pet1_id}
                      onChange={e => setNewRule({ ...newRule, pet1_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-foreground-100"
                    >
                      <option value="">{t('settings.selectPet')}</option>
                      {dogPets.map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({translateTemperament(t, pet.temperament)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.pet2')}
                    </label>
                    <select
                      value={newRule.pet2_id}
                      onChange={e => setNewRule({ ...newRule, pet2_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-foreground-100"
                    >
                      <option value="">{t('settings.selectPet')}</option>
                      {dogPets.filter(p => p.id !== Number(newRule.pet1_id)).map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({translateTemperament(t, pet.temperament)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.reason')}
                  </label>
                  <input
                    type="text"
                    value={newRule.reason}
                    onChange={e => setNewRule({ ...newRule, reason: e.target.value })}
                    placeholder={t('settings.reasonPlaceholder')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-foreground-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRule({ pet1_id: '', pet2_id: '', reason: '' });
                    }}
                    variant="ghost"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddRule}
                    variant="primary"
                  >
                    <Save className="w-4 h-4" />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {/* Rules List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
              </div>
            ) : incompatibilities.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t('settings.noRules')}</p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="ghost"
                  className="mt-3 text-amber-600 dark:text-amber-400"
                >
                  {t('settings.addFirstRule')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {incompatibilities.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          <span className="text-red-600 dark:text-red-400">{rule.pet1_name}</span>
                          {' '}&amp;{' '}
                          <span className="text-red-600 dark:text-red-400">{rule.pet2_name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">{rule.reason}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteRule(rule.id)}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vaccination Types Section */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden mb-8 hover:shadow-md transition-all">
          <div className="p-5 sm:p-6 border-b border-border/50 bg-secondary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Syringe className="w-5 h-5" />
                <h3 className="font-semibold">{t('settings.vaccinationTypes')}</h3>
              </div>
              <Button
                onClick={() => setShowAddVaxForm(true)}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                {t('settings.addVaccinationType')}
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.vaccinationTypesInfo')}
              </p>
            </div>

            {showAddVaxForm && (
              <div className="mb-4 p-4 bg-muted/50 dark:bg-slate-700/50 rounded-lg border border-border">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('settings.newVaccinationType')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.vaxName')}
                    </label>
                    <input
                      type="text"
                      value={newVaxType.name}
                      onChange={e => setNewVaxType({ ...newVaxType, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      placeholder={t('settings.vaxNamePlaceholder')}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-foreground-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.vaxLabel')}
                    </label>
                    <input
                      type="text"
                      value={newVaxType.label}
                      onChange={e => setNewVaxType({ ...newVaxType, label: e.target.value })}
                      placeholder={t('settings.vaxLabelPlaceholder')}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground text-foreground-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setShowAddVaxForm(false);
                      setNewVaxType({ name: '', label: '' });
                    }}
                    variant="ghost"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleAddVaxType}
                    variant="primary"
                  >
                    <Save className="w-4 h-4" />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : vaccinationTypes.length === 0 ? (
              <div className="text-center py-8">
                <Syringe className="w-12 h-12 text-gray-300 dark:text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t('settings.noVaccinationTypes')}</p>
                <Button
                  onClick={() => setShowAddVaxForm(true)}
                  variant="ghost"
                  className="mt-3 text-emerald-600 dark:text-emerald-400"
                >
                  {t('settings.addFirstVaccinationType')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {vaccinationTypes.map(vaxType => (
                  <div
                    key={vaxType.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      vaxType.enabled
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-muted/50 dark:bg-slate-700/30 border-border opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Syringe className={`w-4 h-4 ${vaxType.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{vaxType.label}</p>
                        <p className="text-xs text-muted-foreground">{vaxType.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleToggleVaxType(vaxType)}
                        variant="ghost"
                        size="icon"
                        title={vaxType.enabled ? t('settings.enabled') : t('settings.disabled')}
                      >
                        {vaxType.enabled ? <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                      </Button>
                      <Button
                        onClick={() => handleDeleteVaxType(vaxType.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Backup / Restore */}
        {dataBackupEnabled && <DataBackupSection />}

        {/* System Conflict Rules Info */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-6 sm:p-8 hover:shadow-md transition-all">
          <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            {t('settings.systemRules')}
          </h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <p>{t('settings.rule1')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
              <p>{t('settings.rule2')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
              <p>{t('settings.rule3')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-primary hover:bg-primary/90 mt-1.5 flex-shrink-0" />
              <p>{t('settings.rule4')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
              <p>{t('settings.rule5')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(SettingsPage);
