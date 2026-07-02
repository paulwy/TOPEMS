import React from 'react';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Copy, Check } from 'lucide-react';

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  span?: number | 'full';
  copyable?: boolean;
  tooltip?: string;
  loading?: boolean;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  direction?: 'horizontal' | 'vertical';
  labelWidth?: number | string;
  size?: 'sm' | 'md' | 'lg';
  divider?: boolean;
  sx?: SxProps<Theme>;
  gap?: number;
}

const sizeConfig = {
  sm: {
    labelVariant: 'caption' as const,
    valueVariant: 'body2' as const,
    labelColor: 'text.secondary',
    py: 0.75,
  },
  md: {
    labelVariant: 'body2' as const,
    valueVariant: 'body1' as const,
    labelColor: 'text.secondary',
    py: 1,
  },
  lg: {
    labelVariant: 'body1' as const,
    valueVariant: 'h6' as const,
    labelColor: 'text.primary',
    py: 1.5,
  },
};

export const DescriptionList: React.FC<DescriptionListProps> = ({
  items,
  columns = 2,
  direction = 'horizontal',
  labelWidth,
  size = 'md',
  divider = false,
  sx,
  gap = 3,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const config = sizeConfig[size];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const colCount =
    typeof columns === 'number'
      ? isMobile
        ? 1
        : columns
      : columns[theme.breakpoints.down('sm') as keyof typeof columns] || columns.xs || 1;

  if (direction === 'vertical') {
    return (
      <Box sx={sx}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {divider && index > 0 && <Divider sx={{ my: 1 }} />}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: config.py }}>
              <Typography
                variant={config.labelVariant}
                color={config.labelColor}
                sx={{ minWidth: labelWidth || 120, flexShrink: 0 }}
              >
                {item.label}
              </Typography>
              {item.loading ? (
                <Skeleton
                  width={120}
                  height={24}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Tooltip title={item.tooltip || ''}>
                    <Typography
                      variant={config.valueVariant}
                      sx={{ wordBreak: 'break-word' }}
                    >
                      {item.value ?? '-'}
                    </Typography>
                  </Tooltip>
                  {item.copyable && typeof item.value === 'string' && (
                    <IconButton
                      size='small'
                      onClick={() => handleCopy(item.value as string, index)}
                      sx={{ ml: 0.5 }}
                    >
                      {copiedIndex === index ? (
                        <Check
                          size={14}
                          sx={{ color: 'success.main' }}
                        />
                      ) : (
                        <Copy size={14} />
                      )}
                    </IconButton>
                  )}
                </Box>
              )}
            </Box>
          </React.Fragment>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={sx}>
      {items.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'grid',
            gridTemplateColumns:
              item.span === 'full' ? `1fr` : `repeat(${colCount}, minmax(0, 1fr))`,
            gap,
            py: config.py,
            ...(divider && index > 0
              ? { borderTop: 1, borderColor: 'divider', pt: config.py + 0.5 }
              : {}),
          }}
        >
          {Array.from({ length: item.span === 'full' ? 1 : colCount }).map((_, colIndex) => {
            if (colIndex > 0 && item.span === 'full') return null;
            return (
              <Box
                key={colIndex}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: direction === 'horizontal' ? 2 : 0.5,
                }}
              >
                <Typography
                  variant={config.labelVariant}
                  color={config.labelColor}
                  sx={
                    direction === 'horizontal' ? { minWidth: labelWidth || 80, flexShrink: 0 } : {}
                  }
                >
                  {colIndex === 0 ? item.label : ''}
                </Typography>
                {colIndex === 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                    {item.loading ? (
                      <Skeleton
                        width={120}
                        height={24}
                      />
                    ) : (
                      <Tooltip title={item.tooltip || ''}>
                        <Typography
                          variant={config.valueVariant}
                          sx={{ wordBreak: 'break-word' }}
                        >
                          {item.value ?? '-'}
                        </Typography>
                      </Tooltip>
                    )}
                    {item.copyable && typeof item.value === 'string' && (
                      <IconButton
                        size='small'
                        onClick={() => handleCopy(item.value as string, index)}
                        sx={{ ml: 0.5 }}
                      >
                        {copiedIndex === index ? (
                          <Check
                            size={14}
                            sx={{ color: 'success.main' }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </IconButton>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default DescriptionList;
