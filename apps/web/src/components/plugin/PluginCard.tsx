import React, { useState } from 'react';
import {
  Package,
  Download,
  CheckCircle,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Star,
} from 'lucide-react';
import { Card, CardContent, Typography, Button, Chip, Box } from '@mui/material';
import type { Plugin } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useAppStore } from '@/store';
import { PluginRating } from './PluginRating';

interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
  variant?: 'grid' | 'list';
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  healthStatus,
  onViewDetails,
  variant = 'grid',
}) => {
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useAppStore((state) => state.addNotification);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: '安装成功',
          message: `${plugin.name} 插件已安装`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '安装失败',
          message: '无法安装插件，请稍后重试',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: '安装失败',
        message: err.message || '无法安装插件',
        type: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  if (variant === 'list') {
    return (
      <Card
        sx={{
          '&:hover': { boxShadow: 3 },
          transition: 'box-shadow 0.3s ease',
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                flexShrink: 0,
                background: 'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 28, height: 28, color: 'white' }} />
            </Box>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {plugin.name}
                </Typography>
                <Chip
                  label={`v${plugin.version}`}
                  size='small'
                  variant='outlined'
                />
                {healthStatus !== undefined && (
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: healthStatus ? 'success.main' : 'error.main',
                    }}
                  />
                )}
                {plugin.is_featured && (
                  <Chip
                    icon={<Star sx={{ width: 12, height: 12 }} />}
                    label='精选'
                    size='small'
                    color='warning'
                  />
                )}
              </Box>
              <Typography
                variant='body2'
                color='textSecondary'
                sx={{ mb: 2 }}
              >
                {plugin.description || '暂无描述'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {plugin.tags?.slice(0, 5).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size='small'
                    variant='outlined'
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <PluginRating
                value={plugin.rating || 0}
                count={plugin.rating_count}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Download sx={{ width: 16, height: 16, color: 'grey.400' }} />
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  {plugin.install_count?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, minWidth: 200 }}>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={onViewDetails}
                  startIcon={<ExternalLink sx={{ width: 16, height: 16 }} />}
                >
                  详情
                </Button>
                {installed ? (
                  <Button
                    variant='contained'
                    size='small'
                    disabled
                    startIcon={<CheckCircle sx={{ width: 16, height: 16 }} />}
                  >
                    已安装
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    size='small'
                    onClick={handleInstall}
                    disabled={isInstalling}
                    startIcon={
                      isInstalling ? (
                        <Loader2
                          sx={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
                        />
                      ) : (
                        <ShoppingCart sx={{ width: 16, height: 16 }} />
                      )
                    }
                  >
                    {isInstalling ? '安装中...' : plugin.is_free ? '免费安装' : '购买'}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.3s ease',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 24, height: 24, color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {plugin.name}
              </Typography>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                v{plugin.version}
              </Typography>
            </Box>
          </Box>
          {healthStatus !== undefined && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: healthStatus ? 'success.main' : 'error.main',
              }}
            />
          )}
        </Box>

        {plugin.is_featured && (
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={<Star sx={{ width: 12, height: 12 }} />}
              label='精选推荐'
              size='small'
              color='warning'
            />
          </Box>
        )}

        <Typography
          variant='body2'
          color='textSecondary'
          sx={{ mb: 3, flexGrow: 1 }}
        >
          {plugin.description || '暂无描述'}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {plugin.tags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
              sx={{ fontSize: 10 }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <PluginRating
            value={plugin.rating || 0}
            count={plugin.rating_count}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download sx={{ width: 16, height: 16, color: 'grey.400' }} />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {plugin.install_count?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            size='small'
            fullWidth
            onClick={onViewDetails}
            startIcon={<ExternalLink sx={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
          {installed ? (
            <Button
              variant='contained'
              size='small'
              fullWidth
              disabled
              startIcon={<CheckCircle sx={{ width: 16, height: 16 }} />}
            >
              已安装
            </Button>
          ) : (
            <Button
              variant='contained'
              size='small'
              fullWidth
              onClick={handleInstall}
              disabled={isInstalling}
              startIcon={
                isInstalling ? (
                  <Loader2 sx={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ShoppingCart sx={{ width: 16, height: 16 }} />
                )
              }
            >
              {isInstalling ? '安装中...' : plugin.is_free ? '免费安装' : '购买'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PluginCard;
