/**
 * @deprecated 此页面已废弃，请使用 apps/web/src/pages/hrm/HrmDepartmentPage.tsx
 * 该页面功能更完善，使用 TreePageTemplate 模板，支持树形视图、统计卡片和AI功能
 * 将在下一个版本中移除
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { departmentApi, type Department } from '../api/hrm';

export const DepartmentManagementPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({
    name: '',
    code: '',
    description: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await departmentApi.list({ page: 1, page_size: 100 });
      setDepartments(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载部门列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleCreate = async () => {
    if (!newDepartment.name) return;
    setSubmitting(true);
    try {
      await departmentApi.create(newDepartment);
      setCreateDialogOpen(false);
      setNewDepartment({ name: '', code: '', description: '', status: 'active' });
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建部门失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDepartment) return;
    setSubmitting(true);
    try {
      await departmentApi.update(selectedDepartment.id, selectedDepartment);
      setEditDialogOpen(false);
      setSelectedDepartment(null);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新部门失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该部门吗？')) return;
    try {
      await departmentApi.delete(id);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除部门失败');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            部门管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理公司部门结构和组织架构
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDepartments}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增部门
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BusinessIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    部门总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {departments.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BusinessIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    启用部门
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {departments.filter((d) => d.status === 'active').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BusinessIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    停用部门
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {departments.filter((d) => d.status === 'inactive').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>部门名称</TableCell>
                <TableCell>部门编码</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无部门数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {dept.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{dept.code || '-'}</TableCell>
                    <TableCell>{dept.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={dept.status === 'active' ? '启用' : '停用'}
                        size="small"
                        color={dept.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(dept.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增部门</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="部门名称"
              required
              value={newDepartment.name || ''}
              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="部门编码"
              value={newDepartment.code || ''}
              onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
              fullWidth
            />
            <TextField
              label="描述"
              multiline
              rows={3}
              value={newDepartment.description || ''}
              onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newDepartment.name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑部门</DialogTitle>
        {selectedDepartment && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="部门名称"
                value={selectedDepartment.name}
                onChange={(e) =>
                  setSelectedDepartment({ ...selectedDepartment, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="部门编码"
                value={selectedDepartment.code || ''}
                onChange={(e) =>
                  setSelectedDepartment({ ...selectedDepartment, code: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="描述"
                multiline
                rows={3}
                value={selectedDepartment.description || ''}
                onChange={(e) =>
                  setSelectedDepartment({ ...selectedDepartment, description: e.target.value })
                }
                fullWidth
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedDepartment(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DepartmentManagementPage;
