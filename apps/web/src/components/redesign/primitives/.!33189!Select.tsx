import React, { useId } from 'react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  /** 显式指定 testid；缺省时按 label 生成（select-{label}） */
  'data-testid'?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      className,
      style,
      'aria-label': ariaLabel,
      'data-testid': dataTestId,
      ...rest
    },
    ref
  ) => {
    const selectId = useId();
    // 2026-10-17 D4 遗留：通用 Select 补 testid——父级显式传入优先，否则按 label
