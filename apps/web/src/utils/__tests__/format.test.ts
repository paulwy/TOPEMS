import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatDuration,
  formatRelativeTime,
  formatStatus,
  formatPercent,
  formatFileSize,
  formatPhone,
  formatEmail,
  formatIdCard,
  formatDateRange,
  formatMonth,
  formatWeek,
} from '@/utils/format';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const map: Record<string, string> = {
        'shared.format.duration.hour': '小时',
        'shared.format.duration.minute': '分钟',
        'shared.format.duration.second': '秒',
        'shared.format.relative_time.minute_ago': '分钟前',
        'shared.format.relative_time.hour_ago': '小时前',
        'shared.format.relative_time.day_ago': '天前',
        'shared.format.relative_time.week_ago': '周前',
        'shared.format.relative_time.month_ago': '个月前',
        'shared.format.relative_time.year_ago': '年前',
        'shared.format.k0': '刚刚',
        'shared.format.k1': '未启用',
        'shared.format.k2': '已启用',
        'shared.format.k3': '活跃',
        'shared.format.k4': '不活跃',
        'shared.format.k5': '待处理',
        'shared.format.k6': '已批准',
        'shared.format.k7': '已拒绝',
        'shared.format.k8': '已完成',
        'shared.format.k9': '处理中',
        'shared.format.k10': '已取消',
        'shared.format.k11': '草稿',
        'shared.format.k12': '已发布',
        'shared.format.k13': '已删除',
        'shared.format.k14': '成功',
        'shared.format.k15': '失败',
        'shared.format.k16': '警告',
        'shared.format.k17': '错误',
        'shared.format.yyyymm_12': 'YYYY年MM月',
      };
      return map[key] ?? key;
    },
  },
}));

describe('formatDate', () => {
  it('should format a valid date string in default format', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    // Timezone dependent, just check it does not throw and contains expected parts
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });

  it('should format date with custom format', () => {
    const result = formatDate('2024-06-01T00:00:00Z', 'YYYY年MM月DD日');
    expect(result).toContain('2024');
    expect(result).toContain('06');
    expect(result).toContain('01');
  });

  it('should return original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('should return original string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('should cache formatted results', () => {
    const first = formatDate('2024-01-01T00:00:00Z');
    const second = formatDate('2024-01-01T00:00:00Z');
    expect(first).toBe(second);
  });
});

describe('formatNumber', () => {
  it('should format a number with default decimals', () => {
    const result = formatNumber(1234.567);
    expect(result).toContain('1,234');
  });

  it('should format a string number', () => {
    const result = formatNumber('1234.56');
    expect(result).toContain('1,234');
  });

  it('should handle NaN string', () => {
    expect(formatNumber('abc')).toBe('0');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('should format with custom decimals (rounded)', () => {
    // 1234.5 rounds to 1235 with 0 decimals
    const result = formatNumber(1234.5, 0);
    expect(result).toContain('1,235');
    expect(result).not.toContain('.');
  });
});

describe('formatCurrency', () => {
  it('should format CNY with default currency', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('¥');
    expect(result).toContain('1,234');
  });

  it('should format USD', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('100');
  });

  it('should format EUR', () => {
    const result = formatCurrency(200, 'EUR');
    expect(result).toContain('€');
  });

  it('should handle NaN', () => {
    expect(formatCurrency('abc')).toBe('¥0.00');
  });

  it('should default unknown currency to CNY symbol', () => {
    const result = formatCurrency(50, 'JPY');
    expect(result).toContain('¥');
  });
});

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(45)).toBe('45秒');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2分钟5秒');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1小时1分钟1秒');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0秒');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return original string for invalid date', () => {
    expect(formatRelativeTime('invalid')).toBe('invalid');
  });

  it('should return just now for very recent times', () => {
    const date = new Date('2024-06-15T11:59:30Z').toISOString();
    expect(formatRelativeTime(date)).toBe('刚刚');
  });

  it('should format minutes ago', () => {
    const date = new Date('2024-06-15T11:55:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('5分钟前');
  });

  it('should format hours ago', () => {
    const date = new Date('2024-06-15T09:00:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('3小时前');
  });

  it('should format days ago', () => {
    const date = new Date('2024-06-13T12:00:00Z').toISOString();
    expect(formatRelativeTime(date)).toBe('2天前');
  });
});

describe('formatStatus', () => {
  it('should format numeric status 0', () => {
    expect(formatStatus(0)).toBe('未启用');
  });

  it('should format numeric status 1', () => {
    expect(formatStatus(1)).toBe('已启用');
  });

  it('should format string status', () => {
    expect(formatStatus('active')).toBe('活跃');
    expect(formatStatus('pending')).toBe('待处理');
  });

  it('should return original string for unknown status', () => {
    expect(formatStatus('unknown_status')).toBe('unknown_status');
  });

  it('should handle case insensitive status', () => {
    expect(formatStatus('Active')).toBe('活跃');
    expect(formatStatus('PENDING')).toBe('待处理');
  });
});

describe('formatPercent', () => {
  it('should format percentage with default decimals', () => {
    const result = formatPercent(0.456);
    expect(result).toContain('45.6%');
  });

  it('should handle zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('should handle NaN', () => {
    expect(formatPercent('abc')).toBe('0%');
  });

  it('should handle string number', () => {
    const result = formatPercent('0.25');
    expect(result).toContain('25');
    expect(result).toContain('%');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500.00 B');
  });

  it('should format kilobytes', () => {
    const result = formatFileSize(1024);
    expect(result).toContain('1.00');
    expect(result).toContain('KB');
  });

  it('should format megabytes', () => {
    const result = formatFileSize(1048576);
    expect(result).toContain('1.00');
    expect(result).toContain('MB');
  });

  it('should handle zero', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should handle negative number', () => {
    expect(formatFileSize(-100)).toBe('0 B');
  });

  it('should handle NaN string', () => {
    expect(formatFileSize('abc')).toBe('0 B');
  });
});

describe('formatPhone', () => {
  it('should mask middle 4 digits of phone', () => {
    expect(formatPhone('13812345678')).toBe('138****5678');
  });

  it('should return empty string for empty input', () => {
    expect(formatPhone('')).toBe('');
  });

  it('should return empty string for null/undefined input', () => {
    expect(formatPhone(null as unknown as string)).toBe('');
  });
});

describe('formatEmail', () => {
  it('should mask email prefix', () => {
    expect(formatEmail('testuser@example.com')).toBe('te***@example.com');
  });

  it('should return empty string for empty input', () => {
    expect(formatEmail('')).toBe('');
  });

  it('should return original if no @ sign', () => {
    expect(formatEmail('noatsign')).toBe('noatsign');
  });
});

describe('formatIdCard', () => {
  it('should mask id card middle digits', () => {
    expect(formatIdCard('110101199001011234')).toBe('1101**********1234');
  });

  it('should return empty string for empty input', () => {
    expect(formatIdCard('')).toBe('');
  });
});

describe('formatDateRange', () => {
  it('should format same day range', () => {
    const result = formatDateRange('2024-01-15', '2024-01-15');
    expect(result).toContain('2024-01-15');
  });

  it('should format same month range', () => {
    const result = formatDateRange('2024-01-01', '2024-01-15');
    expect(result).toContain('01-01');
    expect(result).toContain('01-15');
  });

  it('should format same year range', () => {
    const result = formatDateRange('2024-01-01', '2024-06-15');
    expect(result).toContain('01-01');
    expect(result).toContain('06-15');
  });

  it('should handle invalid dates by returning raw strings', () => {
    expect(formatDateRange('invalid', 'dates')).toBe('invalid - dates');
  });
});

describe('formatMonth', () => {
  it('should format month', () => {
    const result = formatMonth('2024-06-15');
    expect(result).toContain('2024');
    expect(result).toContain('06');
    expect(result).toContain('月');
  });
});

describe('formatWeek', () => {
  it('should return original string for invalid date', () => {
    expect(formatWeek('invalid')).toBe('invalid');
  });

  it('should format week range', () => {
    // 2024-06-12 is a Wednesday
    const result = formatWeek('2024-06-12T00:00:00Z');
    // Week starts Monday (06-10) ends Sunday (06-16)
    expect(result).toContain('~');
  });
});
