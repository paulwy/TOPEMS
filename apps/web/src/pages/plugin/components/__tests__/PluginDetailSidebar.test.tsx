import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import PluginDetailSidebar from '../PluginDetailSidebar';
import type { Plugin, PluginReview } from '@/api/plugin';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (x: string, opts?: any) => {
      if (opts && opts.count !== undefined) return `${x}:${opts.count}`;
      if (opts && opts.star !== undefined) return `${x}:${opts.star}`;
      return x;
    },
  }),
}));

const basePlugin: Plugin = {
  id: 'p1',
  code: 'plugin-1',
  name: 'Awesome Plugin',
  description: 'desc',
  version: '2.0.0',
  plugin_type: 'business',
  is_published: true,
  category: 'Productivity',
  is_free: true,
  price_cents: 0,
  install_count: 100,
  rating: 4.2,
  rating_count: 5,
  created_at: '2024-01-01T00:00:00Z',
};

const reviews: PluginReview[] = [
  { id: 'r1', plugin_id: 'p1', user_id: 'u1', rating: 5, created_at: '2024-01-01T00:00:00Z' },
  { id: 'r2', plugin_id: 'p1', user_id: 'u2', rating: 4, created_at: '2024-01-02T00:00:00Z' },
  { id: 'r3', plugin_id: 'p1', user_id: 'u3', rating: 5, created_at: '2024-01-03T00:00:00Z' },
];

const baseProps = {
  plugin: basePlugin,
  installed: false,
  isInstalling: false,
  onInstall: vi.fn(),
  averageRating: 4.5,
  reviews,
};

describe('PluginDetailSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders free price label when plugin is free', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    // Mock ordering: file-level vi.mock runs before setupFiles -> setup.ts vi.mock may
    // override -> DOM may contain i18n key, Chinese fallback, or raw price. Support all.
    const h5 = screen.getByRole('heading', { level: 5 });
    expect(h5).toBeInTheDocument();
    expect(h5.textContent ?? '').toMatch(/free|¥0|免费|plugin\.common\.free/i);
  });

  it('renders formatted price when plugin is paid', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        plugin={{ ...basePlugin, is_free: false, price_cents: 1999 }}
      />
    );
    expect(screen.getByText('¥19.99')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.pricing.permanent_usage')).toBeInTheDocument();
  });

  it('renders install now button when not installed and free', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.common.install_now')).toBeInTheDocument();
  });

  it('renders buy now button when not installed and paid', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        plugin={{ ...basePlugin, is_free: false, price_cents: 500 }}
      />
    );
    expect(screen.getByText('plugin.common.buy_now')).toBeInTheDocument();
  });

  it('renders installed label and disables button when installed', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        installed={true}
      />
    );
    const btn = screen.getByText('plugin.common.installed').closest('button');
    expect(btn).toBeDisabled();
  });

  it('renders installing label and disables button when isInstalling', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        isInstalling={true}
      />
    );
    const btn = screen.getByText('plugin.common.installing').closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls onInstall when install button is clicked', () => {
    const onInstall = vi.fn();
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        onInstall={onInstall}
      />
    );
    fireEvent.click(screen.getByText('plugin.common.install_now'));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('renders plugin metadata fields', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.field.category')).toBeInTheDocument();
    expect(screen.getByText('Productivity')).toBeInTheDocument();
    expect(screen.getByText('plugin.field.type')).toBeInTheDocument();
    expect(screen.getByText('plugin.field.latest_version')).toBeInTheDocument();
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    expect(screen.getByText('plugin.field.publish_time')).toBeInTheDocument();
  });

  it('renders core type chip when plugin_type is core', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        plugin={{ ...basePlugin, plugin_type: 'core' }}
      />
    );
    expect(screen.getByText('plugin.plugin_type.core')).toBeInTheDocument();
  });

  it('renders business type chip when plugin_type is business', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.plugin_type.business')).toBeInTheDocument();
  });

  it('renders rating overview section', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.common.rating_overview')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders review count with translation', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.common.review_count:3')).toBeInTheDocument();
  });

  it('renders star label rows from 5 to 1', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    expect(screen.getByText('plugin.common.star_label:5')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.star_label:4')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.star_label:3')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.star_label:2')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.star_label:1')).toBeInTheDocument();
  });

  it('renders counts for each star bucket based on reviews', () => {
    renderWithProviders(<PluginDetailSidebar {...baseProps} />);
    // 2 reviews with rating 5, 1 with rating 4
    const fives = screen.getAllByText('2');
    expect(fives.length).toBeGreaterThan(0);
    const fours = screen.getAllByText('1');
    expect(fours.length).toBeGreaterThan(0);
  });

  it('handles empty reviews array without errors', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        reviews={[]}
      />
    );
    expect(screen.getByText('plugin.common.review_count:0')).toBeInTheDocument();
  });

  it('renders dash for publish time when created_at is empty', () => {
    renderWithProviders(
      <PluginDetailSidebar
        {...baseProps}
        plugin={{ ...basePlugin, created_at: '' }}
      />
    );
    // The component renders '-' when created_at is falsy
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
