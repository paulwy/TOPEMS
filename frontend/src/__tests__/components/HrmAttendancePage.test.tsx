import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmAttendancePage from '../../pages/HrmAttendancePage';

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
  MetricCard: ({ title, value }: { title: string; value: number | string }) => (
    <div data-testid={`metric-${title}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
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

describe('HrmAttendancePage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<HrmAttendancePage />);
    await waitFor(() => {
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<HrmAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText('考勤管理')).toBeInTheDocument();
    });
  });

  test('renders attendance records table', async () => {
    renderWithProviders(<HrmAttendancePage />);
    await waitFor(() => {
      expect(screen.getByText('员工姓名')).toBeInTheDocument();
    });
  });
});
