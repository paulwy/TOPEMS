import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { X, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

interface ReportHeaderProps {
  onShowBuilder: () => void;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ onShowBuilder }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderBottom: 1,
        borderColor: 'grey.200',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
              sx={{
                p: 1,
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.100' },
                borderRadius: 3,
              }}
            >
              <X sx={{ width: 20, height: 20 }} />
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
                }}
              >
                <FileText
                  sx={{
                    width: 24,
                    height: 24,
                    color: 'common.white',
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700, color: 'grey.900' }}
                >
                  {i18n.t('pages.report_header.k0')}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.500' }}
                >
                  Report Center
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              onClick={onShowBuilder}
              variant='contained'
              startIcon={<Plus sx={{ width: 16, height: 16 }} />}
              sx={{ borderRadius: 3, textTransform: 'none' }}
            >
              {i18n.t('pages.report_header.k1')}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportHeader;
