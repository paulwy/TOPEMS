/**
 * 期初余额管理页面
 * 管理会计科目的期初余额设置
 */

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  Calculator,
  FileText,
  AlertCircle,
  CheckCircle,
  DollarSign,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts, useAccountTree } from "@/hooks/useFinance";
import {
  useOpeningBalances,
  useSetOpeningBalance,
  useCarryForwardOpeningBalance,
} from "@/hooks/useFinance";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type {
  Account,
  AccountOpeningBalance,
  AccountCategory,
} from "@/types/erp-finance";

// 科目类别配置
const CATEGORY_CONFIG: Record<
  AccountCategory,
  { label: string; color: string }
> = {
  asset: { label: "资产类", color: "bg-blue-100 text-blue-800" },
  liability: { label: "负债类", color: "bg-red-100 text-red-800" },
  equity: { label: "权益类", color: "bg-green-100 text-green-800" },
  cost: { label: "成本类", color: "bg-orange-100 text-orange-800" },
  expense: { label: "费用类", color: "bg-purple-100 text-purple-800" },
  income: { label: "收入类", color: "bg-teal-100 text-teal-800" },
};

// 余额方向配置
const BALANCE_DIRECTION_CONFIG = {
  debit: { label: "借方", color: "text-blue-600" },
  credit: { label: "贷方", color: "text-red-600" },
};

export default function OpeningBalancePage() {
  // 状态
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<
    AccountCategory | ""
  >("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editDebitBalance, setEditDebitBalance] = useState(0);
  const [editCreditBalance, setEditCreditBalance] = useState(0);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [carryForwardFrom, setCarryForwardFrom] = useState("");
  const [carryForwardTo, setCarryForwardTo] = useState("");

  // 查询科目列表
  const { data: accountsData, isLoading: accountsLoading } = useAccounts({});

  // 查询科目余额树
  const { data: accountTreeData } = useAccountTree({});

  // 查询期初余额
  const {
    data: openingBalancesData,
    isLoading: openingLoading,
    refetch,
  } = useOpeningBalances({ period });

  // 设置期初余额
  const setOpeningBalance = useSetOpeningBalance();

  // 结转期初余额
  const carryForward = useCarryForwardOpeningBalance();

  // 将期初余额数据转换为map便于查找
  const openingBalanceMap = useMemo(() => {
    const map = new Map<string, AccountOpeningBalance>();
    openingBalancesData?.data?.forEach((ob) => {
      map.set(ob.account_id, ob);
    });
    return map;
  }, [openingBalancesData]);

  // 按类别筛选科目
  const filteredAccounts = useMemo(() => {
    if (!accountsData?.data?.items) return [];
    return accountsData.data.items.filter((account) => {
      if (selectedCategory && account.category !== selectedCategory)
        return false;
      if (
        searchKeyword &&
        !account.name.includes(searchKeyword) &&
        !account.code.includes(searchKeyword)
      )
        return false;
      return true;
    });
  }, [accountsData, selectedCategory, searchKeyword]);

  // 计算合计
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    openingBalancesData?.data?.forEach((ob) => {
      totalDebit += ob.debit_balance || 0;
      totalCredit += ob.credit_balance || 0;
    });
    return { totalDebit, totalCredit };
  }, [openingBalancesData]);

  // 处理编辑余额
  const handleEditBalance = (account: Account) => {
    const ob = openingBalanceMap.get(account.id);
    setEditingAccountId(account.id);
    setEditDebitBalance(ob?.debit_balance || 0);
    setEditCreditBalance(ob?.credit_balance || 0);
  };

  // 处理保存余额
  const handleSaveBalance = async () => {
    if (!editingAccountId) return;
    await setOpeningBalance.mutateAsync({
      accountId: editingAccountId,
      data: {
        debit_balance: editDebitBalance,
        credit_balance: editCreditBalance,
        period,
      },
    });
    setEditingAccountId(null);
    refetch();
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditDebitBalance(0);
    setEditCreditBalance(0);
  };

  // 处理结转
  const handleCarryForward = async () => {
    if (!carryForwardFrom || !carryForwardTo) return;
    await carryForward.mutateAsync({
      from_period: carryForwardFrom,
      to_period: carryForwardTo,
    });
    setShowCarryForwardModal(false);
    setPeriod(carryForwardTo);
  };

  // 表格列定义
  const columns = [
    {
      id: "code",
      header: "科目编码",
      accessorKey: "code",
      cell: ({ row }: { row: Account }) => (
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm">{row.code}</span>
        </div>
      ),
    },
    {
      id: "name",
      header: "科目名称",
      accessorKey: "name",
      cell: ({ row }: { row: Account }) => (
        <div>
          <span className="font-medium">{row.name}</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={CATEGORY_CONFIG[row.category]?.color}>
              {CATEGORY_CONFIG[row.category]?.label}
            </Badge>
            <span
              className={`text-sm ${BALANCE_DIRECTION_CONFIG[row.balance_direction]?.color}`}
            >
              {BALANCE_DIRECTION_CONFIG[row.balance_direction]?.label}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "has_children",
      header: "明细",
      accessorKey: "has_children",
      cell: ({ row }: { row: Account }) =>
        row.has_children ? (
          <span className="text-gray-400 text-sm">明细科目</span>
        ) : (
          <span className="text-gray-400 text-sm">明细</span>
        ),
    },
    {
      id: "opening_balance",
      header: "期初余额",
      cell: ({ row }: { row: Account }) => {
        if (row.has_children) {
          return <span className="text-gray-400">-</span>;
        }
        if (editingAccountId === row.id) {
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-32"
                value={editDebitBalance}
                onChange={(e) =>
                  setEditDebitBalance(parseFloat(e.target.value) || 0)
                }
                placeholder="借方"
              />
              <span className="text-gray-400">/</span>
              <Input
                type="number"
                className="w-32"
                value={editCreditBalance}
                onChange={(e) =>
                  setEditCreditBalance(parseFloat(e.target.value) || 0)
                }
                placeholder="贷方"
              />
              <Button size="sm" onClick={handleSaveBalance}>
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                取消
              </Button>
            </div>
          );
        }
        const ob = openingBalanceMap.get(row.id);
        return (
          <div className="flex items-center gap-4 font-mono">
            <span className="text-blue-600">
              {ob?.debit_balance?.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
              }) || "0.00"}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-red-600">
              {ob?.credit_balance?.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
              }) || "0.00"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditBalance(row)}
            >
              <Calculator className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            期初余额管理
          </h1>
          <p className="text-gray-500 mt-1">
            设置会计科目的期初余额，用于新会计期间初始化
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCarryForwardModal(true)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            结转余额
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                会计期间
              </label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                科目类别
              </label>
              <Select
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v as AccountCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类别</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="科目编码或名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 期初余额汇总 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">借方合计</p>
                <p className="text-2xl font-bold font-mono text-blue-600 mt-1">
                  ¥
                  {totals.totalDebit.toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">贷方合计</p>
                <p className="text-2xl font-bold font-mono text-red-600 mt-1">
                  ¥
                  {totals.totalCredit.toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">差额</p>
                <p
                  className={`text-2xl font-bold font-mono mt-1 ${
                    totals.totalDebit - totals.totalCredit === 0
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  ¥
                  {Math.abs(
                    totals.totalDebit - totals.totalCredit,
                  ).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  totals.totalDebit - totals.totalCredit === 0
                    ? "bg-green-100"
                    : "bg-orange-100"
                }`}
              >
                {totals.totalDebit - totals.totalCredit === 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 余额表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            科目期初余额
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">科目编码</TableHead>
                <TableHead>科目名称</TableHead>
                <TableHead className="w-[100px]">明细</TableHead>
                <TableHead className="text-right">期初余额（借/贷）</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => {
                const ob = openingBalanceMap.get(account.id);
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">
                          {account.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{account.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={CATEGORY_CONFIG[account.category]?.color}
                        >
                          {CATEGORY_CONFIG[account.category]?.label}
                        </Badge>
                        <span
                          className={`text-sm ${
                            BALANCE_DIRECTION_CONFIG[account.balance_direction]
                              ?.color
                          }`}
                        >
                          {
                            BALANCE_DIRECTION_CONFIG[account.balance_direction]
                              ?.label
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.has_children ? (
                        <span className="text-gray-400 text-sm">明细科目</span>
                      ) : (
                        <span className="text-gray-400 text-sm">明细</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.has_children ? (
                        <span className="text-gray-400">-</span>
                      ) : editingAccountId === account.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            className="w-28"
                            value={editDebitBalance}
                            onChange={(e) =>
                              setEditDebitBalance(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="借方"
                          />
                          <span className="text-gray-400">/</span>
                          <Input
                            type="number"
                            className="w-28"
                            value={editCreditBalance}
                            onChange={(e) =>
                              setEditCreditBalance(
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="贷方"
                          />
                          <Button size="sm" onClick={handleSaveBalance}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-4 font-mono">
                          <span className="text-blue-600">
                            {ob?.debit_balance?.toLocaleString("zh-CN", {
                              minimumFractionDigits: 2,
                            }) || "0.00"}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">
                            {ob?.credit_balance?.toLocaleString("zh-CN", {
                              minimumFractionDigits: 2,
                            }) || "0.00"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditBalance(account)}
                          >
                            <Calculator className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 结转余额Modal */}
      {showCarryForwardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>结转期初余额</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">
                  从期间
                </label>
                <Input
                  type="month"
                  value={carryForwardFrom}
                  onChange={(e) => setCarryForwardFrom(e.target.value)}
                  placeholder="选择源期间"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">
                  到期间
                </label>
                <Input
                  type="month"
                  value={carryForwardTo}
                  onChange={(e) => setCarryForwardTo(e.target.value)}
                  placeholder="选择目标期间"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">注意事项</p>
                    <ul className="mt-2 space-y-1">
                      <li>• 结转会将源期间的期末余额作为目标期间的期初余额</li>
                      <li>• 目标期间原有的期初余额将被覆盖</li>
                      <li>• 请确认后再操作</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCarryForwardModal(false)}
              >
                取消
              </Button>
              <Button onClick={handleCarryForward}>确认结转</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
