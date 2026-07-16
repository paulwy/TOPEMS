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
                  基本信息
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  站点名称、描述和图标配置
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
                label='站点名称'
                value={systemConfig.site_name}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    site_name: e.target.value,
                  }))
                }
                placeholder='输入站点名称'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='站点描述'
                value={systemConfig.site_description}
                onChange={(e) =>
                  setSystemConfig((prev) => ({
                    ...prev,
                    site_description: e.target.value,
                  }))
                }
                placeholder='输入站点描述'
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
                  外观配置
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  主题颜色和界面设置
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
                label='主色调'
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
                label='次色调'
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
                <InputLabel>时区</InputLabel>
                <Select
                  value={systemConfig.timezone}
                  label='时区'
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
                  <MenuItem value='America/New_York'>美洲/纽约 (UTC-5)</MenuItem>
                  <MenuItem value='America/Los_Angeles'>美洲/洛杉矶 (UTC-8)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>语言</InputLabel>
                <Select
                  value={systemConfig.language}
                  label='语言'
                  onChange={(e) =>
                    setSystemConfig((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                >
                  <MenuItem value='zh-CN'>中文 (简体)</MenuItem>
                  <MenuItem value='zh-TW'>中文 (繁体)</MenuItem>
                  <MenuItem value='en-US'>English</MenuItem>
                  <MenuItem value='ja-JP'>日本語</MenuItem>
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
                  安全配置
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  用户认证和密码策略
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
                label='允许用户注册'
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
                label='启用单点登录'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='默认角色'
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
                label='会话超时(分钟)'
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
                label='密码最小长度'
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
                label='最大上传大小(MB)'
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
                密码复杂度要求
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
                  label='需要大写字母'
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
                  label='需要小写字母'
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
                  label='需要数字'
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
                  label='需要特殊字符'
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
          {isSaving ? '保存中...' : '保存配置'}
        </Button>
      </Box>
    </Box>
  );
};

export default SystemConfigPanel;
