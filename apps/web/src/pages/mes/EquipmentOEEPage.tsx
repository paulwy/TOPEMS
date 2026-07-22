import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  LinearProgress,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { OeeRecord, OeeStatistics, ListParams } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Search,
  Eye,
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  Gauge,
  CalendarRange,
  RefreshCw,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EquipmentOEEPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OeeRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { addNotification } = useNotificationStore();

  const listParams: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) listParams.search = searchTerm;
  if (equipmentFilter !== 'all') listParams.equipment_id = equipmentFilter;
  if (startDate) listParams.start_date = startDate;
  if (endDate) listParams.end_date = endDate;

  const { data: recordsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.EQUIPMENT_OEE, listParams],
    queryFn: async () => {
      const response = await mesApi.equipmentOee.list(listParams);
      if (response.success && response.data) {
        return {
          records: response.data.records || [],
          total: response.data.total || 0,
        };
      }
      return { records: [], total: 0 };
    },
  });

  const records = recordsData?.records || [];
  const total = recordsData?.total || 0;

  const statsParams: ListParams = {};
  if (equipmentFilter !== 'all') statsParams.equipment_id = equipmentFilter;
  if (startDate) statsParams.start_date = startDate;
  if (endDate) statsParams.end_date = endDate;

  const { data: statistics } = useQuery({
    queryKey: [...QUERY_KEYS.MES.EQUIPMENT_OEE_STATISTICS, statsParams],
    queryFn: async () => {
      const response = await mesApi.equipmentOee.getStatistics(statsParams);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });

  const getOEEColor = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return 'primary';
    if (value >= 85) return 'success';
    if (value >= 70) return 'warning';
    return 'error';
  };

  const getOEEColorHex = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return 'text.primary';
    if (value >= 85) return 'success.700';
    if (value >= 70) return 'warning.700';
    return 'error.700';
  };

  const getOEEBgColor = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return 'grey.100';
    if (value >= 85) return 'success.lighter';
    if (value >= 70) return 'warning.light';
    return 'error.lighter';
  };

  const handleViewDetail = (record: OeeRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setEquipmentFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return '-';
    return `${value.toFixed(1)}%`;
  };

  const columns: ColumnDef<OeeRecord>[] = useMemo(
    () => [
      { id: 'equipment_code', label: t('mes.equipment_oee_page.equipment'), sortable: true },
      { id: 'equipment_name', label: t('mes.equipment_oee_page.column_equipment_name'), sortable: true },
      {
        id: 'record_date',
        label: t('mes.equipment_oee_page.date'),
        sortable: true,
        render: (row) =>
          row.record_date ? new Date(row.record_date).toLocaleDateString('zh-CN') : '-',
      },
      { id: 'shift', label: t('mes.equipment_oee_page.text_b68919') },
      {
        id: 'availability',
        label: t('mes.equipment_oee_page.column_availability'),
        render: (row) => (
          <Chip
            size='small'
            label={formatPercent(row.availability)}
            sx={{
              backgroundColor: getOEEBgColor(row.availability),
              color: getOEEColorHex(row.availability),
              fontWeight: 500,
            }}
          />
        ),
      },
      {
        id: 'performance',
        label: t('mes.equipment_oee_page.column_performance'),
        render: (row) => (
          <Chip
            size='small'
            label={formatPercent(row.performance)}
            sx={{
              backgroundColor: getOEEBgColor(row.performance),
              color: getOEEColorHex(row.performance),
              fontWeight: 500,
            }}
          />
        ),
      },
      {
        id: 'quality',
        label: t('mes.equipment_oee_page.column_quality'),
        render: (row) => (
          <Chip
            size='small'
            label={formatPercent(row.quality)}
            sx={{
              backgroundColor: getOEEBgColor(row.quality),
              color: getOEEColorHex(row.quality),
              fontWeight: 500,
            }}
          />
        ),
      },
      {
        id: 'oee',
        label: t('mes.equipment_oee_page.oee'),
        render: (row) => (
          <Chip
            size='small'
            label={formatPercent(row.oee)}
            sx={{
              backgroundColor: getOEEBgColor(row.oee),
              color: getOEEColorHex(row.oee),
              fontWeight: 600,
            }}
          />
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<OeeRecord>[] = useMemo(
    () => [
      {
        label: t('mes.equipment_oee_page.view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
    ],
    [handleViewDetail]
  );

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Activity
            size={18}
            sx={{ color: 'primary.dark' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            综合OEE
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{
            fontWeight: 700,
            color: statistics ? getOEEColorHex(statistics.avg_oee) : 'text.primary',
          }}
        >
          {statistics ? formatPercent(statistics.avg_oee) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_oee || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color={statistics ? getOEEColor(statistics.avg_oee) : 'primary'}
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.success[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Gauge
            size={18}
            sx={{ color: 'success.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            可用率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {statistics ? formatPercent(statistics.avg_availability) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_availability || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='success'
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TrendingUp
            size={18}
            sx={{ color: 'warning.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            性能率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {statistics ? formatPercent(statistics.avg_performance) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_performance || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='warning'
        />
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircle2
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            质量率
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {statistics ? formatPercent(statistics.avg_quality) : '-'}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={statistics?.avg_quality || 0}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
          color='primary'
        />
      </Box>
    </Box>
  );

  const filterBarContent = (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 2,
        alignItems: 'flex-end',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 150 }}>
        <InputLabel sx={{ fontSize: 12 }}>开始日期</InputLabel>
        <TextField
          type='date'
          size='small'
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            handleFilterChange();
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 150 }}>
        <InputLabel sx={{ fontSize: 12 }}>结束日期</InputLabel>
        <TextField
          type='date'
          size='small'
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            handleFilterChange();
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 180 }}>
        <InputLabel sx={{ fontSize: 12 }}>设备筛选</InputLabel>
        <FormControl
          size='small'
          sx={{ minWidth: 180 }}
        >
          <Select
            value={equipmentFilter}
            onChange={(e) => {
              setEquipmentFilter(e.target.value);
              handleFilterChange();
            }}
          >
            <MenuItem value='all'>全部设备</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Button
        startIcon={<RefreshCw size={16} />}
        onClick={handleResetFilters}
        size='small'
        variant='outlined'
      >
        重置筛选
      </Button>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Gauge style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={records}
        loading={loading}
        filters={[]}
        searchable
        searchPlaceholder={t('mes.equipment_oee_page.search')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[]}
        rowActions={rowActions}
        headerContent={
          <Box>
            {statsContent}
            {filterBarContent}
          </Box>
        }
        emptyMessage={t('mes.equipment_oee_page.oee_1')}
        getRowId={(row) => row.id}
      />

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>OEE记录详情</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备编号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedRecord.equipment_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备名称</InputLabel>
                  <Box component='span'>{selectedRecord.equipment_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>记录日期</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRecord.record_date).toLocaleDateString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班次</InputLabel>
                  <Box component='span'>{selectedRecord.shift || '-'}</Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3, textAlign: 'center' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    综合OEE
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{
                      fontWeight: 700,
                      color: getOEEColorHex(selectedRecord.oee),
                    }}
                  >
                    {formatPercent(selectedRecord.oee)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: ct.success[100], borderRadius: 3, textAlign: 'center' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    可用率
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'success.700' }}
                  >
                    {formatPercent(selectedRecord.availability)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3, textAlign: 'center' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    性能率
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'warning.700' }}
                  >
                    {formatPercent(selectedRecord.performance)}
                  </Typography>
                </Box>
                <Box
                  sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3, textAlign: 'center' }}
                >
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    质量率
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'secondary.700' }}
                  >
                    {formatPercent(selectedRecord.quality)}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划生产时间
                  </InputLabel>
                  <Box component='span'>{selectedRecord.planned_production_time} 分钟</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>运行时间</InputLabel>
                  <Box component='span'>{selectedRecord.run_time} 分钟</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>停机时间</InputLabel>
                  <Box component='span'>{selectedRecord.downtime} 分钟</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    理想周期时间
                  </InputLabel>
                  <Box component='span'>{selectedRecord.ideal_cycle_time} 秒</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>总产量</InputLabel>
                  <Box component='span'>{selectedRecord.total_count} 件</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
                  <Box
                    component='span'
                    sx={{ color: 'success.dark' }}
                  >
                    {selectedRecord.good_count} 件
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
                  <Box
                    component='span'
                    sx={{ color: 'error.dark' }}
                  >
                    {selectedRecord.reject_count} 件
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRecord.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EquipmentOEEPage;
