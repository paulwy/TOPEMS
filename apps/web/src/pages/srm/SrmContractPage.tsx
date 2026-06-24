import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Plus, ScrollText, Search, FileText } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { srmApi } from '@/api/srm';
import type { SupplierContract, CreateSupplierContractRequest } from '@/api/srm';
import { toast } from 'react-toastify';
import { apiLogger } from '@/utils/logger';

interface ContractWithAmount extends SupplierContract {
  amount: number;
}

const SrmContractPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractWithAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    contract_no: '',
    supplier_id: '',
    supplier_name: '',
    title: '',
    total_amount: '',
    contract_type: '',
    currency: 'CNY',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listContracts();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.contracts || [];
        const adapted = items.map((item: any) => ({
          ...item,
          amount: item.amount || 0,
          status:
            item.status === 'active'
              ? '有效'
              : item.status === 'expired'
                ? '已过期'
                : item.status === 'draft'
                  ? '草稿'
                  : item.status === 'terminated'
                    ? '已终止'
                    : item.status,
        }));
        setContracts(adapted);
      } else {
        setContracts([]);
      }
    } catch (err) {
      apiLogger.error('加载合同数据失败:', err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      有效: { bg: '#dcfce7', color: '#15803d' },
      已过期: { bg: '#fee2e2', color: '#b91c1c' },
      草稿: { bg: '#f1f5f9', color: '#475569' },
      已终止: { bg: '#fde68a', color: '#92400e' },
    };
    const colors = statusMap[status] || { bg: '#f1f5f9', color: '#475569' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<ContractWithAmount>[] = [
    { accessorKey: 'contract_no', header: '合同编号' },
    { accessorKey: 'title', header: '合同名称' },
    { accessorKey: 'supplier_name', header: '供应商' },
    {
      accessorKey: 'total_amount',
      header: '合同金额',
      cell: ({ row }) => (
        <Typography sx={{ fontWeight: 600, color: '#1f2937' }}>
          ¥{(row.original.total_amount || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'start_date',
      header: '开始日期',
      cell: ({ row }) => {
        const date = row.original.start_date;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
    {
      accessorKey: 'end_date',
      header: '结束日期',
      cell: ({ row }) => {
        const date = row.original.end_date;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
  ];

  const filteredContracts = contracts.filter((c) => {
    return (
      c.contract_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreate = () => {
    setFormData({
      contract_no: '',
      supplier_id: '',
      supplier_name: '',
      title: '',
      total_amount: '',
      contract_type: '',
      currency: 'CNY',
      start_date: '',
      end_date: '',
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createContract({
        contract_no: formData.contract_no,
        supplier_id: formData.supplier_id,
        supplier_name: formData.supplier_name,
        title: formData.title,
        contract_type: formData.contract_type || 'purchase',
        total_amount: parseFloat(formData.total_amount),
        currency: formData.currency,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
      });
      toast.success('合同创建成功');
      setShowCreateModal(false);
      loadContracts();
    } catch (err) {
      toast.error('创建失败');
      apiLogger.error('创建合同失败:', err);
    }
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === '有效').length,
    expired: contracts.filter((c) => c.status === '已过期').length,
    draft: contracts.filter((c) => c.status === '草稿').length,
    totalAmount: contracts.reduce((sum, c) => sum + c.amount, 0),
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fce7f3 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: '#ec4899',
              borderTopColor: '#db2777',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fce7f3 0%, #f8fafc 100%)',
      }}
    >
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 64,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 24, height: 24, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 700,
                    color: 'slate.900',
                    fontSize: '1.25rem',
                  }}
                >
                  合同管理
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'slate.500', fontSize: '0.75rem' }}
                >
                  Contract Management
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: '#ec4899', '&:hover': { bgcolor: '#db2777' } }}
            >
              新增合同
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component='main'
        sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: '#fce7f3' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#fbcfe8',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ScrollText sx={{ width: 20, height: 20, color: '#db2777' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    合同总数
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#dcfce7',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ScrollText sx={{ width: 20, height: 20, color: '#16a34a' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    有效合同
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.active}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#fee2e2',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ScrollText sx={{ width: 20, height: 20, color: '#dc2626' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    已过期
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.expired}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#f1f5f9',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ScrollText sx={{ width: 20, height: 20, color: '#64748b' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    草稿
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    {stats.draft}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#e0e7ff',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText sx={{ width: 20, height: 20, color: '#6366f1' }} />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                  >
                    合同总额
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'slate.900' }}
                  >
                    ¥{stats.totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 0,
            }}
          >
            <Typography
              variant='h6'
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ScrollText style={{ width: 20, height: 20, color: '#ec4899' }} />
              合同列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                size='small'
                placeholder='搜索合同编号、名称或供应商...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: <Search style={{ width: 18, height: 18, marginRight: 8 }} />,
                  },
                }}
              />
            </Box>
            <DataTable
              columns={columns}
              data={filteredContracts}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增合同</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='合同编号 *'
                value={formData.contract_no}
                onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                placeholder='请输入合同编号'
              />
              <TextField
                fullWidth
                label='合同名称 *'
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder='请输入合同名称'
              />
              <TextField
                fullWidth
                label='供应商名称'
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder='请输入供应商名称'
              />
              <TextField
                fullWidth
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                placeholder='请输入供应商ID'
              />
              <TextField
                fullWidth
                label='合同金额'
                type='number'
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder='请输入合同金额'
              />
              <TextField
                fullWidth
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value='active'>有效</option>
                <option value='draft'>草稿</option>
                <option value='expired'>已过期</option>
                <option value='terminated'>已终止</option>
              </TextField>
              <TextField
                fullWidth
                label='开始日期'
                type='date'
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <TextField
                fullWidth
                label='结束日期'
                type='date'
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: '#ec4899' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SrmContractPage;
