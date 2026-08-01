import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import PluginIntroTab from '../PluginIntroTab';
import type { Plugin } from '@/api/plugin';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

const basePlugin: Plugin = {
  id: 'p1',
  code: 'plugin-1',
  name: 'Awesome Plugin',
  description: 'A powerful business plugin.',
  version: '1.0.0',
  plugin_type: 'business',
  is_published: true,
  category: 'Productivity',
  tags: ['workflow', 'automation', 'api'],
  created_at: '2024-01-01T00:00:00Z',
};

describe('PluginIntroTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the plugin intro section title', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('plugin.detail_page.section.plugin_intro')).toBeInTheDocument();
  });

  it('renders the plugin description', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('A powerful business plugin.')).toBeInTheDocument();
  });

  it('renders the main features section title', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('plugin.detail_page.section.main_features')).toBeInTheDocument();
  });

  it('renders all six feature items', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('plugin.detail_page.feature.business_flow')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.feature.flexible_config')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.feature.rich_api')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.feature.multi_platform')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.feature.data_security')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.feature.continuous_update')).toBeInTheDocument();
  });

  it('renders the tags section title', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('plugin.detail_page.section.tags')).toBeInTheDocument();
  });

  it('renders tags as chips', () => {
    renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    expect(screen.getByText('workflow')).toBeInTheDocument();
    expect(screen.getByText('automation')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
  });

  it('renders a check icon for each feature', () => {
    const { container } = renderWithProviders(<PluginIntroTab plugin={basePlugin} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(6);
  });

  it('renders without tags when tags array is undefined', () => {
    const { container } = renderWithProviders(
      <PluginIntroTab plugin={{ ...basePlugin, tags: undefined }} />
    );
    expect(screen.getByText('plugin.detail_page.section.tags')).toBeInTheDocument();
    // No tag chips rendered
    const chips = container.querySelectorAll('.MuiChip-root');
    expect(chips.length).toBe(0);
  });
});
