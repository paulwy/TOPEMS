import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { DollarSign, TrendingDown, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { qualityCostSchema } from '@/schemas/qms';
import { qualityCostApi } from '@/api/qms';
import type { QualityCost } from '@/api/qms';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const apiAdapter = createCrudPageAdapter<QualityCost>({
  list: qualityCostApi.listQualityCosts as any,
  create: qualityCostApi.createQualityCost as any,
  update: qualityCostApi.updateQualityCost as any,
  delete: qualityCostApi.deleteQualityCost as any,
});

function QualityCostStatsCards({ rows }: { rows: QualityCost[] }) {
  const stats = {
    total: rows.reduce((sum, c) => sum + (c.amount || 0), 0),
    prevention: rows
      .filter((c) => c.costType === 'prevention')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
    appraisal: rows
      .filter((c) => c.costType === 'appraisal')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
    internal: rows
      .filter((c) => c.costType === 'internal_failure')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
    external: rows
      .filter((c) => c.costType === 'external_failure')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 3,
        mb: 4,
      }}
    >
      <Card
        sx={{
          background: 'linear-gradient(135deg, primary.main 0%, primary.dark 100%)',
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: 'info.light', fontSize: '0.875rem' }}>总质量成本</Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                ¥{stats.total.toLocaleString()}
              </Typography>
            </Box>
            <DollarSign sx={{ width: 40, height: 40, color: 'info.light' }} />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: 'success.light', fontSize: '0.875rem' }}>
                预防成本
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                ¥{stats.prevention.toLocaleString()}
              </Typography>
            </Box>
            <CheckCircle sx={{ width: 40, height: 40, color: 'success.light' }} />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: 'primary.light', fontSize: '0.875rem' }}>
                鉴定成本
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                ¥{stats.appraisal.toLocaleString()}
              </Typography>
            </Box>
            <BarChart3 sx={{ width: 40, height: 40, color: 'primary.light' }} />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: 'warning.light', fontSize: '0.875rem' }}>
                内部损失
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                ¥{stats.internal.toLocaleString()}
              </Typography>
            </Box>
            <TrendingDown sx={{ width: 40, height: 40, color: 'warning.light' }} />
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
          color: 'white',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: 'error.light', fontSize: '0.875rem' }}>外部损失</Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mt: 0.5 }}
              >
                ¥{stats.external.toLocaleString()}
              </Typography>
            </Box>
            <AlertTriangle sx={{ width: 40, height: 40, color: 'error.light' }} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

const QmsQualityCostPage: React.FC = () => {
  return (
    <CrudPage
      schema={qualityCostSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: '质量成本分析' }]}
      headerContent={(rows) => <QualityCostStatsCards rows={rows as QualityCost[]} />}
      detailMaxWidth='lg'
    />
  );
};

export default QmsQualityCostPage;
