"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  DialogContentText,
  Button,
  Box,
} from "@mui/material";

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (_open: boolean) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  open = false,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  children,
}) => {
  const handleClose = () => {
    onOpenChange?.(false);
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      {title && (
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>
          {title}
        </DialogTitle>
      )}
      <DialogContent>
        {description && (
          <DialogContentText sx={{ color: "text.secondary" }}>
            {description}
          </DialogContentText>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} variant="contained">
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { AlertDialog };
