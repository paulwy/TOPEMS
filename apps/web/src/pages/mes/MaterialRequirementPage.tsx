import React from 'react';
import { Box, Typography, InputLabel } from '@mui/material';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { materialRequirementSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { MaterialRequirement } from '@/api/mes';
import { Calculator } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.materialRequirements, {
  itemsField: 'requirements',
});
const MaterialRequirementPage: React.FC = () => {
  const renderDetailContent = (row: Record<string, unknown>) => {
    const req = row as unknown as MaterialRequirement;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k0')}
            </InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {req.mrp_no}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k1')}
            </InputLabel>
            <Box component='span'>{req.order_number || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k2')}
            </InputLabel>
            <Box component='span'>{req.product_code}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k3')}
            </InputLabel>
            <Box component='span'>{req.product_name}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k4')}
            </InputLabel>
            <Box component='span'>{req.material_code}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k5')}
            </InputLabel>
            <Box component='span'>{req.material_name}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k6')}
            </InputLabel>
            <Box component='span'>{req.specification || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k7')}
            </InputLabel>
            <Box component='span'>{req.unit || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k8')}
            </InputLabel>
            <Box component='span'>{req.required_quantity}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k9')}
            </InputLabel>
            <Box component='span'>{req.available_quantity || 0}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k10')}
            </InputLabel>
            <Box
              component='span'
              sx={{
                color: (req.shortfall_quantity || 0) > 0 ? 'error.main' : 'success.main',
                fontWeight: 500,
              }}
            >
              {req.shortfall_quantity || 0}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k11')}
            </InputLabel>
            <Box component='span'>
              {req.required_date ? new Date(req.required_date).toLocaleDateString('zh-CN') : '-'}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k12')}
            </InputLabel>
            <Box component='span'>{req.priority || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k13')}
            </InputLabel>
            <Box component='span'>{req.status}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k14')}
            </InputLabel>
            <Box component='span'>{req.source_type || '-'}</Box>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k15')}
            </InputLabel>
            <Box component='span'>{req.remark || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k16')}
            </InputLabel>
            <Box component='span'>{new Date(req.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {i18n.t('mes.material_requirement_page.k17')}
            </InputLabel>
            <Box component='span'>{new Date(req.updated_at).toLocaleString('zh-CN')}</Box>
          </Box>
        </Box>
      </Box>
    );
  };
  const headerContent = (rows: Record<string, unknown>[]) => {
    const requirements = rows as unknown as MaterialRequirement[];
    const total = requirements.length;
    const draft = requirements.filter((r) => r.status === 'draft').length;
    const confirmed = requirements.filter((r) => r.status === 'confirmed').length;
    const released = requirements.filter((r) => r.status === 'released').length;
    const totalRequired = requirements.reduce((sum, r) => sum + r.required_quantity, 0);
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.material_requirement_page.k0')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.material_requirement_page.k1')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {draft}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.material_requirement_page.k2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {confirmed}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.material_requirement_page.k3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {released}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.material_requirement_page.k4')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'secondary.700' }}
          >
            {totalRequired}
          </Typography>
        </Box>
      </Box>
    );
  };
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Calculator style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={materialRequirementSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.material_requirement_page.k18') }]}
        detailMaxWidth='md'
        detailContent={renderDetailContent}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};
export default MaterialRequirementPage;
