import React from 'react';
import { Paper, Box, Stack, TextField, Button, CircularProgress, Typography } from '@mui/material';
import { Search as SearchIcon, Download } from 'lucide-react';
import { InputAdornment } from '@mui/material';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import type { TabType, GisEntity } from '../types';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '@/api/gis';
import {
  getDevicePointColumns,
  getPipelineColumns,
  getStorageLocationColumns,
  getEvidenceRecordColumns,
  getFactoryMapColumns,
  getBusinessLocationColumns,
} from './TableUtils';

interface DataTableSectionProps {
  activeTab: TabType;
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredData: GisEntity[];
  onDownloadTemplate: () => void;
  onEdit: (item: GisEntity) => void;
  onDelete: (id: string) => void;
}

const tableConfig: Record<
  Exclude<TabType, 'map'>,
  {
    searchKey: string;
    searchPlaceholder: string;
    exportFileName: string;
    getColumns: (
      onEdit: (item: GisEntity) => void,
      onDelete: (id: string) => void
    ) => ColumnDef<GisEntity>[];
  }
> = {
  devicePoints: {
    searchKey: 'name',
    searchPlaceholder: '搜索设备名称...',
    exportFileName: 'gis-device-points',
    getColumns: (onEdit, onDelete) =>
      getDevicePointColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
  pipelines: {
    searchKey: 'name',
    searchPlaceholder: '搜索管线名称...',
    exportFileName: 'gis-pipelines',
    getColumns: (onEdit, onDelete) =>
      getPipelineColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
  storageLocations: {
    searchKey: 'name',
    searchPlaceholder: '搜索库位名称...',
    exportFileName: 'gis-storage-locations',
    getColumns: (onEdit, onDelete) =>
      getStorageLocationColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
  evidenceRecords: {
    searchKey: 'title',
    searchPlaceholder: '搜索记录标题...',
    exportFileName: 'gis-evidence-records',
    getColumns: (onEdit, onDelete) =>
      getEvidenceRecordColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
  factoryMaps: {
    searchKey: 'name',
    searchPlaceholder: '搜索地图名称...',
    exportFileName: 'gis-factory-maps',
    getColumns: (onEdit, onDelete) =>
      getFactoryMapColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
  businessLocations: {
    searchKey: 'business_name',
    searchPlaceholder: '搜索业务名称...',
    exportFileName: 'gis-business-locations',
    getColumns: (onEdit, onDelete) =>
      getBusinessLocationColumns(onEdit, onDelete) as ColumnDef<GisEntity>[],
  },
};

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  activeTab,
  loading,
  searchTerm,
  onSearchChange,
  filteredData,
  onDownloadTemplate,
  onEdit,
  onDelete,
}) => {
  if (activeTab === 'map') return null;

  const config = tableConfig[activeTab];
  const columns = config.getColumns(onEdit, onDelete);

  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Stack direction='row' spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size='small'
            placeholder='搜索...'
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon size={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            size='small'
            startIcon={<Download size={16} />}
            onClick={onDownloadTemplate}
            sx={{ color: 'text.secondary' }}
          >
            下载模板
          </Button>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
            }}
          >
            <CircularProgress sx={{ color: 'info.main' }} />
          </Box>
        ) : filteredData.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                bgcolor: 'grey.100',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SearchIcon size={32} color='text.disabled' />
            </Box>
            <Typography color='text.secondary'>暂无数据</Typography>
          </Box>
        ) : (
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey={config.searchKey}
            searchPlaceholder={config.searchPlaceholder}
            exportFileName={config.exportFileName}
          />
        )}
      </Box>
    </Paper>
  );
};
