import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmDepartmentPage from '../../pages/HrmDepartmentPage';

vi.mock('../../api/hrm', () => ({
  departmentApi: {
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
  companyApi: {
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

vi.mock('../../components/HrmLayout', () => ({
  HrmLayout: ({ children }: { children: React.ReactNode }) => <div data-testid='hrm-layout'>{children}</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('HrmDepartmentPage', () => {
  test('renders without crashing', async () => {
    renderWithProviders(<HrmDepartmentPage />);
    await waitFor(() => {
      expect(screen.getByTestId('hrm-layout')).toBeInTheDocument();
    });
  });

  test('renders header with title', async () => {
    renderWithProviders(<HrmDepartmentPage />);
    await waitFor(() => {
      expect(screen.getByText('部门管理')).toBeInTheDocument();
    });
  });

  test('renders search input', async () => {
    renderWithProviders(<HrmDepartmentPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('搜索部门...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  test('renders add department button', async () => {
    renderWithProviders(<HrmDepartmentPage />);
    await waitFor(() => {
      const addButtons = screen.getAllByRole('button', { name: /新增部门/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  test('shows empty state when no departments', async () => {
    renderWithProviders(<HrmDepartmentPage />);
    await waitFor(() => {
      expect(screen.getByText('暂无部门数据')).toBeInTheDocument();
    });
  });
});
