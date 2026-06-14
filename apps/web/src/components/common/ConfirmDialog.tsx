import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";

export interface ConfirmDialogConfig {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "secondary" | "success" | "warning" | "error" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  confirmDisabled?: boolean;
}

const sizeMap = {
  sm: "300px",
  md: "400px",
  lg: "600px",
  xl: "800px",
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  confirmColor = "primary",
  size = "md",
  confirmDisabled = false,
}: ConfirmDialogConfig) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? undefined : onClose}
      maxWidth={size === "sm" ? "xs" : size === "md" ? "sm" : size === "lg" ? "md" : "lg"}
      slotProps={{
        paper: {
          sx: { width: sizeMap[size], maxWidth: "100%" },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor === "danger" ? "error" : confirmColor}
          onClick={handleConfirm}
          disabled={confirmDisabled || isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
