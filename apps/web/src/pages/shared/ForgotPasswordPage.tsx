import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '@/api/iam';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';

import {
  Card as MuiCard,
  CardContent,
  Box,
  IconButton,
  Typography,
  TextField,
  Button,
} from '@mui/material';

import { ModeToggle } from '@/components/theme/ModeToggle';
import { designTokens } from '@/theme/tokens';
import { AUTH_PATHS } from '@/routes/auth';

const ct = designTokens.colors;

const requestResetSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址' }),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: '重置令牌无效' }),
    password: z.string().min(6, { message: '密码至少需要6个字符' }),
    confirmPassword: z.string().min(6, { message: '请确认密码' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RequestResetValues = z.infer<typeof requestResetSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const token = searchParams.get('token');
  const isResetMode = !!token;

  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const requestForm = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      password: '',
      confirmPassword: '',
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (values: RequestResetValues) => {
      return await authApi.requestPasswordReset({ email: values.email });
    },
    onSuccess: (response) => {
      apiLogger.info('密码重置请求响应:', response);
      if (response.success) {
        setEmailSent(true);
        addNotification({
          title: '邮件已发送',
          message: '请查收邮箱中的重置密码链接',
          type: 'success',
        });
      } else {
        addNotification({
          title: '请求失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('密码重置请求错误:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '请求失败',
        type: 'error',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: ResetPasswordValues) => {
      return await authApi.confirmPasswordReset({
        token: values.token,
        new_password: values.password,
      });
    },
    onSuccess: (response) => {
      apiLogger.info('密码重置响应:', response);
      if (response.success) {
        setResetSuccess(true);
        addNotification({
          title: '密码重置成功',
          message: '请使用新密码登录',
          type: 'success',
        });
      } else {
        addNotification({
          title: '重置失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('密码重置错误:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '请求失败',
        type: 'error',
      });
    },
  });

  const loading = requestResetMutation.isPending || resetPasswordMutation.isPending;

  const handleRequestReset = (values: RequestResetValues) => {
    requestResetMutation.mutate(values);
  };

  const handleResetPassword = (values: ResetPasswordValues) => {
    resetPasswordMutation.mutate(values);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 50%, ${ct.pink[300]} 100%)`,
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Lock sx={{ width: 20, height: 20, color: 'white' }} />
          </Box>
          <Typography
            variant='h6'
            sx={{ color: 'white', fontWeight: 600 }}
          >
            TOPEMS
          </Typography>
        </Box>
        <ModeToggle />
      </Box>

      <MuiCard
        sx={{
          width: '100%',
          maxWidth: 400,
          mx: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeInUp 0.5s ease-out',
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
            padding: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {emailSent || resetSuccess ? (
              <CheckCircle sx={{ width: 36, height: 36, color: 'white' }} />
            ) : (
              <Mail sx={{ width: 36, height: 36, color: 'white' }} />
            )}
          </Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, color: 'white' }}
          >
            {isResetMode ? '重置密码' : '忘记密码'}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 1 }}
          >
            {emailSent
              ? '重置邮件已发送'
              : resetSuccess
                ? '密码已重置'
                : isResetMode
                  ? '请设置新密码'
                  : '输入邮箱以重置密码'}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          {emailSent && !isResetMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 3 }}
              >
                我们已向您的邮箱发送了密码重置链接，请查收并点击链接完成重置。
              </Typography>
              <Button
                onClick={() => navigate(AUTH_PATHS.login)}
                variant='contained'
                fullWidth
                sx={{
                  height: 48,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${ct.secondary[600]} 0%, ${ct.secondary[800]} 100%)`,
                  },
                }}
              >
                返回登录
              </Button>
            </Box>
          )}

          {resetSuccess && isResetMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 3 }}
              >
                您的密码已成功重置，请使用新密码登录。
              </Typography>
              <Button
                onClick={() => navigate(AUTH_PATHS.login)}
                variant='contained'
                fullWidth
                sx={{
                  height: 48,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${ct.secondary[600]} 0%, ${ct.secondary[800]} 100%)`,
                  },
                }}
              >
                去登录
              </Button>
            </Box>
          )}

          {!emailSent && !isResetMode && (
            <form onSubmit={requestForm.handleSubmit(handleRequestReset)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label='邮箱地址'
                  type='email'
                  placeholder='请输入注册时使用的邮箱'
                  value={requestForm.watch('email')}
                  onChange={(e) => requestForm.setValue('email', e.target.value)}
                  error={!!requestForm.formState.errors.email}
                  helperText={requestForm.formState.errors.email?.message as string}
                  size='small'
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', mr: 2, color: 'grey.400' }}
                        >
                          <Mail sx={{ width: 18, height: 18 }} />
                        </Box>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                />

                <Button
                  type='submit'
                  variant='contained'
                  sx={{
                    width: '100%',
                    height: 48,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${ct.secondary[600]} 0%, ${ct.secondary[800]} 100%)`,
                    },
                    '&:disabled': {
                      background: 'grey.400',
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? '处理中...' : '发送重置邮件'}
                </Button>
              </Box>
            </form>
          )}

          {!resetSuccess && isResetMode && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label='新密码'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='请输入新密码'
                  value={resetForm.watch('password')}
                  onChange={(e) => resetForm.setValue('password', e.target.value)}
                  error={!!resetForm.formState.errors.password}
                  helperText={resetForm.formState.errors.password?.message as string}
                  size='small'
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', mr: 2, color: 'grey.400' }}
                        >
                          <Lock sx={{ width: 18, height: 18 }} />
                        </Box>
                      ),
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          sx={{ color: 'grey.400' }}
                        >
                          {showPassword ? (
                            <EyeOff sx={{ width: 20, height: 20 }} />
                          ) : (
                            <Eye sx={{ width: 20, height: 20 }} />
                          )}
                        </IconButton>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                />

                <TextField
                  label='确认新密码'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='请再次输入新密码'
                  value={resetForm.watch('confirmPassword')}
                  onChange={(e) => resetForm.setValue('confirmPassword', e.target.value)}
                  error={!!resetForm.formState.errors.confirmPassword}
                  helperText={resetForm.formState.errors.confirmPassword?.message as string}
                  size='small'
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', mr: 2, color: 'grey.400' }}
                        >
                          <Lock sx={{ width: 18, height: 18 }} />
                        </Box>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                />

                <Button
                  type='submit'
                  variant='contained'
                  sx={{
                    width: '100%',
                    height: 48,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${ct.secondary[600]} 0%, ${ct.secondary[800]} 100%)`,
                    },
                    '&:disabled': {
                      background: 'grey.400',
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? '处理中...' : '重置密码'}
                </Button>
              </Box>
            </form>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type='button'
              onClick={() => navigate(AUTH_PATHS.login)}
              startIcon={<ArrowLeft size={16} />}
              sx={{
                color: ct.secondary[400],
                '&:hover': { color: ct.secondary[600] },
                fontSize: '0.875rem',
                background: 'transparent',
                fontWeight: 500,
              }}
            >
              返回登录
            </Button>
          </Box>
        </CardContent>
      </MuiCard>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
};

export default ForgotPasswordPage;
