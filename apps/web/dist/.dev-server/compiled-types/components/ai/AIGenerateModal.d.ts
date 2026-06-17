export interface AIGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    isLoading?: boolean;
    onConfirm?: (_e?: React.MouseEvent) => void;
    confirmText?: string;
    cancelText?: string;
    extraActions?: React.ReactNode;
}
export declare function AIGenerateModal({ isOpen, onClose, title, description, children, isLoading, onConfirm, confirmText, cancelText, extraActions, }: AIGenerateModalProps): import("react").JSX.Element;
