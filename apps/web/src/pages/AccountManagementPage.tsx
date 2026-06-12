/**
 * 会计科目管理页面
 * 管理企业会计科目体系，支持科目的增删改查和树形结构展示
 */

import React, { useState, useMemo } from "react";
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
  MoreHorizontal,
  ArrowUpDown,
  Copy,
  Eye,
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
import {
  useAccounts,
  useAccountTree,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useAccountBalances,
} from "@/hooks/useFinance";
import type { Account, BalanceDirection } from "@/types/erp-finance";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

/** 科目类型配置 */
const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  asset: { label: "资产", color: "bg-blue-100 text-blue-800" },
  liability: { label: "负债", color: "bg-red-100 text-red-800" },
  equity: { label: "权益", color: "bg-green-100 text-green-800" },
  revenue: { label: "收入", color: "bg-purple-100 text-purple-800" },
  expense: { label: "费用", color: "bg-orange-100 text-orange-800" },
  cost: { label: "成本", color: "bg-yellow-100 text-yellow-800" },
};

/** 余额方向配置 */
const BALANCE_DIRECTION_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  debit: { label: "借", color: "bg-blue-100 text-blue-800" },
  credit: { label: "贷", color: "bg-red-100 text-red-800" },
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
  const navigate = useNavigate();
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
        <span className="font-mono text-sm">{row.getValue("code")}</span>
      ),
    },
    {
      id: "name",
      header: "科目名称",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_detail ? (
            <span className="text-sm">{row.getValue("name")}</span>
          ) : (
            <span className="font-medium">{row.getValue("name")}</span>
          )}
        </div>
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
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
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
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "is_detail",
      header: "明细",
      accessorKey: "is_detail",
      cell: ({ row }) => (
        <Badge variant={row.original.is_detail ? "default" : "secondary"}>
          {row.original.is_detail ? "明细科目" : "总账科目"}
        </Badge>
      ),
    },
    {
      id: "is_active",
      header: "状态",
      accessorKey: "is_active",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "destructive"}>
          {row.original.is_active ? "启用" : "停用"}
        </Badge>
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
            className={`font-mono text-sm ${
              amount >= 0 ? "text-green-600" : "text-red-600"
            }`}
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedAccount(row.original);
              setIsEditing(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingId(row.original.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
      color: "bg-gray-100 text-gray-800",
    };
    const directionConfig = BALANCE_DIRECTION_CONFIG[
      account.balance_direction
    ] || {
      label: account.balance_direction,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <div key={account.id}>
        <div
          className={`flex items-center hover:bg-gray-50 border-b border-gray-100 ${
            !account.is_detail ? "bg-gray-50 font-medium" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* 展开/折叠按钮 */}
          <div className="w-6 flex-shrink-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(account.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <span className="w-6" />
            )}
          </div>

          {/* 科目编码 */}
          <div className="w-32 flex-shrink-0 font-mono text-sm">
            {account.code}
          </div>

          {/* 科目名称 */}
          <div className="flex-1 text-sm">{account.name}</div>

          {/* 科目类型 */}
          <div className="w-20 flex-shrink-0">
            <Badge className={typeConfig.color} variant="outline">
              {typeConfig.label}
            </Badge>
          </div>

          {/* 余额方向 */}
          <div className="w-16 flex-shrink-0">
            <Badge className={directionConfig.color} variant="outline">
              {directionConfig.label}
            </Badge>
          </div>

          {/* 余额 */}
          <div className="w-32 text-right font-mono text-sm">
            {balance ? (
              <span
                className={
                  (balance.debit_balance || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
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
          </div>

          {/* 状态 */}
          <div className="w-16 flex-shrink-0">
            <Badge variant={account.is_active ? "default" : "secondary"}>
              {account.is_active ? "启用" : "停用"}
            </Badge>
          </div>

          {/* 操作 */}
          <div className="w-24 flex-shrink-0 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setSelectedAccount(account);
                setIsEditing(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeletingId(account.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div>
            {account.children.map((child: any) =>
              renderTreeNode(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">会计科目管理</h1>
              <p className="text-sm text-gray-500">
                管理企业会计科目体系，支持多级科目结构
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViewMode(viewMode === "tree" ? "table" : "tree")
              }
            >
              {viewMode === "tree" ? "表格视图" : "树形视图"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedAccount(null);
                setIsCreating(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新增科目
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {accountsData?.data?.items?.length || 0}
              </div>
              <p className="text-sm text-gray-500">科目总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {accountsData?.data?.items?.filter((a: Account) => a.is_detail)
                  .length || 0}
              </div>
              <p className="text-sm text-gray-500">明细科目</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {accountsData?.data?.items?.filter((a: Account) => !a.is_detail)
                  .length || 0}
              </div>
              <p className="text-sm text-gray-500">总账科目</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {accountsData?.data?.items?.filter((a: Account) => !a.is_active)
                  .length || 0}
              </div>
              <p className="text-sm text-gray-500">已停用</p>
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
                    placeholder="搜索科目编码或名称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="科目类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="asset">资产</SelectItem>
                  <SelectItem value="liability">负债</SelectItem>
                  <SelectItem value="equity">权益</SelectItem>
                  <SelectItem value="revenue">收入</SelectItem>
                  <SelectItem value="expense">费用</SelectItem>
                  <SelectItem value="cost">成本</SelectItem>
                </SelectContent>
              </Select>
              <Select value={isDetailFilter} onValueChange={setIsDetailFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="明细/汇总" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="detail">明细科目</SelectItem>
                  <SelectItem value="summary">总账科目</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === "tree" && (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    展开全部
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    折叠全部
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 科目列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>会计科目列表</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>共 {filteredAccounts.length || 0} 个科目</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || treeLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : viewMode === "tree" ? (
              // 树形视图
              <div className="border rounded-lg overflow-hidden">
                {/* 表头 */}
                <div className="flex items-center bg-gray-100 border-b px-4 py-3 text-sm font-medium text-gray-700">
                  <div className="w-6 flex-shrink-0" />
                  <div className="w-32 flex-shrink-0">科目编码</div>
                  <div className="flex-1">科目名称</div>
                  <div className="w-20 flex-shrink-0">类型</div>
                  <div className="w-16 flex-shrink-0">方向</div>
                  <div className="w-32 text-right flex-shrink-0">余额</div>
                  <div className="w-16 flex-shrink-0">状态</div>
                  <div className="w-24 flex-shrink-0">操作</div>
                </div>
                {/* 树内容 */}
                <div className="divide-y divide-gray-100">
                  {treeData.map((account) => renderTreeNode(account))}
                </div>
                {treeData.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Building2 className="w-12 h-12 mb-4 text-gray-300" />
                    <p>暂无科目数据</p>
                    <p className="text-sm text-gray-400 mt-1">
                      点击"新增科目"创建第一个会计科目
                    </p>
                  </div>
                )}
              </div>
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
      </div>

      {/* 创建/编辑侧边栏 */}
      <Sheet
        open={isCreating || isEditing}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedAccount(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>{isCreating ? "新增科目" : "编辑科目"}</SheetTitle>
            <SheetDescription>
              {isCreating
                ? "创建新的会计科目"
                : `编辑科目: ${selectedAccount?.code} ${selectedAccount?.name}`}
            </SheetDescription>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该科目吗？此操作不可恢复。
              {accountsData?.data?.items?.some(
                (a: Account) => a.parent_id === deletingId,
              ) && (
                <span className="block mt-2 text-yellow-600">
                  警告：该科目存在下级科目，删除后将同时删除所有下级科目。
                </span>
              )}
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
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            科目编码 <span className="text-red-600">*</span>
          </label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="例如: 1001"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            科目名称 <span className="text-red-600">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如: 库存现金"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              科目类型 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">资产</SelectItem>
                <SelectItem value="liability">负债</SelectItem>
                <SelectItem value="equity">权益</SelectItem>
                <SelectItem value="revenue">收入</SelectItem>
                <SelectItem value="expense">费用</SelectItem>
                <SelectItem value="cost">成本</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              余额方向 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.balance_direction}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  balance_direction: value as BalanceDirection,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">借</SelectItem>
                <SelectItem value="credit">贷</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            上级科目
          </label>
          <Select
            value={formData.parent_id || "none"}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                parent_id: value === "none" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="无（顶级科目）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无（顶级科目）</SelectItem>
              {accounts
                .filter((a) => !a.is_detail && a.id !== account?.id)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              明细标志
            </label>
            <Select
              value={formData.is_detail ? "detail" : "summary"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  is_detail: value === "detail",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detail">明细科目</SelectItem>
                <SelectItem value="summary">总账科目</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              状态
            </label>
            <Select
              value={formData.is_active ? "active" : "inactive"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  is_active: value === "active",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            描述
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
