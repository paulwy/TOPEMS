/**
 * CurrencyField - 货币金额输入组件
 * 基于 NumberField，自动添加 ¥ 符号前缀，默认精度 2 位
 */
import React from 'react';
import { NumberField } from './NumberField';
import type { NumberFieldProps } from './NumberField';

export interface CurrencyFieldProps extends Omit<NumberFieldProps, 'startAdornment' | 'precision'> {
  /** 货币符号，默认 ¥ */
  currencySymbol?: string;
  /** 精度覆盖（默认 2） */
  precision?: number;
}

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  currencySymbol = '¥',
  precision = 2,
  ...restProps
}) => {
  return (
    <NumberField
      {...restProps}
      precision={precision}
      startAdornment={
        <span style={{ marginRight: 2, color: 'text.secondary' }}>
          {currencySymbol}
        </span>
      }
    />
  );
};

export default CurrencyField;
