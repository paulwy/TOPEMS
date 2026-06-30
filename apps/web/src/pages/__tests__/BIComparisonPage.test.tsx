import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIComparisonPage from '../bi/BIComparisonPage';
import { getComparisonResult, runComparison } from '@/api/bi';
import { useAppStore } from '@/store';

vi.mock('@/api/bi');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        })
      : {
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        }
  ),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockComparisonResult = {
  success: true,
  data: {
    data: [
      {
        indicator: '销售额',
        value_a: 100000,
        value_b: 120000,
        difference: 20000,
        change_rate: 20,
      },
    ],
  },
};

describe('BIComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector
        ? selector({
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          })
        : {
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          }
    );
    (getComparisonResult as vi.Mock).mockResolvedValue(mockComparisonResult);
    (runComparison as vi.Mock).mockResolvedValue(mockComparisonResult);
  });

  it('should render page title', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getByText('对比分析')).toBeInTheDocument();
    });
  });

  it('should render comparison list', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getByText('销售额')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (getComparisonResult as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIComparisonPage />);

    await waitFor(() => {
      expect(screen.getByText('加载对比分析数据失败，请稍后重试')).toBeInTheDocument();
    });
  });
});
