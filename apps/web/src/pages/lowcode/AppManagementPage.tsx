import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { CloudUpload as CloudUploadIcon, CloudOff as CloudOffIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp } from '@/api/lowcode';
import { PageContainer } from '@/components/common';

export const AppManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('app_id') || '';

  const [app, setApp] = useState<LowcodeApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', access_path: '' });

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await lowcodeAppsApi.get(appId);
        if (!cancelled && res.data) {
          setApp(res.data);
          setEditForm({
            name: res.data.name,
            description: res.data.description ?? '',
            access_path: res.data.access_path ?? '',
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载应用失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  const handleUpdate = async () => {
    if (!app) return;
    setSaving(true);
    setError(null);
    try {
      const res = await lowcodeAppsApi.update(app.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        access_path: editForm.access_path || undefined,
      });
      if (res.data) setApp(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!app) return;
    try {
      const res = await lowcodeAppsApi.publish(app.id);
      if (res.data) setApp(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    }
  };

  const handleUnpublish = async () => {
    if (!app) return;
    try {
      const res = await lowcodeAppsApi.unpublish(app.id);
      if (res.data) setApp(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '下架失败');
    }
  };

  if (!appId) {
    return (
      <PageContainer title='应用管理'>
        <Box sx={{ p: 3 }}>
          <Typography color='text.secondary'>
            请在 URL 上携带 ?app_id=xxx 以管理具体应用。
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title='应用管理'>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title='应用管理'>
      <Box sx={{ p: 3, maxWidth: 720 }}>
        <Typography
          variant='h5'
          sx={{ mb: 2 }}
        >
          应用管理 {app ? `· ${app.code}` : ''}
        </Typography>
        {error && (
          <Typography
            color='error'
            variant='body2'
            sx={{ mb: 1 }}
          >
            {error}
          </Typography>
        )}
        {app && (
          <Stack spacing={2}>
            <TextField
              label='应用名称'
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label='应用编码'
              value={app.code}
              disabled
              fullWidth
              helperText='编码创建后不可修改'
            />
            <TextField
              label='访问路径'
              value={editForm.access_path}
              onChange={(e) => setEditForm({ ...editForm, access_path: e.target.value })}
              fullWidth
              helperText='如 /app/leave-request'
            />
            <TextField
              label='描述'
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='contained'
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? '保存中…' : '保存'}
              </Button>
              {app.status === 'published' ? (
                <Button
                  variant='outlined'
                  color='warning'
                  startIcon={<CloudOffIcon />}
                  onClick={handleUnpublish}
                >
                  下架
                </Button>
              ) : (
                <Button
                  variant='outlined'
                  color='success'
                  startIcon={<CloudUploadIcon />}
                  onClick={handlePublish}
                >
                  发布
                </Button>
              )}
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ alignSelf: 'center' }}
              >
                当前状态：{app.status} · v{app.version}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Box>
    </PageContainer>
  );
};

export default AppManagementPage;
