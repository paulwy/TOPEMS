import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useCrmStore } from '../store/crmStore';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '../api/crm';

export const ContactManagementPage: React.FC = () => {
  const {
    contacts,
    contactsTotal,
    contactsPage,
    contactsPageSize,
    loading,
    error,
    loadContacts,
    addContact,
    updateContact,
    removeContact,
  } = useCrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<CreateContactRequest>({
    first_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContacts({ page: 1, pageSize: 10 });
  }, [loadContacts]);

  const handleSearch = () => {
    loadContacts({
      page: 1,
      pageSize: contactsPageSize,
      search: searchKeyword || undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadContacts({
      page,
      pageSize: contactsPageSize,
      search: searchKeyword || undefined,
    });
  };

  const handleCreate = async () => {
    if (!newContact.first_name) return;
    setSubmitting(true);
    try {
      await addContact(newContact);
      setCreateDialogOpen(false);
      setNewContact({ first_name: '' });
    } catch (err) {
      console.error('创建联系人失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedContact) return;
    setSubmitting(true);
    try {
      const updateData: UpdateContactRequest = {
        first_name: selectedContact.first_name,
        last_name: selectedContact.last_name,
        email: selectedContact.email,
        phone: selectedContact.phone,
        position: selectedContact.position,
        status: selectedContact.status,
      };
      await updateContact(selectedContact.id, updateData);
      setEditDialogOpen(false);
      setSelectedContact(null);
    } catch (err) {
      console.error('更新联系人失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该联系人吗？')) return;
    try {
      await removeContact(id);
    } catch (err) {
      console.error('删除联系人失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(contactsTotal / contactsPageSize),
    [contactsTotal, contactsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            联系人管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理客户联系人信息和沟通记录
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadContacts({ page: contactsPage, pageSize: contactsPageSize, search: searchKeyword || undefined })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建联系人
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索联系人姓名、邮箱..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Box>
      </Paper>

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
                <TableCell>姓名</TableCell>
                <TableCell>职位</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>状态</TableCell>
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
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无联系人数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {contact.first_name} {contact.last_name || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{contact.position || '-'}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={contact.status === 'active' ? '活跃' : '非活跃'}
                        size="small"
                        color={contact.status === 'active' ? 'success' : 'default'}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedContact(contact);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(contact.id)}
                        title="删除"
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
        {contactsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={contactsPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建联系人</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="姓"
              required
              value={newContact.first_name}
              onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="名"
              value={newContact.last_name || ''}
              onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="职位"
              value={newContact.position || ''}
              onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
              fullWidth
            />
            <TextField
              label="邮箱"
              type="email"
              value={newContact.email || ''}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="电话"
              value={newContact.phone || ''}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newContact.first_name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑联系人</DialogTitle>
        {selectedContact && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="姓"
                required
                value={selectedContact.first_name}
                onChange={(e) =>
                  setSelectedContact({ ...selectedContact, first_name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="名"
                value={selectedContact.last_name || ''}
                onChange={(e) =>
                  setSelectedContact({ ...selectedContact, last_name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="职位"
                value={selectedContact.position || ''}
                onChange={(e) =>
                  setSelectedContact({ ...selectedContact, position: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="邮箱"
                type="email"
                value={selectedContact.email || ''}
                onChange={(e) =>
                  setSelectedContact({ ...selectedContact, email: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="电话"
                value={selectedContact.phone || ''}
                onChange={(e) =>
                  setSelectedContact({ ...selectedContact, phone: e.target.value })
                }
                fullWidth
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedContact(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactManagementPage;
