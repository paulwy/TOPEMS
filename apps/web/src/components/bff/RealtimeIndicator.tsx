/**
 * V39.0 Track D: BFF 实时状态指示器组件
 *
 * 显示 BFF 层的实时运行状态，适合放置在页头/工具栏：
 * - WebSocket 连接状态（彩色圆点 + 文字）
 * - 活跃订阅数
 * - 当前缓存版本号
 *
 * 数据来源：BffDataProvider Context（useBffData）
 *
 * @example
 * ```tsx
 * // 需在 BffDataProvider 内部使用
 * <RealtimeIndicator />
 *
 * // 紧凑模式（仅显示圆点）
 * <RealtimeIndicator compact />
 * ```
 */

import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useBffData } from './BffDataProvider';
import { useBffPerformance } from '@/hooks/bff/useBffPerformance';
import type { SubscriptionStatus } from '@/hooks/bff/useBffSubscription';

/** 连接状态对应的颜色 */
const STATUS_COLOR: Record<SubscriptionStatus, 'success' | 'warning' | 'error' | 'default'> = {
  connected: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
  disconnected: 'error',
};

/** 连接状态对应的中文标签 */
const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  connected: '已连接',
  connecting: '连接中',
  reconnecting: '重连中',
  disconnected: '已断开',
};

/** RealtimeIndicator Props */
export interface RealtimeIndicatorProps {
  /** 紧凑模式：仅显示状态圆点，不显示文字详情，默认 false */
  compact?: boolean;
  /** 是否显示缓存版本，默认 true */
  showCacheVersion?: boolean;
  /** 是否显示活跃订阅数，默认 true */
  showSubscriptions?: boolean;
  /** 是否显示慢查询数量，默认 true */
  showSlowQueries?: boolean;
}

/**
 * BFF 实时状态指示器
 */
export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({
  compact = false,
  showCacheVersion = true,
  showSubscriptions = true,
  showSlowQueries = true,
}) => {
  const { wsStatus, wsConnected, activeSubscriptions, cacheVersion, wsConnections } = useBffData();
  const { slowQueries, slowQueryThreshold } = useBffPerformance();
  const slowQueryCount = slowQueries.length;

  const statusColor = STATUS_COLOR[wsStatus] ?? 'default';
  const statusLabel = STATUS_LABEL[wsStatus] ?? '未知';

  if (compact) {
    return (
      <Tooltip
        title={`BFF: ${statusLabel} | 订阅: ${activeSubscriptions} | 版本: v${cacheVersion} | 慢查询: ${slowQueryCount}`}
        arrow
      >
        <Box
          component='span'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'help',
          }}
        >
          <Box
            component='span'
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: wsConnected ? 'success.main' : 'error.main',
              display: 'inline-block',
              animation: wsConnected ? 'none' : 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }}
          />
          {showSlowQueries && slowQueryCount > 0 && (
            <Box
              component='span'
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'error.main',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={10} />
              {slowQueryCount}
            </Box>
          )}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Tooltip
        title={`WebSocket 连接状态：${statusLabel}（${wsConnections} 个连接）`}
        arrow
      >
        <Chip
          size='small'
          color={statusColor}
          variant={wsConnected ? 'filled' : 'outlined'}
          label={statusLabel}
          sx={{ fontWeight: 500 }}
        />
      </Tooltip>

      {showSubscriptions && (
        <Tooltip
          title='当前活跃的 GraphQL Subscription 数量'
          arrow
        >
          <Chip
            size='small'
            variant='outlined'
            label={`订阅 ${activeSubscriptions}`}
            sx={{ color: 'text.secondary' }}
          />
        </Tooltip>
      )}

      {showSlowQueries && (
        <Tooltip
          title={`慢查询数量（阈值: ${slowQueryThreshold}ms）`}
          arrow
        >
          <Chip
            size='small'
            color={slowQueryCount > 0 ? 'error' : 'default'}
            variant={slowQueryCount > 0 ? 'filled' : 'outlined'}
            icon={<AlertTriangle size={14} />}
            label={`慢查询 ${slowQueryCount}`}
            sx={{ fontWeight: 500 }}
          />
        </Tooltip>
      )}

      {showCacheVersion && (
        <Tooltip
          title='BFF CDN 缓存版本号（变化时自动刷新数据）'
          arrow
        >
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          >
            v{cacheVersion}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export default RealtimeIndicator;
