import React from 'react';
import { ConfirmDialog } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
  const { t } = useTranslation();
  return (
    <>
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title={i18n.t('finance.finance_voucher_page_components__confirm_dialogs.confirm_delete')}
        message={i18n.t('finance.finance_voucher_page_components__confirm_dialogs.confirm')}
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={onCloseBatchDelete}
        onConfirm={onConfirmBatchDelete}
        title={t('finance.finance_voucher_page_components__confirm_dialogs.batch_delete')}
        message={`确定要删除选中的 ${selectedIds.length} 张凭证吗？`}
        danger
      />
    </>
  );
};

export default ConfirmDialogs;
