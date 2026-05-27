import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Plus, Edit, Trash2, 
  ChevronLeft, AlertCircle, CheckCircle, XCircle, 
  ChevronRight, Folder
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { departmentApi, type Department } from '../api/erp';

interface DepartmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const DepartmentManagementPage: React.FC<DepartmentManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({
    name: '',
    code: '',
    parent_id: '',
    company_id: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    } catch (err: any) {
      setError(err.message || '加载部门列表失败');
      showNotification('error', '加载部门列表失败');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await departmentApi.create(newDepartment);
      if (res.success) {
        showNotification('success', '部门创建成功');
        setShowCreateModal(false);
        setNewDepartment({
          name: '',
          code: '',
          parent_id: '',
          company_id: '',
          description: '',
          status: 'active',
        });
        loadDepartments();
      } else {
        showNotification('error', res.message || '创建部门失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建部门失败');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('确定要删除这个部门吗？')) return;
    try {
      const res = await departmentApi.delete(id);
      if (res.success) {
        showNotification('success', '部门删除成功');
        loadDepartments();
      } else {
        showNotification('error', res.message || '删除部门失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除部门失败');
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    try {
      const res = await departmentApi.update(selectedDepartment.id, selectedDepartment);
      if (res.success) {
        showNotification('success', '部门信息更新成功');
        setShowEditModal(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        showNotification('error', res.message || '更新部门失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '更新部门失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      archived: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
      active: '活跃',
      inactive: '停用',
      archived: '归档',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildDepartmentTree = (depts: Department[]): Department[] => {
    const deptMap = new Map<string, Department & { children?: Department[] }>();
    
    depts.forEach(dept => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });
    
    const rootDepts: (Department & { children?: Department[] })[] = [];
    
    depts.forEach(dept => {
      const deptWithChildren = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(deptWithChildren);
      } else {
        rootDepts.push(deptWithChildren);
      }
    });
    
    return rootDepts;
  };

  const renderDepartmentTree = (depts: Department[], level: number = 0) => {
    return depts.map(dept => (
      <div key={dept.id} className="group">
        <div className={`flex items-center justify-between p-4 rounded-lg ${level > 0 ? 'ml-8 border-l-2 border-gray-200' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{dept.name}</h4>
                {dept.code && (
                  <span className="text-sm text-gray-500">({dept.code})</span>
                )}
                {getStatusBadge(dept.status)}
              </div>
              {dept.description && (
                <p className="text-sm text-gray-500">{dept.description}</p>
              )}
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 transition-opacity">
            <button
              onClick={() => {
                setSelectedDepartment(dept);
                setShowEditModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteDepartment(dept.id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {(dept as any).children?.length > 0 && renderDepartmentTree((dept as any).children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Building2 className="w-7 h-7 mr-3 text-blue-600" />
                  部门管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理组织架构、层级关系
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              新增部门
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索部门名称、编码、描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadDepartments}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadDepartments}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无部门数据</p>
            </div>
          ) : (
            <div className="p-6">
              {renderDepartmentTree(buildDepartmentTree(filteredDepartments))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">新增部门</h3>
              <form onSubmit={handleCreateDepartment}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">部门名称 *</label>
                      <input
                        type="text"
                        required
                        value={newDepartment.name || ''}
                        onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入部门名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">部门编码</label>
                      <input
                        type="text"
                        value={newDepartment.code || ''}
                        onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入部门编码"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上级部门</label>
                    <select
                      value={newDepartment.parent_id || ''}
                      onChange={(e) => setNewDepartment({ ...newDepartment, parent_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">无（顶级部门）</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={newDepartment.description || ''}
                      onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="请输入部门描述"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">编辑部门</h3>
              <form onSubmit={handleEditDepartment}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">部门名称 *</label>
                      <input
                        type="text"
                        required
                        value={selectedDepartment.name}
                        onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">部门编码</label>
                      <input
                        type="text"
                        value={selectedDepartment.code || ''}
                        onChange={(e) => setSelectedDepartment({ ...selectedDepartment, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上级部门</label>
                    <select
                      value={selectedDepartment.parent_id || ''}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, parent_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">无（顶级部门）</option>
                      {departments.filter(d => d.id !== selectedDepartment.id).map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={selectedDepartment.description || ''}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedDepartment(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagementPage;
