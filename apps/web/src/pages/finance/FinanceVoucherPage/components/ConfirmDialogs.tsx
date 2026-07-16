import React from 'react';
import { ConfirmDialog } from '@/components/common';

interface ConfirmDialogsProps {
  deleteDialogOpen: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  batchDeleteDialogOpen: boolean;
  onCloseBatchDelete: () => void;
  onConfirmBatchDelete: () => void;
  selectedIds: string[];
}

const ConfirmDialogs: React.FC<ConfirmDialogsProps> = ({
  deleteDialogOpen,
  onCloseDelete,
  onConfirmDelete,
  batchDeleteDialogOpen,
  onCloseBatchDelete,
  onConfirmBatchDelete,
  selectedIds,
}) => {
  return (
    <>
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title='确认删除'
        message='确定要删除该凭证吗？'
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={onCloseBatchDelete}
        onConfirm={onConfirmBatchDelete}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedIds.length} 张凭证吗？`}
        danger
      />
    </>
  );
};

export default ConfirmDialogs;
