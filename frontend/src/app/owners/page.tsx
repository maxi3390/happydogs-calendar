'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, User, Mail, Phone, PawPrint, Edit2, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { api, Owner, OwnerWithPets, Pet } from '@/lib/api';
import OwnerForm from '@/components/OwnerForm';
import PetForm from '@/components/PetForm';
import PetDetailsPopup from '@/components/PetDetailsPopup';
import ScheduleForm from '@/components/ScheduleForm';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/translations';
import { translateSpecies, translateTemperament, translateSize } from '@/domain/pets/labels';
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

  // Cross-entity: view (and optionally edit) a pet from an owner's accordion.
  const [petDetailsId, setPetDetailsId] = useState<number | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [petFormOwnerId, setPetFormOwnerId] = useState<number | null>(null);

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
      await refreshOwnerDetails(ownerId);
    }
  };

  const refreshOwnerDetails = async (ownerId: number) => {
    try {
      const details = await api.owners.get(ownerId);
      setOwnerDetails(prev => ({ ...prev, [ownerId]: details }));
    } catch (error) {
      console.error('Failed to fetch owner details:', error);
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
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{t('owner.title')}</h2>
            <p className="text-muted-foreground mt-1">{t('owner.description')}</p>
          </div>
          <Button
            onClick={() => setShowOwnerForm(true)}
            variant="primary"
          >
            <Plus className="w-5 h-5" />
            {t('owner.addOwner')}
          </Button>
        </div>

        <div className="mb-8 bg-card text-card-foreground rounded-2xl p-4 shadow-sm border border-border/50 backdrop-blur-sm">
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder={t('owner.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 dark:text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? t('owner.noResults') : t('owner.noOwners')}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowOwnerForm(true)}
                className="mt-4 text-primary hover:underline"
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
                className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden hover:shadow-md transition-all group"
              >
                <div
                  className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => handleExpand(owner.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shadow-inner">
                        {owner.profile_picture_url ? (
                          <img src={owner.profile_picture_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {owner.first_name[0]}{owner.last_name[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {owner.first_name} {owner.last_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {owner.email}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {owner.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20">
                        <PawPrint className="w-4 h-4" />
                        {owner.pet_count || 0} {t('common.pets')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingOwner(owner);
                            setShowOwnerForm(true);
                          }}
                          variant="ghost"
                          size="icon"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(owner.id);
                          }}
                          variant="ghost"
                          size="icon"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <div className="p-2 text-muted-foreground group-hover:bg-secondary/50 rounded-xl transition-colors">
                          {expandedOwner === owner.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedOwner === owner.id && ownerDetails[owner.id] && (
                  <div className="border-t border-border/50 p-5 bg-secondary/5">
                    {(() => {
                      const o = ownerDetails[owner.id];
                      const parts = [o.street, o.city, o.state, o.province, o.country].filter(Boolean);
                      return parts.length > 0 ? (
                        <p className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium">{t('owner.addressSection') || 'Address'}:</span> {parts.join(', ')}
                        </p>
                      ) : null;
                    })()}
                    {ownerDetails[owner.id].id_number && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{t('owner.idNumber')}:</span> {ownerDetails[owner.id].id_number}
                      </p>
                    )}
                    {ownerDetails[owner.id].emergency_contact && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{t('owner.emergencyContact')}:</span> {ownerDetails[owner.id].emergency_contact} ({ownerDetails[owner.id].emergency_phone})
                      </p>
                    )}
                    {ownerDetails[owner.id].notes && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{t('schedule.notes')}:</span> {ownerDetails[owner.id].notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 mb-3">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">
                        {t('common.pets')} ({ownerDetails[owner.id].pets.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setPetFormOwnerId(owner.id)}
                          variant="secondary"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                          {t('owner.addPet')}
                        </Button>
                        {ownerDetails[owner.id].pets.length > 0 && (
                          <Button
                            onClick={() => handleScheduleOwnerPets(ownerDetails[owner.id])}
                            variant="primary"
                            size="sm"
                          >
                            <Calendar className="w-4 h-4" />
                            {t('owner.scheduleAllPets')}
                          </Button>
                        )}
                      </div>
                    </div>
                    {ownerDetails[owner.id].pets.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">{t('owner.noPets')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ownerDetails[owner.id].pets.map(pet => (
                          <button
                            key={pet.id}
                            type="button"
                            onClick={() => setPetDetailsId(pet.id)}
                            title={pet.name}
                            className="bg-card text-card-foreground rounded-lg p-3 border border-border text-left hover:bg-secondary/30 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {pet.profile_picture_url ? (
                                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-border/50">
                                    <img
                                      src={pet.profile_picture_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xl">{speciesIcons[pet.species] || '🐾'}</span>
                                )}
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">{pet.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {translateSpecies(t, pet.species)} • {translateTemperament(t, pet.temperament)} • {translateSize(t, pet.size)}
                                  </p>
                                </div>
                              </div>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleScheduleSinglePet(pet.id);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleScheduleSinglePet(pet.id);
                                  }
                                }}
                                title={t('owner.scheduleThisPet')}
                                className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                              >
                                <Calendar className="w-4 h-4 text-primary" />
                              </span>
                            </div>
                          </button>
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

      {(petFormOwnerId !== null || editingPet) && (
        <PetForm
          pet={editingPet}
          lockedOwnerId={petFormOwnerId ?? undefined}
          onClose={() => {
            setPetFormOwnerId(null);
            setEditingPet(undefined);
          }}
          onSave={() => {
            const addOwnerId = petFormOwnerId;
            const editedOwnerId = editingPet?.owner ?? null;
            setPetFormOwnerId(null);
            setEditingPet(undefined);
            // Refresh whichever owner got its pets changed, plus the list.
            if (addOwnerId !== null) refreshOwnerDetails(addOwnerId);
            if (editedOwnerId !== null) refreshOwnerDetails(editedOwnerId);
            fetchOwners();
          }}
          onSaveAndAnother={() => {
            if (petFormOwnerId !== null) {
              refreshOwnerDetails(petFormOwnerId);
            }
            fetchOwners();
          }}
        />
      )}

      {/* Pet details popup — read-only, opened from an owner's accordion. */}
      {petDetailsId !== null && (
        <PetDetailsPopup
          petId={petDetailsId}
          onClose={() => setPetDetailsId(null)}
          onEdit={(pet) => {
            setPetDetailsId(null);
            setEditingPet(pet);
            setPetFormOwnerId(null);
          }}
        />
      )}
    </div>
  );
}

export default withAuth(OwnersPage);
