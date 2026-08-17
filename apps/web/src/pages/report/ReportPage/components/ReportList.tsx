import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { FileText, Eye, Download, Trash2, Calendar, Columns } from 'lucide-react';
import type { ReportData, ReportTypeInfo } from '@/api/report';
import { getModuleColor, getFormatIcon, getModuleFromReportType } from '../utils';
import i18n from '@/i18n';

interface ReportListProps {
  reports: ReportData[];
  reportTypes: ReportTypeInfo[];
  onShowBuilder: () => void;
  onView: (report: ReportData) => void;
  onExport: (report: ReportData) => void;
  onDelete: (id: string) => void;
}

const ReportList: React.FC<ReportListProps> = ({
  reports,
  reportTypes,
  onShowBuilder,
  onView,
  onExport,
  onDelete,
}) => {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'grey.200' }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, color: 'grey.900' }}
        >
          {i18n.t('pages.report_list.k7')}
        </Typography>
      </Box>
      <Box
        sx={{
          '& > div:not(:last-child)': {
            borderBottom: 1,
            borderColor: 'grey.200',
          },
        }}
      >
        {reports.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <FileText
              sx={{
                width: 64,
                height: 64,
                color: 'grey.300',
                mx: 'auto',
                mb: 2,
              }}
            />
            <Typography sx={{ color: 'grey.600' }}>{i18n.t('pages.report_list.k0')}</Typography>
            <Button
              onClick={onShowBuilder}
              variant='contained'
              sx={{ mt: 2, borderRadius: 3 }}
            >
              {i18n.t('pages.report_list.k1')}
            </Button>
          </Box>
        ) : (
          reports.map((report) => (
            <Box
              key={report.id}
              sx={{ p: 3, '&:hover': { bgcolor: 'grey.50' } }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, color: 'grey.900' }}
                    >
                      {report.config.title}
                    </Typography>
                    <Chip
                      label={getModuleFromReportType(report.config.report_type, reportTypes)}
                      color={getModuleColor(
                        getModuleFromReportType(report.config.report_type, reportTypes)
                      )}
                      size='small'
                      sx={{ borderRadius: '50%' }}
                    />
                    <Chip
                      label={`${report.row_count} ${i18n.t('pages.report_list.k5')}`}
                      size='small'
                      sx={{
                        bgcolor: 'grey.100',
                        color: 'grey.700',
                        borderRadius: '50%',
                      }}
                    />
                  </Box>
                  {report.config.description && (
                    <Typography sx={{ color: 'grey.600', mb: 2 }}>
                      {report.config.description}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 14,
                      color: 'grey.600',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Calendar sx={{ width: 16, height: 16 }} />
                      {i18n.t('pages.report_list.k2')}:{' '}
                      {new Date(report.created_at).toLocaleDateString('zh-CN')}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {getFormatIcon(report.config.format)}
                      <span style={{ marginLeft: 4 }}>{report.config.format.toUpperCase()}</span>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Columns sx={{ width: 16, height: 16 }} />
                      {report.config.columns.length} {i18n.t('pages.report_list.k6')}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    onClick={() => onView(report)}
                    size='small'
                    startIcon={<Eye sx={{ width: 16, height: 16 }} />}
                    sx={{
                      color: 'info.main',
                      '&:hover': { bgcolor: 'info.light' },
                      borderRadius: 3,
                    }}
                  >
                    {i18n.t('pages.report_list.k3')}
                  </Button>
                  <Button
                    onClick={() => onExport(report)}
                    size='small'
                    startIcon={<Download sx={{ width: 16, height: 16 }} />}
                    sx={{
                      color: 'success.main',
                      '&:hover': { bgcolor: 'success.light' },
                      borderRadius: 3,
                    }}
                  >
                    {i18n.t('pages.report_list.k4')}
                  </Button>
                  <Button
                    onClick={() => onDelete(report.id)}
                    size='small'
                    sx={{
                      color: 'error.main',
                      '&:hover': { bgcolor: 'error.light' },
                      borderRadius: 3,
                      p: 1,
                      minWidth: 'auto',
                    }}
                  >
                    <Trash2 sx={{ width: 20, height: 20 }} />
                  </Button>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default ReportList;
