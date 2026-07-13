import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { TabPanel } from '../TabPanel';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('TabPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when active', () => {
    render(
      <TabPanel
        value={0}
        index={0}
      >
        <div data-testid='tab-content'>面板内容</div>
      </TabPanel>
    );
    expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    expect(screen.getByText('面板内容')).toBeInTheDocument();
  });

  it('does not render children when inactive', () => {
    render(
      <TabPanel
        value={1}
        index={0}
      >
        <div data-testid='tab-content'>面板内容</div>
      </TabPanel>
    );
    // When value !== index, TabPanel returns null
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
    expect(screen.queryByText('面板内容')).not.toBeInTheDocument();
  });

  it('has role="tabpanel" and correct aria attributes', () => {
    render(
      <TabPanel
        value={0}
        index={0}
      >
        <div>内容</div>
      </TabPanel>
    );
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toBeInTheDocument();
    expect(tabpanel).toHaveAttribute('id', 'tabpanel-0');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-0');
  });

  it('renders loading skeleton when loading is true', () => {
    render(
      <TabPanel
        value={0}
        index={0}
        loading
      >
        <div data-testid='tab-content'>面板内容</div>
      </TabPanel>
    );
    // Loading state should show skeletons, not children
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty message when no children and emptyMessage provided', () => {
    render(
      <TabPanel
        value={0}
        index={0}
        emptyMessage='暂无数据'
      >
        {undefined}
      </TabPanel>
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders nothing when inactive with loading prop', () => {
    render(
      <TabPanel
        value={1}
        index={0}
        loading
      >
        <div>内容</div>
      </TabPanel>
    );
    // Even with loading, inactive tab should return null
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });
});
