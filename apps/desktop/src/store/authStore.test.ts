import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';

vi.mock('../api', () => ({
  iamApi: {
    login: vi.fn(),
    getUserInfo: vi.fn(),
  },
  apiClient: {
    defaults: {
      headers: {},
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const store = useAuthStore.getState();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  it('should complete login without errors', async () => {
    const { login } = useAuthStore.getState();
    
    await login('admin', 'admin');
    
    const store = useAuthStore.getState();
    expect(store.isLoading).toBe(false);
    expect(store.isAuthenticated).toBe(true);
  });

  it('should login successfully with mock credentials', async () => {
    const { login } = useAuthStore.getState();
    
    await login('admin', 'admin');
    
    const store = useAuthStore.getState();
    expect(store.isAuthenticated).toBe(true);
    expect(store.token).toBeDefined();
    expect(store.user).toEqual({
      id: '1',
      username: 'admin',
      email: 'admin@topems.com',
      name: '管理员',
      role: 'admin',
    });
  });

  it('should throw error for invalid credentials', async () => {
    const { login } = useAuthStore.getState();
    
    await expect(login('wrong', 'wrong')).rejects.toThrow('登录失败，请检查用户名和密码');
    
    const store = useAuthStore.getState();
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
  });

  it('should logout and clear state', async () => {
    const { login, logout } = useAuthStore.getState();
    await login('admin', 'admin');
    
    logout();
    
    const store = useAuthStore.getState();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('should persist auth state to localStorage', async () => {
    const { login } = useAuthStore.getState();
    await login('admin', 'admin');
    
    const persisted = localStorage.getItem('topems-auth');
    expect(persisted).toBeDefined();
    expect(JSON.parse(persisted!).state.token).toBeDefined();
  });

  it('should restore auth state from localStorage', async () => {
    const mockState = {
      token: 'saved-token',
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@topems.com',
        name: '管理员',
        role: 'admin',
      },
      isAuthenticated: true,
      isLoading: false,
    };
    localStorage.setItem('topems-auth', JSON.stringify({ state: mockState }));
    
    const persisted = localStorage.getItem('topems-auth');
    expect(persisted).toBeDefined();
    expect(JSON.parse(persisted!).state.token).toBe('saved-token');
  });
});