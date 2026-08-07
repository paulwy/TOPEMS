import React from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from '@mui/material';
import { Shield, Mail, Settings, CheckCircle2, Save } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { AUTH_PATHS } from '@/routes/auth';
import { UseFormReturn } from 'react-hook-form';
import type { User as UserType } from '@/api/iam';

export interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ProfileSecurityPanelProps {
  user: UserType;
  showPasswordDialog: boolean;
  passwordForm: UseFormReturn<PasswordFormData>;
  onOpenPasswordDialog: () => void;
  onClosePasswordDialog: () => void;
  onPasswordChangeSubmit: (data: PasswordFormData) => void;
  onLogout: () => void;
  navigate: (path: string) => void;
}

const ct = designTokens.colors;

const ProfileSecurityPanel: React.FC<ProfileSecurityPanelProps> = ({
  user,
  showPasswordDialog,
  passwordForm,
  onOpenPasswordDialog,
  onClosePasswordDialog,
  onPasswordChangeSubmit,
  onLogout,
  navigate,
}) => {
  const theme = useTheme();

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield
              size={20}
              style={{ color: theme.palette.primary.dark }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                修改密码
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                定期更新密码以保护账户安全
              </Typography>
            </Box>
          </Box>
          <Button
            variant='contained'
            onClick={onOpenPasswordDialog}
          >
            修改密码
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Mail
              size={20}
              style={{ color: theme.palette.success.dark }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                邮箱验证
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {user.email} 已验证
              </Typography>
            </Box>
          </Box>
          <CheckCircle2
            size={20}
            style={{ color: theme.palette.success.dark }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings
              size={20}
              style={{ color: ct.purple[600] }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                登录状态
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                当前会话活跃中
              </Typography>
            </Box>
          </Box>
          <Button
            variant='outlined'
            onClick={() => {
              onLogout();
              navigate(AUTH_PATHS.login);
            }}
          >
            退出登录
          </Button>
        </Box>
      </Box>

      <Dialog
        open={showPasswordDialog}
        onClose={onClosePasswordDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>修改密码</DialogTitle>
        <Box
          component='form'
          onSubmit={passwordForm.handleSubmit(onPasswordChangeSubmit)}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              请输入当前密码和新密码来完成密码修改
            </Typography>
            <TextField
              fullWidth
              label='当前密码 *'
              type='password'
              {...passwordForm.register('current_password', {
                required: '当前密码是必填项',
              })}
              placeholder='请输入当前密码'
              error={!!passwordForm.formState.errors.current_password}
              helperText={passwordForm.formState.errors.current_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label='新密码 *'
              type='password'
              {...passwordForm.register('new_password', {
                required: '新密码是必填项',
                minLength: { value: 6, message: '密码长度至少为6位' },
              })}
              placeholder='请输入新密码（至少6位）'
              error={!!passwordForm.formState.errors.new_password}
              helperText={passwordForm.formState.errors.new_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label='确认新密码 *'
              type='password'
              {...passwordForm.register('confirm_password', {
                required: '请再次输入新密码',
              })}
              placeholder='请再次输入新密码'
              error={!!passwordForm.formState.errors.confirm_password}
              helperText={passwordForm.formState.errors.confirm_password?.message}
              size='small'
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                onClosePasswordDialog();
                passwordForm.reset();
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
              startIcon={<Save size={16} />}
            >
              确认修改
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default ProfileSecurityPanel;
export { ProfileSecurityPanel };
