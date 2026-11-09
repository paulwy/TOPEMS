import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { BalanceCheckIssue, UnpostedInfo } from '@/types/finance';
import { formatMoney } from './reportFormat';

export function ReportLoading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 8 }}>
      <CircularProgress size={24} />
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label ?? t('finance.statutory.common.loading')}
      </Typography>
    </Box>
  );
}

export function ReportError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert
      severity='error'
      action={
        onRetry ? (
          <Button
            color='inherit'
            size='small'
            onClick={onRetry}
          >
            {t('finance.statutory.common.retry')}
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{t('finance.statutory.common.errorTitle')}</AlertTitle>
      {message || t('finance.statutory.common.errorFallback')}
    </Alert>
  );
}

export function ReportEmpty({ title, description }: { title?: string; description?: string }) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant='subtitle1'>
        {title ?? t('finance.statutory.common.emptyTitle')}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1 }}
      >
        {description ?? t('finance.statutory.common.emptyDescription')}
      </Typography>
    </Box>
  );
}

/** 未过账凭证只提示，不混入表内；为 0 时不占版面。 */
export function UnpostedBanner({ unposted }: { unposted: UnpostedInfo }) {
  const { t } = useTranslation();
  if (unposted.count <= 0) return null;
  return (
    <Alert
      severity='warning'
      sx={{ mb: 2 }}
    >
      {t('finance.statutory.common.unposted', {
        count: unposted.count,
        amount: formatMoney(unposted.amount),
      })}
    </Alert>
  );
}

/** 409：展示勾稽差异明细，而不是弹一个“保存失败”了事。 */
export function ChecksAlert({ checks }: { checks: BalanceCheckIssue[] }) {
  const { t } = useTranslation();
  return (
    <Alert
      severity='error'
      sx={{ mb: 2 }}
    >
      <AlertTitle>{t('finance.statutory.common.checksTitle')}</AlertTitle>
      {checks.length === 0 ? (
        <Typography variant='body2'>{t('finance.statutory.common.checksEmpty')}</Typography>
      ) : (
        <TableContainer>
          <Table
            size='small'
            aria-label={t('finance.statutory.common.checksTitle')}
          >
            <TableHead>
              <TableRow>
                <TableCell>{t('finance.statutory.common.checkItem')}</TableCell>
                <TableCell align='right'>{t('finance.statutory.common.expected')}</TableCell>
                <TableCell align='right'>{t('finance.statutory.common.actual')}</TableCell>
                <TableCell align='right'>{t('finance.statutory.common.difference')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.map((check) => (
                <TableRow key={check.code}>
                  <TableCell>
                    <Typography variant='body2'>{check.message || check.code}</Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {check.code}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{formatMoney(check.expected)}</TableCell>
                  <TableCell align='right'>{formatMoney(check.actual)}</TableCell>
                  <TableCell align='right'>{formatMoney(check.difference)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Alert>
  );
}
