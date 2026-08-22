/**
 * 运输计划详情页
 *
 * 展示运输计划的汇总信息，包括关联的运单、车辆、司机、路线。
 * 由于暂无独立的运输计划 API，使用 mock 数据展示。
 * 包含 StatusBadge + FSMActionButtons 组件。
 */
import { useParams } from 'react-router-dom';
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
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import type { SectionConfig, TabConfig } from '@/components/templates/DetailPageTemplate';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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

function getMockPlan() {
  return {
    plan_no: 'TP-2025-0812',
    name: i18n.t('pages.transport_plan_detail_page.8_0'),
    status: 'planning',
    totalShipments: 12,
    totalFreight: 86500,
    startDate: '2025-08-15',
    endDate: '2025-08-31',
    items: [
      {
        shipment_no: 'SHP-001',
        origin: i18n.t('tms.transport_plan_detail_page.k3'),
        destination: i18n.t('tms.transport_plan_detail_page.k2'),
        vehicle_no: 'V-001',
        driver_name: i18n.t('tms.transport_plan_detail_page.k1'),
        route_name: i18n.t('tms.transport_plan_detail_page.k0'),
        status: 'draft',
        freight: 3200,
      },
      {
        shipment_no: 'SHP-002',
        origin: i18n.t('tms.transport_plan_detail_page.k7'),
        destination: i18n.t('tms.transport_plan_detail_page.k6'),
        vehicle_no: 'V-003',
        driver_name: i18n.t('tms.transport_plan_detail_page.k5'),
        route_name: i18n.t('tms.transport_plan_detail_page.k4'),
        status: 'pending',
        freight: 4500,
      },
      {
        shipment_no: 'SHP-003',
        origin: i18n.t('tms.transport_plan_detail_page.k11'),
        destination: i18n.t('tms.transport_plan_detail_page.k10'),
        vehicle_no: 'V-005',
        driver_name: i18n.t('tms.transport_plan_detail_page.k9'),
        route_name: i18n.t('tms.transport_plan_detail_page.k8'),
        status: 'in_transit',
        freight: 2800,
      },
      {
        shipment_no: 'SHP-004',
        origin: i18n.t('tms.transport_plan_detail_page.k15'),
        destination: i18n.t('tms.transport_plan_detail_page.k14'),
        vehicle_no: 'V-007',
        driver_name: i18n.t('tms.transport_plan_detail_page.k13'),
        route_name: i18n.t('tms.transport_plan_detail_page.k12'),
        status: 'delivered',
        freight: 2200,
      },
      {
        shipment_no: 'SHP-005',
        origin: i18n.t('tms.transport_plan_detail_page.k19'),
        destination: i18n.t('tms.transport_plan_detail_page.k18'),
        vehicle_no: 'V-002',
        driver_name: i18n.t('tms.transport_plan_detail_page.k17'),
        route_name: i18n.t('tms.transport_plan_detail_page.k16'),
        status: 'cancelled',
        freight: 5800,
      },
    ] as TransportPlanItem[],
  };
}

export default function TransportPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['tms', 'common']);
  const plan = getMockPlan();

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
      title={plan.name}
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
