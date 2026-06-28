import React from 'react';
import {
  Package,
  Star,
  Download,
  CheckCircle,
  _AlertCircle,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, Typography, Button, Chip } from '@mui/material';
import type { Plugin } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useAppStore } from '@/store';
import { Loading } from '@/components/ui/Loading';

interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({ plugin, healthStatus, onViewDetails }) => {
  const { isPluginInstalled, installPlugin, loading } = usePluginStore();
  const addNotification = useAppStore((state) => state.addNotification);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
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
        message: '请稍后重试',
        type: 'error',
      });
    }
  };

  return (
    <Card
      className='h-full flex flex-col hover:shadow-lg transition-shadow duration-300'
      sx={{ borderRadius: 2 }}
    >
      <CardContent className='flex flex-col h-full'>
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center'>
              <Package className='w-6 h-6 text-white' />
            </div>
            <div>
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
            </div>
          </div>
          {healthStatus !== undefined && (
            <div
              className={`w-3 h-3 rounded-full ${healthStatus ? 'bg-green-500' : 'bg-red-500'}`}
            />
          )}
        </div>

        <Typography
          variant='body2'
          color='textSecondary'
          className='mb-3 flex-grow'
        >
          {plugin.description || '暂无描述'}
        </Typography>

        <div className='flex flex-wrap gap-1 mb-3'>
          {plugin.tags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
              sx={{ fontSize: 10 }}
            />
          ))}
        </div>

        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <Star className='w-4 h-4 text-yellow-500 fill-yellow-500' />
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              {plugin.rating || 0}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              ({plugin.rating_count || 0})
            </Typography>
          </div>
          <div className='flex items-center gap-1'>
            <Download className='w-4 h-4 text-gray-400' />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {plugin.install_count?.toLocaleString() || 0}
            </Typography>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button
            variant='outlined'
            size='small'
            fullWidth
            onClick={onViewDetails}
            startIcon={<ExternalLink className='w-4 h-4' />}
          >
            详情
          </Button>
          {installed ? (
            <Button
              variant='contained'
              size='small'
              fullWidth
              disabled
              startIcon={<CheckCircle className='w-4 h-4' />}
            >
              已安装
            </Button>
          ) : (
            <Button
              variant='contained'
              size='small'
              fullWidth
              onClick={handleInstall}
              disabled={loading}
              startIcon={
                loading ? <Loading className='w-4 h-4' /> : <ShoppingCart className='w-4 h-4' />
              }
            >
              {plugin.is_free ? '免费安装' : '购买'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
