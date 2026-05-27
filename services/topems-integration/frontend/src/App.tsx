import React, { useState, useEffect } from 'react';
import { 
  getSyncStats, 
  getLimsQmsSyncs, 
  getMesErpSyncs, 
  getWmsScmSyncs,
  getEvents,
  createLimsQmsSync,
  createMesErpSync,
  createWmsScmSync,
  syncLimsQms,
  syncMesErp,
  syncWmsScm,
  SyncStats,
  LimsQmsSync,
  MesErpSync,
  WmsScmSync,
  IntegrationEvent
} from './api';

function App() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [limsQmsSyncs, setLimsQmsSyncs] = useState<LimsQmsSync[]>([]);
  const [mesErpSyncs, setMesErpSyncs] = useState<MesErpSync[]>([]);
  const [wmsScmSyncs, setWmsScmSyncs] = useState<WmsScmSync[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'limsqms' | 'meserp' | 'wmsscm' | 'events'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsData, limsQmsData, mesErpData, wmsScmData, eventsData] = await Promise.all([
        getSyncStats(),
        getLimsQmsSyncs(),
        getMesErpSyncs(),
        getWmsScmSyncs(),
        getEvents(),
      ]);
      setStats(statsData);
      setLimsQmsSyncs(limsQmsData);
      setMesErpSyncs(mesErpData);
      setWmsScmSyncs(wmsScmData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLimsQmsSync = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createLimsQmsSync({
        lims_sample_id: formData.get('lims_sample_id') as string,
        sample_name: formData.get('sample_name') as string,
        inspection_result: formData.get('inspection_result') as string || undefined,
        inspection_notes: formData.get('inspection_notes') as string || undefined,
      });
      e.currentTarget.reset();
      loadAllData();
    } catch (error) {
      console.error('Error creating sync:', error);
    }
  };

  const handleCreateMesErpSync = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createMesErpSync({
        mes_order_id: formData.get('mes_order_id') as string,
        order_number: formData.get('order_number') as string,
        product_name: formData.get('product_name') as string || undefined,
        quantity: formData.get('quantity') ? parseFloat(formData.get('quantity') as string) : undefined,
      });
      e.currentTarget.reset();
      loadAllData();
    } catch (error) {
      console.error('Error creating sync:', error);
    }
  };

  const handleCreateWmsScmSync = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createWmsScmSync({
        wms_inventory_id: formData.get('wms_inventory_id') as string,
        item_name: formData.get('item_name') as string,
        quantity: formData.get('quantity') ? parseFloat(formData.get('quantity') as string) : undefined,
        unit: formData.get('unit') as string || undefined,
      });
      e.currentTarget.reset();
      loadAllData();
    } catch (error) {
      console.error('Error creating sync:', error);
    }
  };

  const handleSyncLimsQms = async (id: string) => {
    try {
      await syncLimsQms(id);
      loadAllData();
    } catch (error) {
      console.error('Error syncing:', error);
    }
  };

  const handleSyncMesErp = async (id: string) => {
    try {
      await syncMesErp(id);
      loadAllData();
    } catch (error) {
      console.error('Error syncing:', error);
    }
  };

  const handleSyncWmsScm = async (id: string) => {
    try {
      await syncWmsScm(id);
      loadAllData();
    } catch (error) {
      console.error('Error syncing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">🔗 TOPEMS 系统集成</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                刷新数据
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'dashboard' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 仪表板
          </button>
          <button
            onClick={() => setActiveTab('limsqms')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'limsqms' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🔬 LIMS ↔ QMS
          </button>
          <button
            onClick={() => setActiveTab('meserp')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'meserp' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🏭 MES ↔ ERP
          </button>
          <button
            onClick={() => setActiveTab('wmsscm')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'wmsscm' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            📦 WMS ↔ SCM
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'events' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 事件日志
          </button>
        </div>

        {activeTab === 'dashboard' && stats && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🔬 LIMS ↔ QMS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总数</span>
                    <span className="font-bold text-blue-600">{stats.lims_qms_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">已同步</span>
                    <span className="font-bold text-green-600">{stats.lims_qms_synced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">失败</span>
                    <span className="font-bold text-red-600">{stats.lims_qms_failed}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🏭 MES ↔ ERP</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总数</span>
                    <span className="font-bold text-blue-600">{stats.mes_erp_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">已同步</span>
                    <span className="font-bold text-green-600">{stats.mes_erp_synced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">失败</span>
                    <span className="font-bold text-red-600">{stats.mes_erp_failed}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 WMS ↔ SCM</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总数</span>
                    <span className="font-bold text-blue-600">{stats.wms_scm_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">已同步</span>
                    <span className="font-bold text-green-600">{stats.wms_scm_synced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">失败</span>
                    <span className="font-bold text-red-600">{stats.wms_scm_failed}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 最近事件</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">源系统</th>
                      <th className="text-left py-3 px-4">目标系统</th>
                      <th className="text-left py-3 px-4">事件类型</th>
                      <th className="text-left py-3 px-4">状态</th>
                      <th className="text-left py-3 px-4">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 10).map((event) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{event.source_system}</td>
                        <td className="py-3 px-4">{event.target_system}</td>
                        <td className="py-3 px-4">{event.event_type}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'limsqms' && (
          <div>
            <div className="bg-white p-6 rounded-xl shadow-md mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ 创建 LIMS ↔ QMS 同步</h3>
              <form onSubmit={handleCreateLimsQmsSync} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LIMS 样本 ID</label>
                  <input
                    type="text"
                    name="lims_sample_id"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入 UUID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">样本名称</label>
                  <input
                    type="text"
                    name="sample_name"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入样本名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">检验结果</label>
                  <input
                    type="text"
                    name="inspection_result"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    name="inspection_notes"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    创建同步
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 同步列表</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">样本名称</th>
                      <th className="text-left py-3 px-4">LIMS ID</th>
                      <th className="text-left py-3 px-4">检验结果</th>
                      <th className="text-left py-3 px-4">状态</th>
                      <th className="text-left py-3 px-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limsQmsSyncs.map((sync) => (
                      <tr key={sync.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{sync.sample_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{sync.lims_sample_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4">{sync.inspection_result || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(sync.sync_status)}`}>
                            {sync.sync_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!sync.synced && (
                            <button
                              onClick={() => handleSyncLimsQms(sync.id)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                            >
                              同步
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meserp' && (
          <div>
            <div className="bg-white p-6 rounded-xl shadow-md mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ 创建 MES ↔ ERP 同步</h3>
              <form onSubmit={handleCreateMesErpSync} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MES 订单 ID</label>
                  <input
                    type="text"
                    name="mes_order_id"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入 UUID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">订单号</label>
                  <input
                    type="text"
                    name="order_number"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入订单号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                  <input
                    type="text"
                    name="product_name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    创建同步
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 同步列表</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">订单号</th>
                      <th className="text-left py-3 px-4">产品</th>
                      <th className="text-left py-3 px-4">数量</th>
                      <th className="text-left py-3 px-4">状态</th>
                      <th className="text-left py-3 px-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesErpSyncs.map((sync) => (
                      <tr key={sync.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{sync.order_number}</td>
                        <td className="py-3 px-4">{sync.product_name || '-'}</td>
                        <td className="py-3 px-4">{sync.quantity || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(sync.sync_status)}`}>
                            {sync.sync_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!sync.synced && (
                            <button
                              onClick={() => handleSyncMesErp(sync.id)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                            >
                              同步
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wmsscm' && (
          <div>
            <div className="bg-white p-6 rounded-xl shadow-md mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ 创建 WMS ↔ SCM 同步</h3>
              <form onSubmit={handleCreateWmsScmSync} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WMS 库存 ID</label>
                  <input
                    type="text"
                    name="wms_inventory_id"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入 UUID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">物品名称</label>
                  <input
                    type="text"
                    name="item_name"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="输入物品名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <input
                    type="text"
                    name="unit"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="可选"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    创建同步
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 同步列表</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">物品名称</th>
                      <th className="text-left py-3 px-4">数量</th>
                      <th className="text-left py-3 px-4">单位</th>
                      <th className="text-left py-3 px-4">状态</th>
                      <th className="text-left py-3 px-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wmsScmSyncs.map((sync) => (
                      <tr key={sync.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{sync.item_name}</td>
                        <td className="py-3 px-4">{sync.quantity || '-'}</td>
                        <td className="py-3 px-4">{sync.unit || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(sync.sync_status)}`}>
                            {sync.sync_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!sync.synced && (
                            <button
                              onClick={() => handleSyncWmsScm(sync.id)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                            >
                              同步
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 事件日志</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">源系统</th>
                    <th className="text-left py-3 px-4">目标系统</th>
                    <th className="text-left py-3 px-4">事件类型</th>
                    <th className="text-left py-3 px-4">源记录 ID</th>
                    <th className="text-left py-3 px-4">状态</th>
                    <th className="text-left py-3 px-4">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{event.source_system}</td>
                      <td className="py-3 px-4">{event.target_system}</td>
                      <td className="py-3 px-4">{event.event_type}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {event.source_record_id ? event.source_record_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
