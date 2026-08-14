import { ConfirmDialog } from '@topems/shared-components';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface ConfirmDialogsProps {
  deleteEmailDialogOpen: boolean;
  setDeleteEmailDialogOpen: (open: boolean) => void;
  setDeletingEmailId: (id: string | null) => void;
  handleDeleteEmail: () => void;
  resendEmailDialogOpen: boolean;
  setResendEmailDialogOpen: (open: boolean) => void;
  setResendingEmailId: (id: string | null) => void;
  handleResendEmail: () => void;
  batchDeleteDialogOpen: boolean;
  setBatchDeleteDialogOpen: (open: boolean) => void;
  handleBatchDeleteEmails: () => void;
  batchResendDialogOpen: boolean;
  setBatchResendDialogOpen: (open: boolean) => void;
  handleBatchResendEmails: () => void;
  deleteTemplateDialogOpen: boolean;
  setDeleteTemplateDialogOpen: (open: boolean) => void;
  setDeletingTemplateId: (id: string | null) => void;
  handleDeleteTemplate: () => void;
  selectedEmails: string[];
}

const ConfirmDialogs: React.FC<ConfirmDialogsProps> = ({
  deleteEmailDialogOpen,
  setDeleteEmailDialogOpen,
  setDeletingEmailId,
  handleDeleteEmail,
  resendEmailDialogOpen,
  setResendEmailDialogOpen,
  setResendingEmailId,
  handleResendEmail,
  batchDeleteDialogOpen,
  setBatchDeleteDialogOpen,
  handleBatchDeleteEmails,
  batchResendDialogOpen,
  setBatchResendDialogOpen,
  handleBatchResendEmails,
  deleteTemplateDialogOpen,
  setDeleteTemplateDialogOpen,
  setDeletingTemplateId,
  handleDeleteTemplate,
  selectedEmails,
}) => {
  const { t } = useTranslation('im');
  return (
    <>
      <ConfirmDialog
        isOpen={deleteEmailDialogOpen}
        onClose={() => {
          setDeleteEmailDialogOpen(false);
          setDeletingEmailId(null);
        }}
        onConfirm={handleDeleteEmail}
        title={i18n.t('im.confirm_dialogs.k0')}
        message={i18n.t('im.confirm_dialogs.k1')}
        danger
      />

      <ConfirmDialog
        isOpen={resendEmailDialogOpen}
        onClose={() => {
          setResendEmailDialogOpen(false);
          setResendingEmailId(null);
        }}
        onConfirm={handleResendEmail}
        title={t('im.confirm_dialogs.k2')}
        message={t('im.confirm_dialogs.k3')}
        type='warning'
        confirmLabel={t('im.confirm_dialogs.k4')}
        cancelLabel={t('im.confirm_dialogs.k5')}
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDeleteEmails}
        title={t('im.confirm_dialogs.k6')}
        message={`确定要删除选中的 ${selectedEmails.length} 条邮件记录吗？`}
        danger
      />

      <ConfirmDialog
        isOpen={batchResendDialogOpen}
        onClose={() => setBatchResendDialogOpen(false)}
        onConfirm={handleBatchResendEmails}
        title={t('im.confirm_dialogs.k7')}
        message={`确定要重新发送选中的 ${selectedEmails.length} 条邮件吗？`}
        type='warning'
        confirmLabel={t('im.confirm_dialogs.k8')}
        cancelLabel={t('im.confirm_dialogs.k9')}
      />

      <ConfirmDialog
        isOpen={deleteTemplateDialogOpen}
        onClose={() => {
          setDeleteTemplateDialogOpen(false);
          setDeletingTemplateId(null);
        }}
        onConfirm={handleDeleteTemplate}
        title={t('im.confirm_dialogs.k10')}
        message={t('im.confirm_dialogs.k11')}
        danger
      />
    </>
  );
};

export default ConfirmDialogs;
