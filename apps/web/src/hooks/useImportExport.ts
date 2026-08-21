import { useState } from 'react';

interface UseImportExportOptions {
  apiEndpoint: string;
}

const useImportExport = ({ apiEndpoint }: UseImportExportOptions) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importData = async (
    file: File,
    entityType: string,
    importMode: string,
    skipErrors: boolean = false
  ) => {
    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('import_mode', importMode);
      formData.append('skiperrors', String(skipErrors));

      const response = await fetch(`${apiEndpoint}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      return result.data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Import failed');
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  const exportData = async (
    entityType: string,
    fileFormat: string,
    columns: string[] = [],
    filters?: Record<string, string>
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: entityType,
          fileformat: fileFormat,
          columns,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      return result.data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Export failed');
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const getImportTemplates = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/import/templates`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const result = await response.json();
      return result.data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch templates');
      throw err;
    }
  };

  const getImportStatus = async (importId: string) => {
    try {
      const response = await fetch(`${apiEndpoint}/import/${importId}/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch import status');
      }
      const result = await response.json();
      return result.data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to fetch import status');
      throw err;
    }
  };

  return {
    importData,
    exportData,
    getImportTemplates,
    getImportStatus,
    isImporting,
    isExporting,
    error,
  };
};
