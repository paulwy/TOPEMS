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
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';

import { logger } from '@/utils/logger';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useNotificationStore } from '@/store';
import { isDevelopment } from '../../config/runtime';

// 登录表单验证 schema
const loginFormSchema = z.object({
  username: z
    .string()
    .min(1, { message: i18n.t('components.login_form_v2.k0') })
    .max(20, { message: i18n.t('components.login_form_v2.20_1') })
    .regex(/^[a-zA-Z0-9]+$/, { message: i18n.t('components.login_form_v2.k2') }),
  password: z.string().min(6, { message: i18n.t('components.login_form_v2.6_3') }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormV2Props {
  onLogin?: (values: LoginFormValues) => Promise<void>;
  className?: string;
}

export function LoginFormV2({ onLogin, className }: LoginFormV2Props) {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

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
          title: i18n.t('components.login_form_v2.k4'),
          message: i18n.t('components.login_form_v2.k5'),
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
        logger.info(i18n.t('components.login_form_v2.k0'), values);

        // 模拟登录成功
        addNotification({
          title: i18n.t('components.login_form_v2.k6'),
          message: i18n.t('components.login_form_v2.k7'),
          type: 'success',
        });
        navigate(DASHBOARD_PATHS.dashboard);
      }
    } catch (error: unknown) {
      logger.error(i18n.t('components.login_form_v2.k1'), error);
      const err = error as { message?: string };
      addNotification({
        title: i18n.t('components.login_form_v2.k8'),
        message: err.message || i18n.t('components.login_form_v2.k9'),
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
        background:
          'linear-gradient(135deg, var(--color-primary-100, #dbeafe) 0%, var(--color-primary-200, #bfdbfe) 100%)',
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
                {i18n.t('components.login_form_v2.k2')}
              </Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 600, pt: 2 }}>
                {isRegister
                  ? i18n.t('components.login_form_v2.k11')
                  : i18n.t('components.login_form_v2.k10')}
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box
            component='form'
            onSubmit={form.handleSubmit(onSubmit)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* 用户名 */}
            <Controller
              name='username'
              control={form.control}
              render={({ field, fieldState }) => (
                <FormControl error={!!fieldState.error}>
                  <FormLabel>{i18n.t('components.login_form_v2.k12')}</FormLabel>
                  <TextField
                    {...field}
                    placeholder={i18n.t('components.login_form_v2.k13')}
                    size='small'
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message || i18n.t('components.login_form_v2.20_14')
                    }
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
                    <FormLabel>{i18n.t('components.login_form_v2.k15')}</FormLabel>
                    <TextField
                      {...field}
                      type='email'
                      placeholder={i18n.t('components.login_form_v2.k16')}
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
                  <FormLabel>{i18n.t('components.login_form_v2.k17')}</FormLabel>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={i18n.t('components.login_form_v2.k18')}
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
                      <FormLabel sx={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                        {i18n.t('components.login_form_v2.k19')}
                      </FormLabel>
                      <FormHelperText sx={{ m: 0 }}>
                        {i18n.t('components.login_form_v2.k20')}
                      </FormHelperText>
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
              {loading
                ? i18n.t('components.login_form_v2.k3')
                : isRegister
                  ? i18n.t('components.login_form_v2.k22')
                  : i18n.t('components.login_form_v2.k21')}
            </Button>
          </Box>
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
              {isRegister
                ? i18n.t('components.login_form_v2.k24')
                : i18n.t('components.login_form_v2.k23')}
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
                [i18n.t('components.login_form_v2.k4')]: admin / admin123 (
                {i18n.t('components.login_form_v2.k29')}) | user / user123 (
                {i18n.t('components.login_form_v2.k28')})
              </Box>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}
