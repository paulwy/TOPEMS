import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputLabel,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { materialBomSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { MaterialBom, MaterialBomItem } from '@/api/mes';
import { Package } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.boms, {
  itemsField: 'boms',
});
const MaterialBOMPage: React.FC = () => {
  const renderDetailContent = (row: Record<string, unknown>) => {
    const bom = row as unknown as MaterialBom;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k0')}</InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {bom.product_code}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k1')}</InputLabel>
            <Box component='span'>{bom.product_name}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k2')}</InputLabel>
            <Box component='span'>{bom.version || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k3')}</InputLabel>
            <Box component='span'>{bom.status}</Box>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k4')}</InputLabel>
            <Box component='span'>{bom.description || '-'}</Box>
          </Box>
        </Box>
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {i18n.t('pages.material_bom_page.bom_0')}{bom.items?.length || 0})
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('mes.material_bom_page.k5')}</TableCell>
                  <TableCell>{i18n.t('mes.material_bom_page.k6')}</TableCell>
                  <TableCell>{i18n.t('mes.material_bom_page.k7')}</TableCell>
                  <TableCell>{i18n.t('mes.material_bom_page.k8')}</TableCell>
                  <TableCell>{i18n.t('mes.material_bom_page.k9')}</TableCell>
                  <TableCell>{i18n.t('mes.material_bom_page.k10')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(bom.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                      sx={{ color: 'text.secondary', py: 3 }}
                    >
                      {i18n.t('pages.material_bom_page.k0')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (bom.items as MaterialBomItem[]).map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{item.sequence || index + 1}</TableCell>
                      <TableCell>{item.material_code}</TableCell>
                      <TableCell>{item.material_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit || '-'}</TableCell>
                      <TableCell>{item.remark || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k11')}</InputLabel>
            <Box component='span'>{new Date(bom.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_bom_page.k12')}</InputLabel>
            <Box component='span'>{new Date(bom.updated_at).toLocaleString('zh-CN')}</Box>
          </Box>
        </Box>
      </Box>
    );
  };
  const headerContent = (rows: Record<string, unknown>[]) => {
    const boms = rows as unknown as MaterialBom[];
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Package
              size={18}
              sx={{ color: 'secondary.700' }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {i18n.t('pages.material_bom_page.bom_1')}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'secondary.700' }}
          >
            {boms.length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            {i18n.t('pages.material_bom_page.k2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.700' }}
          >
            {boms.filter((b) => b.status === 'active').length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            {i18n.t('pages.material_bom_page.k3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.700' }}
          >
            {boms.filter((b) => b.status === 'inactive').length}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            {i18n.t('pages.material_bom_page.k4')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {boms.filter((b) => b.status === 'draft').length}
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
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={materialBomSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.material_bom_page.bom_13') }]}
        detailMaxWidth='lg'
        detailContent={renderDetailContent}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};
export default MaterialBOMPage;