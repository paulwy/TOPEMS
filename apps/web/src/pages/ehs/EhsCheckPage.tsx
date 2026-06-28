import React, { useState, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
} from '@mui/material';
import {
  Plus,
  Eye,
  ClipboardCheck,
  User,
  MapPin,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ehsApi } from '@/api/ehs';
import type { InspectionPlan, InspectionItem, InspectionRecord, RecordItem } from '@/api/ehs';
import { useAppStore } from '@/store';

const EhsCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'plans' | 'records'>('plans');
  const [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showCreateRecordModal, setShowCreateRecordModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InspectionPlan | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [recordItems, setRecordItems] = useState<RecordItem[]>([]);
  const [planItems, setPlanItems] = useState<InspectionItem[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    inspection_type: 'daily',
    frequency: 'daily',
    start_date: '',
    end_date: '',
    inspector: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);
  const [recordFormData, setRecordFormData] = useState({
    plan_id: '',
    title: '',
    inspection_type: 'daily',
    location: '',
    inspector: '',
    inspected_at: '',
  });
  const [recordItemsForm, setRecordItemsForm] = useState<
    {
      item_id: string | null;
      item_title: string;
      item_category: string;
      result: string;
      remarks: string;
    }[]
  >([]);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab === 'plans') {
      loadPlans();
    } else {
      loadRecords();
    }
  }, [activeTab]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listInspectionPlans({ pagesize: 100 });
      if (response.success && response.data) {
        const plansData = Array.isArray(response.data) ? response.data : response.data.data || [];
        const adapted = plansData.map((item: InspectionPlan) => ({
          ...item,
          status:
            item.status === 'active' ? '启用' : item.status === 'inactive' ? '停用' : item.status,
        }));
        setPlans(adapted);
      } else {
        setPlans([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载检查计划失败:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listInspectionRecords({ pagesize: 100 });
      if (response.success && response.data) {
        const recordsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        const adapted = recordsData.map((item: InspectionRecord) => ({
          ...item,
          status:
            item.status === 'completed'
              ? '已完成'
              : item.status === 'in_progress'
                ? '进行中'
                : item.status === 'pending'
                  ? '待处理'
                  : item.status,
        }));
        setRecords(adapted);
      } else {
        setRecords([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载检查记录失败:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanItems = async (planId: string) => {
    try {
      const response = await ehsApi.listInspectionItems(planId);
      if (response.success && response.data) {
        const itemsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setPlanItems(itemsData);
      } else {
        setPlanItems([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载检查项失败:', err);
      setPlanItems([]);
    }
  };

  const loadRecordDetail = async (recordId: string) => {
    try {
      const response = await ehsApi.getInspectionRecord(recordId);
      if (response.success && response.data) {
        const data = response.data as any;
        setSelectedRecord(data.record);
        setRecordItems(data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载检查记录详情失败:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      进行中: { bg: '#fef9c3', color: '#ca8a04' },
      待处理: { bg: 'error.lighter', color: 'error.dark' },
      启用: { bg: 'success.lighter', color: 'success.dark' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      daily: '日常检查',
      weekly: '周检查',
      monthly: '月度检查',
      quarterly: '季度检查',
      yearly: '年度检查',
      special: '专项检查',
    };
    return typeMap[type] || type;
  };

  const planColumns: ColumnDef<InspectionPlan>[] = [
    { id: 'plan_no', label: '计划编号' },
    { id: 'title', label: '计划名称' },
    {
      id: 'inspection_type',
      label: '检查类型',
      render: (row) => getTypeLabel(row.inspection_type),
    },
    {
      id: 'frequency',
      label: '检查频率',
      render: (row) => getTypeLabel(row.frequency),
    },
    {
      id: 'inspector',
      label: '负责人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.inspector || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            onClick={() => handleViewPlan(row)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
          <Button
            size='small'
            onClick={() => handleViewItems(row)}
            startIcon={<CheckSquare style={{ width: 16, height: 16 }} />}
          >
            检查项
          </Button>
        </Box>
      ),
    },
  ];

  const recordColumns: ColumnDef<InspectionRecord>[] = [
    { id: 'record_no', label: '记录编号' },
    { id: 'title', label: '检查名称' },
    {
      id: 'inspection_type',
      label: '检查类型',
      render: (row) => getTypeLabel(row.inspection_type),
    },
    {
      id: 'location',
      label: '位置',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'inspector',
      label: '检查人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.inspector || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            onClick={() => handleToggleRecord(row.id)}
            startIcon={
              expandedRecords.has(row.id) ? (
                <ChevronUp style={{ width: 16, height: 16 }} />
              ) : (
                <ChevronDown style={{ width: 16, height: 16 }} />
              )
            }
          >
            {expandedRecords.has(row.id) ? '收起' : '展开'}
          </Button>
          <Button
            size='small'
            onClick={() => handleViewRecord(row)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.plan_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plan.inspector && plan.inspector.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.record_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.inspector && record.inspector.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewPlan = (plan: InspectionPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handleViewItems = async (plan: InspectionPlan) => {
    setSelectedPlan(plan);
    await loadPlanItems(plan.id);
    setShowItemsModal(true);
  };

  const handleViewRecord = async (record: InspectionRecord) => {
    await loadRecordDetail(record.id);
    setShowDetailModal(true);
  };

  const handleToggleRecord = (recordId: string) => {
    setExpandedRecords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const handleCreatePlan = () => {
    setFormData({
      title: '',
      description: '',
      inspection_type: 'daily',
      frequency: 'daily',
      start_date: '',
      end_date: '',
      inspector: '',
    });
    setShowCreatePlanModal(true);
  };

  const handleCreateRecord = () => {
    setRecordFormData({
      plan_id: '',
      title: '',
      inspection_type: 'daily',
      location: '',
      inspector: '',
      inspected_at: new Date().toISOString().split('T')[0],
    });
    setRecordItemsForm([]);
    setShowCreateRecordModal(true);
  };

  const handleSavePlan = async () => {
    try {
      await ehsApi.createInspectionPlan({
        title: formData.title,
        description: formData.description || null,
        inspection_type: formData.inspection_type,
        frequency: formData.frequency,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        inspector: formData.inspector || null,
      });
      addNotification({ title: '成功', message: '检查计划创建成功', type: 'success' });
      setShowCreatePlanModal(false);
      loadPlans();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建检查计划失败:', err);
    }
  };

  const handleSaveRecord = async () => {
    try {
      await ehsApi.createInspectionRecord({
        plan_id: recordFormData.plan_id || null,
        title: recordFormData.title,
        inspection_type: recordFormData.inspection_type,
        location: recordFormData.location || null,
        inspector: recordFormData.inspector || null,
        inspected_at: recordFormData.inspected_at || null,
        items: recordItemsForm.map((item) => ({
          item_id: item.item_id || null,
          item_title: item.item_title,
          item_category: item.item_category,
          result: item.result,
          remarks: item.remarks || null,
        })),
      });
      addNotification({ title: '成功', message: '检查记录创建成功', type: 'success' });
      setShowCreateRecordModal(false);
      loadRecords();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建检查记录失败:', err);
    }
  };

  const addRecordItem = () => {
    setRecordItemsForm((prev) => [
      ...prev,
      {
        item_id: null,
        item_title: '',
        item_category: '',
        result: 'pass',
        remarks: '',
      },
    ]);
  };

  const removeRecordItem = (index: number) => {
    setRecordItemsForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRecordItem = (index: number, field: string, value: string) => {
    setRecordItemsForm((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const stats = {
    plansTotal: plans.length,
    plansActive: plans.filter((p) => p.status === '启用').length,
    recordsTotal: records.length,
    recordsCompleted: records.filter((r) => r.status === '已完成').length,
    recordsInProgress: records.filter((r) => r.status === '进行中').length,
  };

  const filters = [
    {
      id: 'status',
      label: '状态',
      type: 'select' as const,
      options:
        activeTab === 'plans'
          ? [
              { label: '全部', value: 'all' },
              { label: '启用', value: '启用' },
              { label: '停用', value: '停用' },
            ]
          : [
              { label: '全部', value: 'all' },
              { label: '已完成', value: '已完成' },
              { label: '进行中', value: '进行中' },
              { label: '待处理', value: '待处理' },
            ],
      value: statusFilter,
      onChange: (value: string) => setStatusFilter(value),
    },
  ];

  return (
    <PageContainer
      title='安全检查'
      subtitle='Safety Inspection'
      maxWidth='xl'
    >
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant={activeTab === 'plans' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveTab('plans');
              setSearchTerm('');
              setStatusFilter('all');
            }}
            startIcon={<ClipboardCheck style={{ width: 18, height: 18 }} />}
          >
            检查计划
          </Button>
          <Button
            variant={activeTab === 'records' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveTab('records');
              setSearchTerm('');
              setStatusFilter('all');
            }}
            startIcon={<FileText style={{ width: 18, height: 18 }} />}
          >
            检查记录
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: activeTab === 'plans' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            },
            gap: 2,
            mb: 4,
          }}
        >
          {activeTab === 'plans' ? (
            <>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: '#dbeafe',
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
                        计划总数
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'slate.900' }}
                      >
                        {stats.plansTotal}
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
                        bgcolor: 'success.lighter',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ClipboardCheck sx={{ width: 20, height: 20, color: 'success.dark' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                      >
                        启用中
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'slate.900' }}
                      >
                        {stats.plansActive}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: '#dbeafe',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText sx={{ width: 20, height: 20, color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                      >
                        检查总数
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'slate.900' }}
                      >
                        {stats.recordsTotal}
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
                        bgcolor: 'success.lighter',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
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
                        {stats.recordsCompleted}
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
                        bgcolor: 'warning.light',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText sx={{ width: 20, height: 20, color: '#ca8a04' }} />
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
                        {stats.recordsInProgress}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      </Box>

      <ListPageTemplate
        title={activeTab === 'plans' ? '检查计划' : '检查记录'}
        subtitle={activeTab === 'plans' ? 'Inspection Plans' : 'Inspection Records'}
        columns={activeTab === 'plans' ? planColumns : (recordColumns as any)}
        data={activeTab === 'plans' ? filteredPlans : (filteredRecords as any)}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={`搜索${activeTab === 'plans' ? '计划编号或名称' : '记录编号或名称'}...`}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        actions={[
          {
            label: activeTab === 'plans' ? '新增计划' : '新增记录',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: activeTab === 'plans' ? handleCreatePlan : handleCreateRecord,
            variant: 'contained',
          },
        ]}
        emptyMessage={`暂无${activeTab === 'plans' ? '检查计划' : '检查记录'}`}
        onRefresh={activeTab === 'plans' ? loadPlans : loadRecords}
      >
        {activeTab === 'records' &&
          filteredRecords.map((record) =>
            expandedRecords.has(record.id) ? (
              <Box
                key={`detail-${record.id}`}
                sx={{
                  borderLeft: 4,
                  borderLeftColor: 'primary.main',
                  p: 3,
                  bg: 'grey.50',
                  mt: 1,
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 12 }}>位置</Typography>
                    <Typography sx={{ mt: 0.5 }}>{record.location || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 12 }}>检查时间</Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {record.inspected_at
                        ? new Date(record.inspected_at).toLocaleString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 12 }}>检查结果</Typography>
                    <Typography sx={{ mt: 0.5 }}>{record.result || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'slate.500', fontSize: 12 }}>发现问题</Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {record.issues && record.issues.length > 0 ? record.issues.join(', ') : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : null
          )}
      </ListPageTemplate>

      <Dialog
        open={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增检查计划</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='计划名称 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder='请输入计划名称'
            />
            <TextField
              fullWidth
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入计划描述'
              multiline
              rows={2}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>检查类型 *</InputLabel>
                <Select
                  value={formData.inspection_type}
                  label='检查类型'
                  onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
                >
                  <MenuItem value='daily'>日常检查</MenuItem>
                  <MenuItem value='weekly'>周检查</MenuItem>
                  <MenuItem value='monthly'>月度检查</MenuItem>
                  <MenuItem value='quarterly'>季度检查</MenuItem>
                  <MenuItem value='yearly'>年度检查</MenuItem>
                  <MenuItem value='special'>专项检查</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>检查频率 *</InputLabel>
                <Select
                  value={formData.frequency}
                  label='检查频率'
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <MenuItem value='daily'>每天</MenuItem>
                  <MenuItem value='weekly'>每周</MenuItem>
                  <MenuItem value='monthly'>每月</MenuItem>
                  <MenuItem value='quarterly'>每季度</MenuItem>
                  <MenuItem value='yearly'>每年</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='开始日期'
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label='结束日期'
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              label='负责人'
              value={formData.inspector}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              placeholder='请输入负责人姓名'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreatePlanModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSavePlan}
            sx={{ bgcolor: 'primary.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showCreateRecordModal}
        onClose={() => setShowCreateRecordModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>新增检查记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='检查名称 *'
                value={recordFormData.title}
                onChange={(e) => setRecordFormData({ ...recordFormData, title: e.target.value })}
                placeholder='请输入检查名称'
              />
              <FormControl fullWidth>
                <InputLabel>检查类型 *</InputLabel>
                <Select
                  value={recordFormData.inspection_type}
                  label='检查类型'
                  onChange={(e) =>
                    setRecordFormData({
                      ...recordFormData,
                      inspection_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value='daily'>日常检查</MenuItem>
                  <MenuItem value='weekly'>周检查</MenuItem>
                  <MenuItem value='monthly'>月度检查</MenuItem>
                  <MenuItem value='quarterly'>季度检查</MenuItem>
                  <MenuItem value='yearly'>年度检查</MenuItem>
                  <MenuItem value='special'>专项检查</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='位置'
                value={recordFormData.location}
                onChange={(e) => setRecordFormData({ ...recordFormData, location: e.target.value })}
                placeholder='请输入检查位置'
              />
              <TextField
                fullWidth
                label='检查人'
                value={recordFormData.inspector}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, inspector: e.target.value })
                }
                placeholder='请输入检查人姓名'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='检查日期'
                value={recordFormData.inspected_at}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, inspected_at: e.target.value })
                }
              />
              <TextField
                fullWidth
                label='关联计划'
                select
                value={recordFormData.plan_id}
                onChange={(e) => setRecordFormData({ ...recordFormData, plan_id: e.target.value })}
              >
                <MenuItem value=''>无</MenuItem>
                {plans.map((plan) => (
                  <MenuItem
                    key={plan.id}
                    value={plan.id}
                  >
                    {plan.plan_no} - {plan.title}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  检查项明细
                </Typography>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={addRecordItem}
                  startIcon={<Plus style={{ width: 14, height: 14 }} />}
                >
                  添加检查项
                </Button>
              </Box>
              {recordItemsForm.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recordItemsForm.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button
                          size='small'
                          variant='text'
                          color='error'
                          onClick={() => removeRecordItem(index)}
                        >
                          删除
                        </Button>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField
                          size='small'
                          label='检查项名称'
                          value={item.item_title}
                          onChange={(e) => updateRecordItem(index, 'item_title', e.target.value)}
                        />
                        <TextField
                          size='small'
                          label='类别'
                          value={item.item_category}
                          onChange={(e) => updateRecordItem(index, 'item_category', e.target.value)}
                        />
                        <FormControl
                          size='small'
                          fullWidth
                        >
                          <InputLabel>结果</InputLabel>
                          <Select
                            value={item.result}
                            label='结果'
                            onChange={(e) => updateRecordItem(index, 'result', e.target.value)}
                          >
                            <MenuItem value='pass'>合格</MenuItem>
                            <MenuItem value='fail'>不合格</MenuItem>
                            <MenuItem value='na'>不适用</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <TextField
                        size='small'
                        fullWidth
                        label='备注'
                        value={item.remarks}
                        onChange={(e) => updateRecordItem(index, 'remarks', e.target.value)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: 'slate.500', textAlign: 'center', py: 4 }}>
                  暂无检查项，点击上方按钮添加
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateRecordModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveRecord}
            sx={{ bgcolor: 'primary.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedPlan ? '检查计划详情' : '检查记录详情'}</DialogTitle>
        <DialogContent>
          {selectedPlan ? (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  计划编号
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{selectedPlan.plan_no}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  计划名称
                </Typography>
                <Typography>{selectedPlan.title}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查类型
                </Typography>
                <Typography>{getTypeLabel(selectedPlan.inspection_type)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查频率
                </Typography>
                <Typography>{getTypeLabel(selectedPlan.frequency)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  负责人
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User style={{ width: 16, height: 16 }} />
                  {selectedPlan.inspector || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>状态</Typography>
                <Typography sx={{ mt: 0.5 }}>{getStatusBadge(selectedPlan.status)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  开始日期
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Calendar style={{ width: 16, height: 16 }} />
                  {selectedPlan.start_date || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  结束日期
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Calendar style={{ width: 16, height: 16 }} />
                  {selectedPlan.end_date || '-'}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>描述</Typography>
                <Typography>{selectedPlan.description || '-'}</Typography>
              </Box>
            </Box>
          ) : selectedRecord ? (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  记录编号
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>{selectedRecord.record_no}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查名称
                </Typography>
                <Typography>{selectedRecord.title}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查类型
                </Typography>
                <Typography>{getTypeLabel(selectedRecord.inspection_type)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>状态</Typography>
                <Typography sx={{ mt: 0.5 }}>{getStatusBadge(selectedRecord.status)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>位置</Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MapPin style={{ width: 16, height: 16 }} />
                  {selectedRecord.location || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查人
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User style={{ width: 16, height: 16 }} />
                  {selectedRecord.inspector || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查时间
                </Typography>
                <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Calendar style={{ width: 16, height: 16 }} />
                  {selectedRecord.inspected_at
                    ? new Date(selectedRecord.inspected_at).toLocaleString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  检查结果
                </Typography>
                <Typography>{selectedRecord.result || '-'}</Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  发现问题
                </Typography>
                <Typography>
                  {selectedRecord.issues && selectedRecord.issues.length > 0
                    ? selectedRecord.issues.join(', ')
                    : '-'}
                </Typography>
              </Box>
              {recordItems.length > 0 && (
                <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    检查项明细
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {recordItems.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 2,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 500 }}>{item.item_title}</Typography>
                          <Typography sx={{ fontSize: 12, color: 'slate.500' }}>
                            {item.item_category}
                          </Typography>
                        </Box>
                        <Chip
                          label={
                            item.result === 'pass'
                              ? '合格'
                              : item.result === 'fail'
                                ? '不合格'
                                : '不适用'
                          }
                          size='small'
                          sx={{
                            bgcolor:
                              item.result === 'pass'
                                ? 'success.lighter'
                                : item.result === 'fail'
                                  ? 'error.lighter'
                                  : 'grey.100',
                            color:
                              item.result === 'pass'
                                ? 'success.dark'
                                : item.result === 'fail'
                                  ? 'error.dark'
                                  : 'text.secondary',
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedPlan?.title} - 检查项</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {planItems.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {planItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {item.item_no} - {item.title}
                      </Typography>
                      <Chip
                        label={item.category}
                        size='small'
                      />
                    </Box>
                    {item.description && (
                      <Typography sx={{ fontSize: 12, color: 'slate.500', mb: 1 }}>
                        {item.description}
                      </Typography>
                    )}
                    {item.standard && (
                      <Typography sx={{ fontSize: 12, color: 'slate.600' }}>
                        标准要求: {item.standard}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: 'slate.500', textAlign: 'center', py: 6 }}>
                暂无检查项
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowItemsModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsCheckPage;
