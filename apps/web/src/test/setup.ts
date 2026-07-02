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
