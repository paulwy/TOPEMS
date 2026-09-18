import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RD_PATHS } from '@/modules/rd/config';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { Edit, History, CheckCircle } from 'lucide-react';
import { DetailPageTemplate, type SectionConfig, type PageAction } from '@/components/templates';
import { formulaApi } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const RsFormulaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const formulaQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA(id || ''),
    queryFn: async () => {
      const response = await formulaApi.getFormula(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_formula_detail_page.k0'));
      }
      return response.data;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const versionsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA_VERSIONS(id || ''),
    queryFn: async () => {
      const response = await formulaApi.listVersions(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_formula_detail_page.k1'));
      }
      return response.data;
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const approveMutation = useMutation({
    mutationFn: async (formulaId: string) => {
      const response = await formulaApi.approveFormula(formulaId);
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_formula_detail_page.k2'));
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.RD.FORMULA(id || ''), data);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.FORMULA_VERSIONS(id || ''),
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_formula_detail_page.k3'),
        message: i18n.t('rd.rs_formula_detail_page.k4'),
      });
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_formula_detail_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_formula_detail_page.k5'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_formula_detail_page.k6'),
      });
    },
  });
  const formula = formulaQuery.data || null;
  const versions = versionsQuery.data || [];
  const loading = formulaQuery.isLoading || versionsQuery.isLoading;
  const error = formulaQuery.error ? i18n.t('rd.rs_formula_detail_page.k7') : null;
  const approving = approveMutation.isPending;
  React.useEffect(() => {
    if (formulaQuery.error) {
      logger.error(i18n.t('pages.rs_formula_detail_page.k1'), formulaQuery.error);
    }
  }, [formulaQuery.error]);
  const handleApprove = () => {
    if (!formula || approving) return;
    approveMutation.mutate(formula.id);
  };
  const handleEdit = () => {
    if (formula) {
      navigate(`${RD_PATHS.formula}/${formula.id}/edit`);
    }
  };
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return i18n.t('rd.rs_formula_detail_page.k11');
      case 'testing':
        return i18n.t('rd.rs_formula_detail_page.k12');
      case 'draft':
        return i18n.t('rd.rs_formula_detail_page.k13');
      default:
        return status;
    }
  };
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }
  if (error || !formula) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>{error || i18n.t('rd.rs_formula_detail_page.k14')}</Alert>
      </Box>
    );
  }
  const sections: SectionConfig[] = [
    {
      id: 'description',
      title: i18n.t('rd.rs_formula_detail_page.k15'),
      content: (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formula.description || i18n.t('rd.rs_formula_detail_page.k16')}
        </Typography>
      ),
    },
    {
      id: 'process_steps',
      title: i18n.t('rd.rs_formula_detail_page.k17'),
      content: (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formula.process_steps || i18n.t('rd.rs_formula_detail_page.k18')}
        </Typography>
      ),
    },
    {
      id: 'components',
      title: i18n.t('rd.rs_formula_detail_page.k19'),
      content: (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k20')}</TableCell>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k21')}</TableCell>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k22')}</TableCell>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k23')}</TableCell>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k24')}</TableCell>
                <TableCell>{i18n.t('rd.rs_formula_detail_page.k25')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formula.ingredients && formula.ingredients.length > 0 ? (
                formula.ingredients.map((comp, index) => (
                  <TableRow key={comp.id || index}>
                    <TableCell>{comp.name}</TableCell>
                    <TableCell>{comp.quantity}</TableCell>
                    <TableCell>{comp.unit || '-'}</TableCell>
                    <TableCell>{comp.purity || '-'}</TableCell>
                    <TableCell>{comp.supplier || '-'}</TableCell>
                    <TableCell>{comp.notes || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align='center'
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.rs_formula_detail_page.k0')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
  ];
  const sidebar = (
    <Stack spacing={2}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 'bold' }}
      >
        {i18n.t('pages.rs_formula_detail_page.k1')}
      </Typography>
      {versions.length > 0 ? (
        versions.map((v, index) => (
          <Paper
            key={v.id || index}
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between' }}
            >
              <Chip
                label={v.version}
                size='small'
              />
              <Typography variant='caption'>{v.created_at}</Typography>
            </Stack>
            <Typography
              variant='body2'
              sx={{ mt: 1 }}
            >
              {v.changes || i18n.t('rd.rs_formula_detail_page.k26')}
            </Typography>
            {v.approved_by && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 1 }}
              >
                {i18n.t('pages.rs_formula_detail_page.k2')}: {v.approved_by}
              </Typography>
            )}
          </Paper>
        ))
      ) : (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {i18n.t('pages.rs_formula_detail_page.k3')}
        </Typography>
      )}
    </Stack>
  );
  const infoCard = {
    title: formula.name,
    subtitle: `${i18n.t('pages.rs_formula_detail_page.k2')}${formula.code}`,
    tags: [formula.version, getStatusLabel(formula.status)],
    stats: [
      { label: i18n.t('rd.rs_formula_detail_page.k27'), value: formula.created_by },
      { label: i18n.t('rd.rs_formula_detail_page.k28'), value: formula.created_at },
      { label: i18n.t('rd.rs_formula_detail_page.k29'), value: formula.updated_at },
      { label: i18n.t('rd.rs_formula_detail_page.k30'), value: formula.effective_date || '-' },
      { label: i18n.t('rd.rs_formula_detail_page.k31'), value: formula.expiration_date || '-' },
    ],
  };
  const actions: PageAction[] = [
    {
      label: i18n.t('rd.rs_formula_detail_page.k32'),
      icon: <History size={18} />,
      onClick: () => {},
      variant: 'outlined' as const,
    },
    {
      label: i18n.t('rd.rs_formula_detail_page.k33'),
      icon: <Edit size={18} />,
      onClick: handleEdit,
      variant: 'contained' as const,
    },
    formula.status !== 'approved' && {
      label: i18n.t('rd.rs_formula_detail_page.k34'),
      icon: <CheckCircle size={18} />,
      onClick: handleApprove,
      variant: 'contained' as const,
      color: 'success' as const,
      loading: approving,
    },
  ].filter(Boolean) as PageAction[];
  return (
    <PageContainer
      title={formula.name}
      subtitle={`${i18n.t('pages.rs_formula_detail_page.k3')}${formula.code}`}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.formula}
        detailItemName={formula?.name || formula?.code || i18n.t('rd.rs_formula_detail_page.k35')}
        infoCard={infoCard}
        sections={sections}
        sidebar={sidebar}
        actions={actions}
      />
    </PageContainer>
  );
};
export default RsFormulaDetailPage;
