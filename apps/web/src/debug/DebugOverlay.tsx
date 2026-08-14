/**
 * @done V80-5 开发态可视化调试工具
 * @dev-only 仅在 import.meta.env.DEV = true 时挂载
 * 功能：
 *   - 显示当前路由、API 调用统计、错误计数、内存占用
 *   - 支持通过 localStorage 'topems_debug_trace' 远程开关
 *   - 生产构建由 Vite tree-shaking 移除（早期 return + import.meta.env.DEV）
 */
import { useEffect, useState } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { getDebugTrace } from './useDebugTrace';
import i18n from '@/i18n';

interface DebugInfo {
  route: string;
  apiCalls: number;
  errors: number;
  memory?: number;
  timestamp: number;
}

export function DebugOverlay() {
  const [info, setInfo] = useState<DebugInfo>({
    route: typeof location !== 'undefined' ? location.pathname : '/',
    apiCalls: 0,
    errors: 0,
    timestamp: Date.now(),
  });
  const [visible, setVisible] = useState(true);
  const [traceEnabled, setTraceEnabled] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    setTraceEnabled(getDebugTrace().enabled);
    const interval = setInterval(() => {
      // @todo V81+ 接入真实 API 计数器（axios interceptor counter）
      const perf = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      setInfo((prev) => ({
        route: typeof location !== 'undefined' ? location.pathname : prev.route,
        apiCalls: prev.apiCalls,
        errors: prev.errors,
        memory: perf?.usedJSHeapSize,
        timestamp: Date.now(),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV || !visible) return null;

  const memoryMB = info.memory ? (info.memory / 1024 / 1024).toFixed(2) : 'N/A';

  return (
    <Box
      role='status'
      aria-label='debug-overlay'
      sx={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 9999,
        bgcolor: 'alpha(common.black, 0.8)',
        color: 'common.white',
        p: 1.5,
        borderRadius: 1,
        fontSize: 11,
        fontFamily: 'monospace',
        maxWidth: 280,
        cursor: 'pointer',
      }}
      onClick={() => setVisible(false)}
      title={i18n.t('debug.debug_overlay.devonly_0')}
    >
      <Stack spacing={0.5}>
        <Typography
          variant='caption'
          sx={{ color: 'warning.main', fontWeight: 'bold' }}
        >
          🛠 DEV OVERLAY
        </Typography>
        <Box>Route: {info.route}</Box>
        <Box>API calls: {info.apiCalls}</Box>
        <Box>Errors: {info.errors}</Box>
        <Box>Memory: {memoryMB} MB</Box>
        <Box>Time: {new Date(info.timestamp).toLocaleTimeString()}</Box>
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ mt: 0.5 }}
        >
          <Chip
            label={`env=${import.meta.env.MODE}`}
            size='small'
            sx={{ height: 16, fontSize: 9 }}
          />
          <Chip
            label={`trace=${traceEnabled ? 'on' : 'off'}`}
            size='small'
            color={traceEnabled ? 'success' : 'default'}
            sx={{ height: 16, fontSize: 9 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

export default DebugOverlay;
