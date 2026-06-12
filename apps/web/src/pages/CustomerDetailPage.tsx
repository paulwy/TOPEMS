import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
  Edit2,
  Save,
  X,
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
import { Progress } from "@/components/ui/progress";
import { crmApi } from "@/api/crm";
import { crmFinanceApi } from "@/api/crm-finance";
import {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
} from "@/hooks/useCrmFinance";
import { useNotification } from "@/hooks/useNotification";
import type { Customer } from "@/api/crm";

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 财务数据
  const { data: financeInfo, isLoading: financeLoading } =
    useCustomerFinanceInfo(id || "");
  const { data: invoicesData } = useSalesInvoices({
    customer_id: id,
    page_size: 10,
  });
  const { data: collectionsData } = useCollectionRecords({
    customer_id: id,
    page_size: 10,
  });

  useEffect(() => {
    if (id) {
      loadCustomer(id);
    }
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await crmApi.customers.get(customerId);
      if (res.success && res.data) {
        setCustomer(res.data);
      }
    } catch (err) {
      console.error("Failed to load customer:", err);
      error("加载客户信息失败");
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
      prospect: { label: "潜在", variant: "outline" },
      blocked: { label: "已冻结", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      draft: { label: "草稿", variant: "secondary" },
      approved: { label: "已审批", variant: "outline" },
      issued: { label: "已开具", variant: "default" },
      partially_received: { label: "部分收款", variant: "secondary" },
      received: { label: "已收款", variant: "default" },
      cancelled: { label: "已作废", variant: "destructive" },
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

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">客户不存在</p>
          <Button onClick={() => navigate("/crm/customers")} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const finInfo = financeInfo?.data;
  const invoices = invoicesData?.data?.items || [];
  const collections = collectionsData?.data?.items || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/crm/customers")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">客户详情</h1>
              <p className="text-sm text-gray-500">查看和编辑客户档案信息</p>
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
        {/* 客户概览卡片 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {customer.name}
                  </h2>
                  {getStatusBadge(customer.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {customer.code || "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {customer.industry || "-"}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
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
                  <p className="text-sm text-gray-500">信用额度</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(finInfo?.credit_limit)}
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
                  <p className="text-sm text-gray-500">应收账款</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(finInfo?.accounts_receivable)}
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
                  <p className="text-sm text-gray-500">逾期应收</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(finInfo?.overdue_receivable)}
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
                  <p className="text-sm text-gray-500">累计销售额</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(finInfo?.total_sales)}
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
              销售发票
            </TabsTrigger>
            <TabsTrigger
              value="collections"
              className="data-[state=active]:bg-white"
            >
              收款记录
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
                    <Label className="text-sm text-gray-500">客户名称</Label>
                    <p className="font-medium mt-1">{customer.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">客户代码</Label>
                    <p className="font-medium mt-1">{customer.code || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">行业</Label>
                    <p className="font-medium mt-1">
                      {customer.industry || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">网站</Label>
                    <p className="font-medium mt-1">
                      {customer.website || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">邮箱</Label>
                    <p className="font-medium mt-1">{customer.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">电话</Label>
                    <p className="font-medium mt-1">{customer.phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm text-gray-500">地址</Label>
                    <p className="font-medium mt-1">
                      {customer.address || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">状态</Label>
                    <div className="mt-1">
                      {getStatusBadge(customer.status)}
                    </div>
                  </div>
                </div>
                {customer.notes && (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-500">备注</Label>
                    <p className="mt-1 text-gray-700">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 财务信息 */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 信用管理 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">信用管理</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">信用额度</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(finInfo?.credit_limit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">信用期限（天）</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.credit_term_days || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">付款条款</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.payment_terms || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">客户状态</span>
                    <Badge
                      variant={
                        finInfo?.status === "normal" ? "default" : "secondary"
                      }
                    >
                      {finInfo?.status === "normal"
                        ? "正常"
                        : finInfo?.status || "-"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 应收款概览 */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">应收款概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">应收账款</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(finInfo?.accounts_receivable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">逾期应收</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(finInfo?.overdue_receivable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">平均回款天数</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.avg_collection_days || 0} 天
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">最后交易日期</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(finInfo?.last_transaction_date)}
                    </span>
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
                    <span className="text-gray-500">累计销售额</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(finInfo?.total_sales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">累计收款</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(finInfo?.total_received)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">应收余额</span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(
                        (finInfo?.accounts_receivable || 0) -
                          (finInfo?.total_received || 0),
                      )}
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
                    <span className="font-medium text-gray-900">
                      {finInfo?.bank_name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">银行账号</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.bank_account || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">账户名称</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.account_name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">税号</span>
                    <span className="font-medium text-gray-900">
                      {finInfo?.tax_number || "-"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 销售发票 */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">销售发票列表</CardTitle>
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
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-12 text-gray-500"
                        >
                          暂无发票数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice: any) => (
                        <TableRow key={invoice.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {invoice.invoice_no}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.tax_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell>
                            {formatDate(invoice.invoice_date)}
                          </TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            {getInvoiceStatusBadge(invoice.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 收款记录 */}
          <TabsContent value="collections" className="space-y-4">
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">收款记录列表</CardTitle>
                <Button variant="outline" size="sm">
                  <DollarSign className="w-4 h-4 mr-2" />
                  新建收款
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>收款单号</TableHead>
                      <TableHead className="text-right">收款金额</TableHead>
                      <TableHead>收款方式</TableHead>
                      <TableHead>收款日期</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-12 text-gray-500"
                        >
                          暂无收款记录数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      collections.map((record: any) => (
                        <TableRow key={record.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {record.collection_no}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(record.amount)}
                          </TableCell>
                          <TableCell>
                            {record.payment_method === "bank_transfer"
                              ? "银行转账"
                              : record.payment_method === "cash"
                                ? "现金"
                                : record.payment_method === "credit"
                                  ? "信用"
                                  : "其他"}
                          </TableCell>
                          <TableCell>
                            {formatDate(record.collection_date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "matched"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {record.status === "matched"
                                ? "已核销"
                                : record.status === "recorded"
                                  ? "已记录"
                                  : "已取消"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
                {new Date(customer.created_at).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">更新时间</p>
              <p className="font-medium mt-1">
                {new Date(customer.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">客户ID</p>
              <p className="font-medium mt-1 font-mono text-sm">
                {customer.id.substring(0, 8)}...
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">状态</p>
              <div className="mt-1">{getStatusBadge(customer.status)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
