/**
 * 外部ERP映射管理页面
 * 管理外部ERP系统的数据映射规则
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, RefreshCw, Search, Wand2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Drawer,
  Divider,
} from "@mui/material";
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
      const directionMap: Record<string, { label: string; color: "primary" | "success" | "secondary" | "default" }> = {
        to_external: { label: "→ 外部", color: "primary" },
        from_external: { label: "← 外部", color: "success" },
        bidirectional: { label: "↔ 双向", color: "secondary" },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "default" as const,
      };
      return <Chip size="small" label={config.label} color={config.color} />;
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
        <Chip size="small" label="启用" color="success" />
      ) : (
        <Chip size="small" label="禁用" color="default" />
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
      const directionMap: Record<string, { label: string; color: "primary" | "success" | "secondary" | "default" }> = {
        to_external: { label: "→ 外部", color: "primary" },
        from_external: { label: "← 外部", color: "success" },
        bidirectional: { label: "↔ 双向", color: "secondary" },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "default" as const,
      };
      return <Chip size="small" label={config.label} color={config.color} />;
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
        <Chip size="small" label="启用" color="success" />
      ) : (
        <Chip size="small" label="禁用" color="default" />
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
      const directionMap: Record<string, { label: string; color: "primary" | "success" | "secondary" | "default" }> = {
        to_external: { label: "→ 外部", color: "primary" },
        from_external: { label: "← 外部", color: "success" },
        bidirectional: { label: "↔ 双向", color: "secondary" },
      };
      const config = directionMap[row.direction] || {
        label: row.direction,
        color: "default" as const,
      };
      return <Chip size="small" label={config.label} color={config.color} />;
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
        <Chip size="small" label="启用" color="success" />
      ) : (
        <Chip size="small" label="禁用" color="default" />
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
    <Box sx={{ maxWidth: 1280, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 头部信息 */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
          <IconButton onClick={() => navigate("/integration")}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              映射管理
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              {connection?.name || "加载中..."} -{" "}
              {connection?.type?.toUpperCase() || ""}
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowSyncDialog(true)}
          startIcon={<RefreshCw size={16} />}
        >
          同步数据
        </Button>
      </Stack>

      {/* 连接状态卡片 */}
      {connection && (
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    bgcolor:
                      connection.type === "kingdee"
                        ? "primary.main"
                        : connection.type === "yonyou"
                          ? "warning.main"
                          : "success.main",
                  }}
                >
                  {connection.type === "kingdee"
                    ? "K"
                    : connection.type === "yonyou"
                      ? "Y"
                      : "S"}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>ERP类型</Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {connection.type === "kingdee"
                      ? "金蝶K/3"
                      : connection.type === "yonyou"
                        ? "用友U8"
                        : "SAP S/4"}
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>连接状态</Typography>
                <Stack direction="row" sx={{ alignItems: "center", mt: 0.5 }} spacing={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor:
                        connection.status === "connected"
                          ? "success.main"
                          : "grey.400",
                    }}
                  />
                  <Typography sx={{ fontWeight: 500 }}>
                    {connection.status === "connected" ? "已连接" : "未连接"}
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>同步方向</Typography>
                <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                  {connection.sync_direction === "bidirectional"
                    ? "双向同步"
                    : connection.sync_direction === "import"
                      ? "导入"
                      : "导出"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>最后同步</Typography>
                <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                  {connection.last_sync_at
                    ? new Date(connection.last_sync_at).toLocaleString()
                    : "从未同步"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 映射统计 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        <Card
          sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" }, transition: "border-color 0.2s" }}
          onClick={() => setActiveMappingType("account")}
        >
          <CardContent sx={{ pt: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>科目映射</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {accountMappingsData?.data?.total || 0}
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: "primary.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="h5">📊</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{ cursor: "pointer", "&:hover": { borderColor: "success.main" }, transition: "border-color 0.2s" }}
          onClick={() => setActiveMappingType("customer")}
        >
          <CardContent sx={{ pt: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>客户映射</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {customerMappingsData?.data?.total || 0}
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: "success.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="h5">👥</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{ cursor: "pointer", "&:hover": { borderColor: "warning.main" }, transition: "border-color 0.2s" }}
          onClick={() => setActiveMappingType("supplier")}
        >
          <CardContent sx={{ pt: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>供应商映射</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {supplierMappingsData?.data?.total || 0}
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: "warning.light", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="h5">🏭</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* 映射管理表格 */}
      <Card>
        <CardHeader
          title={
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
              <Typography>{config.icon}</Typography>
              <Typography>{config.label}</Typography>
            </Stack>
          }
          action={
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
              <TextField
                size="small"
                placeholder="搜索映射..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <Search size={16} style={{ marginRight: 8, color: "#9ca3af" }} />,
                  },
                }}
                sx={{ width: 256 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowImportModal(true)}
                startIcon={<Upload size={16} />}
              >
                导入
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleAutoMatch}
                disabled={autoMatchAccountMappings.isPending}
                startIcon={<Wand2 size={16} />}
              >
                自动匹配
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <EnhancedDataTable
            data={filteredMappings}
            columns={getColumns()}
            loading={isLoading()}
            enableSelection={true}
            enablePagination={true}
            pageSize={10}
            emptyState={
              <Box sx={{ textAlign: "center", py: 4, color: "grey.500" }}>
                暂无{config.label}数据
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* 导入弹窗 */}
      <Drawer
        anchor="right"
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      >
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>导入映射</Typography>
          <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
            上传Excel或CSV文件导入映射数据
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={3}>
            <Box sx={{ border: 2, borderStyle: "dashed", borderColor: "grey.300", borderRadius: 1, p: 4, textAlign: "center" }}>
              <Upload size={48} style={{ margin: "0 auto", color: "#9ca3af", marginBottom: 16 }} />
              <Typography variant="body2" sx={{ color: "grey.500", mb: 1 }}>
                拖拽文件到此处，或点击上传
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.400" }}>支持 .xlsx, .csv 格式</Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 500, mb: 1 }}>导入说明</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ color: "grey.500" }}>• 第一行为表头，请保持与模板一致</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>• 本地编码和外部编码为必填项</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>• 映射方向默认为双向同步</Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>• 已存在的映射将被更新</Typography>
              </Stack>
            </Box>

            <Stack direction="row" sx={{ justifyContent: "flex-end" }} spacing={1}>
              <Button variant="outlined" onClick={() => setShowImportModal(false)}>
                取消
              </Button>
              <Button variant="contained" onClick={handleImport}>开始导入</Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      {/* 同步确认弹窗 */}
      <Dialog open={showSyncDialog} onClose={() => setShowSyncDialog(false)}>
        <DialogTitle>确认同步</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要从外部ERP系统同步{config.label}数据吗？
            这将会根据映射规则同步
            {activeMappingType === "account"
              ? "科目"
              : activeMappingType === "customer"
                ? "客户"
                : "供应商"}
            数据。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShowSyncDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSync}>确定同步</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
