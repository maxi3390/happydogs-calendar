'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, Image, File } from 'lucide-react';
import { api, DocumentItem } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface DocumentUploadProps {
  petId?: number;
  ownerId?: number;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <Image className="w-5 h-5 text-emerald-500" />;
  }
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-primary" />;
}

export default function DocumentUpload({ petId, ownerId }: DocumentUploadProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const data = await api.documents.list({ pet_id: petId, owner_id: ownerId });
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [petId, ownerId]);

  const validateFile = (file: globalThis.File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('documents.invalidFormat');
    }
    if (file.size > MAX_SIZE) {
      return t('documents.fileTooLarge');
    }
    return null;
  };

  const handleUpload = async (file: globalThis.File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await api.documents.upload(file, {
        pet: petId,
        owner: ownerId,
        description,
      });
      setDescription('');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('documents.confirmDelete'))) return;
    try {
      await api.documents.delete(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t('documents.title')}
      </h4>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver
            ? 'border-indigo-400 bg-primary/10'
            : 'border-border hover:border-indigo-300 dark:hover:border-indigo-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400 dark:text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? t('documents.uploading') : t('documents.dragOrClick')}
          </p>
          <p className="text-xs text-gray-400 dark:text-muted-foreground">
            {t('documents.supportedFormats')}
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder={t('documents.descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-card-foreground dark:bg-slate-700 text-foreground-100 focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {t('documents.selectFile')}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-muted-foreground italic text-center py-2">
          {t('documents.noDocuments')}
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-muted/50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(doc.original_filename)}
                <div className="min-w-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate block"
                  >
                    {doc.original_filename}
                  </a>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-muted-foreground">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
