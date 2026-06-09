import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VehicleManagementPage from '../../pages/VehicleManagementPage';

vi.mock('../../api/erp', () => ({
  vehicleApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  vehicleRequestApi: {
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
  DataTable: () => <div data-testid='data-table'>Mock Data Table</div>,
}));

vi.mock('../../components/ModeToggle', () => ({
  ModeToggle: () => <button data-testid='mode-toggle'>Toggle</button>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('VehicleManagementPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<VehicleManagementPage />);
    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<VehicleManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('车辆管理')).toBeInTheDocument();
    });
  });
});
