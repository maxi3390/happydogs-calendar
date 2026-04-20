'use client';

import { useState } from 'react';
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
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t('pet.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('pet.description')}</p>
        </div>

        <PetList
          onEdit={handleEditPet}
          refreshTrigger={refreshPets}
        />
      </main>

      {showPetForm && editingPet && (
        <PetForm
          pet={editingPet}
          onClose={() => {
            setShowPetForm(false);
            setEditingPet(undefined);
          }}
          onSave={handlePetSave}
        />
      )}
    </div>
  );
}

export default withAuth(PetsPage);
