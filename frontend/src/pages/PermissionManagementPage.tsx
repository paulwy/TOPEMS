import React, { useState, useEffect } from 'react';
import {
  Key, Search, Plus, Trash2, ChevronLeft,
  Shield, AlertCircle, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type Permission } from '../api/iam';

interface PermissionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const PermissionManagementPage: React.FC<PermissionManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [newPermission, setNewPermission] = useState({
    name: '',
    resource: '',
    action: '',
    description: '',
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.listPermissions();
      if (res.success && res.data) {
        setPermissions(res.data);
      }
    } catch (err: any) {
      setError(err.message || '加载权限失败');
      showNotification('error', '加载权限失败');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createPermission({
        name: newPermission.name,
        resource: newPermission.resource,
        action: newPermission.action,
        description: newPermission.description || undefined,
      });
      
      if (res.success) {
        showNotification('success', '权限创建成功');
        setShowCreateModal(false);
        setNewPermission({ name: '', resource: '', action: '', description: '' });
        loadPermissions();
      } else {
        showNotification('error', res.message || '创建权限失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建权限失败');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除这个权限吗？删除后相关角色的权限也会被移除。')) return;

    try {
      const res = await authApi.deletePermission(permissionId);
      if (res.success) {
        showNotification('success', '权限删除成功');
        loadPermissions();
      } else {
        showNotification('error', res.message || '删除权限失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除权限失败');
    }
  };

  const filteredPermissions = permissions.filter(perm =>
    perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perm.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perm.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (perm.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getResourceColor = (resource: string) => {
    const colors: Record<string, string> = {
      'doc': 'bg-blue-100 text-blue-700',
      'ai': 'bg-purple-100 text-purple-700',
      'flow': 'bg-green-100 text-green-700',
      'user': 'bg-yellow-100 text-yellow-700',
      'role': 'bg-indigo-100 text-indigo-700',
      'permission': 'bg-pink-100 text-pink-700',
      'rs': 'bg-orange-100 text-orange-700',
      'lims': 'bg-cyan-100 text-cyan-700',
      'qms': 'bg-teal-100 text-teal-700',
      'ehs': 'bg-red-100 text-red-700',
      'srm': 'bg-violet-100 text-violet-700',
      'gis': 'bg-emerald-100 text-emerald-700',
      'im': 'bg-rose-100 text-rose-700',
    };
    return colors[resource] || 'bg-gray-100 text-gray-700';
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'read': 'bg-green-100 text-green-700',
      'write': 'bg-blue-100 text-blue-700',
      'delete': 'bg-red-100 text-red-700',
      'admin': 'bg-purple-100 text-purple-700',
    };
    const labels: Record<string, string> = {
      'read': '读取',
      'write': '写入',
      'delete': '删除',
      'admin': '管理',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[action] || 'bg-gray-100 text-gray-700'}`}>
        {labels[action] || action}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
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
                  <Key className="w-7 h-7 mr-3 text-purple-600" />
                  权限管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  查看和管理系统权限配置
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建权限
            </button>
          </div>
        </div>
      </div>

      {/* 通知 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* 内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜索 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索权限名称、资源、操作或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadPermissions}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadPermissions}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                重试
              </button>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="p-8 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无权限</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPermissions.map((perm) => (
                <div key={perm.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{perm.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResourceColor(perm.resource)}`}>
                            {perm.resource}
                          </span>
                          {getActionBadge(perm.action)}
                        </div>
                        {perm.description && (
                          <p className="text-sm text-gray-500 mt-1">{perm.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          权限 ID: {perm.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeletePermission(perm.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除权限"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 说明卡片 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            关于权限管理
          </h4>
          <p className="text-sm text-blue-700 mt-2">
            权限是系统级配置，通常由开发人员在后端代码中预先定义。
            您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
          </p>
        </div>
      </div>

      {/* 创建权限模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新权限</h3>
              <form onSubmit={handleCreatePermission}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      权限名称 *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPermission.name}
                      onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="例如：文档读取"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        资源 *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermission.resource}
                        onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="例如：doc"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        操作 *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermission.action}
                        onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="例如：read"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={newPermission.description}
                      onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                      placeholder="描述这个权限的用途"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewPermission({ name: '', resource: '', action: '', description: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    创建
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

export default PermissionManagementPage;
