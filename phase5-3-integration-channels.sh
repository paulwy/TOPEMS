#!/usr/bin/env bash
# =============================================================================
# Phase 5.3 — 跨模块集成通道 API 层 & 全局搜索聚合服务
#
# 创建文件:
#   1. apps/web/src/api/integration/channels.ts
#   2. apps/web/src/hooks/useGlobalSearch.ts
#   3. apps/web/src/pages/admin/IntegrationManagementPage.tsx
# 修改文件:
#   4. apps/web/src/routes/iam.ts (添加 /iam/integration 路由)
# =============================================================================

set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
WEB_SRC="${PROJECT_ROOT}/apps/web/src"

# ─── 辅助函数 ───────────────────────────────────────────────────────────────

backup_if_exists() {
  local file="$1"
  if [[ -f "$file" && ! -f "${file}.bak.phase5-3" ]]; then
    cp "$file" "${file}.bak.phase5-3"
    echo "  [backup] ${file##*/}"
  fi
}

create_file() {
  local target="$1"
  local content="$2"
  if [[ -f "$target" ]]; then
    echo "  [skip] ${target##*/} (already exists)"
  else
    mkdir -p "$(dirname "$target")"
    cat > "$target" <<< "$content"
    echo "  [create] ${target##*/}"
  fi
}

# ─── 1. 集成通道定义文件 ───────────────────────────────────────────────────

echo ">>> [1/4] Creating channels.ts ..."

create_file "${WEB_SRC}/api/integration/channels.ts" '
/**
 * Phase 5.3 — 跨模块集成通道定义
 *
 * 定义各模块间的数据同步通道配置和 API 接口。
 * 每个通道描述: 源模块 → 目标模块 + 数据类型 + 触发方式。
 */
import { apiClient } from "@/lib/apiClient";

// ============ 类型定义 ============

/** 通道触发方式 */
export type TriggerMode = "manual" | "event" | "scheduled" | "realtime";

/** 通道状态 */
export type ChannelStatus = "active" | "inactive" | "error" | "pending";

/** 同步方向 */
export type SyncDirection =
  | "bidirectional"
  | "source-to-target"
  | "target-to-source";

/** 集成通道配置 */
export interface IntegrationChannel {
  /** 通道唯一标识 */
  id: string;
  /** 通道名称 */
  name: string;
  /** 源模块 code */
  sourceModule: string;
  /** 目标模块 code */
  targetModule: string;
  /** 同步方向 */
  direction: SyncDirection;
  /** 数据类型描述 */
  dataType: string;
  /** 触发方式 */
  triggerMode: TriggerMode;
  /** 当前状态 */
  status: ChannelStatus;
  /** 描述 */
  description: string;
  /** 最后同步时间 */
  lastSyncAt?: string;
  /** 错误信息 */
  lastError?: string;
}

/** 同步任务 */
export interface SyncTask {
  id: string;
  channel: string;
  sourceModule: string;
  targetModule: string;
  status: "pending" | "running" | "success" | "error";
  startedAt?: string;
  completedAt?: string;
  recordCount?: number;
  errorCount?: number;
  errorMessage?: string;
}

/** 同步执行结果 */
export interface SyncResult {
  success: boolean;
  syncedRecords: number;
  errorRecords: number;
  errors: Array<{ record: any; error: string }>;
  duration: number;
}

// ============ 通道注册表 ============

/** 所有预定义的集成通道 */
export const INTEGRATION_CHANNELS: IntegrationChannel[] = [
  // ERP <-> Finance
  {
    id: "erp-finance-voucher",
    name: "ERP凭证 → Finance凭证",
    sourceModule: "erp",
    targetModule: "finance",
    direction: "source-to-target",
    dataType: "voucher",
    triggerMode: "event",
    status: "inactive",
    description: "ERP中的凭证自动同步到Finance模块进行专业财务管理",
  },
  {
    id: "erp-finance-report",
    name: "ERP报表 ↔ Finance报表",
    sourceModule: "erp",
    targetModule: "finance",
    direction: "bidirectional",
    dataType: "financial-report",
    triggerMode: "scheduled",
    status: "inactive",
    description: "ERP基础财务报表与Finance专业报表数据共享",
  },
  // ERP <-> WMS
  {
    id: "erp-wms-material",
    name: "ERP物料 ↔ WMS物料",
    sourceModule: "erp",
    targetModule: "wms",
    direction: "bidirectional",
    dataType: "material",
    triggerMode: "event",
    status: "inactive",
    description: "ERP物料主数据与WMS物料数据双向同步",
  },
  {
    id: "erp-wms-inventory",
    name: "ERP库存 ↔ WMS库存",
    sourceModule: "erp",
    targetModule: "wms",
    direction: "bidirectional",
    dataType: "inventory",
    triggerMode: "realtime",
    status: "inactive",
    description: "ERP与WMS库存数量实时同步",
  },
  // ERP <-> CRM
  {
    id: "erp-crm-customer",
    name: "ERP客户 ↔ CRM客户",
    sourceModule: "erp",
    targetModule: "crm",
    direction: "bidirectional",
    dataType: "customer",
    triggerMode: "event",
    status: "inactive",
    description: "ERP与CRM客户信息双向同步",
  },
  {
    id: "erp-crm-sales",
    name: "ERP销售 → CRM商机",
    sourceModule: "erp",
    targetModule: "crm",
    direction: "source-to-target",
    dataType: "sales-order",
    triggerMode: "event",
    status: "inactive",
    description: "ERP销售订单关联到CRM商机关联",
  },
  // CRM <-> Finance
  {
    id: "crm-finance-receivable",
    name: "CRM销售 → Finance应收",
    sourceModule: "crm",
    targetModule: "finance",
    direction: "source-to-target",
    dataType: "receivable",
    triggerMode: "event",
    status: "inactive",
    description: "CRM确认的销售订单自动生成Finance应收账款",
  },
  {
    id: "crm-finance-invoice",
    name: "CRM订单 → Finance发票",
    sourceModule: "crm",
    targetModule: "finance",
    direction: "source-to-target",
    dataType: "invoice",
    triggerMode: "event",
    status: "inactive",
    description: "CRM订单确认后自动生成Finance发票",
  },
];

// ============ 通道 API ============

/**
 * 获取两个模块间的可用通道
 */
export function getChannelsBetween(
  moduleA: string,
  moduleB: string
): IntegrationChannel[] {
  return INTEGRATION_CHANNELS.filter(
    (ch) =>
      (ch.sourceModule === moduleA && ch.targetModule === moduleB) ||
      (ch.sourceModule === moduleB && ch.targetModule === moduleA)
  );
}

/**
 * 获取指定模块相关的所有通道
 */
export function getChannelsForModule(
  moduleCode: string
): IntegrationChannel[] {
  return INTEGRATION_CHANNELS.filter(
    (ch) => ch.sourceModule === moduleCode || ch.targetModule === moduleCode
  );
}

/**
 * 检查两个模块间是否有可用通道
 */
export function hasChannelBetween(
  moduleA: string,
  moduleB: string
): boolean {
  return getChannelsBetween(moduleA, moduleB).length > 0;
}

// ============ 同步操作 API ============

/** 后端 API 客户端（集成模块） */
const integrationBackend = {
  /** 触发通道同步 */
  triggerSync: (
    channelId: string,
    params?: Record<string, any>
  ): Promise<SyncResult> =>
    apiClient.integration.post(`/${channelId}/sync`, params),

  /** 获取通道状态 */
  getChannelStatus: (channelId: string): Promise<IntegrationChannel> =>
    apiClient.integration.get(`/channels/${channelId}/status`),

  /** 激活通道 */
  activateChannel: (channelId: string): Promise<IntegrationChannel> =>
    apiClient.integration.post(`/channels/${channelId}/activate`),

  /** 停用通道 */
  deactivateChannel: (channelId: string): Promise<IntegrationChannel> =>
    apiClient.integration.post(`/channels/${channelId}/deactivate`),

  /** 获取同步历史 */
  getSyncHistory: (
    channelId: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<{ items: SyncTask[]; total: number }> =>
    apiClient.integration.get(`/channels/${channelId}/history`, { params }),

  /** 获取所有通道状态列表 */
  listChannels: (): Promise<IntegrationChannel[]> =>
    apiClient.integration.get("/channels"),
};

export default integrationBackend;
'

# ─── 2. 全局搜索聚合 Hook ─────────────────────────────────────────────────

echo ">>> [2/4] Creating useGlobalSearch.ts ..."

create_file "${WEB_SRC}/hooks/useGlobalSearch.ts" '
/**
 * Phase 5.3 — 跨模块全局搜索 Hook
 *
 * 聚合搜索多个模块的数据，在全局搜索栏中展示统一结果。
 * 搜索已安装模块的数据源，返回分组结果。
 */
import { useState, useCallback, useRef } from "react";
import { usePluginContext } from "@/context/PluginContext";
import { apiClient } from "@/lib/apiClient";

export interface SearchResultItem {
  id: string;
  title: string;
  description: string;
  moduleCode: string;
  moduleName: string;
  path: string;
  type: string;
}

export interface SearchResultGroup {
  moduleCode: string;
  moduleName: string;
  items: SearchResultItem[];
}

export interface GlobalSearchResult {
  groups: SearchResultGroup[];
  total: number;
  loading: boolean;
  error: string | null;
}

/**
 * 模块搜索 API 配置
 * 每个已安装模块提供搜索接口
 */
interface ModuleSearchConfig {
  moduleCode: string;
  moduleName: string;
  searchFn: (keyword: string) => Promise<SearchResultItem[]>;
}

/** 预定义的模块搜索配置 */
const getModuleSearchConfigs = (
  isPluginInstalled: (code: string) => boolean
): ModuleSearchConfig[] => {
  const configs: ModuleSearchConfig[] = [];

  // ERP (核心，始终可用)
  configs.push({
    moduleCode: "erp",
    moduleName: "ERP",
    searchFn: async (keyword) => {
      try {
        const res = await apiClient.erp.get("/search", {
          params: { keyword, limit: 5 },
        });
        return (res.data?.items || []).map((item: any) => ({
          id: item.id,
          title: item.name || item.code,
          description: item.description || "",
          moduleCode: "erp",
          moduleName: "ERP",
          path: `/erp/${item.type || "records"}/${item.id}`,
          type: item.type || "record",
        }));
      } catch {
        return [];
      }
    },
  });

  // HRM (核心，始终可用)
  configs.push({
    moduleCode: "hrm",
    moduleName: "HRM",
    searchFn: async (keyword) => {
      try {
        const res = await apiClient.hrm.get("/employees/search", {
          params: { keyword, limit: 5 },
        });
        return (res.data?.items || []).map((item: any) => ({
          id: item.id,
          title: item.name,
          description: `${item.department || ""} ${item.position || ""}`.trim(),
          moduleCode: "hrm",
          moduleName: "HRM",
          path: `/hrm/employees/${item.id}`,
          type: "employee",
        }));
      } catch {
        return [];
      }
    },
  });

  // MES (核心，始终可用)
  configs.push({
    moduleCode: "mes",
    moduleName: "MES",
    searchFn: async (keyword) => {
      try {
        const res = await apiClient.mes.get("/orders/search", {
          params: { keyword, limit: 5 },
        });
        return (res.data?.items || []).map((item: any) => ({
          id: item.id,
          title: item.orderNo || item.productName,
          description: item.productName || item.orderNo,
          moduleCode: "mes",
          moduleName: "MES",
          path: `/mes/orders/${item.id}`,
          type: "production-order",
        }));
      } catch {
        return [];
      }
    },
  });

  // Finance (插件)
  if (isPluginInstalled("finance")) {
    configs.push({
      moduleCode: "finance",
      moduleName: "Finance",
      searchFn: async (keyword) => {
        try {
          const res = await apiClient.finance.get("/vouchers/search", {
            params: { keyword, limit: 5 },
          });
          return (res.data?.items || []).map((item: any) => ({
            id: item.id,
            title: item.voucherNo || item.summary,
            description: item.summary || "",
            moduleCode: "finance",
            moduleName: "Finance",
            path: `/finance/vouchers/${item.id}`,
            type: "voucher",
          }));
        } catch {
          return [];
        }
      },
    });
  }

  // WMS (插件)
  if (isPluginInstalled("wms")) {
    configs.push({
      moduleCode: "wms",
      moduleName: "WMS",
      searchFn: async (keyword) => {
        try {
          const res = await apiClient.wms.get("/materials/search", {
            params: { keyword, limit: 5 },
          });
          return (res.data?.items || []).map((item: any) => ({
            id: item.id,
            title: item.name || item.code,
            description: item.specification || "",
            moduleCode: "wms",
            moduleName: "WMS",
            path: `/wms/materials/${item.id}`,
            type: "material",
          }));
        } catch {
          return [];
        }
      },
    });
  }

  // CRM (插件)
  if (isPluginInstalled("crm")) {
    configs.push({
      moduleCode: "crm",
      moduleName: "CRM",
      searchFn: async (keyword) => {
        try {
          const res = await apiClient.crm.get("/customers/search", {
            params: { keyword, limit: 5 },
          });
          return (res.data?.items || []).map((item: any) => ({
            id: item.id,
            title: item.name,
            description: item.industry || "",
            moduleCode: "crm",
            moduleName: "CRM",
            path: `/crm/customers/${item.id}`,
            type: "customer",
          }));
        } catch {
          return [];
        }
      },
    });
  }

  return configs;
};

/**
 * 跨模块全局搜索 Hook
 */
export function useGlobalSearch() {
  const { isPluginInstalled } = usePluginContext();
  const [result, setResult] = useState<GlobalSearchResult>({
    groups: [],
    total: 0,
    loading: false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (keyword: string) => {
      if (!keyword || keyword.trim().length < 1) {
        setResult({ groups: [], total: 0, loading: false, error: null });
        return;
      }

      // 取消前一次搜索
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setResult((prev) => ({ ...prev, loading: true, error: null }));

      const configs = getModuleSearchConfigs(isPluginInstalled);
      const allGroups: SearchResultGroup[] = [];
      let totalItems = 0;

      try {
        const searchPromises = configs.map(async (config) => {
          try {
            const items = await config.searchFn(keyword);
            if (items.length > 0 && !controller.signal.aborted) {
              allGroups.push({
                moduleCode: config.moduleCode,
                moduleName: config.moduleName,
                items,
              });
              totalItems += items.length;
            }
          } catch {
            // 单模块搜索失败不影响其他模块
          }
        });

        await Promise.all(searchPromises);

        if (!controller.signal.aborted) {
          setResult({
            groups: allGroups,
            total: totalItems,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setResult((prev) => ({
            ...prev,
            loading: false,
            error: err?.message || "搜索失败",
          }));
        }
      }
    },
    [isPluginInstalled]
  );

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResult({ groups: [], total: 0, loading: false, error: null });
  }, []);

  return { ...result, search, clear };
}

export default useGlobalSearch;
'

# ─── 3. 集成管理页面 ──────────────────────────────────────────────────────

echo ">>> [3/4] Creating IntegrationManagementPage.tsx ..."

create_file "${WEB_SRC}/pages/admin/IntegrationManagementPage.tsx" '
/**
 * Phase 5.3 — 集成通道管理页面
 *
 * 展示所有跨模块集成通道的状态、历史和配置。
 * 仅管理员可见。
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Settings,
  RefreshCw,
  Play,
  Pause,
  History,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PageContainer } from "@/components/common";
import {
  INTEGRATION_CHANNELS,
  getChannelsForModule,
  type IntegrationChannel,
  type SyncTask,
} from "@/api/integration/channels";
import { usePluginContext } from "@/context/PluginContext";

const IntegrationManagementPage: React.FC = () => {
  const { isPluginInstalled } = usePluginContext();
  const [channels, setChannels] = useState<IntegrationChannel[]>([]);
  const [selectedChannel, setSelectedChannel] =
    useState<IntegrationChannel | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  useEffect(() => {
    // 过滤只显示两端模块都已安装的通道
    const installed = INTEGRATION_CHANNELS.filter((ch) => {
      const srcOk =
        ch.sourceModule === "erp" ||
        ch.sourceModule === "hrm" ||
        ch.sourceModule === "mes" ||
        isPluginInstalled(ch.sourceModule);
      const tgtOk =
        ch.targetModule === "erp" ||
        ch.targetModule === "hrm" ||
        ch.targetModule === "mes" ||
        isPluginInstalled(ch.targetModule);
      return srcOk && tgtOk;
    });
    setChannels(installed);
  }, [isPluginInstalled]);

  const handleToggleChannel = useCallback(
    (channel: IntegrationChannel) => {
      // TODO: 调用后端 API 激活/停用通道
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channel.id
            ? {
                ...ch,
                status: ch.status === "active" ? "inactive" : "active",
              }
            : ch
        )
      );
    },
    []
  );

  const handleSync = useCallback((channel: IntegrationChannel) => {
    // TODO: 调用后端 API 触发同步
    console.log("Trigger sync for:", channel.id);
  }, []);

  const filteredChannels =
    moduleFilter === "all"
      ? channels
      : channels.filter(
          (ch) => ch.sourceModule === moduleFilter || ch.targetModule === moduleFilter
        );

  const statusIcon = (status: IntegrationChannel["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle sx={{ width: 16, color: "success.main" }} />;
      case "inactive":
        return <Pause sx={{ width: 16, color: "text.disabled" }} />;
      case "error":
        return <AlertCircle sx={{ width: 16, color: "error.main" }} />;
      case "pending":
        return <RefreshCw sx={{ width: 16, color: "warning.main" }} />;
    }
  };

  const triggerModeLabel = (mode: string) => {
    const map: Record<string, string> = {
      manual: "手动",
      event: "事件触发",
      scheduled: "定时",
      realtime: "实时",
    };
    return map[mode] || mode;
  };

  return (
    <PageContainer
      title="集成通道管理"
      subtitle="跨模块数据同步通道配置与监控"
    >
      {channels.length === 0 ? (
        <Alert severity="info">
          当前没有可用的集成通道。请先安装需要联动的模块。
        </Alert>
      ) : (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={moduleFilter}
              onChange={(_, v) => setModuleFilter(v)}
            >
              <Tab value="all" label="全部" />
              <Tab value="erp" label="ERP" />
              <Tab value="finance" label="Finance" />
              <Tab value="crm" label="CRM" />
              <Tab value="wms" label="WMS" />
            </Tabs>
          </Paper>

          <TableContainer component={Card}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>状态</TableCell>
                  <TableCell>通道名称</TableCell>
                  <TableCell>方向</TableCell>
                  <TableCell>触发方式</TableCell>
                  <TableCell>数据类型</TableCell>
                  <TableCell>最后同步</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredChannels.map((channel) => (
                  <TableRow key={channel.id} hover>
                    <TableCell>{statusIcon(channel.status)}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <ArrowRightLeft sx={{ width: 14 }} />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500 }}
                        >
                          {channel.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Chip
                          label={channel.sourceModule.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                        <ArrowRightLeft
                          sx={{ width: 12, color: "text.disabled" }}
                        />
                        <Chip
                          label={channel.targetModule.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={triggerModeLabel(channel.triggerMode)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{channel.dataType}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {channel.lastSyncAt || "--"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={
                          channel.status === "active" ? "停用" : "激活"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleToggleChannel(channel)}
                        >
                          {channel.status === "active" ? (
                            <Pause sx={{ width: 16 }} />
                          ) : (
                            <Play sx={{ width: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="手动同步">
                        <IconButton
                          size="small"
                          onClick={() => handleSync(channel)}
                        >
                          <RefreshCw sx={{ width: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="同步历史">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedChannel(channel);
                            setHistoryOpen(true);
                          }}
                        >
                          <History sx={{ width: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* 同步历史 Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>同步历史 — {selectedChannel?.name}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {selectedChannel?.description}
          </Typography>
          <Alert severity="info">
            同步历史将在此处显示。后端集成 API 就绪后将自动加载。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default IntegrationManagementPage;
'

# ─── 4. 路由注册 (Python) ──────────────────────────────────────────────────

echo ">>> [4/4] Registering route in iam.ts ..."

ROUTES_FILE="${WEB_SRC}/routes/iam.ts"

backup_if_exists "$ROUTES_FILE"

python3 << 'PYEOF'
import re, os

routes_file = "/Users/air/TOPEMS/apps/web/src/routes/iam.ts"

with open(routes_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1) 添加 lazy import（如果不存在）
import_line = 'const IntegrationManagementPage = lazy(() => import(\'../pages/admin/IntegrationManagementPage\'));'
if "IntegrationManagementPage" not in content:
    # 找到最后一个 lazy import 行（BankAccountManagementPage 之后），在其后插入
    pattern = r"(const BankAccountManagementPage = lazy\(\(\) => import\('[^']+'\)\);)"
    replacement = r"\1\n" + import_line
    content = re.sub(pattern, replacement, content)

# 2) 添加路由条目（如果不存在）
route_entry = """  {
    path: '/iam/integration',
    element: IntegrationManagementPage,
    requiredPermissions: ['iam:system_read'],
    module: 'iam',
    action: 'read',
  },"""

if "/iam/integration" not in content:
    # 在最后一个路由条目（bank-accounts）之后，数组关闭 ] 之前插入
    pattern = r"(  \{\n    path: '/iam/bank-accounts',\n    element: BankAccountManagementPage,\n    requiredPermissions: \['iam:users_read'\],\n    module: 'iam',\n    action: 'read',\n  \},)"
    replacement = r"\1\n" + route_entry
    content = re.sub(pattern, replacement, content)

with open(routes_file, "w", encoding="utf-8") as f:
    f.write(content)

print("  [route] /iam/integration registered")
PYEOF

# ─── 完成 ───────────────────────────────────────────────────────────────────

echo ""
echo "Phase 5.3 Integration Channels: DONE"
