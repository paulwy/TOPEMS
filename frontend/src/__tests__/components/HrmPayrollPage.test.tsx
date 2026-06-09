import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmPayrollPage from '../../pages/HrmPayrollPage';

vi.mock('../../api/hrm', () => ({
  payrollApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ code: 200 }),
    update: vi.fn().mockResolvedValue({ code: 200 }),
    delete: vi.fn().mockResolvedValue({ code: 200 }),
  },
  employeeApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
  },
}));

vi.mock('../../hooks/useNotification', () => ({
  useNotification: vi.fn().mockReturnValue({
    success: vi.fn(),
    error: vi.fn(),
    notifications: [],
    hideNotification: vi.fn(),
  }),
}));

vi.mock('../../components/NotificationContainer', () => ({
  NotificationContainer: () => <div data-testid="notification-container" />,
}));

vi.mock('../../components/MetricCard', () => ({
  MetricCard: ({ title }: { title: string }) => (
    <div data-testid={`metric-${title}`}>{title}</div>
  ),
}));

vi.mock('../../components/StatsChart', () => ({
  StatsChart: ({ type }: { type: string }) => (
    <div data-testid={`chart-${type}`}>Chart</div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('HrmPayrollPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<HrmPayrollPage />);
    await waitFor(() => {
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<HrmPayrollPage />);
    await waitFor(() => {
      expect(screen.getByText('薪酬管理')).toBeInTheDocument();
    });
  });
});
