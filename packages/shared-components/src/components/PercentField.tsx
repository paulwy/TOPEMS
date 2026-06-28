/**
 * PercentField - 百分比输入组件
 * 基于 NumberField，自动添加 % 符号后缀
 * 输入值表示百分比的数值（如输入 13 表示 13%）
 */
import React from 'react';
import { NumberField } from './NumberField';
import type { NumberFieldProps } from './NumberField';

export interface PercentFieldProps extends Omit<NumberFieldProps, 'endAdornment'> {
  /** 精度（小数位数），默认 2 */
  precision?: number;
}

export const PercentField: React.FC<PercentFieldProps> = ({
  precision = 2,
  ...restProps
}) => {
  return (
    <NumberField
      {...restProps}
      precision={precision}
      endAdornment={<span style={{ marginLeft: 2 }}>%</span>}
    />
  );
};

export default PercentField;
