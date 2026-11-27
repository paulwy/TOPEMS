import React from 'react';
import styles from './StatTile.module.css';
import { clsx as cx, clsx } from 'clsx';
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
    // 强调色当装饰条可以饱和，但当图标/文字时必须用文字档（--*-text），
    // 否则亮色下琥珀/青绿压白底只有 2.1~2.3:1。
    const accentColors: Record<string, string> = {
      amber: 'var(--accent-primary-text)',
      cyan: 'var(--accent-secondary-text)',
      success: 'var(--success-text)',
      warning: 'var(--warning-text)',
      error: 'var(--error-text)',
    };

    const trendColor =
      trend === 'up'
        ? 'var(--success-text)'
        : trend === 'down'
          ? 'var(--error-text)'
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

        <div className={styles.il1}>
          <span className={cx('uppercase-label', styles.il2)}>{label}</span>
          {Icon && (
            <span
              style={{
                display: 'inline-flex',
                padding: 'var(--space-2)',
                color: accentColors[accent],
                // 旧写法 `${color}1A` 对 CSS 变量拼不出合法色值，整条背景会被丢弃（图标直接压白底）
                backgroundColor: `color-mix(in srgb, ${accentColors[accent]} 12%, transparent)`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Icon size={18} />
            </span>
          )}
        </div>

        {loading ? (
          <>
            <div className={cx('skeleton', styles.il3)} />
            <div className={cx('skeleton', styles.il4)} />
          </>
        ) : (
          <>
            <div className={styles.il5}>
              <span className={styles.il6}>{value}</span>
              {unit && <span className={styles.il7}>{unit}</span>}
            </div>

            {trend && (
              <div className={styles.il8}>
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
                <span className={styles.il9}>{t('components.stat_tile.vs_last_month')}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

StatTile.displayName = 'RedesignStatTile';
