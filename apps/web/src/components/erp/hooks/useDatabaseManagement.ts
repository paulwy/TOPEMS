// Module-level t for use outside React components (shadowed by useTranslation inside components)
export interface BackupRecord {
  id: string;
  backup_name: string;
  backup_type: 'full' | 'incremental';
  filesize: string;
  status: 'success' | 'failed' | 'running';
  created_at: string;
  created_by: string;
  remark?: string;
}
