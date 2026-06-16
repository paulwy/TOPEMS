/**
 * FinanceAssetPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Download,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Stack,
} from "@mui/material";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value: number;
  usage_status: string;
}

// ============ Mock 数据 ============
const mockAssetData: Asset[] = [
  { id: "1", asset_code: "A001", asset_name: "生产设备A", asset_category: "生产设备", original_value: 500000, accumulated_depreciation: 150000, net_value: 350000, usage_status: "使用中" },
  { id: "2", asset_code: "A002", asset_name: "办公电脑", asset_category: "办公设备", original_value: 30000, accumulated_depreciation: 18000, net_value: 12000, usage_status: "使用中" },
  { id: "3", asset_code: "A003", asset_name: "运输车辆", asset_category: "运输设备", original_value: 200000, accumulated_depreciation: 80000, net_value: 120000, usage_status: "使用中" },
  { id: "4", asset_code: "A004", asset_name: "厂房建筑", asset_category: "房屋建筑", original_value: 2000000, accumulated_depreciation: 400000, net_value: 1600000, usage_status: "使用中" },
  { id: "5", asset_code: "A005", asset_name: "检测仪器", asset_category: "检测设备", original_value: 150000, accumulated_depreciation: 45000, net_value: 105000, usage_status: "闲置" },
  { id: "6", asset_code: "A006", asset_name: "空调系统", asset_category: "办公设备", original_value: 80000, accumulated_depreciation: 32000, net_value: 48000, usage_status: "使用中" },
  { id: "7", asset_code: "A007", asset_name: "旧打印机", asset_category: "办公设备", original_value: 5000, accumulated_depreciation: 5000, net_value: 0, usage_status: "已报废" },
  { id: "8", asset_code: "A008", asset_name: "研发设备", asset_category: "研发设备", original_value: 800000, accumulated_depreciation: 160000, net_value: 640000, usage_status: "使用中" },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusColor = (status: string) => {
  const colors: Record<string, "success" | "warning" | "error" | "default"> = {
    "使用中": "success",
    "闲置": "warning",
    "已报废": "error",
  };
  return colors[status] || "default";
};

// ============ 列定义 ============
const getAssetColumns = (
  onDepreciation: (asset: Asset) => void,
  onEdit: (asset: Asset) => void,
  onScrap: (asset: Asset) => void,
  onDelete: (id: string) => void,
): ColumnDef<Asset>[] => [
  {
    id: "asset_code",
    header: "资产编号",
    accessor: "asset_code",
    render: (value) => (
      <Box sx={{ fontWeight: 600, color: "success.main" }}>{value}</Box>
    ),
  },
  {
    id: "asset_name",
    header: "资产名称",
    accessor: "asset_name",
    render: (value) => <Box sx={{ fontWeight: 500 }}>{value}</Box>,
  },
  {
    id: "asset_category",
    header: "资产类别",
    accessor: "asset_category",
    render: (value) => <Chip label={value} size="small" />,
  },
  {
    id: "original_value",
    header: "原值",
    accessor: "original_value",
    render: (value) => (
      <Box sx={{ fontFamily: "monospace" }}>{formatCurrency(value)}</Box>
    ),
  },
  {
    id: "accumulated_depreciation",
    header: "累计折旧",
    accessor: "accumulated_depreciation",
    render: (value) => (
      <Box sx={{ color: "warning.main", fontFamily: "monospace" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "net_value",
    header: "净值",
    accessor: "net_value",
    render: (value) => (
      <Box sx={{ fontWeight: 700, color: "primary.main", fontFamily: "monospace" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "usage_status",
    header: "使用状态",
    accessor: "usage_status",
    render: (value) => (
      <Chip label={value} size="small" color={getStatusColor(value)} />
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onDepreciation: (asset: Asset) => void,
  onEdit: (asset: Asset) => void,
  onScrap: (asset: Asset) => void,
  onDelete: (id: string) => void,
): RowAction<Asset>[] => [
  {
    label: "计提折旧",
    icon: <Calculator style={{ width: 16, height: 16 }} />,
    onClick: onDepreciation,
    color: "success",
  },
  {
    label: "编辑",
    icon: <Edit2 style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "报废",
    icon: <AlertTriangle style={{ width: 16, height: 16 }} />,
    onClick: onScrap,
    color: "warning",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (asset) => onDelete(asset.id),
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索资产编号、名称...",
  },
  {
    id: "asset_category",
    label: "资产类别",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "生产设备", label: "生产设备" },
      { value: "办公设备", label: "办公设备" },
      { value: "运输设备", label: "运输设备" },
      { value: "房屋建筑", label: "房屋建筑" },
      { value: "研发设备", label: "研发设备" },
      { value: "检测设备", label: "检测设备" },
    ],
  },
  {
    id: "usage_status",
    label: "使用状态",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "使用中", label: "使用中" },
      { value: "闲置", label: "闲置" },
      { value: "已报废", label: "已报废" },
    ],
  },
];

// ============ 组件 ============
const FinanceAssetPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assetData, setAssetData] = useState<Asset[]>(mockAssetData);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [newAsset, setNewAsset] = useState({
    asset_code: "",
    asset_name: "",
    asset_category: "",
    original_value: 0,
    usage_status: "使用中",
  });

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return assetData.filter((asset) => {
      const matchesSearch =
        !searchText ||
        asset.asset_code.toLowerCase().includes(searchText.toLowerCase()) ||
        asset.asset_name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = !filterCategory || asset.asset_category === filterCategory;
      const matchesStatus = !filterStatus || asset.usage_status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assetData, searchText, filterCategory, filterStatus]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "asset_category") setFilterCategory(value);
      if (filterId === "usage_status") setFilterStatus(value);
    },
    [],
  );

  // 处理创建
  const handleCreate = useCallback(() => {
    const newEntry: Asset = {
      id: String(assetData.length + 1),
      ...newAsset,
      accumulated_depreciation: 0,
      net_value: newAsset.original_value,
    };
    setAssetData([...assetData, newEntry]);
    addNotification({ title: "成功", message: "资产新增成功", type: "success" });
    setShowCreateModal(false);
    setNewAsset({ asset_code: "", asset_name: "", asset_category: "", original_value: 0, usage_status: "使用中" });
  }, [assetData, newAsset, addNotification]);

  // 处理编辑
  const handleEdit = useCallback((asset: Asset) => {
    setEditingAsset({ ...asset });
  }, []);

  // 处理更新
  const handleUpdate = useCallback(() => {
    if (!editingAsset) return;
    setAssetData(assetData.map(a => a.id === editingAsset.id ? editingAsset : a));
    addNotification({ title: "成功", message: "资产更新成功", type: "success" });
    setEditingAsset(null);
  }, [assetData, editingAsset, addNotification]);

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    if (!confirm("确定要删除该资产吗？")) return;
    setAssetData(assetData.filter(a => a.id !== id));
    addNotification({ title: "成功", message: "资产删除成功", type: "success" });
  }, [assetData, addNotification]);

  // 处理折旧
  const handleDepreciation = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setShowDepreciationModal(true);
  }, []);

  // 确认折旧
  const confirmDepreciation = useCallback(() => {
    if (!selectedAsset) return;
    const depreciation = selectedAsset.original_value * 0.1;
    const newAccumulated = selectedAsset.accumulated_depreciation + depreciation;
    const newNetValue = selectedAsset.original_value - newAccumulated;
    
    setAssetData(assetData.map(a => 
      a.id === selectedAsset.id 
        ? { ...a, accumulated_depreciation: newAccumulated, net_value: Math.max(0, newNetValue) }
        : a
    ));
    addNotification({ title: "成功", message: "计提折旧完成", type: "success" });
    setShowDepreciationModal(false);
  }, [assetData, selectedAsset, addNotification]);

  // 处理报废
  const handleScrap = useCallback((asset: Asset) => {
    if (!confirm(`确定要报废资产 "${asset.asset_name}" 吗？`)) return;
    setAssetData(assetData.map(a => 
      a.id === asset.id ? { ...a, usage_status: "已报废", net_value: 0 } : a
    ));
    addNotification({ title: "成功", message: "资产已报废", type: "success" });
  }, [assetData, addNotification]);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "资产数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="资产管理"
        subtitle="管理企业固定资产，计提折旧和处理报废"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={handleExport}
              sx={{ borderColor: "#22c55e", color: "#22c55e" }}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
              sx={{ backgroundColor: "#22c55e" }}
            >
              新增资产
            </Button>
          </Box>
        }
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <ListPageTemplate
          columns={getAssetColumns(handleDepreciation, handleEdit, handleScrap, handleDelete)}
          data={filteredData}
          rowActions={getRowActions(handleDepreciation, handleEdit, handleScrap, handleDelete)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchPlaceholder="搜索资产编号、名称..."
          emptyMessage="暂无资产数据"
        />
      </Box>

      {/* 新增对话框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增资产</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="资产编号 *" fullWidth value={newAsset.asset_code} onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })} />
              <TextField label="资产名称 *" fullWidth value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>资产类别</InputLabel>
                <Select value={newAsset.asset_category} label="资产类别" onChange={(e) => setNewAsset({ ...newAsset, asset_category: e.target.value })}>
                  <MenuItem value="">请选择</MenuItem>
                  <MenuItem value="生产设备">生产设备</MenuItem>
                  <MenuItem value="办公设备">办公设备</MenuItem>
                  <MenuItem value="运输设备">运输设备</MenuItem>
                  <MenuItem value="房屋建筑">房屋建筑</MenuItem>
                  <MenuItem value="研发设备">研发设备</MenuItem>
                  <MenuItem value="检测设备">检测设备</MenuItem>
                </Select>
              </FormControl>
              <TextField label="原值 *" type="number" fullWidth value={newAsset.original_value} onChange={(e) => setNewAsset({ ...newAsset, original_value: parseFloat(e.target.value) || 0 })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor: "#22c55e" }}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={!!editingAsset} onClose={() => setEditingAsset(null)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑资产</DialogTitle>
        <DialogContent>
          {editingAsset && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Stack direction="row" spacing={2}>
                <TextField label="资产编号" fullWidth value={editingAsset.asset_code} slotProps={{ input: { readOnly: true } }} />
                <TextField label="资产名称" fullWidth value={editingAsset.asset_name} onChange={(e) => setEditingAsset({ ...editingAsset, asset_name: e.target.value })} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>资产类别</InputLabel>
                  <Select value={editingAsset.asset_category} label="资产类别" onChange={(e) => setEditingAsset({ ...editingAsset, asset_category: e.target.value })}>
                    <MenuItem value="生产设备">生产设备</MenuItem>
                    <MenuItem value="办公设备">办公设备</MenuItem>
                    <MenuItem value="运输设备">运输设备</MenuItem>
                    <MenuItem value="房屋建筑">房屋建筑</MenuItem>
                    <MenuItem value="研发设备">研发设备</MenuItem>
                    <MenuItem value="检测设备">检测设备</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="使用状态" fullWidth value={editingAsset.usage_status} onChange={(e) => setEditingAsset({ ...editingAsset, usage_status: e.target.value })} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAsset(null)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate} sx={{ backgroundColor: "#22c55e" }}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 折旧对话框 */}
      <Dialog open={showDepreciationModal} onClose={() => setShowDepreciationModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>计提折旧</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">资产名称</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedAsset.asset_name}</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">原值</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedAsset.original_value)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">当前累计折旧</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedAsset.accumulated_depreciation)}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">本次计提折旧（10%）</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                  {formatCurrency(selectedAsset.original_value * 0.1)}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDepreciationModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmDepreciation}>确认计提</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceAssetPageRefactored;
