import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { CloudUpload as CloudUploadIcon, CloudOff as CloudOffIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp } from '@/api/lowcode';
import { DetailPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
      <DetailPageTemplate title={t('lowcode.app_management_page.k4')}>
        <Box sx={{ p: 3 }}>
          <Typography color='text.secondary'>{t('lowcode.app_management_page.e1')}</Typography>
        </Box>
      </DetailPageTemplate>
    );
  }

  if (loading) {
    return (
      <DetailPageTemplate
        title={t('lowcode.app_management_page.k5')}
        loading
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </DetailPageTemplate>
    );
  }

  return (
    <DetailPageTemplate
      title={t('lowcode.app_management_page.k6')}
      subtitle={app ? `· ${app.code}` : undefined}
      loading={loading}
      error={error || undefined}
    >
      <Box sx={{ p: 3, maxWidth: 720 }}>
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
                {saving
                  ? i18n.t('lowcode.app_management_page.r1')
                  : t('lowcode.app_management_page.k13')}
              </Button>
              {app.status === 'published' ? (
                <Button
                  variant='outlined'
                  color='warning'
                  startIcon={<CloudOffIcon />}
                  onClick={handleUnpublish}
                >
                  {t('lowcode.app_management_page.e1')}
                </Button>
              ) : (
                <Button
                  variant='outlined'
                  color='success'
                  startIcon={<CloudUploadIcon />}
                  onClick={handlePublish}
                >
                  {t('lowcode.app_management_page.e2')}
                </Button>
              )}
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ alignSelf: 'center' }}
              >
                {t('lowcode.app_management_page.e1', { v1: app.status, v2: app.version })}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Box>
    </DetailPageTemplate>
  );
};

export default AppManagementPage;
