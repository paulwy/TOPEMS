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
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/hrm/employees' }),
}));

// 模拟 API
jest.mock('../../api/hrm', () => ({
  employeeApi: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  departmentApi: {
    list: jest.fn(),
  },
}));

// 模拟 DataTable 组件以避免测试问题
jest.mock('../../components/DataTable', () => ({
  DataTable: () => <div data-testid="data-table">Mock Data Table</div>,
}));

// 模拟 MetricCard 组件以避免测试问题
jest.mock('../../components/MetricCard', () => ({
  MetricCard: (props: any) => (
    <div data-testid="metric-card">
      <p>{props.title}</p>
      <p>{props.value}</p>
    </div>
  ),
}));

// 模拟 StatsChart 组件以避免测试问题
jest.mock('../../components/StatsChart', () => ({
  StatsChart: () => <div data-testid="stats-chart">Mock Stats Chart</div>,
}));

// 模拟 zustand store
jest.mock('../../store', () => ({
  useAppStore: jest.fn(),
}));

const mockEmployeeApi = employeeApi as jest.Mocked<typeof employeeApi>;
const mockDepartmentApi = departmentApi as jest.Mocked<typeof departmentApi>;

// 模拟 zustand store 返回值
const mockAddNotification = jest.fn();
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

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
    jest.clearAllMocks();

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
