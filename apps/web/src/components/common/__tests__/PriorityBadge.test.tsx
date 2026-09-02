import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import PriorityBadge from '../PriorityBadge';

const i18nMap: Record<string, string> = {
  'common.status_urgent': '紧急',
  'common.status_critical': '严重',
  'common.status_p1': 'P1',
  'common.status_high': '高',
  'common.status_p2': 'P2',
  'common.status_medium': '中',
  'common.status_normal': '普通',
  'common.status_p3': 'P3',
  'common.status_low': '低',
  'common.status_p4': 'P4',
  'common.status_unknown': '未知',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => i18nMap[key] ?? key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('PriorityBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders priority text for urgent priority', () => {
    renderWithProviders(<PriorityBadge priority='urgent' />);
    expect(screen.getByText('紧急')).toBeInTheDocument();
  });

  it('renders different priority labels correctly', () => {
    const { rerender } = renderWithProviders(
      <PriorityBadge
        priority='high'
        showIcon={false}
      />
    );
    expect(screen.getByText('高')).toBeInTheDocument();

    rerender(
      <PriorityBadge
        priority='low'
        showIcon={false}
      />
    );
    expect(screen.getByText('低')).toBeInTheDocument();

    rerender(
      <PriorityBadge
        priority='medium'
        showIcon={false}
      />
    );
    expect(screen.getByText('中')).toBeInTheDocument();
  });

  it('applies error color for urgent priority', () => {
    renderWithProviders(<PriorityBadge priority='urgent' />);
    const chip = screen.getByText('紧急').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorError');
  });

  it('applies warning color for high priority', () => {
    renderWithProviders(<PriorityBadge priority='high' />);
    const chip = screen.getByText('高').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorWarning');
  });

  it('renders with size sm as small chip', () => {
    renderWithProviders(
      <PriorityBadge
        priority='urgent'
        size='sm'
      />
    );
    const chip = screen.getByText('紧急').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-sizeSmall');
  });

  it('renders with size md as medium chip', () => {
    renderWithProviders(
      <PriorityBadge
        priority='urgent'
        size='md'
      />
    );
    const chip = screen.getByText('紧急').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-sizeMedium');
  });

  it('renders custom label when provided', () => {
    renderWithProviders(
      <PriorityBadge
        priority='urgent'
        customLabel='自定义优先级'
        showIcon={false}
      />
    );
    expect(screen.getByText('自定义优先级')).toBeInTheDocument();
  });

  it('renders with custom mapping override', () => {
    renderWithProviders(
      <PriorityBadge
        priority='urgent'
        mapping={{ urgent: { label: '特急', color: 'error' } }}
        showIcon={false}
      />
    );
    expect(screen.getByText('特急')).toBeInTheDocument();
    const chip = screen.getByText('特急').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorError');
  });
});
