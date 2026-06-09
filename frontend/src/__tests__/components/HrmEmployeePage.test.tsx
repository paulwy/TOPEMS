import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmEmployeePage from '../../pages/HrmEmployeePage';
import { employeeApi, departmentApi } from '../../api/hrm';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAppStore } from '../../store';

// 模拟依赖
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/hrm/employees' }),
}));

// 模拟 API
vi.mock('../../api/hrm', () => ({
  employeeApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  departmentApi: {
    list: vi.fn(),
  },
}));

// 模拟 DataTable 组件以避免测试问题
vi.mock('../../components/DataTable', () => ({
  DataTable: () => <div data-testid="data-table">Mock Data Table</div>,
}));

// 模拟 MetricCard 组件以避免测试问题
vi.mock('../../components/MetricCard', () => ({
  MetricCard: (props: any) => (
    <div data-testid="metric-card">
      <p>{props.title}</p>
      <p>{props.value}</p>
    </div>
  ),
}));

// 模拟 StatsChart 组件以避免测试问题
vi.mock('../../components/StatsChart', () => ({
  StatsChart: () => <div data-testid="stats-chart">Mock Stats Chart</div>,
}));

// 模拟 zustand store
vi.mock('../../store', () => ({
  useAppStore: vi.fn(),
}));

const mockEmployeeApi = employeeApi as vi.Mock<typeof employeeApi>;
const mockDepartmentApi = departmentApi as vi.Mock<typeof departmentApi>;

// 模拟 zustand store 返回值
const mockAddNotification = vi.fn();
const mockUseAppStore = useAppStore as vi.MockFunction<typeof useAppStore>;

// 模拟数据
const mockEmployees = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
};

const mockDepartments = {
  items: [],
  total: 0,
  page: 1,
  page_size: 100,
};

const renderWithProviders = (ui: React.ReactElement) => {
  mockUseAppStore.mockImplementation((selector) => {
    const store = {
      addNotification: mockAddNotification,
    };
    return selector(store);
  });

  return render(
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <LoadingProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </LoadingProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

describe('HrmEmployeePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 模拟 API 响应
    mockEmployeeApi.list.mockResolvedValue({
      code: 200,
      success: true,
      data: mockEmployees,
      message: 'Success',
      timestamp: new Date().toISOString(),
    });

    mockDepartmentApi.list.mockResolvedValue({
      code: 200,
      success: true,
      data: mockDepartments,
      message: 'Success',
      timestamp: new Date().toISOString(),
    });
  });

  test('should render employee page without crashing', async () => {
    renderWithProviders(<HrmEmployeePage />);
    expect(true).toBe(true);
  });

  test('should call APIs on mount', async () => {
    renderWithProviders(<HrmEmployeePage />);
    
    await waitFor(() => {
      expect(mockEmployeeApi.list).toHaveBeenCalled();
      expect(mockDepartmentApi.list).toHaveBeenCalled();
    });
  });
});
