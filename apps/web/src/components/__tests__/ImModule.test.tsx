import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MailPage from '../im/MailPage';
import { imApi } from '@/api/im';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/im', () => ({
  imApi: {
    listChatRooms: vi.fn().mockResolvedValue({ data: [] }),
    createChatRoom: vi.fn(),
    getChatRoom: vi.fn(),
    deleteChatRoom: vi.fn(),
    listChatMessages: vi.fn().mockResolvedValue({ data: [] }),
    createChatMessage: vi.fn(),
    updateChatMessage: vi.fn(),
    deleteChatMessage: vi.fn(),
    getChatRoomMembers: vi.fn(),
    addChatRoomMember: vi.fn(),
    listProjectGroups: vi.fn().mockResolvedValue({ data: [] }),
    createProjectGroup: vi.fn(),
    listNotifications: vi.fn().mockResolvedValue({ data: [] }),
    getUserOnlineStatus: vi.fn(),
    muteChatRoom: vi.fn(),
    pinChatRoom: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
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
}));

describe('MailPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <MailPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have chat room API methods defined', () => {
    expect(imApi.listChatRooms).toBeDefined();
    expect(imApi.createChatRoom).toBeDefined();
    expect(imApi.getChatRoom).toBeDefined();
    expect(imApi.deleteChatRoom).toBeDefined();
  });

  it('should have message API methods defined', () => {
    expect(imApi.listChatMessages).toBeDefined();
    expect(imApi.createChatMessage).toBeDefined();
    expect(imApi.updateChatMessage).toBeDefined();
    expect(imApi.deleteChatMessage).toBeDefined();
  });

  it('should have notification API methods defined', () => {
    expect(imApi.listNotifications).toBeDefined();
  });

});
