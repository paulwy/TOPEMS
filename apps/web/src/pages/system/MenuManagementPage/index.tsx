import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
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

import { PageContainer } from '@/components/common';

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
  const { t } = useTranslation('system');
  const { confirmOpen, confirmConfig, openConfirm, closeConfirm } = useConfirmDialog();

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
        setError(res.message || t('system.menu_management.load_groups_failed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('system.menu_management.load_groups_failed'));
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
        setError(res.message || t('system.menu_management.load_menus_failed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('system.menu_management.load_menus_failed'));
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
      setError(t('system.menu_management.group_name_code_required'));
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
      setError(e instanceof Error ? e.message : t('system.menu_management.save_group_failed'));
    }
  };

  const removeGroup = (g: MenuGroup) => {
    openConfirm({
      title: t('system.menu_management.delete_group_title'),
      message: t('system.menu_management.delete_group_msg', { name: g.name }),
      danger: true,
      onConfirm: async () => {
        try {
          await menuApi.deleteGroup(g.id);
          if (selectedGroupId === g.id) setSelectedGroupId('');
          await fetchGroups();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : t('system.menu_management.delete_group_failed')
          );
        }
      },
    });
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
      setError(t('system.menu_management.select_group_first'));
      return;
    }
    if (!f.name.trim() || !f.code.trim()) {
      setError(t('system.menu_management.menu_name_code_required'));
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
      setError(e instanceof Error ? e.message : t('system.menu_management.save_menu_failed'));
    }
  };

  const removeMenu = (m: MenuItem) => {
    openConfirm({
      title: t('system.menu_management.delete_menu_title'),
      message: t('system.menu_management.delete_menu_msg', { name: m.name }),
      danger: true,
      onConfirm: async () => {
        try {
          await menuApi.deleteMenu(m.id);
          await fetchMenus(selectedGroupId);
        } catch (e) {
          setError(e instanceof Error ? e.message : t('system.menu_management.delete_menu_failed'));
        }
      },
    });
  };

  return (
    <PageContainer autoTitle>
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
              {t('system.menu_management.title')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('system.menu_management.subtitle')}
            </Typography>
          </Box>
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
            onClick={fetchGroups}
            disabled={loading}
          >
            {t('system.menu_management.refresh')}
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
                {t('system.menu_management.groups_title', { count: groups.length })}
              </Typography>
              <Button
                size='small'
                variant='contained'
                startIcon={<Plus size={14} />}
                onClick={openGroupCreate}
              >
                {t('system.menu_management.add_group')}
              </Button>
            </Box>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('system.menu_management.col_name')}</TableCell>
                  <TableCell>{t('system.menu_management.col_code')}</TableCell>
                  <TableCell>{t('system.menu_management.col_sort')}</TableCell>
                  <TableCell align='right'>{t('system.menu_management.col_actions')}</TableCell>
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
                      {t('system.menu_management.empty_groups')}
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
                {t('system.menu_management.menus_title', { count: menus.length })}
              </Typography>
              <Button
                size='small'
                variant='contained'
                startIcon={<Plus size={14} />}
                onClick={openMenuCreate}
                disabled={!selectedGroupId}
              >
                {t('system.menu_management.add_menu')}
              </Button>
            </Box>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('system.menu_management.col_name')}</TableCell>
                  <TableCell>{t('system.menu_management.col_code')}</TableCell>
                  <TableCell>{t('system.menu_management.col_path')}</TableCell>
                  <TableCell>{t('system.menu_management.col_sort')}</TableCell>
                  <TableCell>{t('system.menu_management.col_status')}</TableCell>
                  <TableCell align='right'>{t('system.menu_management.col_actions')}</TableCell>
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
                        label={
                          m.status === 'active'
                            ? t('system.menu_management.status_active')
                            : t('system.menu_management.status_inactive')
                        }
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
                      {selectedGroupId
                        ? t('system.menu_management.empty_menus_in_group')
                        : t('system.menu_management.empty_menus_select')}
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
          <DialogTitle>
            {groupDialog.editing
              ? t('system.menu_management.edit_group')
              : t('system.menu_management.add_group')}
          </DialogTitle>
          <DialogContent>
            <TextField
              label={t('system.menu_management.col_name')}
              fullWidth
              margin='dense'
              value={groupDialog.form.name}
              onChange={(e) =>
                setGroupDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.col_code')}
              fullWidth
              margin='dense'
              value={groupDialog.form.code}
              onChange={(e) =>
                setGroupDialog((d) => ({ ...d, form: { ...d.form, code: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.field_icon')}
              fullWidth
              margin='dense'
              value={groupDialog.form.icon}
              onChange={(e) =>
                setGroupDialog((d) => ({ ...d, form: { ...d.form, icon: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.col_sort')}
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
            <Button
              onClick={() => setGroupDialog({ open: false, editing: null, form: emptyGroup })}
            >
              {t('system.menu_management.cancel')}
            </Button>
            <Button
              variant='contained'
              onClick={submitGroup}
            >
              {t('system.menu_management.save')}
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
          <DialogTitle>
            {menuDialog.editing
              ? t('system.menu_management.edit_menu')
              : t('system.menu_management.add_menu')}
          </DialogTitle>
          <DialogContent>
            <TextField
              label={t('system.menu_management.col_name')}
              fullWidth
              margin='dense'
              value={menuDialog.form.name}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.col_code')}
              fullWidth
              margin='dense'
              value={menuDialog.form.code}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, code: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.field_path')}
              fullWidth
              margin='dense'
              value={menuDialog.form.path}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, path: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.field_icon')}
              fullWidth
              margin='dense'
              value={menuDialog.form.icon}
              onChange={(e) =>
                setMenuDialog((d) => ({ ...d, form: { ...d.form, icon: e.target.value } }))
              }
            />
            <TextField
              label={t('system.menu_management.col_sort')}
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
              <InputLabel>{t('system.menu_management.col_status')}</InputLabel>
              <Select
                label={t('system.menu_management.col_status')}
                value={menuDialog.form.status}
                onChange={(e) =>
                  setMenuDialog((d) => ({ ...d, form: { ...d.form, status: e.target.value } }))
                }
              >
                <MuiMenuItem value='active'>
                  {t('system.menu_management.status_active')}
                </MuiMenuItem>
                <MuiMenuItem value='inactive'>
                  {t('system.menu_management.status_inactive')}
                </MuiMenuItem>
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              margin='dense'
            >
              <InputLabel>{t('system.menu_management.parent_menu')}</InputLabel>
              <Select
                label={t('system.menu_management.parent_menu')}
                value={menuDialog.form.parent_id}
                onChange={(e) =>
                  setMenuDialog((d) => ({ ...d, form: { ...d.form, parent_id: e.target.value } }))
                }
              >
                <MuiMenuItem value=''>{t('system.menu_management.top_level')}</MuiMenuItem>
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
              {t('system.menu_management.cancel')}
            </Button>
            <Button
              variant='contained'
              onClick={submitMenu}
            >
              {t('system.menu_management.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={closeConfirm}
          onConfirm={() => {
            confirmConfig?.onConfirm();
            closeConfirm();
          }}
          title={confirmConfig?.title || ''}
          message={confirmConfig?.message || ''}
          danger={confirmConfig?.danger}
        />
      </Box>
    </PageContainer>
  );
};

export default MenuManagementPage;
