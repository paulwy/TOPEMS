import React, { useCallback } from 'react';
import { Box, type BoxProps } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

export interface TabItem {
  /** 稳定唯一 key，用于 value / onChange */
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** 徽标（如未读数），显示在 label 右侧 */
  badge?: React.ReactNode;
}

interface TabGroupProps extends Omit<BoxProps, 'onChange'> {
  items: TabItem[];
  /** 当前选中 key */
  value: string;
  /** 选中变化回调 */
  onChange: (key: string) => void;
  /** 横向滚动（模块过多时），默认 true */
  scrollable?: boolean;
  /** 前缀节点（如首页图标） */
  startAdornment?: React.ReactNode;
  /** 后缀节点（如更多菜单按钮） */
  endAdornment?: React.ReactNode;
  /** 无障碍标签 */
  label?: string;
  /** 单个 Tab 的 sx */
  tabSx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
}

/**
