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
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusChip, DEFAULT_STATUS_MAPPING } from '@/components/common/StatusChip';

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
      expect(val.label, `entry "${key}" must have a label`).toBeTruthy();
      expect(typeof val.label).toBe('string');
      expect(val.label.length).toBeGreaterThan(0);
    }
  });
});
