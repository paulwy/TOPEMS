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
import { materialIssueSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { MaterialIssue, MaterialIssueItem } from '@/api/mes';
import { PackageOpen, FileText } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(
  mesApi.materialIssues as unknown as CrudApi<MaterialIssue>,
  {
    itemsField: 'issues',
  }
);
const MaterialIssuePage: React.FC = () => {
  const renderDetailContent = (row: Record<string, unknown>) => {
    const issue = row as unknown as MaterialIssue;
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
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k0')}</InputLabel>
            <Box
              component='span'
              sx={{ fontWeight: 500 }}
            >
              {issue.issue_no}
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k1')}</InputLabel>
            <Box component='span'>{issue.order_number || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k2')}</InputLabel>
            <Box component='span'>{issue.operator}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k3')}</InputLabel>
            <Box component='span'>
              {issue.issue_time ? new Date(issue.issue_time).toLocaleString('zh-CN') : '-'}
            </Box>
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k4')}</InputLabel>
            <Box component='span'>{issue.remark || '-'}</Box>
          </Box>
          <Box>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>{i18n.t('mes.material_issue_page.k5')}</InputLabel>
            <Box component='span'>{new Date(issue.created_at).toLocaleString('zh-CN')}</Box>
          </Box>
        </Box>
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            物料明细 ({issue.items?.length || 0})
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('mes.material_issue_page.k6')}</TableCell>
                  <TableCell>{i18n.t('mes.material_issue_page.k7')}</TableCell>
                  <TableCell>{i18n.t('mes.material_issue_page.k8')}</TableCell>
                  <TableCell>{i18n.t('mes.material_issue_page.k9')}</TableCell>
                  <TableCell>{i18n.t('mes.material_issue_page.k10')}</TableCell>
                  <TableCell>{i18n.t('mes.material_issue_page.k11')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(issue.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                      sx={{ color: 'text.secondary', py: 3 }}
                    >
                      {i18n.t('pages.material_issue_page.k0')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (issue.items as MaterialIssueItem[]).map((item, index) => (
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
        pageIcon: <PackageOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={materialIssueSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.material_issue_page.k12') }]}
        detailMaxWidth='lg'
        detailContent={renderDetailContent}
        headerContent={(rows) => {
          const pending = rows.filter((i) => i.status === 'pending').length;
          const approved = rows.filter((i) => i.status === 'approved').length;
          const issued = rows.filter((i) => i.status === 'issued').length;
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
                    {i18n.t('pages.material_issue_page.k1')}
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
                  {i18n.t('pages.material_issue_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {approved}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  {i18n.t('pages.material_issue_page.k3')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.700' }}
                >
                  {issued}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PackageOpen
                    size={18}
                    sx={{ color: 'text.secondary' }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.material_issue_page.k4')}
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
export default MaterialIssuePage;