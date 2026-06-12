/**
 * 银行账户管理页面
 * 管理企业银行账户信息
 */

import React, { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  CreditCard,
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

/** 账户类型配置 */
const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  checking: { label: "基本户", color: "bg-blue-100 text-blue-800" },
  savings: { label: "一般户", color: "bg-green-100 text-green-800" },
  dedicated: { label: "专用户", color: "bg-purple-100 text-purple-800" },
  foreign: { label: "外币户", color: "bg-orange-100 text-orange-800" },
};

/** 账户状态配置 */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "正常", color: "bg-green-100 text-green-800" },
  frozen: { label: "冻结", color: "bg-red-100 text-red-800" },
  closed: { label: "销户", color: "bg-gray-100 text-gray-800" },
};

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  account_type: string;
  currency: string;
  status: string;
  balance: number;
  is_primary: boolean;
  description?: string;
  created_at: string;
}

interface BankAccountFormData {
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  account_type: string;
  currency: string;
  status: string;
  is_primary: boolean;
  description?: string;
}

// 模拟数据
const mockBankAccounts: BankAccount[] = [
  {
    id: "1",
    account_name: "基本户",
    account_number: "1234567890123456",
    bank_name: "中国工商银行",
    bank_branch: "北京分行",
    account_type: "checking",
    currency: "CNY",
    status: "active",
    balance: 1234567.89,
    is_primary: true,
    created_at: "2024-01-01",
  },
  {
    id: "2",
    account_name: "一般户",
    account_number: "9876543210987654",
    bank_name: "中国建设银行",
    bank_branch: "上海分行",
    account_type: "savings",
    currency: "CNY",
    status: "active",
    balance: 654321.12,
    is_primary: false,
    created_at: "2024-01-15",
  },
];

export default function BankAccountManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bankAccounts] = useState<BankAccount[]>(mockBankAccounts);

  // 过滤后的数据
  const filteredAccounts = bankAccounts.filter((account) => {
    const matchesSearch =
      !searchQuery ||
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_number.includes(searchQuery) ||
      account.bank_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "all" || account.account_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || account.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // 表格列定义 - 使用 any 类型简化
  const columns: any[] = [
    {
      id: "account_number",
      header: "账号",
      accessorKey: "account_number",
      cell: ({ row }: { row: BankAccount }) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="font-mono">{row.account_number}</span>
        </div>
      ),
    },
    {
      id: "account_name",
      header: "账户名称",
      accessorKey: "account_name",
    },
    {
      id: "bank_name",
      header: "开户银行",
      accessorKey: "bank_name",
    },
    {
      id: "account_type",
      header: "账户类型",
      accessorKey: "account_type",
      cell: ({ row }: { row: BankAccount }) => {
        const config = ACCOUNT_TYPE_CONFIG[row.account_type] || {
          label: row.account_type,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "currency",
      header: "币种",
      accessorKey: "currency",
      cell: ({ row }: { row: BankAccount }) => (
        <span>{row.currency === "CNY" ? "人民币" : row.currency}</span>
      ),
    },
    {
      id: "balance",
      header: "余额",
      accessorKey: "balance",
      cell: ({ row }: { row: BankAccount }) => (
        <span className="font-mono text-right">
          {row.balance.toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }: { row: BankAccount }) => {
        const config = STATUS_CONFIG[row.status] || {
          label: row.status,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "is_primary",
      header: "主账户",
      accessorKey: "is_primary",
      cell: ({ row }: { row: BankAccount }) =>
        row.is_primary ? (
          <Badge className="bg-yellow-100 text-yellow-800">主账户</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }: { row: BankAccount }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedAccount(row);
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

  // 处理创建
  const handleCreate = (data: BankAccountFormData) => {
    console.log("创建银行账户:", data);
    setIsCreating(false);
  };

  // 处理更新
  const handleUpdate = (data: BankAccountFormData) => {
    if (!selectedAccount) return;
    console.log("更新银行账户:", selectedAccount.id, data);
    setIsEditing(false);
    setSelectedAccount(null);
  };

  // 处理删除
  const handleDelete = () => {
    if (!deletingId) return;
    console.log("删除银行账户:", deletingId);
    setDeletingId(null);
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
              <h1 className="text-2xl font-bold text-gray-900">银行账户管理</h1>
              <p className="text-sm text-gray-500">管理企业银行账户信息</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedAccount(null);
              setIsCreating(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新增账户
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {bankAccounts.length}
              </div>
              <p className="text-sm text-gray-500">账户总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {bankAccounts.filter((a) => a.status === "active").length}
              </div>
              <p className="text-sm text-gray-500">正常账户</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {bankAccounts.filter((a) => a.currency !== "CNY").length}
              </div>
              <p className="text-sm text-gray-500">外币账户</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {bankAccounts
                  .reduce((sum, a) => sum + a.balance, 0)
                  .toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </div>
              <p className="text-sm text-gray-500">账户总余额</p>
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
                    placeholder="搜索账户名称、账号或银行..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="账户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="checking">基本户</SelectItem>
                  <SelectItem value="savings">一般户</SelectItem>
                  <SelectItem value="dedicated">专用户</SelectItem>
                  <SelectItem value="foreign">外币户</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="账户状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="frozen">冻结</SelectItem>
                  <SelectItem value="closed">销户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 账户列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>银行账户列表</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>共 {filteredAccounts.length} 个账户</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredAccounts}
              searchPlaceholder="搜索账户..."
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
            setSelectedAccount(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>
              {isCreating ? "新增银行账户" : "编辑银行账户"}
            </SheetTitle>
            <SheetDescription>
              {isCreating
                ? "创建新的银行账户"
                : `编辑账户: ${selectedAccount?.account_number}`}
            </SheetDescription>
          </SheetHeader>
          <BankAccountForm
            account={selectedAccount}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAccount(null);
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
              确定要删除该银行账户吗？此操作不可恢复。
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

/** 银行账户表单组件 */
interface BankAccountFormProps {
  account: BankAccount | null;
  onSubmit: (data: BankAccountFormData) => void;
  onCancel: () => void;
}

function BankAccountForm({
  account,
  onSubmit,
  onCancel,
}: BankAccountFormProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    account_name: account?.account_name || "",
    account_number: account?.account_number || "",
    bank_name: account?.bank_name || "",
    bank_branch: account?.bank_branch || "",
    account_type: account?.account_type || "checking",
    currency: account?.currency || "CNY",
    status: account?.status || "active",
    is_primary: account?.is_primary || false,
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
            账户名称 <span className="text-red-600">*</span>
          </label>
          <Input
            value={formData.account_name}
            onChange={(e) =>
              setFormData({ ...formData, account_name: e.target.value })
            }
            placeholder="例如：基本户"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            银行账号 <span className="text-red-600">*</span>
          </label>
          <Input
            value={formData.account_number}
            onChange={(e) =>
              setFormData({ ...formData, account_number: e.target.value })
            }
            placeholder="请输入银行账号"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            开户银行 <span className="text-red-600">*</span>
          </label>
          <Input
            value={formData.bank_name}
            onChange={(e) =>
              setFormData({ ...formData, bank_name: e.target.value })
            }
            placeholder="例如：中国工商银行"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            支行名称
          </label>
          <Input
            value={formData.bank_branch || ""}
            onChange={(e) =>
              setFormData({ ...formData, bank_branch: e.target.value })
            }
            placeholder="例如：北京分行中关村支行"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              账户类型 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.account_type}
              onValueChange={(value) =>
                setFormData({ ...formData, account_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">基本户</SelectItem>
                <SelectItem value="savings">一般户</SelectItem>
                <SelectItem value="dedicated">专用户</SelectItem>
                <SelectItem value="foreign">外币户</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              币种 <span className="text-red-600">*</span>
            </label>
            <Select
              value={formData.currency}
              onValueChange={(value) =>
                setFormData({ ...formData, currency: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                <SelectItem value="USD">美元 (USD)</SelectItem>
                <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                <SelectItem value="GBP">英镑 (GBP)</SelectItem>
                <SelectItem value="JPY">日元 (JPY)</SelectItem>
                <SelectItem value="HKD">港币 (HKD)</SelectItem>
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
        <Button type="submit">保存</Button>
      </div>
    </form>
  );
}
