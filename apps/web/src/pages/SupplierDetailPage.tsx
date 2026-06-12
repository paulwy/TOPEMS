import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Edit2,
  FileText,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { scmApi } from "@/api/scm";
import { useNotification } from "@/hooks/useNotification";
import type { Supplier } from "@/api/scm";

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotification();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      loadSupplier(id);
    }
  }, [id]);

  const loadSupplier = async (supplierId: string) => {
    setLoading(true);
    try {
      const res = await scmApi.suppliers.get(supplierId);
      if (res.success && res.data) {
        setSupplier(res.data);
      }
    } catch (err) {
      console.error("Failed to load supplier:", err);
      error("加载供应商信息失败");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "¥0";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      active: { label: "活跃", variant: "default" },
      inactive: { label: "非活跃", variant: "secondary" },
      blocked: { label: "已冻结", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">供应商不存在</p>
          <Button onClick={() => navigate("/srm/suppliers")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/srm/suppliers")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">供应商详情</h1>
              <p className="text-sm text-gray-500">查看和编辑供应商档案信息</p>
            </div>
            <div className="ml-auto">
              <Button onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="w-4 h-4 mr-2" />
                编辑
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 供应商概览卡片 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {supplier.name}
                  </h2>
                  {getStatusBadge(supplier.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {supplier.short_name && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {supplier.short_name}
                    </span>
                  )}
                  {supplier.contact_name && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {supplier.contact_name}
                    </span>
                  )}
                  {supplier.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {supplier.email}
                    </span>
                  )}
                  {supplier.contact_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {supplier.contact_phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 财务概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">应付账款</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">逾期应付</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">累计采购</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">累计付款</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="basic" className="data-[state=active]:bg-white">
              基本信息
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="data-[state=active]:bg-white"
            >
              财务信息
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="data-[state=active]:bg-white"
            >
              采购发票
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-white"
            >
              付款记录
            </TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">供应商名称</Label>
                    <p className="font-medium mt-1">{supplier.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">简称</Label>
                    <p className="font-medium mt-1">
                      {supplier.short_name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">联系人</Label>
                    <p className="font-medium mt-1">
                      {supplier.contact_name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">联系电话</Label>
                    <p className="font-medium mt-1">
                      {supplier.contact_phone || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">邮箱</Label>
                    <p className="font-medium mt-1">{supplier.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">银行账户</Label>
                    <p className="font-medium mt-1">
                      {supplier.bank_account || "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm text-gray-500">地址</Label>
                    <p className="font-medium mt-1">
                      {supplier.address || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">税号</Label>
                    <p className="font-medium mt-1">
                      {supplier.tax_number || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">状态</Label>
                    <div className="mt-1">
                      {getStatusBadge(supplier.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 财务信息 */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 付款条款 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">付款条款</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">付款方式</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">付款期限</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">信用额度</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                </CardContent>
              </Card>

              {/* 应付款概览 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">应付款概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">应付账款</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">逾期应付</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">平均付款天数</span>
                    <span className="font-medium text-gray-900">0 天</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">最后交易日期</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                </CardContent>
              </Card>

              {/* 交易统计 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">交易统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">累计采购</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">累计付款</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">应付余额</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 银行账户信息 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">银行账户信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">开户银行</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">银行账号</span>
                    <span className="font-medium text-gray-900">
                      {supplier.bank_account || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">税号</span>
                    <span className="font-medium text-gray-900">
                      {supplier.tax_number || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">供应商状态</span>
                    <Badge
                      variant={
                        supplier.status === "active" ? "default" : "secondary"
                      }
                    >
                      {supplier.status === "active"
                        ? "正常"
                        : supplier.status || "-"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 采购发票 */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">采购发票列表</CardTitle>
                <Button variant="outline" size="sm">
                  <Receipt className="w-4 h-4 mr-2" />
                  新建发票
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>发票号</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead className="text-right">税额</TableHead>
                      <TableHead className="text-right">价税合计</TableHead>
                      <TableHead>发票日期</TableHead>
                      <TableHead>到期日</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-gray-500"
                      >
                        暂无发票数据
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 付款记录 */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">付款记录列表</CardTitle>
                <Button variant="outline" size="sm">
                  <DollarSign className="w-4 h-4 mr-2" />
                  新建付款
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>付款单号</TableHead>
                      <TableHead className="text-right">付款金额</TableHead>
                      <TableHead>付款方式</TableHead>
                      <TableHead>付款日期</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-12 text-gray-500"
                      >
                        暂无付款记录数据
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 底部信息 */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">创建时间</p>
              <p className="font-medium mt-1">
                {new Date(supplier.created_at).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">更新时间</p>
              <p className="font-medium mt-1">
                {new Date(supplier.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">供应商ID</p>
              <p className="font-medium mt-1 font-mono text-sm">
                {supplier.id.substring(0, 8)}...
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">状态</p>
              <div className="mt-1">{getStatusBadge(supplier.status)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierDetailPage;
