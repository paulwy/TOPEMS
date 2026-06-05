import React, { useEffect, useState } from 'react';
import { vehicleApi, type Vehicle } from '../api/erp';

const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate_number: '',
    model: '',
    capacity: 5,
    status: 'available',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehicleApi.list();
      if (response.success && response.data) {
        setVehicles(response.data.items || []);
      }
    } catch (err) {
      setError('获取车辆列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, formData);
      } else {
        await vehicleApi.create(formData);
      }
      setShowModal(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error('操作失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个车辆吗？')) return;
    try {
      await vehicleApi.delete(id);
      fetchVehicles();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      available: '可用',
      in_use: '使用中',
      maintenance: '维修中',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">车辆管理</h1>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setFormData({
              plate_number: '',
              model: '',
              capacity: 5,
              status: 'available',
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          添加车辆
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{vehicle.plate_number}</h3>
                <p className="text-sm text-gray-500">{vehicle.model}</p>
              </div>
              {getStatusBadge(vehicle.status)}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>座位数：{vehicle.capacity} 座</p>
              {vehicle.driver && <p>司机：{vehicle.driver}</p>}
              {vehicle.last_maintenance_date && (
                <p>最后维护：{new Date(vehicle.last_maintenance_date).toLocaleDateString()}</p>
              )}
              {vehicle.next_maintenance_date && (
                <p>下次维护：{new Date(vehicle.next_maintenance_date).toLocaleDateString()}</p>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setEditingVehicle(vehicle);
                  setFormData(vehicle);
                  setShowModal(true);
                }}
                className="text-blue-600 hover:text-blue-900 text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(vehicle.id)}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">暂无车辆数据</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingVehicle ? '编辑车辆' : '添加车辆'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">车牌号 *</label>
                <input
                  type="text"
                  required
                  value={formData.plate_number || ''}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">座位数</label>
                <input
                  type="number"
                  value={formData.capacity || 5}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">司机</label>
                <input
                  type="text"
                  value={formData.driver || ''}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                    value={formData.status || 'available'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                  <option value="available">可用</option>
                  <option value="in_use">使用中</option>
                  <option value="maintenance">维修中</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
