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
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter, type CrudApi } from '@/schema/crudPageAdapter';
import { materialReturnSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { MaterialReturn, MaterialReturnItem } from '@/api/mes';
import { Undo2, FileText, Package } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(
  mesApi.materialReturns as unknown as CrudApi<MaterialReturn>,
  {
    itemsField: 'returns',
  }
);
const MaterialReturnPage: React.FC = () => {
  const renderDetailContent = (row: Record<string, unknown>) => {
    const ret = row as unknown as MaterialReturn;
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
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k0')}</InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {ret.return_no}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k1')}</InputLabel>
            <Box component='span'>{ret.order_number || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k2')}</InputLabel>
            <Box component='span'>{ret.operator}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k3')}</InputLabel>
            <Box component='span'>
              {ret.return_time ? new Date(ret.return_time).toLocaleString('zh-CN') : '-'}
            </Box>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k4')}</InputLabel>
            <Box component='span'>{ret.reason || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_return_page.k5')}</InputLabel>
            <Box component='span'>{new Date(ret.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
        </Box>
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {i18n.t('pages.material_return_page.k0')}{ret.items?.length || 0})
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('mes.material_return_page.k6')}</TableCell>
                  <TableCell>{i18n.t('mes.material_return_page.k7')}</TableCell>
                  <TableCell>{i18n.t('mes.material_return_page.k8')}</TableCell>
                  <TableCell>{i18n.t('mes.material_return_page.k9')}</TableCell>
                  <TableCell>{i18n.t('mes.material_return_page.k10')}</TableCell>
                  <TableCell>{i18n.t('mes.material_return_page.k11')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(ret.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                      sx={{ color: 'text.secondary', py: 3 }}
                    >
                      {i18n.t('pages.material_return_page.k0')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (ret.items as MaterialReturnItem[]).map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.material_code}</TableCell>
                      <TableCell>{item.material_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit || '-'}</TableCell>
                      <TableCell>{item.batch_no || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    );
  };
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Undo2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[700]} 100%)`,
      }}
    >
      <CrudPage
        schema={materialReturnSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.material_return_page.k12') }]}
        detailMaxWidth='lg'
        detailContent={renderDetailContent}
        headerContent={(rows) => {
          const pending = rows.filter((r) => r.status === 'pending').length;
          const approved = rows.filter((r) => r.status === 'approved').length;
          const returned = rows.filter((r) => r.status === 'returned').length;
          const total = rows.length;
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FileText
                    size={18}
                    sx={{ color: 'warning.700' }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.material_return_page.k1')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'warning.700' }}
                >
                  {pending}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  {i18n.t('pages.material_return_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {approved}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Undo2
                    size={18}
                    sx={{ color: 'success.700' }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.material_return_page.k3')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.700' }}
                >
                  {returned}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Package
                    size={18}
                    sx={{ color: 'text.secondary' }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.material_return_page.k4')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </PageContainer>
  );
};
export default MaterialReturnPage;