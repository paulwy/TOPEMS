/**
 * @done V80 split
 * Risk assessments tab content: table of historical risk assessments.
 */
import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Users, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common/DataTable';
import { calculateRiskLevel } from '@/components/ehs';
import { designTokens } from '@/theme/tokens';
import type { RiskAssessment } from '@/api/ehs';

const ct= designTokens.colors;

export interface EhsHazardAssessmentsSectionProps {
  assessments: RiskAssessment[];
}

const EhsHazardAssessmentsSection: React.FC<EhsHazardAssessmentsSectionProps> = ({
  assessments,
}) => {
  const { t } = useTranslation();

  const columns: ColumnDef<RiskAssessment>[] = useMemo(
    () => [
      {
        accessorKey: 'assessment_date',
        header: t('ehs.ehs_hazard_detail_page.date'),
        cell: ({ row }) => (
          <span>
            {row.original.assessment_date
              ? new Date(row.original.assessment_date).toLocaleDateString('zh-CN')
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'assessor',
        header: t('ehs.ehs_hazard_detail_page.text_ab3d92'),
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component={Users}
              sx={{ fontSize: 16 }}
            />
            <span>{row.original.assessor || '-'}</span>
          </Box>
        ),
      },
      {
        accessorKey: 'risklevel',
        header: t('ehs.ehs_hazard_detail_page.text_25eb6b'),
        cell: ({ row }) => {
          const riskResult = calculateRiskLevel(
            row.original.severity || 'medium',
            row.original.likelihood || 'medium'
          );
          const riskLevelKey =
            riskResult.score >= 6 ? 'high' : riskResult.score >= 3 ? 'medium' : 'low';
          const colorMap: Record<string, { bg: string; color: string }> = {
            high: { bg: 'error.lighter', color: 'error.dark' },
            medium: { bg: 'warning.100', color: ct.yellow[600] },
            low: { bg: 'success.lighter', color: 'success.dark' },
          };
          const colors = colorMap[riskLevelKey] || {
            bg: 'grey.100',
            color: 'text.secondary',
          };
          return (
            <Chip
              label={t(`ehs.ehs_hazard_detail_page.${riskLevelKey}_risk`)}
              size='small'
              sx={{ backgroundColor: colors.bg, color: colors.color }}
            />
          );
        },
      },
      { accessorKey: 'recommendations', header: t('ehs.ehs_hazard_detail_page.text_6dca6f') },
    ],
    [t]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          {t('ehs.ehshazarddetailpage.text_48752c')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('ehs.ehs_hazard_detail_page.total_records', { count: assessments.length })}
        </Typography>
      </Box>
      {assessments.length > 0 ? (
        <DataTable
          columns={columns}
          data={assessments}
          enablePagination={false}
        />
      ) : (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Box
            component={AlertTriangle}
            sx={{ fontSize: 64, color: 'grey.400', mx: 'auto', mb: 2 }}
          />
          <Typography>{t('ehs.ehshazarddetailpage.text_df834d')}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default EhsHazardAssessmentsSection;
