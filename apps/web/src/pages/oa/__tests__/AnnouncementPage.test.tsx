import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import AnnouncementPage from '../AnnouncementPage';

vi.mock('@/api/erp/core', () => ({
  announcementApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [],
        total: 0,
      },
    }),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    language: 'zh',
    on: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
  },
}));

describe('AnnouncementPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AnnouncementPage />);
    // 如果页面能渲染，测试就通过
    expect(true).toBe(true);
  });
});
