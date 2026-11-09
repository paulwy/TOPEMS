import { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reportApi } from '@/api/finance/report';
import type { AccountBalanceReport, ApiResponse, UnpostedInfo } from '@/types/finance';
import { PageContainer } from '@/components/common';
import { StatutoryReportFilters } from './StatutoryReportFilters';
import {
  ChecksAlert,
  ReportEmpty,
  ReportError,
  ReportLoading,
  UnpostedBanner,
} from './ReportFeedback';
import { allZeroAmounts, currentMonth, formatMoney } from './reportFormat';
import { getConflictPayload, type ReportOutcome } from './reportTypes';

async function fetchAccountBalance(params: {
  company_id: string;
  period: string;
}): Promise<ReportOutcome<AccountBalanceReport>> {
  try {
    const response: ApiResponse<AccountBalanceReport> =
      await reportApi.getAccountBalanceReportV2(params);
    if (!response.data) throw new Error('account balance response missing data');
    return {
      report: response.data,
      checks: response.data.checks ?? [],
      unposted:
        (response.data as AccountBalanceReport & { unposted?: UnpostedInfo }).unposted ?? null,
      conflict: false,
    };
  } catch (error) {
    const payload = getConflictPayload<AccountBalanceReport>(error);
    if (payload) {
      return {
        report: null,
        checks: payload.checks ?? [],
        unposted: (payload as AccountBalanceReport & { unposted?: UnpostedInfo }).unposted ?? null,
        conflict: true,
      };
    }
    throw error;
  }
}

export default function AccountBalanceReportPage() {
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(currentMonth);

  const reportQuery = useQuery({
    queryKey: ['finance', 'account-balance', companyId, period],
    queryFn: () => fetchAccountBalance({ company_id: companyId, period }),
    enabled: !!companyId && !!period,
    retry: false,
  });

  const outcome = reportQuery.data;
  const checks = outcome?.checks ?? [];
  const report = outcome?.report ?? null;
  // 科目余额表当前契约未下发 unposted；若后端补齐则自动展示，不在此处拼凑。
  const unposted = outcome?.unposted ?? null;
  const isEmpty =
    !!report &&
    (report.items.length === 0 ||
      report.items.every((item) =>
        allZeroAmounts([
          item.opening_debit,
          item.opening_credit,
          item.period_debit,
          item.period_credit,
          item.ytd_debit,
          item.ytd_credit,
          item.closing_debit,
          item.closing_credit,
        ])
      ));

  return (
    <PageContainer
      maxWidth='xl'
      title={t('finance.statutory.accountBalance.title')}
      subtitle={t('finance.statutory.accountBalance.subtitle')}
    >
      <StatutoryReportFilters
        companyId={companyId}
        period={period}
        onCompanyChange={setCompanyId}
        onPeriodChange={setPeriod}
      />

      {reportQuery.isLoading && (
        <ReportLoading label={t('finance.statutory.accountBalance.loading')} />
      )}

      {reportQuery.isError && (
        <ReportError
          message={getErrorMessage(reportQuery.error)}
          onRetry={() => reportQuery.refetch()}
        />
      )}

      {checks.length > 0 && <ChecksAlert checks={checks} />}

      {!reportQuery.isLoading && !reportQuery.isError && isEmpty && (
        <ReportEmpty
          title={t('finance.statutory.accountBalance.emptyTitle')}
          description={t('finance.statutory.accountBalance.emptyDescription')}
        />
      )}

      {!reportQuery.isLoading && !reportQuery.isError && report && !isEmpty && (
        <>
          {unposted && <UnpostedBanner unposted={unposted} />}
          <Paper variant='outlined'>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table
                size='small'
                stickyHeader
                aria-label={t('finance.statutory.accountBalance.title')}
              >
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2}>
                      {t('finance.statutory.accountBalance.accountCode')}
                    </TableCell>
                    <TableCell rowSpan={2}>
                      {t('finance.statutory.accountBalance.accountName')}
                    </TableCell>
                    <TableCell
                      align='center'
                      colSpan={2}
                    >
                      {t('finance.statutory.accountBalance.opening')}
                    </TableCell>
                    <TableCell
                      align='center'
                      colSpan={2}
                    >
                      {t('finance.statutory.accountBalance.periodMovement')}
                    </TableCell>
                    <TableCell
                      align='center'
                      colSpan={2}
                    >
                      {t('finance.statutory.accountBalance.ytd')}
                    </TableCell>
                    <TableCell
                      align='center'
                      colSpan={2}
                    >
                      {t('finance.statutory.accountBalance.closing')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {[0, 1, 2, 3].flatMap((group) => [
                      <TableCell
                        key={`debit-${group}`}
                        align='right'
                      >
                        {t('finance.statutory.accountBalance.debit')}
                      </TableCell>,
                      <TableCell
                        key={`credit-${group}`}
                        align='right'
                      >
                        {t('finance.statutory.accountBalance.credit')}
                      </TableCell>,
                    ])}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.items.map((item) => (
                    <TableRow key={item.account_id}>
                      <TableCell>{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell align='right'>{formatMoney(item.opening_debit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.opening_credit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.period_debit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.period_credit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.ytd_debit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.ytd_credit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.closing_debit)}</TableCell>
                      <TableCell align='right'>{formatMoney(item.closing_credit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 600 } }}>
                    <TableCell colSpan={2}>{t('finance.statutory.accountBalance.total')}</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_opening_debit)}</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_opening_credit)}</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_period_debit)}</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_period_credit)}</TableCell>
                    <TableCell align='right'>—</TableCell>
                    <TableCell align='right'>—</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_closing_debit)}</TableCell>
                    <TableCell align='right'>{formatMoney(report.total_closing_credit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
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
