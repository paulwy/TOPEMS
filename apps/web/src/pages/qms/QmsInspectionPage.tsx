import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Button as MuiButton,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  User,
  Send,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { qmsApi, type QualityCheck, type CreateQualityCheckRequest } from '@/api/qms';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '待分配', bg: 'warning.light', color: 'warning.dark' },
  in_progress: { label: '进行中', bg: '#dbeafe', color: 'primary.dark' },
  pending_audit: { label: '待审核', bg: '#f3e8ff', color: 'secondary.dark' },
  completed: { label: '已完成', bg: 'success.lighter', color: 'success.dark' },
  rejected: { label: '已驳回', bg: 'error.lighter', color: 'error.dark' },
};

const INSPECTION_TYPE_MAP: Record<string, string> = {
  incoming: '来料检验',
  process: '过程检验',
  final: '成品检验',
  routine: '例行检验',
};

interface InspectionResultItem {
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
}

const QmsInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityCheck | null>(null);
  const [formData, setFormData] = useState<CreateQualityCheckRequest>({
    inspection_type: 'incoming',
    product_name: '',
    quantity: 100,
  });
  const [assignData, setAssignData] = useState({ assignee: '', operator: '' });
  const [submitData, setSubmitData] = useState({
    qualified_quantity: 0,
    unqualified_quantity: 0,
    inspector: '',
    memo: '',
    results: [] as InspectionResultItem[],
  });
  const [auditData, setAuditData] = useState({
    action: 'approve',
    operator: '',
    comment: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await qmsApi.listChecks();
      if (response.success && response.data) {
        setInspections(response.data);
      }
    } catch (error: unknown) {
      console.error('Failed to load inspections:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{
          backgroundColor: config.bg,
          color: config.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStatusStepIndex = (status: string): number => {
    const order = ['pending', 'in_progress', 'pending_audit', 'completed', 'rejected'];
    return order.indexOf(status);
  };

  const columns: ColumnDef<QualityCheck>[] = [
    { id: 'inspection_no', label: '检验单号' },
    {
      id: 'inspection_type',
      label: '检验类型',
      render: (row) => INSPECTION_TYPE_MAP[row.inspection_type] || row.inspection_type,
    },
    { id: 'product_name', label: '产品名称' },
    { id: 'quantity', label: '检验数量' },
    { id: 'qualified_quantity', label: '合格数量' },
    { id: 'unqualified_quantity', label: '不合格数量' },
    {
      id: 'qualification_rate',
      label: '合格率',
      render: (row) => (
        <Box
          sx={{
            color:
              (row.qualification_rate || 0) >= 95
                ? 'success.dark'
                : (row.qualification_rate || 0) >= 90
                  ? '#ca8a04'
                  : 'error.dark',
            fontWeight: 500,
          }}
        >
          {row.qualification_rate !== undefined ? `${row.qualification_rate.toFixed(1)}%` : '-'}
        </Box>
      ),
    },
    { id: 'assignee', label: '分配人员' },
    { id: 'inspector', label: '检验员' },
    { id: 'inspected_at', label: '检验日期' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions: RowAction<QualityCheck>[] = [
    {
      label: '详情',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '分配',
      icon: <User style={{ width: 16, height: 16 }} />,
      color: 'primary',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleAssign(row),
    },
    {
      label: '提交结果',
      icon: <Send style={{ width: 16, height: 16 }} />,
      color: 'primary',
      show: (row) => row.status === 'in_progress',
      onClick: (row) => handleSubmit(row),
    },
    {
      label: '审核通过',
      icon: <CheckCircle style={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status === 'pending_audit',
      onClick: (row) => handleAudit(row, 'approve'),
    },
    {
      label: '审核驳回',
      icon: <XCircle style={{ width: 16, height: 16 }} />,
      color: 'error',
      show: (row) => row.status === 'pending_audit',
      onClick: (row) => handleAudit(row, 'reject'),
    },
    {
      label: '返工',
      icon: <RotateCcw style={{ width: 16, height: 16 }} />,
      color: 'warning',
      show: (row) => row.status === 'rejected',
      onClick: (row) => handleRework(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'type',
      label: '检验类型',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '来料检验', value: 'incoming' },
        { label: '过程检验', value: 'process' },
        { label: '成品检验', value: 'final' },
        { label: '例行检验', value: 'routine' },
      ],
      value: typeFilter,
      onChange: (value) => setTypeFilter(value),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '待分配', value: 'pending' },
        { label: '进行中', value: 'in_progress' },
        { label: '待审核', value: 'pending_audit' },
        { label: '已完成', value: 'completed' },
        { label: '已驳回', value: 'rejected' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value),
    },
  ];

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspection_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || inspection.inspection_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedData = filteredInspections.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (inspection: QualityCheck) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      inspection_type: 'incoming',
      product_name: '',
      quantity: 100,
    });
    setShowCreateModal(true);
  };

  const handleAssign = (inspection: QualityCheck) => {
    setSelectedInspection(inspection);
    setAssignData({ assignee: '', operator: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = (inspection: QualityCheck) => {
    setSelectedInspection(inspection);
    setSubmitData({
      qualified_quantity: 0,
      unqualified_quantity: 0,
      inspector: '',
      memo: '',
      results: [],
    });
    setShowSubmitModal(true);
  };

  const handleAudit = (inspection: QualityCheck, action: string) => {
    setSelectedInspection(inspection);
    setAuditData({ action, operator: '', comment: '' });
    setShowAuditModal(true);
  };

  const handleRework = (inspection: QualityCheck) => {
    setSelectedInspection(inspection);
    setAuditData({ action: 'rework', operator: '', comment: '' });
    setShowAuditModal(true);
  };

  const handleSave = async () => {
    try {
      const response = await qmsApi.createCheck(formData);
      if (response.success) {
        loadInspections();
        setShowCreateModal(false);
      }
    } catch (error: unknown) {
      console.error('Failed to create inspection:', error);
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedInspection) return;
    try {
      const response = await qmsApi.assignCheck(selectedInspection.id, {
        assignee: assignData.assignee,
        operator: assignData.operator,
      });
      if (response.success) {
        loadInspections();
        setShowAssignModal(false);
      }
    } catch (error: unknown) {
      console.error('Failed to assign inspection:', error);
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedInspection) return;
    try {
      const total = submitData.qualified_quantity + submitData.unqualified_quantity;
      const rate = total > 0 ? (submitData.qualified_quantity / total) * 100 : 0;
      const response = await qmsApi.submitCheckResult(selectedInspection.id, {
        qualified_quantity: submitData.qualified_quantity,
        unqualified_quantity: submitData.unqualified_quantity,
        qualification_rate: rate,
        inspector: submitData.inspector,
        memo: submitData.memo,
        results: submitData.results.length > 0 ? submitData.results : undefined,
      });
      if (response.success) {
        loadInspections();
        setShowSubmitModal(false);
      }
    } catch (error: unknown) {
      console.error('Failed to submit inspection result:', error);
    }
  };

  const handleAuditSubmit = async () => {
    if (!selectedInspection) return;
    try {
      if (auditData.action === 'rework') {
        await qmsApi.reworkCheck(selectedInspection.id, {
          action: 'rework',
          operator: auditData.operator,
          comment: auditData.comment,
        });
      } else {
        await qmsApi.auditCheck(selectedInspection.id, {
          action: auditData.action,
          operator: auditData.operator,
          comment: auditData.comment,
        });
      }
      loadInspections();
      setShowAuditModal(false);
    } catch (error: unknown) {
      console.error('Failed to audit inspection:', error);
    }
  };

  const addResultItem = () => {
    setSubmitData((prev) => ({
      ...prev,
      results: [...prev.results, { item_name: '', is_qualified: true }],
    }));
  };

  const removeResultItem = (index: number) => {
    setSubmitData((prev) => ({
      ...prev,
      results: prev.results.filter((_, i) => i !== index),
    }));
  };

  const updateResultItem = (index: number, field: keyof InspectionResultItem, value: any) => {
    setSubmitData((prev) => ({
      ...prev,
      results: prev.results.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === 'is_qualified' ? value === 'true' || value === true : value,
            }
          : item
      ),
    }));
  };

  const stats = {
    total: inspections.length,
    pending: inspections.filter((i) => i.status === 'pending').length,
    in_progress: inspections.filter((i) => i.status === 'in_progress').length,
    pending_audit: inspections.filter((i) => i.status === 'pending_audit').length,
    completed: inspections.filter((i) => i.status === 'completed').length,
    rejected: inspections.filter((i) => i.status === 'rejected').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'primary.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.light',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck sx={{ width: 20, height: 20, color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                检验总数
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
      <Card sx={{ bgcolor: '#fef9c3' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#fde047',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle sx={{ width: 20, height: 20, color: '#ca8a04' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待分配
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.pending}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: '#dbeafe' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#93c5fd',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                进行中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.in_progress}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: '#f3e8ff' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#d8b4fe',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待审核
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.pending_audit}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: 'success.lighter' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#86efac',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: 'error.lighter' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#fca5a5',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已驳回
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.rejected}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, primary.light 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'primary.main',
              borderTopColor: 'primary.dark',
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
        background: 'linear-gradient(135deg, primary.light 0%, #f8fafc 100%)',
      }}
    >
      <ListPageTemplate
        title='质量检验'
        subtitle='Quality Inspection'
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'QMS' },
          { label: '质量检验' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索产品名称或检验单号...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredInspections.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新建检验',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建检验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>检验类型</InputLabel>
              <Select
                value={formData.inspection_type}
                label='检验类型'
                onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
              >
                <MenuItem value='incoming'>来料检验</MenuItem>
                <MenuItem value='process'>过程检验</MenuItem>
                <MenuItem value='final'>成品检验</MenuItem>
                <MenuItem value='routine'>例行检验</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='产品名称 *'
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder='请输入产品名称'
            />
            <TextField
              fullWidth
              type='number'
              label='检验数量'
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder='请输入检验数量'
            />
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
            sx={{ bgcolor: 'primary.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>分配检验人员</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='被分配人员 *'
              value={assignData.assignee}
              onChange={(e) => setAssignData({ ...assignData, assignee: e.target.value })}
              placeholder='请输入人员姓名'
            />
            <TextField
              fullWidth
              label='操作人 *'
              value={assignData.operator}
              onChange={(e) => setAssignData({ ...assignData, operator: e.target.value })}
              placeholder='请输入操作人姓名'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAssignModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAssignSubmit}
            sx={{ bgcolor: 'primary.main' }}
          >
            确认分配
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>提交检验结果</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label='合格数量 *'
              value={submitData.qualified_quantity}
              onChange={(e) =>
                setSubmitData({
                  ...submitData,
                  qualified_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder='请输入合格数量'
            />
            <TextField
              fullWidth
              type='number'
              label='不合格数量 *'
              value={submitData.unqualified_quantity}
              onChange={(e) =>
                setSubmitData({
                  ...submitData,
                  unqualified_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder='请输入不合格数量'
            />
            <TextField
              fullWidth
              label='检验员 *'
              value={submitData.inspector}
              onChange={(e) => setSubmitData({ ...submitData, inspector: e.target.value })}
              placeholder='请输入检验员姓名'
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label='备注'
              value={submitData.memo}
              onChange={(e) => setSubmitData({ ...submitData, memo: e.target.value })}
              placeholder='请输入备注信息'
            />
            <Divider />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                检验项目明细
              </Typography>
              <Button
                variant='outlined'
                size='small'
                onClick={addResultItem}
                startIcon={<Plus style={{ width: 14, height: 14 }} />}
              >
                添加项目
              </Button>
            </Box>
            {submitData.results.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    sx={{ flex: 1 }}
                    label='检验项目'
                    value={item.item_name}
                    onChange={(e) => updateResultItem(index, 'item_name', e.target.value)}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label='标准值'
                    value={item.standard_value || ''}
                    onChange={(e) => updateResultItem(index, 'standard_value', e.target.value)}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label='实测值'
                    value={item.measured_value || ''}
                    onChange={(e) => updateResultItem(index, 'measured_value', e.target.value)}
                  />
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel>判定</InputLabel>
                    <Select
                      value={String(item.is_qualified)}
                      label='判定'
                      onChange={(e) => updateResultItem(index, 'is_qualified', e.target.value)}
                    >
                      <MenuItem value='true'>合格</MenuItem>
                      <MenuItem value='false'>不合格</MenuItem>
                    </Select>
                  </FormControl>
                  <MuiButton
                    onClick={() => removeResultItem(index)}
                    color='error'
                    size='small'
                  >
                    删除
                  </MuiButton>
                </Box>
                <TextField
                  fullWidth
                  label='备注'
                  value={item.remark || ''}
                  onChange={(e) => updateResultItem(index, 'remark', e.target.value)}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowSubmitModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmitResult}
            sx={{ bgcolor: 'primary.main' }}
          >
            提交结果
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {auditData.action === 'rework'
            ? '返工申请'
            : auditData.action === 'approve'
              ? '审核通过'
              : '审核驳回'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='审核人 *'
              value={auditData.operator}
              onChange={(e) => setAuditData({ ...auditData, operator: e.target.value })}
              placeholder='请输入审核人姓名'
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label='审核意见'
              value={auditData.comment}
              onChange={(e) => setAuditData({ ...auditData, comment: e.target.value })}
              placeholder='请输入审核意见'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAuditModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAuditSubmit}
            sx={{
              bgcolor:
                auditData.action === 'approve'
                  ? 'success.dark'
                  : auditData.action === 'rework'
                    ? '#ca8a04'
                    : 'error.dark',
            }}
          >
            {auditData.action === 'rework'
              ? '确认返工'
              : auditData.action === 'approve'
                ? '审核通过'
                : '审核驳回'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>检验详情</DialogTitle>
        <DialogContent>
          {selectedInspection && (
            <Box sx={{ pt: 2 }}>
              <Stepper
                activeStep={getStatusStepIndex(selectedInspection.status)}
                alternativeLabel
                sx={{ mb: 4 }}
              >
                <Step>
                  <StepLabel>待分配</StepLabel>
                </Step>
                <Step>
                  <StepLabel>进行中</StepLabel>
                </Step>
                <Step>
                  <StepLabel>待审核</StepLabel>
                </Step>
                <Step>
                  <StepLabel>已完成</StepLabel>
                </Step>
              </Stepper>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检验单号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedInspection.inspection_no}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检验类型
                  </Box>
                  <Box>
                    {INSPECTION_TYPE_MAP[selectedInspection.inspection_type] ||
                      selectedInspection.inspection_type}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    产品名称
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedInspection.product_name || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    状态
                  </Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedInspection.status)}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检验数量
                  </Box>
                  <Box>{selectedInspection.quantity}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    合格数量
                  </Box>
                  <Box>{selectedInspection.qualified_quantity || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    不合格数量
                  </Box>
                  <Box>{selectedInspection.unqualified_quantity || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    合格率
                  </Box>
                  <Box sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {selectedInspection.qualification_rate !== undefined
                      ? `${selectedInspection.qualification_rate.toFixed(1)}%`
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    分配人员
                  </Box>
                  <Box>{selectedInspection.assignee || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检验员
                  </Box>
                  <Box>{selectedInspection.inspector || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    检验日期
                  </Box>
                  <Box>{selectedInspection.inspected_at || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    结果
                  </Box>
                  <Box>{selectedInspection.result || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    备注
                  </Box>
                  <Box>{selectedInspection.memo || '-'}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QmsInspectionPage;
