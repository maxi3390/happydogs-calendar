'use client';

import { useState } from 'react';
import PetList from '@/components/PetList';
import PetForm from '@/components/PetForm';
import OwnerForm from '@/components/OwnerForm';
import OwnerDetailsPopup from '@/components/OwnerDetailsPopup';
import Navigation from '@/components/Navigation';
import { Owner, OwnerWithPets, Pet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';

function PetsPage() {
  const { t } = useTranslation();
  // Pet *creation* lives on /owners (expand an owner card → "Add Pet"),
  // so this page only ever opens the form in EDIT mode.
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [refreshPets, setRefreshPets] = useState(0);

  // Cross-entity: view (and optionally edit) an owner from the pet accordion.
  const [ownerDetailsId, setOwnerDetailsId] = useState<number | null>(null);
  const [editingOwner, setEditingOwner] = useState<Owner | undefined>();

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

  // Owner-popup flow: click "Owner: <name>" on a pet → open read-only popup.
  const handleViewOwner = (ownerId: number) => {
    setOwnerDetailsId(ownerId);
  };

  // From the popup, the operator can promote to an edit: close the popup and
  // open the Owner form.
  const handleEditOwnerFromPopup = (owner: OwnerWithPets) => {
    setOwnerDetailsId(null);
    // OwnerWithPets extends Owner, so this is a safe widen-to-narrower downcast.
    setEditingOwner(owner);
  };

  const handleCloseOwnerForm = () => {
    setEditingOwner(undefined);
  };

  const handleOwnerSave = () => {
    setEditingOwner(undefined);
    // Re-fetch pets so any updated owner name reflects in the pet cards.
    setRefreshPets(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{t('pet.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('pet.description')}</p>
        </div>

        <PetList
          onEdit={handleEditPet}
          refreshTrigger={refreshPets}
          onViewOwner={handleViewOwner}
        />
      </main>

      {/* Pet form (add or edit). Render whenever the flag is set — editingPet
          stays undefined in create mode, which PetForm handles correctly. */}
      {showPetForm && (
        <PetForm
          pet={editingPet}
          onClose={handleCloseForm}
          onSave={handlePetSave}
        />
      )}

      {/* Owner details popup — read-only, opened from a pet's accordion. */}
      {ownerDetailsId !== null && (
        <OwnerDetailsPopup
          ownerId={ownerDetailsId}
          onClose={() => setOwnerDetailsId(null)}
          onEdit={handleEditOwnerFromPopup}
        />
      )}

      {/* Owner form in edit mode, reached via the popup's Edit button. */}
      {editingOwner && (
        <OwnerForm
          owner={editingOwner}
          onClose={handleCloseOwnerForm}
          onSave={handleOwnerSave}
        />
      )}
    </div>
  );
}

export default withAuth(PetsPage);
