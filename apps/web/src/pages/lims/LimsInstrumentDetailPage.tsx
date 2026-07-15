import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Settings,
  Wrench,
  Clock,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Card,
  CardContent,
  Stack,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Skeleton,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  DetailPageTemplate,
  ListPageTemplate,
  type SectionConfig,
  type ColumnDef,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { Instrument, CalibrationRecord, MaintenanceRecord, InspectionTask } from '@/api/lims';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import dayjs from 'dayjs';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
  records?: T[];
  tasks?: T[];
  instruments?: T[];
}

interface UsageLog {
  id: string;
  time?: string;
  user?: string;
  task?: string;
  purpose?: string;
  notes?: string;
}

const LimsInstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    data: detailData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.LIMS.INSTRUMENT(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const [instrumentRes, calibrationRes, maintenanceRes, tasksRes] = await Promise.all([
        limsApi.getInstrument(id),
        limsApi.listCalibrationRecords(id),
        limsApi.listMaintenanceByInstrument(id),
        limsApi.listTasks().catch(() => null),
      ]);

      let instrument: Instrument | null = null;
      let error: string | null = null;
      if (instrumentRes.success && instrumentRes.data) {
        instrument = instrumentRes.data as Instrument;
      } else {
        error = '仪器不存在或已被删除';
      }

      let calibrationRecords: CalibrationRecord[] = [];
      if (calibrationRes.success && calibrationRes.data) {
        const data = calibrationRes.data as
          LimsListResponse<CalibrationRecord> | CalibrationRecord[];
        calibrationRecords = Array.isArray(data) ? data : data.items || data.records || [];
      }

      let maintenanceRecords: MaintenanceRecord[] = [];
      if (maintenanceRes.success && maintenanceRes.data) {
        const data = maintenanceRes.data as
          LimsListResponse<MaintenanceRecord> | MaintenanceRecord[];
        maintenanceRecords = Array.isArray(data) ? data : data.items || [];
      }

      let relatedTasks: InspectionTask[] = [];
      if (tasksRes?.success && tasksRes.data) {
        const tasksData = tasksRes.data as LimsListResponse<InspectionTask> | InspectionTask[];
        const allTasks = Array.isArray(tasksData)
          ? tasksData
          : tasksData.items || tasksData.tasks || [];
        relatedTasks = allTasks.slice(0, 5);
      }

      return { instrument, calibrationRecords, maintenanceRecords, relatedTasks, error };
    },
    enabled: !!id,
  });

  const instrument = detailData?.instrument || null;
  const calibrationRecords = detailData?.calibrationRecords || [];
  const maintenanceRecords = detailData?.maintenanceRecords || [];
  const relatedTasks = detailData?.relatedTasks || [];
  const usageLogs: UsageLog[] = [];
  const error = queryError ? '加载仪器详情失败' : detailData?.error || null;

  const loadInstrumentData = () => {
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      正常: { bg: 'success.lighter', color: 'success.700' },
      校准中: { bg: 'primary.100', color: 'primary.dark' },
      维修中: { bg: ct.error[50], color: 'error.700' },
      停用: { bg: 'grey.100', color: 'grey.600' },
      报废: { bg: 'grey.100', color: 'grey.600' },
      normal: { bg: 'success.lighter', color: 'success.700' },
      calibration: { bg: 'primary.100', color: 'primary.dark' },
      maintenance: { bg: ct.error[50], color: 'error.700' },
      disabled: { bg: 'grey.100', color: 'grey.600' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: ct.grey[600] };
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

  const getUsageDays = (): number => {
    if (!instrument) return 0;
    const created = instrument.purchase_date || instrument.created_at;
    if (!created) return 0;
    return dayjs().diff(dayjs(created), 'day');
  };

  // calibration columns
  const calibrationColumns: ColumnDef<CalibrationRecord>[] = [
    {
      id: 'calibration_date',
      label: '校准日期',
      render: (row) => new Date(row.calibration_date).toLocaleDateString('zh-CN'),
    },
    { id: 'calibration_type', label: '校准类型' },
    { id: 'result', label: '校准结果' },
    { id: 'certificate_no', label: '证书编号', render: (row) => row.certificate_no || '-' },
    { id: 'performed_by', label: '校准人' },
    {
      id: 'next_calibration_date',
      label: '下次校准',
      render: (row) =>
        row.next_calibration_date
          ? new Date(row.next_calibration_date).toLocaleDateString('zh-CN')
          : '-',
    },
  ];

  // maintenance columns
  const maintenanceColumns: ColumnDef<MaintenanceRecord>[] = [
    {
      id: 'performed_at',
      label: '维护日期',
      render: (row) => new Date(row.performed_at).toLocaleDateString('zh-CN'),
    },
    { id: 'maintenance_type', label: '维护类型' },
    { id: 'description', label: '维护描述' },
    { id: 'performed_by', label: '执行人' },
    {
      id: 'next_maintenance_date',
      label: '下次维护',
      render: (row) =>
        row.next_maintenance_date
          ? new Date(row.next_maintenance_date).toLocaleDateString('zh-CN')
          : '-',
    },
    { id: 'cost', label: '费用', render: (row) => (row.cost ? `¥${row.cost}` : '-') },
  ];

  // Sidebar content - Related inspection tasks
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FileText sx={{ fontSize: 20, color: 'primary.dark' }} />
        相关检验任务
      </Typography>
      {relatedTasks.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {relatedTasks.map((task) => (
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
                    <Typography sx={{ fontWeight: 500, color: 'grey.900', fontSize: '0.875rem' }}>
                      {task.task_no || task.id}
                    </Typography>
                  </Box>
                  <Chip
                    label={task.status || '待处理'}
                    size='small'
                    sx={{
                      backgroundColor:
                        task.status === '已完成' || task.status === 'completed'
                          ? 'success.lighter'
                          : task.status === '进行中' || task.status === 'in_progress'
                            ? 'primary.100'
                            : 'warning.100',
                      color:
                        task.status === '已完成' || task.status === 'completed'
                          ? 'success.dark'
                          : task.status === '进行中' || task.status === 'in_progress'
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
                    <Eye sx={{ width: 12, height: 12 }} />
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
          <Typography variant='body2'>暂无相关检验任务</Typography>
        </Box>
      )}
    </Box>
  );

  // Sections for tabs
  const sections: SectionConfig[] = [
    {
      id: 'basic',
      title: '基本信息',
      content: instrument ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2.5,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1.5,
          }}
        >
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              仪器名称
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.name}</Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              仪器编号
            </Typography>
            <Typography sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
              {instrument.code}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              型号
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.model || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              序列号
            </Typography>
            <Typography sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
              {instrument.serial_number || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              类型
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.type || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              制造商
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.manufacturer || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              存放位置
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.location || '-'}</Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              负责人
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {instrument.responsible_person || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              状态
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(instrument.status)}</Box>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              购买日期
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {instrument.purchase_date
                ? new Date(instrument.purchase_date).toLocaleDateString('zh-CN')
                : '-'}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              上次校准日期
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>
              {instrument.calibration_date
                ? new Date(instrument.calibration_date).toLocaleDateString('zh-CN')
                : '-'}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              下次校准日期
            </Typography>
            <Typography
              sx={{
                fontWeight: 'medium',
                color: instrument.next_calibration_date ? 'warning.600' : 'text.primary',
              }}
            >
              {instrument.next_calibration_date
                ? new Date(instrument.next_calibration_date).toLocaleDateString('zh-CN')
                : '-'}
            </Typography>
          </Box>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              描述
            </Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{instrument.description || '-'}</Typography>
          </Box>
        </Box>
      ) : null,
    },
    {
      id: 'calibration',
      title: '校准记录',
      content: (
        <Box>
          {calibrationRecords.length > 0 ? (
            <ListPageTemplate
              title=''
              columns={calibrationColumns}
              data={calibrationRecords}
              loading={false}
              getRowId={(row) => row.id}
              pagination={{
                page: 0,
                pageSize: 10,
                total: calibrationRecords.length,
                onPageChange: () => {},
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <CheckCircle sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
              <Typography>暂无校准记录</Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      id: 'maintenance',
      title: '维护保养',
      content: (
        <Box>
          {maintenanceRecords.length > 0 ? (
            <ListPageTemplate
              title=''
              columns={maintenanceColumns}
              data={maintenanceRecords}
              loading={false}
              getRowId={(row) => row.id}
              pagination={{
                page: 0,
                pageSize: 10,
                total: maintenanceRecords.length,
                onPageChange: () => {},
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Wrench sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
              <Typography>暂无维护保养记录</Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      id: 'usage',
      title: '使用日志',
      content: (
        <Box>
          {usageLogs.length > 0 ? (
            <TableContainer
              component={Paper}
              variant='outlined'
              sx={{ borderRadius: 1.5 }}
            >
              <Table size='small'>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>使用时间</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>使用人</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>关联任务</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>用途</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.time || '-'}</TableCell>
                      <TableCell>{log.user || '-'}</TableCell>
                      <TableCell>{log.task || '-'}</TableCell>
                      <TableCell>{log.purpose || '-'}</TableCell>
                      <TableCell>{log.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Clock sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
              <Typography>暂无使用日志</Typography>
            </Box>
          )}
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.teal[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'info.main',
              borderTopColor: 'cyan.dark',
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

  if (error || !instrument) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.teal[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle
            sx={{
              width: 64,
              height: 64,
              color: 'error.main',
              margin: '0 auto 16px auto',
            }}
          />
          <p style={{ color: ct.grey[600] }}>{error || '仪器不存在或已被删除'}</p>
          <Button
            onClick={() => navigate(LIMS_PATHS.instrument)}
            sx={{ mt: 2 }}
          >
            返回仪器列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Settings style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: '仪器管理', href: LIMS_PATHS.instrument },
          { label: '仪器详情' },
        ]}
        backHref={LIMS_PATHS.instrument}
        loading={loading}
        onRefresh={loadInstrumentData}
        infoCard={{
          avatar: <Settings sx={{ fontSize: 40, color: 'cyan.dark' }} />,
          title: instrument.name,
          subtitle: instrument.code,
          tags: [instrument.status, instrument.type].filter(Boolean),
          stats: [
            { label: '校准次数', value: calibrationRecords.length },
            { label: '维护次数', value: maintenanceRecords.length },
            { label: '使用天数', value: getUsageDays() },
          ],
        }}
        sidebar={sidebarContent}
        sections={sections}
      />
    </PageContainer>
  );
};

export default LimsInstrumentDetailPage;
