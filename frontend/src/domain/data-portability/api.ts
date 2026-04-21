import { downloadFile, uploadFile } from '../_http/client';
import { ImportFormat, ImportSummary } from './types';

function triggerDownload(blob: Blob, filename: string) {
  // Create an object URL, attach it to a transient anchor, click, cleanup.
  // Standard pattern for bearer-token-gated downloads.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const dataPortabilityApi = {
  async exportAs(format: ImportFormat): Promise<void> {
    const path = format === 'json'
      ? '/data-portability/export/json'
      : '/data-portability/export/csv';
    const { blob, filename } = await downloadFile(path);
    const fallback = format === 'json' ? 'happy-calendar-backup.json' : 'happy-calendar-backup.zip';
    triggerDownload(blob, filename || fallback);
  },

  importFile(file: File): Promise<ImportSummary> {
    const form = new FormData();
    form.append('file', file);
    return uploadFile<ImportSummary>('/data-portability/import', form);
  },
};
