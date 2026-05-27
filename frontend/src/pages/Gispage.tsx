import React, { useEffect, useState } from 'react';
import { 
  MapPin, Plus, Search, ChevronRight, 
  ArrowRight, Warehouse, Camera, Loader2, X, Edit, Trash2, Check, Box, Smartphone, MessageSquare, User
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
  CreateEvidenceRecordRequest
} from '../api/gis';

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
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': '启用',
      'inactive': '禁用',
      'pending': '待处理',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  };

  const adaptDevicePoint = (item: any): any => {
    return {
      ...item,
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptPipeline = (item: any): any => {
    return {
      ...item,
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptStorageLocation = (item: any): any => {
    return {
      ...item
    };
  };

  const adaptEvidenceRecord = (item: any): any => {
    return {
      ...item
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
          const adapted = rawItems.map(item => adaptDevicePoint(item));
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
          const adapted = rawItems.map(item => adaptPipeline(item));
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
          const adapted = rawItems.map(item => adaptStorageLocation(item));
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
          const adapted = rawItems.map(item => adaptEvidenceRecord(item));
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
          status: formData.status || 'active'
        };
        await gisApi.createDevicePoint(req);
      } else if (activeTab === 'pipelines') {
        const req: CreatePipelineRequest = {
          name: formData.name || '',
          description: formData.description,
          pipeline_type: formData.pipeline_type || '',
          start_point: [parseFloat(formData.start_lat || '0'), parseFloat(formData.start_lng || '0')],
          end_point: [parseFloat(formData.end_lat || '0'), parseFloat(formData.end_lng || '0')],
          status: formData.status || 'active'
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
          current_usage: formData.current_usage ? parseFloat(formData.current_usage) : undefined
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
          recorded_by: formData.recorded_by || ''
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
          status: formData.status || editingItem.status
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
      ...item
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'devicePoints', label: '设备点位', icon: MapPin },
    { id: 'pipelines', label: '管线管理', icon: ArrowRight },
    { id: 'storageLocations', label: '仓储位置', icon: Warehouse },
    { id: 'evidenceRecords', label: '现场取证', icon: Camera }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'devicePoints': return safeDevicePoints;
      case 'pipelines': return safePipelines;
      case 'storageLocations': return safeStorageLocations;
      case 'evidenceRecords': return safeEvidenceRecords;
      default: return [];
    }
  };

  const filteredData = getCurrentData().filter((item: any) => {
    const searchFields = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
    return searchFields.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('启用')) return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('待处理')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('inactive') || s.includes('禁用')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">厂区空间数字化</h1>
              <p className="text-gray-500">管理设备点位、管线、仓储位置和现场取证</p>
            </div>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
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
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === 'devicePoints' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">纬度</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">经度</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'pipelines' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">管线类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">起点坐标</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">终点坐标</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'storageLocations' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">容量</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前用量</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">坐标</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'evidenceRecords' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">证据类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">记录人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {activeTab === 'devicePoints' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.device_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.latitude}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.longitude}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'pipelines' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.pipeline_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Array.isArray(item.start_point) ? `${item.start_point[0].toFixed(4)}, ${item.start_point[1].toFixed(4)}` : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Array.isArray(item.end_point) ? `${item.end_point[0].toFixed(4)}, ${item.end_point[1].toFixed(4)}` : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'storageLocations' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.capacity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.current_usage}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                        </td>
                      </>
                    )}
                    {activeTab === 'evidenceRecords' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.evidence_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.recorded_by}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.recorded_at ? new Date(item.recorded_at).toLocaleString() : ''}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="text-cyan-600 hover:text-cyan-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('确定要删除此项吗？')) {
                              handleDelete(item.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === 'create' ? '新建' : '编辑'}
                </h3>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activeTab === 'devicePoints' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">设备类型</label>
                      <input 
                        type="text" 
                        value={formData.device_type || ''}
                        onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                        <input 
                          type="number" 
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                        <input 
                          type="number" 
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea 
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'pipelines' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">管线类型</label>
                      <input 
                        type="text" 
                        value={formData.pipeline_type || ''}
                        onChange={(e) => setFormData({...formData, pipeline_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">起点纬度</label>
                        <input 
                          type="number" 
                          value={formData.start_lat || ''}
                          onChange={(e) => setFormData({...formData, start_lat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">起点经度</label>
                        <input 
                          type="number" 
                          value={formData.start_lng || ''}
                          onChange={(e) => setFormData({...formData, start_lng: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">终点纬度</label>
                        <input 
                          type="number" 
                          value={formData.end_lat || ''}
                          onChange={(e) => setFormData({...formData, end_lat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">终点经度</label>
                        <input 
                          type="number" 
                          value={formData.end_lng || ''}
                          onChange={(e) => setFormData({...formData, end_lng: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea 
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'storageLocations' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">位置类型</label>
                      <input 
                        type="text" 
                        value={formData.location_type || ''}
                        onChange={(e) => setFormData({...formData, location_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                        <input 
                          type="number" 
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                        <input 
                          type="number" 
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">容量</label>
                        <input 
                          type="number" 
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">当前用量</label>
                        <input 
                          type="number" 
                          value={formData.current_usage || ''}
                          onChange={(e) => setFormData({...formData, current_usage: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea 
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'evidenceRecords' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <input 
                        type="text" 
                        value={formData.title || ''}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">证据类型</label>
                      <input 
                        type="text" 
                        value={formData.evidence_type || ''}
                        onChange={(e) => setFormData({...formData, evidence_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                        <input 
                          type="number" 
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                        <input 
                          type="number" 
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          step="0.000001"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">记录人</label>
                      <input 
                        type="text" 
                        value={formData.recorded_by || ''}
                        onChange={(e) => setFormData({...formData, recorded_by: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文件 URL</label>
                      <input 
                        type="text" 
                        value={formData.file_url || ''}
                        onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea 
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button 
                  onClick={resetModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button 
                  onClick={modalType === 'create' ? handleCreate : handleEdit}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {modalType === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gispage;
