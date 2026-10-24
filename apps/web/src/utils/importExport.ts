import dayjs from 'dayjs';
import i18n from '@/i18n';

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: unknown) => string;
}

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
