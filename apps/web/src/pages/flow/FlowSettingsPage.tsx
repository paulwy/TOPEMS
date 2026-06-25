import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { flowApi } from '@/api/flow';
import { useNotification } from '@/hooks/useNotification';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import { Save, RotateCcw, Bell, Clock, Shield, Database } from 'lucide-react';

interface WorkflowSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

const categories = [
  { id: 'notification', label: '通知设置', icon: Bell },
  { id: 'timeout', label: '超时设置', icon: Clock },
  { id: 'security', label: '安全设置', icon: Shield },
  { id: 'storage', label: '存储设置', icon: Database },
];

const FlowSettingsPage: React.FC = () => {
  const { success, error } = useNotification();

  const [settings, setSettings] = useState<WorkflowSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('notification');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await flowApi.listSettings();
      if (res.success && res.data) {
        setSettings(res.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading settings:', err);
      error('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const filteredSettings = settings.filter((s) => s.category === activeCategory);

  const handleSave = async () => {
    try {
      setSaving(true);
      for (const setting of settings) {
        await flowApi.updateSetting(setting.id, { value: setting.value });
      }
      success('设置保存成功');
    } catch (err: unknown) {
      apiLogger.error('Error saving settings:', err);
      error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
  };

  const handleChange = (id: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value } : s))
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 4 }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            流程设置
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理工作流系统的全局设置
          </Typography>
        </Box>
        <Stack direction='row' spacing={2}>
          <Button
            variant='outlined'
            startIcon={<RotateCcw size={16} />}
            onClick={handleReset}
            disabled={loading}
          >
            重置
          </Button>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ width: '25%' }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Stack>
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? 'contained' : 'text'}
                      sx={{
                        justifyContent: 'flex-start',
                        px: 3,
                        py: 2,
                        borderRadius: 0,
                        bgcolor:
                          activeCategory === category.id ? 'secondary.main' : undefined,
                        '&:hover': {
                          bgcolor:
                            activeCategory === category.id
                              ? 'secondary.dark'
                              : 'grey.100',
                        },
                      }}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      <Icon size={18} sx={{ mr: 2 }} />
                      {category.label}
                    </Button>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: '75%' }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 4 }}
              >
                {categories.find((c) => c.id === activeCategory)?.label}
              </Typography>

              <Divider sx={{ mb: 4 }} />

              <Stack spacing={3}>
                {filteredSettings.map((setting) => (
                  <Stack key={setting.id} spacing={1}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {setting.description}
                    </Typography>
                    <TextField
                      fullWidth
                      size='small'
                      defaultValue={setting.value}
                      onChange={(e) => handleChange(setting.id, e.target.value)}
                    />
                  </Stack>
                ))}

                {filteredSettings.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      暂无设置项
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default FlowSettingsPage;