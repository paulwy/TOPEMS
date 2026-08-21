import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Chip } from '@mui/material';
import { Send, MapPin, XCircle } from 'lucide-react';
import i18n from '@/i18n';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { RowAction, ColumnDef } from '@/components/templates/list/types';
import { StatusChip } from '@/components/common';
import { shipmentApi } from '@/api/tms';
import type { Shipment } from '@/api/tms';
import type { CrudOperations } from '@/hooks/useCrudQueries';

type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';

const shipmentStatusMapping: Record<
  string,
  { label: string; color: 'warning' | 'info' | 'success' | 'default' }
> = {
  pending: { label: i18n.t('tms.shipment_management_page.k0'), color: 'warning' },
  in_transit: { label: i18n.t('tms.shipment_management_page.k1'), color: 'info' },
  delivered: { label: i18n.t('tms.shipment_management_page.k2'), color: 'success' },
  cancelled: { label: i18n.t('tms.shipment_management_page.k3'), color: 'default' },
};

const StatusLegend: React.FC = () => (
  <Stack
    direction='row'
    spacing={1}
    sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
  >
    <Chip
      size='small'
      color='warning'
      label={i18n.t('tms.shipment_management_page.k22')}
    />
    <Chip
      size='small'
      color='info'
      label={i18n.t('tms.shipment_management_page.k23')}
    />
    <Chip
      size='small'
      color='success'
      label={i18n.t('tms.shipment_management_page.k24')}
    />
    <Chip
      size='small'
      color='default'
      label={i18n.t('tms.shipment_management_page.k25')}
    />
  </Stack>
);

export default function ShipmentManagementPage() {
  const queryClient = useQueryClient();

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.dispatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tms-shipments'],
        exact: false,
        refetchType: 'active',
      });
    },
  });
  const arriveMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.arrive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tms-shipments'],
        exact: false,
        refetchType: 'active',
      });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tms-shipments'],
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const rowActions: RowAction<Shipment>[] = useMemo(
    () => [
      {
        key: 'dispatch',
        label: i18n.t('tms.shipment_management_page.k14'),
        icon: <Send size={16} />,
        color: 'primary',
        show: (row) => row.status === 'pending',
        onClick: (row) => dispatchMutation.mutate(row.id),
      },
      {
        key: 'arrive',
        label: i18n.t('tms.shipment_management_page.k16'),
        icon: <MapPin size={16} />,
        color: 'success',
        show: (row) => row.status === 'in_transit',
        onClick: (row) => arriveMutation.mutate(row.id),
      },
      {
        key: 'cancel',
        label: i18n.t('tms.shipment_management_page.k15'),
        icon: <XCircle size={16} />,
        color: 'error',
        show: (row) => row.status === 'pending' || row.status === 'in_transit',
        onClick: (row) => cancelMutation.mutate(row.id),
      },
    ],
    [dispatchMutation, arriveMutation, cancelMutation]
  );

  const columns: ColumnDef<Shipment>[] = useMemo(
    () => [
      { id: 'shipment_no', label: i18n.t('tms.shipment_management_page.k26') },
      { id: 'carrier_id', label: i18n.t('tms.shipment_management_page.k27') },
      { id: 'vehicle_id', label: i18n.t('tms.shipment_management_page.k28') },
      { id: 'driver_id', label: i18n.t('tms.shipment_management_page.k29') },
      { id: 'route_id', label: i18n.t('tms.shipment_management_page.k30') },
      { id: 'origin', label: i18n.t('tms.shipment_management_page.k31') },
      { id: 'destination', label: i18n.t('tms.shipment_management_page.k32') },
      {
        id: 'status',
        label: i18n.t('tms.shipment_management_page.k33'),
        render: (row) => (
          <StatusChip
            status={(row.status as ShipmentStatus) || 'pending'}
            mapping={shipmentStatusMapping}
          />
        ),
      },
      { id: 'planned_departure', label: i18n.t('tms.shipment_management_page.k34') },
      { id: 'planned_arrival', label: i18n.t('tms.shipment_management_page.k35') },
    ],
    []
  );

  return (
    <ListPageTemplate<Shipment>
      title={i18n.t('tms.shipment_management_page.k18')}
      subtitle={i18n.t('tms.shipment_management_page.k19')}
      columns={columns}
      data={[]}
      emptyMessage={i18n.t('pages.shipment_management_page.k1')}
      headerContent={<StatusLegend />}
      globalSearch={{
        fields: [
          'shipment_no',
          'carrier_id',
          'vehicle_id',
          'driver_id',
          'route_id',
          'origin',
          'destination',
        ],
        placeholder: i18n.t('tms.shipment_management_page.k20'),
      }}
      crud={{
        api: shipmentApi as unknown as CrudOperations<Shipment>,
        queryKey: 'tms-shipments',
        entityName: i18n.t('tms.shipment_management_page.k18'),
        pageParamName: 'page',
        pageSizeParamName: 'pageSize',
        searchParamName: 'search',
        searchPlaceholder: i18n.t('tms.shipment_management_page.k20'),
        rowActions,
      }}
    />
  );
}
