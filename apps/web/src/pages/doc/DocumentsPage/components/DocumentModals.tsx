import React from 'react';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { ConfirmDialog } from '@topems/shared-components';
import CreateFolderModal from './CreateFolderModal';
import type { PreviewingFile } from '../hooks/useDocumentsPage';

interface ConfirmDialogConfig {
  title?: string;
  message?: string;
  danger?: boolean;
  onConfirm?: () => void;
}

interface DocumentModalsProps {
  showCreateFolderModal: boolean;
  onCloseCreateFolderModal: () => void;
  onCreateFolderSuccess: () => void;
  selectedFolderId: string | null;
  createFolderMutation: any;
  previewingFile: PreviewingFile | null;
  onClosePreview: () => void;
  confirmDialogOpen: boolean;
  confirmDialogConfig: ConfirmDialogConfig | null;
  onCloseConfirm: () => void;
}

const DocumentModals: React.FC<DocumentModalsProps> = ({
  showCreateFolderModal,
  onCloseCreateFolderModal,
  onCreateFolderSuccess,
  selectedFolderId,
  createFolderMutation,
  previewingFile,
  onClosePreview,
  confirmDialogOpen,
  confirmDialogConfig,
  onCloseConfirm,
}) => {
  return (
    <>
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={onCloseCreateFolderModal}
        onSuccess={onCreateFolderSuccess}
        parentId={selectedFolderId}
        createFolderMutation={createFolderMutation}
      />

      <DocumentPreviewModal
        isOpen={previewingFile !== null}
        onClose={onClosePreview}
        fileId={previewingFile?.id || ''}
        fileName={previewingFile?.name || ''}
        contentType={previewingFile?.contentType || ''}
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={onCloseConfirm}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm?.();
          onCloseConfirm();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </>
  );
};

export default DocumentModals;
