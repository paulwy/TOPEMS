import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!active || !payload || payload.length === 0) return null;

  const bgColor = isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const borderColor = isDark ? '#475569' : designTokens.colors.border.default;
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const labelBorder = isDark ? '#334155' : designTokens.colors.border.default;
  const nameColor = isDark ? '#CBD5E1' : '#475569';
  const valueColor = isDark ? '#F1F5F9' : '#1E293B';

  return (
    <Box
      sx={{
        backgroundColor: bgColor,
        backdropFilter: 'blur(4px)',
        border: `1px solid ${borderColor}`,
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
            fontSize: '0.75rem',
            fontWeight: 500,
            color: labelColor,
            mb: 2,
            pb: 2,
            borderBottom: `1px solid ${labelBorder}`,
          }}
        >
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value, entry.name)
            : [
                typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value,
                entry.name,
              ];

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: entry.color,
                  }}
                />
                <Typography sx={{ fontSize: '0.875rem', color: nameColor }}>
                  {displayName}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: valueColor,
                }}
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
