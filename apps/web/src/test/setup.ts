/**
 * 统一的测试配置文件
 * 解决以下常见问题：
 * 1. useAppStore mock 不正确
 * 2. vi.useFakeTimers() 导致异步超时
 * 3. 重复的 mock 设置
 */

import { vi } from 'vitest';

export const defaultStoreState = {
  user: null,
  theme: 'light' as const,
  notifications: [],
  sidebarCollapsed: false,
  language: 'zh-CN',
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  clearNotifications: vi.fn(),
  setTheme: vi.fn(),
  setLanguage: vi.fn(),
  toggleSidebar: vi.fn(),
};

export const mockApiResponse = <T>(data: T) => ({
  success: true,
  data,
  message: undefined,
  code: undefined,
});

export const mockApiError = (message: string, code = 500) => ({
  success: false,
  data: null,
  message,
  code,
});

export const createMockStore = (overrides = {}) => ({
  ...defaultStoreState,
  ...overrides,
});

export const setupAppStoreMock = (state = defaultStoreState) => {
  return vi.fn((selector?: any) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  });
};

export const setupApiMocks = (
  apiModule: Record<string, any>,
  mocks: Record<string, any>
) => {
  Object.entries(mocks).forEach(([key, value]) => {
    if (apiModule[key]) {
      apiModule[key] = vi.fn().mockResolvedValue(value);
    }
  });
};

export const disableFakeTimers = () => {
  vi.useRealTimers();
};

export const createBeforeEach = (storeState = defaultStoreState) => {
  return () => {
    vi.clearAllMocks();
    vi.useRealTimers();
  };
};

export const createAfterEach = () => {
  return () => {
    vi.resetAllMocks();
  };
};

export const mockPaginatedResponse = <T>(items: T[], total = 100) => ({
  success: true,
  data: {
    items,
    total,
    page: 1,
    page_size: 20,
    total_pages: Math.ceil(total / 20),
  },
});

export const waitForLoading = () =>
  new Promise(resolve => setTimeout(resolve, 100));

export const createTestWrapper = (ui: React.ReactElement) => {
  const { render } = require('@testing-library/react');
  const { BrowserRouter } = require('react-router-dom');
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};
