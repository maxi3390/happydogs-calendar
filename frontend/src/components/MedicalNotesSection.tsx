'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, FileText } from 'lucide-react';
import { api, MedicalNote } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface MedicalNotesSectionProps {
  petId: number;
}

interface EditableNote {
  id?: number;
  title: string;
  description: string;
  isSaving?: boolean;
}

export default function MedicalNotesSection({ petId }: MedicalNotesSectionProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<EditableNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await api.medicalNotes.list(petId);
      setNotes(data.map((note: MedicalNote) => ({
        id: note.id,
        title: note.title,
        description: note.description || '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [petId]);

  const handleAddNote = () => {
    setNotes(prev => [...prev, { title: '', description: '' }]);
  };

  const handleChange = (index: number, field: 'title' | 'description', value: string) => {
    setNotes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (index: number) => {
    const note = notes[index];
    if (!note.title.trim()) {
      setError(t('medicalNotes.titleRequired'));
      return;
    }

    setError(null);
    setNotes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isSaving: true };
      return updated;
    });

    try {
      if (note.id) {
        await api.medicalNotes.update(note.id, {
          title: note.title,
          description: note.description,
        });
      } else {
        const created = await api.medicalNotes.create({
          pet: petId,
          title: note.title,
          description: note.description,
        });
        setNotes(prev => {
          const updated = [...prev];
          updated[index] = {
            id: created.id,
            title: created.title,
            description: created.description || '',
            isSaving: false,
          };
          return updated;
        });
        return;
      }

      setNotes(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isSaving: false };
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
      setNotes(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isSaving: false };
        return updated;
      });
    }
  };

  const handleDelete = async (index: number) => {
    const note = notes[index];
    if (note.id) {
      try {
        await api.medicalNotes.delete(note.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.deleteFailed'));
        return;
      }
    }

    setNotes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="shadow-none border border-border">
      <CardHeader className="py-4 px-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('medicalNotes.title')}
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={handleAddNote}>
            <Plus className="w-4 h-4" />
            {t('medicalNotes.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 pt-4 space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('medicalNotes.empty')}</p>
        ) : (
          notes.map((note, index) => (
            <div key={note.id ?? `new-${index}`} className="rounded-xl border border-border/60 p-3 space-y-2 bg-background/70">
              <Input
                value={note.title}
                onChange={e => handleChange(index, 'title', e.target.value)}
                placeholder={t('medicalNotes.titlePlaceholder')}
              />
              <textarea
                value={note.description}
                onChange={e => handleChange(index, 'description', e.target.value)}
                rows={3}
                placeholder={t('medicalNotes.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-border/50 rounded-xl bg-background text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave(index)}
                  disabled={note.isSaving}
                >
                  <Save className="w-4 h-4" />
                  {note.isSaving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
