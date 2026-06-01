import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book, ChevronLeft, Plus, Edit, Trash2, Search,
  AlertCircle, ChevronRight, FolderOpen, Tag
} from 'lucide-react';
import {
  dictTypeApi, dictItemApi,
  type DictType, type DictItem
} from '../api/system';

interface DictionaryManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const DictionaryManagementPage: React.FC<DictionaryManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [dictItems, setDictItems] = useState<DictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newType, setNewType] = useState<Partial<DictType>>({
    code: '',
    name: '',
    category: 'business',
    description: '',
  });

  const [newItem, setNewItem] = useState<Partial<DictItem>>({
    code: '',
    name: '',
    value: '',
    sort_order: 0,
  });

  useEffect(() => {
    loadDictTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDictItems(selectedType.id);
    }
  }, [selectedType]);

  const loadDictTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        setDictTypes(res.data.items || []);
        if (!selectedType && res.data.items && res.data.items.length > 0) {
          setSelectedType(res.data.items[0]);
        }
      } else {
        setDictTypes([]);
      }
    } catch (err: any) {
      setError(err.message || '加载字典类型失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDictItems = async (typeId: string) => {
    setItemsLoading(true);
    try {
      const res = await dictItemApi.list(typeId);
      if (res.success && res.data) {
        setDictItems(res.data.items || []);
      } else {
        setDictItems([]);
      }
    } catch (err: any) {
      console.error('加载字典项失败:', err);
      setDictItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dictTypeApi.create(newType);
      if (res.success) {
        showNotification('success', '字典类型创建成功');
        setShowTypeModal(false);
        setNewType({ code: '', name: '', category: 'business', description: '' });
        loadDictTypes();
      } else {
        showNotification('error', res.message || '创建失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建失败');
    }
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    try {
      const res = await dictTypeApi.update(editingType.id, editingType);
      if (res.success) {
        showNotification('success', '字典类型更新成功');
        setShowTypeModal(false);
        setEditingType(null);
        loadDictTypes();
      } else {
        showNotification('error', res.message || '更新失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '更新失败');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('确定要删除这个字典类型吗？所有字典项也会被删除！')) return;
    try {
      const res = await dictTypeApi.delete(id);
      if (res.success) {
        showNotification('success', '字典类型删除成功');
        if (selectedType?.id === id) {
          setSelectedType(null);
        }
        loadDictTypes();
      } else {
        showNotification('error', res.message || '删除失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除失败');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    try {
      const res = await dictItemApi.create({
        ...newItem,
        dict_type_id: selectedType.id,
      });
      if (res.success) {
        showNotification('success', '字典项创建成功');
        setShowItemModal(false);
        setNewItem({ code: '', name: '', value: '', sort_order: 0 });
        loadDictItems(selectedType.id);
      } else {
        showNotification('error', res.message || '创建失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '创建失败');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await dictItemApi.update(editingItem.id, editingItem);
      if (res.success) {
        showNotification('success', '字典项更新成功');
        setShowItemModal(false);
        setEditingItem(null);
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        showNotification('error', res.message || '更新失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '更新失败');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('确定要删除这个字典项吗？')) return;
    try {
      const res = await dictItemApi.delete(id);
      if (res.success) {
        showNotification('success', '字典项删除成功');
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        showNotification('error', res.message || '删除失败');
      }
    } catch (err: any) {
      showNotification('error', err.message || '删除失败');
    }
  };

  const filteredTypes = dictTypes.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTypes = filteredTypes.reduce((acc, type) => {
    const category = type.category || 'custom';
    if (!acc[category]) acc[category] = [];
    acc[category].push(type);
    return acc;
  }, {} as Record<string, DictType[]>);

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
                  <Book className="w-7 h-7 mr-3 text-blue-600" />
                  字典管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理系统字典、业务字典、基础数据字典
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingType(null);
                setNewType({ code: '', name: '', category: 'business', description: '' });
                setShowTypeModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              新增字典类型
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索字典类型..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {Object.entries(groupedTypes).map(([category, types]) => (
                    <div key={category}>
                      <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase mb-2">
                        <FolderOpen className="w-4 h-4" />
                        <span>{categoryLabels[category] || category}</span>
                      </div>
                      <div className="space-y-1">
                        {types.map((type) => (
                          <div
                            key={type.id}
                            onClick={() => setSelectedType(type)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedType?.id === type.id
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{type.name}</div>
                                  <div className="text-xs text-gray-500">{type.code}</div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            {selectedType ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedType.name}</h2>
                      <p className="text-sm text-gray-500">
                        编码: {selectedType.code} | 分类: {categoryLabels[selectedType.category] || selectedType.category}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingType(selectedType);
                          setShowTypeModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="编辑类型"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteType(selectedType.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="删除类型"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setNewItem({ code: '', name: '', value: '', sort_order: dictItems.length });
                          setShowItemModal(true);
                        }}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        新增字典项
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {itemsLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : dictItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">暂无字典项</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">排序</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">编码</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">名称</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">值</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dictItems.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 text-sm text-gray-600">{item.sort_order}</td>
                            <td className="py-3 px-3 text-sm font-mono text-gray-900">{item.code}</td>
                            <td className="py-3 px-3 text-sm text-gray-900">{item.name}</td>
                            <td className="py-3 px-3 text-sm text-gray-600">{item.value || '-'}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {item.status === 'active' ? '启用' : '禁用'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowItemModal(true);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors mr-1"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">请选择字典类型</h3>
                <p className="text-gray-500">从左侧列表选择一个字典类型查看和管理字典项</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingType ? '编辑字典类型' : '新增字典类型'}
              </h3>
              <form onSubmit={editingType ? handleUpdateType : handleCreateType}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">编码 *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingType}
                      value={editingType ? editingType.code : newType.code || ''}
                      onChange={(e) => editingType
                        ? setEditingType({ ...editingType, code: e.target.value })
                        : setNewType({ ...newType, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="如: status_type"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                    <input
                      type="text"
                      required
                      value={editingType ? editingType.name : newType.name || ''}
                      onChange={(e) => editingType
                        ? setEditingType({ ...editingType, name: e.target.value })
                        : setNewType({ ...newType, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如: 状态类型"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <select
                      value={editingType ? editingType.category : newType.category || 'business'}
                      onChange={(e) => editingType
                        ? setEditingType({ ...editingType, category: e.target.value })
                        : setNewType({ ...newType, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="system">系统字典</option>
                      <option value="business">业务字典</option>
                      <option value="basic">基础数据</option>
                      <option value="custom">自定义字典</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={editingType ? editingType.description || '' : newType.description || ''}
                      onChange={(e) => editingType
                        ? setEditingType({ ...editingType, description: e.target.value })
                        : setNewType({ ...newType, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTypeModal(false);
                      setEditingType(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingType ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? '编辑字典项' : '新增字典项'}
              </h3>
              <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">编码 *</label>
                    <input
                      type="text"
                      required
                      value={editingItem ? editingItem.code : newItem.code || ''}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, code: e.target.value })
                        : setNewItem({ ...newItem, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如: active"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                    <input
                      type="text"
                      required
                      value={editingItem ? editingItem.name : newItem.name || ''}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, name: e.target.value })
                        : setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="如: 启用"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">值</label>
                    <input
                      type="text"
                      value={editingItem ? editingItem.value || '' : newItem.value || ''}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, value: e.target.value })
                        : setNewItem({ ...newItem, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="可选，存储实际值"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={editingItem ? editingItem.sort_order : newItem.sort_order || 0}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, sort_order: parseInt(e.target.value) || 0 })
                        : setNewItem({ ...newItem, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {editingItem && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select
                        value={editingItem.status}
                        onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingItem ? '保存' : '创建'}
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

export default DictionaryManagementPage;
