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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

/** 资产状态配置 */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  normal: { label: "正常", color: "bg-green-100 text-green-800" },
  disposed: { label: "已处置", color: "bg-gray-100 text-gray-800" },
  impaired: { label: "减值", color: "bg-orange-100 text-orange-800" },
  scrapped: { label: "报废", color: "bg-red-100 text-red-800" },
};

/** 折旧方法配置 */
const DEPRECIATION_METHOD_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  straight_line: { label: "直线法", color: "bg-blue-100 text-blue-800" },
  declining_balance: {
    label: "双倍余额递减",
    color: "bg-purple-100 text-purple-800",
  },
  sum_of_years: { label: "年数总和法", color: "bg-teal-100 text-teal-800" },
  units_of_production: {
    label: "工作量法",
    color: "bg-orange-100 text-orange-800",
  },
};

/** 资产类别配置 */
const ASSET_CATEGORY_CONFIG: Record<string, { label: string; color: string }> =
  {
    building: { label: "房屋建筑物", color: "bg-indigo-100 text-indigo-800" },
    vehicle: { label: "运输设备", color: "bg-cyan-100 text-cyan-800" },
    equipment: { label: "生产设备", color: "bg-emerald-100 text-emerald-800" },
    office: { label: "办公设备", color: "bg-amber-100 text-amber-800" },
    electronic: { label: "电子设备", color: "bg-rose-100 text-rose-800" },
    other: { label: "其他", color: "bg-slate-100 text-slate-800" },
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
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm">{row.asset_code}</span>
        </div>
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
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "original_value",
      header: "原值",
      accessorKey: "original_value",
      cell: ({ row }: { row: FixedAsset }) => (
        <span className="font-mono text-right">
          ¥
          {row.original_value.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "accumulated_depreciation",
      header: "累计折旧",
      accessorKey: "accumulated_depreciation",
      cell: ({ row }: { row: FixedAsset }) => (
        <span className="font-mono text-right text-orange-600">
          ¥
          {row.accumulated_depreciation.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "net_value",
      header: "净值",
      accessorKey: "net_value",
      cell: ({ row }: { row: FixedAsset }) => (
        <span className="font-mono text-right font-medium">
          ¥
          {row.net_value.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "depreciation_method",
      header: "折旧方法",
      accessorKey: "depreciation_method",
      cell: ({ row }: { row: FixedAsset }) => {
        const config = DEPRECIATION_METHOD_CONFIG[row.depreciation_method] || {
          label: row.depreciation_method,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }: { row: FixedAsset }) => {
        const config = STATUS_CONFIG[row.status] || {
          label: row.status,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }: { row: FixedAsset }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedAsset(row);
              setIsEditing(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingId(row.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">固定资产管理</h1>
              <p className="text-sm text-gray-500">
                管理企业固定资产及折旧信息
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedAsset(null);
              setIsCreating(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新增资产
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {fixedAssets.length}
                  </div>
                  <p className="text-sm text-gray-500">资产总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{(totalOriginalValue / 10000).toFixed(0)}万
                  </div>
                  <p className="text-sm text-gray-500">资产原值</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    ¥{(totalAccumulatedDepreciation / 10000).toFixed(0)}万
                  </div>
                  <p className="text-sm text-gray-500">累计折旧</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    ¥{(totalNetValue / 10000).toFixed(0)}万
                  </div>
                  <p className="text-sm text-gray-500">资产净值</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索资产名称、编号或部门..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="资产类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  <SelectItem value="building">房屋建筑物</SelectItem>
                  <SelectItem value="vehicle">运输设备</SelectItem>
                  <SelectItem value="equipment">生产设备</SelectItem>
                  <SelectItem value="office">办公设备</SelectItem>
                  <SelectItem value="electronic">电子设备</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="资产状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="disposed">已处置</SelectItem>
                  <SelectItem value="impaired">减值</SelectItem>
                  <SelectItem value="scrapped">报废</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 资产列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>固定资产列表</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>共 {filteredAssets.length} 项资产</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredAssets}
              searchPlaceholder="搜索资产..."
            />
          </CardContent>
        </Card>
      </div>

      {/* 创建/编辑侧边栏 */}
      <Sheet
        open={isCreating || isEditing}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedAsset(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>
              {isCreating ? "新增固定资产" : "编辑固定资产"}
            </SheetTitle>
            <SheetDescription>
              {isCreating
                ? "创建新的固定资产记录"
                : `编辑资产: ${selectedAsset?.asset_name}`}
            </SheetDescription>
          </SheetHeader>
          <FixedAssetForm
            asset={selectedAsset}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAsset(null);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open: boolean) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该固定资产吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              资产编号 <span className="text-red-600">*</span>
            </label>
            <Input
              value={formData.asset_code}
              onChange={(e) =>
                setFormData({ ...formData, asset_code: e.target.value })
              }
              placeholder="例如：FA-2024-001"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              资产名称 <span className="text-red-600">*</span>
            </label>
            <Input
              value={formData.asset_name}
              onChange={(e) =>
                setFormData({ ...formData, asset_name: e.target.value })
              }
              placeholder="请输入资产名称"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              资产类别 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building">房屋建筑物</SelectItem>
                <SelectItem value="vehicle">运输设备</SelectItem>
                <SelectItem value="equipment">生产设备</SelectItem>
                <SelectItem value="office">办公设备</SelectItem>
                <SelectItem value="electronic">电子设备</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              资产状态 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="disposed">已处置</SelectItem>
                <SelectItem value="impaired">减值</SelectItem>
                <SelectItem value="scrapped">报废</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            规格型号
          </label>
          <Input
            value={formData.specification || ""}
            onChange={(e) =>
              setFormData({ ...formData, specification: e.target.value })
            }
            placeholder="请输入规格型号"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            存放地点
          </label>
          <Input
            value={formData.location || ""}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="请输入资产存放地点"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              购置日期 <span className="text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={formData.acquisition_date}
              onChange={(e) =>
                setFormData({ ...formData, acquisition_date: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              使用寿命（年）
            </label>
            <Input
              type="number"
              value={formData.useful_life}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  useful_life: parseInt(e.target.value) || 0,
                })
              }
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              折旧方法
            </label>
            <Select
              value={formData.depreciation_method}
              onValueChange={(value) =>
                setFormData({ ...formData, depreciation_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight_line">直线法</SelectItem>
                <SelectItem value="declining_balance">
                  双倍余额递减法
                </SelectItem>
                <SelectItem value="sum_of_years">年数总和法</SelectItem>
                <SelectItem value="units_of_production">工作量法</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              折旧状态
            </label>
            <Select
              value={formData.depreciation_status}
              onValueChange={(value) =>
                setFormData({ ...formData, depreciation_status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">未开始</SelectItem>
                <SelectItem value="depreciating">折旧中</SelectItem>
                <SelectItem value="completed">已提足</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              原值 <span className="text-red-600">*</span>
            </label>
            <Input
              type="number"
              value={formData.original_value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  original_value: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              残值
            </label>
            <Input
              type="number"
              value={formData.residual_value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  residual_value: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            备注
          </label>
          <Input
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="可选描述信息"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">保存</Button>
      </div>
    </form>
  );
}
