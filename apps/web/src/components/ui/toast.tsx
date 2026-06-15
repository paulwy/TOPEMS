"use client";

import * as React from "react";
import { Snackbar, Alert, AlertProps, IconButton } from "@mui/material";
import { X } from "lucide-react";

type ToastProps = {
  id: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
};

const Toast = React.forwardRef<
  React.ComponentRef<typeof Snackbar>,
  ToastProps
>(({ id, open, onOpenChange, title, description, variant = "default", ...props }, ref) => {
  const getSeverity = (): AlertProps["severity"] => {
    switch (variant) {
      case "destructive":
        return "error";
      case "success":
        return "success";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <Snackbar
      ref={ref}
      open={open}
      onClose={() => onOpenChange?.(false)}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      {...props}
    >
      <Alert
        severity={getSeverity()}
        action={
          <IconButton
            size="small"
            onClick={() => onOpenChange?.(false)}
          >
            <X style={{ width: 16, height: 16 }} />
          </IconButton>
        }
        sx={{
          minWidth: 360,
          borderRadius: 1,
        }}
      >
        {title && <strong>{title}</strong>}
        {title && description && " "}
        {description}
      </Alert>
    </Snackbar>
  );
});

Toast.displayName = "Toast";

type ToastActionElement = React.ReactElement;

export { type ToastProps, type ToastActionElement, Toast };