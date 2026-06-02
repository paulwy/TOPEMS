import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '../components';
import { authApi } from '../api';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/projects';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate(redirectUrl);
    }
  }, [navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('请输入用户名和密码');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.login(formData.username, formData.password);
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('登录成功');
        navigate(redirectUrl);
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '登录失败';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <LoginOutlined className="text-white text-2xl" />
          </div>
          <Title level={2} className="text-gray-800 mb-2">
            TOPEMS 科研研发管理系统
          </Title>
          <Text className="text-gray-500">请登录您的账户</Text>
        </div>

        {error && (
          <Alert
            title={error}
            type="error"
            showIcon
            className="mb-6"
            closable
            onClose={() => setError('')}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名或邮箱
              </label>
              <Input
                size="large"
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户名或邮箱"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <Input
                size="large"
                type={showPassword ? 'text' : 'password'}
                prefix={<LockOutlined className="text-gray-400" />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeInvisibleOutlined />
                    ) : (
                      <EyeOutlined />
                    )}
                  </button>
                }
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">记住我</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                忘记密码？
              </button>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            block
            htmlType="submit"
            loading={loading}
            className="mt-6 h-12 text-base"
          >
            <Spin spinning={loading} size="small">
              登录
            </Spin>
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Text className="text-gray-500">
            还没有账户？{' '}
            <button className="text-blue-600 hover:text-blue-700">
              联系管理员
            </button>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;