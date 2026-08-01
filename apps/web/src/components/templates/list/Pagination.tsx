import React from 'react';
import { TablePagination } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * 列表分页组件
 * 从 ListPageTemplate 中抽离的分页渲染逻辑
 */
export const ListPagination: React.FC<ListPaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation();
  return (
    <TablePagination
      component='div'
      count={total}
      page={page}
      onPageChange={(_, p) => onPageChange(p)}
      rowsPerPage={pageSize}
      onRowsPerPageChange={(e) => onPageSizeChange?.(Number(e.target.value))}
      rowsPerPageOptions={[10, 20, 50, 100]}
      labelRowsPerPage={t('components.components.pagination.key_b6960b')}
      labelDisplayedRows={({ from, to, count }) =>
        `${from}-${to} 共 ${count}${t('components.components.pagination.key_27cab0')}`
      }
    />
  );
};
