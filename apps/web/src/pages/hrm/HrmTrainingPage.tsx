import React, { useState, useEffect, useCallback } from 'react';
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
import { useAppStore } from '../../store';
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

const HrmTrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<'plans' | 'courses' | 'records'>('plans');
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editItem, setEditItem] = useState<TrainingPlan | TrainingCourse | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingPlan | TrainingCourse>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'plans': {
          const planRes = await trainingPlanApi.list({ pagesize: 100 });
          if (planRes.code === 200) {
            setPlans(planRes.data?.items || []);
          }
          break;
        }
        case 'courses': {
          const courseRes = await trainingCourseApi.list({ pagesize: 100 });
          if (courseRes.code === 200) {
            setCourses(courseRes.data?.items || []);
          }
          break;
        }
        case 'records': {
          const recordRes = await trainingRecordApi.list({ pagesize: 100 });
          if (recordRes.code === 200) {
            setRecords(recordRes.data?.items || []);
          }
          break;
        }
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load data:', err);
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, addNotification]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await employeeApi.list({ pagesize: 200 });
      if (res.code === 200) {
        setEmployees(res.data?.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load employees:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [activeTab]);

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

  const handleSave = useCallback(async () => {
    try {
      let response;
      if (editItem) {
        if (activeTab === 'plans') {
          response = await trainingPlanApi.update(editItem.id, formData);
        } else {
          response = await trainingCourseApi.update(editItem.id, formData);
        }
      } else {
        if (activeTab === 'plans') {
          response = await trainingPlanApi.create(formData);
        } else {
          response = await trainingCourseApi.create(formData);
        }
      }

      if (response.code === 200) {
        addNotification({
          title: '成功',
          message: editItem ? '更新成功' : '创建成功',
          type: 'success',
        });
        setShowModal(false);
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to save:', err);
      addNotification({ title: '失败', message: '保存失败', type: 'error' });
    }
  }, [editItem, formData, activeTab, addNotification, loadData]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        let response;
        if (activeTab === 'plans') {
          response = await trainingPlanApi.delete(id);
        } else if (activeTab === 'courses') {
          response = await trainingCourseApi.delete(id);
        } else {
          response = await trainingRecordApi.delete(id);
        }

        if (response.code === 200) {
          addNotification({ title: '成功', message: '删除成功', type: 'success' });
          loadData();
        }
      } catch (err: unknown) {
        apiLogger.error('Failed to delete:', err);
        addNotification({ title: '失败', message: '删除失败', type: 'error' });
      }
    },
    [activeTab, addNotification, loadData]
  );

  const handleStatusChange = useCallback(
    async (id: string, activate: boolean) => {
      try {
        const response = await (activate
          ? trainingPlanApi.activate(id)
          : trainingPlanApi.deactivate(id));
        if (response.code === 200) {
          addNotification({
            title: '成功',
            message: activate ? '已启用' : '已停用',
            type: 'success',
          });
          loadData();
        }
      } catch (err: unknown) {
        apiLogger.error('Failed to update status:', err);
        addNotification({ title: '失败', message: '操作失败', type: 'error' });
      }
    },
    [addNotification, loadData]
  );

  const handleEnroll = useCallback(
    async (employeeId: string) => {
      if (!selectedCourse) return;

      try {
        const response = await trainingRecordApi.enroll(selectedCourse.id, employeeId);
        if (response.code === 200) {
          addNotification({ title: '成功', message: '报名成功', type: 'success' });
          setShowEnrollModal(false);
          setSelectedCourse(null);
          loadData();
        }
      } catch (err: unknown) {
        apiLogger.error('Failed to enroll:', err);
        addNotification({ title: '失败', message: '报名失败', type: 'error' });
      }
    },
    [selectedCourse, addNotification, loadData]
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
      title: '培训计划数',
      value: plans.length,
      icon: <Calendar size={20} />,
      color: 'primary',
    },
    {
      id: 'activeCourses',
      title: '进行中课程',
      value: courses.filter((c) => c.status === 'active').length,
      icon: <BookOpen size={20} />,
      color: 'warning',
    },
    {
      id: 'completedRecords',
      title: '已完成培训',
      value: records.filter((r) => r.completion_status === 'completed').length,
      icon: <CheckCircle size={20} />,
      color: 'success',
    },
    {
      id: 'avgCompletionRate',
      title: '平均完成率',
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
      label: '计划名称',
      width: 200,
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.name}</Typography>
      ),
    },
    {
      id: 'code',
      label: '代码',
      width: 120,
    },
    {
      id: 'dates',
      label: '时间安排',
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
      label: '预算',
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
      label: '状态',
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.status === 'active' ? '进行中' : '已结束'}
          color={row.status === 'active' ? 'primary' : 'default'}
        />
      ),
    },
  ];

  const planActions: RowAction<TrainingPlan>[] = [
    {
      label: '编辑',
      icon: <Edit2 size={16} />,
      onClick: (row) => handleOpenModal(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: '确定要删除这个培训计划吗？',
    },
  ];

  const courseColumns: ColumnDef<TrainingCourse>[] = [
    {
      id: 'name',
      label: '课程名称',
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
              {row.code || '未设置代码'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'category',
      label: '分类',
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
      label: '级别',
      width: 100,
    },
    {
      id: 'duration',
      label: '时长',
      width: 100,
      render: (row) => (
        <Typography variant='body2'>
          {row.duration_hours ? `${row.duration_hours}小时` : '-'}
        </Typography>
      ),
    },
    {
      id: 'instructor',
      label: '讲师',
      width: 120,
      render: (row) => <Typography variant='body2'>{row.instructor_name || '-'}</Typography>,
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.status === 'active' ? '开放报名' : '已关闭'}
          color={row.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
  ];

  const courseActions: RowAction<TrainingCourse>[] = [
    {
      label: '编辑',
      icon: <Edit2 size={16} />,
      onClick: (row) => handleOpenModal(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: '确定要删除这个课程吗？',
    },
    {
      label: '报名',
      icon: <UserPlus size={16} />,
      onClick: (row) => handleOpenEnrollModal(row),
      color: 'success',
      show: (row) => row.status === 'active',
    },
  ];

  const recordColumns: ColumnDef<TrainingRecord>[] = [
    {
      id: 'employee',
      label: '员工',
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
      label: '课程',
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
      label: '报名日期',
      width: 120,
      render: (row) => (
        <Typography variant='body2'>
          {new Date(row.enrollment_date).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      id: 'attendance',
      label: '出勤状态',
      width: 100,
      render: (row) => {
        const status = row.attendance_status;
        return (
          <Chip
            size='small'
            label={status === 'attended' ? '已出勤' : status === 'absent' ? '缺勤' : '未考勤'}
            color={status === 'attended' ? 'success' : status === 'absent' ? 'error' : 'default'}
            variant={status === 'pending' ? 'outlined' : 'filled'}
          />
        );
      },
    },
    {
      id: 'completion',
      label: '完成状态',
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={row.completion_status === 'completed' ? '已完成' : '未完成'}
          color={row.completion_status === 'completed' ? 'success' : 'default'}
          variant={row.completion_status === 'completed' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      id: 'score',
      label: '成绩',
      width: 100,
      render: (row) => (
        <Typography variant='body2'>{row.score ? `${row.score}分` : '-'}</Typography>
      ),
    },
  ];

  const recordActions: RowAction<TrainingRecord>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => handleViewRecord(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      onClick: (row) => handleDelete(row.id),
      color: 'error',
      confirm: true,
      confirmMessage: '确定要删除这个培训记录吗？',
    },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <StatsPageTemplate
        title='培训管理'
        subtitle='管理培训计划、课程和培训记录'
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
          title='培训计划'
          subtitle='管理企业培训计划'
          columns={planColumns}
          data={filteredPlans}
          loading={loading}
          rowActions={planActions}
          searchable
          searchPlaceholder='搜索培训计划...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          actions={[
            {
              label: '新增计划',
              icon: <Plus size={16} />,
              onClick: () => handleOpenModal(),
              variant: 'contained',
            },
          ]}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'courses' && (
        <ListPageTemplate<TrainingCourse>
          title='培训课程'
          subtitle='管理培训课程信息'
          columns={courseColumns}
          data={filteredCourses}
          loading={loading}
          rowActions={courseActions}
          searchable
          searchPlaceholder='搜索课程...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          actions={[
            {
              label: '新增课程',
              icon: <Plus size={16} />,
              onClick: () => handleOpenModal(),
              variant: 'contained',
            },
          ]}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'records' && (
        <ListPageTemplate<TrainingRecord>
          title='培训记录'
          subtitle='查看员工培训记录'
          columns={recordColumns}
          data={filteredRecords}
          loading={loading}
          rowActions={recordActions}
          searchable
          searchPlaceholder='搜索员工...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          onRefresh={loadData}
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
            {editItem ? '编辑' : '新增'}
            {activeTab === 'plans' ? '培训计划' : '培训课程'}
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
                      placeholder='请输入计划名称'
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
                        placeholder='自动生成'
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
                        placeholder='请输入预算金额'
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
                      placeholder='请输入计划描述'
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
                      placeholder='请输入课程名称'
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
                      placeholder='请输入讲师姓名'
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
                      placeholder='请输入课程描述'
                    />
                  </Box>
                  <Box>
                    <FormLabel htmlFor='course-images'>课程图片</FormLabel>
                    <Box sx={{ mt: 1 }}>
                      <ImageUpload
                        value={(formData as any).images || []}
                        onChange={(files) => setFormData({ ...formData, images: files } as any)}
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
              {editItem ? '保存' : '创建'}
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
              <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
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
                          ? '已出勤'
                          : selectedRecord.attendance_status === 'absent'
                            ? '缺勤'
                            : '未考勤'
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
                      label={selectedRecord.completion_status === 'completed' ? '已完成' : '未完成'}
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
