import React, { useState, useEffect, useMemo } from 'react';
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Check,
  X,
  List,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { PageContainer, StatusBadge, ActionButton, ConfirmDialog } from '@/components/common';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';

export interface DictType {
  id: string;
  dict_code: string;
  dict_name: string;
  description: string;
  status: 'active' | 'inactive';
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface DictItem {
  id: string;
  dict_code: string;
  item_code: string;
  item_name: string;
  item_value: string;
  sort_order: number;
  status: 'active' | 'inactive';
  remark?: string;
  created_at: string;
  updated_at: string;
}

const mockDictTypes: DictType[] = [
  {
    id: '1',
    dict_code: 'voucher_type',
    dict_name: '凭证类型',
    description: '会计凭证的类型分类',
    status: 'active',
    item_count: 4,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-06-01T00:00:00',
  },
  {
    id: '2',
    dict_code: 'voucher_status',
    dict_name: '凭证状态',
    description: '会计凭证的状态枚举',
    status: 'active',
    item_count: 5,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-06-01T00:00:00',
  },
  {
    id: '3',
    dict_code: 'asset_category',
    dict_name: '资产分类',
    description: '固定资产的分类',
    status: 'active',
    item_count: 6,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-05-15T00:00:00',
  },
  {
    id: '4',
    dict_code: 'expense_type',
    dict_name: '费用类型',
    description: '费用报销的类型',
    status: 'active',
    item_count: 8,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-04-20T00:00:00',
  },
  {
    id: '5',
    dict_code: 'payment_method',
    dict_name: '支付方式',
    description: '收付款的支付方式',
    status: 'inactive',
    item_count: 3,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-03-10T00:00:00',
  },
];

const mockDictItems: Record<string, DictItem[]> = {
  voucher_type: [
    {
      id: '1',
      dict_code: 'voucher_type',
      item_code: 'receipt',
      item_name: '收款凭证',
      item_value: '收',
      sort_order: 1,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '2',
      dict_code: 'voucher_type',
      item_code: 'payment',
      item_name: '付款凭证',
      item_value: '付',
      sort_order: 2,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '3',
      dict_code: 'voucher_type',
      item_code: 'transfer',
      item_name: '转账凭证',
      item_value: '转',
      sort_order: 3,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '4',
      dict_code: 'voucher_type',
      item_code: 'general',
      item_name: '记账凭证',
      item_value: '记',
      sort_order: 4,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
  ],
  voucher_status: [
    {
      id: '5',
      dict_code: 'voucher_status',
      item_code: 'draft',
      item_name: '草稿',
      item_value: 'draft',
      sort_order: 1,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '6',
      dict_code: 'voucher_status',
      item_code: 'pending',
      item_name: '待审核',
      item_value: 'pending',
      sort_order: 2,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '7',
      dict_code: 'voucher_status',
      item_code: 'approved',
      item_name: '已审核',
      item_value: 'approved',
      sort_order: 3,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '8',
      dict_code: 'voucher_status',
      item_code: 'posted',
      item_name: '已记账',
      item_value: 'posted',
      sort_order: 4,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '9',
      dict_code: 'voucher_status',
      item_code: 'closed',
      item_name: '已结账',
      item_value: 'closed',
      sort_order: 5,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
  ],
  asset_category: [
    {
      id: '10',
      dict_code: 'asset_category',
      item_code: 'house',
      item_name: '房屋建筑物',
      item_value: '1',
      sort_order: 1,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '11',
      dict_code: 'asset_category',
      item_code: 'equipment',
      item_name: '机器设备',
      item_value: '2',
      sort_order: 2,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '12',
      dict_code: 'asset_category',
      item_code: 'transport',
      item_name: '运输设备',
      item_value: '3',
      sort_order: 3,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '13',
      dict_code: 'asset_category',
      item_code: 'electronic',
      item_name: '电子设备',
      item_value: '4',
      sort_order: 4,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '14',
      dict_code: 'asset_category',
      item_code: 'furniture',
      item_name: '家具器具',
      item_value: '5',
      sort_order: 5,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
    {
      id: '15',
      dict_code: 'asset_category',
      item_code: 'other',
      item_name: '其他',
      item_value: '9',
      sort_order: 6,
      status: 'active',
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    },
  ],
  expense_type: [],
  payment_method: [],
};

const DictManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDict, setSelectedDict] = useState<DictType | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [dictItems, setDictItems] = useState<DictItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [itemLoading, setItemLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);

  const [deleteTypeDialogOpen, setDeleteTypeDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [newType, setNewType] = useState({
    dict_code: '',
    dict_name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [newItem, setNewItem] = useState({
    item_code: '',
    item_name: '',
    item_value: '',
    sort_order: 1,
    status: 'active' as 'active' | 'inactive',
    remark: '',
  });

  useEffect(() => {
    loadDictTypes();
  }, []);

  useEffect(() => {
    if (selectedDict) {
      loadDictItems(selectedDict.dict_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDict]);

  const loadDictTypes = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDictTypes(mockDictTypes);
      setTotalCount(mockDictTypes.length);
      if (mockDictTypes.length > 0) {
        setSelectedDict(mockDictTypes[0]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载字典类型失败:', err);
      addNotification({
        title: '错误',
        message: '加载字典类型失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDictItems = async (dictCode: string) => {
    setItemLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setDictItems(mockDictItems[dictCode] || []);
    } catch (err: unknown) {
      apiLogger.error('加载字典项失败:', err);
      addNotification({
        title: '错误',
        message: '加载字典项失败',
        type: 'error',
      });
    } finally {
      setItemLoading(false);
    }
  };

  const filteredDictTypes = useMemo(() => {
    return dictTypes.filter((dict) => {
      const matchesSearch =
        !searchQuery ||
        dict.dict_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dict.dict_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || dict.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dictTypes, searchQuery, statusFilter]);

  const filteredDictItems = useMemo(() => {
    return dictItems.filter((item) => {
      return (
        !itemSearchQuery ||
        item.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.item_code.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.item_value.toLowerCase().includes(itemSearchQuery.toLowerCase())
      );
    });
  }, [dictItems, itemSearchQuery]);

  const handleCreateType = async () => {
    if (!newType.dict_code || !newType.dict_name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      const newId = Date.now().toString();
      const newDict: DictType = {
        id: newId,
        ...newType,
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDictTypes((prev) => [...prev, newDict]);
      mockDictItems[newType.dict_code] = [];
      addNotification({
        title: '成功',
        message: '字典类型创建成功',
        type: 'success',
      });
      setShowTypeModal(false);
      resetTypeForm();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !newType.dict_code || !newType.dict_name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      setDictTypes((prev) =>
        prev.map((d) =>
          d.id === editingType.id ? { ...d, ...newType, updated_at: new Date().toISOString() } : d
        )
      );
      if (selectedDict?.id === editingType.id) {
        setSelectedDict((prev) =>
          prev ? { ...prev, ...newType, updated_at: new Date().toISOString() } : null
        );
      }
      addNotification({
        title: '成功',
        message: '字典类型更新成功',
        type: 'success',
      });
      setShowTypeModal(false);
      resetTypeForm();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleEditType = (dict: DictType) => {
    setEditingType(dict);
    setNewType({
      dict_code: dict.dict_code,
      dict_name: dict.dict_name,
      description: dict.description,
      status: dict.status,
    });
    setShowTypeModal(true);
  };

  const handleDeleteType = (id: string) => {
    setDeletingTypeId(id);
    setDeleteTypeDialogOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!deletingTypeId) return;
    try {
      const dict = dictTypes.find((d) => d.id === deletingTypeId);
      if (dict) {
        delete mockDictItems[dict.dict_code];
      }
      setDictTypes((prev) => prev.filter((d) => d.id !== deletingTypeId));
      if (selectedDict?.id === deletingTypeId) {
        setSelectedDict(dictTypes.find((d) => d.id !== deletingTypeId) || null);
      }
      addNotification({
        title: '成功',
        message: '删除成功',
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    } finally {
      setDeleteTypeDialogOpen(false);
      setDeletingTypeId(null);
    }
  };

  const resetTypeForm = () => {
    setNewType({
      dict_code: '',
      dict_name: '',
      description: '',
      status: 'active',
    });
    setEditingType(null);
  };

  const handleCreateItem = async () => {
    if (!newItem.item_code || !newItem.item_name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    if (!selectedDict) return;

    try {
      const newId = Date.now().toString();
      const item: DictItem = {
        id: newId,
        dict_code: selectedDict.dict_code,
        ...newItem,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDictItems((prev) => [...prev, item].sort((a, b) => a.sort_order - b.sort_order));
      mockDictItems[selectedDict.dict_code] = [
        ...(mockDictItems[selectedDict.dict_code] || []),
        item,
      ].sort((a, b) => a.sort_order - b.sort_order);
      setDictTypes((prev) =>
        prev.map((d) => (d.id === selectedDict.id ? { ...d, item_count: d.item_count + 1 } : d))
      );
      if (selectedDict) {
        setSelectedDict((prev) => (prev ? { ...prev, item_count: prev.item_count + 1 } : null));
      }
      addNotification({
        title: '成功',
        message: '字典项创建成功',
        type: 'success',
      });
      setShowItemModal(false);
      resetItemForm();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.item_code || !newItem.item_name) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    try {
      setDictItems((prev) =>
        prev
          .map((i) =>
            i.id === editingItem.id ? { ...i, ...newItem, updated_at: new Date().toISOString() } : i
          )
          .sort((a, b) => a.sort_order - b.sort_order)
      );
      addNotification({
        title: '成功',
        message: '字典项更新成功',
        type: 'success',
      });
      setShowItemModal(false);
      resetItemForm();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleEditItem = (item: DictItem) => {
    setEditingItem(item);
    setNewItem({
      item_code: item.item_code,
      item_name: item.item_name,
      item_value: item.item_value,
      sort_order: item.sort_order,
      status: item.status,
      remark: item.remark || '',
    });
    setShowItemModal(true);
  };

  const handleDeleteItem = (id: string) => {
    setDeletingItemId(id);
    setDeleteItemDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItemId || !selectedDict) return;
    try {
      setDictItems((prev) => prev.filter((i) => i.id !== deletingItemId));
      setDictTypes((prev) =>
        prev.map((d) =>
          d.id === selectedDict.id ? { ...d, item_count: Math.max(0, d.item_count - 1) } : d
        )
      );
      if (selectedDict) {
        setSelectedDict((prev) =>
          prev ? { ...prev, item_count: Math.max(0, prev.item_count - 1) } : null
        );
      }
      addNotification({
        title: '成功',
        message: '删除成功',
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    } finally {
      setDeleteItemDialogOpen(false);
      setDeletingItemId(null);
    }
  };

  const resetItemForm = () => {
    setNewItem({
      item_code: '',
      item_name: '',
      item_value: '',
      sort_order: 1,
      status: 'active',
      remark: '',
    });
    setEditingItem(null);
  };

  const handleToggleTypeStatus = async (dict: DictType) => {
    try {
      const newStatus = dict.status === 'active' ? 'inactive' : 'active';
      setDictTypes((prev) =>
        prev.map((d) =>
          d.id === dict.id ? { ...d, status: newStatus, updated_at: new Date().toISOString() } : d
        )
      );
      if (selectedDict?.id === dict.id) {
        setSelectedDict((prev) =>
          prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null
        );
      }
      addNotification({
        title: '成功',
        message: `已${newStatus === 'active' ? '启用' : '禁用'}`,
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleToggleItemStatus = async (item: DictItem) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      setDictItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: newStatus, updated_at: new Date().toISOString() } : i
        )
      );
      addNotification({
        title: '成功',
        message: `已${newStatus === 'active' ? '启用' : '禁用'}`,
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  return (
    <PageContainer
      title='数据字典管理'
      subtitle='字典类型管理、字典项维护'
      maxWidth='xl'
      headerProps={{
        backButton: {
          onClick: () => navigate('/erp/dashboard'),
        },
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadDictTypes,
            variant: 'outlined',
          },
          {
            label: '新增字典',
            icon: <Plus size={16} />,
            onClick: () => {
              resetTypeForm();
              setShowTypeModal(true);
            },
            variant: 'contained',
          },
        ],
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
          gap: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <List
              size={18}
              style={{ opacity: 0.6 }}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              字典类型
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label={dictTypes.length}
              size='small'
              color='primary'
              variant='outlined'
            />
          </Box>

          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              size='small'
              fullWidth
              placeholder='搜索字典...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search
                        size={16}
                        style={{ opacity: 0.5 }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl
              size='small'
              fullWidth
              sx={{ mt: 1.5 }}
            >
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                label='状态筛选'
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value=''>全部状态</MenuItem>
                <MenuItem value='active'>启用</MenuItem>
                <MenuItem value='inactive'>禁用</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
              {filteredDictTypes.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Book
                    sx={{ width: 36, height: 36, color: 'text.disabled', mx: 'auto', mb: 1.5 }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    暂无字典类型
                  </Typography>
                </Box>
              ) : (
                filteredDictTypes.map((dict) => (
                  <Box
                    key={dict.id}
                    onClick={() => setSelectedDict(dict)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: selectedDict?.id === dict.id ? 'primary.50' : 'transparent',
                      '&:hover': {
                        bgcolor: selectedDict?.id === dict.id ? 'primary.100' : 'grey.50',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 0.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {dict.dict_name}
                      </Typography>
                      <StatusBadge
                        status={dict.status}
                        label={dict.status === 'active' ? '启用' : '禁用'}
                        color={dict.status === 'active' ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
                    >
                      {dict.dict_code}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.disabled' }}
                      >
                        {dict.item_count} 个字典项
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title='编辑'>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditType(dict);
                            }}
                          >
                            <Edit size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteType(dict.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          {selectedDict ? (
            <>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedDict.dict_name}
                    <Chip
                      label={selectedDict.dict_code}
                      size='small'
                      sx={{ ml: 1, height: 20 }}
                      variant='outlined'
                    />
                  </Typography>
                  {selectedDict.description && (
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 0.5 }}
                    >
                      {selectedDict.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedDict.status === 'active'}
                        onChange={() => handleToggleTypeStatus(selectedDict)}
                        size='small'
                      />
                    }
                    label={
                      <Typography variant='body2'>
                        {selectedDict.status === 'active' ? '启用' : '禁用'}
                      </Typography>
                    }
                  />
                  <Button
                    size='small'
                    startIcon={<Plus size={16} />}
                    variant='contained'
                    onClick={() => {
                      resetItemForm();
                      setShowItemModal(true);
                    }}
                  >
                    新增字典项
                  </Button>
                </Box>
              </Box>

              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  size='small'
                  placeholder='搜索字典项...'
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search
                            size={16}
                            style={{ opacity: 0.5 }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              {itemLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 'bold', width: 80 }}>排序</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目编码</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目名称</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>项目值</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>备注</TableCell>
                        <TableCell
                          align='center'
                          sx={{ fontWeight: 'bold', width: 160 }}
                        >
                          操作
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDictItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{ py: 8, textAlign: 'center' }}
                          >
                            <List
                              sx={{
                                width: 40,
                                height: 40,
                                color: 'text.disabled',
                                mx: 'auto',
                                mb: 2,
                              }}
                            />
                            <Typography
                              variant='body1'
                              sx={{ color: 'text.secondary' }}
                            >
                              暂无字典项
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDictItems.map((item) => (
                          <TableRow
                            key={item.id}
                            hover
                          >
                            <TableCell>{item.sort_order}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontFamily: 'monospace' }}>
                                {item.item_code}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{item.item_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.item_value}
                                size='small'
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={item.status}
                                label={item.status === 'active' ? '启用' : '禁用'}
                                color={item.status === 'active' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography
                                sx={{
                                  color: 'text.secondary',
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.remark || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align='center'>
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title='编辑'>
                                  <IconButton
                                    size='small'
                                    color='primary'
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Edit size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={item.status === 'active' ? '禁用' : '启用'}>
                                  <IconButton
                                    size='small'
                                    color={item.status === 'active' ? 'warning' : 'success'}
                                    onClick={() => handleToggleItemStatus(item)}
                                  >
                                    {item.status === 'active' ? (
                                      <X size={16} />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='删除'>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <Box sx={{ py: 12, textAlign: 'center' }}>
              <Settings sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }} />
              <Typography
                variant='body1'
                sx={{ color: 'text.secondary' }}
              >
                请从左侧选择一个字典类型
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          resetTypeForm();
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} />
            {editingType ? '编辑字典类型' : '新增字典类型'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size='small'
              label='字典编码 *'
              value={newType.dict_code}
              onChange={(e) => setNewType((prev) => ({ ...prev, dict_code: e.target.value }))}
              placeholder='如: voucher_type'
              disabled={!!editingType}
            />
            <TextField
              size='small'
              label='字典名称 *'
              value={newType.dict_name}
              onChange={(e) => setNewType((prev) => ({ ...prev, dict_name: e.target.value }))}
              placeholder='如: 凭证类型'
            />
            <TextField
              size='small'
              label='描述'
              multiline
              rows={2}
              value={newType.description}
              onChange={(e) => setNewType((prev) => ({ ...prev, description: e.target.value }))}
              placeholder='字典类型描述'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newType.status === 'active'}
                  onChange={(e) =>
                    setNewType((prev) => ({
                      ...prev,
                      status: e.target.checked ? 'active' : 'inactive',
                    }))
                  }
                />
              }
              label={newType.status === 'active' ? '启用' : '禁用'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowTypeModal(false);
              resetTypeForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={editingType ? handleUpdateType : handleCreateType}
          >
            {editingType ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          resetItemForm();
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} />
            {editingItem ? '编辑字典项' : '新增字典项'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                label='项目编码 *'
                value={newItem.item_code}
                onChange={(e) => setNewItem((prev) => ({ ...prev, item_code: e.target.value }))}
                placeholder='项目编码'
                disabled={!!editingItem}
              />
              <TextField
                size='small'
                label='项目名称 *'
                value={newItem.item_name}
                onChange={(e) => setNewItem((prev) => ({ ...prev, item_name: e.target.value }))}
                placeholder='项目名称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                size='small'
                label='项目值'
                value={newItem.item_value}
                onChange={(e) => setNewItem((prev) => ({ ...prev, item_value: e.target.value }))}
                placeholder='项目值'
              />
              <TextField
                size='small'
                label='排序'
                type='number'
                value={newItem.sort_order}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </Box>
            <TextField
              size='small'
              label='备注'
              multiline
              rows={2}
              value={newItem.remark}
              onChange={(e) => setNewItem((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder='备注说明'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newItem.status === 'active'}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      status: e.target.checked ? 'active' : 'inactive',
                    }))
                  }
                />
              }
              label={newItem.status === 'active' ? '启用' : '禁用'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowItemModal(false);
              resetItemForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={editingItem ? handleUpdateItem : handleCreateItem}
          >
            {editingItem ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteTypeDialogOpen}
        onClose={() => {
          setDeleteTypeDialogOpen(false);
          setDeletingTypeId(null);
        }}
        onConfirm={confirmDeleteType}
        title='确认删除'
        message='确定要删除该字典类型吗？删除后所有关联的字典项也将被删除，此操作不可撤销。'
        danger
      />

      <ConfirmDialog
        isOpen={deleteItemDialogOpen}
        onClose={() => {
          setDeleteItemDialogOpen(false);
          setDeletingItemId(null);
        }}
        onConfirm={confirmDeleteItem}
        title='确认删除'
        message='确定要删除该字典项吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default DictManagementPage;
