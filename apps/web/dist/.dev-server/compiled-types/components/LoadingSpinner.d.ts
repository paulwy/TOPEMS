import React from "react";
interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}
export declare const LoadingSpinner: React.FC<LoadingSpinnerProps>;
interface LoadingOverlayProps {
    isLoading: boolean;
    children: React.ReactNode;
    message?: string;
}
export declare const LoadingOverlay: React.FC<LoadingOverlayProps>;
export declare const SkeletonLoader: React.FC<{
    className?: string;
}>;
export default LoadingSpinner;
