import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reportApi } from '@/api/finance/report';
import type { ApiResponse, StatutoryBalanceSheet } from '@/types/finance';
import { PageContainer } from '@/components/common';
import { StatutoryReportFilters } from './StatutoryReportFilters';
import {
  ChecksAlert,
  ReportEmpty,
  ReportError,
  ReportLoading,
  UnpostedBanner,
} from './ReportFeedback';
import { ReportLineTable } from './ReportLineTable';
import type { ReportSection } from './ReportLineTable';
import { currentMonth, formatMoney, isZeroAmount } from './reportFormat';
import { getConflictPayload, type ReportConflictPayload, type ReportOutcome } from './reportTypes';

async function fetchBalanceSheet(params: {
  company_id: string;
  period: string;
}): Promise<ReportOutcome<StatutoryBalanceSheet>> {
  try {
    const response = await reportApi.generateBalanceSheet(params);
    const sheet = (response as ApiResponse<{ data: StatutoryBalanceSheet }>).data?.data;
    if (!sheet) throw new Error('balance sheet response missing data');
    return { report: sheet, checks: [], unposted: sheet.unposted, conflict: false };
  } catch (error) {
    const payload = getConflictPayload<ReportConflictPayload>(error);
    if (payload) {
      return {
        report: null,
        checks: payload.checks ?? [],
        unposted: payload.unposted ?? null,
        conflict: true,
      };
    }
    throw error;
  }
}

export default function BalanceSheetReportPage() {
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(currentMonth);

  const reportQuery = useQuery({
    queryKey: ['finance', 'statutory', 'balance-sheet', companyId, period],
    queryFn: () => fetchBalanceSheet({ company_id: companyId, period }),
    enabled: !!companyId && !!period,
    retry: false,
  });

  const outcome = reportQuery.data;
  const report = outcome?.report ?? null;
  const checks = outcome?.checks ?? [];
  const unposted = outcome?.unposted ?? null;
  const isEmpty =
    !!report &&
    isZeroAmount(report.total_assets) &&
    isZeroAmount(report.total_liabilities) &&
    isZeroAmount(report.total_equity);

  const sections: ReportSection[] = report
    ? [
        {
          key: 'assets',
          title: t('finance.statutory.balanceSheet.sectionAssets'),
          rows: report.assets,
          totalLabel: t('finance.statutory.balanceSheet.totalAssets'),
          total: report.total_assets,
        },
        {
          key: 'liabilities',
          title: t('finance.statutory.balanceSheet.sectionLiabilities'),
          rows: report.liabilities,
          totalLabel: t('finance.statutory.balanceSheet.totalLiabilities'),
          total: report.total_liabilities,
        },
        {
          key: 'equity',
          title: t('finance.statutory.balanceSheet.sectionEquity'),
          rows: report.equity,
          totalLabel: t('finance.statutory.balanceSheet.totalEquity'),
          total: report.total_equity,
        },
      ]
    : [];

  return (
    <PageContainer
      maxWidth='xl'
      title={t('finance.statutory.balanceSheet.title')}
      subtitle={t('finance.statutory.balanceSheet.subtitle')}
    >
      <StatutoryReportFilters
        companyId={companyId}
        period={period}
        onCompanyChange={setCompanyId}
        onPeriodChange={setPeriod}
      />

      {reportQuery.isLoading && (
        <ReportLoading label={t('finance.statutory.balanceSheet.loading')} />
      )}

      {reportQuery.isError && (
        <ReportError
          message={getErrorMessage(reportQuery.error)}
          onRetry={() => reportQuery.refetch()}
        />
      )}

      {checks.length > 0 && <ChecksAlert checks={checks} />}

      {!reportQuery.isLoading && !reportQuery.isError && unposted && (
        <UnpostedBanner unposted={unposted} />
      )}

      {!reportQuery.isLoading && !reportQuery.isError && isEmpty && (
        <ReportEmpty
          title={t('finance.statutory.balanceSheet.emptyTitle')}
          description={t('finance.statutory.balanceSheet.emptyDescription')}
        />
      )}

      {!reportQuery.isLoading && !reportQuery.isError && report && !isEmpty && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.statutory.balanceSheet.equation', {
                assets: formatMoney(report.total_assets),
                liabilities: formatMoney(report.total_liabilities),
                equity: formatMoney(report.total_equity),
              })}
            </Typography>
          </Box>
          <ReportLineTable
            sections={sections}
            ariaLabel={t('finance.statutory.balanceSheet.title')}
          />
        </>
      )}
    </PageContainer>
  );
}

function getErrorMessage(error: unknown): string | undefined {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  if (responseMessage) return responseMessage;
  return error instanceof Error ? error.message : undefined;
}
