import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { alpha } from '@mui/material/styles';

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

  const bgColor = isDark
    ? alpha(theme.palette.grey[900], 0.95)
    : alpha(theme.palette.common.white, 0.95);
  const borderColor = isDark ? 'colors.grey.600' : designTokens.colors.border.default;
  const labelColor = isDark ? designTokens.colors.grey['400'] : 'colors.grey.500';
  const labelBorder = isDark ? designTokens.colors.grey[700] : designTokens.colors.border.default;
  const nameColor = isDark ? designTokens.colors.grey['300'] : 'colors.grey.600';
  const valueColor = isDark ? 'colors.grey.100' : 'colors.grey.800';

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
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
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
                <Typography
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: nameColor,
                  }}
                >
                  {displayName}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
