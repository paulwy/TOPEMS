import dayjs from 'dayjs';
import i18n from '@/i18n';
import i18next from 'i18next';

// i18n key 翻译函数

export const parseFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'xlsx' || ext === 'xls') {
    return 'xlsx';
  }
  return 'csv';
};

export const getImportModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    create: i18n.t('shared.import_export.k0'),
    update: i18n.t('shared.import_export.k1'),
    create_update: i18n.t('shared.import_export.k2'),
  };
  return labels[mode] || mode;
};

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  const ExcelJS = await import('exceljs');
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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
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
