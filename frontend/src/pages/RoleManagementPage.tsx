import React, { useState, useEffect } from 'react';
import {
  Shield, Search, Plus, Edit, Trash2, ChevronLeft,
  Users, Key, AlertCircle, XCircle, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type Role, type Permission } from '../api/iam';

interface RoleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        authApi.listRoles(),
        authApi.listPermissions()
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success && permsRes.data) {
        setAllPermissions(permsRes.data);
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      showNotification('error', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const res = await authApi.getRolePermissions(roleId);
      if (res.success && res.data) {
        setRolePermissions(res.data);
      }
    } catch (err: any) {
      showNotification('error', '加载角色权限失败');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createRole(newRole);
      if (res.success) {
        showNotification('success', '角色创建成功');
        setShowCreateModal(false);
        setNewRole({ name: '', description: '' });
        loadData();
      } else {
        showNotification('error', res.message || '创建角色失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建角色失败');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除这个角色吗？删除后无法恢复。')) return;

    try {
      const res = await authApi.deleteRole(roleId);
      if (res.success) {
        showNotification('success', '角色删除成功');
        loadData();
      } else {
        showNotification('error', res.message || '删除角色失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除角色失败');
    }
  };

  const handleAddPermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.addRolePermission(roleId, permissionId);
      if (res.success) {
        showNotification('success', '权限添加成功');
        loadRolePermissions(roleId);
      } else {
        showNotification('error', res.message || '添加权限失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '添加权限失败');
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.removeRolePermission(roleId, permissionId);
      if (res.success) {
        showNotification('success', '权限移除成功');
        loadRolePermissions(roleId);
      } else {
        showNotification('error', res.message || '移除权限失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '移除权限失败');
    }
  };

  const openPermissionsModal = async (role: Role) => {
    setSelectedRole(role);
    await loadRolePermissions(role.id);
    setShowPermissionsModal(true);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                  <Shield className="w-7 h-7 mr-3 text-indigo-600" />
                  角色管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理用户角色、权限配置
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建角色
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
                placeholder="搜索角色名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        {/* 角色列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                重试
              </button>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无角色</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRoles.map((role) => (
                <div key={role.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          创建时间: {new Date(role.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openPermissionsModal(role)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="管理权限"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除角色"
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
      </div>

      {/* 创建角色模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新角色</h3>
              <form onSubmit={handleCreateRole}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      角色名称 *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="例如：管理员、普通用户"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                      placeholder="描述这个角色的用途"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewRole({ name: '', description: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 角色权限管理模态框 */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  角色权限 - {selectedRole.name}
                </h3>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <h4 className="font-medium text-gray-900 mb-4">可选权限</h4>
              <div className="space-y-2">
                {allPermissions.map((perm) => {
                  const hasPermission = rolePermissions.some(p => p.id === perm.id);
                  return (
                    <div key={perm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{perm.name}</span>
                          {hasPermission && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{perm.description}</p>
                        <p className="text-xs text-gray-400">
                          资源: {perm.resource} | 操作: {perm.action}
                        </p>
                      </div>
                      {hasPermission ? (
                        <button
                          onClick={() => handleRemovePermission(selectedRole.id, perm.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                        >
                          移除
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddPermission(selectedRole.id, perm.id)}
                          className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-sm"
                        >
                          添加
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
