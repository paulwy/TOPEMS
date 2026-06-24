/**
 * @deprecated 此组件已弃用，请使用 @/components/auth/LoginFormV2 中的 LoginFormV2 组件
 * 该组件将保留作为向后兼容，预计在未来的版本中移除
 */
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Box,
} from '@mui/material';
import { Button } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';

import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { isDevelopment } from '../config/runtime';

// 登录表单验证 schema
const loginFormSchema = z.object({
  username: z
    .string()
    .min(1, { message: '用户名不能为空' })
    .max(20, { message: '用户名不能超过20个字符' })
    .regex(/^[a-zA-Z0-9]+$/, { message: '用户名只能包含字母和数字' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormV2Props {
  onLogin?: (values: LoginFormValues) => Promise<void>;
  className?: string;
}

export function LoginFormV2({ onLogin, className }: LoginFormV2Props) {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // 定义表单
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  // 处理表单提交
  async function onSubmit(values: LoginFormValues) {
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

      // 如果提供了外部登录函数，则调用它
      if (onLogin) {
        await onLogin(values);
      } else {
        // 这里可以添加默认的登录逻辑
        // 示例：简单的登录成功模拟
        logger.info('登录表单提交:', values);

        // 模拟登录成功
        addNotification({
          title: '成功',
          message: '登录成功',
          type: 'success',
        });
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      logger.error('登录错误:', error);
      const err = error as { message?: string };
      addNotification({
        title: '错误',
        message: err.message || '登录失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      }}
      className={className}
    >
      <Card sx={{ width: '100%', maxWidth: 448, mx: 2 }}>
        <CardHeader
          sx={{ textAlign: 'center', pt: 4 }}
          title={
            <Box>
              <Box
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 'bold',
                  color: 'primary.main',
                  mb: 1,
                }}
              >
                TOPEMS
              </Box>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
                企业数字化平台
              </Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 600, pt: 2 }}>
                {isRegister ? '用户注册' : '用户登录'}
              </Box>
            </Box>
          }
        />
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* 用户名 */}
            <Controller
              name='username'
              control={form.control}
              render={({ field, fieldState }) => (
                <FormControl error={!!fieldState.error}>
                  <FormLabel>用户名</FormLabel>
                  <TextField
                    {...field}
                    placeholder='请输入用户名'
                    size='small'
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || '字母或数字组合，最多20位'}
                  />
                </FormControl>
              )}
            />

            {/* 邮箱 (仅注册时显示) */}
            {isRegister && (
              <Controller
                name='username'
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl error={!!fieldState.error}>
                    <FormLabel>邮箱</FormLabel>
                    <TextField
                      {...field}
                      type='email'
                      placeholder='请输入邮箱'
                      size='small'
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  </FormControl>
                )}
              />
            )}

            {/* 密码 */}
            <Controller
              name='password'
              control={form.control}
              render={({ field, fieldState }) => (
                <FormControl error={!!fieldState.error}>
                  <FormLabel>密码</FormLabel>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder='请输入密码'
                      size='small'
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{ width: '100%', pr: 5 }}
                    />
                    <Box
                      component='button'
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: 20, height: 20 }} />
                      ) : (
                        <Eye style={{ width: 20, height: 20 }} />
                      )}
                    </Box>
                  </Box>
                </FormControl>
              )}
            />

            {/* 记住我 */}
            {!isRegister && (
              <Controller
                name='rememberMe'
                control={form.control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Checkbox
                      checked={field.value || false}
                      onChange={field.onChange}
                      size='small'
                    />
                    <Box>
                      <FormLabel sx={{ fontSize: '0.875rem', cursor: 'pointer' }}>记住我</FormLabel>
                      <FormHelperText sx={{ m: 0 }}>在本设备上保持登录状态</FormHelperText>
                    </Box>
                  </Box>
                )}
              />
            )}

            {/* 提交按钮 */}
            <Button
              type='submit'
              variant='contained'
              disabled={loading}
              sx={{ width: '100%' }}
            >
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </Button>
          </form>
        </CardContent>
        <Box
          sx={{
            pb: 4,
            pt: 2,
            px: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box
              component='button'
              type='button'
              onClick={() => setIsRegister(!isRegister)}
              sx={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'primary.main',
                fontSize: '0.875rem',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
            </Box>
          </Box>

          {/* 演示账号 */}
          {isDevelopment() && (
            <Box
              sx={{
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                演示账号: admin / admin123 (管理员) | user / user123 (普通员工)
              </Box>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}
