import React from "react";
interface EmptyStateProps {
    icon?: "file" | "folder" | "search" | "inbox";
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}
export declare const EmptyState: React.FC<EmptyStateProps>;
interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}
export declare const ErrorState: React.FC<ErrorStateProps>;
export default EmptyState;
