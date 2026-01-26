'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, PawPrint, ArrowLeft, Search } from 'lucide-react';
import PetList from '@/components/PetList';
import PetForm from '@/components/PetForm';
import ThemeToggle from '@/components/ThemeToggle';
import { Pet } from '@/lib/api';

export default function PetsPage() {
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
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-indigo-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 dark:bg-emerald-500 rounded-xl">
                  <PawPrint className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pets</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage registered pets</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => {
                  setEditingPet(undefined);
                  setShowPetForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Pet
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            setEditingPet(undefined);
          }}
          onSave={handlePetSave}
        />
      )}
    </div>
  );
}
