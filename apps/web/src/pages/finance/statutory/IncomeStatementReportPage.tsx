import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reportApi } from '@/api/finance/report';
import type { ApiResponse, StatutoryIncomeStatement } from '@/types/finance';
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

async function fetchIncomeStatement(params: {
  company_id: string;
  period: string;
}): Promise<ReportOutcome<StatutoryIncomeStatement>> {
  try {
    const response = await reportApi.generateIncomeStatement(params);
    const statement = (response as ApiResponse<{ data: StatutoryIncomeStatement }>).data?.data;
    if (!statement) throw new Error('income statement response missing data');
    return { report: statement, checks: [], unposted: statement.unposted, conflict: false };
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

export default function IncomeStatementReportPage() {
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(currentMonth);

  const reportQuery = useQuery({
    queryKey: ['finance', 'statutory', 'income-statement', companyId, period],
    queryFn: () => fetchIncomeStatement({ company_id: companyId, period }),
    enabled: !!companyId && !!period,
    retry: false,
  });

  const outcome = reportQuery.data;
  const report = outcome?.report ?? null;
  const checks = outcome?.checks ?? [];
  const unposted = outcome?.unposted ?? null;
  const isEmpty =
    !!report &&
    isZeroAmount(report.total_revenue) &&
    isZeroAmount(report.total_expense) &&
    isZeroAmount(report.net_income);

  const sections: ReportSection[] = report
    ? [
        {
          key: 'revenues',
          title: t('finance.statutory.incomeStatement.sectionRevenue'),
          rows: report.revenues,
          totalLabel: t('finance.statutory.incomeStatement.totalRevenue'),
          total: report.total_revenue,
        },
        {
          key: 'expenses',
          title: t('finance.statutory.incomeStatement.sectionExpense'),
          rows: report.expenses,
          totalLabel: t('finance.statutory.incomeStatement.totalExpense'),
          total: report.total_expense,
        },
      ]
    : [];

  return (
    <PageContainer
      maxWidth='xl'
      title={t('finance.statutory.incomeStatement.title')}
      subtitle={t('finance.statutory.incomeStatement.subtitle')}
    >
      <StatutoryReportFilters
        companyId={companyId}
        period={period}
        onCompanyChange={setCompanyId}
        onPeriodChange={setPeriod}
      />

      {reportQuery.isLoading && (
        <ReportLoading label={t('finance.statutory.incomeStatement.loading')} />
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
          title={t('finance.statutory.incomeStatement.emptyTitle')}
          description={t('finance.statutory.incomeStatement.emptyDescription')}
        />
      )}

      {!reportQuery.isLoading && !reportQuery.isError && report && !isEmpty && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.statutory.incomeStatement.equation', {
                revenue: formatMoney(report.total_revenue),
                expense: formatMoney(report.total_expense),
                net: formatMoney(report.net_income),
              })}
            </Typography>
          </Box>
          <ReportLineTable
            sections={sections}
            ariaLabel={t('finance.statutory.incomeStatement.title')}
            summary={{
              label: t('finance.statutory.incomeStatement.netIncome'),
              value: report.net_income,
            }}
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
