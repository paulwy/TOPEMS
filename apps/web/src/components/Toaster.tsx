"use client";

import * as React from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  onClose: () => void;
}

const Toast = ({ id: _, title, message, type, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // 自动关闭
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成后再移除
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <CheckCircle2 sx={{ height: 20, width: 20, color: "#22c55e" }} />
        );
      case "error":
        return <AlertCircle sx={{ height: 20, width: 20, color: "#ef4444" }} />;
      case "warning":
        return (
          <AlertTriangle sx={{ height: 20, width: 20, color: "#eab308" }} />
        );
      case "info":
      default:
        return <Info sx={{ height: 20, width: 20, color: "#3b82f6" }} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" };
      case "error":
        return { backgroundColor: "#fef2f2", borderColor: "#fecaca" };
      case "warning":
        return { backgroundColor: "#fefce8", borderColor: "#fef08a" };
      case "info":
      default:
        return { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" };
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "8px",
        border: "1px solid",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
        animation: "slideIn 0.3s ease",
        ...getBgColor(),
      }}
    >
      {getIcon()}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, color: "#111827" }}>{title}</p>
        {message && (
          <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
            {message}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          color: "#9ca3af",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          transition: "color 0.2s",
        }}
      >
        <X sx={{ height: 16, width: 16 }} />
      </button>
    </div>
  );
};

export function Toaster() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "384px",
        width: "100%",
      }}
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
