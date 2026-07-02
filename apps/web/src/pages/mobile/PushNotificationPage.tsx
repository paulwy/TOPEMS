import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  Chip,
  Divider,
  Button,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Bell,
  MessageSquare,
  Mail,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MobileLayout, MobileSkeleton, MobileCard } from '@/components/mobile';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';

interface PushTemplate {
  id: string;
  name: string;
  type: 'system' | 'approval' | 'task' | 'reminder';
  title: string;
  body: string;
  enabled: boolean;
  status: 'active' | 'draft' | 'disabled';
}

interface PushConfig {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const PushNotificationPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PushConfig>({
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [templates, setTemplates] = useState<PushTemplate[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
      // 示例:
      // const { data: configData } = useCrudQueries<PushConfig>({ basePath: '/api/mobile/push-config' });
      // const { data: templateData } = useCrudQueries<PushTemplate>({ basePath: '/api/mobile/push-templates' });
      setConfig({
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
      setTemplates([
        {
          id: 'tpl-1',
          name: '审批通知',
          type: 'approval',
          title: '新审批任务',
          body: '您有一个新的审批任务待处理',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-2',
          name: '任务提醒',
          type: 'task',
          title: '任务截止提醒',
          body: '您的任务即将到期，请及时处理',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-3',
          name: '系统公告',
          type: 'system',
          title: '系统公告',
          body: '系统将于今晚进行维护升级',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-4',
          name: '库存预警',
          type: 'reminder',
          title: '库存预警通知',
          body: '物料库存低于安全线',
          enabled: false,
          status: 'disabled',
        },
      ]);
    } catch (err) {
      console.error('加载推送配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleConfig = (key: keyof PushConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleTemplate = (id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval':
        return 'warning';
      case 'task':
        return 'primary';
      case 'system':
        return 'info';
      case 'reminder':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '启用中';
      case 'draft':
        return '草稿';
      case 'disabled':
        return '已停用';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <MobileLayout
        title='推送管理'
        showBack
        onBackClick={() => navigate(-1)}
      >
        <Box sx={{ p: 2 }}>
          <MobileSkeleton
            type='list'
            count={4}
          />
        </Box>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title='推送管理'
      showBack
      onBackClick={() => navigate(-1)}
    >
      <Box sx={{ p: 2, pb: 3 }}>
        {/* 推送开关 */}
        <Paper
          elevation={0}
          sx={{ p: 2, borderRadius: 3, mb: 3, border: 1, borderColor: 'divider' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Bell style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                推送通知总开关
              </Typography>
            </Box>
            <Switch
              checked={config.enabled}
              onChange={() => handleToggleConfig('enabled')}
            />
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>通知声音</Typography>
              <Switch
                checked={config.soundEnabled}
                onChange={() => handleToggleConfig('soundEnabled')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>振动提醒</Typography>
              <Switch
                checked={config.vibrationEnabled}
                onChange={() => handleToggleConfig('vibrationEnabled')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>
                免打扰 {config.quietHoursStart} - {config.quietHoursEnd}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 推送模板列表 */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              推送模板
            </Typography>
            <Chip
              label={`${templates.filter((t) => t.enabled).length}/${templates.length}`}
              size='small'
            />
          </Box>
          {templates.map((template, index) => (
            <Box key={template.id}>
              {index > 0 && <Divider />}
              <Box sx={{ px: 2, py: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {template.name}
                    </Typography>
                    <Chip
                      label={getStatusLabel(template.status)}
                      size='small'
                      color={template.status === 'active' ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                  <Switch
                    checked={template.enabled}
                    onChange={() => handleToggleTemplate(template.id)}
                    size='small'
                  />
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  标题: {template.title}
                </Typography>
                <br />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  内容: {template.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>
    </MobileLayout>
  );
};

export default PushNotificationPage;
