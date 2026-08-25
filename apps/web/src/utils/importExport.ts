import dayjs from 'dayjs';
import i18n from '@/i18n';
import i18next from 'i18next';

// i18n key 翻译函数

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: unknown) => string;
}

export const exportToExcel = async <T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string = 'export'
): Promise<void> => {
  const XLSX = await import('xlsx');
  const headers = columns.map((col) => col.label);

  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      if (col.format) {
        return col.format(value);
      }
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'boolean') {
        return value
          ? i18next.t('common.yes', i18n.t('shared.import_export.k1'))
          : i18next.t('common.no', i18n.t('shared.import_export.k0'));
      }
      if (value instanceof Date || (typeof value === 'string' && dayjs(value).isValid())) {
        return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
      }
      return String(value);
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, `${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
};

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: { row: number; message: string }[];
}

export const importFromExcel = async <T>(
  file: File,
  columns: ExportColumn<T>[],
  transform?: (raw: Record<string, unknown>) => T
): Promise<ImportResult<T>> => {
  const XLSX = await import('xlsx');
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet) as unknown as Record<string, unknown>[];

        const errors: { row: number; message: string }[] = [];
        const result: T[] = [];

        rawData.forEach((row, index) => {
          try {
            if (transform) {
              const item = transform(row);
              result.push(item);
            } else {
              const item: Partial<T> = {};
              columns.forEach((col) => {
                item[col.key] = row[col.label] as T[keyof T];
              });
              result.push(item as T);
            }
          } catch (error: unknown) {
            errors.push({
              row: index + 2,
              message: error instanceof Error ? error.message : i18n.t('shared.import_export.k3'),
            });
          }
        });

        resolve({
          success: errors.length === 0,
          data: result,
          errors,
        });
      } catch (error: unknown) {
        resolve({
          success: false,
          data: [],
          errors: [
            {
              row: 0,
              message: error instanceof Error ? error.message : i18n.t('shared.import_export.k4'),
            },
          ],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, message: i18n.t('shared.import_export.k5') }],
      });
    };

    reader.readAsArrayBuffer(file);
  });
};

export const exportToCSV = <T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string = 'export'
): void => {
  const headers = columns.map((col) => col.label).join(',');

  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        let result: string;

        if (col.format) {
          result = col.format(value);
        } else if (value === null || value === undefined) {
          result = '';
        } else if (typeof value === 'boolean') {
          result = value ? i18n.t('shared.import_export.k7') : i18n.t('shared.import_export.k6');
        } else if (value instanceof Date || (typeof value === 'string' && dayjs(value).isValid())) {
          result = dayjs(value).format('YYYY-MM-DD HH:mm:ss');
        } else {
          result = String(value);
        }

        if (result.includes(',')) {
          result = `"${result}"`;
        }
        return result;
      })
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadTemplate = <T>(
  columns: ExportColumn<T>[],
  fileName: string = 'template'
): void => {
  const headers = columns.map((col) => col.label);
  const csvContent = headers.join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
