'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import PetList from '@/components/PetList';
import PetForm from '@/components/PetForm';
import Navigation from '@/components/Navigation';
import { Pet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';
import { Button } from '@/components/ui/Button';

function PetsPage() {
  const { t } = useTranslation();
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [refreshPets, setRefreshPets] = useState(0);

  const handleAddPet = () => {
    setEditingPet(undefined);
    setShowPetForm(true);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setShowPetForm(true);
  };

  const handleCloseForm = () => {
    setShowPetForm(false);
    setEditingPet(undefined);
  };

  const handlePetSave = () => {
    setShowPetForm(false);
    setEditingPet(undefined);
    setRefreshPets(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{t('pet.title')}</h2>
            <p className="text-muted-foreground mt-1">{t('pet.description')}</p>
          </div>
          <Button onClick={handleAddPet} variant="primary">
            <Plus className="w-5 h-5" />
            {t('pet.addPet')}
          </Button>
        </div>

        <PetList
          onEdit={handleEditPet}
          refreshTrigger={refreshPets}
        />
      </main>

      {/* Render the form for BOTH add and edit flows.
          Previously this guard also required `editingPet`, which silently
          swallowed the create flow — Add Pet would set showPetForm but the
          form stayed closed because editingPet was undefined. */}
      {showPetForm && (
        <PetForm
          pet={editingPet}
          onClose={handleCloseForm}
          onSave={handlePetSave}
        />
      )}
    </div>
  );
}

export default withAuth(PetsPage);
