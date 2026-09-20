import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  accent?: 'amber' | 'cyan' | 'success' | 'warning' | 'error';
  loading?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
  (
    {
      label,
      value,
      unit,
      trend,
      trendValue,
      icon: Icon,
      accent = 'amber',
      loading = false,
      className,
      style,
      action: _action, // 显式排除 action，避免传递给非 form 元素
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const accentColors: Record<string, string> = {
      amber: 'var(--accent-primary)',
      cyan: 'var(--accent-secondary)',
      success: 'var(--success-500)',
      warning: 'var(--warning-500)',
      error: 'var(--error-500)',
    };

    const trendColor =
      trend === 'up'
        ? 'var(--success-500)'
        : trend === 'down'
          ? 'var(--error-500)'
          : 'var(--text-tertiary)';
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

    return (
      <div
        ref={ref}
        className={clsx('redesign-stat-tile', className)}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          transition:
            'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
          ...style,
        }}
        data-accent={accent}
        {...rest}
      >
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: accentColors[accent],
            opacity: 0.9,
          }}
          aria-hidden='true'
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <span
            className='uppercase-label'
            style={{ color: 'var(--text-tertiary)' }}
          >
            {label}
          </span>
          {Icon && (
            <span
              style={{
                display: 'inline-flex',
                padding: 'var(--space-2)',
                color: accentColors[accent],
                backgroundColor: `${accentColors[accent]}1A`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Icon size={18} />
            </span>
          )}
        </div>

        {loading ? (
          <>
            <div
              className='skeleton'
              style={{ width: '60%', height: '36px' }}
            />
            <div
              className='skeleton'
              style={{ width: '40%', height: '16px' }}
            />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-bold)',
                  letterSpacing: 'var(--tracking-tight)',
                  color: 'var(--text-primary)',
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                {value}
              </span>
              {unit && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {unit}
                </span>
              )}
            </div>

            {trend && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <TrendIcon
                  size={14}
                  color={trendColor}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)',
                    color: trendColor,
                  }}
                >
                  {trendValue}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {t('components.stat_tile.vs_last_month')}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

StatTile.displayName = 'RedesignStatTile';
