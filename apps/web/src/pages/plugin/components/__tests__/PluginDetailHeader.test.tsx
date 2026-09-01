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
});
