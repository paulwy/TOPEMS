import { Grid } from '@/components';
import { useNotificationStore } from '@/store';
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
import { useGis, GisProvider } from '../../../context/GisContext';
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
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import type { TabType, ModalType, FormErrors, GisEntity } from './types';
import { PageHeader } from './components/PageHeader';
import { StatsSection } from './components/StatsSection';
import { MapSection } from './components/MapSection';
import { DataTableSection } from './components/DataTableSection';
import { EntityFormModal } from './components/EntityFormModal';
import { ImportModal } from './components/ImportModal';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const GisContent: React.FC = () => {
  const { t } = useTranslation();
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
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<GisEntity | null>(null);
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

  const openEditModal = (item: GisEntity) => {
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
    const properties = itemData.properties as unknown as Record<string, unknown> | undefined;
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

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportConfirm(false);
  };

  const filteredData = useMemo<GisEntity[]>(() => {
    if (!searchTerm.trim()) {
      switch (activeTab) {
        case 'devicePoints':
          return devicePoints as GisEntity[];
        case 'pipelines':
          return pipelines as GisEntity[];
        case 'storageLocations':
          return storageLocations as GisEntity[];
        case 'evidenceRecords':
          return evidenceRecords as GisEntity[];
        case 'factoryMaps':
          return factoryMaps as GisEntity[];
        case 'businessLocations':
          return businessLocations as GisEntity[];
        default:
          return [];
      }
    }
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'devicePoints':
        return devicePoints.filter(
          (d: DevicePoint) =>
            d.name.toLowerCase().includes(term) || d.device_type.toLowerCase().includes(term)
        ) as GisEntity[];
      case 'pipelines':
        return pipelines.filter(
          (p: Pipeline) =>
            p.name.toLowerCase().includes(term) || p.pipeline_type.toLowerCase().includes(term)
        ) as GisEntity[];
      case 'storageLocations':
        return storageLocations.filter(
          (s: StorageLocation) =>
            s.name.toLowerCase().includes(term) || s.location_type.toLowerCase().includes(term)
        ) as GisEntity[];
      case 'evidenceRecords':
        return evidenceRecords.filter(
          (e: EvidenceRecord) =>
            e.title.toLowerCase().includes(term) || e.evidence_type.toLowerCase().includes(term)
        ) as GisEntity[];
      case 'factoryMaps':
        return factoryMaps.filter(
          (m: FactoryMap) =>
            m.name.toLowerCase().includes(term) || m.code.toLowerCase().includes(term)
        ) as GisEntity[];
      case 'businessLocations':
        return businessLocations.filter(
          (b: BusinessLocation) =>
            b.business_name.toLowerCase().includes(term) ||
            b.business_type.toLowerCase().includes(term)
        ) as GisEntity[];
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

  const handleFormChange = (key: string, value: unknown) => {
    setFormData({ ...formData, [key]: value });
  };

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
          <PageHeader
            activeTab={activeTab}
            loading={loading}
            onRefresh={() => loadAllData(true)}
            onCreate={openCreateModal}
            onImport={() => setShowImportModal(true)}
          />

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

          <StatsSection statistics={statistics} />

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
            <MapSection
              loading={loading}
              devicePoints={devicePoints}
              pipelines={pipelines}
              storageLocations={storageLocations}
              onMarkerClick={(item) => setSelectedItem(item)}
            />
          ) : (
            <DataTableSection
              activeTab={activeTab}
              loading={loading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filteredData={filteredData}
              onDownloadTemplate={downloadTemplate}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}

          <EntityFormModal
            open={showModal}
            modalType={modalType}
            activeTab={activeTab}
            formData={formData}
            formErrors={formErrors}
            onClose={resetModal}
            onSubmit={modalType === 'create' ? handleCreate : handleEdit}
            onFormChange={handleFormChange}
          />

          <ImportModal
            open={showImportModal}
            importFile={importFile}
            importPreview={importPreview}
            importConfirm={importConfirm}
            onClose={resetImportModal}
            onFileChange={handleFileChange}
            onConfirmChange={setImportConfirm}
            onImport={handleImport}
          />
        </Box>
      </Box>
    </PageContainer>
  );
};

const GisPage: React.FC = () => {
  return (
    <GisProvider>
      <GisContent />
    </GisProvider>
  );
};

export default GisPage;
