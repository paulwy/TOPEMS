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

export const getStatusStyle = (status: string) => {
  if (!status) return { bgcolor: 'grey.100', color: 'grey.600' };
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes('启用'))
    return { bgcolor: 'success.lighter', color: 'success.700' };
  if (s.includes('pending') || s.includes('待处理'))
    return { bgcolor: 'warning.light', color: 'warning.700' };
  if (s.includes('inactive') || s.includes('禁用'))
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
  <Stack direction='row' spacing={1}>
    <IconButton size='small' sx={{ color: 'info.main' }} onClick={() => onEdit(item)}>
      <Edit size={16} />
    </IconButton>
    <IconButton
      size='small'
      color='error'
      onClick={() => {
        if (confirm('确定要删除此项吗？')) {
          onDelete(item.id);
        }
      }}
    >
      <Trash2 size={16} />
    </IconButton>
  </Stack>
);

export const getDevicePointColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<DevicePoint>[] => [
  { accessorKey: 'name', header: '设备名称' },
  { accessorKey: 'device_type', header: '类型' },
  { accessorKey: 'latitude', header: '纬度' },
  { accessorKey: 'longitude', header: '经度' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];

export const getPipelineColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<Pipeline>[] => [
  { accessorKey: 'name', header: '管线名称' },
  { accessorKey: 'pipeline_type', header: '类型' },
  {
    accessorKey: 'start_point',
    header: '起点',
    cell: ({ row }) => {
      const point = row.original.start_point;
      return Array.isArray(point) ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}` : '';
    },
  },
  {
    accessorKey: 'end_point',
    header: '终点',
    cell: ({ row }) => {
      const point = row.original.end_point;
      return Array.isArray(point) ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}` : '';
    },
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];

export const getStorageLocationColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<StorageLocation>[] => [
  { accessorKey: 'name', header: '库位名称' },
  { accessorKey: 'location_type', header: '类型' },
  { accessorKey: 'capacity', header: '容量' },
  { accessorKey: 'current_usage', header: '当前用量' },
  {
    accessorKey: 'latitude',
    header: '坐标',
    cell: ({ row }) => {
      return `${row.original.latitude?.toFixed(4)}, ${row.original.longitude?.toFixed(4)}`;
    },
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];

export const getEvidenceRecordColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<EvidenceRecord>[] => [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'evidence_type', header: '类型' },
  { accessorKey: 'recorded_by', header: '记录人' },
  {
    accessorKey: 'recorded_at',
    header: '记录时间',
    cell: ({ row }) => (
      <Typography variant='body2'>
        {row.original.recorded_at ? new Date(row.original.recorded_at).toLocaleString() : ''}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];

export const getFactoryMapColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<FactoryMap>[] => [
  { accessorKey: 'name', header: '地图名称' },
  { accessorKey: 'code', header: '编号' },
  { accessorKey: 'map_type', header: '地图类型' },
  {
    accessorKey: 'created_at',
    header: '创建时间',
    cell: ({ row }) => (
      <Typography variant='body2'>
        {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : ''}
      </Typography>
    ),
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];

export const getBusinessLocationColumns = (
  onEdit: (item: GisEntity) => void,
  onDelete: (id: string) => void
): ColumnDef<BusinessLocation>[] => [
  { accessorKey: 'business_name', header: '业务名称' },
  { accessorKey: 'business_type', header: '业务类型' },
  { accessorKey: 'address', header: '地址' },
  { accessorKey: 'contact_person', header: '联系人' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => <ActionButtons item={row.original} onEdit={onEdit} onDelete={onDelete} />,
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
      <Typography variant='body2' sx={{ fontWeight: 500, mb: 0.5 }}>
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
    <Typography variant='body2' sx={{ fontWeight: 500, mb: 0.5 }}>
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
