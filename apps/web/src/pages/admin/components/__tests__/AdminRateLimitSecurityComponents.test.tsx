import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RateLimitDimensionCard from '../RateLimitDimensionCard';
import RateLimitPathRules from '../RateLimitPathRules';
import AntiReplayConfigPanel from '../AntiReplayConfigPanel';
import type { AntiReplayConfig, PathRule, RateLimitRule } from '../../hooks/useRateLimitConfig';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid='alert-circle-icon' />,
  Plus: () => <span data-testid='plus-icon' />,
  Save: () => <span data-testid='save-icon' />,
  Trash2: () => <span data-testid='trash-icon' />,
}));

describe('RateLimitDimensionCard', () => {
  it('renders dimension metadata and emits rule field updates', () => {
    const onUpdateRule = vi.fn();
    const rule: RateLimitRule = {
      requests: 500,
      window_secs: 60,
      priority: 3,
    };

    render(
      <RateLimitDimensionCard
        dimKey='user_default'
        title='用户维度'
        icon={<span data-testid='dimension-icon' />}
        color='#1976d2'
        description='按用户标识限流'
        rule={rule}
        onUpdateRule={onUpdateRule}
      />
    );

    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.allowed_requests'), {
      target: { value: '800' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.time_window'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.priority'), {
      target: { value: '7' },
    });

    expect(screen.getByText('用户维度')).toBeInTheDocument();
    expect(screen.getByText('按用户标识限流')).toBeInTheDocument();
    expect(screen.getByTestId('dimension-icon')).toBeInTheDocument();
    expect(onUpdateRule).toHaveBeenCalledWith('user_default', 'requests', 800);
    expect(onUpdateRule).toHaveBeenCalledWith('user_default', 'window_secs', 120);
    expect(onUpdateRule).toHaveBeenCalledWith('user_default', 'priority', 7);
  });

  it('normalizes empty number inputs to safe default values', () => {
    const onUpdateRule = vi.fn();

    render(
      <RateLimitDimensionCard
        dimKey='ip_default'
        title='IP 维度'
        icon={<span />}
        color='#2e7d32'
        description='按访问来源限流'
        rule={{ requests: 100, window_secs: 30, priority: 1 }}
        onUpdateRule={onUpdateRule}
      />
    );

    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.allowed_requests'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.time_window'), {
      target: { value: '' },
    });

    expect(onUpdateRule).toHaveBeenCalledWith('ip_default', 'requests', 0);
    expect(onUpdateRule).toHaveBeenCalledWith('ip_default', 'window_secs', 1);
  });
});

describe('RateLimitPathRules', () => {
  it('renders empty path rules state and emits new rule changes', () => {
    const setNewPath = vi.fn();
    const setNewPathRequests = vi.fn();
    const setNewPathWindow = vi.fn();
    const onAddPath = vi.fn();

    render(
      <RateLimitPathRules
        path_rules={[]}
        newPath='/api/core/iam'
        setNewPath={setNewPath}
        newPathRequests={200}
        setNewPathRequests={setNewPathRequests}
        newPathWindow={60}
        setNewPathWindow={setNewPathWindow}
        onAddPath={onAddPath}
        onRemovePath={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.path_prefix'), {
      target: { value: '/api/core/hrm' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.request_count'), {
      target: { value: '350' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.window_seconds'), {
      target: { value: '' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.rate_limit_config_page.text_49818f' })
    );

    expect(screen.getByText('admin.rate_limit_config_page.text_d6bf27')).toBeInTheDocument();
    expect(screen.getByText('admin.rate_limit_config_page.text_4cb561')).toBeInTheDocument();
    expect(setNewPath).toHaveBeenCalledWith('/api/core/hrm');
    expect(setNewPathRequests).toHaveBeenCalledWith(350);
    expect(setNewPathWindow).toHaveBeenCalledWith(1);
    expect(onAddPath).toHaveBeenCalledTimes(1);
  });

  it('renders existing path rules and delegates remove action', () => {
    const onRemovePath = vi.fn();
    const rules: PathRule[] = [
      {
        path: '/api/core/finance',
        rule: { requests: 120, window_secs: 30, priority: 0 },
      },
      {
        path: '/api/core/wms',
        rule: { requests: 240, window_secs: 60, priority: 0 },
      },
    ];

    render(
      <RateLimitPathRules
        path_rules={rules}
        newPath=''
        setNewPath={vi.fn()}
        newPathRequests={200}
        setNewPathRequests={vi.fn()}
        newPathWindow={60}
        setNewPathWindow={vi.fn()}
        onAddPath={vi.fn()}
        onRemovePath={onRemovePath}
      />
    );

    const financeRow = screen.getByText('/api/core/finance').closest('tr') as HTMLTableRowElement;
    fireEvent.click(within(financeRow).getByRole('button', { name: '删除' }));

    expect(screen.getByText('/api/core/finance')).toBeInTheDocument();
    expect(screen.getByText('/api/core/wms')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(onRemovePath).toHaveBeenCalledWith('/api/core/finance');
  });
});

describe('AntiReplayConfigPanel', () => {
  const antiReplay: AntiReplayConfig = {
    enabled: true,
    tolerance_secs: 300,
    nonce_cache_secs: 600,
    timestamp_header: 'X-Request-Timestamp',
    nonce_header: 'X-Request-Nonce',
    enforce_paths: ['/api/core/finance', '/api/core/wms'],
  };

  it('renders anti replay config and emits field changes', () => {
    let nextAntiReplay = antiReplay;
    const setAntiReplay = vi.fn((updater: React.SetStateAction<AntiReplayConfig>) => {
      nextAntiReplay = typeof updater === 'function' ? updater(nextAntiReplay) : updater;
    });
    const setNewEnforcePath = vi.fn();

    render(
      <AntiReplayConfigPanel
        antiReplay={antiReplay}
        setAntiReplay={setAntiReplay}
        newEnforcePath='/api/core/hrm'
        setNewEnforcePath={setNewEnforcePath}
        onAddEnforcePath={vi.fn()}
        onRemoveEnforcePath={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config_page.attr_3d3dbd'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config_page.attr_cbecae'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config_page.attr_bfe154'), {
      target: { value: 'X-Timestamp' },
    });
    fireEvent.change(screen.getByLabelText('nonce Header'), {
      target: { value: 'X-Nonce' },
    });
    fireEvent.change(screen.getByPlaceholderText('/api/core/finance'), {
      target: { value: '/api/core/crm' },
    });

    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    expect(screen.getByText('admin.rate_limit_config_page.text_209207')).toBeInTheDocument();
    expect(screen.getByText('/api/core/finance')).toBeInTheDocument();
    expect(setAntiReplay).toHaveBeenCalledTimes(5);
    expect(nextAntiReplay).toEqual({
      ...antiReplay,
      enabled: false,
      tolerance_secs: 120,
      nonce_cache_secs: 0,
      timestamp_header: 'X-Timestamp',
      nonce_header: 'X-Nonce',
    });
    expect(setNewEnforcePath).toHaveBeenCalledWith('/api/core/crm');
  });

  it('adds, removes and saves enforce path configuration', () => {
    const onAddEnforcePath = vi.fn();
    const onRemoveEnforcePath = vi.fn();
    const onSave = vi.fn();

    const { container } = render(
      <AntiReplayConfigPanel
        antiReplay={antiReplay}
        setAntiReplay={vi.fn()}
        newEnforcePath=''
        setNewEnforcePath={vi.fn()}
        onAddEnforcePath={onAddEnforcePath}
        onRemoveEnforcePath={onRemoveEnforcePath}
        onSave={onSave}
        isSaving={false}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.rate_limit_config_page.text_b58c75' })
    );
    fireEvent.click(container.querySelector('.MuiChip-deleteIcon') as Element);
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.rate_limit_config_page.text_f699f0' })
    );

    expect(onAddEnforcePath).toHaveBeenCalledTimes(1);
    expect(onRemoveEnforcePath).toHaveBeenCalledWith('/api/core/finance');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables save while anti replay configuration is saving', () => {
    render(
      <AntiReplayConfigPanel
        antiReplay={{ ...antiReplay, enabled: false, enforce_paths: [] }}
        setAntiReplay={vi.fn()}
        newEnforcePath=''
        setNewEnforcePath={vi.fn()}
        onAddEnforcePath={vi.fn()}
        onRemoveEnforcePath={vi.fn()}
        onSave={vi.fn()}
        isSaving
      />
    );

    expect(
      screen.getByRole('button', { name: 'admin.rate_limit_config_page.text_f699f0' })
    ).toBeDisabled();
  });
});
