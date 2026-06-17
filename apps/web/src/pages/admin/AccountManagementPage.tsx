/**
 * 会计科目管理页面
 * 管理企业会计科目体系，支持科目的增删改查和树形结构展示
 */

import React, { useState, useMemo } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  useAccounts,
  useAccountTree,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useAccountBalances,
} from "@/hooks/useFinance";
import type { Account, BalanceDirection } from "@/types/erp-finance";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

/** 科目类型配置 */
const ACCOUNT_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: "primary" | "error" | "success" | "info" | "warning" | "default";
  }
> = {
  asset: { label: "资产", color: "primary" },
  liability: { label: "负债", color: "error" },
  equity: { label: "权益", color: "success" },
  revenue: { label: "收入", color: "info" },
  expense: { label: "费用", color: "warning" },
  cost: { label: "成本", color: "default" },
};

/** 余额方向配置 */
const BALANCE_DIRECTION_CONFIG: Record<
  string,
  { label: string; color: "primary" | "error" }
> = {
  debit: { label: "借", color: "primary" },
  credit: { label: "贷", color: "error" },
};

interface AccountFormData {
  code: string;
  name: string;
  type: string;
  balance_direction: BalanceDirection;
  parent_id?: string;
  is_detail: boolean;
  is_active: boolean;
  description?: string;
}

export default function AccountManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDetailFilter, setIsDetailFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

  // 获取科目列表
  const {
    data: accountsData,
    isLoading,
    refetch,
  } = useAccounts({
    type: typeFilter !== "all" ? typeFilter : undefined,
    is_detail:
      isDetailFilter === "detail"
        ? true
        : isDetailFilter === "summary"
          ? false
          : undefined,
  });

  // 获取科目树
  const { data: accountTree, isLoading: treeLoading } = useAccountTree({});

  // 科目余额
  const { data: balancesData } = useAccountBalances({
    company_id: "default",
    period: new Date().toISOString().slice(0, 7),
  });

  // 创建科目
  const createAccount = useCreateAccount();

  // 更新科目
  const updateAccount = useUpdateAccount();

  // 删除科目
  const deleteAccount = useDeleteAccount();

  // 过滤后的科目列表
  const filteredAccounts = useMemo(() => {
    if (!accountsData?.data?.items) return [];
    const accounts = accountsData.data.items;

    if (!searchQuery) return accounts;

    return accounts.filter(
      (acc: Account) =>
        acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [accountsData, searchQuery]);

  // 构键树形结构
  const treeData = useMemo(() => {
    if (!accountTree?.data) return [];

    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter((item) => item.parent_id === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }))
        .sort((a, b) => a.code.localeCompare(b.code));
    };

    return buildTree(accountTree.data);
  }, [accountTree]);

  // 展开/折叠
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // 展开所有
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: any[]) => {
      items.forEach((item) => {
        if (item.children?.length > 0) {
          allIds.add(item.id);
          collectIds(item.children);
        }
      });
    };
    collectIds(treeData);
    setExpandedIds(allIds);
  };

  // 折叠所有
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // 处理创建
  const handleCreate = async (data: AccountFormData) => {
    try {
      await createAccount.mutateAsync(data as any);
      setIsCreating(false);
    } catch (error) {
      console.error("创建科目失败:", error);
    }
  };

  // 处理更新
  const handleUpdate = async (data: AccountFormData) => {
    if (!selectedAccount) return;
    try {
      await updateAccount.mutateAsync({ id: selectedAccount.id, data });
      setIsEditing(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error("更新科目失败:", error);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAccount.mutateAsync(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("删除科目失败:", error);
    }
  };

  // 获取余额
  const getBalance = (accountId: string) => {
    if (!balancesData?.data) return null;
    return balancesData.data.find((b: any) => b.account_id === accountId);
  };

  // 表格列定义
  const columns: ColumnDef<Account>[] = [
    {
      id: "code",
      header: "科目编码",
      accessorKey: "code",
      cell: ({ row }) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
          {row.getValue("code")}
        </span>
      ),
    },
    {
      id: "name",
      header: "科目名称",
      accessorKey: "name",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {row.original.is_detail ? (
            <span style={{ fontSize: "0.875rem" }}>{row.getValue("name")}</span>
          ) : (
            <span style={{ fontWeight: 500 }}>{row.getValue("name")}</span>
          )}
        </Box>
      ),
    },
    {
      id: "type",
      header: "科目类型",
      accessorKey: "type",
      cell: ({ row }) => {
        const type = row.getValue<string>("type");
        const config = ACCOUNT_TYPE_CONFIG[
          type as keyof typeof ACCOUNT_TYPE_CONFIG
        ] || {
          label: type,
          color: "default" as const,
        };
        return <Chip size="small" color={config.color} label={config.label} />;
      },
    },
    {
      id: "balance_direction",
      header: "余额方向",
      accessorKey: "balance_direction",
      cell: ({ row }) => {
        const balanceDirection = row.getValue<string>("balance_direction");
        const config = BALANCE_DIRECTION_CONFIG[
          balanceDirection as keyof typeof BALANCE_DIRECTION_CONFIG
        ] || {
          label: balanceDirection,
          color: "default" as const,
        };
        return <Chip size="small" color={config.color} label={config.label} />;
      },
    },
    {
      id: "is_detail",
      header: "明细",
      accessorKey: "is_detail",
      cell: ({ row }) => (
        <Chip
          size="small"
          variant={row.original.is_detail ? "filled" : "outlined"}
          label={row.original.is_detail ? "明细科目" : "总账科目"}
        />
      ),
    },
    {
      id: "is_active",
      header: "状态",
      accessorKey: "is_active",
      cell: ({ row }) => (
        <Chip
          size="small"
          variant={row.original.is_active ? "filled" : "outlined"}
          color={row.original.is_active ? "success" : "default"}
          label={row.original.is_active ? "启用" : "停用"}
        />
      ),
    },
    {
      id: "balance",
      header: "余额",
      cell: ({ row }) => {
        const balance = getBalance(row.original.id);
        if (!balance) return "-";
        const amount = balance.debit_balance || balance.credit_balance || 0;
        return (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              color: amount >= 0 ? "green" : "red",
            }}
          >
            {amount.toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedAccount(row.original);
              setIsEditing(true);
            }}
          >
            <Edit sx={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setDeletingId(row.original.id)}
            sx={{ color: "error.main" }}
          >
            <Trash2 sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  // 渲染树节点
  const renderTreeNode = (account: any, level: number = 0) => {
    const hasChildren = account.children?.length > 0;
    const isExpanded = expandedIds.has(account.id);
    const balance = getBalance(account.id);
    const typeConfig = ACCOUNT_TYPE_CONFIG[account.type] || {
      label: account.type,
      color: "default" as const,
    };
    const directionConfig = BALANCE_DIRECTION_CONFIG[
      account.balance_direction
    ] || {
      label: account.balance_direction,
      color: "default" as const,
    };

    return (
      <Box key={account.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            "&:hover": { bgcolor: "grey.50" },
            borderBottom: 1,
            borderColor: "grey.100",
            bgcolor: !account.is_detail ? "grey.50" : "transparent",
            fontWeight: !account.is_detail ? 500 : 400,
            pl: `${level * 24 + 12}px`,
          }}
        >
          {/* 展开/折叠按钮 */}
          <Box sx={{ width: 24, flexShrink: 0 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                sx={{ width: 24, height: 24 }}
                onClick={() => toggleExpand(account.id)}
              >
                {isExpanded ? (
                  <ChevronDown sx={{ width: 16, height: 16 }} />
                ) : (
                  <ChevronRight sx={{ width: 16, height: 16 }} />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 24 }} />
            )}
          </Box>

          {/* 科目编码 */}
          <Box
            sx={{
              width: 128,
              flexShrink: 0,
              fontFamily: "monospace",
              fontSize: "0.875rem",
            }}
          >
            {account.code}
          </Box>

          {/* 科目名称 */}
          <Box sx={{ flex: 1, fontSize: "0.875rem" }}>{account.name}</Box>

          {/* 科目类型 */}
          <Box sx={{ width: 80, flexShrink: 0 }}>
            <Chip
              size="small"
              color={typeConfig.color}
              variant="outlined"
              label={typeConfig.label}
            />
          </Box>

          {/* 余额方向 */}
          <Box sx={{ width: 64, flexShrink: 0 }}>
            <Chip
              size="small"
              color={directionConfig.color}
              variant="outlined"
              label={directionConfig.label}
            />
          </Box>

          {/* 余额 */}
          <Box
            sx={{
              width: 128,
              textAlign: "right",
              fontFamily: "monospace",
              fontSize: "0.875rem",
            }}
          >
            {balance ? (
              <span
                style={{
                  color: (balance.debit_balance || 0) >= 0 ? "green" : "red",
                }}
              >
                {(
                  balance.debit_balance ||
                  balance.credit_balance ||
                  0
                ).toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            ) : (
              "-"
            )}
          </Box>

          {/* 状态 */}
          <Box sx={{ width: 64, flexShrink: 0 }}>
            <Chip
              size="small"
              variant={account.is_active ? "filled" : "outlined"}
              color={account.is_active ? "success" : "default"}
              label={account.is_active ? "启用" : "停用"}
            />
          </Box>

          {/* 操作 */}
          <Box sx={{ width: 96, flexShrink: 0, display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              sx={{ width: 32, height: 32 }}
              onClick={() => {
                setSelectedAccount(account);
                setIsEditing(true);
              }}
            >
              <Edit sx={{ width: 16, height: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ width: 32, height: 32, color: "error.main" }}
              onClick={() => setDeletingId(account.id)}
            >
              <Trash2 sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <Box>
            {account.children.map((child: any) =>
              renderTreeNode(child, level + 1),
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 头部 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 sx={{ width: 24, height: 24, color: "#ffffff" }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                会计科目管理
              </Typography>
              <Typography variant="body2" color="text.secondary">
                管理企业会计科目体系，支持多级科目结构
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => refetch()}>
              <RefreshCw sx={{ width: 16, height: 16, marginRight: 8 }} />
              刷新
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                setViewMode(viewMode === "tree" ? "table" : "tree")
              }
            >
              {viewMode === "tree" ? "表格视图" : "树形视图"}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setSelectedAccount(null);
                setIsCreating(true);
              }}
            >
              <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
              新增科目
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                {accountsData?.data?.items?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                科目总数
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "success.main" }}
              >
                {accountsData?.data?.items?.filter((a: Account) => a.is_detail)
                  .length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                明细科目
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "info.main" }}
              >
                {accountsData?.data?.items?.filter((a: Account) => !a.is_detail)
                  .length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总账科目
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "warning.main" }}
              >
                {accountsData?.data?.items?.filter((a: Account) => !a.is_active)
                  .length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已停用
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* 筛选和搜索 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ pt: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  size="small"
                  placeholder="搜索科目编码或名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Box sx={{ mr: 1, display: "flex" }}>
                          <Search
                            sx={{ width: 16, height: 16, color: "#6b7280" }}
                          />
                        </Box>
                      ),
                    },
                  }}
                  sx={{ width: "100%" }}
                />
              </Box>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="all">全部类型</MenuItem>
                  <MenuItem value="asset">资产</MenuItem>
                  <MenuItem value="liability">负债</MenuItem>
                  <MenuItem value="equity">权益</MenuItem>
                  <MenuItem value="revenue">收入</MenuItem>
                  <MenuItem value="expense">费用</MenuItem>
                  <MenuItem value="cost">成本</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={isDetailFilter}
                  onChange={(e) => setIsDetailFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="detail">明细科目</MenuItem>
                  <MenuItem value="summary">总账科目</MenuItem>
                </Select>
              </FormControl>
              {viewMode === "tree" && (
                <>
                  <Button variant="outlined" size="small" onClick={expandAll}>
                    展开全部
                  </Button>
                  <Button variant="outlined" size="small" onClick={collapseAll}>
                    折叠全部
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* 科目列表 */}
        <Card>
          <CardHeader>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                会计科目列表
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  typography: "body2",
                  color: "text.secondary",
                }}
              >
                <span>共 {filteredAccounts.length || 0} 个科目</span>
              </Box>
            </Box>
          </CardHeader>
          <CardContent>
            {isLoading || treeLoading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                }}
              >
                <RefreshCw
                  sx={{
                    width: 32,
                    height: 32,
                    animation: "spin 1s linear infinite",
                    color: "#6b7280",
                  }}
                />
              </Box>
            ) : viewMode === "tree" ? (
              // 树形视图
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                {/* 表头 */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "grey.100",
                    borderBottom: 1,
                    borderColor: "divider",
                    px: 2,
                    py: 1.5,
                    typography: "body2",
                    fontWeight: 500,
                    color: "grey.700",
                  }}
                >
                  <Box sx={{ width: 24, flexShrink: 0 }} />
                  <Box sx={{ width: 128, flexShrink: 0 }}>科目编码</Box>
                  <Box sx={{ flex: 1 }}>科目名称</Box>
                  <Box sx={{ width: 80, flexShrink: 0 }}>类型</Box>
                  <Box sx={{ width: 64, flexShrink: 0 }}>方向</Box>
                  <Box sx={{ width: 128, textAlign: "right", flexShrink: 0 }}>
                    余额
                  </Box>
                  <Box sx={{ width: 64, flexShrink: 0 }}>状态</Box>
                  <Box sx={{ width: 96, flexShrink: 0 }}>操作</Box>
                </Box>
                {/* 树内容 */}
                <Box>{treeData.map((account) => renderTreeNode(account))}</Box>
                {treeData.length === 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 6,
                      color: "text.secondary",
                    }}
                  >
                    <Building2
                      sx={{
                        width: 48,
                        height: 48,
                        marginBottom: 16,
                        color: "#d1d5db",
                      }}
                    />
                    <Typography>暂无科目数据</Typography>
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ mt: 1 }}
                    >
                      点击"新增科目"创建第一个会计科目
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              // 表格视图
              <EnhancedDataTable
                columns={columns}
                data={filteredAccounts || []}
                searchPlaceholder="搜索科目..."
              />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 创建/编辑对话框 */}
      <Dialog
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
          setSelectedAccount(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{isCreating ? "新增科目" : "编辑科目"}</DialogTitle>
        <DialogContent>
          <AccountForm
            account={selectedAccount}
            accounts={accountsData?.data?.items || []}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAccount(null);
            }}
            isLoading={createAccount.isPending || updateAccount.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除该科目吗？此操作不可恢复。</Typography>
          {accountsData?.data?.items?.some(
            (a: Account) => a.parent_id === deletingId,
          ) && (
            <Typography color="warning.main" sx={{ mt: 2 }}>
              警告：该科目存在下级科目，删除后将同时删除所有下级科目。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)}>取消</Button>
          <Button color="error" onClick={handleDelete} variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** 科目表单组件 */
interface AccountFormProps {
  account: Account | null;
  accounts: Account[];
  onSubmit: (data: AccountFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AccountForm({
  account,
  accounts,
  onSubmit,
  onCancel,
  isLoading,
}: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    code: account?.code || "",
    name: account?.name || "",
    type: account?.type || "asset",
    balance_direction: account?.balance_direction || "debit",
    parent_id: account?.parent_id,
    is_detail: account?.is_detail ?? true,
    is_active: account?.is_active ?? true,
    description: account?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
    >
      <TextField
        label="科目编码 *"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
        placeholder="例如: 1001"
        required
        size="small"
      />

      <TextField
        label="科目名称 *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="例如: 库存现金"
        required
        size="small"
      />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>科目类型 *</InputLabel>
          <Select
            value={formData.type}
            label="科目类型 *"
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <MenuItem value="asset">资产</MenuItem>
            <MenuItem value="liability">负债</MenuItem>
            <MenuItem value="equity">权益</MenuItem>
            <MenuItem value="revenue">收入</MenuItem>
            <MenuItem value="expense">费用</MenuItem>
            <MenuItem value="cost">成本</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>余额方向 *</InputLabel>
          <Select
            value={formData.balance_direction}
            label="余额方向 *"
            onChange={(e) =>
              setFormData({
                ...formData,
                balance_direction: e.target.value as BalanceDirection,
              })
            }
          >
            <MenuItem value="debit">借</MenuItem>
            <MenuItem value="credit">贷</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <FormControl size="small" fullWidth>
        <InputLabel>上级科目</InputLabel>
        <Select
          value={formData.parent_id || ""}
          label="上级科目"
          onChange={(e) =>
            setFormData({
              ...formData,
              parent_id: e.target.value || undefined,
            })
          }
        >
          <MenuItem value="">无（顶级科目）</MenuItem>
          {accounts
            .filter((a) => !a.is_detail && a.id !== account?.id)
            .map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} - {a.name}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>明细标志</InputLabel>
          <Select
            value={formData.is_detail ? "detail" : "summary"}
            label="明细标志"
            onChange={(e) =>
              setFormData({
                ...formData,
                is_detail: e.target.value === "detail",
              })
            }
          >
            <MenuItem value="detail">明细科目</MenuItem>
            <MenuItem value="summary">总账科目</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={formData.is_active ? "active" : "inactive"}
            label="状态"
            onChange={(e) =>
              setFormData({
                ...formData,
                is_active: e.target.value === "active",
              })
            }
          >
            <MenuItem value="active">启用</MenuItem>
            <MenuItem value="inactive">停用</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TextField
        label="描述"
        value={formData.description || ""}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="可选描述信息"
        size="small"
        multiline
        rows={2}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          pt: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button type="button" variant="outlined" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="contained" disabled={isLoading}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </Box>
    </Box>
  );
}
