import React from 'react';
import { Typography, Box } from '@mui/material';
import { Check, Trash2 } from 'lucide-react';
import { ActionButton, StatusBadge, StatCardGroup } from '@/components';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import type { FinancialVoucher } from '@/api/erp';

interface VoucherListPanelProps {
  voucherStatCards: any[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBatchAudit: () => void;
  onBatchDelete: () => void;
  voucherColumns: ColumnDef<FinancialVoucher>[];
  filteredVouchers: FinancialVoucher[];
  loading: boolean;
  voucherFilters: FilterConfig[];
  filtersValue: Record<string, unknown>;
  onFilterChange: (filters: Record<string, unknown>) => void;
  onSearch: () => void;
  onReset: () => void;
  voucherRowActions: RowAction<FinancialVoucher>[];
}

const VoucherListPanel: React.FC<VoucherListPanelProps> = ({
  voucherStatCards,
  selectedIds,
  onSelectionChange,
  onBatchAudit,
  onBatchDelete,
  voucherColumns,
  filteredVouchers,
  loading,
  voucherFilters,
  filtersValue,
  onFilterChange,
  onSearch,
  onReset,
  voucherRowActions,
}) => {
  return (
    <Box sx={{ display: 'block' }}>
      <StatCardGroup
        stats={voucherStatCards}
        columns={4}
      />

      {selectedIds.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'blue.50',
            px: 2,
            py: 1.5,
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant='body2'
              sx={{ color: 'blue.700' }}
            >
              已选择{' '}
              <StatusBadge
                status='selected'
                label={selectedIds.length.toString()}
                color='primary'
              />
              条记录
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActionButton
              label='批量审核'
              icon={<Check size={16} />}
              variant='secondary'
              size='small'
              onClick={onBatchAudit}
            />
            <ActionButton
              label='批量删除'
              icon={<Trash2 size={16} />}
              variant='secondary'
              size='small'
              onClick={onBatchDelete}
            />
            <ActionButton
              label='取消选择'
              variant='secondary'
              size='small'
              onClick={() => onSelectionChange([])}
            />
          </Box>
        </Box>
      )}

      <ListPageTemplate
        columns={voucherColumns}
        data={filteredVouchers}
        loading={loading}
        searchable
        searchPlaceholder='搜索凭证编号或摘要...'
        filters={voucherFilters}
        filtersValue={filtersValue}
        onFilterChange={onFilterChange}
        onSearch={onSearch}
        actions={[
          { label: '搜索', variant: 'outlined', onClick: onSearch },
          { label: '重置', variant: 'outlined', onClick: onReset },
        ]}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids: (string | number)[]) => onSelectionChange(ids as string[])}
        rowActions={voucherRowActions}
        emptyMessage='暂无凭证数据'
      />
    </Box>
  );
};

export default VoucherListPanel;
