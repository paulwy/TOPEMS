import { designTokens } from '@topems/tokens';
/**
 * MobileProduction work order card list component
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 */
import React from 'react';
import { Box, Typography, Paper, Chip, List, Divider, Avatar, useTheme } from '@mui/material';
import {
  Play,
  Pause,
  Clock,
  Wrench,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Monitor,
} from 'lucide-react';
import i18n from '@/i18n';
import { MobileCard } from '@/components/mobile';
import { sizeTokens } from '@/theme';
import type { ProductionOrder, WorkReport, Equipment } from '@/api/mobile';
import { MobileProductionActions } from './MobileProductionActions';

interface MobileProductionCardProps {
  activeTab: number;
  filteredOrders: ProductionOrder[];
  workReports: WorkReport[];
  equipmentList: Equipment[];
  onOrderAction: (order: ProductionOrder, action: 'start' | 'pause' | 'resume') => void;
  onStartReport: (order: ProductionOrder) => void;
}
export const MobileProductionCard: React.FC<MobileProductionCardProps> = ({
  activeTab,
  filteredOrders,
  workReports,
  equipmentList,
  onOrderAction,
  onStartReport,
}) => {
  const theme = useTheme();
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: i18n.t('mobile.production.status.pending'),
      in_progress: i18n.t('mobile.production.status.in_progress'),
      paused: i18n.t('mobile.production.status.paused'),
      completed: i18n.t('mobile.production.status.completed'),
      running: i18n.t('mobile.production.status.running'),
      idle: i18n.t('mobile.production.status.idle'),
      maintenance: i18n.t('mobile.production.status.maintenance'),
      fault: i18n.t('mobile.production.status.fault'),
    };
    return map[status] || status;
  };
  const getStatusColor = (status: string) => {
    const map: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default'> = {
      pending: 'warning',
      in_progress: 'primary',
      paused: 'warning',
      completed: 'success',
      running: 'success',
      idle: 'info',
      maintenance: 'warning',
      fault: 'error',
    };
    return map[status] || 'default';
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'in_progress':
        return <Play style={{ width: 20, height: 20 }} />;
      case 'paused':
      case 'idle':
        return <Pause style={{ width: 20, height: 20 }} />;
      case 'completed':
        return <CheckCircle style={{ width: 20, height: 20 }} />;
      case 'maintenance':
        return <Wrench style={{ width: 20, height: 20 }} />;
      case 'fault':
        return <AlertCircle style={{ width: 20, height: 20 }} />;
      default:
        return <Clock style={{ width: 20, height: 20 }} />;
    }
  };
  return (
    <>
      {activeTab === 0 && (
        <List disablePadding>
          {filteredOrders.map((order, index) => {
            const progress = (order.completed_quantity / order.quantity) * 100;
            return (
              <React.Fragment key={order.id}>
                <Paper
                  elevation={0}
                  sx={{
                    mx: 2,
                    my: 1,
                    p: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size='small'
                        color={
                          getStatusColor(order.status) as React.ComponentProps<typeof Chip>['color']
                        }
                        sx={{
                          height: 20,
                          fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                        }}
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {order.orderNo}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {order.product_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {i18n.t('mobile.production.label.plannedQuantity')}
                      </Typography>
                      <Typography variant='body2'>{order.quantity}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {i18n.t('mobile.production.label.completed')}
                      </Typography>
                      <Typography variant='body2'>{order.completed_quantity}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {i18n.t('mobile.production.label.workstation')}
                      </Typography>
                      <Typography variant='body2'>{order.workstation}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('mobile.production.label.production_progress')}
                      </Typography>
                      <Typography variant='caption'>{progress.toFixed(1)}%</Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'grey.200',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${progress}%`,
                          height: '100%',
                          bgcolor: order.status === 'completed' ? 'success.main' : 'primary.main',
                          borderRadius: 3,
                          transition: 'width 0.3s',
                        }}
                      />
                    </Box>
                  </Box>
                  <MobileProductionActions
                    order={order}
                    onOrderAction={onOrderAction}
                    onStartReport={onStartReport}
                  />
                </Paper>
                {index < filteredOrders.length - 1 && <Divider sx={{ mx: 2 }} />}
              </React.Fragment>
            );
          })}
        </List>
      )}
      {activeTab === 1 && (
        <List disablePadding>
          {workReports.map((report, index) => (
            <React.Fragment key={report.id}>
              <MobileCard
                leftIcon={
                  <Avatar
                    sx={{
                      width: sizeTokens.inputHeightMd,
                      height: sizeTokens.inputHeightMd,
                      bgcolor: 'primary.lighter',
                      color: 'primary.main',
                    }}
                  >
                    <ClipboardList style={{ width: 20, height: 20 }} />
                  </Avatar>
                }
                title={report.orderNo}
                subtitle={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 0.5 }}
                    >
                      {report.workstation}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={i18n.t('mobile.production.label.qualified_count', {
                          count: report.good_quantity,
                        })}
                        size='small'
                        color='success'
                        sx={{
                          height: 18,
                          fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                        }}
                      />
                      <Chip
                        label={i18n.t('mobile.production.label.defective_count', {
                          count: report.bad_quantity,
                        })}
                        size='small'
                        color='error'
                        sx={{
                          height: 18,
                          fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                        }}
                      />
                    </Box>
                  </Box>
                }
                showArrow
                divider={index < workReports.length - 1}
                rightContent={
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('mobile.production.label.count_unit', { count: report.quantity })}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {Math.floor(report.duration / 60)}h{report.duration % 60}m
                    </Typography>
                  </Box>
                }
                badge={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock style={{ width: 12, height: 12, color: theme.palette.text.secondary }} />
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {new Date(report.created_at).toLocaleDateString('zh-CN')}
                    </Typography>
                  </Box>
                }
              />
            </React.Fragment>
          ))}
        </List>
      )}
      {activeTab === 2 && (
        <List disablePadding>
          {equipmentList.map((equipment, index) => (
            <React.Fragment key={equipment.id}>
              <MobileCard
                leftIcon={
                  <Avatar
                    sx={{
                      width: sizeTokens.inputHeightMd,
                      height: sizeTokens.inputHeightMd,
                      bgcolor: `${getStatusColor(equipment.status)}.lighter`,
                      color: `${getStatusColor(equipment.status)}.main`,
                    }}
                  >
                    <Monitor style={{ width: 20, height: 20 }} />
                  </Avatar>
                }
                title={equipment.name}
                subtitle={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {equipment.equipment_no} · {equipment.location}
                    </Typography>
                    <Chip
                      label={getStatusLabel(equipment.status)}
                      size='small'
                      color={
                        getStatusColor(equipment.status) as React.ComponentProps<
                          typeof Chip
                        >['color']
                      }
                      sx={{
                        height: 18,
                        fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                      }}
                    />
                  </Box>
                }
                showArrow
                divider={index < equipmentList.length - 1}
                rightContent={
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {i18n.t('mobile.production.label.running_hours')}
                    </Typography>
                    <Typography variant='body2'>
                      {equipment.running_hours.toLocaleString()}h
                    </Typography>
                  </Box>
                }
              />
            </React.Fragment>
          ))}
        </List>
      )}
    </>
  );
};
