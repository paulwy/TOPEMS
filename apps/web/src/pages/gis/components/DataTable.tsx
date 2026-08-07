import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable as CommonDataTable } from '@/components/ui/DataTable';
import { StatusChip } from './StatusChip';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '../../../api/gis';
import type { TabType } from '../hooks/useGisPage';

interface DataTableProps {
  data: unknown[];
  type: TabType;
}

export const DataTable: React.FC<DataTableProps> = ({ data, type }) => {
  const { t } = useTranslation();

  const devicePointColumns = useMemo<ColumnDef<DevicePoint>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('gis.index.col_name'),
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: 'device_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.device_type,
      },
      {
        accessorKey: 'coordinates',
        header: t('gis.index.col_coordinates'),
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {row.original.latitude?.toFixed(4)}, {row.original.longitude?.toFixed(4)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('gis.index.col_status'),
        cell: ({ row }) => <StatusChip status={row.original.status} />,
      },
    ],
    [t],
  );

  const pipelineColumns = useMemo<ColumnDef<Pipeline>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('gis.index.col_name'),
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: 'pipeline_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.pipeline_type,
      },
      {
        accessorKey: 'start_point',
        header: t('gis.index.col_start_point'),
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {row.original.start_point
              ? `${row.original.start_point[0].toFixed(4)}, ${row.original.start_point[1].toFixed(4)}`
              : ''}
          </span>
        ),
      },
      {
        accessorKey: 'end_point',
        header: t('gis.index.col_end_point'),
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {row.original.end_point
              ? `${row.original.end_point[0].toFixed(4)}, ${row.original.end_point[1].toFixed(4)}`
              : ''}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('gis.index.col_status'),
        cell: ({ row }) => <StatusChip status={row.original.status} />,
      },
    ],
    [t],
  );

  const storageLocationColumns = useMemo<ColumnDef<StorageLocation>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('gis.index.col_name'),
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: 'location_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.location_type,
      },
      {
        accessorKey: 'capacity',
        header: t('gis.index.col_capacity'),
        cell: ({ row }) => row.original.capacity,
      },
      {
        accessorKey: 'coordinates',
        header: t('gis.index.col_coordinates'),
        cell: ({ row }) => (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {row.original.latitude?.toFixed(4)}, {row.original.longitude?.toFixed(4)}
          </span>
        ),
      },
    ],
    [t],
  );

  const evidenceRecordColumns = useMemo<ColumnDef<EvidenceRecord>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('gis.index.col_title'),
        cell: ({ row }) => row.original.title,
      },
      {
        accessorKey: 'evidence_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.evidence_type,
      },
      {
        accessorKey: 'recorded_by',
        header: t('gis.index.col_recorder'),
        cell: ({ row }) => row.original.recorded_by,
      },
      {
        accessorKey: 'recorded_at',
        header: t('gis.index.col_time'),
        cell: ({ row }) =>
          row.original.recorded_at ? new Date(row.original.recorded_at).toLocaleString() : '',
      },
    ],
    [t],
  );

  const factoryMapColumns = useMemo<ColumnDef<FactoryMap>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('gis.index.col_name'),
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: 'code',
        header: t('gis.index.col_code'),
        cell: ({ row }) => row.original.code,
      },
      {
        accessorKey: 'map_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.map_type,
      },
      {
        accessorKey: 'created_at',
        header: t('gis.index.col_created_at'),
        cell: ({ row }) =>
          row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '',
      },
    ],
    [t],
  );

  const businessLocationColumns = useMemo<ColumnDef<BusinessLocation>[]>(
    () => [
      {
        accessorKey: 'business_name',
        header: t('gis.index.col_name'),
        cell: ({ row }) => row.original.business_name,
      },
      {
        accessorKey: 'business_type',
        header: t('gis.index.col_type'),
        cell: ({ row }) => row.original.business_type,
      },
      {
        accessorKey: 'address',
        header: t('gis.index.col_address'),
        cell: ({ row }) => row.original.address,
      },
      {
        accessorKey: 'contact_person',
        header: t('gis.index.col_contact'),
        cell: ({ row }) => row.original.contact_person,
      },
      {
        accessorKey: 'status',
        header: t('gis.index.col_status'),
        cell: ({ row }) => <StatusChip status={row.original.status} />,
      },
    ],
    [t],
  );

  const columns = useMemo(() => {
    switch (type) {
      case 'devicePoints':
        return devicePointColumns as ColumnDef<unknown>[];
      case 'pipelines':
        return pipelineColumns as ColumnDef<unknown>[];
      case 'storageLocations':
        return storageLocationColumns as ColumnDef<unknown>[];
      case 'evidenceRecords':
        return evidenceRecordColumns as ColumnDef<unknown>[];
      case 'factoryMaps':
        return factoryMapColumns as ColumnDef<unknown>[];
      case 'businessLocations':
        return businessLocationColumns as ColumnDef<unknown>[];
      default:
        return [];
    }
  }, [
    type,
    devicePointColumns,
    pipelineColumns,
    storageLocationColumns,
    evidenceRecordColumns,
    factoryMapColumns,
    businessLocationColumns,
  ]);

  return (
    <CommonDataTable
      columns={columns}
      data={data}
      enablePagination={false}
      showSearch={false}
      showFilters={false}
      showExport={false}
      showSelection={false}
      showCreate={false}
      emptyMessage={t('gis.index.empty_no_data')}
      compact
      getRowKey={(row) => (row as { id: string }).id}
    />
  );
};
