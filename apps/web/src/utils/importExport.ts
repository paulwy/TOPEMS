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
  const ExcelJS = await import('exceljs');
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          resolve({
            success: false,
            data: [],
            errors: [{ row: 0, message: i18n.t('shared.import_export.k4') }],
          });
          return;
        }

        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          headers[colNumber - 1] = String(cell.text || '');
        });

        const rawData: Record<string, unknown>[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const item: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            if (!header) return;
            const cell = row.getCell(index + 1);
            let value: unknown = cell.value;
            if (value && typeof value === 'object') {
              const v = value as { text?: unknown; result?: unknown; richText?: unknown };
              if (typeof v.text === 'string') {
                value = v.text;
              } else if (typeof v.result === 'string' || typeof v.result === 'number') {
                value = v.result;
              }
            }
            item[header] = value;
          });
          rawData.push(item);
        });

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
