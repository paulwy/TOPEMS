import { ConfirmDialog } from '@topems/shared-components';

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
  return (
    <>
      <ConfirmDialog
        isOpen={deleteEmailDialogOpen}
        onClose={() => {
          setDeleteEmailDialogOpen(false);
          setDeletingEmailId(null);
        }}
        onConfirm={handleDeleteEmail}
        title='确认删除'
        message='确定要删除这个邮件记录吗？'
        danger
      />

      <ConfirmDialog
        isOpen={resendEmailDialogOpen}
        onClose={() => {
          setResendEmailDialogOpen(false);
          setResendingEmailId(null);
        }}
        onConfirm={handleResendEmail}
        title='确认重发'
        message='确定要重新发送这封邮件吗？'
        type='warning'
        confirmLabel='重发'
        cancelLabel='取消'
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDeleteEmails}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedEmails.length} 条邮件记录吗？`}
        danger
      />

      <ConfirmDialog
        isOpen={batchResendDialogOpen}
        onClose={() => setBatchResendDialogOpen(false)}
        onConfirm={handleBatchResendEmails}
        title='确认批量重发'
        message={`确定要重新发送选中的 ${selectedEmails.length} 条邮件吗？`}
        type='warning'
        confirmLabel='批量重发'
        cancelLabel='取消'
      />

      <ConfirmDialog
        isOpen={deleteTemplateDialogOpen}
        onClose={() => {
          setDeleteTemplateDialogOpen(false);
          setDeletingTemplateId(null);
        }}
        onConfirm={handleDeleteTemplate}
        title='确认删除'
        message='确定要删除这个模板吗？'
        danger
      />
    </>
  );
};

export default ConfirmDialogs;
