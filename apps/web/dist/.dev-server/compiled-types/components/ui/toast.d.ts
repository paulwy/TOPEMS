import * as React from "react";
type ToastProps = {
    id: string;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    variant?: "default" | "destructive" | "success" | "warning";
};
declare const Toast: React.ForwardRefExoticComponent<ToastProps & React.RefAttributes<unknown>>;
type ToastActionElement = React.ReactElement;
export { type ToastProps, type ToastActionElement, Toast };
