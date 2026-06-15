import React, { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Box, Typography } from "@mui/material";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = "#3B82F6",
  width = 80,
  height = 32,
  strokeWidth = 2,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y =
      height -
      ((value - min) / range) * (height - strokeWidth * 2) -
      strokeWidth;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient
          id={`gradient-${color.replace("#", "")}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#gradient-${color.replace("#", "")})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill={color}
      />
    </svg>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  suffix?: string;
  change?: number;
  icon?: LucideIcon | React.ReactNode;
  color?: string;
  gradient?: [string, string];
  trend?: "up" | "down" | "stable" | "neutral" | null;
  sparklineData?: number[];
  animate?: boolean;
}

const colorMap: Record<string, { bg: string; gradient: string }> = {
  green: { bg: "#10B981", gradient: "linear-gradient(135deg, #10B981, #059669)" },
  purple: { bg: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)" },
  blue: { bg: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6, #2563EB)" },
  orange: { bg: "#F59E0B", gradient: "linear-gradient(135deg, #F59E0B, #D97706)" },
  red: { bg: "#EF4444", gradient: "linear-gradient(135deg, #EF4444, #DC2626)" },
  cyan: { bg: "#06B6D4", gradient: "linear-gradient(135deg, #06B6D4, #0891B2)" },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  unit = "",
  suffix,
  change,
  icon,
  color = "blue",
  gradient,
  trend,
  sparklineData,
  animate = true,
}) => {
  const [displayValue, setDisplayValue] = useState(
    animate && typeof value === "number" ? 0 : value,
  );
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || typeof value !== "number") {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const startValue = 0;
    const endValue = value as number;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(endValue);
        clearInterval(timer);
      } else {
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(
          Math.round(startValue + (endValue - startValue) * eased),
        );
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  const getTrendIcon = () => {
    if (!trend || trend === "neutral" || trend === "stable") {
      return <Minus sx={{ width: 16, height: 16, color: "#94A3B8" }} />;
    }
    return trend === "up" ? (
      <TrendingUp sx={{ width: 16, height: 16 }} />
    ) : (
      <TrendingDown sx={{ width: 16, height: 16 }} />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === "neutral" || trend === "stable") return "#64748B";
    return trend === "up" ? "#10B981" : "#EF4444";
  };

  const renderIcon = () => {
    if (!icon) {
      return <Activity sx={{ width: 24, height: 24, color: "white" }} />;
    }
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<{ sx?: object }>, {
        sx: { width: 24, height: 24, color: "white" },
      });
    }
    const IconComponent = icon as LucideIcon;
    return <IconComponent sx={{ width: 24, height: 24, color: "white" }} />;
  };

  const getIconGradient = () => {
    if (gradient) {
      return `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`;
    }
    const colorInfo = colorMap[color];
    return colorInfo ? colorInfo.gradient : colorMap.blue.gradient;
  };

  const getSparklineColor = () => {
    if (!trend || trend === "neutral" || trend === "stable") return "#64748B";
    return trend === "up" ? "#10B981" : "#EF4444";
  };

  return (
    <Box
      ref={cardRef}
      sx={{
        position: "relative",
        backgroundColor: "white",
        borderRadius: 2,
        padding: 3,
        border: "1px solid rgba(226, 232, 240, 0.6)",
        overflow: "hidden",
        transition: "all 0.3s ease-out",
        boxShadow: isHovered ? "0 10px 40px rgba(0, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
        transform: isHovered ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 128,
          height: 128,
          opacity: 0.05,
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: getIconGradient(),
            borderRadius: "50%",
            filter: "blur(40px)",
            transform: "translateX(32px) translateY(-32px)",
          }}
        />
      </Box>

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom right, rgba(241, 245, 249, 1), transparent)",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 10 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500, marginBottom: 0.5, letterSpacing: "0.05em" }}>
              {title}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: "bold", color: "#1E293B" }}>
                {typeof displayValue === "number"
                  ? displayValue.toLocaleString()
                  : displayValue}
              </Typography>
              {unit && (
                <Typography variant="body1" sx={{ color: "#64748B", fontWeight: 500 }}>
                  {unit}
                </Typography>
              )}
              {suffix && (
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                  {suffix}
                </Typography>
              )}
            </Box>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "#94A3B8", marginTop: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.3s",
              transform: isHovered ? "scale(1.1) rotate(3deg)" : "scale(1)",
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: getIconGradient(),
              }}
            >
              {renderIcon()}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {getTrendIcon()}
            <Typography variant="body2" sx={{ fontWeight: 600, color: getTrendColor() }}>
              {change !== undefined ? `${change > 0 ? "+" : ""}${change}%` : ""}
            </Typography>
            {trend && trend !== "neutral" && trend !== "stable" && (
              <Typography variant="caption" sx={{ color: "#94A3B8", marginLeft: 0.5 }}>
                vs last period
              </Typography>
            )}
          </Box>

          {sparklineData && sparklineData.length > 0 && (
            <Box
              sx={{
                transition: "transform 0.5s",
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Sparkline
                data={sparklineData}
                color={getSparklineColor()}
                width={80}
                height={32}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MetricCard;