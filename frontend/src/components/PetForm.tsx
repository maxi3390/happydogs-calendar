'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import { api, Pet, PetFormData, OwnerListItem, Vaccination } from '@/lib/api';

interface PetFormProps {
  pet?: Pet;
  onClose: () => void;
  onSave: () => void;
}

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
];

const TEMPERAMENT_OPTIONS = [
  { value: 'calm', label: 'Calm' },
  { value: 'playful', label: 'Playful' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'friendly', label: 'Friendly' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const VAX_TYPE_OPTIONS = [
  { value: 'rabies', label: 'Rabies' },
  { value: 'distemper', label: 'Distemper' },
  { value: 'parvovirus', label: 'Parvovirus' },
  { value: 'hepatitis', label: 'Hepatitis' },
  { value: 'bordetella', label: 'Bordetella' },
  { value: 'leptospirosis', label: 'Leptospirosis' },
  { value: 'fvrcp', label: 'FVRCP' },
  { value: 'felv', label: 'FeLV' },
  { value: 'other', label: 'Other' },
];

export default function PetForm({ pet, onClose, onSave }: PetFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owners, setOwners] = useState<OwnerListItem[]>([]);
  const [vaccinations, setVaccinations] = useState<Array<{ vax_type: string; date: string }>>([
    ...(pet?.vaccinations?.map(v => ({ vax_type: v.vax_type, date: v.date })) || []),
  ]);
  const [formData, setFormData] = useState<PetFormData>({
    name: pet?.name || '',
    species: pet?.species || 'dog',
    breed: pet?.breed || '',
    age: pet?.age || 1,
    temperament: pet?.temperament || 'friendly',
    dominance_level: pet?.dominance_level || 5,
    size: pet?.size || 'medium',
    neutered: pet?.neutered || false,
    sex: pet?.sex || 'male',
    birth_date: pet?.birth_date || null,
    special_notes: pet?.special_notes || '',
    owner: pet?.owner || null,
  });

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const data = await api.owners.dropdown();
        setOwners(data);
      } catch (err) {
        console.error('Failed to fetch owners:', err);
      }
    };
    fetchOwners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (pet) {
        await api.pets.update(pet.id, formData);
      } else {
        await api.pets.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {pet ? 'Edit Pet' : 'Add New Pet'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pet Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Species *
              </label>
              <select
                required
                value={formData.species}
                onChange={e => setFormData({ ...formData, species: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {SPECIES_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Breed
              </label>
              <input
                type="text"
                value={formData.breed}
                onChange={e => setFormData({ ...formData, breed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Age (years) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temperament *
              </label>
              <select
                required
                value={formData.temperament}
                onChange={e => setFormData({ ...formData, temperament: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {TEMPERAMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dominance Level (1-10) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.dominance_level}
                  onChange={e => setFormData({ ...formData, dominance_level: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                  formData.dominance_level <= 3 ? 'bg-green-100 text-green-700' :
                  formData.dominance_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {formData.dominance_level}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                1 = Very submissive, 10 = Very dominant
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Size *
              </label>
              <select
                required
                value={formData.size}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {SIZE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sex *
              </label>
              <select
                required
                value={formData.sex}
                onChange={e => setFormData({ ...formData, sex: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                {SEX_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={formData.birth_date || ''}
                onChange={e => setFormData({ ...formData, birth_date: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.neutered}
                  onChange={e => setFormData({ ...formData, neutered: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                Neutered
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Owner
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.owner || ''}
                  onChange={e => setFormData({ ...formData, owner: e.target.value ? Number(e.target.value) : null })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No owner assigned</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.full_name} ({owner.phone})
                    </option>
                  ))}
                </select>
                <Link
                  href="/owners"
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New
                </Link>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Assign this pet to an owner or create a new owner first
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Vaccinations
              </label>
              <button
                type="button"
                onClick={() => setVaccinations([...vaccinations, { vax_type: 'rabies', date: '' }])}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <Plus className="w-4 h-4" />
                Add Vaccination
              </button>
            </div>
            {vaccinations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No vaccinations recorded</p>
            ) : (
              <div className="space-y-2">
                {vaccinations.map((vax, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={vax.vax_type}
                      onChange={e => {
                        const updated = [...vaccinations];
                        updated[index] = { ...updated[index], vax_type: e.target.value };
                        setVaccinations(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {VAX_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      required
                      value={vax.date}
                      onChange={e => {
                        const updated = [...vaccinations];
                        updated[index] = { ...updated[index], date: e.target.value };
                        setVaccinations(updated);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setVaccinations(vaccinations.filter((_, i) => i !== index))}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Special Notes
            </label>
            <textarea
              value={formData.special_notes}
              onChange={e => setFormData({ ...formData, special_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              placeholder="Any special care instructions, medical conditions, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
