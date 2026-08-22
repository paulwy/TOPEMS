import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import { authApi } from '@/api/iam';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User, Shield, Fingerprint } from 'lucide-react';
import { isDevelopment } from '../../config/runtime';
import { useNotificationStore } from '../../store';
import { AUTH_PATHS } from '@/routes/auth';

import {
  Card as MuiCard,
  CardContent,
  Box,
  IconButton,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import i18n from '@/i18n';

import { ModeToggle } from '@/components/theme/ModeToggle';
import { designTokens } from '@/theme/tokens';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const loginFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: i18n.t('pages.login_page.2_0') })
    .max(20, { message: i18n.t('pages.login_page.20_1') })
    .regex(/^[a-zA-Z0-9]+$/, { message: i18n.t('pages.login_page.k2') }),
  password: z.string().min(6, { message: i18n.t('pages.login_page.6_3') }),
  email: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      return await login({
        username: values.username,
        password: values.password,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      apiLogger.info(i18n.t('pages.login_page.k0'), response);
      if (response.success) {
        addNotification({
          title: i18n.t('pages.login_page.k4'),
          message: i18n.t('pages.login_page.k5'),
          type: 'success',
        });
        const locationState = (window.history.state as { usr?: { from?: { pathname?: string } } })
          ?.usr;
        const from = locationState?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        addNotification({
          title: i18n.t('pages.login_page.k6'),
          message: (response.message as string) || i18n.t('pages.login_page.k7'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.login_page.k1'), err);
      addNotification({
        title: i18n.t('pages.login_page.k8'),
        message: (err as { message?: string }).message || i18n.t('pages.login_page.k9'),
        type: 'error',
      });
    },
  });

  const loading = loginMutation.isPending;

  const handleSubmit = async (values: LoginFormValues) => {
    if (isRegister) {
      try {
        await authApi.register({
          username: values.username,
          email: values.email || '',
          password: values.password,
        });
        addNotification({
          title: i18n.t('pages.login_page.k10'),
          message: i18n.t('pages.login_page.k11'),
          type: 'success',
        });
        setIsRegister(false);
      } catch (err) {
        addNotification({
          title: i18n.t('pages.login_page.k12'),
          message: err instanceof Error ? err.message : i18n.t('pages.login_page.k13'),
          type: 'error',
        });
      }
      return;
    }
    loginMutation.mutate(values);
  };

  return (
    <Box
      className='login-page'
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
          background: 'action.disabledBackground',
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
          background: 'action.disabledBackground',
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
              background: 'action.disabledBackground',
              borderRadius: 'lg',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Shield sx={{ width: 20, height: 20, color: 'common.white' }} />
          </Box>
          <Typography
            variant='h6'
            sx={{ color: 'common.white', fontWeight: 600 }}
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
          background: 'common.white',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: designTokens.shadows['2xl'],
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
              background: 'action.disabledBackground',
              borderRadius: '2xl',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: `0 auto ${designTokens.spacing.md}px`,
            }}
          >
            <Fingerprint sx={{ width: 36, height: 36, color: 'common.white' }} />
          </Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, color: 'common.white' }}
          >
            {isRegister ? i18n.t('pages.login_page.k15') : i18n.t('pages.login_page.k14')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'common.white', mt: 1 }}
          >
            {isRegister ? i18n.t('pages.login_page.k17') : i18n.t('pages.login_page.k16')}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label={i18n.t('pages.login_page.k18')}
                placeholder={i18n.t('pages.login_page.k19')}
                value={form.watch('username')}
                onChange={(e) => form.setValue('username', e.target.value)}
                error={!!form.formState.errors.username}
                helperText={form.formState.errors.username?.message as string}
                size='small'
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mr: 2,
                          color: 'grey.400',
                        }}
                      >
                        <User sx={{ width: 18, height: 18 }} />
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

              {isRegister && (
                <TextField
                  label={i18n.t('pages.login_page.k20')}
                  type='email'
                  placeholder={i18n.t('pages.login_page.k21')}
                  value={form.watch('email') || ''}
                  onChange={(e) => form.setValue('email', e.target.value)}
                  error={!!form.formState.errors.email}
                  helperText={form.formState.errors.email?.message as string}
                  size='small'
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    },
                  }}
                />
              )}

              <TextField
                label={i18n.t('pages.login_page.k22')}
                type={showPassword ? 'text' : 'password'}
                placeholder={i18n.t('pages.login_page.k23')}
                value={form.watch('password')}
                onChange={(e) => form.setValue('password', e.target.value)}
                error={!!form.formState.errors.password}
                helperText={form.formState.errors.password?.message as string}
                size='small'
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mr: 2,
                          color: 'grey.400',
                        }}
                      >
                        <Lock sx={{ width: 18, height: 18 }} />
                      </Box>
                    ),
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: 'grey.400' }}
                        aria-label={i18n.t('pages.login_page.k24')}
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

              {!isRegister && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: form.watch('password')?.match(/[A-Z]/)
                          ? 'success.dark'
                          : 'grey.200',
                      }}
                    ></Box>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.login_page.k0')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: form.watch('password')?.match(/[a-z]/)
                          ? 'success.dark'
                          : 'grey.200',
                      }}
                    ></Box>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.login_page.k1')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: form.watch('password')?.match(/[0-9]/)
                          ? 'success.dark'
                          : 'grey.200',
                      }}
                    ></Box>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.login_page.k2')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: form.watch('password')?.match(/[^a-zA-Z0-9]/)
                          ? 'success.dark'
                          : 'grey.200',
                      }}
                    ></Box>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {i18n.t('pages.login_page.k3')}
                    </Typography>
                  </Box>
                </Box>
              )}

              {!isRegister && (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Button
                    type='button'
                    onClick={() => navigate(AUTH_PATHS.forgotPassword)}
                    sx={{
                      color: ct.secondary[400],
                      '&:hover': { color: ct.secondary[600] },
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      background: 'transparent',
                      fontWeight: 500,
                      padding: 0,
                      minWidth: 'auto',
                    }}
                  >
                    {i18n.t('pages.login_page.k4')}
                  </Button>
                </Box>
              )}

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
                {loading
                  ? i18n.t('pages.login_page.k2')
                  : isRegister
                    ? i18n.t('pages.login_page.k26')
                    : i18n.t('pages.login_page.k25')}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type='button'
              onClick={() => setIsRegister(!isRegister)}
              sx={{
                color: ct.secondary[400],
                '&:hover': { color: ct.secondary[600] },
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                background: 'transparent',
                fontWeight: 500,
              }}
            >
              {isRegister ? i18n.t('pages.login_page.k28') : i18n.t('pages.login_page.k27')}
            </Button>
          </Box>

          {isDevelopment() && (
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid grey.200' }}>
              <Typography
                variant='caption'
                sx={{ color: 'text.disabled', textAlign: 'center', display: 'block' }}
              >
                {i18n.t('pages.login_page.k5')}: admin / admin123 ({i18n.t('shared.permissions.k54')}) | user / user123
                ({i18n.t('pages.login_page.k29')})
              </Typography>
            </Box>
          )}
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

export default LoginPage;
