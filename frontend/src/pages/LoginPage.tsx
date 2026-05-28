import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FieldError, ValidationHint } from '../components/ValidationError';
import { patterns } from '../utils/validation';
import { isDevelopment } from '../config/runtime';

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'username':
        if (!value.trim()) return '用户名不能为空';
        if (value.length > 20) return '用户名不能超过20个字符';
        if (!patterns.username.test(value)) return '用户名只能包含字母和数字';
        return null;
      case 'email':
        if (!value.trim()) return '邮箱不能为空';
        if (!patterns.email.test(value)) return '请输入有效的邮箱地址';
        return null;
      case 'password':
        if (!value) return '密码不能为空';
        if (value.length < 6) return '密码至少需要6个字符';
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    if (touched[field]) {
      const error = validateField(field, value);
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field] = error;
        } else {
          delete newErrors[field];
        }
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData] as string);
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.username.trim()) {
      errors.username = '用户名不能为空';
      isValid = false;
    } else if (formData.username.length > 20) {
      errors.username = '用户名不能超过20个字符';
      isValid = false;
    } else if (!patterns.username.test(formData.username)) {
      errors.username = '用户名只能包含字母和数字';
      isValid = false;
    }

    if (isRegister) {
      if (!formData.email.trim()) {
        errors.email = '邮箱不能为空';
        isValid = false;
      } else if (!patterns.email.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址';
        isValid = false;
      }
    }

    if (!formData.password) {
      errors.password = '密码不能为空';
      isValid = false;
    } else if (formData.password.length < 6) {
      errors.password = '密码至少需要6个字符';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setTouched({ username: true, email: true, password: true });
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (isRegister) {
        // 注册功能由管理员管理
        setError('注册功能已关闭，请联系管理员获取账号');
        return;
      } else {
        response = await login({
          username: formData.username, password: formData.password });
      }

      console.log('登录响应:', response);

      if (response.success) {
        navigate('/dashboard');
      } else {
        setError(response.message || '操作失败');
      }
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message || '请求失败');
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
              className={`input ${fieldErrors.username && touched.username ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              onBlur={() => handleFieldBlur('username')}
              placeholder="请输入用户名"
            />
            <FieldError error={fieldErrors.username && touched.username ? fieldErrors.username : undefined} />
            {!touched.username && !isRegister && (
              <ValidationHint 
                field="用户名" 
                rules={['最多20位字母或数字', '字母或数字组合']} 
              />
            )}
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-2">邮箱</label>
              <input
                type="email"
                className={`input ${fieldErrors.email && touched.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="请输入邮箱"
              />
              <FieldError error={fieldErrors.email && touched.email ? fieldErrors.email : undefined} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`input pr-12 ${fieldErrors.password && touched.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={() => handleFieldBlur('password')}
                placeholder="请输入密码"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <FieldError error={fieldErrors.password && touched.password ? fieldErrors.password : undefined} />
            {isRegister && !touched.password && (
              <ValidationHint 
                field="密码" 
                rules={['至少8位', '包含大小写字母', '包含数字']} 
              />
            )}
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

        {/* 演示账号仅在开发环境显示 */}
        {isDevelopment() && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              演示账号: admin / admin123 (管理员) | user / user123 (普通员工) | guest / guest123 (访客)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
