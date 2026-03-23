'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import PetList from '@/components/PetList';
import PetForm from '@/components/PetForm';
import Navigation from '@/components/Navigation';
import { Pet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';

function PetsPage() {
  const { t } = useTranslation();
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [refreshPets, setRefreshPets] = useState(0);

  const handlePetSave = () => {
    setShowPetForm(false);
    setEditingPet(undefined);
    setRefreshPets(prev => prev + 1);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setShowPetForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pet.title')}</h2>
          <button
            onClick={() => {
              setEditingPet(undefined);
              setShowPetForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('pet.addPet')}
          </button>
        </div>

        <PetList
          onEdit={handleEditPet}
          refreshTrigger={refreshPets}
        />
      </main>

      {showPetForm && (
        <PetForm
          pet={editingPet}
          onClose={() => {
            setShowPetForm(false);
          }}
          onSave={handlePetSave}
        />
      )}
    </div>
  );
}

export default withAuth(PetsPage);
