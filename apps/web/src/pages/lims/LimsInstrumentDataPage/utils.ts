import type { ChipProps } from '@mui/material';
import { getStatusColor as getSharedStatusColor } from '@/utils/status';

export const getStatusColor = (status: string) => getSharedStatusColor(status);

export const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待解析',
    success: '成功',
    failed: '失败',
    running: '运行中',
    stopped: '已停止',
    active: '启用',
    inactive: '禁用',
    manual: '手动触发',
    scheduled: '定时采集',
    interval: '间隔采集',
  };
  return statusMap[status] || status;
};

export const formatJson = (obj: Record<string, any> | undefined) => {
  if (!obj) return '{}';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
};

export const parseJsonInput = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
};

export type ChipColor = ChipProps['color'];
