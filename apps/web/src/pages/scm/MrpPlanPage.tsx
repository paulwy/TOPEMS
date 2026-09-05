import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, Eye } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { ConfirmDialog } from '@topems/shared-components';

import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { mrpPlanSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  MrpPlan,
  CreateMrpPlanRequest,
  UpdateMrpPlanRequest,
  MrpCalculationResult,
} from '@/api/scm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { SCM_PATHS } from '@/modules/scm/config';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const apiAdapter = createCrudPageAdapter<MrpPlan, CreateMrpPlanRequest, UpdateMrpPlanRequest>(
  scmApi.mrpPlans
);

interface PendingAction {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}

const MrpPlanPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [calculationResult, setCalculationResult] = useState<MrpCalculationResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const invalidatePlans = () =>
    queryClient.invalidateQueries({
      queryKey: [mrpPlanSchema.entity],
      exact: false,
      refetchType: 'active',
    });

  const calculateMutation = useMutation({
    mutationFn: (id: string) => scmApi.mrpPlans.calculate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SCM.OVERVIEW,
        exact: false,
        refetchType: 'active',
      });
      invalidatePlans();
      if (data.success && data.data) {
        setCalculationResult(data.data);
        setShowResultDialog(true);
        addNotification({
          type: 'success',
          title: t('scm.mrp_plan_page.k0'),
          message: data.data.message || i18n.t('scm.mrp_plan_page.l1'),
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('scm.mrp_plan_page.m1'), err);
      addNotification({
        type: 'error',
        title: t('scm.mrp_plan_page.k1'),
        message: i18n.t('scm.mrp_plan_page.m2'),
      });
    },
  });

  const handleCalculate = (plan: MrpPlan) => {
    setPendingAction({
      title: t('scm.mrp_plan_page.k2'),
      message: i18n.t('scm.mrp_plan_page.e1', { v1: plan.plan_name }),
      onConfirm: () => calculateMutation.mutate(plan.id),
    });
  };

  const handleViewSuggestions = (plan: MrpPlan) => {
    window.location.href = `${SCM_PATHS.mrpSuggestion}?plan_id=${plan.id}`;
  };

  const customRowActions: RowAction<MrpPlan>[] = [
    {
      key: 'calculate',
      label: t('scm.mrp_plan_page.k3'),
      icon: <Calculator size={14} />,
      color: 'primary',
      show: (row) => row.status === 'draft',
      onClick: (row) => handleCalculate(row),
    },
    {
      key: 'viewSuggestions',
      label: t('scm.mrp_plan_page.k4'),
      icon: <Eye size={14} />,
      color: 'info',
      show: (row) => row.status === 'calculated',
      onClick: (row) => handleViewSuggestions(row),
    },
  ];

  return (
    <>
      <CrudPage
        schema={mrpPlanSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
        breadcrumbs={[{ label: 'SCM' }, { label: i18n.t('scm.mrp_plan_page.m3') }]}
      />

      <Dialog
        open={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('scm.mrp_plan_page.e1')}</DialogTitle>
        <DialogContent>
          {calculationResult && (
            <Box sx={{ py: 2 }}>
              <Alert
                severity='success'
                sx={{ mb: 2 }}
              >
                {calculationResult.message || i18n.t('scm.mrp_plan_page.l1')}
              </Alert>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {t('scm.mrp_plan_page.k5')}
                  </Box>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                      fontWeight: 500,
                    }}
                  >
                    {calculationResult.totalitems}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {t('scm.mrp_plan_page.k6')}
                  </Box>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                      fontWeight: 500,
                    }}
                  >
                    {calculationResult.total_suggestions}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {t('scm.mrp_plan_page.k7')}
                  </Box>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                      fontWeight: 500,
                      color: 'primary.main',
                    }}
                  >
                    {calculationResult.purchase_suggestions}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      color: 'text.secondary',
                    }}
                  >
                    {t('scm.mrp_plan_page.k8')}
                  </Box>
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                      fontWeight: 500,
                      color: 'success.main',
                    }}
                  >
                    {calculationResult.production_suggestions}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResultDialog(false)}>{t('scm.mrp_plan_page.k9')}</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowResultDialog(false);
              if (calculationResult) {
                window.location.href = `${SCM_PATHS.mrpSuggestion}?plan_id=${calculationResult.plan_id}`;
              }
            }}
          >
            {t('scm.mrp_plan_page.e2')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.onConfirm();
          setPendingAction(null);
        }}
        title={pendingAction?.title || ''}
        message={pendingAction?.message || ''}
        danger={pendingAction?.danger}
      />
    </>
  );
};

export default MrpPlanPage;
