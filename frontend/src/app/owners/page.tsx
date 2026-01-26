'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, User, Mail, Phone, PawPrint, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { api, Owner, OwnerWithPets } from '@/lib/api';
import OwnerForm from '@/components/OwnerForm';
import ThemeToggle from '@/components/ThemeToggle';

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | undefined>();
  const [expandedOwner, setExpandedOwner] = useState<number | null>(null);
  const [ownerDetails, setOwnerDetails] = useState<Record<number, OwnerWithPets>>({});

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
      try {
        const details = await api.owners.get(ownerId);
        setOwnerDetails(prev => ({ ...prev, [ownerId]: details }));
      } catch (error) {
        console.error('Failed to fetch owner details:', error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this owner? This will also delete all their pets.')) {
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
                <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pet Owners</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage owners and their pets</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setShowOwnerForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Owner
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search owners by name, email, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No owners found matching your search' : 'No owners registered yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowOwnerForm(true)}
                className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Add your first owner
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOwners.map(owner => (
              <div
                key={owner.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => handleExpand(owner.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {owner.first_name[0]}{owner.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {owner.first_name} {owner.last_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {owner.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {owner.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm">
                        <PawPrint className="w-4 h-4" />
                        {owner.pet_count || 0} pets
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingOwner(owner);
                          setShowOwnerForm(true);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(owner.id);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedOwner === owner.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedOwner === owner.id && ownerDetails[owner.id] && (
                  <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-900/50">
                    {ownerDetails[owner.id].address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">Address:</span> {ownerDetails[owner.id].address}
                      </p>
                    )}
                    {ownerDetails[owner.id].emergency_contact && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">Emergency:</span> {ownerDetails[owner.id].emergency_contact} ({ownerDetails[owner.id].emergency_phone})
                      </p>
                    )}
                    {ownerDetails[owner.id].notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="font-medium">Notes:</span> {ownerDetails[owner.id].notes}
                      </p>
                    )}

                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 mt-4">
                      Pets ({ownerDetails[owner.id].pets.length})
                    </h4>
                    {ownerDetails[owner.id].pets.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No pets registered</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ownerDetails[owner.id].pets.map(pet => (
                          <div
                            key={pet.id}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-600"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{speciesIcons[pet.species] || '🐾'}</span>
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{pet.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                  {pet.species} • {pet.temperament} • {pet.size}
                                </p>
                              </div>
                            </div>
                          </div>
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
    </div>
  );
}
