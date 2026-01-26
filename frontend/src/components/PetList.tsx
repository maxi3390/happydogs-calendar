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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Dog className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No pets yet</h3>
        <p className="text-gray-500 mt-1">Add your first pet to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Registered Pets ({pets.length})</h3>
      </div>
      <div className="divide-y max-h-[500px] overflow-y-auto">
        {pets.map(pet => (
          <div
            key={pet.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  {speciesIcons[pet.species] || speciesIcons.other}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{pet.name}</h4>
                  <p className="text-sm text-gray-500">
                    {pet.breed || pet.species} • {pet.age} years
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${temperamentColors[pet.temperament]}`}>
                      {pet.temperament}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pet.dominance_level <= 3 ? 'bg-green-100 text-green-700' :
                      pet.dominance_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      Dom: {pet.dominance_level}/10
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {pet.size}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(pet)}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pet.id)}
                  disabled={deletingId === pet.id}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
