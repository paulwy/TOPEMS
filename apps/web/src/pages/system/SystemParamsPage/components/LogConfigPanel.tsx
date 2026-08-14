import React from 'react';
import { FileText, Save, AlertCircle } from 'lucide-react';
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
  Chip,
} from '@mui/material';
import { Grid } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface LogConfigType {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  output: 'console' | 'file' | 'both';
  file_path: string;
  max_file_size_mb: number;
  max_files: number;
  log_to_db: boolean;
  console_enabled: boolean;
  remote_logging_enabled: boolean;
  remote_logging_url: string;
}

interface LogConfigPanelProps {
  logConfig: LogConfigType;
  setLogConfig: React.Dispatch<React.SetStateAction<LogConfigType>>;
  onSave: () => void;
  isSaving: boolean;
}

const LogConfigPanel: React.FC<LogConfigPanelProps> = ({
  logConfig,
  setLogConfig,
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
                <FileText size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_log_config_panel.e1')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_log_config_panel.e2')}
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
              <FormControl fullWidth>
                <InputLabel>{i18n.t('system.log_config_panel.k0')}</InputLabel>
                <Select
                  value={logConfig.level}
                  label={t('system.log_config_panel.k1')}
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      level: e.target.value as typeof logConfig.level,
                    }))
                  }
                >
                  <MenuItem value='trace'>Trace</MenuItem>
                  <MenuItem value='debug'>Debug</MenuItem>
                  <MenuItem value='info'>Info</MenuItem>
                  <MenuItem value='warn'>Warn</MenuItem>
                  <MenuItem value='error'>Error</MenuItem>
                  <MenuItem value='fatal'>Fatal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>{t('system.log_config_panel.k2')}</InputLabel>
                <Select
                  value={logConfig.format}
                  label={t('system.log_config_panel.k3')}
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      format: e.target.value as typeof logConfig.format,
                    }))
                  }
                >
                  <MenuItem value='json'>JSON</MenuItem>
                  <MenuItem value='text'>{t('system.log_config_panel.k4')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>{t('system.log_config_panel.k5')}</InputLabel>
                <Select
                  value={logConfig.output}
                  label={t('system.log_config_panel.k6')}
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      output: e.target.value as typeof logConfig.output,
                    }))
                  }
                >
                  <MenuItem value='console'>{t('system.log_config_panel.k7')}</MenuItem>
                  <MenuItem value='file'>{t('system.log_config_panel.k8')}</MenuItem>
                  <MenuItem value='both'>{t('system.log_config_panel.k9')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.log_to_db}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        log_to_db: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.log_config_panel.k10')}
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
                  bgcolor: 'warning.light',
                  color: 'warning.main',
                }}
              >
                <FileText size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_log_config_panel.e3')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_log_config_panel.e4')}
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
            <Grid xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.output !== 'console'}
                    disabled
                  />
                }
                label={
                  <span>
                    {t('system.system_params_page_components_log_config_panel.e5')}
                    <Chip
                      label={
                        logConfig.output === 'console'
                          ? t('system.log_config_panel.k12')
                          : t('system.log_config_panel.k11')
                      }
                      size='small'
                      sx={{ ml: 2 }}
                      color={logConfig.output === 'console' ? 'default' : 'success'}
                    />
                  </span>
                }
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.log_config_panel.k13')}
                value={logConfig.file_path}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    file_path: e.target.value,
                  }))
                }
                placeholder='/var/log/topems/app.log'
                disabled={logConfig.output === 'console'}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.log_config_panel.mb_14')}
                type='number'
                value={logConfig.max_file_size_mb}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    max_file_size_mb: parseInt(e.target.value) || 100,
                  }))
                }
                disabled={logConfig.output === 'console'}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.log_config_panel.k15')}
                type='number'
                value={logConfig.max_files}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    max_files: parseInt(e.target.value) || 10,
                  }))
                }
                disabled={logConfig.output === 'console'}
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
                  bgcolor: 'error.light',
                  color: 'error.main',
                }}
              >
                <AlertCircle size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_log_config_panel.e6')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_log_config_panel.e7')}
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
                    checked={logConfig.console_enabled}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        console_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.log_config_panel.k16')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.remote_logging_enabled}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        remote_logging_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.log_config_panel.k17')}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label={t('system.log_config_panel.url_18')}
                value={logConfig.remote_logging_url}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    remote_logging_url: e.target.value,
                  }))
                }
                placeholder='https://logs.example.com/api'
                disabled={!logConfig.remote_logging_enabled}
              />
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
          {isSaving ? t('system.system_params_page_components_cache_config_panel.m4') : t('system.log_config_panel.k19')}
        </Button>
      </Box>
    </Box>
  );
};

export default LogConfigPanel;
