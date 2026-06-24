import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { scmApi } from '@/api/scm';
import type { Supplier } from '@/api/scm';
import { toast } from 'react-toastify';

const ScmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    address: '',
    bank_account: '',
    tax_number: '',
    status: 'active',
  });

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await scmApi.suppliers.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setSuppliers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      toast.error('加载供应商失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await scmApi.suppliers.create(formData);
      if (response.success) {
        toast.success('创建成功');
        setShowCreateModal(false);
        // 重置分页到第一页，确保新数据显示在列表中
        setCurrentPage(1);
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  // 表格列定义
  const columns: ColumnDef<Supplier>[] = [
    {
      id: 'id',
      label: 'ID',
    },
    {
      id: 'name',
      label: '供应商名称',
    },
    {
      id: 'short_name',
      label: '简称',
    },
    {
      id: 'contact_name',
      label: '联系人',
    },
    {
      id: 'contact_phone',
      label: '联系电话',
    },
    {
      id: 'email',
      label: '邮箱',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={row.status === 'active' ? '活跃' : '禁用'}
          color={row.status === 'active' ? 'success' : 'error'}
          size='small'
        />
      ),
    },
  ];

  // 行操作
  const rowActions = [
    {
      label: '查看',
      icon: <Eye size={14} />,
      onClick: (row: Supplier) => handleViewDetail(row),
    },
    {
      label: '详情',
      onClick: (row: Supplier) => navigate(`/scm/suppliers/${row.id}`),
    },
  ];

  return (
    <>
      <ListPageTemplate
        title='供应商管理'
        columns={columns}
        data={suppliers}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        searchable
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder='搜索供应商...'
        actions={[
          {
            label: '新增供应商',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadSuppliers}
        emptyMessage='暂无供应商数据'
      />

      {/* 创建模态框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              label='供应商名称'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='简称'
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              fullWidth
            />
            <TextField
              label='联系人'
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              fullWidth
            />
            <TextField
              label='联系电话'
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              fullWidth
            />
            <TextField
              label='邮箱'
              type='email'
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label='银行账户'
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              fullWidth
            />
            <TextField
              label='税号'
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              fullWidth
            />
            <TextField
              label='地址'
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情模态框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>供应商详情</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                供应商名称
              </Typography>
              <Typography>{selectedSupplier.name}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                简称
              </Typography>
              <Typography>{selectedSupplier.short_name || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                联系人
              </Typography>
              <Typography>{selectedSupplier.contact_name || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                联系电话
              </Typography>
              <Typography>{selectedSupplier.contact_phone || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                邮箱
              </Typography>
              <Typography>{selectedSupplier.email || '-'}</Typography>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mt: 2 }}
              >
                地址
              </Typography>
              <Typography>{selectedSupplier.address || '-'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScmSupplierPage;
