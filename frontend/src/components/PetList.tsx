'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, Dog, Cat, Bird, Rabbit, HelpCircle } from 'lucide-react';
import { api, Pet } from '@/lib/api';

interface PetListProps {
  onEdit: (pet: Pet) => void;
  refreshTrigger: number;
}

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

export default function PetList({ onEdit, refreshTrigger }: PetListProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    if (!confirm('Are you sure you want to delete this pet? This will also delete all their schedules.')) {
      return;
    }

    setDeletingId(id);
    try {
      await api.pets.delete(id);
      setPets(pets.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete pet:', error);
      alert('Failed to delete pet');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <Dog className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">No pets yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Add your first pet to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Registered Pets ({pets.length})</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
        {pets.map(pet => (
          <div
            key={pet.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  {speciesIcons[pet.species] || speciesIcons.other}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{pet.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pet.breed || pet.species} • {pet.age} years
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${temperamentColors[pet.temperament]}`}>
                      {pet.temperament}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pet.dominance_level <= 3 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                      pet.dominance_level <= 6 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                    }`}>
                      Dom: {pet.dominance_level}/10
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300">
                      {pet.size}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(pet)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pet.id)}
                  disabled={deletingId === pet.id}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
