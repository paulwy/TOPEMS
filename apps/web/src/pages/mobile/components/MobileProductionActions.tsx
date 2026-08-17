/**
 * MobileProduction quick action buttons component
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Play, Pause, Plus } from 'lucide-react';
import { MobileButton } from '@/components/mobile';
import { useNotificationStore } from '@/store';
import type { ProductionOrder } from '@/api/mobile';
import i18n from '@/i18n';

interface MobileProductionActionsProps {
  order: ProductionOrder;
  onOrderAction: (order: ProductionOrder, action: 'start' | 'pause' | 'resume') => void;
  onStartReport: (order: ProductionOrder) => void;
}
export const MobileProductionActions: React.FC<MobileProductionActionsProps> = ({
  order,
  onOrderAction,
  onStartReport,
}) => {
  const { addNotification } = useNotificationStore();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pt: 1.5,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {i18n.t('mobile.production.label.due_date_value', { date: order.due_date })}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {order.status === 'pending' && (
          <MobileButton
            size='small'
            variant='contained'
            startIcon={<Play style={{ width: 16, height: 16 }} />}
            onClick={() => onOrderAction(order, 'start')}
          >
            {i18n.t('mobile.production.action.start')}
          </MobileButton>
        )}
        {order.status === 'in_progress' && (
          <>
            <MobileButton
              size='small'
              variant='outlined'
              startIcon={<Pause style={{ width: 16, height: 16 }} />}
              onClick={() => onOrderAction(order, 'pause')}
            >
              {i18n.t('mobile.production.action.pause')}
            </MobileButton>
            <MobileButton
              size='small'
              variant='contained'
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
              onClick={() => onStartReport(order)}
            >
              {i18n.t('mobile.production.action.report')}
            </MobileButton>
          </>
        )}
        {order.status === 'paused' && (
          <MobileButton
            size='small'
            variant='contained'
            startIcon={<Play style={{ width: 16, height: 16 }} />}
            onClick={() => onOrderAction(order, 'resume')}
          >
            {i18n.t('mobile.production.action.continue')}
          </MobileButton>
        )}
        {order.status === 'completed' && (
          <MobileButton
            size='small'
            variant='outlined'
            onClick={() =>
              addNotification({
                title: i18n.t('mobile.production.action.view_detail'),
                message: i18n.t('mobile.production.action.view_order_detail'),
                type: 'info',
              })
            }
          >
            {i18n.t('mobile.production.action.detail')}
          </MobileButton>
        )}
      </Box>
    </Box>
  );
};
