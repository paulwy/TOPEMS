import React from 'react';
import clsx from 'clsx';
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
export const createDefaultPresets = (
  t: (key: string) => string
): { label: string; value: () => DateRange }[] => [
  {
    label: t('components.date_range_picker.preset_today'),
    value: () => {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    },
  },
  {
    label: t('components.date_range_picker.preset_last_7_days'),
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: t('components.date_range_picker.preset_last_30_days'),
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    label: t('components.date_range_picker.preset_this_month'),
    value: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
];

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
  style,
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

  const inputStyle: React.CSSProperties = {
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
    <div
      className={clsx('redesign-date-range-picker', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        ...style,
      }}
    >
      {/* 日期输入 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Calendar
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type='date'
            value={value?.start || ''}
            onChange={handleStartChange}
            min={minDate}
            max={maxDate || value?.end || maxDate}
            disabled={disabled}
            placeholder={resolvedStartPlaceholder}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          {t('components.date_range_picker.to')}
        </span>
        <div style={{ position: 'relative', flex: 1 }}>
          <Calendar
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type='date'
            value={value?.end || ''}
            onChange={handleEndChange}
            min={minDate || value?.start || minDate}
            max={maxDate}
            disabled={disabled}
            placeholder={resolvedEndPlaceholder}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* 预设快捷选项 */}
      {presets && presets.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
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
