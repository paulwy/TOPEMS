/**
 * 外部ERP映射管理页面
 * 管理外部ERP系统的数据映射规则
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, RefreshCw, Search, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useErpConnection,
  useAccountMappings,
  useCustomerMappings,
  useSupplierMappings,
  useImportAccountMappings,
  useImportCustomerMappings,
  useImportSupplierMappings,
  useAutoMatchAccountMappings,
  useSyncAccounts,
  useSyncCustomers,
  useSyncSuppliers,
} from "@/hooks/useExternalErp";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// 映射类型配置
const MAPPING_TYPE_CONFIG = {
  account: {
    label: "科目映射",
    localTitle: "本地科目",
    externalTitle: "外部科目",
    icon: "📊",
  },
  customer: {
    label: "客户映射",
    localTitle: "本地客户",
    externalTitle: "外部客户",
    icon: "👥",
  },
  supplier: {
    label: "供应商映射",
    localTitle: "本地供应商",
    externalTitle: "外部供应商",
    icon: "🏭",
  },
  project: {
    label: "项目映射",
    localTitle: "本地项目",
    externalTitle: "外部项目",
    icon: "📁",
  },
  department: {
    label: "部门映射",
    localTitle: "本地部门",
    externalTitle: "外部部门",
    icon: "🏢",
  },
  employee: {
    label: "员工映射",
    localTitle: "本地员工",
    externalTitle: "外部员工",
    icon: "👤",
  },
};

// 科目映射表格列定义
const ACCOUNT_MAPPING_COLUMNS = [
  {
    id: "local_account_code",
    header: "本地科目编码",
    accessorKey: "local_account_code",
    size: 120,
  },
  {
    id: "local_account_name",
    header: "本地科目名称",
    accessorKey: "local_account_name",
    size: 150,
  },
  {
    id: "direction",
    header: "方向",
    accessorKey: "direction",
    size: 100,
    cell: ({ row }: any) => {
      const directionMap: Record<string, { label: string; color: string }> = {
        to_external: { label: "→ 外部", color: "bg-blue-100 text-blue-800" },
        from_external: {
          label: "← 外部",
          color: "bg-green-100 text-green-800",
        },
        bidirectional: {
          label: "↔ 双向",
          color: "bg-purple-100 text-purple-800",
        },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "bg-gray-100 text-gray-800",
      };
      return <Badge className={config.color}>{config.label}</Badge>;
    },
  },
  {
    id: "external_account_code",
    header: "外部科目编码",
    accessorKey: "external_account_code",
    size: 120,
  },
  {
    id: "external_account_name",
    header: "外部科目名称",
    accessorKey: "external_account_name",
    size: 150,
  },
  {
    id: "status",
    header: "状态",
    accessorKey: "is_active",
    size: 80,
    cell: ({ row }: any) =>
      row.is_active ? (
        <Badge className="bg-green-100 text-green-800">启用</Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-800">禁用</Badge>
      ),
  },
];

// 客户映射表格列定义
const CUSTOMER_MAPPING_COLUMNS = [
  {
    id: "local_customer_code",
    header: "本地客户编码",
    accessorKey: "local_customer_code",
    size: 120,
  },
  {
    id: "local_customer_name",
    header: "本地客户名称",
    accessorKey: "local_customer_name",
    size: 150,
  },
  {
    id: "direction",
    header: "方向",
    accessorKey: "direction",
    size: 100,
    cell: ({ row }: any) => {
      const directionMap: Record<string, { label: string; color: string }> = {
        to_external: { label: "→ 外部", color: "bg-blue-100 text-blue-800" },
        from_external: {
          label: "← 外部",
          color: "bg-green-100 text-green-800",
        },
        bidirectional: {
          label: "↔ 双向",
          color: "bg-purple-100 text-purple-800",
        },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "bg-gray-100 text-gray-800",
      };
      return <Badge className={config.color}>{config.label}</Badge>;
    },
  },
  {
    id: "external_customer_code",
    header: "外部客户编码",
    accessorKey: "external_customer_code",
    size: 120,
  },
  {
    id: "external_customer_name",
    header: "外部客户名称",
    accessorKey: "external_customer_name",
    size: 150,
  },
  {
    id: "status",
    header: "状态",
    accessorKey: "is_active",
    size: 80,
    cell: ({ row }: any) =>
      row.is_active ? (
        <Badge className="bg-green-100 text-green-800">启用</Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-800">禁用</Badge>
      ),
  },
];

// 供应商映射表格列定义
const SUPPLIER_MAPPING_COLUMNS = [
  {
    id: "local_supplier_code",
    header: "本地供应商编码",
    accessorKey: "local_supplier_code",
    size: 120,
  },
  {
    id: "local_supplier_name",
    header: "本地供应商名称",
    accessorKey: "local_supplier_name",
    size: 150,
  },
  {
    id: "direction",
    header: "方向",
    accessorKey: "direction",
    size: 100,
    cell: ({ row }: any) => {
      const directionMap: Record<string, { label: string; color: string }> = {
        to_external: { label: "→ 外部", color: "bg-blue-100 text-blue-800" },
        from_external: {
          label: "← 外部",
          color: "bg-green-100 text-green-800",
        },
        bidirectional: {
          label: "↔ 双向",
          color: "bg-purple-100 text-purple-800",
        },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "bg-gray-100 text-gray-800",
      };
      return <Badge className={config.color}>{config.label}</Badge>;
    },
  },
  {
    id: "external_supplier_code",
    header: "外部供应商编码",
    accessorKey: "external_supplier_code",
    size: 120,
  },
  {
    id: "external_supplier_name",
    header: "外部供应商名称",
    accessorKey: "external_supplier_name",
    size: 150,
  },
  {
    id: "status",
    header: "状态",
    accessorKey: "is_active",
    size: 80,
    cell: ({ row }: any) =>
      row.is_active ? (
        <Badge className="bg-green-100 text-green-800">启用</Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-800">禁用</Badge>
      ),
  },
];

export default function ExternalErpMappingPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();

  // 当前选中的映射类型
  const [activeMappingType, setActiveMappingType] = useState<
    "account" | "customer" | "supplier"
  >("account");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 弹窗状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // 查询连接详情
  const { data: connectionData, isLoading: connectionLoading } =
    useErpConnection(connectionId || "");

  // 查询映射列表
  const {
    data: accountMappingsData,
    isLoading: accountLoading,
    refetch: refetchAccountMappings,
  } = useAccountMappings(connectionId || "");
  const {
    data: customerMappingsData,
    isLoading: customerLoading,
    refetch: refetchCustomerMappings,
  } = useCustomerMappings(connectionId || "");
  const {
    data: supplierMappingsData,
    isLoading: supplierLoading,
    refetch: refetchSupplierMappings,
  } = useSupplierMappings(connectionId || "");

  // Mutations
  const importAccountMappings = useImportAccountMappings();
  const importCustomerMappings = useImportCustomerMappings();
  const importSupplierMappings = useImportSupplierMappings();
  const autoMatchAccountMappings = useAutoMatchAccountMappings();
  const syncAccounts = useSyncAccounts();
  const syncCustomers = useSyncCustomers();
  const syncSuppliers = useSyncSuppliers();

  // 获取映射数据
  const getMappingsData = () => {
    switch (activeMappingType) {
      case "account":
        return accountMappingsData?.data?.items || [];
      case "customer":
        return customerMappingsData?.data?.items || [];
      case "supplier":
        return supplierMappingsData?.data?.items || [];
      default:
        return [];
    }
  };

  // 获取表格列配置
  const getColumns = () => {
    switch (activeMappingType) {
      case "account":
        return ACCOUNT_MAPPING_COLUMNS;
      case "customer":
        return CUSTOMER_MAPPING_COLUMNS;
      case "supplier":
        return SUPPLIER_MAPPING_COLUMNS;
      default:
        return [];
    }
  };

  // 获取加载状态
  const isLoading = () => {
    switch (activeMappingType) {
      case "account":
        return accountLoading;
      case "customer":
        return customerLoading;
      case "supplier":
        return supplierLoading;
      default:
        return false;
    }
  };

  // 筛选映射
  const filteredMappings = getMappingsData().filter((mapping: any) => {
    const keyword = searchKeyword.toLowerCase();
    const localField =
      activeMappingType === "account"
        ? mapping.local_account_name
        : activeMappingType === "customer"
          ? mapping.local_customer_name
          : mapping.local_supplier_name;
    const externalField =
      activeMappingType === "account"
        ? mapping.external_account_name
        : activeMappingType === "customer"
          ? mapping.external_customer_name
          : mapping.external_supplier_name;

    return (
      localField?.toLowerCase().includes(keyword) ||
      externalField?.toLowerCase().includes(keyword)
    );
  });

  // 处理导入
  const handleImport = () => {
    // 模拟导入操作
    setShowImportModal(false);
  };

  // 处理同步
  const handleSync = () => {
    if (!connectionId) return;

    switch (activeMappingType) {
      case "account":
        syncAccounts.mutate({ config_id: connectionId });
        break;
      case "customer":
        syncCustomers.mutate({ config_id: connectionId });
        break;
      case "supplier":
        syncSuppliers.mutate({ config_id: connectionId });
        break;
    }
    setShowSyncDialog(false);
  };

  // 处理自动匹配
  const handleAutoMatch = () => {
    if (!connectionId) return;
    autoMatchAccountMappings.mutate(connectionId);
  };

  const connection = connectionData?.data;
  const config = MAPPING_TYPE_CONFIG[activeMappingType];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/integration")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">映射管理</h1>
            <p className="text-sm text-gray-500">
              {connection?.name || "加载中..."} -{" "}
              {connection?.type?.toUpperCase() || ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncDialog(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            同步数据
          </Button>
        </div>
      </div>

      {/* 连接状态卡片 */}
      {connection && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                    connection.type === "kingdee"
                      ? "bg-blue-500"
                      : connection.type === "yonyou"
                        ? "bg-orange-500"
                        : "bg-green-500"
                  }`}
                >
                  {connection.type === "kingdee"
                    ? "K"
                    : connection.type === "yonyou"
                      ? "Y"
                      : "S"}
                </div>
                <div>
                  <p className="text-sm text-gray-500">ERP类型</p>
                  <p className="font-medium">
                    {connection.type === "kingdee"
                      ? "金蝶K/3"
                      : connection.type === "yonyou"
                        ? "用友U8"
                        : "SAP S/4"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">连接状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connection.status === "connected"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium">
                    {connection.status === "connected" ? "已连接" : "未连接"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">同步方向</p>
                <p className="font-medium mt-1">
                  {connection.sync_direction === "bidirectional"
                    ? "双向同步"
                    : connection.sync_direction === "import"
                      ? "导入"
                      : "导出"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">最后同步</p>
                <p className="font-medium mt-1">
                  {connection.last_sync_at
                    ? new Date(connection.last_sync_at).toLocaleString()
                    : "从未同步"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 映射统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => setActiveMappingType("account")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">科目映射</p>
                <p className="text-2xl font-bold mt-1">
                  {accountMappingsData?.data?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-green-500 transition-colors"
          onClick={() => setActiveMappingType("customer")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">客户映射</p>
                <p className="text-2xl font-bold mt-1">
                  {customerMappingsData?.data?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-orange-500 transition-colors"
          onClick={() => setActiveMappingType("supplier")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">供应商映射</p>
                <p className="text-2xl font-bold mt-1">
                  {supplierMappingsData?.data?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <span className="text-2xl">🏭</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 映射管理表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索映射..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                导入
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatch}
                disabled={autoMatchAccountMappings.isPending}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                自动匹配
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={filteredMappings}
            columns={getColumns()}
            loading={isLoading()}
            enableSelection={true}
            enablePagination={true}
            pageSize={10}
            emptyState={
              <div className="text-center py-8 text-gray-500">
                暂无{config.label}数据
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* 导入弹窗 */}
      <Sheet open={showImportModal} onOpenChange={setShowImportModal}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>导入映射</SheetTitle>
            <SheetDescription>上传Excel或CSV文件导入映射数据</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 mb-2">
                拖拽文件到此处，或点击上传
              </p>
              <p className="text-xs text-gray-400">支持 .xlsx, .csv 格式</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">导入说明</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• 第一行为表头，请保持与模板一致</li>
                <li>• 本地编码和外部编码为必填项</li>
                <li>• 映射方向默认为双向同步</li>
                <li>• 已存在的映射将被更新</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                取消
              </Button>
              <Button onClick={handleImport}>开始导入</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 同步确认弹窗 */}
      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认同步</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从外部ERP系统同步{config.label}数据吗？
              这将会根据映射规则同步
              {activeMappingType === "account"
                ? "科目"
                : activeMappingType === "customer"
                  ? "客户"
                  : "供应商"}
              数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync}>确定同步</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
