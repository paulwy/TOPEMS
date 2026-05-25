import React, { useState } from 'react';
import { authApi } from '../api/iam';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (isRegister) {
        response = await authApi.register(formData);
      } else {
        response = await authApi.login({
          username: formData.username,
          password: formData.password,
        });
      }

      if (response.success && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        apiClient.setAuthToken(response.data.access_token);
        navigate('/dashboard');
      } else {
        setError(response.message || '操作失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">TOPEMS</h1>
          <p className="text-slate-600">企业数字化平台</p>
        </div>

        <h2 className="text-2xl font-semibold mb-6 text-center">
          {isRegister ? '用户注册' : '用户登录'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">用户名</label>
            <input
              type="text"
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="请输入用户名"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-2">邮箱</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="请输入邮箱"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <input
              type="password"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            演示账号: testuser / Test123456
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
