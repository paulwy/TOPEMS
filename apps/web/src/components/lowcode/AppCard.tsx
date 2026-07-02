import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import { MoreVertical, Settings, Play, Upload, Trash2, Copy, ExternalLink } from 'lucide-react';
import type { LowCodeApp } from '../../api/lowcode/types';

interface AppCardProps {
  app: LowCodeApp;
  onClick?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const statusColors: Record<
  LowCodeApp['status'],
  'default' | 'success' | 'warning' | 'info' | 'secondary'
> = {
  draft: 'default',
  developing: 'info',
  testing: 'secondary',
  published: 'success',
  archived: 'warning',
};

const statusLabels: Record<LowCodeApp['status'], string> = {
  draft: '草稿',
  developing: '开发中',
  testing: '测试中',
  published: '已发布',
  archived: '已归档',
};

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onClick,
  onEdit,
  onPublish,
  onDelete,
  onDuplicate,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <Card
      variant='outlined'
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box
          sx={{
            height: 120,
            background: `linear-gradient(135deg, ${stringToColor(app.name)} 0%, ${stringToColor(`${app.name}2`)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'rgba(255,255,255,0.9)',
              color: stringToColor(app.name),
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {(app.label || app.name).charAt(0)}
          </Avatar>
          <Chip
            label={statusLabels[app.status]}
            size='small'
            color={statusColors[app.status]}
            variant='filled'
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255,255,255,0.9)',
            }}
          />
        </Box>
        <CardContent sx={{ flex: 1, pb: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
            gutterBottom
            noWrap
          >
            {app.label || app.name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {app.description || '暂无描述'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`${app.modelCount || 0} 模型`}
              size='small'
              variant='outlined'
            />
            <Chip
              label={`${app.pageCount || 0} 页面`}
              size='small'
              variant='outlined'
            />
            {app.currentVersion && (
              <Chip
                label={`v${app.currentVersion}`}
                size='small'
                color='primary'
                variant='outlined'
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
      <CardActions sx={{ justifyContent: 'space-between', px: 1, pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            title='编辑'
          >
            <Settings style={{ width: 18, height: 18 }} />
          </IconButton>
          {app.status !== 'published' && (
            <IconButton
              size='small'
              color='primary'
              onClick={(e) => {
                e.stopPropagation();
                onPublish?.();
              }}
              title='发布'
            >
              <Upload style={{ width: 18, height: 18 }} />
            </IconButton>
          )}
          {app.status === 'published' && (
            <IconButton
              size='small'
              color='success'
              onClick={(e) => e.stopPropagation()}
              title='访问'
            >
              <ExternalLink style={{ width: 18, height: 18 }} />
            </IconButton>
          )}
        </Box>
        <IconButton
          size='small'
          onClick={handleMenuClick}
          title='更多'
        >
          <MoreVertical style={{ width: 18, height: 18 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
        >
          <MenuItem
            onClick={onDuplicate}
            sx={{ gap: 1 }}
          >
            <Copy style={{ width: 16, height: 16 }} />
            复制应用
          </MenuItem>
          <MenuItem
            onClick={onDelete}
            sx={{ gap: 1, color: 'error.main' }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
            删除应用
          </MenuItem>
        </Menu>
      </CardActions>
    </Card>
  );
};

export default AppCard;
