import type { ReactNode } from "react";
import React from "react";
interface LoadingContextType {
    isLoading: boolean;
    message: string;
    startLoading: (_message?: string) => void;
    stopLoading: () => void;
}
export declare const useLoading: () => LoadingContextType;
interface LoadingProviderProps {
    children: ReactNode;
}
export declare const LoadingProvider: React.FC<LoadingProviderProps>;
export default LoadingProvider;
