import type { ReactNode } from "react";
import React from "react";
interface Toast {
    id: string;
    type: "success" | "error" | "info" | "warning";
    message: string;
}
interface ToastContextType {
    toasts: Toast[];
    showToast: (type: Toast["type"], message: string) => void;
    removeToast: (_id: string) => void;
}
export declare const useToast: () => ToastContextType;
interface ToastProviderProps {
    children: ReactNode;
}
export declare const ToastProvider: React.FC<ToastProviderProps>;
export default ToastProvider;
