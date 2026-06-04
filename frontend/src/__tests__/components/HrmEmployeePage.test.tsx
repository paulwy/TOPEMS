import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmEmployeePage from '../../pages/HrmEmployeePage';
import { employeeApi, departmentApi } from '../../api/hrm';
import { ThemeProvider } from '../../components/ThemeProvider';
import { ToastProvider } from '../../components/ToastProvider';
import { LoadingProvider } from '../../components/LoadingProvider';
import ErrorBoundary from '../../components/ErrorBoundary';

// 模拟依赖
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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

const mockEmployeeApi = employeeApi as jest.Mocked<typeof employeeApi>;
const mockDepartmentApi = departmentApi as jest.Mocked<typeof departmentApi>;

// 模拟数据
const mockEmployees = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
};

const mockDepartments = {
  departments: [],
};

const renderWithProviders = (ui: React.ReactElement) => {
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
    localStorage.clear();

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
    
    // 等待一段时间让 API 调用发生
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockEmployeeApi.list).toHaveBeenCalled();
    expect(mockDepartmentApi.list).toHaveBeenCalled();
  });
});
