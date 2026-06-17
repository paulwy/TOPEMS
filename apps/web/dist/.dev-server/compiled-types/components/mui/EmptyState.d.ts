import React from "react";
export interface EmptyStateProps {
    icon?: React.ReactNode;
    emoji?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
    };
    /** @deprecated 请使用 action 对象 */
    actionLabel?: string;
    /** @deprecated 请使用 action.onClick */
    onAction?: () => void;
    align?: "center" | "left";
    compact?: boolean;
    children?: React.ReactNode;
}
export declare const EmptyState: React.FC<EmptyStateProps>;
export declare const ListEmptyState: React.FC<{
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}>;
export declare const SearchEmptyState: React.FC<{
    keyword?: string;
    onClear?: () => void;
}>;
export declare const PermissionEmptyState: React.FC<{
    onRequest?: () => void;
}>;
export interface ErrorEmptyStateProps {
    error?: string;
    onRetry?: () => void;
}
export declare const ErrorEmptyState: React.FC<ErrorEmptyStateProps>;
export default EmptyState;
