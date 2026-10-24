import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { databaseApi, type TableInfo, type TableDetail } from '@/api/erp/database';
import { extractErrorMessage } from '@/utils/errors';
import i18n from '@/i18n';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
const mockBackups: BackupRecord[] = [
  {
    id: '1',
    backup_name: 'backup_full_20240615_0200',
    backup_type: 'full',
    filesize: '156.8 MB',
    status: 'success',
    created_at: '2024-06-15 02:00:00',
    created_by: 'system',
    remark: i18n.t('erp.database.mock.backup_daily_full'),
  },
  {
    id: '2',
    backup_name: 'backup_incr_20240614_2000',
    backup_type: 'incremental',
    filesize: '12.4 MB',
    status: 'success',
    created_at: '2024-06-14 20:00:00',
    created_by: 'system',
    remark: i18n.t('erp.database.mock.backup_incremental'),
  },
  {
    id: '3',
    backup_name: 'backup_incr_20240613_2000',
    backup_type: 'incremental',
    filesize: '8.7 MB',
    status: 'success',
    created_at: '2024-06-13 20:00:00',
    created_by: 'system',
    remark: i18n.t('erp.database.mock.backup_incremental'),
  },
  {
    id: '4',
    backup_name: 'backup_full_20240601_0200',
    backup_type: 'full',
    filesize: '142.3 MB',
    status: 'success',
    created_at: '2024-06-01 02:00:00',
    created_by: 'system',
    remark: i18n.t('erp.database.mock.backup_monthly_full'),
  },
  {
    id: '5',
    backup_name: 'backup_manual_20240520',
    backup_type: 'full',
    filesize: '128.5 MB',
    status: 'failed',
    created_at: '2024-05-20 14:30:00',
    created_by: i18n.t('erp.database.mock.admin'),
    remark: i18n.t('erp.database.mock.manual_backup_failed'),
  },
];
