import React from "react";
import type { ModuleStatus } from "./StatusBadge";
import { StatusBadge } from "./StatusBadge";

type IconComponent = React.ComponentType<{ className?: string }>;

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
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  item,
  onClick,
  size = "medium",
}) => {
  const Icon = item.icon;

  const sizeClasses = {
    large: "p-6",
    medium: "p-6",
    small: "p-4",
  };

  const iconSizeClasses = {
    large: "w-14 h-14",
    medium: "w-12 h-12",
    small: "w-10 h-10",
  };

  const titleSizeClasses = {
    large: "text-xl",
    medium: "text-lg",
    small: "text-base",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group ${size === "small" ? "opacity-75 hover:opacity-100" : ""}`}
    >
      <div className={sizeClasses[size]}>
        <div className="flex items-start justify-between mb-4">
          <div
            className={`${iconSizeClasses[size]} ${item.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
          >
            <Icon
              className={`${size === "large" ? "w-7 h-7" : size === "medium" ? "w-6 h-6" : "w-5 h-5"} text-white`}
            />
          </div>
          <StatusBadge status={item.status} />
        </div>
        <h4
          className={`${titleSizeClasses[size]} font-semibold text-slate-900 mb-2`}
        >
          {item.title}
        </h4>
        <p className="text-slate-600 text-sm">{item.description}</p>
        {size === "large" && (
          <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 mt-4">
            立即体验 →
          </div>
        )}
      </div>
    </div>
  );
};
