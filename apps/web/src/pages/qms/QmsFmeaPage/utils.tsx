import React from 'react';
import { Chip } from '@mui/material';

export const getStatusBadge = (status: string) => {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'success.lighter', color: 'success.dark' },
    启用: { bg: 'success.lighter', color: 'success.dark' },
    draft: { bg: 'grey.100', color: 'text.secondary' },
    草稿: { bg: 'grey.100', color: 'text.secondary' },
    completed: { bg: 'primary.lighter', color: 'primary.dark' },
    已完成: { bg: 'primary.lighter', color: 'primary.dark' },
    closed: { bg: 'grey.100', color: 'text.secondary' },
    已关闭: { bg: 'grey.100', color: 'text.secondary' },
  };
  const labels: Record<string, string> = {
    active: '进行中',
    启用: '进行中',
    draft: '草稿',
    草稿: '草稿',
    completed: '已完成',
    已完成: '已完成',
    closed: '已关闭',
    已关闭: '已关闭',
  };
  const colorKey = status as keyof typeof colors;
  return (
    <Chip
      label={labels[colorKey] || status}
      size='small'
      sx={{
        backgroundColor: colors[colorKey]?.bg || 'grey.100',
        color: colors[colorKey]?.color || 'text.secondary',
      }}
    />
  );
};

export const getRpnRiskLevel = (rpn: number) => {
  if (rpn >= 100) return { level: '高', color: 'error' as const, bg: 'error.lighter' };
  if (rpn >= 50) return { level: '中', color: 'warning' as const, bg: 'warning.light' };
  return { level: '低', color: 'success' as const, bg: 'success.lighter' };
};

export const getSeverityLabel = (value: number) => {
  if (value >= 8) return '严重';
  if (value >= 5) return '中等';
  return '轻微';
};
