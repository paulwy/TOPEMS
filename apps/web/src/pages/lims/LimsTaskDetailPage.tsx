import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Package,
  User,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Play,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  MenuItem,
  Button,
} from '@mui/material';

import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { limsApi } from '@/api/lims';
import type { InspectionTask, InspectionRecord, InspectionProcess } from '@/api/lims';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';

interface TaskRecord extends InspectionRecord {
  step_name: string;
}

const LimsTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<InspectionTask | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [process, setProcess] = useState<InspectionProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    step_name: '',
    result: '',
    conclusion: '',
    inspector: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    if (id) {
      loadTaskDetail(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTaskDetail = async (taskId: string) => {
    try {
      setLoading(true);
      const [taskRes, recordRes, processRes] = await Promise.all([
        limsApi.getTask(taskId),
        limsApi.listRecordsByTask(taskId),
        limsApi.listProcesses(),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data as InspectionTask);
      }

      if (recordRes.success && recordRes.data) {
        const recordData = recordRes.data as any;
        const recordArray = Array.isArray(recordData) ? recordData : recordData.records || [];
        const formattedRecords = recordArray.map((r: any) => ({
          ...r,
          step_name: r.step_name || r.step_id || `步骤 ${r.step_index}`,
        }));
        setRecords(formattedRecords);
      }

      if (processRes.success && processRes.data && task) {
        const processData = processRes.data as any;
        const processArray = Array.isArray(processData) ? processData : processData.processes || [];
        const matchedProcess = processArray.find((p: any) => p.id === task.process_id);
        if (matchedProcess) {
          setProcess(matchedProcess);
        }
      }
    } catch (error: unknown) {
      apiLogger.error('加载任务详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!task) return;
    if (!recordForm.step_name.trim()) {
      addNotification({
        title: '错误',
        message: '请输入检验步骤名称',
        type: 'error',
      });
      return;
    }
    if (!recordForm.result.trim()) {
      addNotification({
        title: '错误',
        message: '请输入检验结果',
        type: 'error',
      });
      return;
    }
    if (!recordForm.inspector.trim()) {
      addNotification({
        title: '错误',
        message: '请输入检验员姓名',
        type: 'error',
      });
      return;
    }
    try {
      const response = await limsApi.completeStep(task.id, {
        step_id: '',
        step_name: recordForm.step_name,
        result: recordForm.result,
        conclusion: recordForm.conclusion,
        inspector: recordForm.inspector,
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '检验步骤完成成功',
          type: 'success',
        });
        setShowRecordModal(false);
        loadTaskDetail(task.id);
      } else {
        addNotification({
          title: '错误',
          message: response.message || '操作失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('完成步骤失败:', error);
      addNotification({
        title: '错误',
        message: '完成检验步骤失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const recordColumns: ColumnDef<TaskRecord>[] = [
    { accessorKey: 'step_name', header: '检验步骤' },
    { accessorKey: 'inspector', header: '检验员' },
    { accessorKey: 'result', header: '检验结果' },
    { accessorKey: 'conclusion', header: '结论' },
    {
      accessorKey: 'created_at',
      header: '检验时间',
      cell: ({ row }) => (
        <span>
          {row.original.created_at
            ? new Date(row.original.created_at).toLocaleString('zh-CN')
            : '-'}
        </span>
      ),
    },
  ];

  const totalSteps = process?.steps?.length || 0;
  const completedSteps = records.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Sidebar - 检验进度
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardHeader sx={{ pb: 1 }}>
          <Typography
            variant='h6'
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              component={CheckCircle}
              sx={{ fontSize: 20, color: 'success.dark' }}
            />
            检验进度
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
              }}
            >
              <span style={{ color: '#475569' }}>完成进度</span>
              <span style={{ fontWeight: 500, color: 'grey.900' }}>
                {completedSteps} / {totalSteps} 步骤
              </span>
            </Box>
            <Box
              sx={{
                height: 12,
                backgroundColor: 'border.default',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  background: 'linear-gradient(to right, #a855f7, #ec4899)',
                  width: `${progressPercent}%`,
                  transition: 'all 0.3s',
                }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: '#9333ea',
                }}
              >
                {Math.round(progressPercent)}%
              </Typography>
            </Box>
            {process?.steps && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  mt: 2,
                }}
              >
                {process.steps.map((step, index) => {
                  const isCompleted = index < completedSteps;
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: isCompleted ? 'success.light' : 'grey.50',
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          bgcolor: isCompleted ? 'success.dark' : 'grey.400',
                          color: isCompleted ? 'white' : '#475569',
                        }}
                      >
                        {isCompleted ? <CheckCircle sx={{ width: 16, height: 16 }} /> : index + 1}
                      </Box>
                      <Typography
                        sx={{
                          color: isCompleted ? '#15803d' : '#475569',
                          fontSize: '0.875rem',
                        }}
                      >
                        {step.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  // Sections - 检验记录
  const sections: SectionConfig[] = [
    {
      id: 'records',
      title: '检验记录列表',
      content: (
        <Box>
          {records.length > 0 ? (
            <DataTable
              columns={recordColumns}
              data={records}
              enablePagination={false}
            />
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: 'text.secondary',
              }}
            >
              <FileText
                sx={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 16px auto',
                  opacity: 0.5,
                }}
              />
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
          background: 'linear-gradient(135deg, #f8fafc 0%, grey.100 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #e9d5ff',
              borderTop: '4px solid #9333ea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          ></div>
          <p style={{ color: '#475569' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, grey.100 100%)',
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
          <p style={{ color: '#475569' }}>检验任务不存在或已被删除</p>
          <Button
            onClick={() => navigate('/lims')}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef9c3', color: '#ca8a04', label: '待测试' },
      待测试: { bg: '#fef9c3', color: '#ca8a04', label: '待测试' },
      in_progress: { bg: '#dbeafe', color: 'primary.dark', label: '进行中' },
      进行中: { bg: '#dbeafe', color: 'primary.dark', label: '进行中' },
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

  const isTaskCompleted = task.status === 'completed' || task.status === '已完成';

  return (
    <PageContainer
      title='检验任务详情'
      subtitle='Inspection Task Detail'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS', href: '/lims' },
          { label: '任务详情' },
        ]}
        backHref='/lims'
        loading={loading}
        infoCard={{
          avatar: <ClipboardCheck sx={{ fontSize: 40, color: 'secondary.dark' }} />,
          title: task.task_no || task.id,
          subtitle: task.sample_name || '未关联样品',
          tags: [task.status],
          stats: [
            { label: '当前步骤', value: `${completedSteps}/${totalSteps}` },
            { label: '完成率', value: `${Math.round(progressPercent)}%` },
          ],
        }}
        sidebar={sidebarContent}
        sections={sections}
        actions={
          isTaskCompleted
            ? []
            : [
                {
                  label: '添加记录',
                  icon: <Plus style={{ width: 18, height: 18 }} />,
                  onClick: () => setShowRecordModal(true),
                  variant: 'outlined',
                },
                {
                  label: '完成任务',
                  icon: <Play style={{ width: 18, height: 18 }} />,
                  onClick: () => setShowCompleteModal(true),
                  variant: 'contained',
                  color: 'success',
                },
              ]
        }
      >
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
                label='检验步骤 *'
                value={recordForm.step_name}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    step_name: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder='请输入检验步骤名称'
              />
              <TextField
                label='检验员 *'
                value={recordForm.inspector}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    inspector: e.target.value,
                  }))
                }
                fullWidth
                size='small'
                placeholder='请输入检验员姓名'
              />
              <TextField
                label='检验结果 *'
                value={recordForm.result}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, result: e.target.value }))}
                fullWidth
                multiline
                rows={4}
                placeholder='请详细描述检验结果...'
              />
              <TextField
                select
                label='结论'
                value={recordForm.conclusion}
                onChange={(e) =>
                  setRecordForm((prev) => ({
                    ...prev,
                    conclusion: e.target.value,
                  }))
                }
                fullWidth
                size='small'
              >
                <MenuItem value=''>请选择结论</MenuItem>
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
              onClick={handleCompleteStep}
            >
              保存记录
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>完成检验任务</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography sx={{ color: 'text.secondary' }}>
                确定要完成此检验任务吗？这将标记所有未完成的步骤为已完成状态。
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: 'warning.lighter',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: '#854d0e',
                }}
              >
                <AlertCircle sx={{ width: 20, height: 20 }} />
                <span style={{ fontSize: '0.875rem' }}>任务编号: {task.task_no || task.id}</span>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowCompleteModal(false)}
            >
              取消
            </Button>
            <Button
              variant='contained'
              onClick={() => setShowCompleteModal(false)}
              sx={{
                backgroundColor: 'success.dark',
                '&:hover': { backgroundColor: '#15803d' },
              }}
            >
              确认完成
            </Button>
          </DialogActions>
        </Dialog>
      </DetailPageTemplate>
    </PageContainer>
  );
};

export default LimsTaskDetailPage;
