import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { Plus as AddIcon, Trash2 as DeleteOutlineIcon, Copy as ContentCopyIcon } from 'lucide-react';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp } from '@/api/lowcode';

export const AppListPage: React.FC = () => {
  const [apps, setApps] = useState<LowcodeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeAppsApi.list({ page: 1, pageSize: 50 });
      setApps(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载应用列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      await lowcodeAppsApi.create({
        name: createForm.name,
        code: createForm.code,
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', code: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建应用失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeAppsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除应用失败');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await lowcodeAppsApi.duplicate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制应用失败');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">低代码应用管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新建应用
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
                <TableCell>应用名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>版本</TableCell>
                <TableCell>更新时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    暂无应用，点击右上角新建
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.name}</TableCell>
                    <TableCell>{app.code}</TableCell>
                    <TableCell>{app.status}</TableCell>
                    <TableCell>v{app.version}</TableCell>
                    <TableCell>{app.updated_at}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDuplicate(app.id)} title="复制">
                        <ContentCopyIcon size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(app.id)}
                        title="删除"
                      >
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
        <DialogTitle>新建应用</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="应用名称"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="应用编码"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              fullWidth
              required
              helperText="应用唯一标识，创建后不可修改"
            />
            <TextField
              label="描述"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !createForm.name || !createForm.code}
          >
            {creating ? '创建中…' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppListPage;
