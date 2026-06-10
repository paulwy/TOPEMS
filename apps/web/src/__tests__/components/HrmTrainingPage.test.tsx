import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmTrainingPage from '../../pages/HrmTrainingPage';

vi.mock('../../api/hrm', () => ({
  trainingPlanApi: {
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

vi.mock('../../store', () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('HrmTrainingPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<HrmTrainingPage />);
    await waitFor(() => {
      expect(screen.getByText('培训管理')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<HrmTrainingPage />);
    await waitFor(() => {
      expect(screen.getByText('培训管理')).toBeInTheDocument();
    });
  });
});
