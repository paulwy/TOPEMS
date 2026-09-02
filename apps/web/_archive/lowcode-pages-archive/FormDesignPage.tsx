import React, { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { lowcodeFormsApi } from '@/api/lowcode';
import type { LowcodeForm, UpdateLowcodeFormRequest } from '@/api/lowcode';
import { DesignerTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const FormDesignPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [searchParams, setSearchParams] = useSearchParams();
  const formId = searchParams.get('form_id') || '';

  const [form, setForm] = useState<LowcodeForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await lowcodeFormsApi.get(formId);
        if (!cancelled && res.data) {
          setForm(res.data);
          setDraft(JSON.stringify(res.data.fields ?? [], null, 2));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : t('lowcode.form_design_page.k0'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    let parsedFields: UpdateLowcodeFormRequest['fields'];
    try {
      parsedFields = JSON.parse(draft);
    } catch (e) {
      setError(t('lowcode.form_design_page.e1', { v1: e instanceof Error ? e.message : '' }));
      setSaving(false);
      return;
    }
    try {
      const res = await lowcodeFormsApi.update(form.id, { fields: parsedFields });
      if (res.data) {
        setForm(res.data);
        setDraft(JSON.stringify(res.data.fields ?? [], null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_design_page.k1'));
    } finally {
      setSaving(false);
    }
  };

  if (!formId) {
    return (
      <DesignerTemplate title={t('lowcode.form_design_page.k2')}>
        <Typography color='text.secondary'>{t('lowcode.form_design_page.e1')}</Typography>
      </DesignerTemplate>
    );
  }

  return (
    <DesignerTemplate
      title={t('lowcode.form_design_page.k4')}
      loading={loading}
      error={error}
      toolbar={
        <Stack
          direction='row'
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>
            {t('lowcode.form_design_page.m1', { v1: form ? `· ${form.name}` : '' })}
          </Typography>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving || !form}
          >
            {saving ? t('lowcode.app_management_page.r1') : t('lowcode.form_design_page.k5')}
          </Button>
        </Stack>
      }
    >
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 1 }}
      >
        {t('lowcode.form_design_page.e2')}
        {form &&
          i18n.t('lowcode.form_design_page.e2', {
            v1: form.data_model_id ?? t('lowcode.form_design_page.k6'),
          })}
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
        {t('lowcode.form_design_page.r2', { v1: ' ' })}
        <Button
          size='small'
          onClick={() => {
            searchParams.delete('form_id');
            setSearchParams(searchParams);
          }}
        >
          {t('lowcode.form_design_page.e3')}
        </Button>
      </Typography>
    </DesignerTemplate>
  );
};

export default FormDesignPage;
