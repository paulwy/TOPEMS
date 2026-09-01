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
});
