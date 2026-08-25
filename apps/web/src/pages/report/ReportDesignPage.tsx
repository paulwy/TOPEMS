import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import {
  PenTool as PenToolIcon,
  Table as TableIcon,
  ChartBar as ChartBarIcon,
  Layout as LayoutIcon,
} from 'lucide-react';
import i18n from '@/i18n';
import { designTokens } from '@/theme/tokens';
import { DesignerTemplate } from '@/components/templates/DesignerTemplate';

const ct = designTokens.colors;

const ReportDesignPage: React.FC = () => {
  return (
    <DesignerTemplate
      mode='standard'
      title={i18n.t('pages.report_design_page.k0')}
      subtitle={i18n.t('pages.report_design_page.k1')}
      loading={false}
    >
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 8,
            }}
          >
            <PenToolIcon
              size={64}
              style={{ color: ct.primary.dark }}
            />
            <Typography
              variant='h5'
              sx={{ mt: 4, mb: 2 }}
            >
              {i18n.t('pages.report_design_page.k0')}
            </Typography>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ textAlign: 'center' }}
            >
              {i18n.t('pages.report_design_page.k1')}
            </Typography>

            <Box sx={{ mt: 6, display: 'flex', gap: 3 }}>
              <Button
                variant='contained'
                startIcon={<TableIcon />}
                size='large'
              >
                {i18n.t('pages.report_design_page.k2')}
              </Button>
              <Button
                variant='contained'
                startIcon={<ChartBarIcon />}
                size='large'
              >
                {i18n.t('pages.report_design_page.k3')}
              </Button>
              <Button
                variant='contained'
                startIcon={<LayoutIcon />}
                size='large'
              >
                {i18n.t('pages.report_design_page.k4')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </DesignerTemplate>
  );
};

export default ReportDesignPage;
