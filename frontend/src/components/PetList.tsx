'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Edit2, Trash2, Dog, Cat, Bird, Rabbit, HelpCircle, ChevronDown,
  FileText, Search, X,
} from 'lucide-react';
import { api, Pet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

interface PetListProps {
  onEdit: (pet: Pet) => void;
  refreshTrigger: number;
}

const CANONICAL_SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'other'];
const TEMPERAMENT_VALUES = ['calm', 'playful', 'aggressive', 'anxious', 'friendly'];
const SIZE_VALUES = ['small', 'medium', 'large'];
const SEX_VALUES = ['male', 'female'];

const speciesIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-5 h-5" />,
  cat: <Cat className="w-5 h-5" />,
  bird: <Bird className="w-5 h-5" />,
  rabbit: <Rabbit className="w-5 h-5" />,
  other: <HelpCircle className="w-5 h-5" />,
};

const temperamentColors: Record<string, string> = {
  calm: 'bg-blue-100 text-blue-800',
  playful: 'bg-green-100 text-green-800',
  aggressive: 'bg-red-100 text-red-800',
  anxious: 'bg-purple-100 text-purple-800',
  friendly: 'bg-emerald-100 text-emerald-800',
};

interface PetFilters {
  searchTerm: string;
  species: string;     // 'all' | canonical | custom
  temperament: string; // 'all' | canonical
  size: string;        // 'all' | canonical
  sex: string;         // 'all' | 'male' | 'female'
  neutered: 'all' | 'yes' | 'no';
}

const defaultFilters: PetFilters = {
  searchTerm: '',
  species: 'all',
  temperament: 'all',
  size: 'all',
  sex: 'all',
  neutered: 'all',
};

function hasActiveFilters(f: PetFilters): boolean {
  return (
    f.searchTerm.trim() !== '' ||
    f.species !== 'all' ||
    f.temperament !== 'all' ||
    f.size !== 'all' ||
    f.sex !== 'all' ||
    f.neutered !== 'all'
  );
}

export default function PetList({ onEdit, refreshTrigger }: PetListProps) {
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedPetId, setExpandedPetId] = useState<number | null>(null);
  const [filters, setFilters] = useState<PetFilters>(defaultFilters);

  const fetchPets = async () => {
    setLoading(true);
    try {
      const data = await api.pets.list();
      setPets(data);
    } catch (error) {
      console.error('Failed to fetch pets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, [refreshTrigger]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmations.deletePet'))) {
      return;
    }

    setDeletingId(id);
    try {
      await api.pets.delete(id);
      setPets(pets.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete pet:', error);
      alert(t('errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  // Canonical + any non-canonical species values observed on loaded pets.
  // Keeps the filter honest when `custom_pet_species` is on and someone
  // has recorded e.g. a ferret.
  const speciesOptions = useMemo(() => {
    const extras = Array.from(
      new Set(pets.map(p => p.species).filter(s => s && !CANONICAL_SPECIES.includes(s))),
    );
    return [...CANONICAL_SPECIES, ...extras];
  }, [pets]);

  const filteredPets = useMemo(() => {
    const search = filters.searchTerm.trim().toLowerCase();
    return pets.filter(pet => {
      if (search) {
        const ownerName = pet.owner_details?.full_name?.toLowerCase() ?? '';
        const haystack = `${pet.name} ${pet.breed ?? ''} ${ownerName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.species !== 'all' && pet.species !== filters.species) return false;
      if (filters.temperament !== 'all' && pet.temperament !== filters.temperament) return false;
      if (filters.size !== 'all' && pet.size !== filters.size) return false;
      if (filters.sex !== 'all' && pet.sex !== filters.sex) return false;
      if (filters.neutered !== 'all') {
        const want = filters.neutered === 'yes';
        if (pet.neutered !== want) return false;
      }
      return true;
    });
  }, [pets, filters]);

  const showingFiltered = hasActiveFilters(filters);
  const clearFilters = () => setFilters(defaultFilters);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-card rounded-2xl shadow-sm border border-border/50 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  // No pets at all — distinct from "filters match nothing". Keep the existing CTA.
  if (pets.length === 0) {
    return (
      <div className="text-center py-12">
        <Dog className="w-12 h-12 mx-auto text-gray-300 dark:text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('pet.noPets')}</p>
        <p className="text-sm text-muted-foreground/80 mt-1">{t('pet.addFirst')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Search + filter toolbar — its own card, matches the owners page */}
      <div className="mb-8 bg-card text-card-foreground rounded-2xl p-4 shadow-sm border border-border/50 backdrop-blur-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={<Search className="w-4 h-4" />}
              type="text"
              value={filters.searchTerm}
              onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              placeholder={t('pet.filters.searchPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:flex-shrink-0">
            <select
              value={filters.species}
              onChange={e => setFilters(prev => ({ ...prev, species: e.target.value }))}
              aria-label={t('pet.filters.species')}
              className="h-10 px-3 text-sm rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t('pet.filters.species')}: {t('pet.filters.all')}</option>
              {speciesOptions.map(val => (
                <option key={val} value={val}>
                  {CANONICAL_SPECIES.includes(val) ? t(`pet.speciesOptions.${val}`) : val}
                </option>
              ))}
            </select>
            <select
              value={filters.temperament}
              onChange={e => setFilters(prev => ({ ...prev, temperament: e.target.value }))}
              aria-label={t('pet.filters.temperament')}
              className="h-10 px-3 text-sm rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t('pet.filters.temperament')}: {t('pet.filters.all')}</option>
              {TEMPERAMENT_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.temperamentOptions.${val}`)}</option>
              ))}
            </select>
            <select
              value={filters.size}
              onChange={e => setFilters(prev => ({ ...prev, size: e.target.value }))}
              aria-label={t('pet.filters.size')}
              className="h-10 px-3 text-sm rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t('pet.filters.size')}: {t('pet.filters.all')}</option>
              {SIZE_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.sizeOptions.${val}`)}</option>
              ))}
            </select>
            <select
              value={filters.sex}
              onChange={e => setFilters(prev => ({ ...prev, sex: e.target.value }))}
              aria-label={t('pet.filters.sex')}
              className="h-10 px-3 text-sm rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t('pet.filters.sex')}: {t('pet.filters.all')}</option>
              {SEX_VALUES.map(val => (
                <option key={val} value={val}>{t(`pet.sexOptions.${val}`)}</option>
              ))}
            </select>
            <select
              value={filters.neutered}
              onChange={e => setFilters(prev => ({ ...prev, neutered: e.target.value as 'all' | 'yes' | 'no' }))}
              aria-label={t('pet.filters.neutered')}
              className="h-10 px-3 text-sm rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t('pet.filters.neutered')}: {t('pet.filters.all')}</option>
              <option value="yes">{t('pet.filters.neutered')}: {t('common.yes')}</option>
              <option value="no">{t('pet.filters.neutered')}: {t('common.no')}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            {showingFiltered
              ? t('pet.filters.showing', { x: filteredPets.length, y: pets.length })
              : `${t('pet.registeredPets')} (${pets.length})`}
          </h3>
          {showingFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="w-3 h-3" />
              {t('pet.filters.clearAll')}
            </button>
          )}
        </div>
      </div>

      {/* Empty-results state (distinct from "no pets registered yet") */}
      {filteredPets.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('pet.filters.noMatches')}</p>
          <Button variant="secondary" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            {t('pet.filters.clearAll')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPets.map(pet => (
            <div
              key={pet.id}
              className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden hover:shadow-md transition-all group"
            >
              <div
                className="p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpandedPetId(expandedPetId === pet.id ? null : pet.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {pet.profile_picture_url ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-border/50 shadow-sm">
                        <img src={pet.profile_picture_url} alt={pet.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 border border-primary/20 shadow-inner">
                        {speciesIcons[pet.species] || speciesIcons.other}
                      </div>
                    )}
                    <div className="flex-1 mt-1">
                      <h3 className={`text-lg font-bold transition-colors ${expandedPetId === pet.id ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>{pet.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        {pet.breed || pet.species} • {pet.age} {t('common.years')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('pet.owner')}: {pet.owner_details?.full_name || t('pet.noOwner')}
                      </p>
                      {(pet.medical_notes_count ?? 0) > 0 && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs inline-flex items-center" title={t('medicalNotes.title')}>
                            <FileText className="w-3 h-3" />
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      onClick={(e) => { e.stopPropagation(); onEdit(pet); }}
                      variant="ghost"
                      size="icon"
                    >
                      <Edit2 className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleDelete(pet.id); }}
                      disabled={deletingId === pet.id}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <div className={`p-2 ml-1 rounded-xl transition-colors ${expandedPetId === pet.id ? 'text-foreground bg-secondary' : 'text-muted-foreground group-hover:bg-secondary/50'}`}>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expandedPetId === pet.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accordion Content */}
              {expandedPetId === pet.id && (
                <div className="border-t border-border/50 p-5 bg-secondary/5">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Bigger Picture */}
                    {pet.profile_picture_url ? (
                      <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-primary/10 shadow-md">
                        <img src={pet.profile_picture_url} alt={pet.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl flex items-center justify-center bg-secondary/50 text-foreground/20 shrink-0 border-2 border-dashed border-border/50">
                        <div className="w-16 h-16 opacity-50">
                          {speciesIcons[pet.species] || speciesIcons.other}
                        </div>
                      </div>
                    )}

                    {/* Profile Basics */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('pet.traits')}</h5>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={temperamentColors[pet.temperament] ? 'secondary' : 'default'} className={temperamentColors[pet.temperament]}>
                            {t(`pet.temperamentOptions.${pet.temperament}`)}
                          </Badge>
                          <Badge variant={pet.dominance_level <= 3 ? 'success' : pet.dominance_level <= 6 ? 'warning' : 'danger'}>
                            {t('common.dom')}: {pet.dominance_level}/10
                          </Badge>
                          <Badge variant="secondary">
                            {t(`pet.sizeOptions.${pet.size}`)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-secondary/30 p-3 rounded-xl">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.sex')}</span>
                          <p className="font-semibold text-sm text-foreground mt-0.5 capitalize">{pet.sex ? t(`pet.sexOptions.${pet.sex}`) : '-'}</p>
                        </div>
                        <div className="bg-secondary/30 p-3 rounded-xl">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.neutered')}</span>
                          <p className="font-semibold text-sm text-foreground mt-0.5 capitalize">{pet.neutered ? t('common.yes') : t('common.no')}</p>
                        </div>
                        <div className="bg-secondary/30 p-3 rounded-xl">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('pet.owner')}</span>
                          <p className="font-semibold text-sm text-foreground mt-0.5 truncate" title={pet.owner_details?.full_name || t('pet.noOwner')}>
                            {pet.owner_details?.full_name || t('pet.noOwner')}
                          </p>
                        </div>
                      </div>

                      {pet.special_notes && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                          <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase font-bold tracking-wider">{t('pet.specialNotes')}</span>
                          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{pet.special_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
