import React from 'react';
import { Chip, IconButton, Stack, Typography, Box, TextField, useTheme } from '@mui/material';
import { Edit, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '@/api/gis';
import type { GisEntity } from '../types';
import i18n from '@/i18n';
export const getStatusStyle = (status: string) => {
  if (!status) return { bgcolor: 'grey.100', color: 'grey.600' };
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes(i18n.t('bi.gis_page_components__table_utils.active')))
    return { bgcolor: 'success.lighter', color: 'success.700' };
  if (s.includes('pending') || s.includes(i18n.t('bi.gis_page_components__table_utils.pending')))
    return { bgcolor: 'warning.light', color: 'warning.700' };
  if (
    s.includes('inactive') ||
    s.includes(i18n.t('bi.gis_page_components__table_utils.text_710ad0'))
  )
    return { bgcolor: 'error.lighter', color: 'error.darker' };
  return { bgcolor: 'grey.100', color: 'grey.600' };
};
export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const style = getStatusStyle(status);
  return (
    <Chip
      label={status}
      size='small'
      sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
    />
  );
};
export interface ActionButtonsProps {
  item: GisEntity;
  onEdit: (item: GisEntity) => void;
  onDelete: (id: string) => void;
}
export const ActionButtons: React.FC<ActionButtonsProps> = ({ item, onEdit, onDelete }) => (
  <Stack
    direction='row'
    spacing={1}
  >
    <IconButton
      size='small'
      sx={{ color: 'info.main' }}
      onClick={() => onEdit(item)}
      aria-label={i18n.t('bi.table_utils.k0')}
    >
      <Edit size={16} />
    </IconButton>
    <IconButton
      size='small'
      color='error'
      onClick={() => {
        if (confirm(i18n.t('bi.gis_page_components__table_utils.confirm'))) {
          onDelete(item.id);
        }
      }}
      aria-label={i18n.t('bi.table_utils.k1')}
    >
      <Trash2 size={16} />
    </IconButton>
  </Stack>
);
export const getDevicePointColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<DevicePoint>[] => [
  { accessorKey: 'name', header: i18n.t('bi.gis_page_components__table_utils.equipment_name') },
  { accessorKey: 'device_type', header: i18n.t('bi.gis_page_components__table_utils.type') },
  { accessorKey: 'latitude', header: i18n.t('bi.gis_page_components__table_utils.text_6acaee') },
  { accessorKey: 'longitude', header: i18n.t('bi.gis_page_components__table_utils.text_3d18ca') },
  {
    accessorKey: 'status',
    header: i18n.t('bi.gis_page_components__table_utils.status'),
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const getPipelineColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<Pipeline>[] => [
  { accessorKey: 'name', header: i18n.t('bi.gis_page_components__table_utils.name') },
  { accessorKey: 'pipeline_type', header: i18n.t('bi.gis_page_components__table_utils.type') },
  {
    accessorKey: 'start_point',
    header: i18n.t('bi.gis_page_components__table_utils.text_9b5774'),
    cell: ({ row }) => {
      const point = row.original.start_point;
      return Array.isArray(point) ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}` : '';
    },
  },
  {
    accessorKey: 'end_point',
    header: i18n.t('bi.gis_page_components__table_utils.text_950b2a'),
    cell: ({ row }) => {
      const point = row.original.end_point;
      return Array.isArray(point) ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}` : '';
    },
  },
  {
    accessorKey: 'status',
    header: i18n.t('bi.gis_page_components__table_utils.status'),
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const getStorageLocationColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<StorageLocation>[] => [
  { accessorKey: 'name', header: i18n.t('bi.gis_page_components__table_utils.location_name') },
  { accessorKey: 'location_type', header: i18n.t('bi.gis_page_components__table_utils.type') },
  { accessorKey: 'capacity', header: i18n.t('bi.gis_page_components__table_utils.text_fe7d74') },
  {
    accessorKey: 'current_usage',
    header: i18n.t('bi.gis_page_components__table_utils.text_de3b57'),
  },
  {
    accessorKey: 'latitude',
    header: i18n.t('bi.gis_page_components__table_utils.text_d5490c'),
    cell: ({ row }) => {
      return `${row.original.latitude?.toFixed(4)}, ${row.original.longitude?.toFixed(4)}`;
    },
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const getEvidenceRecordColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<EvidenceRecord>[] => [
  { accessorKey: 'title', header: i18n.t('bi.gis_page_components__table_utils.title') },
  { accessorKey: 'evidence_type', header: i18n.t('bi.gis_page_components__table_utils.type') },
  { accessorKey: 'recorded_by', header: i18n.t('bi.gis_page_components__table_utils.text_bf425d') },
  {
    accessorKey: 'recorded_at',
    header: i18n.t('bi.gis_page_components__table_utils.time'),
    cell: ({ row }) => (
      <Typography variant='body2'>
        {row.original.recorded_at ? new Date(row.original.recorded_at).toLocaleString() : ''}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const getFactoryMapColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<FactoryMap>[] => [
  { accessorKey: 'name', header: i18n.t('bi.gis_page_components__table_utils.name_1') },
  { accessorKey: 'code', header: i18n.t('bi.gis_page_components__table_utils.text_c515f3') },
  { accessorKey: 'map_type', header: i18n.t('bi.gis_page_components__table_utils.type_1') },
  {
    accessorKey: 'created_at',
    header: i18n.t('bi.gis_page_components__table_utils.created_at'),
    cell: ({ row }) => (
      <Typography variant='body2'>
        {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : ''}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const getBusinessLocationColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<BusinessLocation>[] => [
  { accessorKey: 'business_name', header: i18n.t('bi.gis_page_components__table_utils.name_2') },
  { accessorKey: 'business_type', header: i18n.t('bi.gis_page_components__table_utils.type_2') },
  { accessorKey: 'address', header: i18n.t('bi.gis_page_components__table_utils.address') },
  { accessorKey: 'contact_person', header: i18n.t('bi.gis_page_components__table_utils.contact') },
  {
    accessorKey: 'status',
    header: i18n.t('bi.gis_page_components__table_utils.status'),
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: i18n.t('bi.gis_page_components__table_utils.action'),
    cell: ({ row }) => (
      <ActionButtons
        item={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
export const InputField: React.FC<{
  label: string;
  name: string;
  type?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}> = ({ label, type = 'text', value, onChange, error, required }) => {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant='body2'
        sx={{ fontWeight: 500, mb: 0.5 }}
      >
        {label} {required && <span style={{ color: theme.palette.error.main }}>*</span>}
      </Typography>
      <TextField
        fullWidth
        size='small'
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(error)}
        helperText={error}
      />
    </Box>
  );
};
export const TextAreaField: React.FC<{
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
}> = ({ label, value, onChange, rows = 3 }) => (
  <Box>
    <Typography
      variant='body2'
      sx={{ fontWeight: 500, mb: 0.5 }}
    >
      {label}
    </Typography>
    <TextField
      fullWidth
      size='small'
      multiline
      rows={rows}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  </Box>
);