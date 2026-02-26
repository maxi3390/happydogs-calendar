'use client';

import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Plus, Trash2, Save, Info, Syringe, ToggleLeft, ToggleRight, CalendarClock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useTranslation } from '@/lib/translations';
import { api, Pet, VaccinationType } from '@/lib/api';

interface IncompatibilityRule {
  id: number;
  pet1_id: number;
  pet2_id: number;
  pet1_name: string;
  pet2_name: string;
  reason: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [incompatibilities, setIncompatibilities] = useState<IncompatibilityRule[]>([]);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [petsData, vaxTypesData, settingsData] = await Promise.all([
        api.pets.list(),
        api.vaccinationTypes.list(),
        api.nurserySettings.get(),
      ]);
      setPets(petsData);
      setVaccinationTypes(vaxTypesData);
      setDailyLimit(settingsData.daily_booking_limit);

      // Fetch incompatibilities from localStorage (or could be from API)
      const stored = localStorage.getItem('pet_incompatibilities');
      if (stored) {
        setIncompatibilities(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIncompatibilities = (rules: IncompatibilityRule[]) => {
    localStorage.setItem('pet_incompatibilities', JSON.stringify(rules));
    setIncompatibilities(rules);
  };

  const handleAddRule = () => {
    if (!newRule.pet1_id || !newRule.pet2_id || !newRule.reason) {
      alert(t('settings.fillAllFields'));
      return;
    }

    if (newRule.pet1_id === newRule.pet2_id) {
      alert(t('settings.samePetError'));
      return;
    }

    const pet1 = pets.find(p => p.id === Number(newRule.pet1_id));
    const pet2 = pets.find(p => p.id === Number(newRule.pet2_id));

    if (!pet1 || !pet2) return;

    const exists = incompatibilities.some(
      r => (r.pet1_id === pet1.id && r.pet2_id === pet2.id) ||
           (r.pet1_id === pet2.id && r.pet2_id === pet1.id)
    );

    if (exists) {
      alert(t('settings.ruleExists'));
      return;
    }

    const newIncompatibility: IncompatibilityRule = {
      id: Date.now(),
      pet1_id: pet1.id,
      pet2_id: pet2.id,
      pet1_name: pet1.name,
      pet2_name: pet2.name,
      reason: newRule.reason,
    };

    saveIncompatibilities([...incompatibilities, newIncompatibility]);
    setNewRule({ pet1_id: '', pet2_id: '', reason: '' });
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: number) => {
    if (confirm(t('settings.confirmDelete'))) {
      saveIncompatibilities(incompatibilities.filter(r => r.id !== id));
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>
          </div>
        </div>

        {/* Daily Booking Limit Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-500 to-indigo-500">
            <div className="flex items-center gap-2 text-white">
              <CalendarClock className="w-5 h-5" />
              <h3 className="font-semibold">{t('settings.dailyBookingLimit')}</h3>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dailyLimit === 0 ? t('settings.unlimited') : `${dailyLimit} ${t('settings.dailyBookingLimitLabel').toLowerCase()}`}
                </p>
              </div>
              <button
                onClick={handleSaveDailyLimit}
                disabled={dailyLimitSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {dailyLimitSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            {dailyLimitSaved && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm text-center">
                {t('settings.dailyBookingLimitSaved')}
              </div>
            )}
          </div>
        </div>

        {/* Incompatibility Rules Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-amber-500 to-orange-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">{t('settings.incompatibilities')}</h3>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('settings.addRule')}
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Info Box */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.incompatibilityInfo')}
              </p>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('settings.newRule')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.pet1')}
                    </label>
                    <select
                      value={newRule.pet1_id}
                      onChange={e => setNewRule({ ...newRule, pet1_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{t('settings.selectPet')}</option>
                      {dogPets.map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.temperament})
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{t('settings.selectPet')}</option>
                      {dogPets.filter(p => p.id !== Number(newRule.pet1_id)).map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.temperament})
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRule({ pet1_id: '', pet2_id: '', reason: '' });
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleAddRule}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {t('common.save')}
                  </button>
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
                <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{t('settings.noRules')}</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {t('settings.addFirstRule')}
                </button>
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">{rule.reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vaccination Types Section */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-emerald-500 to-teal-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Syringe className="w-5 h-5" />
                <h3 className="font-semibold">{t('settings.vaccinationTypes')}</h3>
              </div>
              <button
                onClick={() => setShowAddVaxForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('settings.addVaccinationType')}
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.vaccinationTypesInfo')}
              </p>
            </div>

            {showAddVaxForm && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddVaxForm(false);
                      setNewVaxType({ name: '', label: '' });
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleAddVaxType}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : vaccinationTypes.length === 0 ? (
              <div className="text-center py-8">
                <Syringe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{t('settings.noVaccinationTypes')}</p>
                <button
                  onClick={() => setShowAddVaxForm(true)}
                  className="mt-3 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {t('settings.addFirstVaccinationType')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {vaccinationTypes.map(vaxType => (
                  <div
                    key={vaxType.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      vaxType.enabled
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-50 dark:bg-slate-700/30 border-gray-200 dark:border-slate-600 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Syringe className={`w-4 h-4 ${vaxType.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{vaxType.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{vaxType.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVaxType(vaxType)}
                        className={`p-2 rounded-lg transition-colors ${vaxType.enabled
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'
                        }`}
                        title={vaxType.enabled ? t('settings.enabled') : t('settings.disabled')}
                      >
                        {vaxType.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteVaxType(vaxType.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Conflict Rules Info */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('settings.systemRules')}</h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
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
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
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
