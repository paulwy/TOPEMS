import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, Building2, TrendingUp, DollarSign, BarChart3, FileSpreadsheet, Plus, Eye, Send, Check, Download, Search, RefreshCw } from 'lucide-react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useConsolidationReports, useConsolidationReportLines, useConsolidationScopes, useApproveConsolidationReport, usePublishConsolidationReport } from '@/hooks/useConsolidation';
import { useNotification } from '@/hooks/useNotification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import type { ConsolidationReport, ConsolidationReportType } from '@/types/consolidation';
import { PageContainer } from '@/components/common';

const REPORT_TYPE_CONFIG: Record<ConsolidationReportType, { name: string; icon: React.ElementType; color: string }> = {
  consolidated_balance_sheet: { name: '合并资产负债表', icon: Building2, color: '#1976D2' },
  consolidated_income_statement: { name: '合并利润表', icon: TrendingUp, color: '#00C897' },
  consolidated_cash_flow: { name: '合并现金流量表', icon: DollarSign, color: '#8B5CF6' },
  consolidated_statement_changes: { name: '合并所有者权益变动表', icon: BarChart3, color: '#F59E0B' },
  elimination_work_sheet: { name: '抵消工作底稿', icon: FileSpreadsheet, color: '#6366F1' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'grey' },
  calculating: { label: '计算中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  published: { label: '已发布', color: 'secondary' },
};

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'warning' },
  approved: { label: '已审批', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

export default function ConsolidationReportsPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotification();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [reportType, setReportType] = useState<ConsolidationReportType | ''>('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedReport, setSelectedReport] = useState<ConsolidationReport | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: scopesData, error: scopesError } = useConsolidationScopes();

  const { data: reportsData, isLoading, refetch, error: reportsError } = useConsolidationReports({
    scope_id: selectedScope || undefined,
    report_type: reportType || undefined,
    period_from: period,
    period_to: period,
  });

  const { data: reportDetail } = useConsolidationReportLines(selectedReport?.id || '');

  const approveReport = useApproveConsolidationReport();
  const publishReport = usePublishConsolidationReport();

  useEffect(() => {
    if (scopesError) notifyError('获取合并范围列表失败');
  }, [scopesError, notifyError]);

  useEffect(() => {
    if (reportsError) notifyError('获取报表列表失败');
  }, [reportsError, notifyError]);

  const handleViewReport = (report: ConsolidationReport) => {
    setSelectedReport(report);
    setShowDetail(true);
  };

  const reports = reportsData?.items || [];

  const statCards = useMemo<StatCard[]>(() => [
    {
      id: 'balance-sheet',
      title: '合并资产负债表',
      value: reports.filter((r) => r.report_type === 'consolidated_balance_sheet').length,
      icon: <Building2 sx={{ width: 24, height: 24 }} />,
      gradient: ['#1976D2', '#1565C0'] as [string, string],
    },
    {
      id: 'income-statement',
      title: '合并利润表',
      value: reports.filter((r) => r.report_type === 'consolidated_income_statement').length,
      icon: <TrendingUp sx={{ width: 24, height: 24 }} />,
      gradient: ['#00C897', '#00A878'] as [string, string],
    },
    {
      id: 'cash-flow',
      title: '合并现金流量表',
      value: reports.filter((r) => r.report_type === 'consolidated_cash_flow').length,
      icon: <DollarSign sx={{ width: 24, height: 24 }} />,
      gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
    },
    {
      id: 'equity-changes',
      title: '所有者权益变动表',
      value: reports.filter((r) => r.report_type === 'consolidated_statement_changes').length,
      icon: <BarChart3 sx={{ width: 24, height: 24 }} />,
      gradient: ['#F59E0B', '#D97706'] as [string, string],
    },
  ], [reports]);

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
        title: '报表状态分布',
        type: 'pie',
        dataKey: 'value',
        nameKey: 'name',
        data: [
          { name: '草稿', value: statusDistribution.draft, color: 'grey' },
          { name: '计算中', value: statusDistribution.calculating, color: '#1976D2' },
          { name: '已完成', value: statusDistribution.completed, color: '#00C897' },
          { name: '已发布', value: statusDistribution.published, color: '#8B5CF6' },
        ].filter((d) => d.value > 0),
        height: 250,
      },
    ];
  }, [reports]);

  const tableColumns: TableColumn[] = [
    { id: 'report_no', label: '报表编号', field: 'report_no' },
    { id: 'report_type', label: '报表类型', field: 'report_type' },
    { id: 'scope_name', label: '合并范围', field: 'scope_name' },
    { id: 'period', label: '期间', field: 'period' },
    { id: 'company_count', label: '公司数', field: 'company_count' },
    { id: 'total_assets', label: '资产总计', field: 'total_assets', align: 'right' },
    { id: 'net_profit', label: '净利润', field: 'net_profit', align: 'right' },
    { id: 'status', label: '状态', field: 'status', align: 'center' },
    { id: 'approval_status', label: '审批', field: 'approval_status', align: 'center' },
    { id: 'actions', label: '操作', field: 'actions', align: 'center' },
  ];

  const tables = useMemo<DataTable[]>(() => [
    {
      id: 'report-list',
      title: '合并报表列表',
      columns: tableColumns,
      data: reports.map((report) => ({
        report_no: report.report_no,
        report_type: REPORT_TYPE_CONFIG[report.report_type]?.name || report.report_type,
        scope_name: report.scope_name,
        period: report.period,
        company_count: `${report.company_count}家${report.eliminated_company_count > 0 ? ` (抵消${report.eliminated_company_count}家)` : ''}`,
        total_assets: report.total_assets ? `¥${report.total_assets.toLocaleString('zh-CN')}` : '-',
        net_profit: ((report as any).归属于母公司净利润 || report.net_profit)
          ? `¥${Math.abs((report as any).归属于母公司净利润 || report.net_profit).toLocaleString('zh-CN')}`
          : '-',
        status: STATUS_CONFIG[report.status]?.label || report.status,
        approval_status: APPROVAL_STATUS_CONFIG[report.approval_status]?.label || report.approval_status,
        actions: '',
      })),
      loading: isLoading,
    },
  ], [reports, isLoading]);

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <FormControl size='small' sx={{ minWidth: 140 }}>
        <InputLabel>合并范围</InputLabel>
        <Select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)} displayEmpty>
          <MenuItem value=''>全部范围</MenuItem>
          {scopesData?.items?.map((scope) => (
            <MenuItem key={scope.id} value={scope.id}>{scope.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size='small' sx={{ minWidth: 140 }}>
        <InputLabel>报表类型</InputLabel>
        <Select value={reportType} onChange={(e) => setReportType(e.target.value as ConsolidationReportType)} displayEmpty>
          <MenuItem value=''>全部类型</MenuItem>
          {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
            <MenuItem key={key} value={key}>{config.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size='small'
        type='month'
        label='会计期间'
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        sx={{ minWidth: 140 }}
      />

      <Button variant='contained' onClick={() => navigate('#')}>
        <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
        生成合并报表
      </Button>
    </Box>
  );

  return (
    <PageContainer maxWidth='xl'>
      <StatsPageTemplate
        title='合并报表'
        subtitle='查看多公司合并后的财务报表'
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, md: 2 }}
        tables={tables}
        loading={isLoading}
        search={{
          value: searchKeyword,
          onChange: setSearchKeyword,
          placeholder: '报表编号...',
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
        <Dialog open={showDetail} onClose={() => setShowDetail(false)} maxWidth='lg' fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant='h6'>{REPORT_TYPE_CONFIG[selectedReport.report_type]?.name || selectedReport.report_type}</Typography>
                <Typography variant='body2' color='text.secondary'>{selectedReport.scope_name} | {selectedReport.period}</Typography>
              </Box>
              <IconButton onClick={() => setShowDetail(false)}><X style={{ width: 20, height: 20 }} /></IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedReport.total_assets && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant='body2' color='text.secondary'>资产总计</Typography>
                  <Typography variant='h6' sx={{ fontWeight: 'bold', mt: 0.5 }}>¥{selectedReport.total_assets.toLocaleString('zh-CN')}</Typography>
                </Box>
                {selectedReport.total_liabilities && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant='body2' color='text.secondary'>负债合计</Typography>
                    <Typography variant='h6' sx={{ fontWeight: 'bold', mt: 0.5 }}>¥{selectedReport.total_liabilities.toLocaleString('zh-CN')}</Typography>
                  </Box>
                )}
                {selectedReport.total_equity && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant='body2' color='text.secondary'>所有者权益</Typography>
                    <Typography variant='h6' sx={{ fontWeight: 'bold', mt: 0.5 }}>¥{selectedReport.total_equity.toLocaleString('zh-CN')}</Typography>
                  </Box>
                )}
                {selectedReport.net_profit && (
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant='body2' color='text.secondary'>净利润</Typography>
                    <Typography variant='h6' sx={{ fontWeight: 'bold', mt: 0.5, color: selectedReport.net_profit >= 0 ? 'success.main' : 'error.main' }}>¥{selectedReport.net_profit.toLocaleString('zh-CN')}</Typography>
                  </Box>
                )}
              </Box>
            )}

            {reportDetail?.data && reportDetail.data.length > 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600, backgroundColor: '#f9fafb' }}>项目</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, backgroundColor: '#f9fafb' }}>本期金额</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, backgroundColor: '#f9fafb' }}>上期金额</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, backgroundColor: '#f9fafb' }}>变动</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, backgroundColor: '#f9fafb' }}>变动率</th>
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
                          <td style={{ padding: '12px', borderBottom: '1px solid', paddingLeft: `${(line.item_level ?? 0) * 16 + 12}px` }}>{line.item_name || '-'}</td>
                          <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid', fontFamily: 'monospace' }}>{currentPeriod.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid', fontFamily: 'monospace', color: '#6B7280' }}>{priorPeriod.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid', fontFamily: 'monospace', color: change >= 0 ? '#10B981' : '#EF4444' }}>{change.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid', fontFamily: 'monospace', color: changeRate >= 0 ? '#10B981' : '#EF4444' }}>{changeRate.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedReport.approval_status === 'pending' && selectedReport.status === 'completed' && (
              <Button onClick={() => approveReport.mutate(selectedReport.id)}><Check style={{ width: 16, height: 16, marginRight: 8 }} />审批通过</Button>
            )}
            {selectedReport.approval_status === 'approved' && selectedReport.status === 'completed' && (
              <Button onClick={() => publishReport.mutate(selectedReport.id)}><Send style={{ width: 16, height: 16, marginRight: 8 }} />发布</Button>
            )}
            <Button variant='outlined'><Download style={{ width: 16, height: 16, marginRight: 8 }} />导出Excel</Button>
            <Button onClick={() => setShowDetail(false)}>关闭</Button>
          </DialogActions>
        </Dialog>
      )}
    </PageContainer>
  );
}

const X: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
    <path d='M18 6L6 18M6 6l12 12' />
  </svg>
);