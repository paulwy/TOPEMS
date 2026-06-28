/**
 * NumberField - 数字输入组件
 * 基于 MUI TextField，添加数字格式化和输入验证
 */
import React, { useCallback, useRef, useState } from 'react';
import type { TextFieldProps } from '@mui/material';
import { TextField, InputAdornment } from '@mui/material';

export interface NumberFieldProps extends Omit<TextFieldProps, 'type' | 'onChange'> {
  /** 数值 */
  value: number | string;
  /** 变更回调，返回数值 */
  onChange?: (value: number) => void;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 精度（小数位数） */
  precision?: number;
  /** 是否允许负数 */
  allowNegative?: boolean;
  /** 前缀 adornment */
  startAdornment?: React.ReactNode;
  /** 后缀 adornment */
  endAdornment?: React.ReactNode;
  /** 字段名称 */
  name?: string;
}

const formatNumber = (value: number, precision?: number): string => {
  if (precision !== undefined) {
    return value.toFixed(precision);
  }
  return value.toString();
};

const parseNumber = (raw: string, precision?: number): number => {
  const cleaned = raw.replace(/[^\d.\-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (precision !== undefined) {
    return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
  }
  return num;
};

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  precision,
  allowNegative = false,
  startAdornment,
  endAdornment,
  name,
  slotProps,
  ...restProps
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    typeof value === 'number' ? formatNumber(value, precision) : value || ''
  );
  const isComposingRef = useRef(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty input
      if (raw === '' || raw === '-') {
        setDisplayValue(raw);
        onChange?.(0);
        return;
      }

      // Negative check
      if (!allowNegative && raw.startsWith('-')) {
        setDisplayValue(raw.slice(1));
        onChange?.(parseNumber(raw.slice(1), precision));
        return;
      }

      setDisplayValue(raw);
      const num = parseNumber(raw, precision);

      // Clamp to min/max
      const clamped = Math.min(Math.max(num, min ?? -Infinity), max ?? Infinity);
      onChange?.(clamped);
    },
    [allowNegative, min, max, precision, onChange]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const num = parseNumber(e.target.value, precision);
      const clamped = Math.min(Math.max(num, min ?? -Infinity), max ?? Infinity);
      setDisplayValue(formatNumber(clamped, precision));
      onChange?.(clamped);
      restProps.onBlur?.(e);
    },
    [min, max, precision, onChange, restProps]
  );

  // Sync external value changes
  React.useEffect(() => {
    if (!isComposingRef.current) {
      if (typeof value === 'number') {
        setDisplayValue(formatNumber(value, precision));
      } else {
        setDisplayValue(value || '');
      }
    }
  }, [value, precision]);

  const mergedSlotProps = {
    ...slotProps,
    input: {
      ...(slotProps?.input as Record<string, unknown>),
      startAdornment: startAdornment
        ? <InputAdornment position="start">{startAdornment}</InputAdornment>
        : slotProps?.input &&
          'startAdornment' in (slotProps.input as Record<string, unknown>)
          ? (slotProps.input as Record<string, unknown>).startAdornment
          : undefined,
      endAdornment: endAdornment
        ? <InputAdornment position="end">{endAdornment}</InputAdornment>
        : slotProps?.input &&
          'endAdornment' in (slotProps.input as Record<string, unknown>)
          ? (slotProps.input as Record<string, unknown>).endAdornment
          : undefined,
      inputProps: {
        min,
        max,
        step,
        ...(slotProps?.input &&
          'inputProps' in (slotProps.input as Record<string, unknown>)
          ? ((slotProps.input as Record<string, unknown>).inputProps as Record<string, unknown>)
          : {}),
      },
    },
  };

  return (
    <TextField
      name={name}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      slotProps={mergedSlotProps as any}
      {...restProps}
    />
  );
};

export default NumberField;
