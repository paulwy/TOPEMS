import React from "react";
interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileId: string;
    fileName: string;
    contentType: string;
}
export declare const DocumentPreviewModal: React.FC<DocumentPreviewModalProps>;
export {};
