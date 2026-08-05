import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Plus as AddIcon, Trash2 as DeleteOutlineIcon, Upload as PublishIcon, Home as HomeIcon } from 'lucide-react';
import { lowcodePagesApi } from '@/api/lowcode';
import type { LowcodePage, LowcodePageType } from '@/api/lowcode';
import { PageContainer } from '@/components/common';

const PAGE_TYPES: LowcodePageType[] = ['list', 'detail', 'form', 'dashboard', 'custom', 'external_link'];

export const PageListPage: React.FC = () => {
  const [pages, setPages] = useState<LowcodePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    code: '',
    name: '',
    type: 'list' as LowcodePageType,
    route_path: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodePagesApi.list({ page: 1, pageSize: 100 });
      setPages(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载页面失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.app_id || !createForm.code || !createForm.name || !createForm.route_path) return;
    setCreating(true);
    try {
      await lowcodePagesApi.create({
        app_id: createForm.app_id,
        code: createForm.code,
        name: createForm.name,
        type: createForm.type,
        route_path: createForm.route_path,
      });
      setCreateOpen(false);
      setCreateForm({ app_id: '', code: '', name: '', type: 'list', route_path: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建页面失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodePagesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除页面失败');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await lowcodePagesApi.publish(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布页面失败');
    }
  };

  const handleSetHome = async (id: string) => {
    try {
      await lowcodePagesApi.setAsHome(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设为首页失败');
    }
  };

  return (
    <PageContainer title="页面列表">
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">页面列表</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新建页面
        </Button>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>页面名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>路由</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    暂无页面
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.is_home && (
                        <Box component="span" sx={{ color: 'primary.main', mr: 0.5, verticalAlign: 'middle', display: 'inline-flex' }}>
                          <HomeIcon size={18} />
                        </Box>
                      )}
                      {p.name}
                    </TableCell>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.route_path}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.status}
                        color={p.status === 'published' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleSetHome(p.id)} title="设为首页" disabled={p.is_home}>
                        <HomeIcon size={18} />
                      </IconButton>
                      <IconButton size="small" color="success" onClick={() => handlePublish(p.id)} title="发布">
                        <PublishIcon size={18} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                        <DeleteOutlineIcon size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建页面</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="所属应用 ID"
              value={createForm.app_id}
              onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="页面编码"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              fullWidth
              required
              helperText="应用内唯一"
            />
            <TextField
              label="页面名称"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="页面类型"
              value={createForm.type}
              onChange={(e) =>
                setCreateForm({ ...createForm, type: e.target.value as LowcodePageType })
              }
              select
              fullWidth
            >
              {PAGE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="路由路径"
              value={createForm.route_path}
              onChange={(e) => setCreateForm({ ...createForm, route_path: e.target.value })}
              fullWidth
              required
              helperText="应用内相对路径，如 /list"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !createForm.app_id || !createForm.code || !createForm.name || !createForm.route_path}
          >
            {creating ? '创建中…' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </PageContainer>
  );
};

export default PageListPage;
