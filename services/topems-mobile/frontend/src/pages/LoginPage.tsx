import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Phone, AlertCircle } from 'lucide-react';
import api from '../api/client';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('请输入账号和密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/v1/auth/login', {
        phone,
        password,
      });

      if (response.data.success) {
        const token = response.data.data?.token;
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('userInfo', JSON.stringify(response.data.data?.user || {}));
          onLoginSuccess();
        } else {
          setError('登录失败，未获取到令牌');
        }
      } else {
        setError(response.data.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请检查网络连接或账号密码');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phone) {
      setError('请先输入手机号');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/auth/verify-code', {
        phone,
        type: 'login',
      });
      if (response.data.success) {
        alert('验证码已发送');
      } else {
        setError(response.data.message || '发送失败');
      }
    } catch (err) {
      setError('发送失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">TOPEMS 移动工作台</h1>
            <p className="text-gray-500 mt-2">安全登录您的账户</p>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-500 bg-red-50 rounded-lg p-3 mb-4">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入手机号"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSendCode}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              获取验证码登录
            </button>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <span>登录</span>
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              登录即表示同意
              <a href="#" className="text-blue-600 hover:text-blue-700">服务条款</a>
              和
              <a href="#" className="text-blue-600 hover:text-blue-700">隐私政策</a>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-gray-400 text-sm">
          © 2024 TOPEMS. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
