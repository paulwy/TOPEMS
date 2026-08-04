import React, { useState } from 'react';
import { WizardPageTemplate, type WizardStep } from '../../components/templates/WizardPageTemplate';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import { Building2, User, Settings, CheckCircle2 } from 'lucide-react';
import { tenantApi } from '@/api/tenant';
import type { TenantPlan } from '@/api/tenant/types';
import { useNotificationStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 本地定义：后端 onboardTenant API 尚未在 tenantApi 客户端实现，先用本地类型占位
interface OnboardTenantResponse {
  tenant: {
    id: string;
    name: string;
    code: string;
    plan: TenantPlan;
  };
  admin_username: string;
  admin_email: string;
}

type OnboardTenantApi = (
  data: Record<string, unknown>
) => Promise<{ success: boolean; data: OnboardTenantResponse | null; message?: string }>;

const PaperInfo: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
    <Typography
      variant='caption'
      color='text.secondary'
    >
      {title}
    </Typography>
    <Typography
      variant='body2'
      sx={{ mt: 0.5, wordBreak: 'break-all' }}
    >
      {value}
    </Typography>
  </Box>
);

interface TenantFormData {
  name: string;
  code: string;
  tenant_type: string;
  plan: TenantPlan;
  admin_username: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
  default_department_name: string;
  default_department_description: string;
}

const initialFormData: TenantFormData = {
  name: '',
  code: '',
  tenant_type: 'shared',
  plan: 'basic',
  admin_username: '',
  admin_email: '',
  admin_password: '',
  admin_password_confirm: '',
  default_department_name: '总部',
  default_department_description: '',
};

export const TenantOnboardingWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<TenantFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardTenantResponse | null>(null);

  const update = (patch: Partial<TenantFormData>) => setFormData((prev) => ({ ...prev, ...patch }));

  const steps: WizardStep[] = [
    {
      id: 'tenant-info',
      label: t('admin.tenantOnboarding.租户信息'),
      description: t('admin.tenantOnboarding.填写租户名称_编码与套餐'),
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('admin.tenantOnboarding.租户名称')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => update({ name: e.target.value })}
            helperText={t('admin.tenantOnboarding.租户的显示名称')}
          />
          <TextField
            label={t('admin.tenantOnboarding.租户编码')}
            fullWidth
            required
            value={formData.code}
            onChange={(e) =>
              update({ code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
            }
            helperText={t('admin.tenantOnboarding.用于子域名路由_仅小写字母_数字_连字符')}
          />
          <FormControl fullWidth>
            <InputLabel>{t('admin.tenantOnboarding.租户类型')}</InputLabel>
            <Select
              label={t('admin.tenantOnboarding.租户类型')}
              value={formData.tenant_type}
              onChange={(e) => update({ tenant_type: e.target.value })}
            >
              <MenuItem value='shared'>{t('admin.tenantOnboarding.共享数据库')}</MenuItem>
              <MenuItem value='independent'>{t('admin.tenantOnboarding.独立数据库')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('admin.tenantOnboarding.套餐')}</InputLabel>
            <Select
              label={t('admin.tenantOnboarding.套餐')}
              value={formData.plan}
              onChange={(e) => update({ plan: e.target.value as TenantPlan })}
            >
              <MenuItem value='free'>{t('admin.tenantOnboarding.免费版')}</MenuItem>
              <MenuItem value='basic'>{t('admin.tenantOnboarding.基础版')}</MenuItem>
              <MenuItem value='professional'>{t('admin.tenantOnboarding.专业版')}</MenuItem>
              <MenuItem value='enterprise'>{t('admin.tenantOnboarding.企业版')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      ),
      validation: () => formData.name.trim().length >= 2 && formData.code.trim().length >= 2,
    },
    {
      id: 'admin-account',
      label: t('admin.tenantOnboarding.管理员账户'),
      description: t('admin.tenantOnboarding.为该租户创建超级管理员账号'),
      icon: <User style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('admin.tenantOnboarding.管理员用户名')}
            fullWidth
            required
            value={formData.admin_username}
            onChange={(e) => update({ admin_username: e.target.value })}
          />
          <TextField
            label={t('admin.tenantOnboarding.管理员邮箱')}
            fullWidth
            required
            type='email'
            value={formData.admin_email}
            onChange={(e) => update({ admin_email: e.target.value })}
          />
          <TextField
            label={t('admin.tenantOnboarding.管理员密码')}
            fullWidth
            required
            type='password'
            value={formData.admin_password}
            onChange={(e) => update({ admin_password: e.target.value })}
            helperText={t('admin.tenantOnboarding.至少6位字符')}
          />
          <TextField
            label={t('admin.tenantOnboarding.确认密码')}
            fullWidth
            required
            type='password'
            value={formData.admin_password_confirm}
            onChange={(e) => update({ admin_password_confirm: e.target.value })}
            error={
              formData.admin_password_confirm.length > 0 &&
              formData.admin_password_confirm !== formData.admin_password
            }
            helperText={
              formData.admin_password_confirm.length > 0 &&
              formData.admin_password_confirm !== formData.admin_password
                ? t('admin.tenantOnboarding.两次输入的密码不一致')
                : ''
            }
          />
        </Box>
      ),
      validation: () =>
        formData.admin_username.trim().length >= 3 &&
        /\S+@\S+\.\S+/.test(formData.admin_email) &&
        formData.admin_password.length >= 6 &&
        formData.admin_password === formData.admin_password_confirm,
    },
    {
      id: 'organization',
      label: t('admin.tenantOnboarding.组织结构'),
      description: t('admin.tenantOnboarding.设置默认部门_可后续调整'),
      icon: <Settings style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('admin.tenantOnboarding.默认部门名称')}
            fullWidth
            value={formData.default_department_name}
            onChange={(e) => update({ default_department_name: e.target.value })}
            helperText={t('admin.tenantOnboarding.新租户的根部门名称')}
          />
          <TextField
            label={t('admin.tenantOnboarding.部门描述')}
            multiline
            rows={3}
            fullWidth
            value={formData.default_department_description}
            onChange={(e) => update({ default_department_description: e.target.value })}
            helperText={t('admin.tenantOnboarding.可选_对该部门的补充说明')}
          />
        </Box>
      ),
      validation: () => formData.default_department_name.trim().length > 0,
    },
    {
      id: 'review',
      label: t('admin.tenantOnboarding.确认与创建'),
      description: t('admin.tenantOnboarding.确认信息无误后提交'),
      icon: <CheckCircle2 style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {t('admin.tenantOnboarding.租户信息')}
          </Typography>
          <PaperInfo
            title={t('admin.tenantOnboarding.租户名称')}
            value={formData.name || '-'}
          />
          <PaperInfo
            title={t('admin.tenantOnboarding.租户编码')}
            value={formData.code || '-'}
          />
          <PaperInfo
            title={t('admin.tenantOnboarding.租户类型')}
            value={
              formData.tenant_type === 'independent'
                ? t('admin.tenantOnboarding.独立数据库')
                : t('admin.tenantOnboarding.共享数据库')
            }
          />
          <PaperInfo
            title={t('admin.tenantOnboarding.套餐')}
            value={formData.plan}
          />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mt: 1 }}
          >
            {t('admin.tenantOnboarding.管理员账户')}
          </Typography>
          <PaperInfo
            title={t('admin.tenantOnboarding.管理员用户名')}
            value={formData.admin_username || '-'}
          />
          <PaperInfo
            title={t('admin.tenantOnboarding.管理员邮箱')}
            value={formData.admin_email || '-'}
          />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mt: 1 }}
          >
            {t('admin.tenantOnboarding.组织结构')}
          </Typography>
          <PaperInfo
            title={t('admin.tenantOnboarding.默认部门名称')}
            value={formData.default_department_name || '-'}
          />
          <PaperInfo
            title={t('admin.tenantOnboarding.部门描述')}
            value={formData.default_department_description || '-'}
          />
        </Box>
      ),
    },
  ];

  const handleComplete = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await (
        tenantApi as unknown as { onboardTenant: OnboardTenantApi }
      ).onboardTenant({
        name: formData.name,
        code: formData.code,
        tenant_type: formData.tenant_type,
        plan: formData.plan,
        admin_username: formData.admin_username,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
        default_department_name: formData.default_department_name,
        default_department_description: formData.default_department_description || undefined,
      });
      if (response.success && response.data) {
        setResult(response.data);
        addNotification({
          type: 'success',
          title: t('admin.tenantOnboarding.成功'),
          message: t('admin.tenantOnboarding.租户初始化成功'),
        });
      } else {
        setErrorMsg(response.message || t('admin.tenantOnboarding.初始化失败'));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.tenantOnboarding.初始化失败');
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/tenant');
  };

  const handleReset = () => {
    setResult(null);
    setErrorMsg(null);
    setFormData(initialFormData);
  };

  if (result) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Alert
            severity='success'
            sx={{ mb: 3 }}
            icon={<CheckCircle2 style={{ width: 20, height: 20 }} />}
          >
            {t('admin.tenantOnboarding.租户初始化成功')}
          </Alert>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('admin.tenantOnboarding.创建结果')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PaperInfo
              title={t('admin.tenantOnboarding.租户名称')}
              value={result.tenant.name}
            />
            <PaperInfo
              title={t('admin.tenantOnboarding.租户编码')}
              value={result.tenant.code}
            />
            <PaperInfo
              title={t('admin.tenantOnboarding.租户ID')}
              value={result.tenant.id}
            />
            <PaperInfo
              title={t('admin.tenantOnboarding.套餐')}
              value={result.tenant.plan}
            />
            <PaperInfo
              title={t('admin.tenantOnboarding.管理员用户名')}
              value={result.admin_username}
            />
            <PaperInfo
              title={t('admin.tenantOnboarding.管理员邮箱')}
              value={result.admin_email}
            />
          </Box>
          <Alert
            severity='info'
            sx={{ mt: 3 }}
          >
            {t('admin.tenantOnboarding.请使用上方管理员账户登录系统_密码为您在向导中设置的密码')}
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant='contained'
              onClick={() => navigate('/admin/tenant')}
            >
              {t('admin.tenantOnboarding.返回租户列表')}
            </Button>
            <Button
              variant='outlined'
              onClick={handleReset}
            >
              {t('admin.tenantOnboarding.继续创建')}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <WizardPageTemplate
      title={t('admin.tenantOnboarding.租户初始化向导')}
      subtitle={t('admin.tenantOnboarding.引导式创建租户并预置管理员与权限')}
      steps={steps}
      onComplete={handleComplete}
      onCancel={handleCancel}
      submitting={submitting}
      error={errorMsg || undefined}
      showStepNumbers
      showProgress
      showNavigation
      finishButtonText={t('admin.tenantOnboarding.创建租户')}
    />
  );
};

export default TenantOnboardingWizardPage;
