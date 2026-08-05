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
import { lowcodePagesApi } from '@/api/lowcode';
import type { LowcodePage, UpdateLowcodePageRequest } from '@/api/lowcode';

export const PageDesignPage: React.FC = () => {
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
        if (!cancelled) setError(err instanceof Error ? err.message : '加载页面失败');
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
      setError('组件树 JSON 解析失败：' + (e instanceof Error ? e.message : ''));
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
      setError(err instanceof Error ? err.message : '保存页面失败');
    } finally {
      setSaving(false);
    }
  };

  if (!pageId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          请在 URL 上携带 ?page_id=xxx 以设计具体页面。
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          页面设计器 {page ? `· ${page.name}` : ''}
        </Typography>
        <Button variant="contained" onClick={handleSave} disabled={saving || !page}>
          {saving ? '保存中…' : '保存组件树'}
        </Button>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        当前以 JSON 形式编辑页面组件树（V1 占位，可视化拖拽设计器见 V65）。
        {page && ` 类型：${page.type} · 路由：${page.route_path}`}
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
        提示：清空 page_id 可返回选择器 ·{' '}
        <Button
          size="small"
          onClick={() => {
            searchParams.delete('page_id');
            setSearchParams(searchParams);
          }}
        >
          清除选择
        </Button>
      </Typography>
    </Box>
  );
};

export default PageDesignPage;
