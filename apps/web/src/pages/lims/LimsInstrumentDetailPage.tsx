import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Settings, Wrench, Clock, Eye, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { Instrument, CalibrationRecord, MaintenanceRecord, InspectionTask } from '@/api/lims';
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
const statusColorMap: Record<string, { bg: string; color: string }> = {
  [i18n.t('pages.lims_instrument_detail_page.k0')]: { bg: 'success.lighter', color: 'success.700' },
  [i18n.t('pages.lims_instrument_detail_page.k1')]: { bg: 'primary.100', color: 'primary.dark' },
  [i18n.t('pages.lims_instrument_detail_page.k2')]: { bg: ct.error[50], color: 'error.700' },
  [i18n.t('pages.lims_instrument_detail_page.k3')]: { bg: 'grey.100', color: 'grey.600' },
  [i18n.t('pages.lims_instrument_detail_page.k4')]: { bg: 'grey.100', color: 'grey.600' },
  normal: { bg: 'success.lighter', color: 'success.700' },
  calibration: { bg: 'primary.100', color: 'primary.dark' },
  maintenance: { bg: ct.error[50], color: 'error.700' },
  disabled: { bg: 'grey.100', color: 'grey.600' },
};
function getStatusBadge(status: string) {
  const colors = statusColorMap[status] || { bg: 'grey.100', color: ct.grey[600] };
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
}
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
function SimpleTable<T extends { id: string }>({
  columns,
  data,
  emptyIcon,
  emptyText,
}: {
  columns: { id: string; label: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  emptyIcon: React.ReactNode;
  emptyText: string;
}) {
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Box sx={{ opacity: 0.5, mb: 2 }}>{emptyIcon}</Box>
        <Typography>{emptyText}</Typography>
      </Box>
    );
  }
  return (
    <TableContainer
      component={Paper}
      variant='outlined'
      sx={{ borderRadius: 1.5 }}
    >
      <Table size='small'>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                sx={{ fontWeight: 600 }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {columns.map((col) => (
                <TableCell key={col.id}>
                  {col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.id] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
function InfoGrid({ instrument }: { instrument: Instrument }) {
  const fields = [
    { label: i18n.t('lims.lims_instrument_detail_page.k0'), value: instrument.name },
    { label: i18n.t('lims.lims_instrument_detail_page.k1'), value: instrument.code, mono: true },
    { label: i18n.t('lims.lims_instrument_detail_page.k2'), value: instrument.model },
    {
      label: i18n.t('lims.lims_instrument_detail_page.k3'),
      value: instrument.serial_number,
      mono: true,
    },
    { label: i18n.t('lims.lims_instrument_detail_page.k4'), value: instrument.type },
    { label: i18n.t('lims.lims_instrument_detail_page.k5'), value: instrument.manufacturer },
    { label: i18n.t('lims.lims_instrument_detail_page.k6'), value: instrument.location },
    { label: i18n.t('lims.lims_instrument_detail_page.k7'), value: instrument.responsible_person },
    {
      label: i18n.t('lims.lims_instrument_detail_page.k8'),
      value: instrument.status,
      isStatus: true,
    },
    {
      label: i18n.t('lims.lims_instrument_detail_page.k9'),
      value: formatDate(instrument.purchase_date),
    },
    {
      label: i18n.t('lims.lims_instrument_detail_page.k10'),
      value: formatDate(instrument.calibration_date),
    },
    {
      label: i18n.t('lims.lims_instrument_detail_page.k11'),
      value: formatDate(instrument.next_calibration_date),
      isNextCal: true,
    },
  ];
  return (
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
      {fields.map((field) => (
        <Box key={field.label}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 0.5 }}
          >
            {field.label}
          </Typography>
          {field.isStatus ? (
            <Box sx={{ mt: 0.5 }}>{getStatusBadge(field.value || '')}</Box>
          ) : (
            <Typography
              sx={{
                fontWeight: 'medium',
                fontFamily: field.mono ? 'monospace' : undefined,
                color: field.isNextCal && field.value !== '-' ? 'warning.600' : undefined,
              }}
            >
              {field.value || '-'}
            </Typography>
          )}
        </Box>
      ))}
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 0.5 }}
        >
          {i18n.t('pages.lims_instrument_detail_page.k5')}
        </Typography>
        <Typography sx={{ fontWeight: 'medium' }}>{instrument.description || '-'}</Typography>
      </Box>
    </Box>
  );
}
function SidebarTasks({
  tasks,
  navigate,
}: {
  tasks: InspectionTask[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const taskStatusColor = (status: string) => {
    if (status === i18n.t('lims.lims_instrument_detail_page.k12') || status === 'completed')
      return { bg: 'success.lighter', color: 'success.dark' };
    if (status === i18n.t('lims.lims_instrument_detail_page.k13') || status === 'in_progress')
      return { bg: 'primary.100', color: 'primary.dark' };
    return { bg: 'warning.100', color: ct.yellow[600] };
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FileText sx={{ fontSize: 20, color: 'primary.dark' }} />
        {i18n.t('pages.lims_instrument_detail_page.k6')}
      </Typography>
      {tasks.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {tasks.map((task) => {
            const sc = taskStatusColor(task.status || '');
            return (
              <Card
                key={task.id}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
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
                    <Typography sx={{ fontWeight: 500, color: 'grey.900', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}>
                      {task.task_no || task.id}
                    </Typography>
                    <Chip
                      label={task.status || i18n.t('lims.lims_instrument_detail_page.k14')}
                      size='small'
                      sx={{ backgroundColor: sc.bg, color: sc.color }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
            );
          })}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <FileText sx={{ width: 48, height: 48, opacity: 0.5, mx: 'auto', mb: 1 }} />
          <Typography variant='body2'>{i18n.t('lims.lims_instrument_detail_page.k15')}</Typography>
        </Box>
      )}
    </Box>
  );
}
const LimsInstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.LIMS.INSTRUMENT(id || ''),
    queryFn: async () => {
      if (!id) return { instrument: null, error: i18n.t('lims.lims_instrument_detail_page.id_16') };
      const [instrumentRes, calibrationRes, maintenanceRes, tasksRes] = await Promise.all([
        limsApi.getInstrument(id),
        limsApi.listCalibrationRecords(id),
        limsApi.listMaintenanceByInstrument(id),
        limsApi.listTasks().catch(() => null),
      ]);
      const instrument =
        instrumentRes.success && instrumentRes.data ? (instrumentRes.data as Instrument) : null;
      const instrError = instrument ? null : i18n.t('lims.lims_instrument_detail_page.k17');
      const extractList = <T,>(
        res: { success?: boolean; data?: unknown },
        keys: (keyof LimsListResponse<T>)[]
      ): T[] => {
        if (!res.success || !res.data) return [];
        if (Array.isArray(res.data)) return res.data as T[];
        const obj = res.data as LimsListResponse<T>;
        for (const k of keys) {
          if (Array.isArray(obj[k])) return obj[k] as T[];
        }
        return [];
      };
      const calibrationRecords = extractList<CalibrationRecord>(calibrationRes, [
        'items',
        'records',
      ]);
      const maintenanceRecords = extractList<MaintenanceRecord>(maintenanceRes, ['items']);
      const allTasks = tasksRes ? extractList<InspectionTask>(tasksRes, ['items', 'tasks']) : [];
      const relatedTasks = allTasks.slice(0, 5);
      return {
        instrument,
        error: instrError,
        calibrationRecords,
        maintenanceRecords,
        relatedTasks,
      };
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const instrument = data?.instrument || null;
  const calibrationRecords = data?.calibrationRecords || [];
  const maintenanceRecords = data?.maintenanceRecords || [];
  const relatedTasks = data?.relatedTasks || [];
  const pageError = error ? i18n.t('lims.lims_instrument_detail_page.k18') : data?.error || null;
  const usageDays = useMemo(() => {
    if (!instrument) return 0;
    const created = instrument.purchase_date || instrument.created_at;
    if (!created) return 0;
    return dayjs().diff(dayjs(created), 'day');
  }, [instrument]);
  const calibrationColumns = [
    {
      id: 'calibration_date',
      label: i18n.t('lims.lims_instrument_detail_page.k19'),
      render: (row: CalibrationRecord) => formatDate(row.calibration_date),
    },
    { id: 'calibration_type', label: i18n.t('lims.lims_instrument_detail_page.k20') },
    { id: 'result', label: i18n.t('lims.lims_instrument_detail_page.k21') },
    {
      id: 'certificate_no',
      label: i18n.t('lims.lims_instrument_detail_page.k22'),
      render: (row: CalibrationRecord) => row.certificate_no || '-',
    },
    { id: 'performed_by', label: i18n.t('lims.lims_instrument_detail_page.k23') },
    {
      id: 'next_calibration_date',
      label: i18n.t('lims.lims_instrument_detail_page.k24'),
      render: (row: CalibrationRecord) => formatDate(row.next_calibration_date),
    },
  ];
  const maintenanceColumns = [
    {
      id: 'performed_at',
      label: i18n.t('lims.lims_instrument_detail_page.k25'),
      render: (row: MaintenanceRecord) => formatDate(row.performed_at),
    },
    { id: 'maintenance_type', label: i18n.t('lims.lims_instrument_detail_page.k26') },
    { id: 'description', label: i18n.t('lims.lims_instrument_detail_page.k27') },
    { id: 'performed_by', label: i18n.t('lims.lims_instrument_detail_page.k28') },
    {
      id: 'next_maintenance_date',
      label: i18n.t('lims.lims_instrument_detail_page.k29'),
      render: (row: MaintenanceRecord) => formatDate(row.next_maintenance_date),
    },
    {
      id: 'cost',
      label: i18n.t('lims.lims_instrument_detail_page.k30'),
      render: (row: MaintenanceRecord) => (row.cost ? `¥${row.cost}` : '-'),
    },
  ];
  const sections: SectionConfig[] = [
    {
      id: 'basic',
      title: i18n.t('lims.lims_instrument_detail_page.k31'),
      content: instrument ? <InfoGrid instrument={instrument} /> : null,
    },
    {
      id: 'calibration',
      title: i18n.t('lims.lims_instrument_detail_page.k32'),
      content: (
        <SimpleTable
          columns={calibrationColumns}
          data={calibrationRecords}
          emptyIcon={<CheckCircle sx={{ width: 64, height: 64 }} />}
          emptyText={i18n.t('lims.lims_instrument_detail_page.k33')}
        />
      ),
    },
    {
      id: 'maintenance',
      title: i18n.t('lims.lims_instrument_detail_page.k34'),
      content: (
        <SimpleTable
          columns={maintenanceColumns}
          data={maintenanceRecords}
          emptyIcon={<Wrench sx={{ width: 64, height: 64 }} />}
          emptyText={i18n.t('lims.lims_instrument_detail_page.k35')}
        />
      ),
    },
    {
      id: 'usage',
      title: i18n.t('lims.lims_instrument_detail_page.k36'),
      content: (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Clock sx={{ width: 64, height: 64, opacity: 0.5, mx: 'auto', mb: 2 }} />
          <Typography>{i18n.t('lims.lims_instrument_detail_page.k37')}</Typography>
        </Box>
      ),
    },
  ];
  if (isPending) {
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
          <Typography sx={{ color: 'slate.600' }}>
            {i18n.t('pages.lims_instrument_detail_page.k0')}
          </Typography>
        </Box>
      </Box>
    );
  }
  if (pageError || !instrument) {
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
            sx={{ width: 64, height: 64, color: 'error.main', mb: 2, mx: 'auto', display: 'block' }}
          />
          <p style={{ color: ct.grey[600] }}>
            {pageError || i18n.t('lims.lims_instrument_detail_page.k38')}
          </p>
          <Button
            onClick={() => navigate(LIMS_PATHS.instrument)}
            sx={{ mt: 2 }}
          >
            {i18n.t('pages.lims_instrument_detail_page.k7')}
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
        detailItemName={
          instrument?.name || instrument?.code || i18n.t('lims.lims_instrument_detail_page.k39')
        }
        breadcrumbs={[
          { label: i18n.t('lims.lims_instrument_detail_page.k40'), href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: i18n.t('lims.lims_instrument_detail_page.k41'), href: LIMS_PATHS.instrument },
          { label: i18n.t('lims.lims_instrument_detail_page.k42') },
        ]}
        backHref={LIMS_PATHS.instrument}
        loading={isPending}
        onRefresh={() => refetch()}
        infoCard={{
          avatar: <Settings sx={{ fontSize: 40, color: 'cyan.dark' }} />,
          title: instrument.name,
          subtitle: instrument.code,
          tags: [instrument.status, instrument.type].filter(Boolean),
          stats: [
            {
              label: i18n.t('lims.lims_instrument_detail_page.k43'),
              value: calibrationRecords.length,
            },
            {
              label: i18n.t('lims.lims_instrument_detail_page.k44'),
              value: maintenanceRecords.length,
            },
            { label: i18n.t('lims.lims_instrument_detail_page.k45'), value: usageDays },
          ],
        }}
        sidebar={
          <SidebarTasks
            tasks={relatedTasks}
            navigate={navigate}
          />
        }
        sections={sections}
      />
    </PageContainer>
  );
};
export default LimsInstrumentDetailPage;
