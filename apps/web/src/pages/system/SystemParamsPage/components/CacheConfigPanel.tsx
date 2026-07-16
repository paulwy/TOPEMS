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
                  缓存状态
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  当前缓存使用情况统计
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
              {isClearingCache ? '清除中...' : '清除缓存'}
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
                      缓存键数量
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
                          fontSize: '0.75rem',
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
                      内存使用
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
                          fontSize: '0.75rem',
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
                      命中率
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Alert severity='info'>无法获取缓存统计信息</Alert>
            )
          ) : (
            <Alert severity='warning'>缓存未启用，请先启用缓存功能</Alert>
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
                  缓存设置
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  缓存引擎和参数配置
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
                label='启用缓存'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>缓存提供者</InputLabel>
                <Select
                  value={cacheConfig.provider}
                  label='缓存提供者'
                  onChange={(e) =>
                    setCacheConfig((prev) => ({
                      ...prev,
                      provider: e.target.value as typeof cacheConfig.provider,
                    }))
                  }
                  disabled={!cacheConfig.enabled}
                >
                  <MenuItem value='redis'>Redis</MenuItem>
                  <MenuItem value='memory'>内存</MenuItem>
                  <MenuItem value='memcached'>Memcached</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='缓存前缀'
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
                  Redis 连接配置
                </Typography>
                <Grid
                  xs={12}
                  sm={6}
                >
                  <TextField
                    fullWidth
                    label='Redis 主机'
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
                    label='Redis 端口'
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
                    label='Redis 数据库'
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
                label='默认TTL(秒)'
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
                label='最大内存(MB)'
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
                label='启用压缩'
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
          {isSaving ? '保存中...' : '保存配置'}
        </Button>
      </Box>
    </Box>
  );
};

export default CacheConfigPanel;
