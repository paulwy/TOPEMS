import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QMSAuditPage from '../qms/QMSAuditPage';
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

const mockAudits = [
  {
    id: 'AD001',
    audit_no: 'AD-2024-001',
    audit_type: 'internal',
    audit_scope: '质量管理体系',
    status: 'completed',
    auditor: '王五',
    audit_date: '2024-01-15',
  },
];

describe('QMSAuditPage', () => {
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
    (qmsApi.listAudits as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAudits,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QMSAuditPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QMSAuditPage />);
    await waitFor(() => {
      expect(screen.getByText('质量审核')).toBeInTheDocument();
    });
  });

  it('should render audit table', async () => {
    renderWithProviders(<QMSAuditPage />);
    await waitFor(() => {
      expect(screen.getByText('AD-2024-001')).toBeInTheDocument();
      expect(screen.getByText('质量管理体系')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QMSAuditPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '质量管理' } });
    });
  });

  it('should handle create audit', async () => {
    (qmsApi.createAudit as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QMSAuditPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createAudit).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listAudits as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QMSAuditPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
