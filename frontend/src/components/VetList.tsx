'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, Stethoscope, MapPin, Mail, Phone, Search } from 'lucide-react';
import { api, Vet } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface VetListProps {
  onEdit: (vet: Vet) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

function addressSummary(vet: Vet): string {
  return [vet.street, vet.city, vet.state, vet.province, vet.country]
    .filter(Boolean)
    .join(', ');
}

export default function VetList({ onEdit, onAdd, refreshTrigger }: VetListProps) {
  const { t } = useTranslation();
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchVets = async () => {
    setLoading(true);
    try {
      const data = await api.vets.list();
      setVets(data);
    } catch (error) {
      console.error('Failed to fetch vets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVets();
  }, [refreshTrigger]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmations.deleteVet'))) return;

    setDeletingId(id);
    try {
      await api.vets.delete(id);
      setVets(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      console.error('Failed to delete vet:', error);
      alert(t('errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVets = vets.filter(vet => {
    const search = searchTerm.toLowerCase();
    return (
      vet.name.toLowerCase().includes(search) ||
      vet.email.toLowerCase().includes(search) ||
      vet.city.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (vets.length === 0) {
    return (
      <div className="bg-card text-card-foreground rounded-xl shadow-lg p-10 text-center">
        <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('vet.noVets')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('vet.addFirst')}
        </p>
        <Button variant="primary" onClick={onAdd}>
          {t('vet.addVet')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        icon={<Search className="w-4 h-4" />}
        type="text"
        placeholder={t('vet.searchPlaceholder')}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      <div className="space-y-3">
        {filteredVets.map(vet => {
          const address = addressSummary(vet);
          return (
            <div
              key={vet.id}
              className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
                  <h3 className="text-base font-semibold text-foreground truncate">{vet.name}</h3>
                </div>
                {address && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{address}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {vet.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {vet.phone}
                    </span>
                  )}
                  {vet.email && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {vet.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(vet)}
                  aria-label={t('vet.editVet')}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(vet.id)}
                  disabled={deletingId === vet.id}
                  aria-label={t('vet.deleteVet')}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredVets.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t('vet.noMatches')}
          </p>
        )}
      </div>
    </div>
  );
}
