import type { CSSProperties } from 'react';
import css from './ConsolidationScopeTable.module.css';
import { useTranslation } from 'react-i18next';
import { Chip, Button } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2, Building2 } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import type { ConsolidationCompany } from '@/types/consolidation';
// L14 B类：文件内同构重复布局等价抽常量，值逐字不变，视觉零差异
const styles: Record<string, CSSProperties> = {
  iconRow: { display: 'flex', alignItems: 'center', gap: 8 },
  centerEmpty: { textAlign: 'center', padding: 16, color: 'text.secondary' },
};

// Helper to convert tailwind color class to sx
const getChipSx = (colorClass: string): object => {
  const colorMap: Record<string, { backgroundColor: string; color: string }> = {
    'bg-green-100 text-green-800': {
      backgroundColor: 'success.50',
      color: 'success.700',
    },
    'bg-gray-100 text-gray-800': {
      backgroundColor: 'grey.100',
      color: 'grey.700',
    },
    'bg-yellow-100 text-yellow-800': {
      backgroundColor: 'warning.100',
      color: 'warning.800',
    },
    'bg-blue-100 text-blue-800': {
      backgroundColor: 'primary.100',
      color: 'primary.700',
    },
    'bg-purple-100 text-purple-800': {
      backgroundColor: 'secondary.50',
      color: 'secondary.700',
    },
    'bg-teal-100 text-teal-800': {
      backgroundColor: 'info.50',
      color: 'info.700',
    },
    'bg-orange-100 text-orange-800': {
      backgroundColor: 'warning.50',
      color: 'warning.700',
    },
  };
  return colorMap[colorClass] || { backgroundColor: 'grey.100', color: 'grey.700' };
};

interface ConsolidationCompanyTableProps {
  companies: ConsolidationCompany[] | undefined;
  loading: boolean;
  onRemoveCompany: (companyId: string) => void;
}

export function ConsolidationCompanyTable({
  companies,
  loading,
  onRemoveCompany,
}: ConsolidationCompanyTableProps) {
  const { t } = useTranslation();

  // Control type configuration
  const CONTROL_TYPE_CONFIG = {
    full_control: {
      label: t('finance.consolidation_scope_page.control_full'),
      color: 'bg-blue-100 text-blue-800',
    },
    joint_venture: {
      label: t('finance.consolidation_scope_page.control_joint_venture'),
      color: 'bg-purple-100 text-purple-800',
    },
    associate: {
      label: t('finance.consolidation_scope_page.control_associate'),
      color: 'bg-orange-100 text-orange-800',
    },
  };

  const companyColumns: ColumnDef<ConsolidationCompany>[] = [
    {
      id: 'company_code',
      header: t('finance.consolidation_scope_page.code_1'),
      accessorKey: 'company_code',
      cell: ({ row }) => (
        <div style={styles.iconRow}>
          <Building2 sx={{ width: 16, height: 16, color: 'text.disabled' }} />
          <span className={css.il1}>{row.getValue('company_code')}</span>
        </div>
      ),
    },
    {
      id: 'company_name',
      header: t('finance.consolidation_scope_page.name_1'),
      accessorKey: 'company_name',
      cell: ({ row }) => (
        <div style={styles.iconRow}>
          <span className={css.il2}>{row.getValue('company_name')}</span>
          {row.original.is_parent && (
            <Chip
              size='small'
              sx={{ backgroundColor: 'primary.100', color: 'primary.800' }}
              label={t('finance.consolidation_scope_page.chip_parent_company')}
            />
          )}
        </div>
      ),
    },
    {
      id: 'control_type',
      header: t('finance.consolidation_scope_page.type'),
      accessorKey: 'control_type',
      cell: ({ row }) => {
        const controlType = row.getValue<string>('control_type');
        const config = CONTROL_TYPE_CONFIG[controlType as keyof typeof CONTROL_TYPE_CONFIG] || {
          label: controlType,
          color: 'bg-gray-100 text-gray-800',
        };
        return (
          <Chip
            size='small'
            sx={getChipSx(config.color)}
            label={config.label}
          />
        );
      },
    },
    {
      id: 'ownership_percentage',
      header: t('finance.consolidation_scope_page.col_ownership_percentage'),
      accessorKey: 'ownership_percentage',
      cell: ({ row }) => <span className={css.il3}>{row.getValue('ownership_percentage')}%</span>,
    },
    {
      id: 'consolidation_percentage',
      header: t('finance.consolidation_scope_page.col_consolidation_percentage'),
      accessorKey: 'consolidation_percentage',
      cell: ({ row }) => (
        <span className={css.il4}>{row.getValue('consolidation_percentage')}%</span>
      ),
    },
    {
      id: 'minority_interest',
      header: t('finance.consolidation_scope_page.col_minority_interest'),
      accessorKey: 'minority_interest',
      cell: ({ row }) => (
        <span className={css.il5}>
          ¥
          {row.original.minority_interest.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('finance.consolidation_scope_page.action'),
      cell: ({ row }) => (
        <Button
          variant='text'
          size='small'
          onClick={() => onRemoveCompany(row.original.id)}
          disabled={row.original.is_parent}
        >
          <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
        </Button>
      ),
    },
  ];

  if (loading) {
    return <div style={styles.centerEmpty}>{t('finance.consolidation_scope_page.loading')}</div>;
  }

  if (!companies || companies.length === 0) {
    return (
      <div style={styles.centerEmpty}>{t('finance.consolidation_scope_page.no_companies')}</div>
    );
  }

  return (
    <DataTable
      columns={companyColumns}
      data={companies}
    />
  );
}
