import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
  FolderOpen,
  Tag,
  Download,
  Upload,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { dictTypeApi, dictItemApi, type DictType, type DictItem } from '../api/system';
import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

interface DictionaryManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  basic: '基础数据',
  custom: '自定义字典',
};

const statusLabels: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
};

const DictionaryManagementPage: React.FC<DictionaryManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

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

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [newType, setNewType] = useState<Partial<DictType>>({
    code: '',
    name: '',
    category: 'business',
    description: '',
    status: 'active',
  });

  const [newItem, setNewItem] = useState<Partial<DictItem>>({
    code: '',
    name: '',
    value: '',
    sort_order: 0,
    parent_id: undefined,
  });

  useEffect(() => {
    loadDictTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDictItems(selectedType.id);
      setSelectedItems([]);
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
      addNotification({ title: '加载失败', message: err.message || '加载字典类型失败', type: 'error' });
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

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dictTypeApi.create(newType);
      if (res.success) {
        addNotification({ title: '成功', message: '字典类型创建成功', type: 'success' });
        setShowTypeModal(false);
        setNewType({ code: '', name: '', category: 'business', description: '', status: 'active' });
        loadDictTypes();
      } else {
        addNotification({ title: '失败', message: res.message || '创建失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建失败', type: 'error' });
    }
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    try {
      const res = await dictTypeApi.update(editingType.id, editingType);
      if (res.success) {
        addNotification({ title: '成功', message: '字典类型更新成功', type: 'success' });
        setShowTypeModal(false);
        setEditingType(null);
        loadDictTypes();
      } else {
        addNotification({ title: '失败', message: res.message || '更新失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新失败', type: 'error' });
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      const res = await dictTypeApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '字典类型删除成功', type: 'success' });
        if (selectedType?.id === id) {
          setSelectedType(null);
        }
        loadDictTypes();
      } else {
        addNotification({ title: '失败', message: res.message || '删除失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除失败', type: 'error' });
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
        addNotification({ title: '成功', message: '字典项创建成功', type: 'success' });
        setShowItemModal(false);
        setNewItem({ code: '', name: '', value: '', sort_order: dictItems.length, parent_id: undefined });
        loadDictItems(selectedType.id);
      } else {
        addNotification({ title: '失败', message: res.message || '创建失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建失败', type: 'error' });
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await dictItemApi.update(editingItem.id, editingItem);
      if (res.success) {
        addNotification({ title: '成功', message: '字典项更新成功', type: 'success' });
        setShowItemModal(false);
        setEditingItem(null);
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({ title: '失败', message: res.message || '更新失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新失败', type: 'error' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await dictItemApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '字典项删除成功', type: 'success' });
        setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({ title: '失败', message: res.message || '删除失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除失败', type: 'error' });
    }
  };

  const handleToggleItemStatus = async (item: DictItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await dictItemApi.update(item.id, { ...item, status: newStatus });
      if (res.success) {
        addNotification({
          title: '成功',
          message: `字典项已${newStatus === 'active' ? '启用' : '禁用'}`,
          type: 'success',
        });
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({ title: '失败', message: res.message || '状态切换失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '状态切换失败', type: 'error' });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    try {
      for (const id of selectedItems) {
        await dictItemApi.delete(id);
      }
      addNotification({ title: '成功', message: `成功删除 ${selectedItems.length} 个字典项`, type: 'success' });
      setSelectedItems([]);
      if (selectedType) loadDictItems(selectedType.id);
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '批量删除失败', type: 'error' });
    }
  };

  const handleExport = () => {
    if (!selectedType || dictItems.length === 0) return;

    const exportData = dictItems.map((item) => ({
      code: item.code,
      name: item.name,
      value: item.value || '',
      sort_order: item.sort_order,
      status: item.status,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType.code}_items.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({ title: '成功', message: '字典项导出成功', type: 'success' });
    setShowExportModal(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedType) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const items = JSON.parse(event.target?.result as string);
          if (!Array.isArray(items)) {
            addNotification({ title: '失败', message: '导入文件格式不正确', type: 'error' });
            return;
          }

          for (const item of items) {
            await dictItemApi.create({
              dict_type_id: selectedType.id,
              code: item.code,
              name: item.name,
              value: item.value,
              sort_order: item.sort_order || 0,
              status: item.status || 'active',
            });
          }

          addNotification({ title: '成功', message: `成功导入 ${items.length} 个字典项`, type: 'success' });
          setShowImportModal(false);
          setImportFile(null);
          if (selectedType) loadDictItems(selectedType.id);
        } catch (err: any) {
          addNotification({ title: '失败', message: err.message || '导入失败', type: 'error' });
        }
      };
      reader.readAsText(importFile);
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '导入失败', type: 'error' });
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(dictItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const filteredTypes = dictTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTypes = useMemo(() => {
    return filteredTypes.reduce(
      (acc, type) => {
        const category = type.category || 'custom';
        if (!acc[category]) acc[category] = [];
        acc[category].push(type);
        return acc;
      },
      {} as Record<string, DictType[]>
    );
  }, [filteredTypes]);

  const parentItems = useMemo(() => {
    return dictItems.filter((item) => !item.parent_id);
  }, [dictItems]);

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                onClick={() => navigate('/dashboard')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <Book className='w-7 h-7 mr-3 text-blue-600' />
                  字典管理
                </h1>
                <p className='mt-1 text-sm text-gray-500'>管理系统字典、业务字典、基础数据字典</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingType(null);
                setNewType({ code: '', name: '', category: 'business', description: '', status: 'active' });
                setShowTypeModal(true);
              }}
              className='flex items-center'
            >
              <Plus className='w-5 h-5 mr-2' />
              新增字典类型
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <p className='text-red-700'>{error}</p>
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='flex gap-6'>
          <div className='w-80 flex-shrink-0'>
            <Card>
              <CardContent className='p-4'>
                <div className='relative mb-4'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <Input
                    type='text'
                    placeholder='搜索字典类型...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full pl-9'
                  />
                </div>

                {loading ? (
                  <div className='text-center py-8'>
                    <RefreshCw className='inline-block animate-spin rounded-full h-6 w-6 text-blue-600' />
                  </div>
                ) : (
                  <ScrollArea className='h-[600px]'>
                    <div className='space-y-4'>
                      {Object.entries(groupedTypes).map(([category, types]) => (
                        <div key={category}>
                          <div className='flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase mb-2'>
                            <FolderOpen className='w-4 h-4' />
                            <span>{categoryLabels[category] || category}</span>
                          </div>
                          <div className='space-y-1'>
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
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center space-x-2'>
                                    <Tag className='w-4 h-4 text-gray-400' />
                                    <div>
                                      <div className='font-medium text-gray-900 text-sm'>{type.name}</div>
                                      <div className='text-xs text-gray-500'>{type.code}</div>
                                    </div>
                                  </div>
                                  <ChevronRight className='w-4 h-4 text-gray-400' />
                                </div>
                                <Badge variant='outline' className='mt-2 text-xs'>
                                  {statusLabels[type.status]}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <div className='flex-1'>
            {selectedType ? (
              <Card>
                <CardHeader className='flex flex-row items-center justify-between pb-2'>
                  <div>
                    <CardTitle className='text-lg'>{selectedType.name}</CardTitle>
                    <p className='text-sm text-gray-500'>
                      编码: {selectedType.code} | 分类: {categoryLabels[selectedType.category] || selectedType.category}
                    </p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setEditingType(selectedType);
                        setShowTypeModal(true);
                      }}
                    >
                      <Edit className='w-4 h-4 mr-1' />
                      编辑类型
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-red-600 hover:text-red-600 hover:bg-red-50'
                      onClick={() => {
                        if (confirm('确定要删除这个字典类型吗？所有字典项也会被删除！')) {
                          handleDeleteType(selectedType.id);
                        }
                      }}
                    >
                      <Trash2 className='w-4 h-4 mr-1' />
                      删除
                    </Button>
                    <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
                      <DialogTrigger asChild>
                        <Button variant='outline' size='sm'>
                          <Download className='w-4 h-4 mr-1' />
                          导出
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>导出字典项</DialogTitle>
                        </DialogHeader>
                        <p className='text-sm text-gray-600 mb-4'>将当前字典类型的所有字典项导出为 JSON 文件。</p>
                        <DialogFooter>
                          <Button variant='outline' onClick={() => setShowExportModal(false)}>
                            取消
                          </Button>
                          <Button onClick={handleExport}>确认导出</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                      <DialogTrigger asChild>
                        <Button variant='outline' size='sm'>
                          <Upload className='w-4 h-4 mr-1' />
                          导入
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>导入字典项</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleImport} className='space-y-4'>
                          <div>
                            <Label htmlFor='import-file'>选择 JSON 文件</Label>
                            <Input
                              id='import-file'
                              type='file'
                              accept='.json'
                              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                              className='mt-1'
                            />
                          </div>
                          <DialogFooter>
                            <Button variant='outline' type='button' onClick={() => setShowImportModal(false)}>
                              取消
                            </Button>
                            <Button type='submit'>确认导入</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size='sm'
                      onClick={() => {
                        setEditingItem(null);
                        setNewItem({
                          code: '',
                          name: '',
                          value: '',
                          sort_order: dictItems.length,
                          parent_id: undefined,
                        });
                        setShowItemModal(true);
                      }}
                    >
                      <Plus className='w-4 h-4 mr-1' />
                      新增字典项
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className='p-4'>
                  {itemsLoading ? (
                    <div className='text-center py-8'>
                      <RefreshCw className='inline-block animate-spin rounded-full h-6 w-6 text-blue-600' />
                    </div>
                  ) : dictItems.length === 0 ? (
                    <div className='text-center py-12'>
                      <Tag className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                      <p className='text-gray-500'>暂无字典项</p>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <label className='flex items-center space-x-2 cursor-pointer'>
                          <input
                            type='checkbox'
                            checked={selectedItems.length === dictItems.length && dictItems.length > 0}
                            onChange={handleSelectAll}
                            className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                          />
                          <span className='text-sm text-gray-600'>全选</span>
                        </label>
                        {selectedItems.length > 0 && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-red-600 hover:text-red-600 hover:bg-red-50'
                            onClick={() => {
                              if (confirm(`确定要删除选中的 ${selectedItems.length} 个字典项吗？`)) {
                                handleBatchDelete();
                              }
                            }}
                          >
                            <Trash2 className='w-4 h-4 mr-1' />
                            批量删除 ({selectedItems.length})
                          </Button>
                        )}
                      </div>
                      <table className='w-full'>
                        <thead>
                          <tr className='border-b border-gray-200'>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-12'>
                              选择
                            </th>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-16'>
                              排序
                            </th>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase'>编码</th>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase'>名称</th>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase'>值</th>
                            <th className='text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-24'>
                              状态
                            </th>
                            <th className='text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase w-32'>
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dictItems.map((item) => (
                            <tr key={item.id} className='border-b border-gray-100 hover:bg-gray-50'>
                              <td className='py-3 px-3'>
                                <input
                                  type='checkbox'
                                  checked={selectedItems.includes(item.id)}
                                  onChange={() => handleSelectItem(item.id)}
                                  className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                                />
                              </td>
                              <td className='py-3 px-3 text-sm text-gray-600'>{item.sort_order}</td>
                              <td className='py-3 px-3 text-sm font-mono text-gray-900'>{item.code}</td>
                              <td className='py-3 px-3 text-sm text-gray-900'>
                                {item.parent_id && <span className='text-gray-400 mr-1'>└─</span>}
                                {item.name}
                              </td>
                              <td className='py-3 px-3 text-sm text-gray-600'>{item.value || '-'}</td>
                              <td className='py-3 px-3'>
                                <button
                                  onClick={() => handleToggleItemStatus(item)}
                                  className='flex items-center space-x-2'
                                >
                                  <Switch checked={item.status === 'active'} onCheckedChange={() => {}} />
                                  <span
                                    className={`text-xs font-medium ${
                                      item.status === 'active' ? 'text-green-600' : 'text-gray-500'
                                    }`}
                                  >
                                    {statusLabels[item.status]}
                                  </span>
                                </button>
                              </td>
                              <td className='py-3 px-3 text-right'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowItemModal(true);
                                  }}
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-red-600 hover:text-red-600'
                                  onClick={() => {
                                    if (confirm('确定要删除这个字典项吗？')) {
                                      handleDeleteItem(item.id);
                                    }
                                  }}
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className='p-12 text-center'>
                  <Book className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>请选择字典类型</h3>
                  <p className='text-gray-500'>从左侧列表选择一个字典类型查看和管理字典项</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{editingType ? '编辑字典类型' : '新增字典类型'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingType ? handleUpdateType : handleCreateType} className='space-y-4'>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='type-code'>编码 *</Label>
                <Input
                  id='type-code'
                  type='text'
                  required
                  disabled={!!editingType}
                  value={editingType?.code || newType.code || ''}
                  onChange={(e) => {
                    if (editingType) {
                      setEditingType({ ...editingType, code: e.target.value });
                    } else {
                      setNewType({ ...newType, code: e.target.value });
                    }
                  }}
                  className='mt-1'
                  placeholder='如: status_type'
                />
              </div>
              <div>
                <Label htmlFor='type-name'>名称 *</Label>
                <Input
                  id='type-name'
                  type='text'
                  required
                  value={editingType?.name || newType.name || ''}
                  onChange={(e) => {
                    if (editingType) {
                      setEditingType({ ...editingType, name: e.target.value });
                    } else {
                      setNewType({ ...newType, name: e.target.value });
                    }
                  }}
                  className='mt-1'
                  placeholder='如: 状态类型'
                />
              </div>
              <div>
                <Label htmlFor='type-category'>分类</Label>
                <Select
                  value={editingType?.category || newType.category || 'business'}
                  onValueChange={(value) => {
                    if (editingType) {
                      setEditingType({ ...editingType, category: value });
                    } else {
                      setNewType({ ...newType, category: value });
                    }
                  }}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='选择分类' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='system'>系统字典</SelectItem>
                    <SelectItem value='business'>业务字典</SelectItem>
                    <SelectItem value='basic'>基础数据</SelectItem>
                    <SelectItem value='custom'>自定义字典</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='type-description'>描述</Label>
                <textarea
                  id='type-description'
                  value={editingType?.description || newType.description || ''}
                  onChange={(e) => {
                    if (editingType) {
                      setEditingType({ ...editingType, description: e.target.value });
                    } else {
                      setNewType({ ...newType, description: e.target.value });
                    }
                  }}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1'
                  rows={2}
                />
              </div>
              {(editingType || !editingType) && (
                <div className='flex items-center justify-between'>
                  <Label htmlFor='type-status'>状态</Label>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-gray-600'>
                      {editingType?.status === 'active' || newType.status === 'active' ? '启用' : '禁用'}
                    </span>
                    <Switch
                      id='type-status'
                      checked={editingType?.status === 'active' || newType.status === 'active'}
                      onCheckedChange={(checked) => {
                        const status = checked ? 'active' : 'inactive';
                        if (editingType) {
                          setEditingType({ ...editingType, status });
                        } else {
                          setNewType({ ...newType, status });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                type='button'
                onClick={() => {
                  setShowTypeModal(false);
                  setEditingType(null);
                }}
              >
                取消
              </Button>
              <Button type='submit'>{editingType ? '保存' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑字典项' : '新增字典项'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className='space-y-4'>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='item-code'>编码 *</Label>
                <Input
                  id='item-code'
                  type='text'
                  required
                  value={editingItem?.code || newItem.code || ''}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, code: e.target.value });
                    } else {
                      setNewItem({ ...newItem, code: e.target.value });
                    }
                  }}
                  className='mt-1'
                  placeholder='如: active'
                />
              </div>
              <div>
                <Label htmlFor='item-name'>名称 *</Label>
                <Input
                  id='item-name'
                  type='text'
                  required
                  value={editingItem?.name || newItem.name || ''}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, name: e.target.value });
                    } else {
                      setNewItem({ ...newItem, name: e.target.value });
                    }
                  }}
                  className='mt-1'
                  placeholder='如: 启用'
                />
              </div>
              <div>
                <Label htmlFor='item-value'>值</Label>
                <Input
                  id='item-value'
                  type='text'
                  value={editingItem?.value || newItem.value || ''}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({ ...editingItem, value: e.target.value });
                    } else {
                      setNewItem({ ...newItem, value: e.target.value });
                    }
                  }}
                  className='mt-1'
                  placeholder='可选，存储实际值'
                />
              </div>
              <div>
                <Label htmlFor='item-sort'>排序</Label>
                <Input
                  id='item-sort'
                  type='number'
                  value={editingItem?.sort_order || newItem.sort_order || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (editingItem) {
                      setEditingItem({ ...editingItem, sort_order: value });
                    } else {
                      setNewItem({ ...newItem, sort_order: value });
                    }
                  }}
                  className='mt-1'
                />
              </div>
              <div>
                <Label htmlFor='item-parent'>上级字典项</Label>
                <Select
                  value={editingItem?.parent_id || newItem.parent_id || ''}
                  onValueChange={(value) => {
                    const parentId = value || undefined;
                    if (editingItem) {
                      setEditingItem({ ...editingItem, parent_id: parentId });
                    } else {
                      setNewItem({ ...newItem, parent_id: parentId });
                    }
                  }}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='选择上级（可选）' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>无（顶级）</SelectItem>
                    {parentItems
                      .filter((item) => item.id !== editingItem?.id)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {editingItem && (
                <div className='flex items-center justify-between'>
                  <Label htmlFor='item-status'>状态</Label>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-gray-600'>{editingItem.status === 'active' ? '启用' : '禁用'}</span>
                    <Switch
                      id='item-status'
                      checked={editingItem.status === 'active'}
                      onCheckedChange={(checked) => {
                        setEditingItem({ ...editingItem, status: checked ? 'active' : 'inactive' });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                type='button'
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                }}
              >
                取消
              </Button>
              <Button type='submit'>{editingItem ? '保存' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DictionaryManagementPage;
