export interface AIDocumentGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    initialTemplateId?: string;
    onDocumentGenerated: (_document: string) => void;
}
export declare function AIDocumentGenerator({ isOpen, onClose, initialTemplateId, onDocumentGenerated, }: AIDocumentGeneratorProps): import("react").JSX.Element;
