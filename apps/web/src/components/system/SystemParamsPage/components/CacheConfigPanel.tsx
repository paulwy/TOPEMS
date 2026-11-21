import { designTokens } from '@topems/tokens';
import React from 'react';
import { Database, Save, Trash2 } from 'lucide-react';
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
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Grid } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface CacheConfigType {
  enabled: boolean;
  provider: 'redis' | 'memory' | 'memcached';
  redis_host: string;
  redis_port: number;
  redis_db: number;
  default_ttl_seconds: number;
  max_memory_mb: number;
  compression_enabled: boolean;
  cache_prefix: string;
}

interface CacheStatsType {
  keys_count: number;
  memory_used_mb: number;
  hit_rate: number;
}

interface CacheConfigPanelProps {
  cacheConfig: CacheConfigType;
  setCacheConfig: React.Dispatch<React.SetStateAction<CacheConfigType>>;
  onSave: () => void;
  isSaving: boolean;
  cacheStats: CacheStatsType | null | undefined;
  isLoadingStats: boolean;
  onClearCache: () => void;
  isClearingCache: boolean;
}

const CacheConfigPanel: React.FC<CacheConfigPanelProps> = ({
  cacheConfig,
  setCacheConfig,
  onSave,
  isSaving,
  cacheStats,
  isLoadingStats,
  onClearCache,
  isClearingCache,
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
                <Database size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_cache_config_panel.e1')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_cache_config_panel.e2')}
                </Typography>
              </Box>
            </Box>
          }
          action={
            <Button
              size='small'
              color='error'
              startIcon={<Trash2 size={16} />}
              onClick={onClearCache}
              disabled={isClearingCache || !cacheConfig.enabled}
            >
              {isClearingCache
                ? i18n.t('pages.cache_config_panel.k0')
                : i18n.t('system.cache_config_panel.k0')}
            </Button>
          }
        />
        <CardContent>
          {cacheConfig.enabled ? (
            isLoadingStats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : cacheStats ? (
              <Grid
                container
                spacing={3}
              >
                <Grid
                  xs={12}
                  sm={4}
                >
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      bgcolor: 'grey.50',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 600 }}
                    >
                      {cacheStats.keys_count.toLocaleString()}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 1 }}
                    >
                      {t('system.system_params_page_components_cache_config_panel.e3')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid
                  xs={12}
                  sm={4}
                >
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      bgcolor: 'grey.50',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 600 }}
                    >
                      {cacheStats.memory_used_mb.toFixed(2)}
                      <span
                        style={{
                          fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        MB
                      </span>
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 1 }}
                    >
                      {t('system.system_params_page_components_cache_config_panel.e4')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid
                  xs={12}
                  sm={4}
                >
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      bgcolor: 'grey.50',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 600 }}
                    >
                      {((cacheStats.hit_rate || 0) * 100).toFixed(1)}
                      <span
                        style={{
                          fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        %
                      </span>
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 1 }}
                    >
                      {t('system.system_params_page_components_cache_config_panel.e5')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Alert severity='info'>{t('system.cache_config_panel.k1')}</Alert>
            )
          ) : (
            <Alert severity='warning'>{t('system.cache_config_panel.k2')}</Alert>
          )}
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
                <Database size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('system.system_params_page_components_cache_config_panel.e6')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('system.system_params_page_components_cache_config_panel.e7')}
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
                    checked={cacheConfig.enabled}
                    onChange={(e) =>
                      setCacheConfig((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label={t('system.cache_config_panel.k3')}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>{t('system.cache_config_panel.k4')}</InputLabel>
                <Select
                  value={cacheConfig.provider}
                  label={t('system.cache_config_panel.k5')}
                  onChange={(e) =>
                    setCacheConfig((prev) => ({
                      ...prev,
                      provider: e.target.value as typeof cacheConfig.provider,
                    }))
                  }
                  disabled={!cacheConfig.enabled}
                >
                  <MenuItem value='redis'>Redis</MenuItem>
                  <MenuItem value='memory'>{t('system.cache_config_panel.k6')}</MenuItem>
                  <MenuItem value='memcached'>{t('system.cache_config_panel.k12')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.cache_config_panel.k7')}
                value={cacheConfig.cache_prefix}
                onChange={(e) =>
                  setCacheConfig((prev) => ({
                    ...prev,
                    cache_prefix: e.target.value,
                  }))
                }
                disabled={!cacheConfig.enabled}
              />
            </Grid>
            {cacheConfig.provider === 'redis' && (
              <>
                <Divider sx={{ width: '100%', my: 2 }} />
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600, width: '100%', mb: 2 }}
                >
                  {t('system.system_params_page_components_cache_config_panel.e1')}
                </Typography>
                <Grid
                  xs={12}
                  sm={6}
                >
                  <TextField
                    fullWidth
                    label={t('system.system_params_page_components_cache_config_panel.m1')}
                    value={cacheConfig.redis_host}
                    onChange={(e) =>
                      setCacheConfig((prev) => ({
                        ...prev,
                        redis_host: e.target.value,
                      }))
                    }
                    disabled={!cacheConfig.enabled}
                  />
                </Grid>
                <Grid
                  xs={12}
                  sm={6}
                >
                  <TextField
                    fullWidth
                    label={t('system.system_params_page_components_cache_config_panel.m2')}
                    type='number'
                    value={cacheConfig.redis_port}
                    onChange={(e) =>
                      setCacheConfig((prev) => ({
                        ...prev,
                        redis_port: parseInt(e.target.value) || 6379,
                      }))
                    }
                    disabled={!cacheConfig.enabled}
                  />
                </Grid>
                <Grid
                  xs={12}
                  sm={6}
                >
                  <TextField
                    fullWidth
                    label={t('system.system_params_page_components_cache_config_panel.m3')}
                    type='number'
                    value={cacheConfig.redis_db}
                    onChange={(e) =>
                      setCacheConfig((prev) => ({
                        ...prev,
                        redis_db: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={!cacheConfig.enabled}
                  />
                </Grid>
              </>
            )}
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.cache_config_panel.ttl_8')}
                type='number'
                value={cacheConfig.default_ttl_seconds}
                onChange={(e) =>
                  setCacheConfig((prev) => ({
                    ...prev,
                    default_ttl_seconds: parseInt(e.target.value) || 3600,
                  }))
                }
                disabled={!cacheConfig.enabled}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label={t('system.cache_config_panel.mb_9')}
                type='number'
                value={cacheConfig.max_memory_mb}
                onChange={(e) =>
                  setCacheConfig((prev) => ({
                    ...prev,
                    max_memory_mb: parseInt(e.target.value) || 512,
                  }))
                }
                disabled={!cacheConfig.enabled}
              />
            </Grid>
            <Grid xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={cacheConfig.compression_enabled}
                    onChange={(e) =>
                      setCacheConfig((prev) => ({
                        ...prev,
                        compression_enabled: e.target.checked,
                      }))
                    }
                    disabled={!cacheConfig.enabled}
                  />
                }
                label={t('system.cache_config_panel.k10')}
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
          {isSaving
            ? t('system.system_params_page_components_cache_config_panel.m4')
            : t('system.cache_config_panel.k11')}
        </Button>
      </Box>
    </Box>
  );
};

export default CacheConfigPanel;
