import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsAuditManagementPage from '../qms/QmsAuditManagementPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

const mockAudits = [
  {
    id: 'AU001',
    audit_no: 'AU-2024-001',
    audit_type: 'internal',
    audit_scope: '生产车间',
    status: 'completed',
    auditor: '张三',
  },
];

describe('QmsAuditManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (qmsApi.listAudits as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAudits,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('审核管理')).toBeInTheDocument();
    });
  });

  it('should render audit table', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('AU-2024-001')).toBeInTheDocument();
      expect(screen.getByText('生产车间')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '生产车间' } });
    });
  });

  it('should handle create audit', async () => {
    (qmsApi.createAudit as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createAudit).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (qmsApi.listAudits as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});