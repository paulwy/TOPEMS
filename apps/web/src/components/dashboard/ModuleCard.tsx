import React, { useState } from "react";
import type { ModuleStatus } from "./StatusBadge";
import { StatusBadge } from "./StatusBadge";

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

export interface ModuleItem {
  title: string;
  icon: IconComponent;
  description: string;
  path: string;
  color: string;
  status: ModuleStatus;
  permission?: string | null;
  module?: string | null;
  adminOnly?: boolean;
}

interface ModuleCardProps {
  item: ModuleItem;
  onClick: () => void;
  size?: "large" | "medium" | "small";
  isDarkMode?: boolean;
}

const colorToGradient: Record<string, string> = {
  "bg-blue-500": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  "bg-purple-500": "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "bg-green-500": "linear-gradient(135deg, #22c55e, #16a34a)",
  "bg-emerald-500": "linear-gradient(135deg, #10b981, #059669)",
  "bg-rose-500": "linear-gradient(135deg, #f43f5e, #e11d48)",
  "bg-slate-600": "linear-gradient(135deg, #64748b, #475569)",
  "bg-violet-500": "linear-gradient(135deg, #a855f7, #9333ea)",
  "bg-amber-500": "linear-gradient(135deg, #f59e0b, #ca8a04)",
  "bg-teal-500": "linear-gradient(135deg, #14b8a6, #0d9488)",
  "bg-yellow-500": "linear-gradient(135deg, #eab308, #ca8a04)",
  "bg-indigo-500": "linear-gradient(135deg, #6366f1, #4f46e5)",
  "bg-cyan-500": "linear-gradient(135deg, #06b6d4, #0891b2)",
  "bg-orange-500": "linear-gradient(135deg, #f97316, #ea580c)",
  "bg-red-500": "linear-gradient(135deg, #ef4444, #dc2626)",
  "bg-sky-500": "linear-gradient(135deg, #0ea5e9, #0284c7)",
  "bg-pink-500": "linear-gradient(135deg, #ec4899, #db2777)",
};

export const ModuleCard: React.FC<ModuleCardProps> = ({
  item,
  onClick,
  size = "medium",
  isDarkMode = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  const sizeStyles = {
    large: { padding: "20px", iconSize: 56, titleSize: 18, descSize: 14 },
    medium: { padding: "16px", iconSize: 48, titleSize: 16, descSize: 12 },
    small: { padding: "12px", iconSize: 40, titleSize: 14, descSize: 11 },
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: "12px",
        padding: currentSize.padding,
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered
          ? isDarkMode
            ? "0 20px 40px rgba(0, 0, 0, 0.4)"
            : "0 20px 40px rgba(0, 0, 0, 0.1)"
          : isDarkMode
            ? "0 4px 6px rgba(0, 0, 0, 0.3)"
            : "0 4px 6px rgba(0, 0, 0, 0.1)",
        border: isDarkMode
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <div
          style={{
            width: currentSize.iconSize,
            height: currentSize.iconSize,
            borderRadius: "14px",
            background:
              colorToGradient[item.color] || colorToGradient["bg-blue-500"],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.3s ease",
            transform: isHovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          <Icon
            style={{
              width: currentSize.iconSize * 0.55,
              height: currentSize.iconSize * 0.55,
              color: "#ffffff",
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <h3
              style={{
                fontSize: currentSize.titleSize,
                fontWeight: 600,
                color: isDarkMode ? "#f1f5f9" : "#1e293b",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </h3>
            <StatusBadge status={item.status} />
          </div>
          <p
            style={{
              fontSize: currentSize.descSize,
              color: isDarkMode ? "#94a3b8" : "#64748b",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
};
