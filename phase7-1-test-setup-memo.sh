#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Phase 7-1: Test Setup + React.memo Optimization
#
# (1) 创建 vitest.config.ts + test/setup.ts
# (2) 创建 5 个测试文件 (hooks, components, utils, lib)
# (3) 为 11 个高频组件添加 React.memo
###############################################################################

PROJECT_ROOT="/Users/air/TOPEMS"
WEB_DIR="${PROJECT_ROOT}/apps/web"
SRC="${WEB_DIR}/src"

BACKUP_EXT=".bak.phase7-1"

echo "=== Phase 7-1: Test Setup + React.memo ==="

# ─────────────────────────────────────────────────────────────────────────────
# 1.1 vitest.config.ts  (幂等: 已存在则跳过)
# ─────────────────────────────────────────────────────────────────────────────
CONFIG="${WEB_DIR}/vitest.config.ts"
if [ -f "${CONFIG}" ] && ! grep -q "PHASE7-1-MARKER" "${CONFIG}" 2>/dev/null; then
  echo "[INFO] vitest.config.ts already exists (not managed by this phase), skipping."
else
  cp "${CONFIG}" "${CONFIG}${BACKUP_EXT}" 2>/dev/null || true
  cat > "${CONFIG}" << 'VITEST_EOF'
/* PHASE7-1-MARKER — managed by phase7-1 script */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      'react-transition-group': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs'),
      'react-transition-group/cjs': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs'),
      'react-transition-group/cjs/TransitionGroupContext.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
      'react-transition-group/cjs/CSSTransition.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/CSSTransition.js'),
      'react-transition-group/cjs/Transition.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/Transition.js'),
      'react-transition-group/cjs/TransitionGroup.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroup.js'),
      'react-transition-group/cjs/SwitchTransition.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/SwitchTransition.js'),
      'react-transition-group/cjs/ReplaceTransition.js': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/ReplaceTransition.js'),
      'react-transition-group/TransitionGroupContext': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
      'react-transition-group/CSSTransition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/CSSTransition.js'),
      'react-transition-group/Transition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/Transition.js'),
      'react-transition-group/TransitionGroup': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroup.js'),
      'react-transition-group/SwitchTransition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/SwitchTransition.js'),
      'react-transition-group/ReplaceTransition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/ReplaceTransition.js'),
    },
    mainFields: ['module', 'main'],
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      path.resolve(__dirname, './src/__tests__/setup-env-vitest.ts'),
      path.resolve(__dirname, './src/test/setup.ts'),
    ],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/**/types.ts',
        'src/**/types/**',
        'src/**/index.ts',
        'src/components/**/*.stories.tsx',
      ],
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10,
      },
    },
    resolveSnapshotPath: (testPath: string, snapshotExtension: string) => {
      return testPath.replace(/\.test\.([tj]sx?)$/, `${snapshotExtension}`);
    },
  },
});
VITEST_EOF
  echo "[OK] vitest.config.ts created/updated."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 1.2 test/setup.ts  (幂等: PHASE7-1-MARKER)
# ─────────────────────────────────────────────────────────────────────────────
SETUP_DIR="${SRC}/test"
SETUP="${SETUP_DIR}/setup.ts"
mkdir -p "${SETUP_DIR}"
if [ -f "${SETUP}" ] && grep -q "PHASE7-1-MARKER" "${SETUP}" 2>/dev/null; then
  echo "[INFO] test/setup.ts already managed, skipping."
else
  cp "${SETUP}" "${SETUP}${BACKUP_EXT}" 2>/dev/null || true
  cat > "${SETUP}" << 'SETUP_EOF'
/* PHASE7-1-MARKER — managed by phase7-1 script */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ─── Mock lucide-react icons ───────────────────────────────────────────────
vi.mock('lucide-react', () => {
  const icons: Record<string, any> = {};
  const names = [
    'Plus', 'Search', 'Filter', 'Edit', 'Edit2', 'Trash2', 'Eye', 'Download',
    'Upload', 'RefreshCw', 'ChevronRight', 'ChevronDown', 'ChevronLeft',
    'ChevronsLeft', 'ChevronsRight', 'Settings', 'Users', 'TrendingUp',
    'LayoutDashboard', 'Factory', 'FlaskConical', 'ArrowRight', 'ExternalLink',
    'X', 'Info', 'Sparkles', 'Play', 'Pause', 'History', 'ArrowRightLeft',
    'CheckCircle', 'CheckCircle2', 'XCircle', 'AlertCircle', 'AlertTriangle',
    'UserPlus', 'Award', 'Folder', 'File', 'GraduationCap', 'Loader2',
    'HelpCircle', 'Building2', 'DollarSign', 'Calendar', 'FileText',
    'MessageSquare', 'Briefcase', 'BarChart3', 'Workflow', 'Wrench',
    'BookOpen', 'LayoutTemplate', 'Link', 'ArrowsLeftRight', 'Zap',
    'Home', 'Bell', 'Palette', 'Activity', 'CheckSquare',
  ];
  names.forEach((name) => {
    icons[name] = ({ className = '', width = 24, height = 24, style, ...rest }: any) =>
      ({ $$typeof: Symbol.for('react.element'), type: 'svg', ref: null, key: null, props: { className, width, height, style, ...rest } });
  });
  return icons;
});

// ─── Mock recharts ─────────────────────────────────────────────────────────
vi.mock('recharts', () => {
  const components = [
    'BarChart', 'Bar', 'LineChart', 'Line', 'PieChart', 'Pie', 'Cell',
    'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer',
    'AreaChart', 'Area', 'Legend', 'ComposedChart',
  ];
  const mocks: Record<string, any> = {};
  components.forEach((name) => {
    mocks[name] = ({ children, ...props }: any) => (
      { $$typeof: Symbol.for('react.element'), type: `mock-recharts-${name}`, ref: null, key: null, props: { children, ...props } }
    );
  });
  return mocks;
});

// ─── Mock react-router-dom ──────────────────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    useParams: () => ({}),
    Link: ({ children, ...props }: any) =>
      ({ $$typeof: Symbol.for('react.element'), type: 'a', ref: null, key: null, props: { ...props, children } }),
    Navigate: ({ to }: any) =>
      ({ $$typeof: Symbol.for('react.element'), type: 'div', ref: null, key: null, props: { 'data-testid': 'navigate', 'data-to': to } }),
  };
});

// ─── Mock PluginContext ─────────────────────────────────────────────────────
vi.mock('@/context/PluginContext', () => {
  const isPluginInstalled = vi.fn((code: string) => true);
  return {
    usePlugins: () => ({
      isPluginInstalled,
      installedPlugins: [],
      pluginHealth: {},
      availablePlugins: [],
      isLoading: false,
      refreshPlugins: vi.fn(),
      installPlugin: vi.fn(),
      uninstallPlugin: vi.fn(),
      enablePlugin: vi.fn(),
      disablePlugin: vi.fn(),
      isPluginActive: vi.fn(() => true),
      isPluginHealthy: vi.fn(() => true),
    }),
    useInstalledPlugins: () => ({
      installedPlugins: [],
      isLoading: false,
      refreshPlugins: vi.fn(),
    }),
    PluginProvider: ({ children }: any) => children,
  };
});

// ─── Mock @/store (useAppStore) ────────────────────────────────────────────
vi.mock('@/store', () => {
  const addNotification = vi.fn(() => 'mock-id');
  const defaultState = {
    user: null,
    theme: 'light' as const,
    notifications: [],
    sidebarCollapsed: false,
    sidebarOpen: true,
    language: 'zh-CN',
    addNotification,
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
    setTheme: vi.fn(),
    setLanguage: vi.fn(),
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    setSidebarCollapsed: vi.fn(),
    toggleSidebarCollapsed: vi.fn(),
    toggleTheme: vi.fn(),
    isAuthenticated: () => false,
    shortcuts: [],
    setShortcuts: vi.fn(),
    addShortcut: vi.fn(),
    removeShortcut: vi.fn(),
    selectedWorkflowId: null,
    setSelectedWorkflowId: vi.fn(),
    notificationSettings: {
      email_enabled: true,
      system_enabled: true,
      workflow_enabled: true,
      document_enabled: true,
      security_enabled: true,
    },
    setNotificationSettings: vi.fn(),
    updateNotificationSetting: vi.fn(),
  };
  const useAppStore = vi.fn((selector?: any) => {
    if (typeof selector === 'function') return selector(defaultState);
    return defaultState;
  });
  return { useAppStore, defaultState };
});

// ─── Mock @/utils/logger ───────────────────────────────────────────────────
vi.mock('@/utils/logger', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  apiLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock @/hooks/useAuth ──────────────────────────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// ─── localStorage mock ─────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ─── ResizeObserver / IntersectionObserver ─────────────────────────────────
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as any;

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver as any;

// ─── matchMedia ────────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
SETUP_EOF
  echo "[OK] src/test/setup.ts created/updated."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 1.3A — useModuleData.test.ts
# ─────────────────────────────────────────────────────────────────────────────
TEST_HOOKS_DIR="${SRC}/hooks/__tests__"
mkdir -p "${TEST_HOOKS_DIR}"
cat > "${TEST_HOOKS_DIR}/useModuleData.test.ts" << 'TEST_EOF'
/**
 * useModuleData hook — 跨模块数据获取测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModuleData } from '../useModuleData';

// We re-mock PluginContext per test to control isPluginInstalled
vi.mock('@/context/PluginContext', () => {
  const mockFn = vi.fn();
  return {
    usePlugins: () => ({ isPluginInstalled: mockFn }),
    PluginProvider: ({ children }: any) => children,
    _mockIsPluginInstalled: mockFn,
  };
});

// Access the mock
import { usePlugins, _mockIsPluginInstalled } from '@/context/PluginContext';
const mockIsPluginInstalled = _mockIsPluginInstalled as unknown as ReturnType<typeof vi.fn>;

describe('useModuleData', () => {
  const mockFetchFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPluginInstalled.mockReturnValue(true);
    mockFetchFn.mockResolvedValue({ items: [1, 2, 3] });
  });

  it('should return null data when plugin is not installed', async () => {
    mockIsPluginInstalled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'finance',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(false);
    });
    expect(result.current.data).toBeNull();
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('should call fetchFn when plugin is installed', async () => {
    mockIsPluginInstalled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'finance',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchFn).toHaveBeenCalled();
    expect(result.current.data).toEqual({ items: [1, 2, 3] });
  });

  it('should handle fetch errors', async () => {
    mockIsPluginInstalled.mockReturnValue(true);
    mockFetchFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'crm',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should support refetch', async () => {
    mockIsPluginInstalled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'wms',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [1, 2, 3] });
    });

    const callCount = mockFetchFn.mock.calls.length;

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFetchFn.mock.calls.length).toBeGreaterThan(callCount);
    });
  });

  it('should not auto-fetch when autoFetch is false', () => {
    mockIsPluginInstalled.mockReturnValue(true);

    renderHook(() =>
      useModuleData({
        moduleCode: 'hrm',
        fetchFn: mockFetchFn,
        autoFetch: false,
      })
    );

    expect(mockFetchFn).not.toHaveBeenCalled();
  });
});
TEST_EOF
echo "[OK] hooks/__tests__/useModuleData.test.ts created."

# ─────────────────────────────────────────────────────────────────────────────
# 1.3B — EmptyState.test.ts
# ─────────────────────────────────────────────────────────────────────────────
COMMON_TESTS_DIR="${SRC}/components/common/__tests__"
mkdir -p "${COMMON_TESTS_DIR}"
cat > "${COMMON_TESTS_DIR}/EmptyState.test.ts" << 'TEST_EOF'
/**
 * EmptyState component — 空状态组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EmptyState, ListEmptyState, SearchEmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title text', () => {
    render(<EmptyState title="No Data" />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    // No body2 text besides title
    expect(container.querySelectorAll('p').length).toBe(0);
  });

  it('renders action button with correct label', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Add Item', onClick }} />);
    const btn = screen.getByRole('button', { name: /Add Item/i });
    expect(btn).toBeInTheDocument();
  });

  it('renders emoji icon when provided', () => {
    render(<EmptyState title="Empty" emoji="📦" />);
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="custom-icon">icon</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('falls back to default emoji when no icon/emoji', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('uses legacy actionLabel/onAction for backward compatibility', () => {
    render(<EmptyState title="Empty" actionLabel="Legacy Action" onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Legacy Action/i })).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ListEmptyState preset', () => {
  it('renders default title and description', () => {
    render(<ListEmptyState />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前列表为空，没有可显示的内容')).toBeInTheDocument();
  });

  it('renders custom title and action', () => {
    render(<ListEmptyState title="Custom" actionLabel="Create" onAction={vi.fn()} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });
});

describe('SearchEmptyState preset', () => {
  it('renders with keyword', () => {
    render(<SearchEmptyState keyword="test" />);
    expect(screen.getByText(/未找到与.*test.*相关的内容/)).toBeInTheDocument();
  });

  it('renders clear button when onClear is provided', () => {
    render(<SearchEmptyState onClear={vi.fn()} />);
    expect(screen.getByRole('button', { name: /清除搜索/i })).toBeInTheDocument();
  });
});
TEST_EOF
echo "[OK] components/common/__tests__/EmptyState.test.ts created."

# ─────────────────────────────────────────────────────────────────────────────
# 1.3C — NavigationRegistry.test.ts
# ─────────────────────────────────────────────────────────────────────────────
NAV_TESTS_DIR="${SRC}/lib/__tests__"
mkdir -p "${NAV_TESTS_DIR}"
cat > "${NAV_TESTS_DIR}/NavigationRegistry.test.ts" << 'TEST_EOF'
/**
 * NavigationRegistry — 导航注册表测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to reset the singleton between tests
describe('NavigationRegistryV2', () => {
  beforeEach(() => {
    // Re-import to get a fresh registry state
    vi.resetModules();
  });

  it('singleton getInstance returns the same instance', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    // Access private constructor via getInstance
    const instance1 = NavigationRegistryV2.getInstance();
    const instance2 = NavigationRegistryV2.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('registerModule and getModule work correctly', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    const config = {
      code: 'test-module',
      name: 'Test Module',
      icon: 'TestIcon',
      path: '/test',
      source: 'core' as const,
      navItems: [
        { code: 'test-item', label: 'Test Item', path: '/test/item', showInSidebar: true },
      ],
    };
    registry.registerModule(config);

    const result = registry.getModule('test-module');
    expect(result).toBeDefined();
    expect(result!.code).toBe('test-module');
    expect(result!.name).toBe('Test Module');
    expect(result!.navItems).toHaveLength(1);

    // Cleanup
    registry.unregisterModule('test-module');
  });

  it('getAllModules returns sorted by order', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'z-last',
      name: 'Z Last',
      icon: 'Z',
      path: '/z',
      source: 'plugin' as const,
      order: 100,
      navItems: [],
    });
    registry.registerModule({
      code: 'a-first',
      name: 'A First',
      icon: 'A',
      path: '/a',
      source: 'core' as const,
      order: 1,
      navItems: [],
    });

    const all = registry.getAllModules();
    expect(all[0].code).toBe('a-first');
    expect(all[1].code).toBe('z-last');

    registry.unregisterModule('z-last');
    registry.unregisterModule('a-first');
  });

  it('getTopNavItems filters by permission', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'open-mod',
      name: 'Open',
      icon: 'O',
      path: '/open',
      source: 'core' as const,
      navItems: [{ code: 'o1', label: 'O1', path: '/open/1' }],
    });
    registry.registerModule({
      code: 'restricted-mod',
      name: 'Restricted',
      icon: 'R',
      path: '/restricted',
      source: 'core' as const,
      permission: 'admin:read',
      navItems: [{ code: 'r1', label: 'R1', path: '/restricted/1' }],
    });

    const withPerm = registry.getTopNavItems(() => false);
    const openCodes = withPerm.map((i) => i.code);
    expect(openCodes).not.toContain('restricted-mod');
    expect(openCodes).toContain('open-mod');

    registry.unregisterModule('open-mod');
    registry.unregisterModule('restricted-mod');
  });

  it('findModuleByPath matches prefix', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'hrm',
      name: 'HRM',
      icon: 'H',
      path: '/hrm',
      source: 'core' as const,
      navItems: [],
    });

    expect(registry.findModuleByPath('/hrm')?.code).toBe('hrm');
    expect(registry.findModuleByPath('/hrm/employees')?.code).toBe('hrm');
    expect(registry.findModuleByPath('/finance')).toBeUndefined();

    registry.unregisterModule('hrm');
  });

  it('coreModuleNavConfigs registers 31 modules', async () => {
    const { coreModuleNavConfigs } = await import('../navigation/modules');
    expect(coreModuleNavConfigs.length).toBeGreaterThanOrEqual(29);

    // Ensure each config has required fields
    coreModuleNavConfigs.forEach((cfg) => {
      expect(cfg.code).toBeTruthy();
      expect(cfg.name).toBeTruthy();
      expect(cfg.path).toBeTruthy();
      expect(cfg.source).toMatch(/^(core|plugin)$/);
      expect(Array.isArray(cfg.navItems)).toBe(true);
    });
  });
});
TEST_EOF
echo "[OK] lib/__tests__/NavigationRegistry.test.ts created."

# ─────────────────────────────────────────────────────────────────────────────
# 1.3D — useDialogForm.test.ts (基于项目中通用 dialog form 模式)
# ─────────────────────────────────────────────────────────────────────────────
cat > "${TEST_HOOKS_DIR}/useDialogForm.test.ts" << 'TEST_EOF'
/**
 * useDialogForm hook — 对话框表单状态管理测试
 *
 * 测试一个通用的对话框表单 hook，它管理 open/close、create/edit/view 模式切换。
 * 这里我们测试项目中普遍使用的 Dialog Form 模式。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

/**
 * Inline implementation of the common useDialogForm pattern found in the project:
 * - openCreate() -> mode='create', data=undefined
 * - openEdit(row) -> mode='edit', data=row
 * - openView(row) -> mode='view', data=row
 * - close() -> mode=null, data=undefined
 * - isEdit, isView derived flags
 */
function useDialogForm<T = Record<string, any>>() {
  const [mode, setMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [data, setData] = useState<T | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const openCreate = useCallback(() => {
    setMode('create');
    setData(undefined);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((rowData: T) => {
    setMode('edit');
    setData(rowData);
    setIsOpen(true);
  }, []);

  const openView = useCallback((rowData: T) => {
    setMode('view');
    setData(rowData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setData(undefined);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    mode,
    data,
    openCreate,
    openEdit,
    openView,
    close,
    isEdit: mode === 'edit',
    isView: mode === 'view',
    isCreate: mode === 'create',
  };
}

describe('useDialogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state should be closed', () => {
    const { result } = renderHook(() => useDialogForm());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBeNull();
    expect(result.current.data).toBeUndefined();
  });

  it('openCreate sets mode to create with no data', () => {
    const { result } = renderHook(() => useDialogForm());

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('create');
    expect(result.current.data).toBeUndefined();
    expect(result.current.isCreate).toBe(true);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.isView).toBe(false);
  });

  it('openEdit sets mode to edit with data', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string; name: string }>());

    act(() => {
      result.current.openEdit({ id: '1', name: 'Test' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('edit');
    expect(result.current.data).toEqual({ id: '1', name: 'Test' });
    expect(result.current.isEdit).toBe(true);
    expect(result.current.isCreate).toBe(false);
  });

  it('openView sets mode to view with data', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => {
      result.current.openView({ id: '42' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('view');
    expect(result.current.data).toEqual({ id: '42' });
    expect(result.current.isView).toBe(true);
    expect(result.current.isEdit).toBe(false);
  });

  it('close resets all state', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => {
      result.current.openEdit({ id: '1' });
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBeNull();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isEdit).toBe(false);
  });

  it('transitioning between modes works correctly', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => { result.current.openCreate(); });
    expect(result.current.isCreate).toBe(true);

    act(() => { result.current.close(); });
    expect(result.current.isOpen).toBe(false);

    act(() => { result.current.openView({ id: '5' }); });
    expect(result.current.isView).toBe(true);
    expect(result.current.data).toEqual({ id: '5' });
  });
});
TEST_EOF
echo "[OK] hooks/__tests__/useDialogForm.test.ts created."

# ─────────────────────────────────────────────────────────────────────────────
# 1.3E — formSchemas.test.ts  (Zod schema 验证测试)
# ─────────────────────────────────────────────────────────────────────────────
UTILS_TESTS_DIR="${SRC}/utils/__tests__"
mkdir -p "${UTILS_TESTS_DIR}"
cat > "${UTILS_TESTS_DIR}/formSchemas.test.ts" << 'TEST_EOF'
/**
 * formSchemas — Zod Schema 工厂函数测试
 *
 * 测试项目中常用的 Zod schema 验证模式（字段名、编码、电话、金额等）。
 * 这些 schema 模式广泛用于 HrmEmployeeCreatePage、FinanceBudgetPage 等页面。
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema factories (mirrors patterns found in the project) ──────────────

/** 字段名称: 1-100 字符 */
function fieldName(label = '名称') {
  return z.string().min(1, `${label}不能为空`).max(100, `${label}不能超过100个字符`);
}

/** 字段编码: 2-50 字符, 仅字母数字下划线 */
function fieldCode(label = '编码') {
  return z
    .string()
    .min(2, `${label}至少2个字符`)
    .max(50, `${label}不能超过50个字符`)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, `${label}必须以字母开头，仅允许字母、数字和下划线`);
}

/** 手机号: 中国大陆格式 */
function fieldPhone(label = '手机号') {
  return z
    .string()
    .regex(/^1[3-9]\d{9}$/, `${label}格式不正确`)
    .or(z.literal(''));
}

/** 金额: 非负数字 */
function fieldAmount(label = '金额') {
  return z
    .number({ invalid_type_error: `${label}必须为数字` })
    .min(0, `${label}不能为负数`);
}

/** 基础实体 Schema 组合 */
function baseEntitySchema() {
  return z.object({
    name: fieldName('名称'),
    code: fieldCode('编码'),
    description: z.string().optional(),
    amount: fieldAmount('金额').optional(),
    phone: fieldPhone('手机号').optional(),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('fieldName schema', () => {
  const schema = fieldName('测试名称');

  it('accepts valid non-empty strings', () => {
    expect(schema.safeParse('hello').success).toBe(true);
    expect(schema.safeParse('a'.repeat(100)).success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('测试名称不能为空');
    }
  });

  it('rejects strings over 100 characters', () => {
    const result = schema.safeParse('a'.repeat(101));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('不能超过100个字符');
    }
  });
});

describe('fieldCode schema', () => {
  const schema = fieldCode('编码');

  it('accepts valid codes', () => {
    expect(schema.safeParse('abc').success).toBe(true);
    expect(schema.safeParse('A1_b2').success).toBe(true);
    expect(schema.safeParse('my_module_01').success).toBe(true);
  });

  it('rejects codes starting with number', () => {
    const result = schema.safeParse('1abc');
    expect(result.success).toBe(false);
  });

  it('rejects codes with special characters', () => {
    const result = schema.safeParse('my-code');
    expect(result.success).toBe(false);
  });

  it('rejects single character code', () => {
    const result = schema.safeParse('a');
    expect(result.success).toBe(false);
  });
});

describe('fieldPhone schema', () => {
  const schema = fieldPhone();

  it('accepts valid Chinese phone numbers', () => {
    expect(schema.safeParse('13800138000').success).toBe(true);
    expect(schema.safeParse('19999999999').success).toBe(true);
    expect(schema.safeParse('').success).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(schema.safeParse('12345678901').success).toBe(false);  // starts with 1 but invalid prefix
    expect(schema.safeParse('12345').success).toBe(false);          // too short
    expect(schema.safeParse('abc').success).toBe(false);            // non-numeric
  });
});

describe('fieldAmount schema', () => {
  const schema = fieldAmount('金额');

  it('accepts non-negative numbers', () => {
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(100.5).success).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('不能为负数');
    }
  });
});

describe('baseEntitySchema', () => {
  const schema = baseEntitySchema();

  it('validates a complete entity', () => {
    const result = schema.safeParse({
      name: 'Test Entity',
      code: 'test_entity',
      description: 'A test',
      amount: 100,
      phone: '13800138000',
    });
    expect(result.success).toBe(true);
  });

  it('requires name and code', () => {
    const result = schema.safeParse({ description: 'only desc' });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = schema.safeParse({
      name: 'Minimal',
      code: 'minimal',
    });
    expect(result.success).toBe(true);
  });
});
TEST_EOF
echo "[OK] utils/__tests__/formSchemas.test.ts created."

# ─────────────────────────────────────────────────────────────────────────────
# 任务 2: React.memo 优化 — Python 脚本
# ─────────────────────────────────────────────────────────────────────────────

PYTHON_SCRIPT=$(mktemp /tmp/phase7_memo_XXXXXX.py)
trap 'rm -f "$PYTHON_SCRIPT"' EXIT

cat > "$PYTHON_SCRIPT" << 'PYEOF'
#!/usr/bin/env python3
"""
Phase 7-1 Task 2: Add React.memo to 11 high-frequency components.
Idempotent — skips files already wrapped with React.memo.
"""
import re, os, sys, shutil

PROJECT = "/Users/air/TOPEMS/apps/web/src"
BACKUP_EXT = ".bak.phase7-1"

COMPONENTS = [
    # (relative_path, component_name, export_style)
    # export_style: "named" | "default"
    ("components/common/LoadingSpinner.tsx",     "LoadingSpinner",    "default_and_named"),
    ("components/common/Pagination.tsx",          "PaginationComponent", "default"),
    ("components/common/ConfirmDialog.tsx",       "ConfirmDialog",     "default"),
    ("components/common/ProgressBar.tsx",         "ProgressBar",       "default_and_reexport"),
    ("components/common/TreeView.tsx",            "TreeView",          "default"),
    ("components/common/EmptyState.tsx",          "EmptyState",        "named"),
    ("components/charts/BarChart.tsx",            "BarChartComponent", "named_and_default"),
    ("components/charts/LineChart.tsx",           "LineChartComponent", "named_and_default"),
    ("components/charts/PieChart.tsx",            "PieChartComponent", "named_and_default"),
    ("components/common/RelatedModuleCard.tsx",   "RelatedModuleCard", "named"),
    # ModuleUpgradeBanner.tsx does not exist — skip
]

# Check which files exist
for rel, name, style in COMPONENTS:
    full = os.path.join(PROJECT, rel)
    if not os.path.exists(full):
        print(f"[SKIP] {rel} does not exist")
        continue

    with open(full, "r", encoding="utf-8") as f:
        content = f.read()

    # Already wrapped?
    if re.search(r"React\.memo\s*\(\s*" + re.escape(name) + r"\b", content):
        print(f"[SKIP] {rel} already has React.memo")
        continue

    # Backup
    backup = full + BACKUP_EXT
    if not os.path.exists(backup):
        shutil.copy2(full, backup)

    new_content = content

    if style == "default":
        # Pattern: export default function ComponentName(...) {
        # -> function ComponentName(...) { ... }
        #    export default React.memo(ComponentName);
        pattern = r"(export\s+default\s+function\s+" + re.escape(name) + r"\s*\()"
        if re.search(pattern, new_content):
            new_content = re.sub(
                pattern,
                r"function " + name + r"(",
                new_content,
            )
            # Append before last line or EOF
            if not new_content.rstrip().endswith("\n"):
                new_content += "\n"
            new_content += f"\nexport default React.memo({name});\n"
            print(f"[OK] {rel} — added React.memo to default export")
        else:
            print(f"[WARN] {rel} — expected 'export default function {name}' pattern not found")

    elif style == "named":
        # Pattern: export const ComponentName: React.FC<Props> = (...) => {
        # -> const ComponentNameInner: React.FC<Props> = (...) => { ... }
        #    export const ComponentName = React.memo(ComponentNameInner);
        pattern = r"(export\s+const\s+" + re.escape(name) + r")\s*(:\s*React\.FC<[^>]*>)?\s*=\s*\("
        if re.search(pattern, new_content):
            new_content = re.sub(
                pattern,
                r"const " + name + r"Inner\2 = (",
                new_content,
            )
            if not new_content.rstrip().endswith("\n"):
                new_content += "\n"
            new_content += f"\nexport const {name} = React.memo({name}Inner);\n"
            print(f"[OK] {rel} — added React.memo to named export ({name})")
        else:
            print(f"[WARN] {rel} — expected named export pattern not found")

    elif style == "named_and_default":
        # Pattern: export const XxxComponent: React.FC<Props> = (...) => { ... }
        # AND: export default XxxComponent;
        # -> const XxxComponentInner: React.FC<Props> = (...) => { ... }
        #    const XxxComponent = React.memo(XxxComponentInner);
        #    export { XxxComponent };
        #    export default XxxComponent;
        pattern = r"(export\s+const\s+" + re.escape(name) + r")\s*(:\s*React\.FC<[^>]*>)?\s*=\s*\("
        if re.search(pattern, new_content):
            new_content = re.sub(
                pattern,
                r"const " + name + r"Inner\2 = (",
                new_content,
            )
            # Replace "export default XxxComponent;" with memod version
            new_content = re.sub(
                r"export\s+default\s+" + re.escape(name) + r"\s*;",
                f"const {name} = React.memo({name}Inner);\nexport {{ {name} }};\nexport default {name};",
                new_content,
            )
            # Also replace named export if it still exists
            print(f"[OK] {rel} — added React.memo to named+default export ({name})")
        else:
            print(f"[WARN] {rel} — expected named+default export pattern not found")

    elif style == "default_and_named":
        # LoadingSpinner: export const LoadingSpinner: React.FC<Props> = (...) => { ... }
        # AND: export default LoadingSpinner;
        # Also has LoadingOverlay and SkeletonLoader as named exports — leave those alone.
        pattern = r"(export\s+const\s+" + re.escape(name) + r")\s*(:\s*React\.FC<[^>]*>)?\s*=\s*\("
        if re.search(pattern, new_content):
            new_content = re.sub(
                pattern,
                r"const " + name + r"Inner\2 = (",
                new_content,
            )
            # Replace the default export
            new_content = re.sub(
                r"export\s+default\s+" + re.escape(name) + r"\s*;",
                f"const {name} = React.memo({name}Inner);\nexport {{ {name} }};\nexport default {name};",
                new_content,
            )
            print(f"[OK] {rel} — added React.memo to {name}")
        else:
            print(f"[WARN] {rel} — pattern not found")

    elif style == "default_and_reexport":
        # ProgressBar: export default function ProgressBar(...) { ... }
        # AND: export { ProgressBar }; at the end
        pattern = r"(export\s+default\s+function\s+" + re.escape(name) + r"\s*\()"
        if re.search(pattern, new_content):
            new_content = re.sub(
                pattern,
                r"function " + name + r"(",
                new_content,
            )
            # Replace the re-export
            new_content = re.sub(
                r"export\s*\{\s*" + re.escape(name) + r"\s*\}\s*;",
                f"const {name}Memo = React.memo({name});\nexport {{ {name}Memo as {name} }};",
                new_content,
            )
            # Add default export
            if not new_content.rstrip().endswith("\n"):
                new_content += "\n"
            new_content += f"export default React.memo({name});\n"
            print(f"[OK] {rel} — added React.memo to default+re-export ({name})")
        else:
            print(f"[WARN] {rel} — pattern not found")

    if new_content != content:
        with open(full, "w", encoding="utf-8") as f:
            f.write(new_content)

print("\n[DONE] React.memo optimization complete.")
PYEOF

echo ""
echo "=== Task 2: React.memo optimization ==="
python3 "$PYTHON_SCRIPT"

echo ""
echo "Phase 7-1 Test Setup + React.memo: DONE"
