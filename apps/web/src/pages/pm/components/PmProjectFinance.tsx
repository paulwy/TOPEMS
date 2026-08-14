/**
 * PmProjectDetailPage finance Tab
 * @done V79 Phase 2 split
 */
import React from 'react';
import { DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Box, Typography, Card, CardContent, CardHeader } from '@mui/material';
import type { Project } from '@/api/pm';
import { ActionButton, StatusBadge } from '@/components/common';
import i18n from '@/i18n';
export interface PmProjectFinanceProps {
  project: Project | null;
  formatCurrency: (amount?: number) => string;
}
const PmProjectFinance: React.FC<PmProjectFinanceProps> = ({ project, formatCurrency }) => {
  if (!project) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        gap: 3,
      }}
    >
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.projectdetail.budget_execution')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.project_budget')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {formatCurrency(project.budget)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.projectdetail.actual_cost')}</Typography>
            <Typography sx={{ fontWeight: 500, color: 'warning.dark' }}>
              {formatCurrency(project.actual_cost)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.committed_cost')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'primary.dark' }}>
              {formatCurrency(project.committed_cost)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.remaining_budget')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'success.dark' }}>
              {formatCurrency(project.remaining_budget)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.cost_variance')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 500,
                color: (project.cost_variance || 0) >= 0 ? 'success.dark' : 'error.dark',
              }}
            >
              {formatCurrency(project.cost_variance)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.budget_utilization_rate')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.budget_utilization_rate?.toFixed(1) || '0'}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.projectdetail.revenue_and_profit')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.recognized_revenue')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {formatCurrency(project.revenue_recognized)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.accounts_receivable')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'warning.dark' }}>
              {formatCurrency(project.accounts_receivable)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.invoiced_amount')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'primary.dark' }}>
              {formatCurrency(
                (project.revenue_recognized || 0) - (project.accounts_receivable || 0)
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.projectdetail.gross_profit')}</Typography>
            <Typography sx={{ fontWeight: 500, color: 'success.dark' }}>
              {formatCurrency(project.gross_profit)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.projectdetail.gross_margin')}</Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.gross_margin?.toFixed(1) || '0'}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card sx={{ lg: { gridColumn: 'span 2' } }}>
        <CardHeader
          sx={{
            pb: 2,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.projectdetail.cost_composition')}
            </Typography>
          }
          action={
            <ActionButton
              label={i18n.t('pm.projectdetail.view_detail')}
              variant='secondary'
              size='small'
            />
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                {i18n.t('pm.projectdetail.labor_cost')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'primary.dark' }}
              >
                -
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                {i18n.t('pm.projectdetail.material_cost')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'success.dark' }}
              >
                -
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                {i18n.t('pm.projectdetail.expense')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'warning.dark' }}
              >
                -
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                {i18n.t('pm.projectdetail.subcontract_cost')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'secondary.dark' }}
              >
                -
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                {i18n.t('pm.projectdetail.other_cost')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'text.secondary' }}
              >
                -
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.projectdetail.cost_center_info')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.cost_center_id')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.cost_center_id || '-'}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.cost_center_name')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.cost_center_name || '-'}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.projectdetail.execution_status')}
            </Typography>
            <StatusBadge
              status={
                project.budget_utilization_rate && project.budget_utilization_rate > 100
                  ? 'overbudget'
                  : project.budget_utilization_rate && project.budget_utilization_rate > 80
                    ? 'warning'
                    : 'normal'
              }
              label={
                project.budget_utilization_rate && project.budget_utilization_rate > 100
                  ? i18n.t('pm.projectdetail.over_budget')
                  : project.budget_utilization_rate && project.budget_utilization_rate > 80
                    ? i18n.t('pm.projectdetail.warning')
                    : i18n.t('pm.projectdetail.normal')
              }
              color={
                project.budget_utilization_rate && project.budget_utilization_rate > 100
                  ? 'error'
                  : project.budget_utilization_rate && project.budget_utilization_rate > 80
                    ? 'warning'
                    : 'success'
              }
            />
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.projectdetail.quick_actions')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ActionButton
            label={i18n.t('pm.projectdetail.view_cost_detail')}
            icon={<DollarSign size={16} />}
            variant='secondary'
            sx={{ justifyContent: 'flex-start' }}
          />
          <ActionButton
            label={i18n.t('pm.projectdetail.view_project_invoice')}
            icon={<FileText size={16} />}
            variant='secondary'
            sx={{ justifyContent: 'flex-start' }}
          />
          <ActionButton
            label={i18n.t('pm.projectdetail.budget_execution_analysis')}
            icon={<TrendingUp size={16} />}
            variant='secondary'
            sx={{ justifyContent: 'flex-start' }}
          />
          <ActionButton
            label={i18n.t('pm.projectdetail.generate_project_voucher')}
            icon={<FileText size={16} />}
            variant='secondary'
            sx={{ justifyContent: 'flex-start' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
export default PmProjectFinance;