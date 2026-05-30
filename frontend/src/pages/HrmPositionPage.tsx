import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, Check, User, Building2, Briefcase, DollarSign, Calendar } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';
import { positionApi, departmentApi, type Position, type PaginatedResult, type ListParams } from '../api/hrm';

const PositionManagementPage: React.FC = () => {
  const { success, error, notifications, hideNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Position>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<Partial<Position>>({});

  const fetchPositions = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await positionApi.list(params);
      if (response.code === 200) {
        setData(response.data!);
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.list();
      if (response.code === 200) {
        setDepartments(response.data?.items.map(d => ({ id: d.id, name: d.name })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  const handleSearch = () => {
    fetchPositions({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
      department_id: departmentFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    setDepartmentFilter('');
    fetchPositions({ page: 1 });
  };

  const handleAdd = () => {
    setEditingPosition(null);
    setFormData({});
    setIsModalVisible(true);
  };

  const handleEdit = (record: Position) => {
    setEditingPosition(record);
    setFormData(record);
    setIsModalVisible(true);
  };

  const handleView = (record: Position) => {
    setEditingPosition(record);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await positionApi.delete(id);
      if (response.code === 200) {
        fetchPositions();
      }
    } catch (error) {
      console.error('Failed to delete position:', error);
    }
  };

  const handleModalOk = async () => {
    try {
      if (editingPosition) {
        await positionApi.update(editingPosition.id, formData);
      } else {
        await positionApi.create(formData);
      }
      setIsModalVisible(false);
      fetchPositions();
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? '启用' : '禁用';
  };

  const totalPages = Math.ceil(data.total / data.page_size);

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">岗位管理</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          新增岗位
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索岗位名称或编码"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="w-40">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部部门</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              搜索
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位编码</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属部门</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">岗位级别</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">薪资范围</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.code || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {departments.find(d => d.id === item.department_id)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.level || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.min_salary || 0} - {item.max_salary || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="查看"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="编辑"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data.total > data.page_size && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              显示第 {((data.page - 1) * data.page_size) + 1} - {Math.min(data.page * data.page_size, data.total)} 条，共 {data.total} 条
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => data.page > 1 && fetchPositions({ page: data.page - 1 })}
                disabled={data.page <= 1}
                className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchPositions({ page })}
                  className={`px-3 py-1 border rounded-lg text-sm ${
                    page === data.page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => data.page < totalPages && fetchPositions({ page: data.page + 1 })}
                disabled={data.page >= totalPages}
                className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editingPosition ? '编辑岗位' : '新增岗位'}</h3>
              <button onClick={() => setIsModalVisible(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称 *</label>
                <input
                  type="text"
                  value={(formData as Position)?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入岗位名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位编码</label>
                <input
                  type="text"
                  value={(formData as Position)?.code || ''}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入岗位编码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                <select
                  value={(formData as Position)?.department_id || ''}
                  onChange={(e) => handleInputChange('department_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位级别</label>
                <input
                  type="text"
                  value={(formData as Position)?.level || ''}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入岗位级别"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低薪资</label>
                  <input
                    type="number"
                    value={(formData as Position)?.min_salary || ''}
                    onChange={(e) => handleInputChange('min_salary', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="最低薪资"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高薪资</label>
                  <input
                    type="number"
                    value={(formData as Position)?.max_salary || ''}
                    onChange={(e) => handleInputChange('max_salary', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="最高薪资"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位描述</label>
                <textarea
                  value={(formData as Position)?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入岗位描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任职要求</label>
                <textarea
                  value={(formData as Position)?.requirements || ''}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入任职要求"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={(formData as Position)?.status || 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setIsModalVisible(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleModalOk}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Check size={18} />
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewModalVisible && editingPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">岗位详情</h3>
              <button onClick={() => setIsViewModalVisible(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">岗位名称:</span>
                <span>{editingPosition.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">岗位编码:</span>
                <span>{editingPosition.code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">所属部门:</span>
                <span>{departments.find(d => d.id === editingPosition.department_id)?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">岗位级别:</span>
                <span>{editingPosition.level || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">薪资范围:</span>
                <span>{editingPosition.min_salary || 0} - {editingPosition.max_salary || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">岗位描述:</span>
                <span className="max-w-xs truncate">{editingPosition.description || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">任职要求:</span>
                <span className="max-w-xs truncate">{editingPosition.requirements || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">状态:</span>
                <span className={`px-2 text-xs font-semibold rounded-full ${getStatusColor(editingPosition.status)}`}>
                  {getStatusText(editingPosition.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">创建时间:</span>
                <span>{editingPosition.created_at}</span>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setIsViewModalVisible(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PositionManagementPage;