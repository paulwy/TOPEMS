import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Paper,
} from '@mui/material';
import { Tag, RotateCcw, Eye, Download, History } from 'lucide-react';
import type { AppVersion } from '../../api/lowcode/types';

interface AppVersionListProps {
  versions: AppVersion[];
  currentVersion?: string;
  onRollback?: (version: AppVersion) => void;
  onPreview?: (version: AppVersion) => void;
  onDownload?: (version: AppVersion) => void;
}

const statusColors: Record<AppVersion['status'], 'default' | 'success' | 'warning' | 'info'> = {
  draft: 'default',
  published: 'success',
  deprecated: 'warning',
};

const statusLabels: Record<AppVersion['status'], string> = {
  draft: '草稿',
  published: '已发布',
  deprecated: '已废弃',
};

export const AppVersionList: React.FC<AppVersionListProps> = ({
  versions,
  currentVersion,
  onRollback,
  onPreview,
  onDownload,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
      <List sx={{ py: 0 }}>
        {versions.length === 0 && (
          <ListItem>
            <ListItemText
              primary={
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <History style={{ width: 48, height: 48, margin: '0 auto', marginBottom: 8, opacity: 0.3 }} />
              <Typography>暂无版本记录</Typography>
            </Box>
            }
            />
          </ListItem>
        )}
        {versions.map((version, index) => (
          <React.Fragment key={version.id}>
            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: version.version === currentVersion ? 'success.main' : 'primary.main' }}>
                  <Tag style={{ width: 20, height: 20 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">v{version.version}</Typography>
                    <Chip
                      label={statusLabels[version.status]}
                      size="small"
                      color={statusColors[version.status]}
                      variant="outlined"
                    />
                    {version.version === currentVersion && (
                      <Chip label="当前版本" size="small" color="success" />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {version.description || '暂无描述'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {formatDate(version.publishedAt || version.createdAt)}
                      {version.publishedBy && ` · ${version.publishedBy}`}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="预览">
                    <IconButton size="small" onClick={() => onPreview?.(version)}>
                      <Eye style={{ width: 18, height: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="下载">
                    <IconButton size="small" onClick={() => onDownload?.(version)}>
                      <Download style={{ width: 18, height: 18 }} />
                    </IconButton>
                  </Tooltip>
                  {version.status === 'published' && version.version !== currentVersion && (
                    <Tooltip title="回滚到此版本">
                      <IconButton size="small" color="warning" onClick={() => onRollback?.(version)}>
                        <RotateCcw style={{ width: 18, height: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < versions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default AppVersionList;
