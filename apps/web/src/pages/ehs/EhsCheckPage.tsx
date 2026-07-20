import React, { useState, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
import { PageContainer } from '@/components/common/PageContainerV2';
import { ehsApi } from '@/api/ehs';
import type { InspectionPlan, InspectionItem, InspectionRecord, RecordItem } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EhsCheckPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'records'>('plans');
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
  const addNotification = useNotificationStore((state) => state.addNotification);
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

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: QUERY_KEYS.EHS.INSPECTION_PLANS,
    enabled: activeTab === 'plans',
    queryFn: async () => {
      const response = await ehsApi.listInspectionPlans({ pagesize: 100 });
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.items || [];
        return data.map((item: InspectionPlan) => ({
          ...item,
          status:
            item.status === 'active' ? t('ehs.ehs_check_page.active') : item.status === 'inactive' ? t('ehs.ehs_check_page.inactive') : item.status,
        }));
      }
      return [];
    },
  });
  const plans = (plansData as InspectionPlan[]) || [];

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: QUERY_KEYS.EHS.INSPECTION_RECORDS,
    enabled: activeTab === 'records',
    queryFn: async () => {
      const response = await ehsApi.listInspectionRecords({ pagesize: 100 });
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.items || [];
        return data.map((item: InspectionRecord) => ({
          ...item,
          status:
            item.status === 'completed'
              ? t('ehs.ehs_check_page.completed')
              : item.status === 'in_progress'
                ? t('ehs.ehs_check_page.in_progress')
                : item.status === 'pending'
                  ? t('ehs.ehs_check_page.pending')
                  : item.status,
        }));
      }
      return [];
    },
  });
  const records = (recordsData as InspectionRecord[]) || [];

  const loading = activeTab === 'plans' ? plansLoading : recordsLoading;

  const planItemsQuery = useQuery<InspectionItem[]>({
    queryKey: QUERY_KEYS.EHS.INSPECTION_ITEMS(selectedPlan?.id || ''),
    queryFn: async () => {
      if (!selectedPlan?.id) return [];
      const response = await ehsApi.listInspectionItems(selectedPlan.id);
      if (response.success && response.data) {
        const data = response.data as unknown as InspectionItem[] | { items: InspectionItem[] };
        return (
          Array.isArray(data)
            ? (data as InspectionItem[])
            : (data.items as InspectionItem[]) || []
        ) as InspectionItem[];
      }
      return [];
    },
    enabled: !!selectedPlan?.id && showItemsModal,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setPlanItems(planItemsQuery.data ?? []);
  }, [planItemsQuery.data]);

  useEffect(() => {
    if (planItemsQuery.isError) {
      apiLogger.error(t('ehs.ehs_check_page.fail'), planItemsQuery.error);
      setPlanItems([]);
    }
  }, [planItemsQuery.isError, planItemsQuery.error]);

  const recordDetailQuery = useQuery<{ record: InspectionRecord; items: RecordItem[] } | null>({
    queryKey: QUERY_KEYS.EHS.INSPECTION_RECORD(selectedRecord?.id || ''),
    queryFn: async () => {
      if (!selectedRecord?.id) return null;
      const response = await ehsApi.getInspectionRecord(selectedRecord.id);
      if (response.success && response.data) {
        const data = response.data as unknown as {
          record: InspectionRecord;
          items: RecordItem[];
        };
        return {
          record: data.record,
          items: data.items || [],
        };
      }
      return null;
    },
    enabled: !!selectedRecord?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (recordDetailQuery.data) {
      setSelectedRecord(recordDetailQuery.data.record);
      setRecordItems(recordDetailQuery.data.items);
    }
  }, [recordDetailQuery.data]);

  useEffect(() => {
    if (recordDetailQuery.isError) {
      apiLogger.error(t('ehs.ehs_check_page.detail'), recordDetailQuery.error);
    }
  }, [recordDetailQuery.isError, recordDetailQuery.error]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      进行中: { bg: 'warning.100', color: ct.yellow[600] },
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
      daily: t('ehs.ehs_check_page.text_e428b1'),
      weekly: t('ehs.ehs_check_page.text_be3739'),
      monthly: t('ehs.ehs_check_page.text_0546f1'),
      quarterly: t('ehs.ehs_check_page.text_f61fd9'),
      yearly: t('ehs.ehs_check_page.text_572f54'),
      special: t('ehs.ehs_check_page.text_1550f9'),
    };
    return typeMap[type] || type;
  };

  const planColumns: ColumnDef<InspectionPlan>[] = [
    { id: 'plan_no', label: t('ehs.ehs_check_page.plan') },
    { id: 'title', label: t('ehs.ehs_check_page.name') },
    {
      id: 'inspection_type',
      label: t('ehs.ehs_check_page.type'),
      render: (row) => getTypeLabel(row.inspection_type),
    },
    {
      id: 'frequency',
      label: t('ehs.ehs_check_page.text_e8a33e'),
      render: (row) => getTypeLabel(row.frequency),
    },
    {
      id: 'inspector',
      label: t('ehs.ehs_check_page.manager'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.inspector || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('ehs.ehs_check_page.status'),
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: t('ehs.ehs_check_page.action'),
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
    { id: 'record_no', label: t('ehs.ehs_check_page.text_4868f6') },
    { id: 'title', label: t('ehs.ehs_check_page.name_1') },
    {
      id: 'inspection_type',
      label: t('ehs.ehs_check_page.type'),
      render: (row) => getTypeLabel(row.inspection_type),
    },
    {
      id: 'location',
      label: t('ehs.ehs_check_page.text_d4d2a6'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'inspector',
      label: t('ehs.ehs_check_page.text_2297ba'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.inspector || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('ehs.ehs_check_page.status'),
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      label: t('ehs.ehs_check_page.action'),
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
            {expandedRecords.has(row.id) ? t('ehs.ehs_check_page.text_def9e9') : t('ehs.ehs_check_page.text_e2edde')}
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

  const handleViewItems = (plan: InspectionPlan) => {
    setSelectedPlan(plan);
    setShowItemsModal(true);
  };

  const handleViewRecord = (record: InspectionRecord) => {
    setSelectedRecord(record);
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

  const createPlanMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createInspectionPlan>[0]) =>
      ehsApi.createInspectionPlan(data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_check_page.success'), message: t('ehs.ehs_check_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INSPECTION_PLANS });
      setShowCreatePlanModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: t('ehs.ehs_check_page.error'), message: t('ehs.ehs_check_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.ehs_check_page.create_2'), error);
    },
  });

  const handleSavePlan = () => {
    createPlanMutation.mutate({
      title: formData.title,
      description: formData.description || null,
      inspection_type: formData.inspection_type,
      frequency: formData.frequency,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      inspector: formData.inspector || null,
    });
  };

  const createRecordMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createInspectionRecord>[0]) =>
      ehsApi.createInspectionRecord(data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_check_page.success'), message: t('ehs.ehs_check_page.create_3'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INSPECTION_RECORDS });
      setShowCreateRecordModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: t('ehs.ehs_check_page.error'), message: t('ehs.ehs_check_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.ehs_check_page.create_4'), error);
    },
  });

  const handleSaveRecord = () => {
    createRecordMutation.mutate({
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
    plansActive: plans.filter((p) => p.status === t('ehs.ehs_check_page.active')).length,
    recordsTotal: records.length,
    recordsCompleted: records.filter((r) => r.status === t('ehs.ehs_check_page.completed')).length,
    recordsInProgress: records.filter((r) => r.status === t('ehs.ehs_check_page.in_progress')).length,
  };

  const filters = [
    {
      id: 'status',
      label: t('ehs.ehs_check_page.status'),
      type: 'select' as const,
      options:
        activeTab === 'plans'
          ? [
              { label: t('ehs.ehs_check_page.all'), value: 'all' },
              { label: t('ehs.ehs_check_page.active'), value: t('ehs.ehs_check_page.active') },
              { label: t('ehs.ehs_check_page.inactive'), value: t('ehs.ehs_check_page.inactive') },
            ]
          : [
              { label: t('ehs.ehs_check_page.all'), value: 'all' },
              { label: t('ehs.ehs_check_page.completed'), value: t('ehs.ehs_check_page.completed') },
              { label: t('ehs.ehs_check_page.in_progress'), value: t('ehs.ehs_check_page.in_progress') },
              { label: t('ehs.ehs_check_page.pending'), value: t('ehs.ehs_check_page.pending') },
            ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  return (
    <PageContainer maxWidth='xl'>
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
                        bgcolor: 'primary.100',
                        borderRadius: 3,
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
                        borderRadius: 3,
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
                        bgcolor: 'primary.100',
                        borderRadius: 3,
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
                        borderRadius: 3,
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
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
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
        title={activeTab === 'plans' ? t('ehs.ehs_check_page.plan_1') : t('ehs.ehs_check_page.text_9b9efd')}
        subtitle={activeTab === 'plans' ? 'Inspection Plans' : 'Inspection Records'}
        columns={(activeTab === 'plans' ? planColumns : recordColumns) as unknown as ColumnDef<InspectionPlan>[]}
        data={(activeTab === 'plans' ? filteredPlans : filteredRecords) as unknown as InspectionPlan[]}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={`搜索${activeTab === 'plans' ? '计划编号或名称' : '记录编号或名称'}...`}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        actions={[
          {
            label: activeTab === 'plans' ? t('ehs.ehs_check_page.add') : t('ehs.ehs_check_page.add_1'),
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: activeTab === 'plans' ? handleCreatePlan : handleCreateRecord,
            variant: 'contained',
          },
        ]}
        emptyMessage={`暂无${activeTab === 'plans' ? '检查计划' : '检查记录'}`}
        onRefresh={() => {
          if (activeTab === 'plans') {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INSPECTION_PLANS });
          } else {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INSPECTION_RECORDS });
          }
        }}
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
              label={t('ehs.ehs_check_page.name_2')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('ehs.ehs_check_page.please_input')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_check_page.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('ehs.ehs_check_page.please_input_1')}
              multiline
              rows={2}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>检查类型 *</InputLabel>
                <Select
                  value={formData.inspection_type}
                  label={t('ehs.ehs_check_page.type')}
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
                  label={t('ehs.ehs_check_page.text_e8a33e')}
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
                label={t('ehs.ehs_check_page.start_date')}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label={t('ehs.ehs_check_page.end_date')}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              label={t('ehs.ehs_check_page.manager')}
              value={formData.inspector}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              placeholder={t('ehs.ehs_check_page.manager_1')}
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
                label={t('ehs.ehs_check_page.name_3')}
                value={recordFormData.title}
                onChange={(e) => setRecordFormData({ ...recordFormData, title: e.target.value })}
                placeholder={t('ehs.ehs_check_page.please_input_2')}
              />
              <FormControl fullWidth>
                <InputLabel>检查类型 *</InputLabel>
                <Select
                  value={recordFormData.inspection_type}
                  label={t('ehs.ehs_check_page.type')}
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
                label={t('ehs.ehs_check_page.text_d4d2a6')}
                value={recordFormData.location}
                onChange={(e) => setRecordFormData({ ...recordFormData, location: e.target.value })}
                placeholder={t('ehs.ehs_check_page.please_input_3')}
              />
              <TextField
                fullWidth
                label={t('ehs.ehs_check_page.text_2297ba')}
                value={recordFormData.inspector}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, inspector: e.target.value })
                }
                placeholder={t('ehs.ehs_check_page.please_input_4')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                type='date'
                label={t('ehs.ehs_check_page.date')}
                value={recordFormData.inspected_at}
                onChange={(e) =>
                  setRecordFormData({ ...recordFormData, inspected_at: e.target.value })
                }
              />
              <TextField
                fullWidth
                label={t('ehs.ehs_check_page.plan_2')}
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
                          label={t('ehs.ehs_check_page.name_4')}
                          value={item.item_title}
                          onChange={(e) => updateRecordItem(index, 'item_title', e.target.value)}
                        />
                        <TextField
                          size='small'
                          label={t('ehs.ehs_check_page.text_383a6d')}
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
                            label={t('ehs.ehs_check_page.text_5ad7f5')}
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
                        label={t('ehs.ehs_check_page.remark')}
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
        <DialogTitle>{selectedPlan ? t('ehs.ehs_check_page.detail_1') : t('ehs.ehs_check_page.detail_2')}</DialogTitle>
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
                              ? t('ehs.ehs_check_page.qualified')
                              : item.result === 'fail'
                                ? t('ehs.ehs_check_page.unqualified')
                                : t('ehs.ehs_check_page.text_321ff7')
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
