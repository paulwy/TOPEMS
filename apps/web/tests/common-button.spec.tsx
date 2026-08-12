/**
 * @done V80 Tier2 coverage
 *
 * StatusChip 通用徽标组件单测
 * @see @/components/common/StatusChip
 *
 * 选用 StatusChip 作为"通用状态展示组件"的代表（local components/common 中
 * 唯一带丰富 mapping / variant / size 的实现）。Button 类组件大多是 placeholder
 * 桩，StatusChip 的可测 API 表面足以覆盖 default / variant / size / custom 行为。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusChip, DEFAULT_STATUS_MAPPING } from '@/components/common/StatusChip';

// StatusChip now resolves labels via react-i18next (labelKey → t(`common.${labelKey}`)).
// The unit project does not load setup-mocks.ts, so we provide a local i18n mock
// that maps the canonical labelKeys to the Chinese labels the tests assert on.
vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'common.status_draft': '草稿',
    'common.status_pending': '待处理',
    'common.status_waiting': '等待中',
    'common.status_submitted': '已提交',
    'common.status_approved': '已批准',
    'common.status_confirmed': '已确认',
    'common.status_rejected': '已拒绝',
    'common.status_cancelled': '已取消',
    'common.status_completed': '已完成',
    'common.status_active': '活跃',
    'common.status_enabled': '已启用',
    'common.status_inactive': '未激活',
    'common.status_disabled': '已禁用',
    'common.status_suspended': '已暂停',
    'common.status_invited': '已邀请',
    'common.status_open': '待处理',
    'common.status_in_progress': '进行中',
    'common.status_processing': '处理中',
    'common.status_receiving': '收货中',
    'common.status_resolved': '已解决',
    'common.status_closed': '已关闭',
    'common.status_claimed': '已认领',
    'common.status_overdue': '已逾期',
    'common.status_expired': '已过期',
    'common.status_valid': '有效',
    'common.status_invalid': '无效',
    'common.status_paid': '已付款',
    'common.status_unpaid': '未付款',
    'common.status_partial': '部分付款',
    'common.status_shipped': '已发货',
    'common.status_delivered': '已送达',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key.replace('common.', ''),
      i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
    }),
    withTranslation: () => (Component: any) => Component,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

describe('StatusChip — default behavior', () => {
  it('should render the canonical label from DEFAULT_STATUS_MAPPING', () => {
    render(<StatusChip status='pending' />);
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('should fall back to status string when status is not in mapping', () => {
    render(<StatusChip status='some_unknown_status' />);
    expect(screen.getByText('some_unknown_status')).toBeInTheDocument();
  });

  it('should prefer customLabel over mapping label', () => {
    render(
      <StatusChip
        status='approved'
        customLabel='审批通过 ✓'
      />
    );
    expect(screen.getByText('审批通过 ✓')).toBeInTheDocument();
  });
});

describe('StatusChip — variant / size prop', () => {
  it('should use "outlined" variant when mapping declares outlined (e.g. draft)', () => {
    render(<StatusChip status='draft' />);
    // MUI 的 outlined Chip 渲染 MuiChip-outlined class
    const chip = screen.getByText('草稿').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
    expect(chip!.className).toMatch(/MuiChip-outlined/);
  });

  it('should default to "filled" variant when mapping omits variant', () => {
    render(<StatusChip status='pending' />);
    const chip = screen.getByText('待处理').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
    expect(chip!.className).toMatch(/MuiChip-filled/);
  });

  it('should accept size="md" and render MuiChip-sizeMedium', () => {
    render(
      <StatusChip
        status='active'
        size='md'
      />
    );
    const chip = screen.getByText('活跃').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
    expect(chip!.className).toMatch(/MuiChip-sizeMedium/);
  });

  it('should default to size="sm" and render MuiChip-sizeSmall', () => {
    render(<StatusChip status='active' />);
    const chip = screen.getByText('活跃').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
    expect(chip!.className).toMatch(/MuiChip-sizeSmall/);
  });
});

describe('StatusChip — custom mapping / color override', () => {
  it('should prefer explicit color prop over default mapping color', () => {
    render(
      <StatusChip
        status='pending'
        color='primary'
      />
    );
    // pending 默认是 warning；强制为 primary 应覆盖
    const chip = screen.getByText('待处理').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
    expect(chip!.className).toMatch(/MuiChip-colorPrimary/);
  });

  it('should accept custom mapping for unknown status', () => {
    render(
      <StatusChip
        status='my_workflow_state'
        mapping={{ my_workflow_state: { color: 'info', label: '我的自定义' } }}
      />
    );
    expect(screen.getByText('我的自定义')).toBeInTheDocument();
  });
});

describe('StatusChip — DEFAULT_STATUS_MAPPING sanity', () => {
  it('should have at least 30 canonical status entries', () => {
    expect(Object.keys(DEFAULT_STATUS_MAPPING).length).toBeGreaterThanOrEqual(30);
  });

  it('should every entry have a non-empty label', () => {
    for (const [key, val] of Object.entries(DEFAULT_STATUS_MAPPING)) {
      expect(val.labelKey, `entry "${key}" must have a labelKey`).toBeTruthy();
      expect(typeof val.labelKey).toBe('string');
      expect(val.labelKey.length).toBeGreaterThan(0);
    }
  });
});
