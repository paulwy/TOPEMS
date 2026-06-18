import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ModuleStatsCardProps {
  title?: string;
  total?: number;
  active?: number;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export const ModuleStatsCard: React.FC<ModuleStatsCardProps> = ({
  title = "系统状态",
  total = 8,
  active = 8,
  icon: Icon = CheckCircle2,
  iconBgColor = "#dcfce7",
  iconColor = "#22c55e",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-[#1e293b] rounded-2xl p-5 transition-all duration-400 ease-out cursor-pointer group border border-white/5 ${
        isHovered ? "shadow-xl scale-[1.02] border-white/10" : "shadow-lg"
      }`}
    >
      <div
        className="absolute top-0 left-0 w-full h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${iconColor}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center transition-all duration-400`}
            style={{
              transform: isHovered ? "scale(1.15)" : "scale(1)",
            }}
          >
            <Icon size={24} color={iconColor} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{total}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full transition-all duration-300"
          style={{
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        >
          <CheckCircle2 size={14} color="#4ade80" />
          <span className="text-sm font-semibold text-green-400">
            {active} 活跃
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(active / total) * 100}%`,
              background: `linear-gradient(90deg, ${iconColor}, ${iconColor}80)`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          活跃率 {(active / total) * 100}%
        </p>
      </div>

      <div
        className="absolute bottom-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{
          background: iconColor,
          borderRadius: "50%",
          filter: "blur(30px)",
          transform: "translate(10px, 10px)",
        }}
      />
    </div>
  );
};
