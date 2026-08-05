import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { lowcodeFormsApi } from '@/api/lowcode';
import type { LowcodeForm, UpdateLowcodeFormRequest } from '@/api/lowcode';
import { PageContainer } from '@/components/common';

export const FormDesignPage: React.FC = () => {
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
        if (!cancelled) setError(err instanceof Error ? err.message : '加载表单失败');
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
      setError('字段 JSON 解析失败：' + (e instanceof Error ? e.message : ''));
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
      setError(err instanceof Error ? err.message : '保存表单失败');
    } finally {
      setSaving(false);
    }
  };

  if (!formId) {
    return (
      <PageContainer title="表单设计">
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          请在 URL 上携带 ?form_id=xxx 以设计具体表单。
        </Typography>
      </Box>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="表单设计">
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="表单设计">
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          表单设计器 {form ? `· ${form.name}` : ''}
        </Typography>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form}
        >
          {saving ? '保存中…' : '保存字段定义'}
        </Button>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        当前以 JSON 形式编辑表单字段（V1 占位，可视化拖拽设计器见 V65）。
        {form && ` 绑定数据模型：${form.data_model_id ?? '无'}`}
      </Typography>

      <Paper
        component="textarea"
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
      <Typography variant="caption" color="text.secondary">
        提示：清空 form_id 可返回选择器 ·{' '}
        <Button
          size="small"
          onClick={() => {
            searchParams.delete('form_id');
            setSearchParams(searchParams);
          }}
        >
          清除选择
        </Button>
      </Typography>
    </Box>
    </PageContainer>
  );
};

export default FormDesignPage;
