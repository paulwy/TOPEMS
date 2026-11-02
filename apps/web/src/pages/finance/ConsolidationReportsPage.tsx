import React, { useState, useEffect, useMemo } from 'react';
import styles from './ConsolidationReportsPage.module.css';
import {
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  Plus,
  Send,
  Check,
  Download,
} from 'lucide-react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  useConsolidationReports,
  useConsolidationReportLines,
  useConsolidationScopes,
  useApproveConsolidationReport,
  usePublishConsolidationReport,
  useGenerateConsolidationReport,
} from '@/hooks/useConsolidation';
import { useNotification } from '@/hooks/useNotification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TableColumn,
} from '@/components/templates/StatsPageTemplate';
import type { ConsolidationReport, ConsolidationReportType } from '@/types/consolidation';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: i18n.t('finance.consolidation_reports_page.k5'), color: 'grey.500' },
  calculating: { label: i18n.t('finance.consolidation_reports_page.k6'), color: 'primary' },
  completed: { label: i18n.t('finance.consolidation_reports_page.k7'), color: 'success' },
  published: { label: i18n.t('finance.consolidation_reports_page.k8'), color: 'secondary' },
};

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: i18n.t('finance.consolidation_reports_page.k9'), color: 'warning' },
  approved: { label: i18n.t('finance.consolidation_reports_page.k10'), color: 'success' },
  rejected: { label: i18n.t('finance.consolidation_reports_page.k11'), color: 'error' },
};

const tableColumns: TableColumn[] = [
  {
    id: 'report_no',
    label: i18n.t('finance.consolidation_reports_page.col_report_no'),
    field: 'report_no',
  },
  {
    id: 'report_type',
    label: i18n.t('finance.consolidation_reports_page.type'),
    field: 'report_type',
  },
  {
    id: 'scope_name',
    label: i18n.t('finance.consolidation_reports_page.col_scope_name'),
    field: 'scope_name',
  },
  {
    id: 'period',
    label: i18n.t('finance.consolidation_reports_page.col_period'),
    field: 'period',
  },
  {
    id: 'company_count',
    label: i18n.t('finance.consolidation_reports_page.col_company_count'),
    field: 'company_count',
  },
  {
    id: 'total_assets',
    label: i18n.t('finance.consolidation_reports_page.col_total_assets'),
    field: 'total_assets',
    align: 'right',
  },
  {
    id: 'net_profit',
    label: i18n.t('finance.consolidation_reports_page.col_net_profit'),
    field: 'net_profit',
    align: 'right',
  },
  {
    id: 'status',
    label: i18n.t('finance.consolidation_reports_page.status_1'),
    field: 'status',
    align: 'center',
  },
  {
    id: 'approval_status',
    label: i18n.t('finance.consolidation_reports_page.col_approval_status'),
    field: 'approval_status',
    align: 'center',
  },
  {
    id: 'actions',
    label: i18n.t('finance.consolidation_reports_page.action'),
    field: 'actions',
    align: 'center',
  },
];

export default function ConsolidationReportsPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { error: notifyError, success: notifySuccess } = useNotification();

  const reportTypeConfig: Record<
    ConsolidationReportType,
    { name: string; icon: React.ElementType; color: string }
  > = {
    consolidated_balance_sheet: {
      name: t('finance.consolidation_reports_page.k0'),
      icon: Building2,
      color: theme.palette.primary.dark,
    },
    consolidated_income_statement: {
      name: t('finance.consolidation_reports_page.k1'),
      icon: TrendingUp,
      color: theme.palette.success.main,
    },
    consolidated_cash_flow: {
      name: t('finance.consolidation_reports_page.k2'),
      icon: DollarSign,
      color: 'secondary.main',
    },
    consolidated_statement_changes: {
      name: t('finance.consolidation_reports_page.k3'),
      icon: BarChart3,
      color: 'warning.main',
    },
    elimination_work_sheet: {
      name: t('finance.consolidation_reports_page.k4'),
      icon: FileSpreadsheet,
      color: theme.palette.secondary[400],
    },
  };

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [reportType, setReportType] = useState<ConsolidationReportType | ''>('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedReport] = useState<ConsolidationReport | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [generateFormData, setGenerateFormData] = useState({
    scope_id: '',
    report_type: '' as ConsolidationReportType | '',
    period: new Date().toISOString().slice(0, 7),
  });

  const { data: scopesData, error: scopesError } = useConsolidationScopes();

  const {
    data: reportsData,
    isLoading,
    refetch,
    error: reportsError,
  } = useConsolidationReports({
    scope_id: selectedScope || undefined,
    report_type: reportType || undefined,
    period_from: period,
    period_to: period,
  });

  const { data: reportDetail } = useConsolidationReportLines(selectedReport?.id || '');

  const approveReport = useApproveConsolidationReport();
  const publishReport = usePublishConsolidationReport();
  const generateReport = useGenerateConsolidationReport();

  useEffect(() => {
    if (scopesError) notifyError(t('finance.consolidation_reports_page.list'));
  }, [scopesError, notifyError, t]);

  useEffect(() => {
    if (reportsError) notifyError(t('finance.consolidation_reports_page.list_1'));
  }, [reportsError, notifyError, t]);

  const handleOpenGenerateModal = () => {
    setGenerateFormData({
      scope_id: selectedScope || '',
      report_type: reportType || '',
      period,
    });
    setShowGenerateModal(true);
  };

  const handleGenerateReport = async () => {
    if (!generateFormData.scope_id || !generateFormData.report_type || !generateFormData.period) {
      notifyError(t('finance.consolidation_reports_page.please_fill'));
      return;
    }

    await generateReport.mutateAsync({
      scope_id: generateFormData.scope_id,
      report_type: generateFormData.report_type,
      period: generateFormData.period,
      include_prior_period: false,
      auto_eliminate: true,
    });

    notifySuccess(t('finance.consolidation_reports_page.submit'));
    setShowGenerateModal(false);
    refetch();
  };

  const reports = useMemo(() => reportsData?.items || [], [reportsData]);

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        id: 'balance-sheet',
        title: t('finance.consolidation_reports_page.stat_balance_sheet'),
        value: reports.filter((r) => r.report_type === 'consolidated_balance_sheet').length,
        icon: <Building2 sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.primary.dark, theme.palette.primary[800]] as [string, string],
      },
      {
        id: 'income-statement',
        title: t('finance.consolidation_reports_page.stat_income_statement'),
        value: reports.filter((r) => r.report_type === 'consolidated_income_statement').length,
        icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.success.main, theme.palette.success.dark] as [string, string],
      },
      {
        id: 'cash-flow',
        title: t('finance.consolidation_reports_page.stat_cash_flow_statement'),
        value: reports.filter((r) => r.report_type === 'consolidated_cash_flow').length,
        icon: <DollarSign sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.secondary.main, theme.palette.secondary.dark] as [string, string],
      },
      {
        id: 'equity-changes',
        title: t('finance.consolidation_reports_page.stat_equity_changes'),
        value: reports.filter((r) => r.report_type === 'consolidated_statement_changes').length,
        icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
        gradient: [theme.palette.warning.main, theme.palette.warning.dark] as [string, string],
      },
    ],
    [reports, t]
  );

  const charts = useMemo<ChartConfig[]>(() => {
    const statusDistribution = {
      draft: reports.filter((r) => r.status === 'draft').length,
      calculating: reports.filter((r) => r.status === 'calculating').length,
      completed: reports.filter((r) => r.status === 'completed').length,
      published: reports.filter((r) => r.status === 'published').length,
    };

    return [
      {
        id: 'status-distribution',
        title: t('finance.consolidation_reports_page.status'),
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          {
            name: t('finance.consolidation_reports_page.pie_draft'),
            value: statusDistribution.draft,
            color: 'grey.500',
          },
          {
            name: t('finance.consolidation_reports_page.pie_calculating'),
            value: statusDistribution.calculating,
            color: theme.palette.primary.dark,
          },
          {
            name: t('finance.consolidation_reports_page.completed'),
            value: statusDistribution.completed,
            color: theme.palette.success.main,
          },
          {
            name: t('finance.consolidation_reports_page.pie_published'),
            value: statusDistribution.published,
            color: 'secondary.main',
          },
        ].filter((d) => d.value > 0),
        height: 250,
      },
    ];
  }, [reports, t]);

  const tables = useMemo<DataTable[]>(
    () => [
      {
        id: 'report-list',
        title: t('finance.consolidation_reports_page.list_2'),
        columns: tableColumns,
        data: reports.map((report) => ({
          report_no: report.report_no,
          report_type: reportTypeConfig[report.report_type]?.name || report.report_type,
          scope_name: report.scope_name,
          period: report.period,
          company_count: i18n.t('finance.consolidation_reports_page.e1', {
            v1: report.company_count,
            v2:
              report.eliminated_company_count > 0
                ? i18n.t('finance.consolidation_reports_page.e1', {
                    v1: report.eliminated_company_count,
                  })
                : '',
          }),
          total_assets: report.total_assets
            ? `¥${report.total_assets.toLocaleString('zh-CN')}`
            : '-',
          net_profit:
            (report as unknown as Record<string, unknown>)[
              i18n.t('pages.consolidation_reports_page.k0')
            ] || report.net_profit
              ? `¥${Math.abs(((report as unknown as Record<string, unknown>)[i18n.t('pages.consolidation_reports_page.k1')] as number) || report.net_profit || 0).toLocaleString('zh-CN')}`
              : '-',
          status: STATUS_CONFIG[report.status]?.label || report.status,
          approval_status:
            APPROVAL_STATUS_CONFIG[report.approval_status]?.label || report.approval_status,
          actions: '',
        })),
        loading: isLoading,
      },
    ],
    [reports, isLoading, t, reportTypeConfig]
  );

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <FormControl
        size='small'
        sx={{ minWidth: 140 }}
      >
        <InputLabel>{t('finance.consolidation_reports_page.k12')}</InputLabel>
        <Select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          displayEmpty
        >
          <MenuItem value=''>{t('finance.consolidation_reports_page.k13')}</MenuItem>
          {scopesData?.items?.map((scope) => (
            <MenuItem
              key={scope.id}
              value={scope.id}
            >
              {scope.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl
        size='small'
        sx={{ minWidth: 140 }}
      >
        <InputLabel>{t('finance.consolidation_reports_page.k14')}</InputLabel>
        <Select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ConsolidationReportType)}
          displayEmpty
        >
          <MenuItem value=''>{t('finance.consolidation_reports_page.k15')}</MenuItem>
          {Object.entries(reportTypeConfig).map(([key, config]) => (
            <MenuItem
              key={key}
              value={key}
            >
              {config.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size='small'
        type='month'
        label={t('finance.consolidation_reports_page.filter_period')}
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        sx={{ minWidth: 140 }}
      />

      <Button
        variant='contained'
        onClick={handleOpenGenerateModal}
      >
        <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
        {t('finance.consolidation_reports_page.e3')}
      </Button>
    </Box>
  );

  return (
    <PageContainer maxWidth='xl'>
      <StatsPageTemplate
        title={t('finance.consolidation_reports_page.page_title')}
        subtitle={t('finance.consolidation_reports_page.view')}
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, md: 2 }}
        tables={tables}
        loading={isLoading}
        search={{
          value: searchKeyword,
          onChange: setSearchKeyword,
          placeholder: t('finance.consolidation_reports_page.search_placeholder'),
        }}
        onRefresh={refetch}
        showExport={true}
        showRefresh={true}
        showTimeRange={false}
        showSearch={true}
        customToolbar={customToolbar}
        statCardDirection='row'
      />

      {showDetail && selectedReport && (
        <Dialog
          open={showDetail}
          onClose={() => setShowDetail(false)}
          maxWidth='lg'
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant='h6'>
                  {reportTypeConfig[selectedReport.report_type]?.name || selectedReport.report_type}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {selectedReport.scope_name} | {selectedReport.period}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setShowDetail(false)}
                aria-label={t('finance.consolidation_reports_page.close')}
              >
                <X style={{ width: 20, height: 20 }} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedReport.total_assets && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.consolidation_reports_page.e4')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', mt: 0.5 }}
                  >
                    ¥{selectedReport.total_assets.toLocaleString('zh-CN')}
                  </Typography>
                </Box>
                {selectedReport.total_liabilities && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('finance.consolidation_reports_page.e5')}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'bold', mt: 0.5 }}
                    >
                      ¥{selectedReport.total_liabilities.toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                )}
                {selectedReport.total_equity && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('finance.consolidation_reports_page.e6')}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'bold', mt: 0.5 }}
                    >
                      ¥{selectedReport.total_equity.toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                )}
                {selectedReport.net_profit && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('finance.consolidation_reports_page.e7')}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 'bold',
                        mt: 0.5,
                        color: selectedReport.net_profit >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      ¥{selectedReport.net_profit.toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {reportDetail?.data && reportDetail.data.length > 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                <table className={styles.il2}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: 3,
                          fontWeight: 600,
                          backgroundColor: theme.palette.background.default,
                        }}
                      >
                        {t('finance.consolidation_reports_page.e8')}
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 3,
                          fontWeight: 600,
                          backgroundColor: theme.palette.background.default,
                        }}
                      >
                        {t('finance.consolidation_reports_page.e9')}
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 3,
                          fontWeight: 600,
                          backgroundColor: theme.palette.background.default,
                        }}
                      >
                        {t('finance.consolidation_reports_page.e10')}
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 3,
                          fontWeight: 600,
                          backgroundColor: theme.palette.background.default,
                        }}
                      >
                        {t('finance.consolidation_reports_page.e11')}
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 3,
                          fontWeight: 600,
                          backgroundColor: theme.palette.background.default,
                        }}
                      >
                        {t('finance.consolidation_reports_page.e12')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportDetail.data.map((line) => {
                      const currentPeriod = line.current_period ?? 0;
                      const priorPeriod = line.prior_period ?? 0;
                      const change = currentPeriod - priorPeriod;
                      const changeRate = priorPeriod !== 0 ? (change / priorPeriod) * 100 : 0;
                      return (
                        <tr key={line.id}>
                          <td
                            style={{
                              padding: 3,
                              borderBottom: '1px solid',
                              paddingLeft: `${(line.itemlevel ?? 0) * 16 + 12}px`,
                            }}
                          >
                            {line.item_name || '-'}
                          </td>
                          <td
                            className={styles.il3}
                          >
                            {currentPeriod.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: 3,
                              borderBottom: '1px solid',
                              fontFamily: 'monospace',
                              color: 'grey.500',
                            }}
                          >
                            {priorPeriod.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: 3,
                              borderBottom: '1px solid',
                              fontFamily: 'monospace',
                              color: change >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {change.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: 3,
                              borderBottom: '1px solid',
                              fontFamily: 'monospace',
                              color: changeRate >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {changeRate.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedReport.approval_status === 'pending' &&
              selectedReport.status === 'completed' && (
                <Button onClick={() => approveReport.mutate(selectedReport.id)}>
                  <Check className={styles.il4} />
                  {t('finance.consolidation_reports_page.e13')}
                </Button>
              )}
            {selectedReport.approval_status === 'approved' &&
              selectedReport.status === 'completed' && (
                <Button onClick={() => publishReport.mutate(selectedReport.id)}>
                  <Send className={styles.il5} />
                  {t('finance.consolidation_reports_page.e14')}
                </Button>
              )}
            <Button variant='outlined'>
              <Download className={styles.il6} />
              {t('finance.consolidation_reports_page.e15')}
            </Button>
            <Button onClick={() => setShowDetail(false)}>
              {t('finance.consolidation_reports_page.k16')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 生成合并报表弹窗 */}
      <Dialog
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.consolidation_reports_page.k17')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>{t('finance.consolidation_reports_page.r1')}</InputLabel>
              <Select
                value={generateFormData.scope_id}
                label={t('finance.consolidation_reports_page.col_scope_name')}
                onChange={(e) =>
                  setGenerateFormData({ ...generateFormData, scope_id: e.target.value })
                }
              >
                <MenuItem value=''>{t('finance.consolidation_reports_page.k18')}</MenuItem>
                {scopesData?.items?.map((scope) => (
                  <MenuItem
                    key={scope.id}
                    value={scope.id}
                  >
                    {scope.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('finance.consolidation_reports_page.r2')}</InputLabel>
              <Select
                value={generateFormData.report_type}
                label={t('finance.consolidation_reports_page.type')}
                onChange={(e) =>
                  setGenerateFormData({
                    ...generateFormData,
                    report_type: e.target.value as ConsolidationReportType,
                  })
                }
              >
                <MenuItem value=''>{t('finance.consolidation_reports_page.k19')}</MenuItem>
                {Object.entries(reportTypeConfig).map(([key, config]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {config.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type='month'
              label={t('finance.consolidation_reports_page.dialog_period')}
              value={generateFormData.period}
              onChange={(e) => setGenerateFormData({ ...generateFormData, period: e.target.value })}
            />
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 2 }}
            >
              {t('finance.consolidation_reports_page.e16')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowGenerateModal(false)}
          >
            {t('finance.budget_management_page.e7')}
          </Button>
          <Button
            variant='contained'
            onClick={handleGenerateReport}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending
              ? t('finance.consolidation_reports_page.btn_generating')
              : t('finance.consolidation_reports_page.btn_generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

const X: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    style={style}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
  >
    <path d='M18 6L6 18M6 6l12 12' />
  </svg>
);
