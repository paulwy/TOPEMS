import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { CloudUpload as CloudUploadIcon, CloudOff as CloudOffIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const AppManagementPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
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
        if (!cancelled)
          setError(err instanceof Error ? err.message : t('lowcode.app_management_page.k0'));
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
      setError(err instanceof Error ? err.message : t('lowcode.app_management_page.k1'));
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
      setError(err instanceof Error ? err.message : t('lowcode.app_management_page.k2'));
    }
  };

  const handleUnpublish = async () => {
    if (!app) return;
    try {
      const res = await lowcodeAppsApi.unpublish(app.id);
      if (res.data) setApp(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.app_management_page.k3'));
    }
  };

  if (!appId) {
    return (
      <PageContainer title={t('lowcode.app_management_page.k4')}>
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
      <PageContainer title={t('lowcode.app_management_page.k5')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('lowcode.app_management_page.k6')}>
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
              label={t('lowcode.app_management_page.k7')}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('lowcode.app_management_page.k8')}
              value={app.code}
              disabled
              fullWidth
              helperText={t('lowcode.app_management_page.k9')}
            />
            <TextField
              label={t('lowcode.app_management_page.k10')}
              value={editForm.access_path}
              onChange={(e) => setEditForm({ ...editForm, access_path: e.target.value })}
              fullWidth
              helperText={t('lowcode.app_management_page.appleaverequest_11')}
            />
            <TextField
              label={t('lowcode.app_management_page.k12')}
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
                {saving ? '保存中…' : t('lowcode.app_management_page.k13')}
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
