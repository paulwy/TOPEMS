import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useCallback } from "react";
import { Box, Typography, IconButton, Paper } from "@mui/material";

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

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  const getToastColor = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      default:
        return "#3b82f6";
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <Paper
          key={toast.id}
          sx={{
            px: 6,
            py: 3,
            borderRadius: 2,
            boxShadow: 3,
            display: "flex",
            alignItems: "center",
            gap: 3,
            backgroundColor: getToastColor(toast.type),
            color: "white",
            cursor: "pointer",
            animation: "slide-in 0.3s ease-out",
          }}
          onClick={() => onRemove(toast.id)}
        >
          <Typography sx={{ flex: 1 }}>{toast.message}</Typography>
          <IconButton
            size="small"
            sx={{ color: "white", "&:hover": { color: "#e5e7eb" } }}
          >
            ×
          </IconButton>
        </Paper>
      ))}
    </Box>
  );
};

export default ToastProvider;
