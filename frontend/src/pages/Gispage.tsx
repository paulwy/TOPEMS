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
} from '../api/gis';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

type TabType = 'devicePoints' | 'pipelines' | 'storageLocations' | 'evidenceRecords';

type ModalType = 'create' | 'edit' | null;

const Gispage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('devicePoints');
  const [devicePoints, setDevicePoints] = useState<DevicePoint[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'devicePoints') {
        const response = await gisApi.listDevicePoints();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.device_points && Array.isArray(data.device_points)) {
            rawItems = data.device_points;
          } else if (data.devicePoints && Array.isArray(data.devicePoints)) {
            rawItems = data.devicePoints;
          }
          const adapted = rawItems.map((item) => adaptDevicePoint(item));
          setDevicePoints(adapted);
        } else {
          setDevicePoints([]);
        }
      } else if (activeTab === 'pipelines') {
        const response = await gisApi.listPipelines();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.pipelines && Array.isArray(data.pipelines)) {
            rawItems = data.pipelines;
          }
          const adapted = rawItems.map((item) => adaptPipeline(item));
          setPipelines(adapted);
        } else {
          setPipelines([]);
        }
      } else if (activeTab === 'storageLocations') {
        const response = await gisApi.listStorageLocations();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.storage_locations && Array.isArray(data.storage_locations)) {
            rawItems = data.storage_locations;
          } else if (data.storageLocations && Array.isArray(data.storageLocations)) {
            rawItems = data.storageLocations;
          }
          const adapted = rawItems.map((item) => adaptStorageLocation(item));
          setStorageLocations(adapted);
        } else {
          setStorageLocations([]);
        }
      } else if (activeTab === 'evidenceRecords') {
        const response = await gisApi.listEvidenceRecords();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.evidence_records && Array.isArray(data.evidence_records)) {
            rawItems = data.evidence_records;
          } else if (data.evidenceRecords && Array.isArray(data.evidenceRecords)) {
            rawItems = data.evidenceRecords;
          }
          const adapted = rawItems.map((item) => adaptEvidenceRecord(item));
          setEvidenceRecords(adapted);
        } else {
          setEvidenceRecords([]);
        }
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
      if (activeTab === 'devicePoints') {
        const req: CreateDevicePointRequest = {
          name: formData.name || '',
          description: formData.description,
          device_type: formData.device_type || '',
          latitude: parseFloat(formData.latitude || '0'),
          longitude: parseFloat(formData.longitude || '0'),
          status: formData.status || 'active',
        };
        await gisApi.createDevicePoint(req);
      } else if (activeTab === 'pipelines') {
        const req: CreatePipelineRequest = {
          name: formData.name || '',
          description: formData.description,
          pipeline_type: formData.pipeline_type || '',
          start_point: [parseFloat(formData.start_lat || '0'), parseFloat(formData.start_lng || '0')],
          end_point: [parseFloat(formData.end_lat || '0'), parseFloat(formData.end_lng || '0')],
          status: formData.status || 'active',
        };
        await gisApi.createPipeline(req);
      } else if (activeTab === 'storageLocations') {
        const req: CreateStorageLocationRequest = {
          name: formData.name || '',
          description: formData.description,
          location_type: formData.location_type || '',
          latitude: parseFloat(formData.latitude || '0'),
          longitude: parseFloat(formData.longitude || '0'),
          capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
          current_usage: formData.current_usage ? parseFloat(formData.current_usage) : undefined,
        };
        await gisApi.createStorageLocation(req);
      } else if (activeTab === 'evidenceRecords') {
        const req: CreateEvidenceRecordRequest = {
          title: formData.title || '',
          description: formData.description,
          evidence_type: formData.evidence_type || '',
          latitude: parseFloat(formData.latitude || '0'),
          longitude: parseFloat(formData.longitude || '0'),
          file_url: formData.file_url,
          recorded_by: formData.recorded_by || '',
        };
        await gisApi.createEvidenceRecord(req);
      }
      showNotification('success', '创建成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '创建失败');
      console.error('创建失败:', err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === 'devicePoints') {
        const req: CreateDevicePointRequest = {
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          device_type: formData.device_type || editingItem.device_type,
          latitude: parseFloat(formData.latitude || editingItem.latitude?.toString() || '0'),
          longitude: parseFloat(formData.longitude || editingItem.longitude?.toString() || '0'),
          status: formData.status || editingItem.status,
        };
        await gisApi.updateDevicePoint(editingItem.id, req);
      }
      showNotification('success', '更新成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '更新失败');
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === 'devicePoints') {
        await gisApi.deleteDevicePoint(id);
      } else if (activeTab === 'pipelines') {
        await gisApi.deletePipeline(id);
      } else if (activeTab === 'storageLocations') {
        await gisApi.deleteStorageLocation(id);
      } else if (activeTab === 'evidenceRecords') {
        await gisApi.deleteEvidenceRecord(id);
      }
      showNotification('success', '删除成功');
      loadData();
    } catch (err) {
      showNotification('error', '删除失败');
      console.error('删除失败:', err);
    }
  };

  const safeDevicePoints = Array.isArray(devicePoints) ? devicePoints : [];
  const safePipelines = Array.isArray(pipelines) ? pipelines : [];
  const safeStorageLocations = Array.isArray(storageLocations) ? storageLocations : [];
  const safeEvidenceRecords = Array.isArray(evidenceRecords) ? evidenceRecords : [];

  const openCreateModal = () => {
    setModalType('create');
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    setFormData({
      ...item,
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'devicePoints', label: '设备点位', icon: MapPin },
    { id: 'pipelines', label: '管线管理', icon: ArrowRight },
    { id: 'storageLocations', label: '仓储位置', icon: Warehouse },
    { id: 'evidenceRecords', label: '现场取证', icon: Camera },
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
        loadData();
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
              <p className='text-gray-500'>管理设备点位、管线、仓储位置和现场取证</p>
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
