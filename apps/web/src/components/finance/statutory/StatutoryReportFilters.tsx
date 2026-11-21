import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { companyApi } from '@/api/hrm/company';

interface StatutoryReportFiltersProps {
  companyId: string;
  period: string;
  onCompanyChange: (companyId: string) => void;
  onPeriodChange: (period: string) => void;
}

/**
 * 公司 + 期间过滤器。
 * company_id 必传：未选择公司时不发请求，页面也不会用“全部公司”兜底。
 */
export function StatutoryReportFilters({
  companyId,
  period,
  onCompanyChange,
  onPeriodChange,
}: StatutoryReportFiltersProps) {
  const { t } = useTranslation();
  const companiesQuery = useQuery({
    queryKey: ['hrm', 'companies', 'statutory-report-options'],
    queryFn: async () => {
      const response = await companyApi.list({ page: 1, page_size: 200 });
      return response.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const companies = companiesQuery.data ?? [];

  useEffect(() => {
    if (!companyId && companies.length > 0) {
      onCompanyChange(companies[0].id);
    }
  }, [companyId, companies, onCompanyChange]);

  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, mb: 2 }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl
          size='small'
          sx={{ minWidth: 280 }}
          error={!companyId}
        >
          <InputLabel id='statutory-report-company-label'>
            {t('finance.statutory.filters.company')}
          </InputLabel>
          <Select
            labelId='statutory-report-company-label'
            label={t('finance.statutory.filters.company')}
            value={companiesQuery.isLoading ? '' : companyId}
            onChange={(event) => onCompanyChange(event.target.value)}
            disabled={companiesQuery.isLoading}
          >
            {companies.map((company) => (
              <MenuItem
                key={company.id}
                value={company.id}
              >
                {company.code ? `${company.code} ${company.name}` : company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size='small'
          type='month'
          label={t('finance.statutory.filters.period')}
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 180 }}
        />

        {companiesQuery.isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Box
              component='span'
              sx={{ color: 'text.secondary', typography: 'body2' }}
            >
              {t('finance.statutory.filters.companyLoading')}
            </Box>
          </Box>
        )}

        {companiesQuery.isError && (
          <Alert
            severity='error'
            action={
              <Button
                color='inherit'
                size='small'
                onClick={() => companiesQuery.refetch()}
              >
                {t('finance.statutory.filters.retry')}
              </Button>
            }
          >
            {t('finance.statutory.filters.companyError')}
          </Alert>
        )}

        {!companiesQuery.isLoading && !companiesQuery.isError && companies.length === 0 && (
          <Alert severity='warning'>{t('finance.statutory.filters.noCompany')}</Alert>
        )}
      </Box>
    </Paper>
  );
}
