import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import i18n from '@/i18n';

interface AmountDisplayProps {
  /** 金额数值 */
  amount: number | string;
  /** 货币符号或代码，默认 CNY (¥) */
  currency?: 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY';
  /** 是否显示货币单位 */
  showUnit?: boolean;
  /** 是否显示千分位分隔符，默认 true */
  thousandSeparator?: boolean;
  /** 小数位数，默认 2 */
  decimalPlaces?: number;
  /** 金额颜色 */
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'textPrimary'
    | 'textSecondary';
  /** 字体大小 */
  fontSize?: 'small' | 'medium' | 'large' | number;
  /** 是否加粗 */
  bold?: boolean;
  /** 自定义前缀 */
  prefix?: string;
  /** 自定义后缀 */
  suffix?: string;
  /** 组件容器样式 */
  sx?: object;
}

