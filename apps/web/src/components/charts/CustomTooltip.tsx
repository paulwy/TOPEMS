import React from "react";
import { Box, Typography } from "@mui/material";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: (value: number | string, name: string) => [string, string];
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <Box
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(4px)",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        boxShadow: 10,
        px: 4,
        py: 3,
        minWidth: 140,
      }}
    >
      {label && (
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "#64748b",
            mb: 2,
            pb: 2,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {label}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value, entry.name)
            : [
                typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value,
                entry.name,
              ];

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 4,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: entry.color,
                  }}
                />
                <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                  {displayName}
                </Typography>
              </Box>
              <Typography
                sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}
              >
                {displayValue}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// Percentage formatter
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Currency formatter (CNY)
export const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString()}`;
};

// Number with unit formatter
export const formatWithUnit = (value: number, unit: string): string => {
  return `${value.toLocaleString()}${unit}`;
};

export default CustomTooltip;
