import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { isDevelopment } from '../config/runtime';
import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';

// 登录表单验证 schema
const loginFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: '用户名长度至少为2位' })
    .max(20, { message: '用户名不能超过20个字符' })
    .regex(/^[a-zA-Z0-9]+$/, { message: '用户名只能包含字母和数字' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
  email: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const addNotification = useAppStore((state) => state.addNotification);

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 定义表单
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  // 处理表单提交
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      if (isRegister) {
        // 注册功能由管理员管理
        addNotification({
          title: '提示',
          message: '注册功能已关闭，请联系管理员获取账号',
          type: 'info',
        });
        return;
      }

      let response = await login({
        username: values.username,
        password: values.password,
      });

      console.log('登录响应:', response);

      if (response.success) {
        addNotification({
          title: '登录成功',
          message: '欢迎回来！',
          type: 'success',
        });
        navigate('/dashboard');
      } else {
        addNotification({
          title: '登录失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('登录错误:', err);
      addNotification({
        title: '错误',
        message: err.message || '请求失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800'>
      {/* 主题切换按钮 */}
      <div className='fixed top-4 right-4'>
        <ModeToggle />
      </div>

      <Card className='w-full max-w-md mx-4 shadow-lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-3xl font-bold text-blue-600 dark:text-blue-400'>TOPEMS</CardTitle>
          <CardDescription>企业数字化平台</CardDescription>
          <h2 className='text-2xl font-semibold pt-4'>{isRegister ? '用户注册' : '用户登录'}</h2>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
              {/* 用户名 */}
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder='请输入用户名' {...field} />
                    </FormControl>
                    {!isRegister && <FormDescription>字母或数字组合，最多20位</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 邮箱 (仅注册时显示) */}
              {isRegister && (
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type='email' placeholder='请输入邮箱' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 密码 */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='请输入密码'
                          {...field}
                          className='pr-12'
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        >
                          {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 提交按钮 */}
              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? '处理中...' : isRegister ? '注册' : '登录'}
              </Button>
            </form>
          </Form>

          <div className='mt-4 text-center'>
            <button
              type='button'
              onClick={() => setIsRegister(!isRegister)}
              className='text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm'
            >
              {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
            </button>
          </div>

          {/* 演示账号 */}
          {isDevelopment() && (
            <div className='mt-6 pt-6 border-t border-slate-200 dark:border-slate-700'>
              <p className='text-xs text-slate-500 dark:text-slate-400 text-center'>
                演示账号: admin / admin123 (管理员) | user / user123 (普通员工)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
