import { Grid } from '@/components';
import { useAppStore } from '@/store';
import React, { useState, useMemo, useCallback } from 'react';
import { apiLogger } from '@/utils/logger';
import {
  MapPin,
  Plus,
  Search as SearchIcon,
  ChevronRight,
  ArrowRight,
  Warehouse,
  Camera,
  X,
  Edit,
  Trash2,
  Map,
  Building2,
  Layers,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGis, GisProvider } from '../../context/GisContext';
import MapView from '@/components/gis/MapView';
import MetricCard from '@/components/bi/MetricCard';
import StatsChart from '@/components/bi/StatsChart';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  FactoryMap,
  BusinessLocation,
} from '@/api/gis';
import {
  Box,
  Paper,
  Stack,
  Chip,
  IconButton,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type TabType =
  | 'map'
  | 'devicePoints'
  | 'pipelines'
  | 'storageLocations'
  | 'evidenceRecords'
  | 'factoryMaps'
  | 'businessLocations';

type ModalType = 'create' | 'edit' | null;

interface FormErrors {
  [key: string]: string;
}

const GisContent: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    state,
    loadAllData,
    createDevicePoint,
    updateDevicePoint,
    deleteDevicePoint,
    createPipeline,
    updatePipeline,
    deletePipeline,
    createStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    createEvidenceRecord,
    deleteEvidenceRecord,
    createFactoryMap,
    updateFactoryMap,
    deleteFactoryMap,
    createBusinessLocation,
    updateBusinessLocation,
    deleteBusinessLocation,
  } = useGis();

  const [activeTab, setActiveTab] = useState<TabType>('map');
  const addNotification = useAppStore((state) => state.addNotification);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<
    DevicePoint | StorageLocation | Pipeline | EvidenceRecord | FactoryMap | BusinessLocation | null
  >(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DevicePoint | StorageLocation | null>(null);

  const {
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
    statistics,
    loading,
    error,
  } = state;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    const requiredFields: { [tab: string]: string[] } = {
      devicePoints: ['name', 'device_type', 'latitude', 'longitude'],
      pipelines: ['name', 'pipeline_type', 'start_lat', 'start_lng', 'end_lat', 'end_lng'],
      storageLocations: ['name', 'location_type', 'latitude', 'longitude'],
      evidenceRecords: ['title', 'evidence_type', 'latitude', 'longitude', 'recorded_by'],
      factoryMaps: ['name', 'code', 'map_type'],
      businessLocations: ['business_name', 'business_type', 'lat', 'lng'],
    };

    const fields = requiredFields[activeTab];
    if (!fields) return true;

    fields.forEach((field) => {
      const value = formData[field];
      if (value === undefined || value === null || value === '') {
        errors[field] = '此字段为必填项';
      }
    });

    if (activeTab === 'devicePoints' || activeTab === 'storageLocations') {
      const lat = parseFloat(formData.latitude as string);
      const lng = parseFloat(formData.longitude as string);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = '纬度必须在 -90 到 90 之间';
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = '经度必须在 -180 到 180 之间';
      }
    }

    if (activeTab === 'businessLocations') {
      const lat = parseFloat(formData.lat as string);
      const lng = parseFloat(formData.lng as string);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.lat = '纬度必须在 -90 到 90 之间';
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.lng = '经度必须在 -180 到 180 之间';
      }
    }

    if (activeTab === 'pipelines') {
      const startLat = parseFloat(formData.start_lat as string);
      const startLng = parseFloat(formData.start_lng as string);
      const endLat = parseFloat(formData.end_lat as string);
      const endLng = parseFloat(formData.end_lng as string);
      if (isNaN(startLat) || startLat < -90 || startLat > 90) {
        errors.start_lat = '起点纬度无效';
      }
      if (isNaN(startLng) || startLng < -180 || startLng > 180) {
        errors.start_lng = '起点经度无效';
      }
      if (isNaN(endLat) || endLat < -90 || endLat > 90) {
        errors.end_lat = '终点纬度无效';
      }
      if (isNaN(endLng) || endLng < -180 || endLng > 180) {
        errors.end_lng = '终点经度无效';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [activeTab, formData]);

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
    setFormErrors({});
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      switch (activeTab) {
        case 'devicePoints':
          await createDevicePoint({
            name: formData.name as string,
            description: formData.description as string,
            device_type: formData.device_type as string,
            latitude: parseFloat(formData.latitude as string),
            longitude: parseFloat(formData.longitude as string),
            status: (formData.status as string) || 'active',
          });
          break;
        case 'pipelines':
          await createPipeline({
            name: formData.name as string,
            description: formData.description as string,
            pipeline_type: formData.pipeline_type as string,
            start_point: [
              parseFloat(formData.start_lat as string),
              parseFloat(formData.start_lng as string),
            ],
            end_point: [
              parseFloat(formData.end_lat as string),
              parseFloat(formData.end_lng as string),
            ],
            status: (formData.status as string) || 'active',
          });
          break;
        case 'storageLocations':
          await createStorageLocation({
            name: formData.name as string,
            description: formData.description as string,
            location_type: formData.location_type as string,
            latitude: parseFloat(formData.latitude as string),
            longitude: parseFloat(formData.longitude as string),
            capacity: formData.capacity ? parseFloat(formData.capacity as string) : undefined,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage as string)
              : undefined,
          });
          break;
        case 'evidenceRecords':
          await createEvidenceRecord({
            title: formData.title as string,
            description: formData.description as string,
            evidence_type: formData.evidence_type as string,
            latitude: parseFloat(formData.latitude as string),
            longitude: parseFloat(formData.longitude as string),
            file_url: formData.file_url as string,
            recorded_by: formData.recorded_by as string,
          });
          break;
        case 'factoryMaps':
          await createFactoryMap({
            name: formData.name as string,
            code: formData.code as string,
            map_type: formData.map_type as string,
            file_url: (formData.file_url as string) || '',
            description: formData.description as string,
          });
          break;
        case 'businessLocations':
          await createBusinessLocation({
            business_type: formData.business_type as string,
            business_name: formData.business_name as string,
            business_code: formData.business_code as string,
            category: formData.category as string,
            position: {
              lat: parseFloat(formData.lat as string),
              lng: parseFloat(formData.lng as string),
            },
            address: formData.address as string,
            contact_person: formData.contact_person as string,
            contact_phone: formData.contact_phone as string,
            capacity: formData.capacity ? parseFloat(formData.capacity as string) : undefined,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage as string)
              : undefined,
            status: (formData.status as string) || 'active',
            properties: formData.properties ? JSON.parse(formData.properties as string) : undefined,
            description: formData.description as string,
            external_id: formData.external_id as string,
            external_type: formData.external_type as string,
          });
          break;
      }
      showNotification('success', '创建成功');
      resetModal();
    } catch (err: unknown) {
      showNotification('error', '创建失败');
      apiLogger.error('创建失败:', err);
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;
    try {
      if (!editingItem) return;

      switch (activeTab) {
        case 'devicePoints':
          await updateDevicePoint(editingItem.id, {
            name: (formData.name as string) || (editingItem as DevicePoint).name,
            description:
              (formData.description as string) || (editingItem as DevicePoint).description,
            device_type:
              (formData.device_type as string) || (editingItem as DevicePoint).device_type,
            latitude: parseFloat(
              (formData.latitude as string) ||
                (editingItem as DevicePoint).latitude?.toString() ||
                '0'
            ),
            longitude: parseFloat(
              (formData.longitude as string) ||
                (editingItem as DevicePoint).longitude?.toString() ||
                '0'
            ),
            status: (formData.status as string) || (editingItem as DevicePoint).status,
          });
          break;
        case 'pipelines':
          await updatePipeline(editingItem.id, {
            name: (formData.name as string) || (editingItem as Pipeline).name,
            description: (formData.description as string) || (editingItem as Pipeline).description,
            pipeline_type:
              (formData.pipeline_type as string) || (editingItem as Pipeline).pipeline_type,
            start_point:
              formData.start_lat && formData.start_lng
                ? [
                    parseFloat(formData.start_lat as string),
                    parseFloat(formData.start_lng as string),
                  ]
                : (editingItem as Pipeline).start_point,
            end_point:
              formData.end_lat && formData.end_lng
                ? [parseFloat(formData.end_lat as string), parseFloat(formData.end_lng as string)]
                : (editingItem as Pipeline).end_point,
            status: (formData.status as string) || (editingItem as Pipeline).status,
          });
          break;
        case 'storageLocations':
          await updateStorageLocation(editingItem.id, {
            name: (formData.name as string) || (editingItem as StorageLocation).name,
            description:
              (formData.description as string) || (editingItem as StorageLocation).description,
            location_type:
              (formData.location_type as string) || (editingItem as StorageLocation).location_type,
            latitude: parseFloat(
              (formData.latitude as string) ||
                (editingItem as StorageLocation).latitude?.toString() ||
                '0'
            ),
            longitude: parseFloat(
              (formData.longitude as string) ||
                (editingItem as StorageLocation).longitude?.toString() ||
                '0'
            ),
            capacity: formData.capacity
              ? parseFloat(formData.capacity as string)
              : (editingItem as StorageLocation).capacity,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage as string)
              : (editingItem as StorageLocation).current_usage,
          });
          break;
        case 'factoryMaps':
          await updateFactoryMap(editingItem.id, {
            name: (formData.name as string) || (editingItem as FactoryMap).name,
            code: (formData.code as string) || (editingItem as FactoryMap).code,
            map_type: (formData.map_type as string) || (editingItem as FactoryMap).map_type,
            file_url: (formData.file_url as string) || (editingItem as FactoryMap).file_url,
            description:
              (formData.description as string) || (editingItem as FactoryMap).description,
          });
          break;
        case 'businessLocations':
          await updateBusinessLocation(editingItem.id, {
            business_type:
              (formData.business_type as string) || (editingItem as BusinessLocation).business_type,
            business_name:
              (formData.business_name as string) || (editingItem as BusinessLocation).business_name,
            business_code:
              (formData.business_code as string) || (editingItem as BusinessLocation).business_code,
            category: (formData.category as string) || (editingItem as BusinessLocation).category,
            position:
              formData.lat && formData.lng
                ? {
                    lat: parseFloat(formData.lat as string),
                    lng: parseFloat(formData.lng as string),
                  }
                : (editingItem as BusinessLocation).position,
            address: (formData.address as string) || (editingItem as BusinessLocation).address,
            contact_person:
              (formData.contact_person as string) ||
              (editingItem as BusinessLocation).contact_person,
            contact_phone:
              (formData.contact_phone as string) || (editingItem as BusinessLocation).contact_phone,
            capacity: formData.capacity
              ? parseFloat(formData.capacity as string)
              : (editingItem as BusinessLocation).capacity,
            current_usage: formData.current_usage
              ? parseFloat(formData.current_usage as string)
              : (editingItem as BusinessLocation).current_usage,
            status: (formData.status as string) || (editingItem as BusinessLocation).status,
            properties: formData.properties
              ? JSON.parse(formData.properties as string)
              : (editingItem as BusinessLocation).properties,
            description:
              (formData.description as string) || (editingItem as BusinessLocation).description,
            external_id:
              (formData.external_id as string) || (editingItem as BusinessLocation).external_id,
            external_type:
              (formData.external_type as string) || (editingItem as BusinessLocation).external_type,
          });
          break;
      }
      showNotification('success', '更新成功');
      resetModal();
    } catch (err: unknown) {
      showNotification('error', '更新失败');
      apiLogger.error('更新失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
        case 'devicePoints':
          await deleteDevicePoint(id);
          break;
        case 'pipelines':
          await deletePipeline(id);
          break;
        case 'storageLocations':
          await deleteStorageLocation(id);
          break;
        case 'evidenceRecords':
          await deleteEvidenceRecord(id);
          break;
        case 'factoryMaps':
          await deleteFactoryMap(id);
          break;
        case 'businessLocations':
          await deleteBusinessLocation(id);
          break;
      }
      showNotification('success', '删除成功');
    } catch (err: unknown) {
      showNotification('error', '删除失败');
      apiLogger.error('删除失败:', err);
    }
  };

  const openCreateModal = () => {
    setModalType('create');
    setFormData({});
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (
    item: DevicePoint | Pipeline | StorageLocation | EvidenceRecord | BusinessLocation | FactoryMap
  ) => {
    setModalType('edit');
    setEditingItem(item);
    const itemData = item as unknown as Record<string, unknown>;
    const initialFormData: Record<string, unknown> = { ...itemData };
    const position = itemData.position as { lat?: number; lng?: number } | undefined;
    if (position?.lat !== undefined) {
      initialFormData.lat = position.lat;
      initialFormData.lng = position.lng;
    }
    const startPoint = itemData.start_point as [number, number] | undefined;
    if (startPoint) {
      initialFormData.start_lat = startPoint[0];
      initialFormData.start_lng = startPoint[1];
    }
    const endPoint = itemData.end_point as [number, number] | undefined;
    if (endPoint) {
      initialFormData.end_lat = endPoint[0];
      initialFormData.end_lng = endPoint[1];
    }
    const properties = itemData.properties as Record<string, unknown> | undefined;
    if (properties) {
      initialFormData.properties = JSON.stringify(properties);
    }
    setFormData(initialFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'map', label: '地图视图', icon: <Layers size={18} /> },
    { id: 'devicePoints', label: '设备点位', icon: <MapPin size={18} /> },
    { id: 'pipelines', label: '管线管理', icon: <ArrowRight size={18} /> },
    {
      id: 'storageLocations',
      label: '仓储位置',
      icon: <Warehouse size={18} />,
    },
    { id: 'evidenceRecords', label: '现场取证', icon: <Camera size={18} /> },
    { id: 'factoryMaps', label: '厂区地图', icon: <Map size={18} /> },
    {
      id: 'businessLocations',
      label: '业务位置',
      icon: <Building2 size={18} />,
    },
  ];

  const getStatusStyle = (status: string) => {
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

  const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const style = getStatusStyle(status);
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const ActionButtons: React.FC<{
    item: DevicePoint | StorageLocation | Pipeline | EvidenceRecord | FactoryMap | BusinessLocation;
  }> = ({ item }) => (
    <Stack
      direction='row'
      spacing={1}
    >
      <IconButton
        size='small'
        sx={{ color: 'info.main' }}
        onClick={() => openEditModal(item)}
      >
        <Edit size={16} />
      </IconButton>
      <IconButton
        size='small'
        color='error'
        onClick={() => {
          if (confirm('确定要删除此项吗？')) {
            handleDelete(item.id);
          }
        }}
      >
        <Trash2 size={16} />
      </IconButton>
    </Stack>
  );

  const devicePointColumns: ColumnDef<DevicePoint>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const pipelineColumns: ColumnDef<Pipeline>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const storageLocationColumns: ColumnDef<StorageLocation>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const evidenceRecordColumns: ColumnDef<EvidenceRecord>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const factoryMapColumns: ColumnDef<FactoryMap>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const businessLocationColumns: ColumnDef<BusinessLocation>[] = [
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
      cell: ({ row }) => <ActionButtons item={row.original} />,
    },
  ];

  const downloadTemplate = () => {
    let headers: string[];
    let sampleRow: string[];

    switch (activeTab) {
      case 'devicePoints':
        headers = ['name', 'device_type', 'latitude', 'longitude', 'status', 'description'];
        sampleRow = ['设备A', '传感器', '31.2304', '121.4737', 'active', '设备描述'];
        break;
      case 'pipelines':
        headers = [
          'name',
          'pipeline_type',
          'start_lat',
          'start_lng',
          'end_lat',
          'end_lng',
          'status',
        ];
        sampleRow = ['管线A', '水管', '31.2304', '121.4737', '31.2305', '121.4738', 'active'];
        break;
      case 'storageLocations':
        headers = ['name', 'location_type', 'latitude', 'longitude', 'capacity', 'current_usage'];
        sampleRow = ['仓库A', '原材料仓', '31.2304', '121.4737', '1000', '500'];
        break;
      case 'evidenceRecords':
        headers = [
          'title',
          'evidence_type',
          'latitude',
          'longitude',
          'recorded_by',
          'file_url',
          'description',
        ];
        sampleRow = ['现场照片1', '照片', '31.2304', '121.4737', '张三', '', '证据描述'];
        break;
      case 'factoryMaps':
        headers = ['name', 'code', 'map_type', 'file_url', 'description'];
        sampleRow = ['厂区平面图', 'F001', '平面图', '', '地图描述'];
        break;
      case 'businessLocations':
        headers = [
          'business_name',
          'business_type',
          'lat',
          'lng',
          'address',
          'contact_person',
          'contact_phone',
          'capacity',
          'current_usage',
          'status',
          'description',
        ];
        sampleRow = [
          '门店A',
          '零售',
          '31.2304',
          '121.4737',
          '地址',
          '张三',
          '13800138000',
          '100',
          '50',
          'active',
          '描述',
        ];
        break;
      default:
        headers = ['name'];
        sampleRow = ['示例数据'];
    }

    const content = [headers, sampleRow].map((row) => row.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        showNotification('error', '请选择CSV文件');
        return;
      }
      setImportFile(file);
      setImportPreview(null);
      setImportConfirm(false);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());
          const preview = lines.slice(0, 10).map((line) => line.split(','));
          setImportPreview(preview);
        } catch (err: unknown) {
          showNotification('error', '文件解析失败');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleImport = async () => {
    if (!importFile || !importConfirm) return;
    try {
      showNotification('success', '导入成功');
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      setImportConfirm(false);
      await loadAllData(true);
    } catch (err: unknown) {
      showNotification('error', '导入失败');
      apiLogger.error('导入失败:', err);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      switch (activeTab) {
        case 'devicePoints':
          return devicePoints;
        case 'pipelines':
          return pipelines;
        case 'storageLocations':
          return storageLocations;
        case 'evidenceRecords':
          return evidenceRecords;
        case 'factoryMaps':
          return factoryMaps;
        case 'businessLocations':
          return businessLocations;
        default:
          return [];
      }
    }
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'devicePoints':
        return devicePoints.filter(
          (d) => d.name.toLowerCase().includes(term) || d.device_type.toLowerCase().includes(term)
        );
      case 'pipelines':
        return pipelines.filter(
          (p) => p.name.toLowerCase().includes(term) || p.pipeline_type.toLowerCase().includes(term)
        );
      case 'storageLocations':
        return storageLocations.filter(
          (s) => s.name.toLowerCase().includes(term) || s.location_type.toLowerCase().includes(term)
        );
      case 'evidenceRecords':
        return evidenceRecords.filter(
          (e) =>
            e.title.toLowerCase().includes(term) || e.evidence_type.toLowerCase().includes(term)
        );
      case 'factoryMaps':
        return factoryMaps.filter(
          (m) => m.name.toLowerCase().includes(term) || m.code.toLowerCase().includes(term)
        );
      case 'businessLocations':
        return businessLocations.filter(
          (b) =>
            b.business_name.toLowerCase().includes(term) ||
            b.business_type.toLowerCase().includes(term)
        );
      default:
        return [];
    }
  }, [
    activeTab,
    searchTerm,
    devicePoints,
    pipelines,
    storageLocations,
    evidenceRecords,
    factoryMaps,
    businessLocations,
  ]);

  const InputField: React.FC<{
    label: string;
    name: string;
    type?: string;
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
    placeholder?: string;
    required?: boolean;
  }> = ({ label, type = 'text', value, onChange, error, required }) => (
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

  const TextAreaField: React.FC<{
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

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, ${ct.cyan[50]} 100%)`,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
          <Stack
            direction='row'
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <IconButton
                onClick={() => navigate('/dashboard')}
                aria-label='返回首页'
              >
                <ChevronRight style={{ transform: 'rotate(180deg)' }} />
              </IconButton>
              <Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  厂区空间数字化
                </Typography>
                <Typography color='text.secondary'>
                  管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Button
                variant='contained'
                color='success'
                startIcon={<Upload size={16} />}
                onClick={() => setShowImportModal(true)}
              >
                导入
              </Button>
              {activeTab !== 'map' && (
                <Button
                  variant='contained'
                  sx={{
                    bgcolor: 'info.main',
                    '&:hover': { bgcolor: 'cyan.dark' },
                  }}
                  startIcon={<Plus size={16} />}
                  onClick={openCreateModal}
                >
                  新建
                </Button>
              )}
              <IconButton
                onClick={() => loadAllData(true)}
                sx={{ border: 1, borderColor: 'divider' }}
              >
                <RefreshCw
                  size={20}
                  className={loading ? 'animate-spin' : ''}
                  style={{
                    animation: loading ? 'spin 1s linear infinite' : undefined,
                  }}
                />
              </IconButton>
            </Stack>
          </Stack>

          {error && (
            <Alert
              severity='error'
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}

          <Snackbar
            open={Boolean(notification)}
            autoHideDuration={3000}
            onClose={() => setNotification(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              severity={notification?.type === 'success' ? 'success' : 'error'}
              onClose={() => setNotification(null)}
              icon={
                notification?.type === 'success' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertCircle size={20} />
                )
              }
            >
              {notification?.message}
            </Alert>
          </Snackbar>

          <Grid
            container
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='设备点位'
                value={statistics?.device_points || 0}
                icon={<MapPin size={24} />}
                gradient={[ct.success.main, ct.success.dark]}
                subtitle={`启用: ${statistics?.active_devices || 0}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='管线管理'
                value={statistics?.pipelines || 0}
                icon={<ArrowRight size={24} />}
                gradient={[ct.secondary[400], ct.secondary[600]]}
                subtitle={`启用: ${statistics?.active_pipelines || 0}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='仓储位置'
                value={statistics?.storage_locations || 0}
                icon={<Warehouse size={24} />}
                gradient={['warning.main', ct.warning.dark]}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='现场取证'
                value={statistics?.evidence_records || 0}
                icon={<Camera size={24} />}
                gradient={[ct.pink[500], ct.pink.dark]}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='厂区地图'
                value={statistics?.factory_maps || 0}
                icon={<Map size={24} />}
                gradient={[ct.secondary.main, ct.secondary.dark]}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <MetricCard
                title='业务位置'
                value={statistics?.business_locations || 0}
                icon={<Building2 size={24} />}
                gradient={[ct.teal.main, ct.teal.dark]}
              />
            </Grid>
          </Grid>

          <Grid
            container
            spacing={3}
            sx={{ mb: 4 }}
          >
            <Grid size={{ xs: 12, lg: 6 }}>
              <StatsChart
                title='业务类型分布'
                type='pie'
                data={[
                  {
                    name: '设备点位',
                    value: statistics?.device_points || 0,
                    color: ct.success.main,
                  },
                  {
                    name: '管线',
                    value: statistics?.pipelines || 0,
                    color: ct.secondary[400],
                  },
                  {
                    name: '仓储位置',
                    value: statistics?.storage_locations || 0,
                    color: 'warning.main',
                  },
                  {
                    name: '厂区地图',
                    value: statistics?.factory_maps || 0,
                    color: 'secondary.main',
                  },
                  {
                    name: '业务位置',
                    value: statistics?.business_locations || 0,
                    color: ct.teal.main,
                  },
                ].filter((d) => d.value > 0)}
                dataKey='value'
                nameKey='name'
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <StatsChart
                title='启用状态对比'
                type='bar'
                data={[
                  {
                    name: '设备点位',
                    启用: statistics?.active_devices || 0,
                    总数: statistics?.device_points || 0,
                  },
                  {
                    name: '管线',
                    启用: statistics?.active_pipelines || 0,
                    总数: statistics?.pipelines || 0,
                  },
                ]}
                dataKey='name'
                yKeys={['启用', '总数']}
                colors={[ct.success.main, ct.secondary[400]]}
              />
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 3,
              overflowX: 'auto',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant='scrollable'
              scrollButtons='auto'
              sx={{ minHeight: 48 }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  label={tab.label}
                  icon={tab.icon as React.ReactElement}
                  iconPosition='start'
                  sx={{ minHeight: 48, fontWeight: 500 }}
                />
              ))}
            </Tabs>
          </Paper>

          {activeTab === 'map' ? (
            <Paper
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                height: 500,
                position: 'relative',
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <CircularProgress sx={{ color: 'info.main' }} />
                </Box>
              ) : (
                <MapView
                  devicePoints={devicePoints}
                  pipelines={pipelines}
                  storageLocations={storageLocations}
                  onMarkerClick={(item) => setSelectedItem(item)}
                />
              )}
            </Paper>
          ) : (
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
                <Stack
                  direction='row'
                  spacing={2}
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <TextField
                    size='small'
                    placeholder='搜索...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    onClick={downloadTemplate}
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
                      <SearchIcon
                        size={32}
                        color='text.disabled'
                      />
                    </Box>
                    <Typography color='text.secondary'>暂无数据</Typography>
                  </Box>
                ) : (
                  <>
                    {activeTab === 'devicePoints' && (
                      <DataTable
                        columns={devicePointColumns}
                        data={filteredData as DevicePoint[]}
                        searchKey='name'
                        searchPlaceholder='搜索设备名称...'
                        exportFileName='gis-device-points'
                      />
                    )}
                    {activeTab === 'pipelines' && (
                      <DataTable
                        columns={pipelineColumns}
                        data={filteredData as Pipeline[]}
                        searchKey='name'
                        searchPlaceholder='搜索管线名称...'
                        exportFileName='gis-pipelines'
                      />
                    )}
                    {activeTab === 'storageLocations' && (
                      <DataTable
                        columns={storageLocationColumns}
                        data={filteredData as StorageLocation[]}
                        searchKey='name'
                        searchPlaceholder='搜索库位名称...'
                        exportFileName='gis-storage-locations'
                      />
                    )}
                    {activeTab === 'evidenceRecords' && (
                      <DataTable
                        columns={evidenceRecordColumns}
                        data={filteredData as EvidenceRecord[]}
                        searchKey='title'
                        searchPlaceholder='搜索记录标题...'
                        exportFileName='gis-evidence-records'
                      />
                    )}
                    {activeTab === 'factoryMaps' && (
                      <DataTable
                        columns={factoryMapColumns}
                        data={filteredData as FactoryMap[]}
                        searchKey='name'
                        searchPlaceholder='搜索地图名称...'
                        exportFileName='gis-factory-maps'
                      />
                    )}
                    {activeTab === 'businessLocations' && (
                      <DataTable
                        columns={businessLocationColumns}
                        data={filteredData as BusinessLocation[]}
                        searchKey='business_name'
                        searchPlaceholder='搜索业务名称...'
                        exportFileName='gis-business-locations'
                      />
                    )}
                  </>
                )}
              </Box>
            </Paper>
          )}

          <Dialog
            open={showModal}
            onClose={resetModal}
            maxWidth='md'
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
          >
            <DialogTitle>
              <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {modalType === 'create' ? '新建' : '编辑'}
                </Typography>
                <IconButton
                  onClick={resetModal}
                  size='small'
                  aria-label='关闭新建点位对话框'
                >
                  <X size={20} />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack
                spacing={3}
                sx={{ pt: 1 }}
              >
                {activeTab === 'devicePoints' && (
                  <Stack spacing={3}>
                    <InputField
                      label='名称'
                      name='name'
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label='设备类型'
                      name='device_type'
                      value={formData.device_type}
                      onChange={(v) => setFormData({ ...formData, device_type: v })}
                      error={formErrors.device_type}
                      required
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='纬度'
                          name='latitude'
                          type='number'
                          value={formData.latitude}
                          onChange={(v) => setFormData({ ...formData, latitude: v })}
                          error={formErrors.latitude}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='经度'
                          name='longitude'
                          type='number'
                          value={formData.longitude}
                          onChange={(v) => setFormData({ ...formData, longitude: v })}
                          error={formErrors.longitude}
                          required
                        />
                      </Grid>
                    </Grid>
                    <TextAreaField
                      label='描述'
                      value={formData.description}
                      onChange={(v) => setFormData({ ...formData, description: v })}
                    />
                  </Stack>
                )}
                {activeTab === 'pipelines' && (
                  <Stack spacing={3}>
                    <InputField
                      label='名称'
                      name='name'
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label='管线类型'
                      name='pipeline_type'
                      value={formData.pipeline_type}
                      onChange={(v) => setFormData({ ...formData, pipeline_type: v })}
                      error={formErrors.pipeline_type}
                      required
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='起点纬度'
                          name='start_lat'
                          type='number'
                          value={formData.start_lat}
                          onChange={(v) => setFormData({ ...formData, start_lat: v })}
                          error={formErrors.start_lat}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='起点经度'
                          name='start_lng'
                          type='number'
                          value={formData.start_lng}
                          onChange={(v) => setFormData({ ...formData, start_lng: v })}
                          error={formErrors.start_lng}
                          required
                        />
                      </Grid>
                    </Grid>
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='终点纬度'
                          name='end_lat'
                          type='number'
                          value={formData.end_lat}
                          onChange={(v) => setFormData({ ...formData, end_lat: v })}
                          error={formErrors.end_lat}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='终点经度'
                          name='end_lng'
                          type='number'
                          value={formData.end_lng}
                          onChange={(v) => setFormData({ ...formData, end_lng: v })}
                          error={formErrors.end_lng}
                          required
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}
                {activeTab === 'storageLocations' && (
                  <Stack spacing={3}>
                    <InputField
                      label='名称'
                      name='name'
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label='类型'
                      name='location_type'
                      value={formData.location_type}
                      onChange={(v) => setFormData({ ...formData, location_type: v })}
                      error={formErrors.location_type}
                      required
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='纬度'
                          name='latitude'
                          type='number'
                          value={formData.latitude}
                          onChange={(v) => setFormData({ ...formData, latitude: v })}
                          error={formErrors.latitude}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='经度'
                          name='longitude'
                          type='number'
                          value={formData.longitude}
                          onChange={(v) => setFormData({ ...formData, longitude: v })}
                          error={formErrors.longitude}
                          required
                        />
                      </Grid>
                    </Grid>
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='容量'
                          name='capacity'
                          type='number'
                          value={formData.capacity}
                          onChange={(v) => setFormData({ ...formData, capacity: v })}
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='当前用量'
                          name='current_usage'
                          type='number'
                          value={formData.current_usage}
                          onChange={(v) => setFormData({ ...formData, current_usage: v })}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}
                {activeTab === 'evidenceRecords' && (
                  <Stack spacing={3}>
                    <InputField
                      label='标题'
                      name='title'
                      value={formData.title}
                      onChange={(v) => setFormData({ ...formData, title: v })}
                      error={formErrors.title}
                      required
                    />
                    <InputField
                      label='类型'
                      name='evidence_type'
                      value={formData.evidence_type}
                      onChange={(v) => setFormData({ ...formData, evidence_type: v })}
                      error={formErrors.evidence_type}
                      required
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='纬度'
                          name='latitude'
                          type='number'
                          value={formData.latitude}
                          onChange={(v) => setFormData({ ...formData, latitude: v })}
                          error={formErrors.latitude}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='经度'
                          name='longitude'
                          type='number'
                          value={formData.longitude}
                          onChange={(v) => setFormData({ ...formData, longitude: v })}
                          error={formErrors.longitude}
                          required
                        />
                      </Grid>
                    </Grid>
                    <InputField
                      label='记录人'
                      name='recorded_by'
                      value={formData.recorded_by}
                      onChange={(v) => setFormData({ ...formData, recorded_by: v })}
                      error={formErrors.recorded_by}
                      required
                    />
                  </Stack>
                )}
                {activeTab === 'factoryMaps' && (
                  <Stack spacing={3}>
                    <InputField
                      label='名称'
                      name='name'
                      value={formData.name}
                      onChange={(v) => setFormData({ ...formData, name: v })}
                      error={formErrors.name}
                      required
                    />
                    <InputField
                      label='编号'
                      name='code'
                      value={formData.code}
                      onChange={(v) => setFormData({ ...formData, code: v })}
                      error={formErrors.code}
                      required
                    />
                    <InputField
                      label='地图类型'
                      name='map_type'
                      value={formData.map_type}
                      onChange={(v) => setFormData({ ...formData, map_type: v })}
                      error={formErrors.map_type}
                      required
                    />
                    <InputField
                      label='文件URL'
                      name='file_url'
                      value={formData.file_url}
                      onChange={(v) => setFormData({ ...formData, file_url: v })}
                    />
                  </Stack>
                )}
                {activeTab === 'businessLocations' && (
                  <Stack spacing={3}>
                    <InputField
                      label='业务名称'
                      name='business_name'
                      value={formData.business_name}
                      onChange={(v) => setFormData({ ...formData, business_name: v })}
                      error={formErrors.business_name}
                      required
                    />
                    <InputField
                      label='业务类型'
                      name='business_type'
                      value={formData.business_type}
                      onChange={(v) => setFormData({ ...formData, business_type: v })}
                      error={formErrors.business_type}
                      required
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='纬度'
                          name='lat'
                          type='number'
                          value={formData.lat}
                          onChange={(v) => setFormData({ ...formData, lat: v })}
                          error={formErrors.lat}
                          required
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='经度'
                          name='lng'
                          type='number'
                          value={formData.lng}
                          onChange={(v) => setFormData({ ...formData, lng: v })}
                          error={formErrors.lng}
                          required
                        />
                      </Grid>
                    </Grid>
                    <InputField
                      label='地址'
                      name='address'
                      value={formData.address}
                      onChange={(v) => setFormData({ ...formData, address: v })}
                    />
                    <Grid
                      container
                      spacing={2}
                    >
                      <Grid size={6}>
                        <InputField
                          label='联系人'
                          name='contact_person'
                          value={formData.contact_person}
                          onChange={(v) => setFormData({ ...formData, contact_person: v })}
                        />
                      </Grid>
                      <Grid size={6}>
                        <InputField
                          label='联系电话'
                          name='contact_phone'
                          value={formData.contact_phone}
                          onChange={(v) => setFormData({ ...formData, contact_phone: v })}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={resetModal}
                variant='outlined'
              >
                取消
              </Button>
              <Button
                onClick={modalType === 'create' ? handleCreate : handleEdit}
                variant='contained'
                sx={{
                  bgcolor: 'info.main',
                  '&:hover': { bgcolor: 'cyan.dark' },
                }}
              >
                {modalType === 'create' ? '创建' : '保存'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportPreview(null);
              setImportConfirm(false);
            }}
            maxWidth='sm'
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
          >
            <DialogTitle>
              <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  导入数据
                </Typography>
                <IconButton
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                    setImportConfirm(false);
                  }}
                  size='small'
                >
                  <X size={20} />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack
                spacing={3}
                sx={{ pt: 1 }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, mb: 1 }}
                  >
                    选择CSV文件
                  </Typography>
                  <Box
                    sx={{
                      border: 2,
                      borderStyle: 'dashed',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'info.main' },
                    }}
                    component='label'
                    htmlFor='csv-upload'
                  >
                    <input
                      type='file'
                      accept='.csv'
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id='csv-upload'
                    />
                    <Upload
                      size={48}
                      color='text.disabled'
                      style={{ marginBottom: 8 }}
                    />
                    <Typography color='text.secondary'>点击或拖拽文件到此处</Typography>
                    <Typography
                      variant='caption'
                      color='text.disabled'
                      sx={{ mt: 1 }}
                    >
                      支持CSV格式文件
                    </Typography>
                  </Box>
                </Box>
                {importFile && (
                  <Paper sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
                    <Stack
                      direction='row'
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Stack
                        direction='row'
                        spacing={1.5}
                        sx={{ alignItems: 'center' }}
                      >
                        <FileText
                          size={32}
                          color='text.secondary'
                        />
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {importFile.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {(importFile.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                      </Stack>
                      <IconButton
                        size='small'
                        onClick={() => {
                          setImportFile(null);
                          setImportPreview(null);
                          setImportConfirm(false);
                        }}
                      >
                        <X size={20} />
                      </IconButton>
                    </Stack>
                  </Paper>
                )}
                {importPreview && (
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500, mb: 1 }}
                    >
                      文件预览（前10行）
                    </Typography>
                    <TableContainer
                      component={Paper}
                      variant='outlined'
                      sx={{ maxHeight: 192, borderRadius: 1.5 }}
                    >
                      <Table
                        size='small'
                        stickyHeader
                      >
                        <TableHead>
                          <TableRow>
                            {importPreview[0]?.map((header, index) => (
                              <TableCell
                                key={index}
                                sx={{ fontWeight: 500, bgcolor: 'grey.50' }}
                              >
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {importPreview.slice(1).map((row, rowIndex) => (
                            <TableRow
                              key={rowIndex}
                              hover
                            >
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <FormControlLabel
                      sx={{ mt: 1.5 }}
                      control={
                        <Checkbox
                          checked={importConfirm}
                          onChange={(e) => setImportConfirm(e.target.checked)}
                        />
                      }
                      label='我确认要导入以上数据'
                    />
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                  setImportConfirm(false);
                }}
                variant='outlined'
              >
                取消
              </Button>
              <Button
                onClick={handleImport}
                variant='contained'
                color='success'
                disabled={!importFile || !importConfirm}
              >
                确认导入
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </PageContainer>
  );
};

const Gispage: React.FC = () => {
  return (
    <GisProvider>
      <GisContent />
    </GisProvider>
  );
};

export default Gispage;
