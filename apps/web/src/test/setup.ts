/**
 * 统一的测试配置文件
 * 解决以下常见问题：
 * 1. useAppStore mock 不正确
 * 2. vi.useFakeTimers() 导致异步超时
 * 3. 重复的 mock 设置
 */

import { vi } from 'vitest';

// 默认的 store 状态
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

// Mock API 配置
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

// Mock 配置辅助函数
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

// 移除 fake timers（这是导致测试超时的主要原因）
export const disableFakeTimers = () => {
  vi.useRealTimers();
};

// 在 beforeEach 中使用这个
export const createBeforeEach = (storeState = defaultStoreState) => {
  return () => {
    vi.clearAllMocks();
    vi.useRealTimers(); // 使用真实计时器，避免异步超时
  };
};

// 在 afterEach 中使用这个
export const createAfterEach = () => {
  return () => {
    vi.resetAllMocks();
  };
};

// 常用的测试数据
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

// 等待辅助函数
export const waitForLoading = () =>
  new Promise(resolve => setTimeout(resolve, 100));

// 测试 wrapper
export const createTestWrapper = (ui: React.ReactElement) => {
  const { render } = require('@testing-library/react');
  const { BrowserRouter } = require('react-router-dom');
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};
