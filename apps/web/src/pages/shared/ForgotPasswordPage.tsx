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
import i18n from '@/i18n';

import { ModeToggle } from '@/components/theme/ModeToggle';
import { designTokens } from '@/theme/tokens';
import { AUTH_PATHS } from '@/routes/auth';
import { AuthPageTemplate } from '@/components/templates';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const requestResetSchema = z.object({
  email: z.string().email({ message: i18n.t('pages.forgot_password_page.k0') }),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: i18n.t('pages.forgot_password_page.k1') }),
    password: z.string().min(6, { message: i18n.t('pages.forgot_password_page.6_2') }),
    confirmPassword: z.string().min(6, { message: i18n.t('pages.forgot_password_page.k3') }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t('pages.forgot_password_page.k4'),
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      apiLogger.info(i18n.t('pages.forgot_password_page.k0'), response);
      if (response.success) {
        setEmailSent(true);
        addNotification({
          title: i18n.t('pages.forgot_password_page.k5'),
          message: i18n.t('pages.forgot_password_page.k6'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('pages.forgot_password_page.k7'),
          message: response.message || i18n.t('pages.forgot_password_page.k8'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.forgot_password_page.k1'), err);
      addNotification({
        title: i18n.t('pages.forgot_password_page.k9'),
        message: (err as { message?: string }).message || i18n.t('pages.forgot_password_page.k10'),
        type: 'error',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: ResetPasswordValues) => {
      return await authApi.confirmPasswordReset({
        reset_token: values.token,
        new_password: values.password,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      apiLogger.info(i18n.t('pages.forgot_password_page.k2'), response);
      if (response.success) {
        setResetSuccess(true);
        addNotification({
          title: i18n.t('pages.forgot_password_page.k11'),
          message: i18n.t('pages.forgot_password_page.k12'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('pages.forgot_password_page.k13'),
          message: response.message || i18n.t('pages.forgot_password_page.k14'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.forgot_password_page.k3'), err);
      addNotification({
        title: i18n.t('pages.forgot_password_page.k15'),
        message: (err as { message?: string }).message || i18n.t('pages.forgot_password_page.k16'),
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
    <AuthPageTemplate
      backgroundGradient={`linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 50%, ${ct.pink[300]} 100%)`}
      maxWidth='100%'
    >
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
            <Lock
              sx={{
                width: 20,
                height: 20,
                color: 'common.white',
              }}
            />
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
            {emailSent || resetSuccess ? (
              <CheckCircle
                sx={{
                  width: 36,
                  height: 36,
                  color: 'common.white',
                }}
              />
            ) : (
              <Mail
                sx={{
                  width: 36,
                  height: 36,
                  color: 'common.white',
                }}
              />
            )}
          </Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, color: 'common.white' }}
          >
            {isResetMode
              ? i18n.t('pages.forgot_password_page.k18')
              : i18n.t('pages.forgot_password_page.k17')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'common.white', mt: 1 }}
          >
            {emailSent
              ? i18n.t('pages.forgot_password_page.k19')
              : resetSuccess
                ? i18n.t('pages.forgot_password_page.k20')
                : isResetMode
                  ? i18n.t('pages.forgot_password_page.k21')
                  : i18n.t('pages.forgot_password_page.k22')}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          {emailSent && !isResetMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 3 }}
              >
                {i18n.t('pages.forgot_password_page.k0')}
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
                {i18n.t('pages.forgot_password_page.k1')}
              </Button>
            </Box>
          )}

          {resetSuccess && isResetMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 3 }}
              >
                {i18n.t('pages.forgot_password_page.k2')}
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
                {i18n.t('pages.forgot_password_page.k3')}
              </Button>
            </Box>
          )}

          {!emailSent && !isResetMode && (
            <form onSubmit={requestForm.handleSubmit(handleRequestReset)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label={i18n.t('pages.forgot_password_page.k23')}
                  type='email'
                  placeholder={i18n.t('pages.forgot_password_page.k24')}
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
                  {loading
                    ? i18n.t('pages.forgot_password_page.k4')
                    : i18n.t('pages.forgot_password_page.k25')}
                </Button>
              </Box>
            </form>
          )}

          {!resetSuccess && isResetMode && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label={i18n.t('pages.forgot_password_page.k26')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={i18n.t('pages.forgot_password_page.k27')}
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
                          aria-label={i18n.t('pages.forgot_password_page.k28')}
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
                  label={i18n.t('pages.forgot_password_page.k29')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={i18n.t('pages.forgot_password_page.k30')}
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
                  {loading
                    ? i18n.t('pages.forgot_password_page.k5')
                    : i18n.t('pages.forgot_password_page.k31')}
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                background: 'transparent',
                fontWeight: 500,
              }}
            >
              {i18n.t('pages.forgot_password_page.k4')}
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
    </AuthPageTemplate>
  );
};

export default ForgotPasswordPage;
