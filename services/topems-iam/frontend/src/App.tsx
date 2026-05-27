import { useState, useEffect } from 'react';
import UserList from './pages/UserList';
import { authApi, permissionApi, roleApi, type Permission, type Role, type LoginRequest, type User } from './api';

type TabType = 'login' | 'users' | 'permissions' | 'roles';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState<LoginRequest>({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken();
    }
  }, []);

  async function validateToken() {
    try {
      const user = await authApi.validateToken();
      setCurrentUser(user);
      setActiveTab('users');
    } catch {
      localStorage.removeItem('token');
    }
  }

  async function handleLogin() {
    try {
      setLoginError('');
      const response = await authApi.login(loginForm);
      localStorage.setItem('token', response.access_token);
      setCurrentUser(response.user);
      setActiveTab('users');
    } catch (error) {
      setLoginError('登录失败，请检查用户名和密码');
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setActiveTab('login');
    }
  }

  async function fetchPermissions() {
    try {
      const data = await permissionApi.list();
      setPermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  }

  async function fetchRoles() {
    try {
      const data = await roleApi.list();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }

  if (!currentUser && activeTab !== 'login') {
    setActiveTab('login');
  }

  const tabs = [
    { id: 'users' as TabType, label: '用户管理' },
    { id: 'permissions' as TabType, label: '权限管理' },
    { id: 'roles' as TabType, label: '角色管理' },
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {currentUser ? (
        <>
          <header style={{ background: '#2c3e50', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>TOPEMS-IAM 身份认证与权限管理系统</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>欢迎, {currentUser.name}</span>
              <button
                onClick={handleLogout}
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}
              >
                退出登录
              </button>
            </div>
          </header>
          <nav style={{ background: '#34495e', padding: '0.5rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'permissions' && permissions.length === 0) fetchPermissions();
                  if (tab.id === 'roles' && roles.length === 0) fetchRoles();
                }}
                style={{
                  background: activeTab === tab.id ? '#2980b9' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  marginRight: '0.5rem',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <main>
            {activeTab === 'users' && <UserList />}
            {activeTab === 'permissions' && (
              <div style={{ padding: '20px' }}>
                <h2>权限列表</h2>
                {permissions.length === 0 ? (
                  <p>暂无权限数据</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>权限名称</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>权限编码</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>描述</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((perm) => (
                        <tr key={perm.id}>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{perm.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{perm.code}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{perm.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {activeTab === 'roles' && (
              <div style={{ padding: '20px' }}>
                <h2>角色列表</h2>
                {roles.length === 0 ? (
                  <p>暂无角色数据</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>角色名称</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>角色编码</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>描述</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>权限数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id}>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{role.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{role.code}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{role.description || '-'}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{role.permissions.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </main>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', width: '400px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>TOPEMS-IAM 登录</h2>
            {loginError && (
              <div style={{ background: '#ffebee', color: '#c62828', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px' }}>
                {loginError}
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>用户名</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="请输入用户名"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>密码</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="请输入密码"
              />
            </div>
            <button
              onClick={handleLogin}
              style={{ width: '100%', background: '#2980b9', color: 'white', border: 'none', padding: '0.75rem', cursor: 'pointer', borderRadius: '4px', fontSize: '1rem' }}
            >
              登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}