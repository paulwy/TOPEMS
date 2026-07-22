import React, { useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';
import {
  DataExport,
  ActionButton,
  FormField,
  Dialog,
  StatusBadge,
  PageContainer,
} from '@/components/common';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import { useQuery } from '@tanstack/react-query';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog, useCrudMutations, useUrlListState } from '@/hooks';

const ContactManagementPage: React.FC = () => {
  // URL 同步的列表状态
  const listState = useUrlListState<{ status: string }>({
    defaultSearch: '',
    defaultPageSize: 20,
    defaultFilters: { status: '' },
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch: searchTerm,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery: setSearchTerm,
    setFilter,
  } = listState;
  const statusFilter = urlFilters.status;
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
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const contactsQuery = useQuery({
    queryKey: ['crm-contacts', searchTerm, urlFilters.status, currentPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (urlFilters.status) params.status = urlFilters.status;
      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        return {
          items: response.data.items || [],
          total: response.data.total || 0,
        };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const contacts = contactsQuery.data?.items || [];
  const total = contactsQuery.data?.total || 0;
  const loading = contactsQuery.isLoading;

  const {
    createMutation: createContactMutation,
    updateMutation: updateContactMutation,
    deleteMutation: deleteContactMutation,
  } = useCrudMutations<
    CreateContactRequest & { customer_id?: string },
    UpdateContactRequest,
    string
  >({
    queryKeyToInvalidate: ['crm-contacts'],
    createFn: async (data) => crmApi.contacts.create(data),
    updateFn: async ({ id, data }) => crmApi.contacts.update(String(id), data),
    deleteFn: async (id) => crmApi.contacts.delete(String(id)),
    entityName: '联系人',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedContact) {
        await updateContactMutation.mutateAsync({
          id: selectedContact.id,
          data: formData as UpdateContactRequest,
        });
      } else {
        await createContactMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
    }
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个联系人吗?',
      danger: true,
      onConfirm: () => {
        deleteContactMutation.mutate(id);
      },
    });
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
        value: urlFilters.status,
        onChange: (value) => {
          setFilter('status', value as string);
        },
      },
    ],
    [urlFilters.status, setFilter]
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
    <PageContainer
      title='联系人管理'
      subtitle='管理联系人信息，包括姓名、联系方式、职位等'
      autoTitle
      autoBreadcrumbs
    >
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
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchTerm(value);
          }}
          filters={filters}
          rowActions={rowActions}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => {
              listState.setCurrentPage(page + 1);
            },
            onPageSizeChange: (newPageSize) => {
              listState.setPageSize(newPageSize);
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
          confirmButton={{
            label: '保存',
            onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent),
          }}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='last_name'
                label='姓'
                value={formData.last_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='email'
                label='邮箱'
                type='email'
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='phone'
                label='电话'
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='position'
                label='职位'
                value={formData.position}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: 'span 2' }}
              />
              <FormField
                name='notes'
                label='备注'
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
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

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default ContactManagementPage;
