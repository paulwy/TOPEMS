import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, Chip, Button } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { Network, Settings, Trash2, Building2 } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import type { ConsolidationScope, ConsolidationCompany } from '@/types/consolidation';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

// L14 B类：文件内同构重复布局等价抽常量，值逐字不变，视觉零差异
const styles: Record<string, CSSProperties> = {
  iconRow: { display: 'flex', alignItems: 'center', gap: 8 },
  centerEmpty: { textAlign: 'center', padding: 16, color: 'text.secondary' },
};

// Helper to convert tailwind color class to sx
const getChipSx = (colorClass: string): object => {
  const colorMap: Record<string, { backgroundColor: string; color: string }> = {
    'bg-green-100 text-green-800': {
      backgroundColor: 'success.lighter',
      color: ct.success[800],
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
      color: 'primary.800',
    },
    'bg-purple-100 text-purple-800': {
      backgroundColor: 'secondary.light',
      color: ct.purple[700],
    },
    'bg-teal-100 text-teal-800': {
      backgroundColor: ct.teal[100],
      color: ct.teal[800],
    },
    'bg-orange-100 text-orange-800': {
      backgroundColor: ct.orange[100],
      color: ct.orange[800],
    },
  };
  return colorMap[colorClass] || { backgroundColor: 'grey.100', color: 'grey.700' };
};

interface ConsolidationScopeTableProps {
  scopes: ConsolidationScope[] | undefined;
  loading: boolean;
  onSelectScope: (scope: ConsolidationScope) => void;
  onDeleteScope: (scopeId: string) => void;
  onRuleConfig: () => void;
}

export function ConsolidationScopeTable({
  scopes,
  loading,
  onSelectScope,
  onDeleteScope,
  onRuleConfig,
}: ConsolidationScopeTableProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Status configuration
  const STATUS_CONFIG = {
    active: {
      label: t('finance.consolidation_scope_page.active'),
      color: 'bg-green-100 text-green-800',
    },
    inactive: {
      label: t('finance.consolidation_scope_page.inactive'),
      color: 'bg-gray-100 text-gray-800',
    },
    draft: {
      label: t('finance.consolidation_scope_page.status_draft'),
      color: 'bg-yellow-100 text-yellow-800',
    },
  };

  // Consolidation method configuration
  const METHOD_CONFIG = {
    full: {
      label: t('finance.consolidation_scope_page.method_full'),
      color: 'bg-blue-100 text-blue-800',
    },
    equity: {
      label: t('finance.consolidation_scope_page.method_equity'),
      color: 'bg-purple-100 text-purple-800',
    },
    proportional: {
      label: t('finance.consolidation_scope_page.method_proportional'),
      color: 'bg-teal-100 text-teal-800',
    },
  };

  const scopeColumns: ColumnDef<ConsolidationScope>[] = [
    {
      id: 'code',
      header: t('finance.consolidation_scope_page.code'),
      accessorKey: 'code',
      cell: ({ row }) => (
        <div style={styles.iconRow}>
          <Network sx={{ width: 16, height: 16, color: 'primary.dark' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{row.getValue('code')}</span>
        </div>
      ),
    },
    {
      id: 'name',
      header: t('finance.consolidation_scope_page.name'),
      accessorKey: 'name',
      cell: ({ row }) => <div style={{ fontWeight: 500 }}>{row.getValue('name')}</div>,
    },
    {
      id: 'consolidation_method',
      header: t('finance.consolidation_scope_page.col_consolidation_method'),
      accessorKey: 'consolidation_method',
      cell: ({ row }) => {
        const method = row.getValue<string>('consolidation_method');
        const config = METHOD_CONFIG[method as keyof typeof METHOD_CONFIG] || {
          label: method,
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
      id: 'description',
      header: t('finance.consolidation_scope_page.description'),
      accessorKey: 'description',
      cell: ({ row }) => (
        <span style={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          {row.getValue('description') || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('finance.consolidation_scope_page.status'),
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.getValue<string>('status');
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
          label: status,
          color: 'bg-gray-100 text-gray-800',
        };
        return (
          <div style={styles.iconRow}>
            <Chip
              size='small'
              sx={{ backgroundColor: 'grey.100', color: 'grey.700' }}
              label={config.label}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('finance.consolidation_scope_page.action'),
      cell: ({ row }) => (
        <div style={styles.iconRow}>
          <Button
            variant='text'
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              onRuleConfig();
            }}
            startIcon={<Settings sx={{ width: 16, height: 16 }} />}
          >
            {t('finance.consolidation_scope_page.action_rule')}
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              onDeleteScope(row.original.id);
            }}
          >
            <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={styles.centerEmpty}>
        {t('finance.consolidation_scope_page.loading')}
      </div>
    );
  }

  if (!scopes || scopes.length === 0) {
    return (
      <div style={styles.centerEmpty}>
        {t('finance.consolidation_scope_page.no_scopes')}
      </div>
    );
  }

  return (
    <DataTable
      columns={scopeColumns}
      data={scopes}
      onRowClick={onSelectScope}
    />
  );
}

// Company table component
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
          <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
            {row.getValue('company_code')}
          </span>
        </div>
      ),
    },
    {
      id: 'company_name',
      header: t('finance.consolidation_scope_page.name_1'),
      accessorKey: 'company_name',
      cell: ({ row }) => (
        <div style={styles.iconRow}>
          <span style={{ fontWeight: 500 }}>{row.getValue('company_name')}</span>
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
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('ownership_percentage')}%</span>
      ),
    },
    {
      id: 'consolidation_percentage',
      header: t('finance.consolidation_scope_page.col_consolidation_percentage'),
      accessorKey: 'consolidation_percentage',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('consolidation_percentage')}%</span>
      ),
    },
    {
      id: 'minority_interest',
      header: t('finance.consolidation_scope_page.col_minority_interest'),
      accessorKey: 'minority_interest',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace', textAlign: 'right' }}>
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
    return (
      <div style={styles.centerEmpty}>
        {t('finance.consolidation_scope_page.loading')}
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div style={styles.centerEmpty}>
        {t('finance.consolidation_scope_page.no_companies')}
      </div>
    );
  }

  return (
    <DataTable
      columns={companyColumns}
      data={companies}
    />
  );
}
