import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import i18n from '@/i18n';

// 货币符号映射
const _CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

export interface AmountDisplayProps {
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

// 货币配置
const CURRENCY_CONFIG: Record<string, { symbol: string; name: string; code: string }> = {
  CNY: { symbol: '¥', name: i18n.t('shared.amount_display.k0'), code: 'CNY' },
  USD: { symbol: '$', name: i18n.t('shared.amount_display.k1'), code: 'USD' },
  EUR: { symbol: '€', name: i18n.t('shared.amount_display.k2'), code: 'EUR' },
  GBP: { symbol: '£', name: i18n.t('shared.amount_display.k3'), code: 'GBP' },
  JPY: { symbol: '¥', name: i18n.t('shared.amount_display.k4'), code: 'JPY' },
};

// 数字格式化
const formatNumber = (value: number, decimalPlaces: number, thousandSeparator: boolean): string => {
  const fixed = value.toFixed(decimalPlaces);
  if (!thousandSeparator) {
    return fixed;
  }
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency = 'CNY',
  showUnit = true,
  thousandSeparator = true,
  decimalPlaces = 2,
  color = 'inherit',
  fontSize = 'medium',
  bold = false,
  prefix,
  suffix,
  sx,
}) => {
  // 解析金额数值
  const numericAmount = useMemo(() => {
    if (typeof amount === 'number') {
      return amount;
    }
    const parsed = parseFloat(amount.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  // 获取货币信息
  const currencyInfo = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.CNY;

  // 格式化金额
  const formattedAmount = useMemo(
    () => formatNumber(numericAmount, decimalPlaces, thousandSeparator),
    [numericAmount, decimalPlaces, thousandSeparator]
  );

  // 字体大小映射
  const fontSizeMap = {
    small: '0.75rem',
    medium: '0.875rem',
    large: '1.25rem',
  };

  const resolvedFontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSizeMap[fontSize];

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0.5,
        ...sx,
      }}
    >
      {prefix && (
        <Typography
          component='span'
          sx={{
            fontSize: resolvedFontSize,
            fontWeight: bold ? 600 : 400,
            color,
          }}
        >
          {prefix}
        </Typography>
      )}
      {showUnit && (
        <Typography
          component='span'
          sx={{
            fontSize: resolvedFontSize,
            fontWeight: bold ? 600 : 400,
            color,
          }}
        >
          {currencyInfo.symbol}
        </Typography>
      )}
      <Typography
        component='span'
        sx={{
          fontSize: resolvedFontSize,
          fontWeight: bold ? 600 : 400,
          color,
          fontFamily:
            fontSize === 'large' || (typeof fontSize === 'number' && fontSize >= 20)
              ? "'Roboto Mono', monospace"
              : 'inherit',
        }}
      >
        {formattedAmount}
      </Typography>
      {suffix && (
        <Typography
          component='span'
          sx={{
            fontSize: resolvedFontSize,
            fontWeight: bold ? 600 : 400,
            color,
          }}
        >
          {suffix}
        </Typography>
      )}
    </Box>
  );
};

export default AmountDisplay;
