import React, { useState } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  MoreVertical,
  Download,
  Maximize2,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle,
  BarChart2,
  Target,
  Grid3X3,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Card,
  CardHeader,
  CardContent,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
  Chip,
  Box,
  Button,
} from '@mui/material';
import { designTokens } from '@topems/tokens';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'histogram' | 'gauge' | 'scatter' | 'radar';

interface TimeRange {
  label: string;
  value: string;
}

const timeRanges: TimeRange[] = [
  { label: i18n.t('shared.chart_card.k0'), value: 'today' },
  { label: i18n.t('shared.chart_card.k1'), value: 'week' },
  { label: i18n.t('shared.chart_card.k2'), value: 'month' },
  { label: i18n.t('shared.chart_card.k3'), value: 'quarter' },
  { label: i18n.t('shared.chart_card.k4'), value: 'year' },
  { label: i18n.t('shared.chart_card.k5'), value: 'custom' },
];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  chartTypes?: ChartType[];
  activeChartType?: ChartType;
  onChartTypeChange?: (_type: ChartType) => void;
  timeRange?: string;
  onTimeRangeChange?: (_range: string) => void;
  showTimeRange?: boolean;
  showChartType?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showRefresh?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  summary?: {
    total?: number;
    avg?: number;
    max?: number;
    min?: number;
  };
  onDrillDown?: () => void;
  showDrillDown?: boolean;
  bordered?: boolean;
  elevation?: number;
}

const ChartCardIcon: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 style={{ width: 16, height: 16 }} />,
  line: <LineChart style={{ width: 16, height: 16 }} />,
  area: <AreaChart style={{ width: 16, height: 16 }} />,
  pie: <PieChart style={{ width: 16, height: 16 }} />,
  histogram: <BarChart2 style={{ width: 16, height: 16 }} />,
  gauge: <Target style={{ width: 16, height: 16 }} />,
  scatter: <Grid3X3 style={{ width: 16, height: 16 }} />,
  radar: <Grid3X3 style={{ width: 16, height: 16 }} />,
};

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  height = 320,
  loading = false,
  error,
  onRefresh,
  onExport,
  onFullscreen,
  chartTypes = ['bar', 'line', 'area', 'pie'],
  activeChartType = 'bar',
  onChartTypeChange,
  timeRange = 'month',
  onTimeRangeChange,
  showTimeRange = false,
  showChartType = false,
  showExport = true,
  showFullscreen = true,
  showRefresh = true,
  className = '',
  trend,
  trendValue,
  summary,
  onDrillDown,
  showDrillDown = false,
  bordered = true,
  elevation = 0,
}) => {
  const [timeMenuAnchor, setTimeMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    return trend === 'up' ? (
      <TrendingUp style={{ width: 16, height: 16, color: 'success.main' }} />
    ) : (
      <TrendingUp
        style={{
          width: 16,
          height: 16,
          color: 'error.main',
          transform: 'rotate(180deg)',
        }}
      />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text.secondary';
    return trend === 'up' ? 'success.main' : 'error.main';
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: elevation + 2 },
        border: bordered ? `1px solid ${designTokens.colors.action.hover}` : 'none',
        boxShadow: elevation || 0,
      }}
      className={`bi-chart-card ${className || ''}`.trim()}
    >
      <CardHeader
        sx={{
          padding: `${designTokens.spacing.md} 24px`,
          borderBottom: bordered ? `1px solid ${designTokens.colors.action.hover}` : 'none',
        }}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {showChartType && chartTypes.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'grey.100',
                  borderRadius: 8,
                  padding: 2,
                }}
              >
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => onChartTypeChange?.(type)}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor:
                        activeChartType === type
                          ? 'var(--color-primary-foreground)'
                          : 'transparent',
                      color: activeChartType === type ? 'primary.700' : 'text.secondary',
                      cursor: 'pointer',
                      boxShadow:
                        activeChartType === type
                          ? `0 1px 2px ${designTokens.colors.action.selected}`
                          : 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={type}
                  >
                    {ChartCardIcon[type]}
                  </button>
                ))}
              </div>
            )}

            {showTimeRange && (
              <Button
                variant='text'
                size='small'
                onClick={(e) => setTimeMenuAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', padding: `${designTokens.spacing.sm} 12px` }}
              >
                <Calendar style={{ width: 16, height: 16, marginRight: 4 }} />
                <span>
                  {timeRanges.find((r) => r.value === timeRange)?.label ||
                    i18n.t('shared.chart_card.k6')}
                </span>
              </Button>
            )}

            <Button
              variant='text'
              size='small'
              onClick={(e) => setActionMenuAnchor(e.currentTarget)}
            >
              <MoreVertical style={{ width: 16, height: 16 }} />
            </Button>
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            {title}
          </Typography>
          {trend && trendValue && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: getTrendColor(),
              }}
            >
              {getTrendIcon()}
              <span style={{ fontSize: 12, fontWeight: 500 }}>{trendValue}</span>
            </div>
          )}
          {showDrillDown && onDrillDown && (
            <Chip
              label={i18n.t('shared.chart_card.k7')}
              size='small'
              onClick={onDrillDown}
              sx={{
                cursor: 'pointer',
                backgroundColor: 'primary.50',
                color: 'primary.700',
                '&:hover': { backgroundColor: 'primary.100' },
              }}
            />
          )}
        </div>
        {subtitle && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ marginTop: 2 }}
          >
            {subtitle}
          </Typography>
        )}
      </CardHeader>

      <CardContent sx={{ padding: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton sx={{ width: '33%', height: 16 }} />
            <Skeleton sx={{ width: '100%', height: height - 40, borderRadius: 8 }} />
          </div>
        ) : error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: 'error.50',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <AlertCircle style={{ width: 24, height: 24, color: 'error.main' }} />
            </div>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ marginBottom: 8 }}
            >
              {error}
            </Typography>
            {onRefresh && (
              <Button
                variant='outlined'
                size='small'
                onClick={onRefresh}
              >
                <RefreshCw style={{ width: 16, height: 16, marginRight: 4 }} />
                {i18n.t('components.chart_card.k0')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div style={{ height }}>{children}</div>
            {summary && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                  marginTop: 3,
                  paddingTop: 2,
                  borderTop: `1px solid ${designTokens.colors.action.hover}`,
                }}
              >
                {summary.total !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('components.chart_card.k1')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {typeof summary.total === 'number'
                        ? summary.total.toLocaleString()
                        : summary.total}
                    </Typography>
                  </div>
                )}
                {summary.avg !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('components.chart_card.k2')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {typeof summary.avg === 'number' ? summary.avg.toFixed(1) : summary.avg}
                    </Typography>
                  </div>
                )}
                {summary.max !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('components.chart_card.k3')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {typeof summary.max === 'number' ? summary.max.toLocaleString() : summary.max}
                    </Typography>
                  </div>
                )}
                {summary.min !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('components.chart_card.k4')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {typeof summary.min === 'number' ? summary.min.toLocaleString() : summary.min}
                    </Typography>
                  </div>
                )}
              </Box>
            )}
          </>
        )}
      </CardContent>

      <Menu
        anchorEl={timeMenuAnchor}
        open={Boolean(timeMenuAnchor)}
        onClose={() => setTimeMenuAnchor(null)}
      >
        {timeRanges.map((range) => (
          <MenuItem
            key={range.value}
            onClick={() => {
              onTimeRangeChange?.(range.value);
              setTimeMenuAnchor(null);
            }}
            selected={timeRange === range.value}
          >
            {range.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {showRefresh && (
          <MenuItem
            onClick={() => {
              onRefresh?.();
              setActionMenuAnchor(null);
            }}
          >
            <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.chart_card.k5')}
          </MenuItem>
        )}
        {showExport && (
          <MenuItem
            onClick={() => {
              onExport?.();
              setActionMenuAnchor(null);
            }}
          >
            <Download style={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.chart_card.k6')}
          </MenuItem>
        )}
        {showFullscreen && (
          <MenuItem
            onClick={() => {
              onFullscreen?.();
              setActionMenuAnchor(null);
            }}
          >
            <Maximize2 style={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.chart_card.k7')}
          </MenuItem>
        )}
        {showDrillDown && onDrillDown && (
          <MenuItem
            onClick={() => {
              onDrillDown();
              setActionMenuAnchor(null);
            }}
          >
            <TrendingUp style={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.chart_card.k8')}
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default ChartCard;
