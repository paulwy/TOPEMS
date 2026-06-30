import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QMSQualityStandardPage from '../qms/QMSQualityStandardPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }) : {
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

const mockStandards = [
  {
    id: 'QS001',
    standard_no: 'QS-2024-001',
    standard_name: 'ISO 9001标准',
    category: 'international',
    status: 'active',
    version: 'V1.0',
  },
];

describe('QMSQualityStandardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector ? selector({
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }) : {
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }
    );
    (qmsApi.listStandards as vi.Mock).mockResolvedValue({
      success: true,
      data: mockStandards,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QMSQualityStandardPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QMSQualityStandardPage />);
    await waitFor(() => {
      expect(screen.getByText('质量标准')).toBeInTheDocument();
    });
  });

  it('should render standard table', async () => {
    renderWithProviders(<QMSQualityStandardPage />);
    await waitFor(() => {
      expect(screen.getByText('QS-2024-001')).toBeInTheDocument();
      expect(screen.getByText('ISO 9001标准')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QMSQualityStandardPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: 'ISO' } });
    });
  });

  it('should handle create standard', async () => {
    (qmsApi.createStandard as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QMSQualityStandardPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createStandard).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listStandards as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QMSQualityStandardPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
