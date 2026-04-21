'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Database, AlertCircle } from 'lucide-react';
import { api, ImportFormat, ImportSummary } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CONFIRM_TOKEN = 'RESTORE';

export default function DataBackupSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState<ImportFormat | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ImportFormat) => {
    setExporting(format);
    setError(null);
    try {
      await api.dataPortability.exportAs(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dataBackup.exportFailed'));
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async () => {
    if (!file || confirmInput !== CONFIRM_TOKEN) return;
    setImporting(true);
    setError(null);
    try {
      const summary: ImportSummary = await api.dataPortability.importFile(file);
      const countsBlob = Object.entries(summary.counts)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      toast(
        t('dataBackup.importSuccess', { counts: countsBlob }),
        { variant: 'success' },
      );
      setFile(null);
      setConfirmInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dataBackup.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const canRestore = Boolean(file) && confirmInput === CONFIRM_TOKEN && !importing;

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-start gap-3 mb-4">
        <Database className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold">{t('dataBackup.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('dataBackup.description')}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Export */}
      <div className="border-t border-border pt-4 mb-6">
        <h3 className="text-sm font-medium mb-2">{t('dataBackup.exportSection')}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t('dataBackup.exportHint')}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => handleExport('json')}
            disabled={exporting !== null}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting === 'json' ? t('dataBackup.exporting') : t('dataBackup.exportJson')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting === 'csv' ? t('dataBackup.exporting') : t('dataBackup.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Import */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-2">{t('dataBackup.importSection')}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t('dataBackup.importDescription')}</p>

        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">{t('dataBackup.pickFile')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip,application/json,application/zip"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary file:text-foreground hover:file:bg-secondary/80 file:cursor-pointer"
            />
            {!file && (
              <p className="text-xs text-muted-foreground mt-1">{t('dataBackup.noFile')}</p>
            )}
          </label>

          <Input
            label={t('dataBackup.confirmLabel')}
            type="text"
            value={confirmInput}
            onChange={e => setConfirmInput(e.target.value)}
            placeholder={CONFIRM_TOKEN}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">{t('dataBackup.confirmHint')}</p>

          <div className="flex">
            <Button
              variant="danger"
              onClick={handleImport}
              disabled={!canRestore}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? t('dataBackup.importing') : t('dataBackup.restoreButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
