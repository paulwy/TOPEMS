import React from "react";
export interface LoadingStateProps {
    type?: "skeleton" | "progress" | "spinner" | "fullscreen";
    message?: string;
    variant?: "table" | "card" | "detail" | "list" | "form";
    rows?: number;
    progress?: number;
    children?: React.ReactNode;
}
export declare const LoadingState: React.FC<LoadingStateProps>;
export declare const InlineLoading: React.FC<{
    message?: string;
}>;
export declare const ButtonLoading: React.FC<{
    label: string;
    loading?: boolean;
}>;
export default LoadingState;
