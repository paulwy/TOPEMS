import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, LockReset } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/iam';
import { useNotificationStore } from '@/store/notificationStore';
import { AuthPageTemplate } from '@/components/templates/AuthPageTemplate';
import { AUTH_PATHS } from '@/routes/auth';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface ForceChangePasswordFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const forceChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, { message: i18n.t('pages.force_change_password_page.k3') }),
    new_password: z.string().min(6, { message: i18n.t('pages.force_change_password_page.k15') }),
    confirm_password: z.string().min(1, { message: i18n.t('pages.force_change_password_page.k7') }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: i18n.t('pages.force_change_password_page.k8'),
    path: ['confirm_password'],
  });

const ForceChangePasswordPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const form = useForm<ForceChangePasswordFormValues>({
    resolver: zodResolver(forceChangePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: ForceChangePasswordFormValues) => {
      const res = await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      if (!res.success) {
        throw new Error(res.message || i18n.t('pages.force_change_password_page.k13'));
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.force_change_password_page.k11'),
        message: i18n.t('pages.force_change_password_page.k12'),
        type: 'success',
      });
      // 强制改密完成后必须重新登录（新 token 的 must_change_password=false）
      logout();
      navigate(AUTH_PATHS.login, { replace: true });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        i18n.t('pages.force_change_password_page.k13');
      addNotification({
        title: i18n.t('pages.force_change_password_page.k13'),
        message: errorMsg,
        type: 'error',
      });
    },
  });

  // 未登录用户不能进入强制改密页
  if (!isAuthenticated) {
    return (
      <Navigate
        to={AUTH_PATHS.login}
        replace
      />
    );
  }

  // 兜底：非强制改密用户访问此页 → 回 dashboard
  if (user && !user.must_change_password) {
    return (
      <Navigate
        to='/dashboard'
        replace
      />
    );
  }

  const handleSubmit = (values: ForceChangePasswordFormValues) => {
    changePasswordMutation.mutate(values);
  };

  return (
    <AuthPageTemplate
      backgroundGradient={`linear-gradient(135deg, ${theme.palette.secondary[400]} 0%, ${theme.palette.secondary.dark} 50%, ${theme.palette.pink[300]} 100%)`}
      maxWidth='100%'
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          mx: 2,
          my: 8,
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
            background: `linear-gradient(135deg, ${theme.palette.secondary[400]} 0%, ${theme.palette.secondary.dark} 100%)`,
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
            <LockReset sx={{ width: 36, height: 36, color: 'common.white' }} />
          </Box>
          <Typography
            variant='h4'
            component='h1'
            sx={{ fontWeight: 700, color: 'common.white' }}
          >
            {i18n.t('pages.force_change_password_page.k14')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'common.white', mt: 1 }}
          >
            {i18n.t('pages.force_change_password_page.k0')}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}
          >
            {i18n.t('pages.force_change_password_page.k1')}
          </Typography>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <TextField
              data-testid='force-current-password'
              label={i18n.t('pages.force_change_password_page.k2')}
              type={showCurrent ? 'text' : 'password'}
              autoComplete='current-password'
              value={form.watch('current_password')}
              onChange={(e) => form.setValue('current_password', e.target.value)}
              error={!!form.formState.errors.current_password}
              helperText={form.formState.errors.current_password?.message as string}
              fullWidth
              size='small'
              margin='normal'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        onClick={() => setShowCurrent((v) => !v)}
                        edge='end'
                        size='small'
                      >
                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              data-testid='force-new-password'
              label={i18n.t('pages.force_change_password_page.k4')}
              type={showNew ? 'text' : 'password'}
              autoComplete='new-password'
              value={form.watch('new_password')}
              onChange={(e) => form.setValue('new_password', e.target.value)}
              error={!!form.formState.errors.new_password}
              helperText={form.formState.errors.new_password?.message as string}
              fullWidth
              size='small'
              margin='normal'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        onClick={() => setShowNew((v) => !v)}
                        edge='end'
                        size='small'
                      >
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              data-testid='force-confirm-password'
              label={i18n.t('pages.force_change_password_page.k6')}
              type={showConfirm ? 'text' : 'password'}
              value={form.watch('confirm_password')}
              onChange={(e) => form.setValue('confirm_password', e.target.value)}
              error={!!form.formState.errors.confirm_password}
              helperText={form.formState.errors.confirm_password?.message as string}
              fullWidth
              size='small'
              margin='normal'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        onClick={() => setShowConfirm((v) => !v)}
                        edge='end'
                        size='small'
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type='submit'
              fullWidth
              variant='contained'
              disabled={changePasswordMutation.isPending}
              sx={{ mt: 3, py: 1.2 }}
            >
              {changePasswordMutation.isPending
                ? i18n.t('pages.force_change_password_page.k9')
                : i18n.t('pages.force_change_password_page.k10')}
            </Button>
          </form>
        </CardContent>
      </Box>
    </AuthPageTemplate>
  );
};

export default ForceChangePasswordPage;
