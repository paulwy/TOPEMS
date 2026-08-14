import React from 'react';
import { Settings, Save } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { Grid } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface SystemConfigType {
  site_name: string;
  site_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  enable_registration: boolean;
  enable_sso: boolean;
  default_role: string;
  max_upload_size: number;
  session_timeout_minutes: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_symbol: boolean;
  timezone: string;
  date_format: string;
  language: string;
}

interface SystemConfigPanelProps {
  systemConfig: SystemConfigType;
  setSystemConfig: React.Dispatch<React.SetStateAction<SystemConfigType>>;
  onSave: () => void;
  isSaving: boolean;
}

const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({
  systemConfig,
  setSystemConfig,
  onSave,
  isSaving,
}) => {
  const { t } = useTranslation('system');
  return (
    <Box sx={{ mt: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                }}
              >
                <Settings size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_system_config_panel.e1')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_system_config_panel.e2')}
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={i18n.t('system.system_config_panel.k0')}
                value={systemConfig.site_name}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    site_name: e.target.value,
                  }))
                }
                placeholder={t('system.system_config_panel.k1')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k2')}
                value={systemConfig.site_description}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    site_description: e.target.value,
                  }))
                }
                placeholder={t('system.system_config_panel.k3')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='Logo URL'
                value={systemConfig.logo_url}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    logo_url: e.target.value,
                  }))
                }
                placeholder='https://example.com/logo.png'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='Favicon URL'
                value={systemConfig.favicon_url}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    favicon_url: e.target.value,
                  }))
                }
                placeholder='https://example.com/favicon.ico'
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'success.light',
                  color: 'success.main',
                }}
              >
                <Settings size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_system_config_panel.e3')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_system_config_panel.e4')}
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k4')}
                value={systemConfig.primary_color}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    primary_color: e.target.value,
                  }))
                }
                placeholder='#1890ff'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k5')}
                value={systemConfig.secondary_color}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    secondary_color: e.target.value,
                  }))
                }
                placeholder='#722ed1'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>{t('system.system_config_panel.k6')}</InputLabel>
                <Select
                  value={systemConfig.timezone}
                  label={t('system.system_config_panel.k7')}
                  onChange={(e) =>
                    setSystemConfig((prev) => ({
                      ...prev,
                      timezone: e.target.value,
                    }))
                  }
                >
                  <MenuItem value='Asia/Shanghai'>亚洲/上海 (UTC+8)</MenuItem>
                  <MenuItem value='Asia/Tokyo'>亚洲/东京 (UTC+9)</MenuItem>
                  <MenuItem value='Europe/London'>欧洲/伦敦 (UTC+0)</MenuItem>
                  <MenuItem value='America/New_York'>
                    {t('system.system_params_page_components_system_config_panel.r1')}
                  </MenuItem>
                  <MenuItem value='America/Los_Angeles'>
                    {t('system.system_params_page_components_system_config_panel.r2')}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>{t('system.system_config_panel.k8')}</InputLabel>
                <Select
                  value={systemConfig.language}
                  label={t('system.system_config_panel.k9')}
                  onChange={(e) =>
                    setSystemConfig((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                >
                  <MenuItem value='zh-CN'>{t('system.system_config_panel.k10')}</MenuItem>
                  <MenuItem value='zh-TW'>{t('system.system_config_panel.k11')}</MenuItem>
                  <MenuItem value='en-US'>English</MenuItem>
                  <MenuItem value='ja-JP'>{t('system.system_config_panel.k12')}</MenuItem>
                  <MenuItem value='ko-KR'>한국어</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.main',
                }}
              >
                <Settings size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_system_config_panel.e5')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_system_config_panel.e6')}
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={systemConfig.enable_registration}
                    onChange={(e) =>
                      setSystemConfig((prev) => ({
                        ...prev,
                        enable_registration: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.system_config_panel.k13')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={systemConfig.enable_sso}
                    onChange={(e) =>
                      setSystemConfig((prev) => ({
                        ...prev,
                        enable_sso: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.system_config_panel.k14')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k15')}
                value={systemConfig.default_role}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    default_role: e.target.value,
                  }))
                }
                placeholder='user'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k16')}
                type='number'
                value={systemConfig.session_timeout_minutes}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    session_timeout_minutes: parseInt(e.target.value) || 30,
                  }))
                }
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.k17')}
                type='number'
                value={systemConfig.password_min_length}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    password_min_length: parseInt(e.target.value) || 8,
                  }))
                }
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.system_config_panel.mb_18')}
                type='number'
                value={systemConfig.max_upload_size}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    max_upload_size: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </Grid>
            <Grid xs={12}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('system.system_params_page_components_system_config_panel.e7')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemConfig.password_require_uppercase}
                      onChange={(e) =>
                        setSystemConfig((prev) => ({
                          ...prev,
                          password_require_uppercase: e.target.checked,
                        }))
                      }
                    />
                  }
                  label={t('system.system_config_panel.k19')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemConfig.password_require_lowercase}
                      onChange={(e) =>
                        setSystemConfig((prev) => ({
                          ...prev,
                          password_require_lowercase: e.target.checked,
                        }))
                      }
                    />
                  }
                  label={t('system.system_config_panel.k20')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemConfig.password_require_number}
                      onChange={(e) =>
                        setSystemConfig((prev) => ({
                          ...prev,
                          password_require_number: e.target.checked,
                        }))
                      }
                    />
                  }
                  label={t('system.system_config_panel.k21')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemConfig.password_require_symbol}
                      onChange={(e) =>
                        setSystemConfig((prev) => ({
                          ...prev,
                          password_require_symbol: e.target.checked,
                        }))
                      }
                    />
                  }
                  label={t('system.system_config_panel.k22')}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant='contained'
          startIcon={<Save size={16} />}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : t('system.system_config_panel.k23')}
        </Button>
      </Box>
    </Box>
  );
};

export default SystemConfigPanel;
