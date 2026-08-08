import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Package, User, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  MenuItem,
  Button,
} from '@mui/material';

import { DataTable } from '@/components/common/DataTable';
import { PageContainer } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { limsApi } from '@/api/lims';
import type { Sample, InspectionTask, InspectionRecord } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import {
  DetailPageTemplate,
  type ColumnDef as ListColumnDef,
  type SectionConfig,
} from '@/components/templates';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

interface SampleTestRecord {
  id: string;
  step_name: string;
  inspector: string;
  result: string;
  conclusion: string;
  tested_at: string;
}

interface RawRecord extends Partial<InspectionRecord> {
  step_name?: string;
  created_at?: string;
}

interface LimsListResponse<T> {
  items?: T[];
  tasks?: T[];
  records?: T[];
}

const LimsSampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: detailData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.SAMPLE(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const [sampleRes, tasksRes] = await Promise.all([
        limsApi.getSample(id),
        limsApi.listTasksBySample(id),
      ]);

      let sample: Sample | null = null;
      if (sampleRes.success && sampleRes.data) {
        sample = sampleRes.data as Sample;
      }

      let tasks: InspectionTask[] = [];
      if (tasksRes.success && tasksRes.data) {
        const tasksData = tasksRes.data as LimsListResponse<InspectionTask> | InspectionTask[];
        tasks = Array.isArray(tasksData) ? tasksData : tasksData.items || tasksData.tasks || [];
      }

      let records: SampleTestRecord[] = [];
      for (const task of tasks) {
        const recordRes = await limsApi.listRecordsByTask(task.id);
        if (recordRes.success && recordRes.data) {
          const recordData = recordRes.data as LimsListResponse<RawRecord> | RawRecord[];
          const recordArray = Array.isArray(recordData)
            ? recordData
            : recordData.records || recordData.items || [];
          const formattedRecords = recordArray.map((r: RawRecord) => ({
            id: r.id || '',
            step_name: r.step_name || r.step_id || '',
            inspector: r.inspector || '-',
            result: r.result || '-',
            conclusion: r.conclusion || '-',
            tested_at: r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '-',
          }));
          records = [...records, ...formattedRecords];
        }
      }

      return { sample, tasks, records };
    },
    enabled: !!id,
  });

  const sample = detailData?.sample || null;
  const tasks = detailData?.tasks || [];
  const records = detailData?.records || [];

  useEffect(() => {
    if (sample) {
      setFormData({
        name: sample.name,
        description: sample.description || '',
        status: sample.status,
      });
    }
  }, [sample]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; status: string }) => {
      if (!sample) throw new Error('样品不存在');
      const response = await limsApi.updateSample(sample.id, data);
      if (!response.success) {
        throw new Error('更新失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLE(id) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
      setShowEditModal(false);
    },
    onError: (error: unknown) => {
      logger.error('更新样品失败:', error);
      addNotification({ title: '错误', message: '更新失败，请稍后重试', type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!sample) throw new Error('样品不存在');
      const response = await limsApi.deleteSample(sample.id);
      if (!response.success) {
        throw new Error('删除失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.SAMPLES });
      navigate(LIMS_PATHS.root);
    },
    onError: (error: unknown) => {
      logger.error('删除样品失败:', error);
      addNotification({ title: '错误', message: '删除失败，请稍后重试', type: 'error' });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'warning.100', color: ct.yellow[600], label: '待测试' },
      待测试: { bg: 'warning.100', color: ct.yellow[600], label: '待测试' },
      in_progress: { bg: 'primary.100', color: 'primary.dark', label: '测试中' },
      测试中: { bg: 'primary.100', color: 'primary.dark', label: '测试中' },
      completed: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      已完成: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      cancelled: { bg: 'error.lighter', color: 'error.dark', label: '已终止' },
      已终止: { bg: 'error.lighter', color: 'error.dark', label: '已终止' },
    };
    const item = statusMap[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const handleEdit = async () => {
    if (!sample) return;
    if (!formData.name.trim()) {
      addNotification({ title: '错误', message: '请输入样品名称', type: 'error' });
      return;
    }
    await updateMutation.mutateAsync(formData);
  };

  const handleDelete = async () => {
    if (!sample) return;
    if (!confirm(`确定要删除样品 "${sample.name}" 吗？`)) return;
    await deleteMutation.mutateAsync();
  };

  const getTestStatistics = () => {
    const stats = {
      total: records.length,
      passed: records.filter((r) => r.conclusion === '合格').length,
      failed: records.filter((r) => r.conclusion === '不合格').length,
      pending: records.filter((r) => r.conclusion === '待定' || r.conclusion === '-').length,
    };
    return stats;
  };

  const chartData = [
    { name: '已完成', value: records.length, fill: 'success.main' },
    {
      name: '合格',
      value: records.filter((r) => r.conclusion === '合格').length,
      fill: 'success.dark',
    },
    {
      name: '不合格',
      value: records.filter((r) => r.conclusion === '不合格').length,
      fill: 'error.main',
    },
    {
      name: '待定',
      value: records.filter((r) => r.conclusion === '待定' || r.conclusion === '-').length,
      fill: 'warning.main',
    },
  ];

  const recordColumns: ColumnDef<SampleTestRecord>[] = [
    { accessorKey: 'step_name', header: '检验步骤' },
    { accessorKey: 'inspector', header: '检验员' },
    { accessorKey: 'result', header: '检验结果' },
    { accessorKey: 'conclusion', header: '结论' },
    { accessorKey: 'tested_at', header: '检验时间' },
  ];

  const stats = getTestStatistics();

  // Sidebar - 关联检验任务
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FileText sx={{ fontSize: 20, color: 'primary.dark' }} />
        关联检验任务
      </Typography>
      {tasks.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {tasks.map((task) => (
            <Card
              key={task.id}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'grey.50' },
              }}
              onClick={() => navigate(`${LIMS_PATHS.taskDetail}?id=${task.id}`)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                      {task.task_no}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {task.sample_name || '样品检验'}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      task.status === 'completed' || task.status === '已完成'
                        ? '已完成'
                        : task.status === 'in_progress' || task.status === '进行中'
                          ? '进行中'
                          : '待处理'
                    }
                    size='small'
                    sx={{
                      backgroundColor:
                        task.status === 'completed' || task.status === '已完成'
                          ? 'success.lighter'
                          : task.status === 'in_progress' || task.status === '进行中'
                            ? 'primary.100'
                            : 'warning.100',
                      color:
                        task.status === 'completed' || task.status === '已完成'
                          ? 'success.dark'
                          : task.status === 'in_progress' || task.status === '进行中'
                            ? 'primary.dark'
                            : ct.yellow[600],
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <User sx={{ width: 12, height: 12 }} />
                    {task.inspector || '-'}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock sx={{ width: 12, height: 12 }} />
                    {task.created_at ? dayjs(task.created_at).format('YYYY-MM-DD') : '-'}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <FileText sx={{ width: 48, height: 48, opacity: 0.5, mx: 'auto', mb: 1 }} />
          <Typography variant='body2'>暂无检验任务</Typography>
        </Box>
      )}
    </Box>
  );

  // Sections - 检验统计
  const sections: SectionConfig[] = [
    {
      id: 'statistics',
      title: '检验统计',
      content: (
        <Box>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={chartData}
                layout='vertical'
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis type='number' />
                <YAxis
                  type='category'
                  dataKey='name'
                  width={60}
                />
                <Tooltip
                  formatter={(value: unknown) => [`${value} 条`, '数量']}
                  contentStyle={{
                    backgroundColor: 'common.white',
                    border: '1px solid border.default',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey='value'
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              mt: 2,
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 3,
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'grey.900' }}>
                {stats.total}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mt: 0.5 }}
              >
                检验总数
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 3,
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'success.dark' }}>
                {stats.passed}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'success.dark', mt: 0.5 }}
              >
                合格
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'error.light',
                borderRadius: 3,
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'error.dark' }}>
                {stats.failed}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'error.dark', mt: 0.5 }}
              >
                不合格
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: ct.yellow[600] }}>
                {stats.pending}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: ct.yellow[600], mt: 0.5 }}
              >
                待定
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      id: 'records',
      title: '检验记录',
      content: (
        <Box>
          {records.length > 0 ? (
            <DataTable
              columns={recordColumns}
              data={records}
              enablePagination={false}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <CheckCircle sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
              <Typography>暂无检验记录</Typography>
            </Box>
          )}
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `4px solid ${ct.purple[200]}`,
              borderTop: `4px solid ${ct.purple[600]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          ></div>
          <p style={{ color: ct.grey[600] }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!sample) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, grey.100 100%)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <AlertCircle
            sx={{
              width: 64,
              height: 64,
              color: 'error.main',
              margin: '0 auto 16px auto',
            }}
          />
          <p style={{ color: ct.grey[600] }}>样品不存在或已被删除</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.root)}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={sample?.name || sample?.sample_no || sample?.id || '样品详情'}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '样品详情' },
        ]}
        backHref={LIMS_PATHS.root}
        loading={loading}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        infoCard={{
          avatar: <Package sx={{ fontSize: 40, color: 'secondary.main' }} />,
          title: sample.name,
          subtitle: sample.sample_no || sample.id,
          tags: [sample.status],
          stats: [
            { label: '关联任务', value: tasks.length },
            { label: '检验记录', value: records.length },
          ],
        }}
        sidebar={sidebarContent}
        sections={sections}
      >
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>编辑样品信息</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='样品名称 *'
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                size='small'
                placeholder='请输入样品名称'
              />
              <TextField
                label='描述'
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                fullWidth
                multiline
                rows={3}
                placeholder='请输入样品描述'
              />
              <TextField
                select
                label='状态'
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                fullWidth
                size='small'
              >
                <MenuItem value='待测试'>待测试</MenuItem>
                <MenuItem value='测试中'>测试中</MenuItem>
                <MenuItem value='已完成'>已完成</MenuItem>
                <MenuItem value='已终止'>已终止</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowEditModal(false)}
            >
              取消
            </Button>
            <Button
              variant='contained'
              onClick={handleEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>添加检验记录</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='检验步骤'
                fullWidth
                size='small'
                placeholder='请输入检验步骤名称'
              />
              <TextField
                label='检验员'
                fullWidth
                size='small'
                placeholder='请输入检验员姓名'
              />
              <TextField
                label='检验结果'
                fullWidth
                multiline
                rows={3}
                placeholder='请输入检验结果'
              />
              <TextField
                select
                label='结论'
                fullWidth
                size='small'
              >
                <MenuItem value='合格'>合格</MenuItem>
                <MenuItem value='不合格'>不合格</MenuItem>
                <MenuItem value='待定'>待定</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowRecordModal(false)}
            >
              取消
            </Button>
            <Button
              variant='contained'
              onClick={() => setShowRecordModal(false)}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </DetailPageTemplate>
    </PageContainer>
  );
};

export default LimsSampleDetailPage;
