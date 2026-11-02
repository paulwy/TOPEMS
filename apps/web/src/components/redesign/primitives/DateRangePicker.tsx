import React from 'react';
import styles from './DateRangePicker.module.css';
import { clsx as cx, clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';

export interface DateRange {
  start: string;
  end: string;
}

export interface DateRangePickerProps {
  /** 日期范围值（YYYY-MM-DD 格式） */
  value?: DateRange;
  /** 值变化回调 */
  onChange?: (range: DateRange) => void;
  /** 开始日期占位符 */
  startPlaceholder?: string;
  /** 结束日期占位符 */
  endPlaceholder?: string;
  /** 最小日期 */
  minDate?: string;
  /** 最大日期 */
  maxDate?: string;
  /** 禁用状态 */
  disabled?: boolean;
  /** 预设快捷选项 */
  presets?: { label: string; value: () => DateRange }[];
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 常用预设 */

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  startPlaceholder,
  endPlaceholder,
  minDate,
  maxDate,
  disabled = false,
  presets,
  className,
}) => {
  const { t } = useTranslation();
  const resolvedStartPlaceholder =
    startPlaceholder ?? t('components.date_range_picker.start_placeholder');
  const resolvedEndPlaceholder =
    endPlaceholder ?? t('components.date_range_picker.end_placeholder');
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.({ start: e.target.value, end: value?.end || '' });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.({ start: value?.start || '', end: e.target.value });
  };

  const handlePresetClick = (preset: { label: string; value: () => DateRange }) => {
    onChange?.(preset.value());
  };

  const _inputStyle: React.CSSProperties = {
    flex: 1,
    height: 40,
    padding: '0 var(--space-3)',
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    transition: 'border-color var(--duration-fast) var(--ease-out)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div className={cx(clsx('redesign-date-range-picker', className), styles.il1)}>
      {/* 日期输入 */}
      <div className={styles.il2}>
        <div className={styles.il3}>
          <Calendar
            size={16}
            className={styles.il4}
          />
          <input
            type='date'
            value={value?.start || ''}
            onChange={handleStartChange}
            min={minDate}
            max={maxDate || value?.end || maxDate}
            disabled={disabled}
            placeholder={resolvedStartPlaceholder}
            className={styles.il5}
          />
        </div>
        <span className={styles.il6}>{t('components.date_range_picker.to')}</span>
        <div className={styles.il7}>
          <Calendar
            size={16}
            className={styles.il8}
          />
          <input
            type='date'
            value={value?.end || ''}
            onChange={handleEndChange}
            min={minDate || value?.start || minDate}
            max={maxDate}
            disabled={disabled}
            placeholder={resolvedEndPlaceholder}
            className={styles.il9}
          />
        </div>
      </div>

      {/* 预设快捷选项 */}
      {presets && presets.length > 0 && (
        <div className={styles.il10}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type='button'
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

DateRangePicker.displayName = 'RedesignDateRangePicker';
