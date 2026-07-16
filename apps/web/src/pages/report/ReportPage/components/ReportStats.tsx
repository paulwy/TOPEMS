import React from 'react';
import { Box, Typography } from '@mui/material';
import { FileText } from 'lucide-react';
import type { ReportData, ReportTypeInfo } from '@/api/report';
import { getModuleFromReportType } from '../utils';

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
              报表总数
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
              bgcolor: 'primary.light',
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
              RS 模块
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'warning.main' }}
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
              bgcolor: 'warning.light',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'warning.main' }} />
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
              LIMS 模块
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'info.main' }}
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
              bgcolor: 'info.light',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'info.main' }} />
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
              QMS 模块
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'success.main' }}
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
              bgcolor: 'success.light',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'success.main' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportStats;
