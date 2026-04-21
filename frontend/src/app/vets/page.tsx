'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Vet } from '@/lib/api';
import VetList from '@/components/VetList';
import VetForm from '@/components/VetForm';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/translations';
import { withAuth } from '@/lib/withAuth';

function VetsPage() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingVet, setEditingVet] = useState<Vet | undefined>();
  const [refreshToken, setRefreshToken] = useState(0);

  const handleEdit = (vet: Vet) => {
    setEditingVet(vet);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingVet(undefined);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingVet(undefined);
    setRefreshToken(prev => prev + 1);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingVet(undefined);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{t('vet.title')}</h2>
            <p className="text-muted-foreground mt-1">{t('vet.description')}</p>
          </div>
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {t('vet.addVet')}
          </Button>
        </div>

        <VetList
          onEdit={handleEdit}
          onAdd={handleAdd}
          refreshTrigger={refreshToken}
        />
      </main>

      {showForm && (
        <VetForm
          vet={editingVet}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default withAuth(VetsPage);
