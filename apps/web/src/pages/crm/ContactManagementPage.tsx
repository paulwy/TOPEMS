import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import {DataExport, ActionButton, FormField, Dialog, StatusBadge, PageContainer} from '@/components/common';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

const ContactManagementPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<CreateContactRequest & { customer_id?: string }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    notes: '',
  });
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    total: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, pagination.page, pagination.pageSize]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page + 1,
        page_size: pagination.pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        setContacts(response.data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data?.total || 0,
        }));
      }
    } catch (error: unknown) {
      logger.error('加载联系人列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载联系人列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedContact) {
        await crmApi.contacts.update(selectedContact.id, formData as UpdateContactRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '联系人信息已更新',
        });
      } else {
        await crmApi.contacts.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新联系人已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadContacts();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedContact ? '更新联系人失败' : '创建联系人失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个联系人吗?')) return;
    try {
      await crmApi.contacts.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '联系人已删除',
      });
      loadContacts();
    } catch (error: unknown) {
      logger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除联系人',
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      customer_id: contact.customer_id,
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      notes: contact.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedContact(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <StatusBadge
        status={status}
        label={s.label}
        color={s.color}
      />
    );
  };

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        id: 'name',
        label: '姓名',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.first_name} {row.last_name || ''}
          </Typography>
        ),
      },
      {
        id: 'email',
        label: '邮箱',
        render: (row) => row.email || '-',
      },
      {
        id: 'phone',
        label: '电话',
        render: (row) => row.phone || '-',
      },
      {
        id: 'position',
        label: '职位',
        render: (row) => row.position || '-',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Contact>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个联系人吗?',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '非活跃' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
        },
      },
    ],
    [statusFilter]
  );

  const exportFields = useMemo(
    () => [
      { key: 'first_name', title: '名' },
      { key: 'last_name', title: '姓' },
      { key: 'email', title: '邮箱' },
      { key: 'phone', title: '电话' },
      { key: 'position', title: '职位' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer title='联系人管理' subtitle='管理联系人信息，包括姓名、联系方式、职位等'>
    <>
      <ListPageTemplate<Contact>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={contacts}
        loading={loading}
        searchable
        searchPlaceholder='搜索联系人姓名或邮箱...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => {
            setPagination((prev) => ({ ...prev, page }));
          },
          onPageSizeChange: (pageSize) => {
            setPagination((prev) => ({ ...prev, pageSize, page: 0 }));
          },
        }}
        actions={[
          {
            label: '导出',
            icon: <Eye size={18} />,
            onClick: () => {},
            variant: 'outlined',
          },
          {
            label: '新增联系人',
            icon: <Plus size={18} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        headerContent={
          <DataExport
            data={contacts as unknown as Record<string, unknown>[]}
            fields={exportFields}
            defaultFileName='联系人数据'
            buttonText=''
          />
        }
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title={selectedContact ? '编辑联系人' : '新增联系人'}
        maxWidth='md'
        fullWidth
        cancelButton={{ label: '取消' }}
        confirmButton={{ label: '保存', onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent) }}
      >
        <form onSubmit={handleSubmit}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
              pt: 1,
            }}
          >
            <FormField
              name='first_name'
              label='名 *'
              required
              value={formData.first_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, first_name: e.target.value })}
              fullWidth
            />
            <FormField
              name='last_name'
              label='姓'
              value={formData.last_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, last_name: e.target.value })}
              fullWidth
            />
            <FormField
              name='email'
              label='邮箱'
              type='email'
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <FormField
              name='phone'
              label='电话'
              value={formData.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <FormField
              name='position'
              label='职位'
              value={formData.position}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, position: e.target.value })}
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
            <FormField
              name='notes'
              label='备注'
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
          </Box>
        </form>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        title='联系人详情'
        maxWidth='md'
        fullWidth
        confirmButton={{ label: '关闭' }}
      >
        {selectedContact && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                名
              </Typography>
              <Typography sx={{ fontWeight: 'medium' }}>{selectedContact.first_name}</Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                姓
              </Typography>
              <Typography>{selectedContact.last_name || '-'}</Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                邮箱
              </Typography>
              <Typography>{selectedContact.email || '-'}</Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                电话
              </Typography>
              <Typography>{selectedContact.phone || '-'}</Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                职位
              </Typography>
              <Typography>{selectedContact.position || '-'}</Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                状态
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedContact.status)}</Box>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                创建时间
              </Typography>
              <Typography>
                {new Date(selectedContact.created_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                更新时间
              </Typography>
              <Typography>
                {new Date(selectedContact.updated_at).toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Box sx={{ gridColumn: 'span 2' }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                备注
              </Typography>
              <Typography>{selectedContact.notes || '-'}</Typography>
            </Box>
          </Box>
        )}
      </Dialog>
    </>
    </PageContainer>
  );
};

export default ContactManagementPage;
