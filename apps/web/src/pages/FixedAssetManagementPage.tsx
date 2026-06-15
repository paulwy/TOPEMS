/**
 * 固定资产管理页面
 * 管理企业固定资产信息，包括折旧跟踪和会计集成
 */

import React, { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Building,
  Calculator,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

/** 资产状态配置 */
const STATUS_CONFIG: Record<string, { label: string; sx: object }> = {
  normal: { label: "正常", sx: { bgcolor: "success.main", color: "white" } },
  disposed: { label: "已处置", sx: { bgcolor: "grey.500", color: "white" } },
  impaired: { label: "减值", sx: { bgcolor: "warning.main", color: "white" } },
  scrapped: { label: "报废", sx: { bgcolor: "error.main", color: "white" } },
};

/** 折旧方法配置 */
const DEPRECIATION_METHOD_CONFIG: Record<
  string,
  { label: string; sx: object }
> = {
  straight_line: { label: "直线法", sx: { bgcolor: "primary.main", color: "white" } },
  declining_balance: {
    label: "双倍余额递减",
    sx: { bgcolor: "secondary.main", color: "white" },
  },
  sum_of_years: { label: "年数总和法", sx: { bgcolor: "info.main", color: "white" } },
  units_of_production: {
    label: "工作量法",
    sx: { bgcolor: "warning.main", color: "white" },
  },
};

/** 资产类别配置 */
const ASSET_CATEGORY_CONFIG: Record<string, { label: string; sx: object }> =
  {
    building: { label: "房屋建筑物", sx: { bgcolor: "indigo.100", color: "indigo.800" } },
    vehicle: { label: "运输设备", sx: { bgcolor: "cyan.100", color: "cyan.800" } },
    equipment: { label: "生产设备", sx: { bgcolor: "emerald.100", color: "emerald.800" } },
    office: { label: "办公设备", sx: { bgcolor: "amber.100", color: "amber.800" } },
    electronic: { label: "电子设备", sx: { bgcolor: "rose.100", color: "rose.800" } },
    other: { label: "其他", sx: { bgcolor: "grey.100", color: "grey.800" } },
  };

interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  specification?: string;
  location?: string;
  acquisition_date: string;
  useful_life: number;
  depreciation_method: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value: number;
  impairment_loss: number;
  residual_value: number;
  depreciation_status: string;
  status: string;
  account_id?: string;
  account_name?: string;
  department_id?: string;
  department_name?: string;
  project_id?: string;
  project_name?: string;
  description?: string;
  created_at: string;
}

interface FixedAssetFormData {
  asset_code: string;
  asset_name: string;
  category: string;
  specification?: string;
  location?: string;
  acquisition_date: string;
  useful_life: number;
  depreciation_method: string;
  original_value: number;
  residual_value: number;
  depreciation_status: string;
  status: string;
  account_id?: string;
  department_id?: string;
  project_id?: string;
  description?: string;
}

// 模拟数据
const mockFixedAssets: FixedAsset[] = [
  {
    id: "1",
    asset_code: "FA-2024-001",
    asset_name: "办公楼",
    category: "building",
    specification: "钢筋混凝土结构",
    location: "北京总部大厦18层",
    acquisition_date: "2020-01-15",
    useful_life: 30,
    depreciation_method: "straight_line",
    original_value: 50000000,
    accumulated_depreciation: 8333333.33,
    net_value: 41666666.67,
    impairment_loss: 0,
    residual_value: 2500000,
    depreciation_status: "depreciating",
    status: "normal",
    department_id: "D001",
    department_name: "行政部",
    description: "北京总部办公楼",
    created_at: "2020-01-15",
  },
  {
    id: "2",
    asset_code: "FA-2024-002",
    asset_name: "奥迪A6L轿车",
    category: "vehicle",
    specification: "2023款 45 TFSI quattro",
    location: "北京总部地下车库",
    acquisition_date: "2023-06-20",
    useful_life: 5,
    depreciation_method: "straight_line",
    original_value: 450000,
    accumulated_depreciation: 67500,
    net_value: 382500,
    impairment_loss: 0,
    residual_value: 22500,
    depreciation_status: "depreciating",
    status: "normal",
    department_id: "D002",
    department_name: "销售部",
    project_id: "P001",
    project_name: "市场拓展项目",
    description: "商务接待用车",
    created_at: "2023-06-20",
  },
  {
    id: "3",
    asset_code: "FA-2024-003",
    asset_name: "Dell服务器",
    category: "equipment",
    specification: "PowerEdge R740",
    location: "北京数据中心",
    acquisition_date: "2022-03-10",
    useful_life: 5,
    depreciation_method: "declining_balance",
    original_value: 120000,
    accumulated_depreciation: 69120,
    net_value: 50880,
    impairment_loss: 0,
    residual_value: 6000,
    depreciation_status: "depreciating",
    status: "normal",
    department_id: "D003",
    department_name: "IT部",
    description: "核心业务服务器",
    created_at: "2022-03-10",
  },
  {
    id: "4",
    asset_code: "FA-2024-004",
    asset_name: "ThinkPad X1笔记本",
    category: "electronic",
    specification: "Carbon Gen 11",
    location: "北京总部",
    acquisition_date: "2023-09-01",
    useful_life: 3,
    depreciation_method: "straight_line",
    original_value: 15000,
    accumulated_depreciation: 3750,
    net_value: 11250,
    impairment_loss: 0,
    residual_value: 750,
    depreciation_status: "depreciating",
    status: "normal",
    department_id: "D004",
    department_name: "财务部",
    description: "财务人员办公电脑",
    created_at: "2023-09-01",
  },
];

export default function FixedAssetManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fixedAssets] = useState<FixedAsset[]>(mockFixedAssets);

  // 过滤后的数据
  const filteredAssets = fixedAssets.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.department_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ??
        false);

    const matchesCategory =
      categoryFilter === "all" || asset.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 表格列定义 - 使用 any 类型简化
  const columns: any[] = [
    {
      id: "asset_code",
      header: "资产编号",
      accessorKey: "asset_code",
      cell: ({ row }: { row: FixedAsset }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Building size={16} style={{ color: "grey" }} />
          <Typography sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{row.asset_code}</Typography>
        </Box>
      ),
    },
    {
      id: "asset_name",
      header: "资产名称",
      accessorKey: "asset_name",
    },
    {
      id: "category",
      header: "资产类别",
      accessorKey: "category",
      cell: ({ row }: { row: FixedAsset }) => {
        const config = ASSET_CATEGORY_CONFIG[row.category] || {
          label: row.category,
          sx: { bgcolor: "grey.100", color: "grey.800" },
        };
        return <Chip label={config.label} size="small" sx={config.sx} />;
      },
    },
    {
      id: "original_value",
      header: "原值",
      accessorKey: "original_value",
      cell: ({ row }: { row: FixedAsset }) => (
        <Typography sx={{ fontFamily: "monospace", textAlign: "right" }}>
          ¥
          {row.original_value.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      id: "accumulated_depreciation",
      header: "累计折旧",
      accessorKey: "accumulated_depreciation",
      cell: ({ row }: { row: FixedAsset }) => (
        <Typography sx={{ fontFamily: "monospace", textAlign: "right", color: "warning.main" }}>
          ¥
          {row.accumulated_depreciation.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      id: "net_value",
      header: "净值",
      accessorKey: "net_value",
      cell: ({ row }: { row: FixedAsset }) => (
        <Typography sx={{ fontFamily: "monospace", textAlign: "right", fontWeight: 500 }}>
          ¥
          {row.net_value.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      id: "depreciation_method",
      header: "折旧方法",
      accessorKey: "depreciation_method",
      cell: ({ row }: { row: FixedAsset }) => {
        const config = DEPRECIATION_METHOD_CONFIG[row.depreciation_method] || {
          label: row.depreciation_method,
          sx: { bgcolor: "grey.100", color: "grey.800" },
        };
        return <Chip label={config.label} size="small" sx={config.sx} />;
      },
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }: { row: FixedAsset }) => {
        const config = STATUS_CONFIG[row.status] || {
          label: row.status,
          sx: { bgcolor: "grey.100", color: "grey.800" },
        };
        return <Chip label={config.label} size="small" sx={config.sx} />;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }: { row: FixedAsset }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setSelectedAsset(row);
              setIsEditing(true);
            }}
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => setDeletingId(row.id)}
            color="error"
          >
            <Trash2 size={16} />
          </Button>
        </Box>
      ),
    },
  ];

  // 计算统计数据
  const totalOriginalValue = fixedAssets.reduce(
    (sum, a) => sum + a.original_value,
    0,
  );
  const totalAccumulatedDepreciation = fixedAssets.reduce(
    (sum, a) => sum + a.accumulated_depreciation,
    0,
  );
  const totalNetValue = fixedAssets.reduce((sum, a) => sum + a.net_value, 0);

  // 处理创建
  const handleCreate = (data: FixedAssetFormData) => {
    console.log("创建固定资产:", data);
    setIsCreating(false);
  };

  // 处理更新
  const handleUpdate = (data: FixedAssetFormData) => {
    if (!selectedAsset) return;
    console.log("更新固定资产:", selectedAsset.id, data);
    setIsEditing(false);
    setSelectedAsset(null);
  };

  // 处理删除
  const handleDelete = () => {
    if (!deletingId) return;
    console.log("删除固定资产:", deletingId);
    setDeletingId(null);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* 头部 */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: "indigo.600", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building size={24} style={{ color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                固定资产管理
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: "grey.500" }}>
                管理企业固定资产及折旧信息
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            onClick={() => {
              setSelectedAsset(null);
              setIsCreating(true);
            }}
          >
            <Plus size={16} style={{ marginRight: 8 }} />
            新增资产
          </Button>
        </Box>

        {/* 统计卡片 */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, md: 4 }, gap: 2 }}>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "blue.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building size={20} style={{ color: "blue[600]" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "blue.600" }}>
                    {fixedAssets.length}
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.500" }}>资产总数</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "green.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign size={20} style={{ color: "green[600]" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "green.600" }}>
                    ¥{(totalOriginalValue / 10000).toFixed(0)}万
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.500" }}>资产原值</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "orange.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingDown size={20} style={{ color: "orange[600]" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "orange.600" }}>
                    ¥{(totalAccumulatedDepreciation / 10000).toFixed(0)}万
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.500" }}>累计折旧</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "indigo.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calculator size={20} style={{ color: "indigo[600]" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "indigo.600" }}>
                    ¥{(totalNetValue / 10000).toFixed(0)}万
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.500" }}>资产净值</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  placeholder="搜索资产名称、编号或部门..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <Search size={16} style={{ color: "grey", marginRight: 8 }} /> }}
                />
              </Box>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>资产类别</InputLabel>
                <Select
                  value={categoryFilter}
                  label="资产类别"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">全部类别</MenuItem>
                  <MenuItem value="building">房屋建筑物</MenuItem>
                  <MenuItem value="vehicle">运输设备</MenuItem>
                  <MenuItem value="equipment">生产设备</MenuItem>
                  <MenuItem value="office">办公设备</MenuItem>
                  <MenuItem value="electronic">电子设备</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>资产状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="资产状态"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">全部状态</MenuItem>
                  <MenuItem value="normal">正常</MenuItem>
                  <MenuItem value="disposed">已处置</MenuItem>
                  <MenuItem value="impaired">减值</MenuItem>
                  <MenuItem value="scrapped">报废</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 资产列表 */}
        <Card>
          <CardHeader title="固定资产列表" subheader={`共 ${filteredAssets.length} 项资产`} />
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredAssets}
              searchPlaceholder="搜索资产..."
            />
          </CardContent>
        </Card>
      </Box>

      {/* 创建/编辑侧边栏 */}
      <Drawer
        anchor="right"
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
          setSelectedAsset(null);
        }}
      >
        <Box sx={{ width: 500, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {isCreating ? "新增固定资产" : "编辑固定资产"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isCreating
              ? "创建新的固定资产记录"
              : `编辑资产: ${selectedAsset?.asset_name}`}
          </Typography>
          <FixedAssetForm
            asset={selectedAsset}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAsset(null);
            }}
          />
        </Box>
      </Drawer>

      {/* 删除确认对话框 */}
      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除该固定资产吗？此操作不可恢复。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** 固定资产表单组件 */
interface FixedAssetFormProps {
  asset: FixedAsset | null;
  onSubmit: (data: FixedAssetFormData) => void;
  onCancel: () => void;
}

function FixedAssetForm({ asset, onSubmit, onCancel }: FixedAssetFormProps) {
  const [formData, setFormData] = useState<FixedAssetFormData>({
    asset_code: asset?.asset_code || "",
    asset_name: asset?.asset_name || "",
    category: asset?.category || "equipment",
    specification: asset?.specification || "",
    location: asset?.location || "",
    acquisition_date: asset?.acquisition_date || "",
    useful_life: asset?.useful_life || 5,
    depreciation_method: asset?.depreciation_method || "straight_line",
    original_value: asset?.original_value || 0,
    residual_value: asset?.residual_value || 0,
    depreciation_status: asset?.depreciation_status || "depreciating",
    status: asset?.status || "normal",
    account_id: asset?.account_id || "",
    department_id: asset?.department_id || "",
    project_id: asset?.project_id || "",
    description: asset?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="资产编号"
            value={formData.asset_code}
            onChange={(e) =>
              setFormData({ ...formData, asset_code: e.target.value })
            }
            placeholder="例如：FA-2024-001"
            required
            fullWidth
            size="small"
          />
          <TextField
            label="资产名称"
            value={formData.asset_name}
            onChange={(e) =>
              setFormData({ ...formData, asset_name: e.target.value })
            }
            placeholder="请输入资产名称"
            required
            fullWidth
            size="small"
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <FormControl size="small" fullWidth required>
            <InputLabel>资产类别</InputLabel>
            <Select
              value={formData.category}
              label="资产类别"
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              <MenuItem value="building">房屋建筑物</MenuItem>
              <MenuItem value="vehicle">运输设备</MenuItem>
              <MenuItem value="equipment">生产设备</MenuItem>
              <MenuItem value="office">办公设备</MenuItem>
              <MenuItem value="electronic">电子设备</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth required>
            <InputLabel>资产状态</InputLabel>
            <Select
              value={formData.status}
              label="资产状态"
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <MenuItem value="normal">正常</MenuItem>
              <MenuItem value="disposed">已处置</MenuItem>
              <MenuItem value="impaired">减值</MenuItem>
              <MenuItem value="scrapped">报废</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="规格型号"
          value={formData.specification || ""}
          onChange={(e) =>
            setFormData({ ...formData, specification: e.target.value })
          }
          placeholder="请输入规格型号"
          fullWidth
          size="small"
        />

        <TextField
          label="存放地点"
          value={formData.location || ""}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
          placeholder="请输入资产存放地点"
          fullWidth
          size="small"
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="购置日期"
            type="date"
            value={formData.acquisition_date}
            onChange={(e) =>
              setFormData({ ...formData, acquisition_date: e.target.value })
            }
            required
            fullWidth
            size="small"
            LabelProps={{ shrink: true }}
          />
          <TextField
            label="使用寿命（年）"
            type="number"
            value={formData.useful_life}
            onChange={(e) =>
              setFormData({
                ...formData,
                useful_life: parseInt(e.target.value) || 0,
              })
            }
            fullWidth
            size="small"
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Stack>

        <Stack direction="row" spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>折旧方法</InputLabel>
            <Select
              value={formData.depreciation_method}
              label="折旧方法"
              onChange={(e) =>
                setFormData({ ...formData, depreciation_method: e.target.value })
              }
            >
              <MenuItem value="straight_line">直线法</MenuItem>
              <MenuItem value="declining_balance">双倍余额递减法</MenuItem>
              <MenuItem value="sum_of_years">年数总和法</MenuItem>
              <MenuItem value="units_of_production">工作量法</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>折旧状态</InputLabel>
            <Select
              value={formData.depreciation_status}
              label="折旧状态"
              onChange={(e) =>
                setFormData({ ...formData, depreciation_status: e.target.value })
              }
            >
              <MenuItem value="not_started">未开始</MenuItem>
              <MenuItem value="depreciating">折旧中</MenuItem>
              <MenuItem value="completed">已提足</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField
            label="原值"
            type="number"
            value={formData.original_value}
            onChange={(e) =>
              setFormData({
                ...formData,
                original_value: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            required
            fullWidth
            size="small"
            InputProps={{ inputProps: { min: 0, step: 0.01 } }}
          />
          <TextField
            label="残值"
            type="number"
            value={formData.residual_value}
            onChange={(e) =>
              setFormData({
                ...formData,
                residual_value: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            fullWidth
            size="small"
            InputProps={{ inputProps: { min: 0, step: 0.01 } }}
          />
        </Stack>

        <TextField
          label="备注"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="可选描述信息"
          fullWidth
          size="small"
          multiline
          rows={2}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end", mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Button type="button" variant="outlined" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="contained">保存</Button>
      </Stack>
    </Box>
  );
}
