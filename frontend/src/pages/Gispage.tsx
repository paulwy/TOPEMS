import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  ChevronRight,
  ArrowRight,
  Warehouse,
  Camera,
  Loader2,
  X,
  Edit,
  Trash2,
  Check,
  Box,
  Smartphone,
  MessageSquare,
  User,
  Download,
  Upload,
  AlertCircle,
  Map,
  Building2,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  gisApi,
  DevicePoint,
  Pipeline,
  StorageLocation,
  EvidenceRecord,
  CreateDevicePointRequest,
  CreatePipelineRequest,
  CreateStorageLocationRequest,
  CreateEvidenceRecordRequest,
  FactoryMap,
  BusinessLocation,
  CreateFactoryMapRequest,
  CreateBusinessLocationRequest,
  GisStatistics,
} from '../api/gis';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import MetricCard from '../components/MetricCard';
import StatsChart from '../components/StatsChart';

type TabType = 'devicePoints' | 'pipelines' | 'storageLocations' | 'evidenceRecords' | 'factoryMaps' | 'businessLocations';

type ModalType = 'create' | 'edit' | null;

const Gispage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('devicePoints');
  const [devicePoints, setDevicePoints] = useState<DevicePoint[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [factoryMaps, setFactoryMaps] = useState<FactoryMap[]>([]);
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [statistics, setStatistics] = useState<GisStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const statsResponse = await gisApi.getStatistics();
      if (statsResponse.success && statsResponse.data) {
        setStatistics(statsResponse.data);
      }
      await Promise.all([
        loadDevicePoints(),
        loadPipelines(),
        loadStorageLocations(),
        loadEvidenceRecords(),
        loadFactoryMaps(),
        loadBusinessLocations(),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      pending: '待处理',
      completed: '已完成',
    };
    return statusMap[status] || status;
  };

  const adaptDevicePoint = (item: any): any => {
    return {
      id: item.id,
      name: item.device_name || item.name,
      code: item.device_code || item.code,
      device_type: item.device_type,
      latitude: item.position?.lat || item.latitude,
      longitude: item.position?.lng || item.longitude,
      status: mapStatusToChinese(item.status),
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
      last_inspected: item.last_inspected,
    };
  };

  const adaptPipeline = (item: any): any => {
    const path = item.path;
    let start_point: [number, number] = [0, 0];
    let end_point: [number, number] = [0, 0];

    if (Array.isArray(path) && path.length >= 2) {
      start_point = [path[0]?.lat || path[0]?.[0] || 0, path[0]?.lng || path[0]?.[1] || 0];
      end_point = [
        path[path.length - 1]?.lat || path[path.length - 1]?.[0] || 0,
        path[path.length - 1]?.lng || path[path.length - 1]?.[1] || 0,
      ];
    }

    return {
      id: item.id,
      name: item.name,
      code: item.code,
      pipeline_type: item.pipeline_type,
      start_point,
      end_point,
      status: mapStatusToChinese(item.status),
      created_at: item.created_at,
      updated_at: item.updated_at,
      properties: item.properties,
    };
  };

  const adaptStorageLocation = (item: any): any => {
    return {
      id: item.id,
      name: item.warehouse_name || item.name,
      code: item.code,
      location_type: item.location_type || item.zone,
      latitude: item.position?.lat || item.latitude,
      longitude: item.position?.lng || item.longitude,
      capacity: item.capacity,
      current_usage:
        item.current_usage || (item.usage_rate && item.capacity ? item.usage_rate * item.capacity : undefined),
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
      status: item.status,
    };
  };

  const adaptEvidenceRecord = (item: any): any => {
    return {
      id: item.id,
      record_no: item.id,
      title: item.title || '现场取证',
      evidence_type: item.evidence_type || 'photo',
      latitude: item.position?.lat || item.latitude,
      longitude: item.position?.lng || item.longitude,
      file_url: item.photo_url || item.file_url,
      recorded_by: item.taken_by || item.recorded_by,
      recorded_at: item.taken_at || item.recorded_at || item.created_at,
      description: item.description,
      created_at: item.created_at,
    };
  };

  const adaptFactoryMap = (item: any): any => {
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      map_type: item.map_type,
      file_url: item.file_url,
      bounds: item.bounds,
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  };

  const adaptBusinessLocation = (item: any): any => {
    return {
      id: item.id,
      business_type: item.business_type,
      business_name: item.business_name,
      business_code: item.business_code,
      category: item.category,
      position: item.position,
      address: item.address,
      contact_person: item.contact_person,
      contact_phone: item.contact_phone,
      capacity: item.capacity,
      current_usage: item.current_usage,
      status: mapStatusToChinese(item.status),
      properties: item.properties,
      description: item.description,
      external_id: item.external_id,
      external_type: item.external_type,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  };

  const loadDevicePoints = async () => {
    try {
      const response = await gisApi.listDevicePoints();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.device_points && Array.isArray(data.device_points)) {
          rawItems = data.device_points;
        } else if (data.devicePoints && Array.isArray(data.devicePoints)) {
          rawItems = data.devicePoints;
        }
        const adapted = rawItems.map((item) => adaptDevicePoint(item));
        setDevicePoints(adapted);
      }
    } catch (err) {
      console.error('加载设备点位失败:', err);
    }
  };

  const loadPipelines = async () => {
    try {
      const response = await gisApi.listPipelines();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.pipelines && Array.isArray(data.pipelines)) {
          rawItems = data.pipelines;
        }
        const adapted = rawItems.map((item) => adaptPipeline(item));
        setPipelines(adapted);
      }
    } catch (err) {
      console.error('加载管线失败:', err);
    }
  };

  const loadStorageLocations = async () => {
    try {
      const response = await gisApi.listStorageLocations();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.storage_locations && Array.isArray(data.storage_locations)) {
          rawItems = data.storage_locations;
        } else if (data.storageLocations && Array.isArray(data.storageLocations)) {
          rawItems = data.storageLocations;
        }
        const adapted = rawItems.map((item) => adaptStorageLocation(item));
        setStorageLocations(adapted);
      }
    } catch (err) {
      console.error('加载仓储位置失败:', err);
    }
  };

  const loadEvidenceRecords = async () => {
    try {
      const response = await gisApi.listEvidenceRecords();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.evidence_records && Array.isArray(data.evidence_records)) {
          rawItems = data.evidence_records;
        } else if (data.evidenceRecords && Array.isArray(data.evidenceRecords)) {
          rawItems = data.evidenceRecords;
        }
        const adapted = rawItems.map((item) => adaptEvidenceRecord(item));
        setEvidenceRecords(adapted);
      }
    } catch (err) {
      console.error('加载现场取证失败:', err);
    }
  };

  const loadFactoryMaps = async () => {
    try {
      const response = await gisApi.listFactoryMaps();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.factory_maps && Array.isArray(data.factory_maps)) {
          rawItems = data.factory_maps;
        } else if (data.factoryMaps && Array.isArray(data.factoryMaps)) {
          rawItems = data.factoryMaps;
        }
        const adapted = rawItems.map((item) => adaptFactoryMap(item));
        setFactoryMaps(adapted);
      }
    } catch (err) {
      console.error('加载工厂地图失败:', err);
    }
  };

  const loadBusinessLocations = async () => {
    try {
      const response = await gisApi.listBusinessLocations();
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawItems = data.data;
        } else if (data.business_locations && Array.isArray(data.business_locations)) {
          rawItems = data.business_locations;
        } else if (data.businessLocations && Array.isArray(data.businessLocations)) {
          rawItems = data.businessLocations;
        }
        const adapted = rawItems.map((item) => adaptBusinessLocation(item));
        setBusinessLocations(adapted);
      }
    } catch (err) {
      console.error('加载业务位置失败:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'devicePoints':
          await loadDevicePoints();
          break;
        case 'pipelines':
          await loadPipelines();
          break;
        case 'storageLocations':
          await loadStorageLocations();
          break;
        case 'evidenceRecords':
          await loadEvidenceRecords();
          break;
        case 'factoryMaps':
          await loadFactoryMaps();
          break;
        case 'businessLocations':
          await loadBusinessLocations();
          break;
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      switch (activeTab) {
        case 'devicePoints':
          const devicePointReq: CreateDevicePointRequest = {
            name: formData.name || '',
            description: formData.description,
            device_type: formData.device_type || '',
            latitude: parseFloat(formData.latitude || '0'),
            longitude: parseFloat(formData.longitude || '0'),
            status: formData.status || 'active',
          };
          await gisApi.createDevicePoint(devicePointReq);
          break;
        case 'pipelines':
          const pipelineReq: CreatePipelineRequest = {
            name: formData.name || '',
            description: formData.description,
            pipeline_type: formData.pipeline_type || '',
            start_point: [parseFloat(formData.start_lat || '0'), parseFloat(formData.start_lng || '0')],
            end_point: [parseFloat(formData.end_lat || '0'), parseFloat(formData.end_lng || '0')],
            status: formData.status || 'active',
          };
          await gisApi.createPipeline(pipelineReq);
          break;
        case 'storageLocations':
          const storageReq: CreateStorageLocationRequest = {
            name: formData.name || '',
            description: formData.description,
            location_type: formData.location_type || '',
            latitude: parseFloat(formData.latitude || '0'),
            longitude: parseFloat(formData.longitude || '0'),
            capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
            current_usage: formData.current_usage ? parseFloat(formData.current_usage) : undefined,
          };
          await gisApi.createStorageLocation(storageReq);
          break;
        case 'evidenceRecords':
          const evidenceReq: CreateEvidenceRecordRequest = {
            title: formData.title || '',
            description: formData.description,
            evidence_type: formData.evidence_type || '',
            latitude: parseFloat(formData.latitude || '0'),
            longitude: parseFloat(formData.longitude || '0'),
            file_url: formData.file_url,
            recorded_by: formData.recorded_by || '',
          };
          await gisApi.createEvidenceRecord(evidenceReq);
          break;
        case 'factoryMaps':
          const factoryMapReq: CreateFactoryMapRequest = {
            name: formData.name || '',
            code: formData.code || '',
            map_type: formData.map_type || '',
            file_url: formData.file_url || '',
            description: formData.description,
          };
          await gisApi.createFactoryMap(factoryMapReq);
          break;
        case 'businessLocations':
          const businessReq: CreateBusinessLocationRequest = {
            business_type: formData.business_type || '',
            business_name: formData.business_name || '',
            business_code: formData.business_code,
            category: formData.category,
            position: { lat: parseFloat(formData.lat || '0'), lng: parseFloat(formData.lng || '0') },
            address: formData.address,
            contact_person: formData.contact_person,
            contact_phone: formData.contact_phone,
            capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
            current_usage: formData.current_usage ? parseFloat(formData.current_usage) : undefined,
            status: formData.status || 'active',
            properties: formData.properties ? JSON.parse(formData.properties) : undefined,
            description: formData.description,
            external_id: formData.external_id,
            external_type: formData.external_type,
          };
          await gisApi.createBusinessLocation(businessReq);
          break;
      }
      showNotification('success', '创建成功');
      resetModal();
      loadAllData();
    } catch (err) {
      showNotification('error', '创建失败');
      console.error('创建失败:', err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      switch (activeTab) {
        case 'devicePoints':
          const devicePointReq: Partial<CreateDevicePointRequest> = {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            device_type: formData.device_type || editingItem.device_type,
            latitude: parseFloat(formData.latitude || editingItem.latitude?.toString() || '0'),
            longitude: parseFloat(formData.longitude || editingItem.longitude?.toString() || '0'),
            status: formData.status || editingItem.status,
          };
          await gisApi.updateDevicePoint(editingItem.id, devicePointReq);
          break;
        case 'pipelines':
          const pipelineReq: Partial<CreatePipelineRequest> = {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            pipeline_type: formData.pipeline_type || editingItem.pipeline_type,
            start_point: formData.start_lat && formData.start_lng
              ? [parseFloat(formData.start_lat), parseFloat(formData.start_lng)]
              : editingItem.start_point,
            end_point: formData.end_lat && formData.end_lng
              ? [parseFloat(formData.end_lat), parseFloat(formData.end_lng)]
              : editingItem.end_point,
            status: formData.status || editingItem.status,
          };
          await gisApi.updatePipeline(editingItem.id, pipelineReq);
          break;
        case 'storageLocations':
          const storageReq: Partial<CreateStorageLocationRequest> = {
            name: formData.name || editingItem.name,
            description: formData.description || editingItem.description,
            location_type: formData.location_type || editingItem.location_type,
            latitude: parseFloat(formData.latitude || editingItem.latitude?.toString() || '0'),
            longitude: parseFloat(formData.longitude || editingItem.longitude?.toString() || '0'),
            capacity: formData.capacity ? parseFloat(formData.capacity) : editingItem.capacity,
            current_usage: formData.current_usage ? parseFloat(formData.current_usage) : editingItem.current_usage,
          };
          await gisApi.updateStorageLocation(editingItem.id, storageReq);
          break;
        case 'factoryMaps':
          const factoryMapReq: Partial<CreateFactoryMapRequest> = {
            name: formData.name || editingItem.name,
            code: formData.code || editingItem.code,
            map_type: formData.map_type || editingItem.map_type,
            file_url: formData.file_url || editingItem.file_url,
            description: formData.description || editingItem.description,
          };
          await gisApi.updateFactoryMap(editingItem.id, factoryMapReq);
          break;
        case 'businessLocations':
          const businessReq: Partial<CreateBusinessLocationRequest> = {
            business_type: formData.business_type || editingItem.business_type,
            business_name: formData.business_name || editingItem.business_name,
            business_code: formData.business_code || editingItem.business_code,
            category: formData.category || editingItem.category,
            position: formData.lat && formData.lng
              ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
              : editingItem.position,
            address: formData.address || editingItem.address,
            contact_person: formData.contact_person || editingItem.contact_person,
            contact_phone: formData.contact_phone || editingItem.contact_phone,
            capacity: formData.capacity ? parseFloat(formData.capacity) : editingItem.capacity,
            current_usage: formData.current_usage ? parseFloat(formData.current_usage) : editingItem.current_usage,
            status: formData.status || editingItem.status,
            properties: formData.properties ? JSON.parse(formData.properties) : editingItem.properties,
            description: formData.description || editingItem.description,
            external_id: formData.external_id || editingItem.external_id,
            external_type: formData.external_type || editingItem.external_type,
          };
          await gisApi.updateBusinessLocation(editingItem.id, businessReq);
          break;
      }
      showNotification('success', '更新成功');
      resetModal();
      loadAllData();
    } catch (err) {
      showNotification('error', '更新失败');
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
        case 'devicePoints':
          await gisApi.deleteDevicePoint(id);
          break;
        case 'pipelines':
          await gisApi.deletePipeline(id);
          break;
        case 'storageLocations':
          await gisApi.deleteStorageLocation(id);
          break;
        case 'evidenceRecords':
          await gisApi.deleteEvidenceRecord(id);
          break;
        case 'factoryMaps':
          await gisApi.deleteFactoryMap(id);
          break;
        case 'businessLocations':
          await gisApi.deleteBusinessLocation(id);
          break;
      }
      showNotification('success', '删除成功');
      loadAllData();
    } catch (err) {
      showNotification('error', '删除失败');
      console.error('删除失败:', err);
    }
  };

  const safeDevicePoints = Array.isArray(devicePoints) ? devicePoints : [];
  const safePipelines = Array.isArray(pipelines) ? pipelines : [];
  const safeStorageLocations = Array.isArray(storageLocations) ? storageLocations : [];
  const safeEvidenceRecords = Array.isArray(evidenceRecords) ? evidenceRecords : [];
  const safeFactoryMaps = Array.isArray(factoryMaps) ? factoryMaps : [];
  const safeBusinessLocations = Array.isArray(businessLocations) ? businessLocations : [];

  const openCreateModal = () => {
    setModalType('create');
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    const initialFormData: any = { ...item };
    if (item.position?.lat !== undefined) {
      initialFormData.lat = item.position.lat;
      initialFormData.lng = item.position.lng;
    }
    if (item.start_point) {
      initialFormData.start_lat = item.start_point[0];
      initialFormData.start_lng = item.start_point[1];
    }
    if (item.end_point) {
      initialFormData.end_lat = item.end_point[0];
      initialFormData.end_lng = item.end_point[1];
    }
    if (item.properties) {
      initialFormData.properties = JSON.stringify(item.properties);
    }
    setFormData(initialFormData);
    setShowModal(true);
  };

  const tabs = [
    { id: 'devicePoints', label: '设备点位', icon: MapPin },
    { id: 'pipelines', label: '管线管理', icon: ArrowRight },
    { id: 'storageLocations', label: '仓储位置', icon: Warehouse },
    { id: 'evidenceRecords', label: '现场取证', icon: Camera },
    { id: 'factoryMaps', label: '厂区地图', icon: Map },
    { id: 'businessLocations', label: '业务位置', icon: Building2 },
  ];

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('启用')) return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('待处理')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('inactive') || s.includes('禁用')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const devicePointColumns: ColumnDef<DevicePoint>[] = [
    { accessorKey: 'name', header: '设备名称' },
    { accessorKey: 'code', header: '编号' },
    { accessorKey: 'device_type', header: '类型' },
    { accessorKey: 'latitude', header: '纬度' },
    { accessorKey: 'longitude', header: '经度' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
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
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const storageLocationColumns: ColumnDef<StorageLocation>[] = [
    { accessorKey: 'name', header: '库位名称' },
    { accessorKey: 'code', header: '编号' },
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
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const evidenceRecordColumns: ColumnDef<EvidenceRecord>[] = [
    { accessorKey: 'record_no', header: '记录编号' },
    { accessorKey: 'title', header: '标题' },
    { accessorKey: 'evidence_type', header: '类型' },
    { accessorKey: 'recorded_by', header: '记录人' },
    {
      accessorKey: 'recorded_at',
      header: '记录时间',
      cell: ({ row }) => (
        <span>{row.original.recorded_at ? new Date(row.original.recorded_at).toLocaleString() : ''}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const factoryMapColumns: ColumnDef<FactoryMap>[] = [
    { accessorKey: 'name', header: '地图名称' },
    { accessorKey: 'code', header: '编号' },
    { accessorKey: 'map_type', header: '地图类型' },
    { accessorKey: 'file_url', header: '文件URL' },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ row }) => (
        <span>{row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : ''}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
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
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button onClick={() => openEditModal(row.original)} className='p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg'>
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除此项吗？')) {
                handleDelete(row.original.id);
              }
            }}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const downloadTemplate = () => {
    let headers: string[];
    let sampleRow: string[];

    switch (activeTab) {
      case 'devicePoints':
        headers = ['name', 'code', 'device_type', 'latitude', 'longitude', 'status', 'description'];
        sampleRow = ['设备A', 'D001', '传感器', '31.2304', '121.4737', 'active', '设备描述'];
        break;
      case 'pipelines':
        headers = ['name', 'pipeline_type', 'start_lat', 'start_lng', 'end_lat', 'end_lng', 'status'];
        sampleRow = ['管线A', '水管', '31.2304', '121.4737', '31.2305', '121.4738', 'active'];
        break;
      case 'storageLocations':
        headers = ['name', 'code', 'location_type', 'latitude', 'longitude', 'capacity', 'current_usage'];
        sampleRow = ['仓库A', 'S001', '原材料仓', '31.2304', '121.4737', '1000', '500'];
        break;
      case 'evidenceRecords':
        headers = ['title', 'evidence_type', 'latitude', 'longitude', 'recorded_by', 'file_url', 'description'];
        sampleRow = ['现场照片1', '照片', '31.2304', '121.4737', '张三', '', '证据描述'];
        break;
      case 'factoryMaps':
        headers = ['name', 'code', 'map_type', 'file_url', 'description'];
        sampleRow = ['厂区平面图', 'F001', '平面图', '', '地图描述'];
        break;
      case 'businessLocations':
        headers = ['business_name', 'business_type', 'business_code', 'category', 'lat', 'lng', 'address', 'contact_person', 'contact_phone', 'capacity', 'current_usage', 'status', 'description'];
        sampleRow = ['门店A', '零售', 'B001', '零售', '31.2304', '121.4737', '地址', '张三', '13800138000', '100', '50', 'active', '描述'];
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

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);

      try {
        const content = await file.text();
        const lines = content.split('\n').slice(0, 6);
        const preview = lines.map((line) => line.split(','));
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showNotification('error', '请选择要导入的文件');
      return;
    }

    try {
      const response = await gisApi.importData(activeTab, importFile);
      if (response.success) {
        showNotification('success', '导入成功');
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        loadAllData();
      } else {
        showNotification('error', response.message || '导入失败');
      }
    } catch (err) {
      showNotification('error', '导入失败');
      console.error('导入失败:', err);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='mb-8 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button onClick={() => navigate('/dashboard')} className='text-gray-500 hover:text-gray-700'>
              <ChevronRight className='w-6 h-6 rotate-180' />
            </button>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>厂区空间数字化</h1>
              <p className='text-gray-500'>管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setShowImportModal(true)}
              className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
            >
              <Upload className='w-4 h-4' />
              <span>导入</span>
            </button>
            <button
              onClick={openCreateModal}
              className='flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors'
            >
              <Plus className='w-5 h-5' />
              新建
            </button>
          </div>
        </div>

        {/* 统计仪表板 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8'>
          <MetricCard
            title='设备点位'
            value={stats.device_points}
            icon={<MapPin className='w-6 h-6' />}
            gradient={['#00C897', '#00A878']}
            subtitle={`启用: ${stats.active_devices}`}
            trend={stats.active_devices > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='管线管理'
            value={stats.pipelines}
            icon={<ArrowRight className='w-6 h-6' />}
            gradient={['#6366F1', '#4F46E5']}
            subtitle={`启用: ${stats.active_pipelines}`}
            trend={stats.active_pipelines > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='仓储位置'
            value={stats.storage_locations}
            icon={<Warehouse className='w-6 h-6' />}
            gradient={['#F59E0B', '#D97706']}
            trend='neutral'
          />
          <MetricCard
            title='现场取证'
            value={stats.evidence_records}
            icon={<Camera className='w-6 h-6' />}
            gradient={['#EC4899', '#DB2777']}
            trend='neutral'
          />
          <MetricCard
            title='厂区地图'
            value={stats.factory_maps}
            icon={<Map className='w-6 h-6' />}
            gradient={['#8B5CF6', '#7C3AED']}
            trend='neutral'
          />
          <MetricCard
            title='业务位置'
            value={stats.business_locations}
            icon={<Building2 className='w-6 h-6' />}
            gradient={['#14B8A6', '#0D9488']}
            trend='neutral'
          />
        </div>

        {/* 数据可视化 */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <StatsChart
            title='业务类型分布'
            type='pie'
            data={[
              { name: '设备点位', value: stats.device_points, color: '#00C897' },
              { name: '管线', value: stats.pipelines, color: '#6366F1' },
              { name: '仓储位置', value: stats.storage_locations, color: '#F59E0B' },
              { name: '厂区地图', value: stats.factory_maps, color: '#8B5CF6' },
              { name: '业务位置', value: stats.business_locations, color: '#14B8A6' },
            ].filter(d => d.value > 0)}
            dataKey='value'
            nameKey='name'
          />
          <StatsChart
            title='启用状态对比'
            type='bar'
            data={[
              {
                name: '设备点位',
                启用: stats.active_devices,
                总数: stats.device_points,
              },
              {
                name: '管线',
                启用: stats.active_pipelines,
                总数: stats.pipelines,
              },
            ]}
            dataKey='name'
            yKeys={['启用', '总数']}
            colors={['#00C897', '#6366F1']}
          />
        </div>

        <div className='flex gap-2 mb-6 border-b border-gray-200'>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-600 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className='w-5 h-5' />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
          <div className='p-4 border-b border-gray-200 bg-gray-50'>
            <div className='flex items-center justify-between'>
              <div className='relative flex-1 max-w-md'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  placeholder='搜索...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
                />
              </div>
            </div>
          </div>
          <div className='p-6'>
            {activeTab === 'devicePoints' && (
              <DataTable
                columns={devicePointColumns}
                data={safeDevicePoints}
                searchKey='name'
                searchPlaceholder='搜索设备名称...'
                loading={loading}
                exportFileName='gis-device-points'
              />
            )}
            {activeTab === 'pipelines' && (
              <DataTable
                columns={pipelineColumns}
                data={safePipelines}
                searchKey='name'
                searchPlaceholder='搜索管线名称...'
                loading={loading}
                exportFileName='gis-pipelines'
              />
            )}
            {activeTab === 'storageLocations' && (
              <DataTable
                columns={storageLocationColumns}
                data={safeStorageLocations}
                searchKey='name'
                searchPlaceholder='搜索库位名称...'
                loading={loading}
                exportFileName='gis-storage-locations'
              />
            )}
            {activeTab === 'evidenceRecords' && (
              <DataTable
                columns={evidenceRecordColumns}
                data={safeEvidenceRecords}
                searchKey='title'
                searchPlaceholder='搜索记录标题...'
                loading={loading}
                exportFileName='gis-evidence-records'
              />
            )}
            {activeTab === 'factoryMaps' && (
              <DataTable
                columns={factoryMapColumns}
                data={safeFactoryMaps}
                searchKey='name'
                searchPlaceholder='搜索地图名称...'
                loading={loading}
                exportFileName='gis-factory-maps'
              />
            )}
            {activeTab === 'businessLocations' && (
              <DataTable
                columns={businessLocationColumns}
                data={safeBusinessLocations}
                searchKey='business_name'
                searchPlaceholder='搜索业务名称...'
                loading={loading}
                exportFileName='gis-business-locations'
              />
            )}
          </div>
        </div>

        {showModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
              <div className='px-6 py-4 border-b border-gray-200 flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>{modalType === 'create' ? '新建' : '编辑'}</h3>
                <button onClick={resetModal} className='text-gray-400 hover:text-gray-500'>
                  <X className='w-6 h-6' />
                </button>
              </div>
              <div className='p-6 space-y-4'>
                {activeTab === 'devicePoints' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>名称</label>
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>设备类型</label>
                      <input
                        type='text'
                        value={formData.device_type || ''}
                        onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>纬度</label>
                        <input
                          type='number'
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>经度</label>
                        <input
                          type='number'
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='active'>启用</option>
                        <option value='inactive'>禁用</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'pipelines' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>名称</label>
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>管线类型</label>
                      <input
                        type='text'
                        value={formData.pipeline_type || ''}
                        onChange={(e) => setFormData({ ...formData, pipeline_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>起点纬度</label>
                        <input
                          type='number'
                          value={formData.start_lat || ''}
                          onChange={(e) => setFormData({ ...formData, start_lat: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>起点经度</label>
                        <input
                          type='number'
                          value={formData.start_lng || ''}
                          onChange={(e) => setFormData({ ...formData, start_lng: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>终点纬度</label>
                        <input
                          type='number'
                          value={formData.end_lat || ''}
                          onChange={(e) => setFormData({ ...formData, end_lat: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>终点经度</label>
                        <input
                          type='number'
                          value={formData.end_lng || ''}
                          onChange={(e) => setFormData({ ...formData, end_lng: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='active'>启用</option>
                        <option value='inactive'>禁用</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'storageLocations' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>名称</label>
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>位置类型</label>
                      <input
                        type='text'
                        value={formData.location_type || ''}
                        onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>纬度</label>
                        <input
                          type='number'
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>经度</label>
                        <input
                          type='number'
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>容量</label>
                        <input
                          type='number'
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>当前用量</label>
                        <input
                          type='number'
                          value={formData.current_usage || ''}
                          onChange={(e) => setFormData({ ...formData, current_usage: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'evidenceRecords' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>标题</label>
                      <input
                        type='text'
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>证据类型</label>
                      <input
                        type='text'
                        value={formData.evidence_type || ''}
                        onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>纬度</label>
                        <input
                          type='number'
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>经度</label>
                        <input
                          type='number'
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>记录人</label>
                      <input
                        type='text'
                        value={formData.recorded_by || ''}
                        onChange={(e) => setFormData({ ...formData, recorded_by: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>文件 URL</label>
                      <input
                        type='text'
                        value={formData.file_url || ''}
                        onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'factoryMaps' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>地图名称</label>
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>编号</label>
                      <input
                        type='text'
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>地图类型</label>
                      <input
                        type='text'
                        value={formData.map_type || ''}
                        onChange={(e) => setFormData({ ...formData, map_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>文件 URL</label>
                      <input
                        type='text'
                        value={formData.file_url || ''}
                        onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'businessLocations' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>业务类型</label>
                      <input
                        type='text'
                        value={formData.business_type || ''}
                        onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>业务名称</label>
                      <input
                        type='text'
                        value={formData.business_name || ''}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>业务编码</label>
                      <input
                        type='text'
                        value={formData.business_code || ''}
                        onChange={(e) => setFormData({ ...formData, business_code: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>分类</label>
                      <input
                        type='text'
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>纬度</label>
                        <input
                          type='number'
                          value={formData.lat || ''}
                          onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>经度</label>
                        <input
                          type='number'
                          value={formData.lng || ''}
                          onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                          step='0.000001'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>地址</label>
                      <input
                        type='text'
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>联系人</label>
                        <input
                          type='text'
                          value={formData.contact_person || ''}
                          onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>联系电话</label>
                        <input
                          type='text'
                          value={formData.contact_phone || ''}
                          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>容量</label>
                        <input
                          type='number'
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>当前用量</label>
                        <input
                          type='number'
                          value={formData.current_usage || ''}
                          onChange={(e) => setFormData({ ...formData, current_usage: e.target.value })}
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        />
                      </div>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='active'>启用</option>
                        <option value='inactive'>禁用</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>属性（JSON格式）</label>
                      <textarea
                        value={formData.properties || ''}
                        onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                        placeholder='{"key": "value"}'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>外部ID</label>
                      <input
                        type='text'
                        value={formData.external_id || ''}
                        onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>外部类型</label>
                      <input
                        type='text'
                        value={formData.external_type || ''}
                        onChange={(e) => setFormData({ ...formData, external_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                  </>
                )}
              </div>
              <div className='px-6 py-4 border-t border-gray-200 flex gap-3 justify-end'>
                <button
                  onClick={resetModal}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
                >
                  取消
                </button>
                <button
                  onClick={modalType === 'create' ? handleCreate : handleEdit}
                  className='px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2'
                >
                  <Check className='w-4 h-4' />
                  {modalType === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-xl shadow-xl w-full max-w-lg'>
              <div className='px-6 py-4 border-b border-gray-200 flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>导入数据</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className='text-gray-400 hover:text-gray-500'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>
              <div className='p-6 space-y-4'>
                <div className='flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-8'>
                  <div className='text-center'>
                    <Upload className='w-12 h-12 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600 mb-2'>拖拽文件到此处上传</p>
                    <label className='inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 cursor-pointer'>
                      <span>选择文件</span>
                      <input type='file' accept='.csv' onChange={handleImportFileChange} className='hidden' />
                    </label>
                  </div>
                </div>

                {importPreview && (
                  <div>
                    <p className='text-sm font-medium text-gray-700 mb-2'>文件预览（前5行）：</p>
                    <div className='border border-gray-300 rounded-lg overflow-hidden'>
                      <table className='w-full text-sm'>
                        <thead>
                          <tr className='bg-gray-50'>
                            {importPreview[0]?.map((cell, index) => (
                              <th key={index} className='px-3 py-2 text-left font-medium text-gray-500'>
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(1).map((row, rowIndex) => (
                            <tr key={rowIndex} className='border-t border-gray-200'>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className='px-3 py-2 text-gray-700'>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className='flex items-center justify-between'>
                  <button
                    onClick={downloadTemplate}
                    className='flex items-center space-x-2 text-gray-600 hover:text-gray-800'
                  >
                    <Download className='w-4 h-4' />
                    <span>下载模板</span>
                  </button>
                </div>
              </div>
              <div className='px-6 py-4 border-t border-gray-200 flex gap-3 justify-end'>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className='px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-50'
                >
                  <Upload className='w-4 h-4' />
                  导入
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gispage;
