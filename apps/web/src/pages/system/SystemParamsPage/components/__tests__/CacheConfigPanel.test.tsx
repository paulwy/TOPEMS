import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import CacheConfigPanel from '../CacheConfigPanel';

vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => {
  const icon =
    (name: string) =>
    ({ size: _size }: { size?: number }) => <svg data-testid={`icon-${name}`} />;

  return {
    Database: icon('database'),
    Save: icon('save'),
    Trash2: icon('trash'),
  };
});

const cacheConfig = {
  enabled: true,
  provider: 'redis' as const,
  redis_host: '127.0.0.1',
  redis_port: 6379,
  redis_db: 0,
  default_ttl_seconds: 3600,
  max_memory_mb: 512,
  compression_enabled: false,
  cache_prefix: 'topems:',
};

describe('CacheConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cache statistics and triggers clear/save actions', () => {
    const onSave = vi.fn();
    const onClearCache = vi.fn();

    renderWithProviders(
      <CacheConfigPanel
        cacheConfig={cacheConfig}
        setCacheConfig={vi.fn()}
        onSave={onSave}
        isSaving={false}
        cacheStats={{ keys_count: 1200, memory_used_mb: 42.35, hit_rate: 0.873 }}
        isLoadingStats={false}
        onClearCache={onClearCache}
        isClearingCache={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /清除缓存/ }));
    fireEvent.click(screen.getByRole('button', { name: /保存配置/ }));

    expect(screen.getByText('缓存状态')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('42.35')).toBeInTheDocument();
    expect(screen.getByText('87.3')).toBeInTheDocument();
    expect(screen.getByText('Redis 连接配置')).toBeInTheDocument();
    expect(onClearCache).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('updates cache settings through switches, selects and inputs', () => {
    const setCacheConfig = vi.fn();

    renderWithProviders(
      <CacheConfigPanel
        cacheConfig={cacheConfig}
        setCacheConfig={setCacheConfig}
        onSave={vi.fn()}
        isSaving={false}
        cacheStats={{ keys_count: 1, memory_used_mb: 1, hit_rate: 0.5 }}
        isLoadingStats={false}
        onClearCache={vi.fn()}
        isClearingCache={false}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: '启用缓存' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: '内存' }));
    fireEvent.change(screen.getByLabelText('缓存前缀'), { target: { value: 'ems:' } });
    fireEvent.change(screen.getByLabelText('Redis 端口'), { target: { value: '6380' } });
    fireEvent.click(screen.getByRole('switch', { name: '启用压缩' }));

    expect(setCacheConfig).toHaveBeenCalledTimes(5);
    expect(screen.getByLabelText('缓存前缀')).toBeInTheDocument();
    expect(screen.getByLabelText('Redis 端口')).toBeInTheDocument();
  });

  it('renders loading, disabled and missing stats states', () => {
    const { container, rerender } = renderWithProviders(
      <CacheConfigPanel
        cacheConfig={cacheConfig}
        setCacheConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        cacheStats={null}
        isLoadingStats
        onClearCache={vi.fn()}
        isClearingCache={false}
      />
    );

    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

    rerender(
      <CacheConfigPanel
        cacheConfig={{ ...cacheConfig, enabled: false }}
        setCacheConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving
        cacheStats={null}
        isLoadingStats={false}
        onClearCache={vi.fn()}
        isClearingCache
      />
    );

    expect(screen.getByText('缓存未启用，请先启用缓存功能')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /清除中/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();

    rerender(
      <CacheConfigPanel
        cacheConfig={cacheConfig}
        setCacheConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        cacheStats={undefined}
        isLoadingStats={false}
        onClearCache={vi.fn()}
        isClearingCache={false}
      />
    );

    expect(screen.getByText('无法获取缓存统计信息')).toBeInTheDocument();
  });
});
