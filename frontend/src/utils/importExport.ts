export interface ImportTemplate {
  entity_type: string;
  template_name: string;
  columns: TemplateColumn[];
}

export interface TemplateColumn {
  field: string;
  header: string;
  required: boolean;
  field_type: string;
  description: string;
}

export interface ImportRequest {
  entity_type: string;
  file_data: string;
  file_format: string;
  import_mode: string;
  skip_errors: boolean;
}

export interface ExportRequest {
  entity_type: string;
  filters?: Record<string, string>;
  columns: string[];
  file_format: string;
}

export interface ImportResult {
  total_rows: number;
  success_rows: number;
  failed_rows: ImportRowError[];
  errors: string[];
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ImportStatus {
  id: string;
  entity_type: string;
  status: string;
  progress: number;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  errors: string[];
  created_at: string;
}

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadBase64File = (base64Data: string, filename: string) => {
  const link = document.createElement('a');
  link.href = `data:application/octet-stream;base64,${base64Data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'csv';
};

export const getImportModeLabel = (mode: string): string => {
  switch (mode) {
    case 'create':
      return '仅创建（跳过已存在）';
    case 'update':
      return '仅更新';
    case 'create_update':
      return '创建或更新';
    default:
      return mode;
  }
};
