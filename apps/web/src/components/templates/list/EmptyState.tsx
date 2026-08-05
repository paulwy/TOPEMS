import React from 'react';
import { TableCell, TableRow, Skeleton } from '@mui/material';
import { EmptyState, ErrorEmptyState } from '@topems/shared-components';
import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

export interface ListEmptyStateProps {
  colSpan: number;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyActionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  onRefresh?: () => void;
  // // YesNo展示Select/行号/展开等列
  selectable?: boolean;
  showRowNumber?: boolean;
  expandable?: boolean | ((row: Record<string, unknown>, index: number) => React.ReactNode);
  hasRowActions?: boolean;
  columnConfigurable?: boolean;
  visibleColumnCount: number;
  // // 渲染列的 Skeleton 占位
  renderColumnsSkeleton?: () => React.ReactNode;
}

/**
 * 列表空状态/加载/错误渲染
 * 从 ListPageTemplate 中抽离的空状态渲染逻辑
 */
export const ListEmptyState: React.FC<ListEmptyStateProps> = ({
  colSpan,
  loading,
  error,
  emptyMessage = t('components.components.emptystate.key_21efd8'),
  emptyIcon,
  emptyActionButton,
  onRefresh,
  selectable,
  showRowNumber,
  expandable,
  hasRowActions,
  columnConfigurable,
  visibleColumnCount,
  renderColumnsSkeleton,
}) => {
  if (loading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            {selectable && (
              <TableCell padding='checkbox'>
                <Skeleton
                  variant='rectangular'
                  width={20}
                  height={20}
                />
              </TableCell>
            )}
            {showRowNumber && (
              <TableCell>
                <Skeleton
                  variant='text'
                  width={30}
                />
              </TableCell>
            )}
            {expandable && (
              <TableCell padding='checkbox'>
                <Skeleton
                  variant='rectangular'
                  width={20}
                  height={20}
                />
              </TableCell>
            )}
            {renderColumnsSkeleton
              ? renderColumnsSkeleton()
              : Array.from({ length: visibleColumnCount }).map((_, i) => (
                  <TableCell key={i}>
                    <Skeleton
                      variant='text'
                      width='80%'
                    />
                  </TableCell>
                ))}
            {hasRowActions && (
              <TableCell>
                <Skeleton
                  variant='text'
                  width={60}
                />
              </TableCell>
            )}
            {columnConfigurable && <TableCell />}
          </TableRow>
        ))}
      </>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          align='center'
          sx={{ py: 8 }}
        >
          <ErrorEmptyState
            error={error}
            onRetry={onRefresh}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        align='center'
        sx={{ py: 8 }}
      >
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
          description={t('components.components.emptystate.key_828a9f')}
          action={
            emptyActionButton
              ? { label: emptyActionButton.label, onClick: emptyActionButton.onClick }
              : undefined
          }
        />
      </TableCell>
    </TableRow>
  );
};
