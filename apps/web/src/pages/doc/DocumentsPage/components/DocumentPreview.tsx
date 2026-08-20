import React from 'react';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';

interface DocumentPreviewProps {
  previewFile: {
    id: string;
    name: string;
    contentType: string;
  } | null;
  onClose: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ previewFile, onClose }) => {
  return (
    <DocumentPreviewModal
      isOpen={previewFile !== null}
      onClose={onClose}
      fileId={previewFile?.id || ''}
      fileName={previewFile?.name || ''}
      contentType={previewFile?.contentType || ''}
    />
  );
};

export default DocumentPreview;
