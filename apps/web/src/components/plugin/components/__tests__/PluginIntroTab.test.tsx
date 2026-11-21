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
});
