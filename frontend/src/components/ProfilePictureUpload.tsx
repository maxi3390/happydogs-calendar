'use client';

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, User } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/Button';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ProfilePictureUploadProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  initials?: string;
}

export default function ProfilePictureUpload({
  currentUrl,
  onUpload,
  onDelete,
  initials = '?',
}: ProfilePictureUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('documents.photoFormatError'));
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(t('documents.photoSizeError'));
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.photoUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-primary">
              {initials}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        {!uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
            title={currentUrl ? t('documents.changePhoto') : t('documents.uploadPhoto')}
          >
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentUrl && !uploading && (
        <Button
          type="button"
          onClick={handleDelete}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive text-xs"
        >
          <Trash2 className="w-3 h-3" />
          {t('documents.removePhoto')}
        </Button>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 text-center max-w-[200px]">
          {error}
        </p>
      )}
    </div>
  );
}
