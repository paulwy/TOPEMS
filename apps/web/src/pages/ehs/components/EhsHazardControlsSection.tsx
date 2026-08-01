/**
 * @done V80 split
 * Control measures tab content: table of measures with delete action.
 */
import React, { useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Users, Clock, Shield, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common/DataTable';
import { EHSStatusBadge, EHSMeasureTypeBadge } from '@/components/ehs';
import type { ControlMeasure } from '@/api/ehs';

export interface EhsHazardControlsSectionProps {
  controls: ControlMeasure[];
  onAddControl: () => void;
  onDeleteControl: (measureId: string) => void;
}

const EhsHazardControlsSection: React.FC<EhsHazardControlsSectionProps> = ({
  controls,
  onAddControl,
  onDeleteControl,
}) => {
  const { t } = useTranslation();

  const columns: ColumnDef<ControlMeasure>[] = useMemo(
    () => [
      {
        accessorKey: 'measure_type',
        header: t('ehs.ehs_hazard_detail_page.type'),
        cell: ({ row }) => <EHSMeasureTypeBadge type={row.original.measure_type} />,
      },
      { accessorKey: 'description', header: t('ehs.ehs_hazard_detail_page.description') },
      {
        accessorKey: 'responsible',
        header: t('ehs.ehs_hazard_detail_page.manager'),
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component={Users}
              sx={{ fontSize: 16 }}
            />
            <span>{row.original.responsible || '-'}</span>
          </Box>
        ),
      },
      {
        accessorKey: 'deadline',
        header: t('ehs.ehs_hazard_detail_page.completed'),
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component={Clock}
              sx={{ fontSize: 16 }}
            />
            {row.original.deadline
              ? new Date(row.original.deadline).toLocaleDateString('zh-CN')
              : '-'}
          </Box>
        ),
      },
      {
        accessorKey: 'status',
        header: t('ehs.ehs_hazard_detail_page.status'),
        cell: ({ row }) => (
          <EHSStatusBadge
            status={row.original.status}
            type='control'
          />
        ),
      },
      {
        id: 'actions',
        header: t('ehs.ehs_hazard_detail_page.action'),
        cell: ({ row }) => (
          <Button
            variant='text'
            size='small'
            onClick={() => onDeleteControl(row.original.id)}
            sx={{ color: 'error.dark', '&:hover': { backgroundColor: 'error.light' } }}
            startIcon={
              <Box
                component={Trash2}
                sx={{ fontSize: 16 }}
              />
            }
          />
        ),
      },
    ],
    [t, onDeleteControl]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          {t('ehs.ehshazarddetailpage.text_2e8dbb')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('ehs.ehs_hazard_detail_page.total_measures', { count: controls.length })}
        </Typography>
      </Box>
      {controls.length > 0 ? (
        <DataTable
          columns={columns}
          data={controls}
          enablePagination={false}
        />
      ) : (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Box
            component={Shield}
            sx={{ fontSize: 64, color: 'grey.400', mx: 'auto', mb: 2 }}
          />
          <Typography>{t('ehs.ehshazarddetailpage.text_b64d8b')}</Typography>
          <Button
            variant='outlined'
            size='small'
            sx={{ mt: 2 }}
            onClick={onAddControl}
            startIcon={
              <Box
                component={Plus}
                sx={{ fontSize: 12 }}
              />
            }
          >
            {t('ehs.ehshazarddetailpage.text_676fd4')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default EhsHazardControlsSection;
