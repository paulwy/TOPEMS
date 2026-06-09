import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AssetManagementPage from '../../pages/AssetManagementPage';

vi.mock('../../api/erp', () => ({
  assetApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../api/hrm', () => ({
  employeeApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
  },
}));

vi.mock('../../store', () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
}));

vi.mock('../../components/DataTable', () => ({
  DataTable: () => <div data-testid="data-table">Mock Data Table</div>,
}));

vi.mock('../../components/ModeToggle', () => ({
  ModeToggle: () => <button data-testid="mode-toggle">Toggle</button>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('AssetManagementPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<AssetManagementPage />);
    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<AssetManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('资产管理')).toBeInTheDocument();
    });
  });

  test('renders add asset button', async () => {
    renderWithProviders(<AssetManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增资产/i });
      expect(addButton).toBeInTheDocument();
    });
  });
});
