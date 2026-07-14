import fs from 'fs';
import path from 'path';

const testDir = path.join(process.cwd(), 'src/pages/__tests__');

const files = fs.readdirSync(testDir).filter(file => file.endsWith('.test.tsx'));

const newMockContent = `vi.mock('@/store', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
    setUser: vi.fn(),
    setToken: vi.fn(),
    setPermissions: vi.fn(),
    setRoles: vi.fn(),
    clearAuth: vi.fn(),
    updateUser: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    isSuperuser: vi.fn(() => true),
    getDisplayName: vi.fn(() => 'Test User'),
    getAvatarUrl: vi.fn(() => ''),
  })),
  useThemeStore: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
  useUIStore: vi.fn(() => ({
    sidebarOpen: true,
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    toggleSidebarCollapsed: vi.fn(),
    setSidebarCollapsed: vi.fn(),
  })),
  useWorkflowStore: vi.fn(() => ({
    currentTaskId: null,
    taskStatus: 'pending',
    setCurrentTaskId: vi.fn(),
    setTaskStatus: vi.fn(),
    completeTask: vi.fn(),
  })),
  useModuleLoadingStore: vi.fn(() => ({
    modules: {},
    loading: false,
    progress: 0,
    loadModule: vi.fn(),
    setModuleState: vi.fn(),
    reset: vi.fn(),
  })),
  useShortcutsStore: vi.fn(() => ({
    shortcuts: [],
    addShortcut: vi.fn(),
    removeShortcut: vi.fn(),
    updateShortcut: vi.fn(),
  })),
  useNotificationSettingsStore: vi.fn(() => ({
    settings: {},
    updateSettings: vi.fn(),
  })),
  useBIStore: vi.fn(() => ({
    summary: null,
    development: null,
    quality: null,
    production: null,
    laboratory: null,
    loading: false,
    error: null,
    fetchData: vi.fn(),
    clearData: vi.fn(),
  })),
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
  })),
  useTheme: vi.fn(() => ({ theme: 'light' })),
  useSidebarOpen: vi.fn(() => true),
  useSidebarCollapsed: vi.fn(() => false),
  useToggleSidebar: vi.fn(),
  useSetSidebarOpen: vi.fn(),
  useToggleSidebarCollapsed: vi.fn(),
  useSetSidebarCollapsed: vi.fn(),
}));`;

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const startMarker = "vi.mock('@/store'";
  if (content.includes(startMarker)) {
    const startIdx = content.indexOf(startMarker);
    
    const lines = content.substring(startIdx).split('\n');
    let depth = 0;
    let lineCount = 0;
    
    for (const line of lines) {
      for (const char of line) {
        if (char === '(' || char === '{' || char === '[') depth++;
        if (char === ')' || char === '}' || char === ']') depth--;
      }
      lineCount++;
      if (depth === 0 && line.trim().endsWith(');')) {
        break;
      }
    }
    
    const linesToRemove = lines.slice(0, lineCount).join('\n');
    const endIdx = startIdx + linesToRemove.length;
    
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    const newContent = before + newMockContent + after;
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  }
});

console.log(`\nTotal fixed: ${fixedCount}`);
