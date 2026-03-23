'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, User, Mail, Phone, PawPrint, Edit2, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { api, Owner, OwnerWithPets } from '@/lib/api';
import OwnerForm from '@/components/OwnerForm';
import ScheduleForm from '@/components/ScheduleForm';
import Navigation from '@/components/Navigation';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';

function OwnersPage() {
  const { t } = useTranslation();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | undefined>();
  const [expandedOwner, setExpandedOwner] = useState<number | null>(null);
  const [ownerDetails, setOwnerDetails] = useState<Record<number, OwnerWithPets>>({});
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedulePetIds, setSchedulePetIds] = useState<number[]>([]);

  const fetchOwners = async () => {
    try {
      const data = await api.owners.list();
      setOwners(data);
    } catch (error) {
      console.error('Failed to fetch owners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleExpand = async (ownerId: number) => {
    if (expandedOwner === ownerId) {
      setExpandedOwner(null);
      return;
    }

    setExpandedOwner(ownerId);

    if (!ownerDetails[ownerId]) {
      try {
        const details = await api.owners.get(ownerId);
        setOwnerDetails(prev => ({ ...prev, [ownerId]: details }));
      } catch (error) {
        console.error('Failed to fetch owner details:', error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmations.deleteOwner'))) {
      return;
    }

    try {
      await api.owners.delete(id);
      fetchOwners();
    } catch (error) {
      console.error('Failed to delete owner:', error);
    }
  };

  const handleSave = () => {
    setShowOwnerForm(false);
    setEditingOwner(undefined);
    fetchOwners();
  };

  const handleScheduleOwnerPets = (ownerData: OwnerWithPets) => {
    if (ownerData.pets.length === 0) {
      alert(t('owner.noPetsToSchedule'));
      return;
    }
    setSchedulePetIds(ownerData.pets.map(p => p.id));
    setShowScheduleForm(true);
  };

  const handleScheduleSinglePet = (petId: number) => {
    setSchedulePetIds([petId]);
    setShowScheduleForm(true);
  };

  const filteredOwners = owners.filter(owner => {
    const fullName = `${owner.first_name} ${owner.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || owner.email.toLowerCase().includes(search) || owner.phone.includes(search);
  });

  const speciesIcons: Record<string, string> = {
    dog: '🐕',
    cat: '🐱',
    bird: '🐦',
    rabbit: '🐰',
    other: '🐾',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('owner.title')}</h2>
          <button
            onClick={() => setShowOwnerForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('owner.addOwner')}
          </button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('owner.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? t('owner.noResults') : t('owner.noOwners')}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowOwnerForm(true)}
                className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('owner.addFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOwners.map(owner => (
              <div
                key={owner.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleExpand(owner.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center overflow-hidden">
                        {owner.profile_picture_url ? (
                          <img src={owner.profile_picture_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                            {owner.first_name[0]}{owner.last_name[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {owner.first_name} {owner.last_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {owner.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {owner.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                        <PawPrint className="w-4 h-4" />
                        {owner.pet_count || 0} {t('common.pets')}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingOwner(owner);
                          setShowOwnerForm(true);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(owner.id);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedOwner === owner.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedOwner === owner.id && ownerDetails[owner.id] && (
                  <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-900/50">
                    {ownerDetails[owner.id].address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">{t('owner.address')}:</span> {ownerDetails[owner.id].address}
                      </p>
                    )}
                    {ownerDetails[owner.id].emergency_contact && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">{t('owner.emergencyContact')}:</span> {ownerDetails[owner.id].emergency_contact} ({ownerDetails[owner.id].emergency_phone})
                      </p>
                    )}
                    {ownerDetails[owner.id].notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">{t('schedule.notes')}:</span> {ownerDetails[owner.id].notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 mb-3">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">
                        {t('common.pets')} ({ownerDetails[owner.id].pets.length})
                      </h4>
                      {ownerDetails[owner.id].pets.length > 0 && (
                        <button
                          onClick={() => handleScheduleOwnerPets(ownerDetails[owner.id])}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                          {t('owner.scheduleAllPets')}
                        </button>
                      )}
                    </div>
                    {ownerDetails[owner.id].pets.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('owner.noPets')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ownerDetails[owner.id].pets.map(pet => (
                          <div
                            key={pet.id}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-600"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{speciesIcons[pet.species] || '🐾'}</span>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">{pet.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {pet.species} • {pet.temperament} • {pet.size}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleScheduleSinglePet(pet.id)}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title={t('owner.scheduleThisPet')}
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showOwnerForm && (
        <OwnerForm
          owner={editingOwner}
          onClose={() => {
            setShowOwnerForm(false);
            setEditingOwner(undefined);
          }}
          onSave={handleSave}
        />
      )}

      {showScheduleForm && (
        <ScheduleForm
          mode="multi"
          selectedDate={new Date()}
          preselectedPetIds={schedulePetIds}
          onClose={() => {
            setShowScheduleForm(false);
            setSchedulePetIds([]);
          }}
          onSave={() => {
            setShowScheduleForm(false);
            setSchedulePetIds([]);
          }}
        />
      )}
    </div>
  );
}

export default withAuth(OwnersPage);
