import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import UserSelect from '../UserSelect';

// UserSelect 现为 @topems/shared-components 的真实实现（此前是 stub 空 div）。
// 保留集成级断言：渲染不抛错 + 可点击；删除 stub 时代断言（组件名文本 / 恰好 1 div）。
describe('UserSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<UserSelect />);
    expect(container.firstElementChild).not.toBeNull();
  });

  it('renders a div element', () => {
    const { container } = renderWithProviders(<UserSelect />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('does not crash when clicked', () => {
    const { container } = renderWithProviders(<UserSelect />);
    const el = container.firstElementChild;
    expect(() => fireEvent.click(el as Element)).not.toThrow();
  });
});
