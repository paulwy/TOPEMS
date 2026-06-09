import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CustomerManagementPage from '../../pages/CustomerManagementPage';

vi.mock('../../api/crm', () => ({
  crmApi: {
    customers: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      }),
      create: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      batchDelete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

vi.mock('../../store', () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
}));

vi.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../../components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">Empty</div>,
}));

vi.mock('../../components/ImportExportModal', () => ({
  ImportExportModal: () => <div data-testid="import-export-modal">Modal</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CustomerManagementPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('客户管理')).toBeInTheDocument();
    });
  });

  test('renders search input', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('搜索客户名称或代码...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  test('renders add customer button', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增客户/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  test('opens add customer dialog', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增客户/i });
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      const dialogTitles = screen.getAllByText('新增客户');
      expect(dialogTitles.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('opens import export modal', async () => {
    renderWithProviders(<CustomerManagementPage />);
    await waitFor(() => {
      const importExportButton = screen.getByRole('button', { name: /导入导出/i });
      fireEvent.click(importExportButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('import-export-modal')).toBeInTheDocument();
    });
  });
});
