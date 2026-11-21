import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-utils';
import MobileTaskListPage from '../mobile/MobileTaskListPage';

describe('dbg', () => {
  it('dump', async () => {
    renderWithProviders(<MobileTaskListPage />);
    await new Promise((r) => setTimeout(r, 300));
    // eslint-disable-next-line no-console -- 调试辅助输出
    console.log(
      'TEXTS:',
      screen
        .getAllByText(/./)
        .map((e) => e.textContent)
        .slice(0, 30)
    );
  });
});
