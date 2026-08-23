import React, { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { lowcodePagesApi } from '@/api/lowcode';
import type { LowcodePage, UpdateLowcodePageRequest } from '@/api/lowcode';
import { DesignerTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const PageDesignPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [searchParams, setSearchParams] = useSearchParams();
  const pageId = searchParams.get('page_id') || '';

  const [page, setPage] = useState<LowcodePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await lowcodePagesApi.get(pageId);
        if (!cancelled && res.data) {
          setPage(res.data);
          setDraft(JSON.stringify(res.data.components ?? [], null, 2));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t('lowcode.page_design_page.k0'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    setError(null);
    let parsedComponents: UpdateLowcodePageRequest['components'];
    try {
      parsedComponents = JSON.parse(draft);
    } catch (e) {
      setError(t('lowcode.page_design_page.e1', { v1: e instanceof Error ? e.message : '' }));
      setSaving(false);
      return;
    }
    try {
      const res = await lowcodePagesApi.update(page.id, { components: parsedComponents });
      if (res.data) {
        setPage(res.data);
        setDraft(JSON.stringify(res.data.components ?? [], null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_design_page.k1'));
    } finally {
      setSaving(false);
    }
  };

  if (!pageId) {
    return (
      <DesignerTemplate title={t('lowcode.page_design_page.k2')}>
        <Typography color='text.secondary'>{t('lowcode.page_design_page.e1')}</Typography>
      </DesignerTemplate>
    );
  }

  return (
    <DesignerTemplate
      title={t('lowcode.page_design_page.k4')}
      loading={loading}
      error={error}
      toolbar={
        <Stack
          direction='row'
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>
            {t('lowcode.page_design_page.m1', { v1: page ? `· ${page.name}` : '' })}
          </Typography>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving || !page}
          >
            {saving ? t('lowcode.app_management_page.r1') : t('lowcode.page_design_page.k5')}
          </Button>
        </Stack>
      }
    >
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 1 }}
      >
        {t('lowcode.page_design_page.e2')}
        {page && t('lowcode.page_design_page.e3', { v1: page.type, v2: page.route_path })}
      </Typography>

      <Paper
        component='textarea'
        value={draft}
        onChange={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
        sx={{
          width: '100%',
          minHeight: 480,
          p: 2,
          fontFamily: 'monospace',
          fontSize: 13,
          border: '1px solid',
          borderColor: 'divider',
          resize: 'vertical',
          outline: 'none',
        }}
        spellCheck={false}
      />
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {t('lowcode.page_design_page.r2', { v1: ' ' })}
        <Button
          size='small'
          onClick={() => {
            searchParams.delete('page_id');
            setSearchParams(searchParams);
          }}
        >
          {t('lowcode.form_design_page.e3')}
        </Button>
      </Typography>
    </DesignerTemplate>
  );
};

export default PageDesignPage;
