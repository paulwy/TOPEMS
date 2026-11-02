import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import RelativeTime from '../RelativeTime';

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

// RelativeTime 现为 @topems/shared-components 的真实实现（此前是 stub）。
// 删除 stub 时代断言（组件名文本 / 恰好 1 div）；保留渲染不抛错 / 结构存在 / 可重复渲染。
describe('RelativeTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RelativeTime />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a root element', () => {
    const { container } = render(<RelativeTime />);
    expect(container.firstElementChild).not.toBeNull();
  });

  it('is a function component (no props required)', () => {
    expect(() => render(<RelativeTime />)).not.toThrow();
  });

  it('renders consistently on re-render', () => {
    const { unmount } = render(<RelativeTime />);
    unmount();
    expect(() => render(<RelativeTime />)).not.toThrow();
  });
});
