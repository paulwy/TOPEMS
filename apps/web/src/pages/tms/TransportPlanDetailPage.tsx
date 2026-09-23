/**
 * 运输计划详情页
 *
 * 展示运输计划的汇总信息，包括关联的运单、车辆、司机、路线。
 * 由于暂无独立的运输计划 API，使用 mock 数据展示。
 * 包含 StatusBadge + FSMActionButtons 组件。
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { shipmentApi } from '@/api/tms';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig, TabConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';

interface TransportPlanItem {
  shipment_no: string;
  origin: string;
  destination: string;
  vehicle_no: string;
  driver_name: string;
  route_name: string;
  status: string;
  freight: number;
}

export default function TransportPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const { data: shipmentRes, isLoading } = useQuery({
    queryKey: ['tms', 'shipments', 'all'],
    queryFn: () => shipmentApi.list({ page: 1, pageSize: 100 }),
  });
  const plan = useMemo(() => {
    const raw = shipmentRes?.data?.items ?? [];
    const items: TransportPlanItem[] = raw.map((shipment) => ({
      shipment_no: shipment.shipment_no,
      origin: shipment.origin ?? '\u2014',
      destination: shipment.destination ?? '\u2014',
      vehicle_no: shipment.vehicle_id ?? '\u2014',
      driver_name: shipment.driver_id ?? '\u2014',
      route_name: shipment.route_id ?? '\u2014',
      status: shipment.status ?? 'draft',
      freight: shipment.freight_amount ?? 0,
    }));
    const departures = raw
      .map((s) => s.planned_departure)
      .filter((v): v is string => Boolean(v))
      .sort();
    const arrivals = raw
      .map((s) => s.planned_arrival)
      .filter((v): v is string => Boolean(v))
      .sort();
    const hasActive = raw.some((s) => s.status === 'in_transit');
    const allDone =
      raw.length > 0 && raw.every((s) => s.status === 'delivered' || s.status === 'cancelled');
    return {
      plan_no: id ? `TP-AGG-${id.slice(0, 8)}` : 'TP-AGG',
      name: t('tms.transport_plan_detail_page.8_0'),
      status: allDone ? 'closed' : hasActive ? 'active' : 'planning',
      totalShipments: items.length,
      totalFreight: items.reduce((acc, it) => acc + it.freight, 0),
      startDate: departures[0]?.slice(0, 10) ?? '\u2014',
      endDate: arrivals[arrivals.length - 1]?.slice(0, 10) ?? '\u2014',
      items,
    };
  }, [shipmentRes, id, t]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const basicInfoSection: SectionConfig = {
    id: 'basic-info',
    title: t('common.basic_info'),
    content: (
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k23')}
            value={plan.plan_no}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k24')}
            value={plan.name}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k25')}
            value={plan.status}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k26')}
            value={String(plan.totalShipments)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k27')}
            value={`¥${plan.totalFreight.toLocaleString()}`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k28')}
            value={plan.startDate}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoField
            label={t('tms.transport_plan_detail_page.k29')}
            value={plan.endDate}
          />
        </Grid>
      </Grid>
    ),
  };

  const itemsTabContent = (
    <TableContainer
      component={Paper}
      variant='outlined'
      sx={{ borderRadius: 2 }}
    >
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>{t('tms.transport_plan_detail_page.k31')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k32')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k33')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k34')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k35')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k36')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k37')}</TableCell>
            <TableCell>{t('tms.transport_plan_detail_page.k38')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plan.items.map((item) => (
            <TableRow key={item.shipment_no}>
              <TableCell>{item.shipment_no}</TableCell>
              <TableCell>{item.origin}</TableCell>
              <TableCell>{item.destination}</TableCell>
              <TableCell>{item.vehicle_no}</TableCell>
              <TableCell>{item.driver_name}</TableCell>
              <TableCell>{item.route_name}</TableCell>
              <TableCell>
                <StatusBadge
                  fsm='shipment'
                  status={item.status}
                />
              </TableCell>
              <TableCell>¥{item.freight.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const tabs: TabConfig[] = [
    {
      id: 'info',
      label: t('tms.transport_plan_detail_page.k21'),
      content: basicInfoSection.content,
    },
    {
      id: 'items',
      label: t('tms.transport_plan_detail_page.k22'),
      content: itemsTabContent,
    },
  ];

  const headerContent = (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
      <StatusBadge
        fsm='route'
        status={plan.status}
      />
      <FSMActionButtons
        fsm='route'
        currentStatus={plan.status}
        onAction={handleAction}
      />
    </Box>
  );

  return (
    <DetailPageTemplate
      title={isLoading ? t('tms.transport_plan_detail_page.loading') : plan.name}
      subtitle={`${plan.plan_no}${id ? ` | ID: ${id}` : ''}`}
      backHref={TMS_PATHS.dashboard}
      headerContent={headerContent}
      tabs={tabs}
      defaultTab='info'
    />
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      sx={{ p: 2, borderRadius: 2 }}
      elevation={0}
      variant='outlined'
    >
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='body1'
        sx={{ mt: 0.5, fontWeight: 500 }}
      >
        {value}
      </Typography>
    </Paper>
  );
}
