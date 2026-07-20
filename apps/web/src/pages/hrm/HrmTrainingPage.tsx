import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Calendar,
  BookOpen,
  Users,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  UserPlus,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  trainingPlanApi,
  trainingCourseApi,
  trainingRecordApi,
  employeeApi,
  type TrainingPlan,
  type TrainingCourse,
  type TrainingRecord,
  type Employee,
} from '@/api/hrm';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  StatsPageTemplate,
  type StatsStatCard,
} from '@/components/templates';
import { ConfirmDialog, PageContainer, ImageUpload } from '@/components/common';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Avatar,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const HrmTrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'plans' | 'courses' | 'records'>('plans');
  const [loading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editItem, setEditItem] = useState<TrainingPlan | TrainingCourse | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingPlan | TrainingCourse>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const plansQuery = useQuery<TrainingPlan[]>({
    queryKey: [...QUERY_KEYS.HRM.TRAINING, 'plans'],
    queryFn: async () => {
      const planRes = await trainingPlanApi.list({ pagesize: 100 });
      if (planRes.code === 200) {
        return planRes.data?.items || [];
      }
      return [];
    },
    enabled: activeTab === 'plans',
  });

  const coursesQuery = useQuery<TrainingCourse[]>({
    queryKey: [...QUERY_KEYS.HRM.TRAINING, 'courses'],
    queryFn: async () => {
      const courseRes = await trainingCourseApi.list({ pagesize: 100 });
      if (courseRes.code === 200) {
        return courseRes.data?.items || [];
      }
      return [];
    },
    enabled: activeTab === 'courses',
  });

  const recordsQuery = useQuery<TrainingRecord[]>({
    queryKey: QUERY_KEYS.HRM.TRAINING_RECORDS,
    queryFn: async () => {
      const recordRes = await trainingRecordApi.list({ pagesize: 100 });
      if (recordRes.code === 200) {
        return recordRes.data?.items || [];
      }
      return [];
    },
    enabled: activeTab === 'records',
  });

  const employeesQuery = useQuery<Employee[]>({
    queryKey: QUERY_KEYS.HRM.EMPLOYEES,
    queryFn: async () => {
      const res = await employeeApi.list({ pagesize: 200 });
      if (res.code === 200) {
        return res.data?.items || [];
      }
      return [];
    },
  });

  const plans = plansQuery.data || [];
  const courses = coursesQuery.data || [];
  const records = recordsQuery.data || [];
  const employees = employeesQuery.data || [];

  const loadData = useCallback(() => {
    if (activeTab === 'plans') {
      plansQuery.refetch();
    } else if (activeTab === 'courses') {
      coursesQuery.refetch();
    } else {
      recordsQuery.refetch();
    }
  }, [activeTab, plansQuery, coursesQuery, recordsQuery]);

  const getEmployeeName = (id?: string) => {
    if (!id) return '-';
    return employees.find((e) => e.id === id)?.name || '-';
  };

  const handleOpenModal = useCallback((item?: TrainingPlan | TrainingCourse) => {
    if (item) {
      setEditItem(item);
      setFormData({ ...item });
    } else {
      setEditItem(null);
      setFormData({});
    }
    setShowModal(true);
  }, []);

  const handleViewRecord = useCallback((record: TrainingRecord) => {
    setSelectedRecord(record);
    setShowRecordModal(true);
  }, []);

  const handleOpenEnrollModal = useCallback((course: TrainingCourse) => {
    setSelectedCourse(course);
    setShowEnrollModal(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (args: {
      editItem: TrainingPlan | TrainingCourse | null;
      activeTab: 'plans' | 'courses' | 'records';
      formData: Partial<TrainingPlan | TrainingCourse>;
    }) => {
      const { editItem, activeTab, formData } = args;
      if (editItem) {
        if (activeTab === 'plans') {
          return trainingPlanApi.update(editItem.id, formData);
        } else {
          return trainingCourseApi.update(editItem.id, formData);
        }
      } else {
        if (activeTab === 'plans') {
          return trainingPlanApi.create(formData);
        } else {
          return trainingCourseApi.create(formData);
        }
      }
    },
    onSuccess: (response, variables) => {
      if (response.code === 200) {
        addNotification({
          title: t('hrm.hrm_training_page.success'),
          message: variables.editItem ? t('hrm.hrm_training_page.update') : t('hrm.hrm_training_page.create'),
          type: 'success',
        });
        setShowModal(false);
        if (variables.activeTab === 'plans') {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.HRM.TRAINING, 'plans'] });
        } else {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.HRM.TRAINING, 'courses'] });
        }
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to save:', err);
      addNotification({ title: t('hrm.hrm_training_page.fail'), message: t('hrm.hrm_training_page.save'), type: 'error' });
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate({ editItem, activeTab, formData });
  }, [editItem, formData, activeTab, saveMutation]);

  const deleteMutation = useMutation({
    mutationFn: async (args: { id: string; activeTab: 'plans' | 'courses' | 'records' }) => {
      const { id, activeTab } = args;
      if (activeTab === 'plans') {
        return trainingPlanApi.delete(id);
      } else if (activeTab === 'courses') {
        return trainingCourseApi.delete(id);
      } else {
        return trainingRecordApi.delete(id);
      }
    },
    onSuccess: (response, variables) => {
      if (response.code === 200) {
        addNotification({ title: t('hrm.hrm_training_page.success'), message: t('hrm.hrm_training_page.delete_success'), type: 'success' });
        if (variables.activeTab === 'plans') {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.HRM.TRAINING, 'plans'] });
        } else if (variables.activeTab === 'courses') {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.HRM.TRAINING, 'courses'] });
        } else {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.TRAINING_RECORDS });
        }
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to delete:', err);
      addNotification({ title: t('hrm.hrm_training_page.fail'), message: t('hrm.hrm_training_page.delete'), type: 'error' });
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id, activeTab });
    },
    [activeTab, deleteMutation]
  );

  const statusChangeMutation = useMutation({
    mutationFn: async (args: { id: string; activate: boolean }) => {
      const { id, activate } = args;
      return activate ? trainingPlanApi.activate(id) : trainingPlanApi.deactivate(id);
    },
    onSuccess: (response, variables) => {
      if (response.code === 200) {
        addNotification({
          title: t('hrm.hrm_training_page.success'),
          message: variables.activate ? t('hrm.hrm_training_page.active') : t('hrm.hrm_training_page.inactive'),
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.HRM.TRAINING, 'plans'] });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to update status:', err);
      addNotification({ title: t('hrm.hrm_training_page.fail'), message: t('hrm.hrm_training_page.operation_failed'), type: 'error' });
    },
  });

  const handleStatusChange = useCallback(
    (id: string, activate: boolean) => {
      statusChangeMutation.mutate({ id, activate });
    },
    [statusChangeMutation]
  );

  const enrollMutation = useMutation({
    mutationFn: async (args: { courseId: string; employeeId: string }) =>
      trainingRecordApi.enroll(args.courseId, args.employeeId),
    onSuccess: (response) => {
      if (response.code === 200) {
        addNotification({ title: t('hrm.hrm_training_page.success'), message: t('hrm.hrm_training_page.success_1'), type: 'success' });
        setShowEnrollModal(false);
        setSelectedCourse(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.TRAINING_RECORDS });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to enroll:', err);
      addNotification({ title: t('hrm.hrm_training_page.fail'), message: t('hrm.hrm_training_page.fail_1'), type: 'error' });
    },
  });

  const handleEnroll = useCallback(
    (employeeId: string) => {
      if (!selectedCourse) return;
      enrollMutation.mutate({ courseId: selectedCourse.id, employeeId });
    },
    [selectedCourse, enrollMutation]
  );

  const filteredPlans = plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = records.filter((record) =>
    getEmployeeName(record.employee_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statCards: StatsStatCard[] = [
    {
      id: 'totalPlans',
      title: t('hrm.hrm_training_page.plan'),
      value: plans.length,
      icon: <Calendar size={20} />,
      color: 'primary',
    },
    {
      id: 'activeCourses',
      title: t('hrm.hrm_training_page.in_progress'),
      value: courses.filter((c) => c.status === 'active').length,
      icon: <BookOpen size={20} />,
      color: 'warning',
    },
    {
      id: 'completedRecords',
      title: t('hrm.hrm_training_page.completed'),
      value: records.filter((r) => r.completion_status === 'completed').length,
      icon: <CheckCircle size={20} />,
      color: 'success',
    },
    {
      id: 'avgCompletionRate',
      title: t('hrm.hrm_training_page.completed_1'),
      value:
        records.length > 0
          ? Math.round(
              (records.filter((r) => r.completion_status === 'completed').length / records.length) *
                100
            )
          : 0,
      suffix: '%',
      icon: <Users size={20} />,
      color: 'info',
    },
  ];

  const planColumns: ColumnDef<TrainingPlan>[] = [
    {
      id: 'name',
      label: t('hrm.hrm_training_page.name'),
      width: 200,
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.name}</Typography>
      ),
    },
    {
      id: 'code',
      label: t('hrm.hrm_training_page.text_06e004'),
      width: 120,
    },
    {
      id: 'dates',
      label: t('hrm.hrm_training_page.time'),
      width: 180,
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date(row.start_date).toLocaleDateString()} ~{' '}
          {new Date(row.end_date).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      id: 'budget',
      label: t('hrm.hrm_training_page.text_13d043'),
      width: 120,
      align: 'right',
      render: (row) => (
        <Typography variant='body2'>
          {row.budget ? `¥${row.budget.toLocaleString()}` : '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('hrm.hrm_training_page.status'),
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.status === 'active' ? t('hrm.hrm_training_page.in_progress_1') : t('hrm.hrm_training_page.text_047fab')}
          color={row.status === 'active' ? 'primary' : 'default'}
        />
      ),
    },
  ];

  const planActions: RowAction<TrainingPlan>[] = [
    {
      label: t('hrm.hrm_training_page.edit'),
      icon: <Edit2 size={16} />,
      onClick: (row) => handleOpenModal(row),
    },
    {
      label: t('hrm.hrm_training_page.delete_1'),
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: t('hrm.hrm_training_page.confirm'),
    },
  ];

  const courseColumns: ColumnDef<TrainingCourse>[] = [
    {
      id: 'name',
      label: t('hrm.hrm_training_page.name_1'),
      width: 200,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontSize: 14,
            }}
          >
            {row.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.code || t('hrm.hrm_training_page.text_71c140')}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'category',
      label: t('hrm.hrm_training_page.text_d0771a'),
      width: 120,
      render: (row) => (
        <Chip
          size='small'
          label={row.category}
        />
      ),
    },
    {
      id: 'level',
      label: t('hrm.hrm_training_page.text_e78e4b'),
      width: 100,
    },
    {
      id: 'duration',
      label: t('hrm.hrm_training_page.text_5bdfd7'),
      width: 100,
      render: (row) => (
        <Typography variant='body2'>
          {row.duration_hours ? `${row.duration_hours}小时` : '-'}
        </Typography>
      ),
    },
    {
      id: 'instructor',
      label: t('hrm.hrm_training_page.text_a41f90'),
      width: 120,
      render: (row) => <Typography variant='body2'>{row.instructor_name || '-'}</Typography>,
    },
    {
      id: 'status',
      label: t('hrm.hrm_training_page.status'),
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.status === 'active' ? t('hrm.hrm_training_page.text_d0f7dc') : t('hrm.hrm_training_page.close')}
          color={row.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
  ];

  const courseActions: RowAction<TrainingCourse>[] = [
    {
      label: t('hrm.hrm_training_page.edit'),
      icon: <Edit2 size={16} />,
      onClick: (row) => handleOpenModal(row),
    },
    {
      label: t('hrm.hrm_training_page.delete_1'),
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: t('hrm.hrm_training_page.confirm_1'),
    },
    {
      label: t('hrm.hrm_training_page.text_0e0fd4'),
      icon: <UserPlus size={16} />,
      onClick: (row) => handleOpenEnrollModal(row),
      color: 'success',
      show: (row) => row.status === 'active',
    },
  ];

  const recordColumns: ColumnDef<TrainingRecord>[] = [
    {
      id: 'employee',
      label: t('hrm.hrm_training_page.text_2ed392'),
      width: 150,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontSize: 14,
            }}
          >
            {getEmployeeName(row.employee_id).charAt(0).toUpperCase()}
          </Avatar>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {getEmployeeName(row.employee_id)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'course',
      label: t('hrm.hrm_training_page.text_58983b'),
      width: 150,
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {row.course_id.substring(0, 8)}...
        </Typography>
      ),
    },
    {
      id: 'enrollment_date',
      label: t('hrm.hrm_training_page.date'),
      width: 120,
      render: (row) => (
        <Typography variant='body2'>
          {new Date(row.enrollment_date).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      id: 'attendance',
      label: t('hrm.hrm_training_page.status_1'),
      width: 100,
      render: (row) => {
        const status = row.attendance_status;
        return (
          <Chip
            size='small'
            label={status === 'attended' ? t('hrm.hrm_training_page.text_b408f4') : status === 'absent' ? t('hrm.hrm_training_page.text_10399d') : t('hrm.hrm_training_page.text_a358ca')}
            color={status === 'attended' ? 'success' : status === 'absent' ? 'error' : 'default'}
            variant={status === 'pending' ? 'outlined' : 'filled'}
          />
        );
      },
    },
    {
      id: 'completion',
      label: t('hrm.hrm_training_page.status_2'),
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.completion_status === 'completed' ? t('hrm.hrm_training_page.completed_2') : t('hrm.hrm_training_page.incomplete')}
          color={row.completion_status === 'completed' ? 'success' : 'default'}
          variant={row.completion_status === 'completed' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      id: 'score',
      label: t('hrm.hrm_training_page.text_38c126'),
      width: 100,
      render: (row) => (
        <Typography variant='body2'>{t('hrm.hrm_training_page.text_05f6da')}</Typography>
      ),
    },
  ];

  const recordActions: RowAction<TrainingRecord>[] = [
    {
      label: t('hrm.hrm_training_page.view_detail'),
      icon: <Eye size={16} />,
      onClick: (row) => handleViewRecord(row),
    },
    {
      label: t('hrm.hrm_training_page.delete_1'),
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: t('hrm.hrm_training_page.confirm_2'),
    },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_training_page.text_5e502d')}
      subtitle={t('hrm.hrm_training_page.plan_1')}
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title=''
        subtitle=''
        statCards={statCards}
        showStatCards={true}
        customToolbar={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={activeTab === 'plans' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('plans')}
              startIcon={<Calendar size={16} />}
            >
              培训计划
            </Button>
            <Button
              variant={activeTab === 'courses' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('courses')}
              startIcon={<BookOpen size={16} />}
            >
              培训课程
            </Button>
            <Button
              variant={activeTab === 'records' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('records')}
              startIcon={<Users size={16} />}
            >
              培训记录
            </Button>
          </Box>
        }
      />

      {activeTab === 'plans' && (
        <ListPageTemplate<TrainingPlan>
          title={t('hrm.hrm_training_page.plan_2')}
          subtitle={t('hrm.hrm_training_page.plan_3')}
          columns={planColumns}
          data={filteredPlans}
          loading={loading}
          rowActions={planActions}
          searchable
          searchPlaceholder={t('hrm.hrm_training_page.search')}
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          actions={[
            {
              label: t('hrm.hrm_training_page.add'),
              icon: <Plus size={16} />,
              onClick: () => handleOpenModal(),
              variant: 'contained',
            },
          ]}
          onRefresh={loadData}
          exportable
          exportFileName={t('hrm.hrm_training_page.list')}
          persistFilters
          persistSearch
          emptyActionButton={{
            label: t('hrm.hrm_training_page.add'),
            icon: <Plus size={16} />,
            onClick: () => handleOpenModal(),
          }}
        />
      )}

      {activeTab === 'courses' && (
        <ListPageTemplate<TrainingCourse>
          title={t('hrm.hrm_training_page.text_07cb67')}
          subtitle={t('hrm.hrm_training_page.info')}
          columns={courseColumns}
          data={filteredCourses}
          loading={loading}
          rowActions={courseActions}
          searchable
          searchPlaceholder={t('hrm.hrm_training_page.search_1')}
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          actions={[
            {
              label: t('hrm.hrm_training_page.add_1'),
              icon: <Plus size={16} />,
              onClick: () => handleOpenModal(),
              variant: 'contained',
            },
          ]}
          onRefresh={loadData}
          exportable
          exportFileName={t('hrm.hrm_training_page.list_1')}
          persistFilters
          persistSearch
          emptyActionButton={{
            label: t('hrm.hrm_training_page.add_1'),
            icon: <Plus size={16} />,
            onClick: () => handleOpenModal(),
          }}
        />
      )}

      {activeTab === 'records' && (
        <ListPageTemplate<TrainingRecord>
          title={t('hrm.hrm_training_page.text_6a18d7')}
          subtitle={t('hrm.hrm_training_page.view')}
          columns={recordColumns}
          data={filteredRecords}
          loading={loading}
          rowActions={recordActions}
          searchable
          searchPlaceholder={t('hrm.hrm_training_page.search_2')}
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          onRefresh={loadData}
          exportable
          exportFileName={t('hrm.hrm_training_page.list_2')}
          persistFilters
          persistSearch
          emptyActionButton={{
            label: t('hrm.hrm_training_page.view_1'),
            onClick: () => setActiveTab('courses'),
          }}
        />
      )}

      {showModal && (
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>
            {editItem ? t('hrm.hrm_training_page.edit') : t('hrm.hrm_training_page.add_2')}
            {activeTab === 'plans' ? t('hrm.hrm_training_page.plan_2') : t('hrm.hrm_training_page.text_07cb67')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {activeTab === 'plans' ? (
                <>
                  <Box>
                    <FormLabel htmlFor='plan-name'>计划名称 *</FormLabel>
                    <TextField
                      id='plan-name'
                      size='small'
                      fullWidth
                      type='text'
                      value={(formData as TrainingPlan).name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('hrm.hrm_training_page.please_input')}
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <FormLabel htmlFor='plan-code'>计划代码</FormLabel>
                      <TextField
                        id='plan-code'
                        size='small'
                        fullWidth
                        type='text'
                        value={(formData as TrainingPlan).code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder={t('hrm.hrm_training_page.text_cc2177')}
                        disabled={!!editItem}
                      />
                    </Box>
                    <Box>
                      <FormLabel htmlFor='plan-budget'>预算</FormLabel>
                      <TextField
                        id='plan-budget'
                        size='small'
                        fullWidth
                        type='number'
                        value={(formData as TrainingPlan).budget?.toString() || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            budget: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder={t('hrm.hrm_training_page.please_input_1')}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <FormLabel htmlFor='plan-start'>开始日期 *</FormLabel>
                      <TextField
                        id='plan-start'
                        size='small'
                        fullWidth
                        type='date'
                        value={(formData as TrainingPlan).start_date || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </Box>
                    <Box>
                      <FormLabel htmlFor='plan-end'>结束日期 *</FormLabel>
                      <TextField
                        id='plan-end'
                        size='small'
                        fullWidth
                        type='date'
                        value={(formData as TrainingPlan).end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <FormLabel htmlFor='plan-description'>描述</FormLabel>
                    <TextField
                      id='plan-description'
                      size='small'
                      fullWidth
                      multiline
                      rows={3}
                      value={(formData as TrainingPlan).description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('hrm.hrm_training_page.please_input_2')}
                    />
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <FormLabel htmlFor='course-name'>课程名称 *</FormLabel>
                    <TextField
                      id='course-name'
                      size='small'
                      fullWidth
                      type='text'
                      value={(formData as TrainingCourse).name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('hrm.hrm_training_page.please_input_3')}
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <FormLabel htmlFor='course-category'>分类 *</FormLabel>
                      <FormControl
                        size='small'
                        fullWidth
                      >
                        <Select
                          value={(formData as TrainingCourse).category || ''}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          displayEmpty
                        >
                          <MenuItem
                            value=''
                            disabled
                          >
                            请选择分类
                          </MenuItem>
                          <MenuItem value='technical'>技术培训</MenuItem>
                          <MenuItem value='management'>管理培训</MenuItem>
                          <MenuItem value='soft_skill'>软技能</MenuItem>
                          <MenuItem value='onboarding'>入职培训</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormLabel htmlFor='course-level'>级别 *</FormLabel>
                      <FormControl
                        size='small'
                        fullWidth
                      >
                        <Select
                          value={(formData as TrainingCourse).level || ''}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          displayEmpty
                        >
                          <MenuItem
                            value=''
                            disabled
                          >
                            请选择级别
                          </MenuItem>
                          <MenuItem value='beginner'>入门级</MenuItem>
                          <MenuItem value='intermediate'>中级</MenuItem>
                          <MenuItem value='advanced'>高级</MenuItem>
                          <MenuItem value='expert'>专家级</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <FormLabel htmlFor='course-duration'>时长(小时)</FormLabel>
                      <TextField
                        id='course-duration'
                        size='small'
                        fullWidth
                        type='number'
                        value={(formData as TrainingCourse).duration_hours?.toString() || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_hours: parseFloat(e.target.value) || undefined,
                          })
                        }
                      />
                    </Box>
                    <Box>
                      <FormLabel htmlFor='course-participants'>最大人数</FormLabel>
                      <TextField
                        id='course-participants'
                        size='small'
                        fullWidth
                        type='number'
                        value={(formData as TrainingCourse).max_participants?.toString() || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_participants: parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </Box>
                  </Box>
                  <Box>
                    <FormLabel htmlFor='course-instructor'>讲师</FormLabel>
                    <TextField
                      id='course-instructor'
                      size='small'
                      fullWidth
                      type='text'
                      value={(formData as TrainingCourse).instructor_name || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          instructor_name: e.target.value,
                        })
                      }
                      placeholder={t('hrm.hrm_training_page.please_input_4')}
                    />
                  </Box>
                  <Box>
                    <FormLabel htmlFor='course-description'>描述</FormLabel>
                    <TextField
                      id='course-description'
                      size='small'
                      fullWidth
                      multiline
                      rows={3}
                      value={(formData as TrainingCourse).description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('hrm.hrm_training_page.please_input_5')}
                    />
                  </Box>
                  <Box>
                    <FormLabel htmlFor='course-images'>课程图片</FormLabel>
                    <Box sx={{ mt: 1 }}>
                      <ImageUpload
                        value={((formData as unknown as Record<string, unknown>).images as string[]) || []}
                        onChange={(files) => setFormData({ ...formData, images: files } as unknown as Record<string, unknown>)}
                        maxCount={9}
                        accept='image/*'
                        cropEnabled
                        height={150}
                      />
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowModal(false)}
            >
              取消
            </Button>
            <Button
              variant='contained'
              onClick={handleSave}
            >
              {editItem ? t('hrm.hrm_training_page.save_1') : t('hrm.hrm_training_page.create_1')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showRecordModal && selectedRecord && (
        <Dialog
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>培训记录详情</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    sx={{ width: 48, height: 48, bgcolor: 'primary.light', color: 'primary.dark' }}
                  >
                    {getEmployeeName(selectedRecord.employee_id).charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      {getEmployeeName(selectedRecord.employee_id)}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      员工ID: {selectedRecord.employee_id.substring(0, 8)}...
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      课程ID
                    </Typography>
                    <Typography variant='body2'>
                      {selectedRecord.course_id.substring(0, 8)}...
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      报名日期
                    </Typography>
                    <Typography variant='body2'>
                      {new Date(selectedRecord.enrollment_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      出勤状态
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        selectedRecord.attendance_status === 'attended'
                          ? t('hrm.hrm_training_page.text_b408f4')
                          : selectedRecord.attendance_status === 'absent'
                            ? t('hrm.hrm_training_page.text_10399d')
                            : t('hrm.hrm_training_page.text_a358ca')
                      }
                      color={
                        selectedRecord.attendance_status === 'attended'
                          ? 'success'
                          : selectedRecord.attendance_status === 'absent'
                            ? 'error'
                            : 'default'
                      }
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      完成状态
                    </Typography>
                    <Chip
                      size='small'
                      label={selectedRecord.completion_status === 'completed' ? t('hrm.hrm_training_page.completed_2') : t('hrm.hrm_training_page.incomplete')}
                      color={
                        selectedRecord.completion_status === 'completed' ? 'success' : 'default'
                      }
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      成绩
                    </Typography>
                    <Typography variant='body2'>
                      {selectedRecord.score ? `${selectedRecord.score}分` : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRecordModal(false)}>关闭</Button>
          </DialogActions>
        </Dialog>
      )}

      {showEnrollModal && selectedCourse && (
        <Dialog
          open={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>报名课程</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                选择员工报名参加课程: {selectedCourse.name}
              </Typography>
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>员工</InputLabel>
                <Select>
                  {employees.map((emp) => (
                    <MenuItem
                      key={emp.id}
                      value={emp.id}
                      onClick={() => handleEnroll(emp.id)}
                    >
                      {emp.name} ({emp.employee_no})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEnrollModal(false)}>取消</Button>
          </DialogActions>
        </Dialog>
      )}
    </PageContainer>
  );
};

export default HrmTrainingPage;
