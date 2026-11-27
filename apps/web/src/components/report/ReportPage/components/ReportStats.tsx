import React from 'react';
import { Box, Typography } from '@mui/material';
import { FileText } from 'lucide-react';
import type { ReportData, ReportTypeInfo } from '@/api/report';
import { getModuleFromReportType } from '@/components/report/ReportPageUtils';
import i18n from '@/i18n';

interface ReportStatsProps {
  reports: ReportData[];
  reportTypes: ReportTypeInfo[];
}

const ReportStats: React.FC<ReportStatsProps> = ({ reports, reportTypes }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3,
        mb: 4,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 3,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 0.5 }}
            >
              {i18n.t('pages.report_stats.k0')}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'grey.900' }}
            >
              {reports.length}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'primary.main' }} />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 3,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 0.5 }}
            >
              {i18n.t('pages.report_stats.rs_1')}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'warning.700' }}
            >
              {
                reports.filter(
                  (r) => getModuleFromReportType(r.config.report_type, reportTypes) === 'RS'
                ).length
              }
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'warning.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'warning.700' }} />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 3,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 0.5 }}
            >
              {i18n.t('pages.report_stats.lims_2')}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'info.700' }}
            >
              {
                reports.filter(
                  (r) => getModuleFromReportType(r.config.report_type, reportTypes) === 'LIMS'
                ).length
              }
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'info.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'info.700' }} />
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 3,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 0.5 }}
            >
              {i18n.t('pages.report_stats.qms_3')}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'success.700' }}
            >
              {
                reports.filter(
                  (r) => getModuleFromReportType(r.config.report_type, reportTypes) === 'QMS'
                ).length
              }
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'success.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'success.700' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportStats;
