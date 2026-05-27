import { useState, useEffect } from 'react';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

// 验证函数
const validateUsername = (username: string): string | null => {
  if (username.length < 3) return '用户名长度至少为3位';
  if (username.length > 20) return '用户名长度不能超过20位';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return '用户名只能包含字母、数字和下划线';
  return null;
};

const validateEmail = (email: string): string | null => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return '请输入有效的邮箱地址';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (password.length < 6) return '密码长度至少为6位';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) return '密码需要包含至少一个字母和一个数字';
  return null;
};

const getPasswordStrength = (password: string): { level: number; color: string; text: string } => {
  if (!password) return { level: 0, color: '#ddd', text: '请输入密码' };
  if (password.length < 6) return { level: 1, color: '#ef4444', text: '弱' };
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLong = password.length >= 10;
  
  let strength = 0;
  if (hasLetter) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  if (isLong) strength++;
  
  if (strength <= 1) return { level: 2, color: '#f97316', text: '中等' };
  if (strength <= 2) return { level: 3, color: '#eab308', text: '较强' };
  return { level: 4, color: '#22c55e', text: '强' };
};

function App() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // 登录表单
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginResult, setLoginResult] = useState<{
    success: boolean;
    message: string;
    user?: UserInfo;
  } | null>(null);
  
  // 注册表单
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerResult, setRegisterResult] = useState<{
    success: boolean;
    message: string;
    user?: UserInfo;
  } | null>(null);
  
  // 表单验证错误
  const [registerErrors, setRegisterErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginResult(null);
    
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setLoginResult({
          success: true,
          message: data.message,
          user: data.data.user,
        });
        setCurrentUser(data.data.user);
        setToken(data.data.token);
      } else {
        setLoginResult({
          success: false,
          message: data.message,
        });
      }
    } catch (err) {
      setLoginResult({
        success: false,
        message: '登录请求失败',
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterResult(null);
    
    // 前端验证
    const errors: any = {};
    const usernameError = validateUsername(registerUsername);
    const emailError = validateEmail(registerEmail);
    const passwordError = validatePassword(registerPassword);
    
    if (usernameError) errors.username = usernameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }
    
    setRegisterErrors({});
    
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
          full_name: registerFullName || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRegisterResult({
          success: true,
          message: data.message,
          user: data.data.user,
        });
        setCurrentUser(data.data.user);
        setToken(data.data.token);
        // 注册成功后刷新用户列表
        fetchUsers();
      } else {
        setRegisterResult({
          success: false,
          message: data.message,
        });
      }
    } catch (err) {
      setRegisterResult({
        success: false,
        message: '注册请求失败',
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setLoginResult(null);
    setRegisterResult(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  // 实时验证
  const handleUsernameChange = (value: string) => {
    setRegisterUsername(value);
    if (value) {
      const error = validateUsername(value);
      setRegisterErrors(prev => ({ ...prev, username: error || undefined }));
    } else {
      setRegisterErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const handleEmailChange = (value: string) => {
    setRegisterEmail(value);
    if (value) {
      const error = validateEmail(value);
      setRegisterErrors(prev => ({ ...prev, email: error || undefined }));
    } else {
      setRegisterErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setRegisterPassword(value);
    if (value) {
      const error = validatePassword(value);
      setRegisterErrors(prev => ({ ...prev, password: error || undefined }));
    } else {
      setRegisterErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc2626';
      case 'user':
        return '#2563eb';
      case 'guest':
        return '#6b7280';
      default:
        return '#4b5563';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'user':
        return '普通用户';
      case 'guest':
        return '访客';
      default:
        return role;
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#8E24AA', marginBottom: '1rem' }}>
        🔐 TOPEMS-IAM 身份认证服务
      </h1>
      
      {/* 当前登录用户信息 */}
      {currentUser && (
        <div style={{ 
          background: '#e0f2fe', 
          padding: '1rem 1.5rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>👤 当前用户:</strong> {currentUser.full_name || currentUser.username} 
            <span style={{ 
              background: getRoleColor(currentUser.role), 
              color: '#fff', 
              padding: '0.2rem 0.6rem', 
              fontSize: '0.75rem',
              borderRadius: '9999px',
              fontWeight: 'bold',
              marginLeft: '0.5rem'
            }}>
              {getRoleName(currentUser.role)}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              background: '#ef4444', 
              color: '#fff', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.25rem', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            登出
          </button>
        </div>
      )}
      
      <div style={{ background: '#f5f7fa', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>📋 测试账号</h3>
        <p style={{ margin: '0.25rem 0' }}><strong>admin</strong> / <code>admin123</code> (系统管理员)</p>
        <p style={{ margin: '0.25rem 0' }}><strong>user</strong> / <code>user123</code> (普通用户)</p>
        <p style={{ margin: '0.25rem 0' }}><strong>guest</strong> / <code>guest123</code> (访客用户)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #eee' }}>
          {/* 标签页 */}
          <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '2px solid #eee' }}>
            <button
              onClick={() => { setActiveTab('login'); setLoginResult(null); setRegisterResult(null); }}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: activeTab === 'login' ? '#8E24AA' : 'transparent',
                color: activeTab === 'login' ? '#fff' : '#666',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                borderBottom: activeTab === 'login' ? '2px solid #8E24AA' : 'none',
                marginBottom: '-2px'
              }}
            >
              登录
            </button>
            <button
              onClick={() => { setActiveTab('register'); setLoginResult(null); setRegisterResult(null); setRegisterErrors({}); }}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: activeTab === 'register' ? '#8E24AA' : 'transparent',
                color: activeTab === 'register' ? '#fff' : '#666',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                borderBottom: activeTab === 'register' ? '2px solid #8E24AA' : 'none',
                marginBottom: '-2px'
              }}
            >
              注册
            </button>
          </div>

          {/* 登录表单 */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>用户名</label>
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.25rem', fontSize: '1rem' }}
                  placeholder="请输入用户名"
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>密码</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.25rem', fontSize: '1rem' }}
                  placeholder="请输入密码"
                />
              </div>
              <button 
                type="submit"
                style={{ 
                  background: '#8E24AA', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.25rem', 
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                登录
              </button>
              
              {loginResult && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  borderRadius: '0.5rem',
                  background: loginResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${loginResult.success ? '#4ade80' : '#fca5a5'}`
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: loginResult.success ? '#166534' : '#991b1b',
                    fontWeight: 'bold'
                  }}>
                    {loginResult.success ? '✅ ' : '❌ '}{loginResult.message}
                  </p>
                  {loginResult.success && loginResult.user && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #ddd' }}>
                      <p style={{ margin: '0.25rem 0' }}><strong>用户名:</strong> {loginResult.user.username}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>邮箱:</strong> {loginResult.user.email}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>角色:</strong> 
                        <span style={{ 
                          color: getRoleColor(loginResult.user.role),
                          fontWeight: 'bold',
                          marginLeft: '0.5rem'
                        }}>
                          {getRoleName(loginResult.user.role)}
                        </span>
                      </p>
                      {loginResult.user.full_name && (
                        <p style={{ margin: '0.25rem 0' }}><strong>姓名:</strong> {loginResult.user.full_name}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* 注册表单 */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>用户名 *</label>
                <input 
                  type="text" 
                  value={registerUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: `1px solid ${registerErrors.username ? '#ef4444' : '#ddd'}`, 
                    borderRadius: '0.25rem', 
                    fontSize: '1rem' 
                  }}
                  placeholder="3-20位，字母数字下划线"
                  required
                />
                {registerErrors.username && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                    ⚠️ {registerErrors.username}
                  </p>
                )}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>邮箱 *</label>
                <input 
                  type="email" 
                  value={registerEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: `1px solid ${registerErrors.email ? '#ef4444' : '#ddd'}`, 
                    borderRadius: '0.25rem', 
                    fontSize: '1rem' 
                  }}
                  placeholder="请输入邮箱"
                  required
                />
                {registerErrors.email && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                    ⚠️ {registerErrors.email}
                  </p>
                )}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>密码 *</label>
                <input 
                  type="password" 
                  value={registerPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: `1px solid ${registerErrors.password ? '#ef4444' : '#ddd'}`, 
                    borderRadius: '0.25rem', 
                    fontSize: '1rem' 
                  }}
                  placeholder="至少6位，包含字母和数字"
                  required
                />
                {/* 密码强度指示器 */}
                {registerPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div 
                          key={i}
                          style={{ 
                            flex: 1, 
                            height: '6px', 
                            borderRadius: '3px',
                            background: i <= getPasswordStrength(registerPassword).level 
                              ? getPasswordStrength(registerPassword).color 
                              : '#ddd'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: getPasswordStrength(registerPassword).color,
                      fontWeight: 'bold'
                    }}>
                      密码强度: {getPasswordStrength(registerPassword).text}
                    </span>
                  </div>
                )}
                {registerErrors.password && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                    ⚠️ {registerErrors.password}
                  </p>
                )}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>姓名</label>
                <input 
                  type="text" 
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.25rem', fontSize: '1rem' }}
                  placeholder="请输入姓名（可选）"
                />
              </div>
              <button 
                type="submit"
                disabled={Object.keys(registerErrors).length > 0}
                style={{ 
                  background: Object.keys(registerErrors).length > 0 ? '#9ca3af' : '#8E24AA', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.25rem', 
                  cursor: Object.keys(registerErrors).length > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                注册
              </button>
              
              {registerResult && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  borderRadius: '0.5rem',
                  background: registerResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${registerResult.success ? '#4ade80' : '#fca5a5'}`
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: registerResult.success ? '#166534' : '#991b1b',
                    fontWeight: 'bold'
                  }}>
                    {registerResult.success ? '✅ ' : '❌ '}{registerResult.message}
                  </p>
                  {registerResult.success && registerResult.user && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #ddd' }}>
                      <p style={{ margin: '0.25rem 0' }}><strong>用户名:</strong> {registerResult.user.username}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>邮箱:</strong> {registerResult.user.email}</p>
                      {registerResult.user.full_name && (
                        <p style={{ margin: '0.25rem 0' }}><strong>姓名:</strong> {registerResult.user.full_name}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #eee' }}>
          <h2 style={{ color: '#333', marginTop: 0 }}>用户列表</h2>
          {loading ? (
            <p>加载中...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {users.map((user) => (
                <li key={user.id} style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid #eee',
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem',
                  background: currentUser?.id === user.id ? '#fef3c7' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                        {user.full_name || user.username}
                        {currentUser?.id === user.id && <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.5rem' }}>(当前)</span>}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.875rem' }}>{user.email}</div>
                    </div>
                    <span style={{ 
                      background: getRoleColor(user.role), 
                      color: '#fff', 
                      padding: '0.25rem 0.75rem', 
                      fontSize: '0.75rem',
                      borderRadius: '9999px',
                      fontWeight: 'bold'
                    }}>
                      {getRoleName(user.role)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
