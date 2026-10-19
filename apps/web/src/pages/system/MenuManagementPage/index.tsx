import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem as MuiMenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
import menuApi, { type MenuGroup, type MenuItem } from '@/api/unified-core/menu';

interface GroupForm {
  name: string;
  code: string;
  icon: string;
  sort_order: string;
}

interface MenuForm {
  parent_id: string;
  name: string;
  code: string;
  path: string;
  icon: string;
  sort_order: string;
  status: string;
}

const emptyGroup: GroupForm = { name: '', code: '', icon: '', sort_order: '0' };
const emptyMenu: MenuForm = {
  parent_id: '',
  name: '',
  code: '',
  path: '',
  icon: '',
  sort_order: '0',
  status: 'active',
};

const MenuManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [groupDialog, setGroupDialog] = useState<{
    open: boolean;
    editing: MenuGroup | null;
    form: GroupForm;
  }>({ open: false, editing: null, form: emptyGroup });

  const [menuDialog, setMenuDialog] = useState<{
    open: boolean;
    editing: MenuItem | null;
    form: MenuForm;
  }>({ open: false, editing: null, form: emptyMenu });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await menuApi.listGroups({ page: 1, page_size: 100 });
      if (res.success) {
        const items = res.data.items || [];
        setGroups(items);
        setSelectedGroupId((prev) => prev || items[0]?.id || '');
      } else {
        setError(res.message || '加载菜单分组失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载菜单分组失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenus = useCallback(async (groupId: string) => {
    if (!groupId) {
      setMenus([]);
      return;
    }
    setLoading(true);
    try {
      const res = await menuApi.listMenus({ group_id: groupId, page: 1, page_size: 100 });
      if (res.success) {
        setMenus(res.data.items || []);
      } else {
        setError(res.message || '加载菜单项失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载菜单项失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchMenus(selectedGroupId);
  }, [selectedGroupId, fetchMenus]);

  // ===== 分组 CRUD =====
  const openGroupCreate = () => setGroupDialog({ open: true, editing: null, form: emptyGroup });

  const openGroupEdit = (g: MenuGroup) =>
    setGroupDialog({
      open: true,
      editing: g,
      form: {
        name: g.name,
        code: g.code,
        icon: g.icon || '',
        sort_order: String(g.sort_order ?? 0),
      },
    });

  const submitGroup = async () => {
    const f = groupDialog.form;
    if (!f.name.trim() || !f.code.trim()) {
      setError('分组名称与编码不能为空');
      return;
    }
    setError('');
    try {
      const payload = {
        name: f.name.trim(),
        code: f.code.trim(),
        icon: f.icon.trim() || null,
        sort_order: Number(f.sort_order) || 0,
      };
      if (groupDialog.editing) {
        await menuApi.updateGroup(groupDialog.editing.id, payload);
      } else {
        await menuApi.createGroup(payload);
      }
      setGroupDialog({ open: false, editing: null, form: emptyGroup });
      await fetchGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存分组失败');
    }
  };

  const removeGroup = async (g: MenuGroup) => {
    if (!window.confirm(`确认删除分组「${g.name}」？其下菜单项将一并受影响。`)) return;
    try {
      await menuApi.deleteGroup(g.id);
      if (selectedGroupId === g.id) setSelectedGroupId('');
      await fetchGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除分组失败');
    }
  };

  // ===== 菜单项 CRUD =====
  const openMenuCreate = () =>
    setMenuDialog({ open: true, editing: null, form: { ...emptyMenu, status: 'active' } });

  const openMenuEdit = (m: MenuItem) =>
    setMenuDialog({
      open: true,
      editing: m,
      form: {
        parent_id: m.parent_id || '',
        name: m.name,
        code: m.code,
        path: m.path || '',
        icon: m.icon || '',
        sort_order: String(m.sort_order ?? 0),
        status: m.status,
      },
    });

  const submitMenu = async () => {
    const f = menuDialog.form;
    if (!selectedGroupId) {
      setError('请先选择菜单分组');
      return;
    }
    if (!f.name.trim() || !f.code.trim()) {
      setError('菜单项名称与编码不能为空');
      return;
    }
    setError('');
    const base = {
      name: f.name.trim(),
      code: f.code.trim(),
      path: f.path.trim() || null,
      icon: f.icon.trim() || null,
      sort_order: Number(f.sort_order) || 0,
      status: f.status,
      parent_id: f.parent_id || null,
    };
    try {
      if (menuDialog.editing) {
        await menuApi.updateMenu(menuDialog.editing.id, base);
      } else {
        await menuApi.createMenu({ group_id: selectedGroupId, ...base });
      }
      setMenuDialog({ open: false, editing: null, form: emptyMenu });
      await fetchMenus(selectedGroupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存菜单项失败');
    }
  };

  const removeMenu = async (m: MenuItem) => {
    if (!window.confirm(`确认删除菜单项「${m.name}」？`)) return;
    try {
      await menuApi.deleteMenu(m.id);
      await fetchMenus(selectedGroupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除菜单项失败');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            菜单管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            维护菜单分组与菜单项（编码 / 路径 / 排序 / 状态）
          </Typography>
        </Box>
        <Button
          variant='outlined'
          startIcon={<RefreshCw size={16} />}
          onClick={fetchGroups}
          disabled={loading}
        >
          刷新
        </Button>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* ===== 分组 ===== */}
        <Paper sx={{ flex: '1 1 320px', p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              菜单分组（{groups.length}）
            </Typography>
            <Button
              size='small'
              variant='contained'
              startIcon={<Plus size={14} />}
              onClick={openGroupCreate}
            >
              新增分组
            </Button>
          </Box>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>排序</TableCell>
                <TableCell align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow
                  key={g.id}
                  selected={g.id === selectedGroupId}
                  hover
                  onClick={() => setSelectedGroupId(g.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{g.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={g.code}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>{g.sort_order}</TableCell>
                  <TableCell align='right'>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        openGroupEdit(g);
                      }}
                    >
                      <Edit size={15} />
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGroup(g);
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align='center'
                    sx={{ color: 'text.secondary' }}
                  >
                    暂无分组，点击「新增分组」创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ===== 菜单项 ===== */}
        <Paper sx={{ flex: '2 1 480px', p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              菜单项（{menus.length}）
            </Typography>
            <Button
              size='small'
              variant='contained'
              startIcon={<Plus size={14} />}
              onClick={openMenuCreate}
              disabled={!selectedGroupId}
            >
              新增菜单项
            </Button>
          </Box>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>路径</TableCell>
                <TableCell>排序</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menus.map((m) => (
                <TableRow
                  key={m.id}
                  hover
                >
                  <TableCell>{m.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.code}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{m.path || '-'}</TableCell>
                  <TableCell>{m.sort_order}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.status === 'active' ? '启用' : '停用'}
                      size='small'
                      color={m.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <IconButton
                      size='small'
                      onClick={() => openMenuEdit(m)}
                    >
                      <Edit size={15} />
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={() => removeMenu(m)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {menus.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align='center'
                    sx={{ color: 'text.secondary' }}
                  >
                    {selectedGroupId ? '该分组下暂无菜单项' : '请先在左侧选择分组'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* ===== 分组弹窗 ===== */}
      <Dialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false, editing: null, form: emptyGroup })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{groupDialog.editing ? '编辑分组' : '新增分组'}</DialogTitle>
        <DialogContent>
          <TextField
            label='名称'
            fullWidth
            margin='dense'
            value={groupDialog.form.name}
            onChange={(e) =>
              setGroupDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))
            }
          />
          <TextField
            label='编码'
            fullWidth
            margin='dense'
            value={groupDialog.form.code}
            onChange={(e) =>
              setGroupDialog((d) => ({ ...d, form: { ...d.form, code: e.target.value } }))
            }
          />
          <TextField
            label='图标'
            fullWidth
            margin='dense'
            value={groupDialog.form.icon}
            onChange={(e) =>
              setGroupDialog((d) => ({ ...d, form: { ...d.form, icon: e.target.value } }))
            }
          />
          <TextField
            label='排序'
            type='number'
            fullWidth
            margin='dense'
            value={groupDialog.form.sort_order}
            onChange={(e) =>
              setGroupDialog((d) => ({ ...d, form: { ...d.form, sort_order: e.target.value } }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog({ open: false, editing: null, form: emptyGroup })}>
            取消
          </Button>
          <Button
            variant='contained'
            onClick={submitGroup}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== 菜单项弹窗 ===== */}
      <Dialog
        open={menuDialog.open}
        onClose={() => setMenuDialog({ open: false, editing: null, form: emptyMenu })}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{menuDialog.editing ? '编辑菜单项' : '新增菜单项'}</DialogTitle>
        <DialogContent>
          <TextField
            label='名称'
            fullWidth
            margin='dense'
            value={menuDialog.form.name}
            onChange={(e) =>
              setMenuDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))
            }
          />
          <TextField
            label='编码'
            fullWidth
            margin='dense'
            value={menuDialog.form.code}
            onChange={(e) =>
              setMenuDialog((d) => ({ ...d, form: { ...d.form, code: e.target.value } }))
            }
          />
          <TextField
            label='前端路径'
            fullWidth
            margin='dense'
            value={menuDialog.form.path}
            onChange={(e) =>
              setMenuDialog((d) => ({ ...d, form: { ...d.form, path: e.target.value } }))
            }
          />
          <TextField
            label='图标'
            fullWidth
            margin='dense'
            value={menuDialog.form.icon}
            onChange={(e) =>
              setMenuDialog((d) => ({ ...d, form: { ...d.form, icon: e.target.value } }))
            }
          />
          <TextField
            label='排序'
            type='number'
            fullWidth
            margin='dense'
            value={menuDialog.form.sort_order}
            onChange={(e) =>
              setMenuDialog((d) => ({ ...d, form: { ...d.form, sort_order: e.target.value } }))
            }
          />
          <FormControl
            fullWidth
            margin='dense'
          >
            <InputLabel>状态</InputLabel>
            <Select
              label='状态'
              value={menuDialog.form.status}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, status: e.target.value } }))
              }
            >
              <MuiMenuItem value='active'>启用</MuiMenuItem>
              <MuiMenuItem value='inactive'>停用</MuiMenuItem>
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            margin='dense'
          >
            <InputLabel>父菜单（留空为顶级）</InputLabel>
            <Select
              label='父菜单（留空为顶级）'
              value={menuDialog.form.parent_id}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, parent_id: e.target.value } }))
              }
            >
              <MuiMenuItem value=''>（顶级）</MuiMenuItem>
              {menus
                .filter((m) => m.id !== menuDialog.editing?.id)
                .map((m) => (
                  <MuiMenuItem
                    key={m.id}
                    value={m.id}
                  >
                    {m.name}
                  </MuiMenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuDialog({ open: false, editing: null, form: emptyMenu })}>
            取消
          </Button>
          <Button
            variant='contained'
            onClick={submitMenu}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuManagementPage;
