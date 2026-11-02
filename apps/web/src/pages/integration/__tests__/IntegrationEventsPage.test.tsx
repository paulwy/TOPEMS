import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationEventsPage from '../IntegrationEventsPage';

// CrudPage 包装页：apiAdapter.list 为页面内硬编码空数组，不 import 任何 api 模块，
// 因此无需 mock api。schema title 走全局 i18n → 真实中文。
describe('IntegrationEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（事件日志）', () => {
    renderWithProviders(<IntegrationEventsPage />);
    expect(
      screen.getByRole('heading', { name: '事件日志' })
    ).toBeInTheDocument();
  });
});
