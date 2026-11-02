import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import ProgressBar from '../ProgressBar';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: unknown) =>
    selector ? selector({ user: null }) : { user: null }
  ),
}));

// ProgressBar 现为 @topems/shared-components 的真实实现（此前是 stub）。
// 删除 stub 时代断言（组件名文本）；保留渲染不抛错 / 结构存在 / 可重复渲染。
describe('ProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ProgressBar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = render(<ProgressBar />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('is a function component (no props required)', () => {
    expect(() => render(<ProgressBar />)).not.toThrow();
  });

  it('renders consistently on multiple renders', () => {
    const { unmount: u1 } = render(<ProgressBar />);
    u1();
    expect(() => render(<ProgressBar />)).not.toThrow();
  });
});
