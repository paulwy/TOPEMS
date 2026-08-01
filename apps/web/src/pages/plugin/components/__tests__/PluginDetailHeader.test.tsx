import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import PluginDetailHeader from '../PluginDetailHeader';
import type { Plugin } from '@/api/plugin';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (x: string, opts?: any) => {
      if (opts && opts.count !== undefined) return `${x}:${opts.count}`;
      return x;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const basePlugin: Plugin = {
  id: 'p1',
  code: 'plugin-1',
  name: 'Awesome Plugin',
  description: 'A very useful plugin',
  version: '1.2.3',
  plugin_type: 'business',
  is_published: true,
  category: 'Productivity',
  install_count: 1234,
  rating: 4.5,
  rating_count: 10,
  author_name: 'Author Jane',
  is_featured: false,
  tags: ['tag1'],
  created_at: '2024-01-01T00:00:00Z',
};

const baseProps = {
  plugin: basePlugin,
  averageRating: 4.5,
  reviewsCount: 10,
  healthStatusValue: null,
};

describe('PluginDetailHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the plugin name', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('Awesome Plugin')).toBeInTheDocument();
  });

  it('renders the plugin description', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('A very useful plugin')).toBeInTheDocument();
  });

  it('renders version chip', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('renders back to marketplace button', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('plugin.detail_page.back_to_market')).toBeInTheDocument();
  });

  it('renders install count with translated label', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('plugin.detail_page.install_count:1,234')).toBeInTheDocument();
  });

  it('renders author name', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.getByText('Author Jane')).toBeInTheDocument();
  });

  it('does not render featured chip when is_featured is false', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.queryByText('plugin.common.featured')).not.toBeInTheDocument();
  });

  it('renders featured chip when is_featured is true', () => {
    renderWithProviders(
      <PluginDetailHeader
        {...baseProps}
        plugin={{ ...basePlugin, is_featured: true }}
      />
    );
    expect(screen.getByText('plugin.common.featured')).toBeInTheDocument();
  });

  it('does not render health status chip when healthStatusValue is null', () => {
    renderWithProviders(<PluginDetailHeader {...baseProps} />);
    expect(screen.queryByText('plugin.status.running')).not.toBeInTheDocument();
    expect(screen.queryByText('plugin.status.unhealthy')).not.toBeInTheDocument();
  });

  it('renders healthy status chip when healthStatusValue.healthy is true', () => {
    renderWithProviders(
      <PluginDetailHeader
        {...baseProps}
        healthStatusValue={{ healthy: true }}
      />
    );
    expect(screen.getByText('plugin.status.running')).toBeInTheDocument();
  });

  it('renders unhealthy status chip when healthStatusValue.healthy is false', () => {
    renderWithProviders(
      <PluginDetailHeader
        {...baseProps}
        healthStatusValue={{ healthy: false }}
      />
    );
    expect(screen.getByText('plugin.status.unhealthy')).toBeInTheDocument();
  });

  it('renders unknown author fallback when author_name is empty', () => {
    renderWithProviders(
      <PluginDetailHeader
        {...baseProps}
        plugin={{ ...basePlugin, author_name: '' }}
      />
    );
    expect(screen.getByText('plugin.common.unknown_author')).toBeInTheDocument();
  });
});
