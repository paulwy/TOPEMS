/**
 * CustomerDetailPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 保持现有的 Tab 布局结构
 * 3. 主题色使用蓝色 (#3b82f6)
 */

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  FileText,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  Clock,
  Edit,
} from "lucide-react";
import { InputLabel } from "@mui/material";
import { crmApi } from "@/api/crm";
import { crmFinanceApi } from "@/api/crm-finance";
import {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
} from "@/hooks/useCrmFinance";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/layout";
import type { Customer } from "@/api/crm";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotification();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // 财务数据
  const { data: financeInfo } = useCustomerFinanceInfo(id || "");
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
        color:
          | "default"
          | "primary"
          | "secondary"
          | "error"
          | "info"
          | "success"
          | "warning";
      }
    > = {
      active: { label: "活跃", color: "success" },
      inactive: { label: "非活跃", color: "default" },
      prospect: { label: "潜在", color: "info" },
      blocked: { label: "已冻结", color: "error" },
    };
    const s = statusMap[status] || { label: status, color: "default" };
    return <Chip size="small" color={s.color} label={s.label} />;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color:
          | "default"
          | "primary"
          | "secondary"
          | "error"
          | "info"
          | "success"
          | "warning";
      }
    > = {
      draft: { label: "草稿", color: "default" },
      approved: { label: "已审批", color: "info" },
      issued: { label: "已开具", color: "success" },
      partially_received: { label: "部分收款", color: "warning" },
      received: { label: "已收款", color: "success" },
      cancelled: { label: "已作废", color: "error" },
    };
    const s = statusMap[status] || { label: status, color: "default" };
    return <Chip size="small" color={s.color} label={s.label} />;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            客户不存在
          </Typography>
          <Button onClick={() => navigate("/crm/customers")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  const finInfo = financeInfo?.data;
  const invoices = invoicesData?.data?.items || [];
  const collections = collectionsData?.data?.items || [];

  return (
    <>
      <PageHeader
        title="客户详情"
        subtitle="查看和编辑客户档案信息"
        showBack
        onBack={() => navigate("/crm/customers")}
        actions={[
          {
            label: "编辑",
            variant: "contained",
            icon: <Edit style={{ width: 18, height: 18 }} />,
            onClick: () => navigate(`/crm/customers/${id}/edit`),
          },
        ]}
      />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        {/* 客户概览卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardContent
            sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={32} color="#3b82f6" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {customer.name}
                </Typography>
                {getStatusBadge(customer.status)}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  color: "text.secondary",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <FileText size={14} />
                  {customer.code || "-"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <Building2 size={14} />
                  {customer.industry || "-"}
                </Typography>
                {customer.email && (
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Mail size={14} />
                    {customer.email}
                  </Typography>
                )}
                {customer.phone && (
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Phone size={14} />
                    {customer.phone}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 财务概览 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.3s" }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "primary.light" }}>
                <CreditCard size={20} color="#3b82f6" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  信用额度
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {formatCurrency(finInfo?.credit_limit)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.3s" }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "warning.light" }}>
                <Wallet size={20} color="#ed6c02" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  应收账款
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "warning.main" }}
                >
                  {formatCurrency(finInfo?.accounts_receivable)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.3s" }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "error.light" }}>
                <Clock size={20} color="#d32f2f" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  逾期应收
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "error.main" }}
                >
                  {formatCurrency(finInfo?.overdue_receivable)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.3s" }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "success.light" }}>
                <TrendingUp size={20} color="#2e7d32" />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  累计销售额
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "success.main" }}
                >
                  {formatCurrency(finInfo?.total_sales)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 标签页 */}
        <Card>
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "grey.100",
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ px: 2 }}
            >
              <Tab label="基本信息" />
              <Tab label="财务信息" />
              <Tab label="销售发票" />
              <Tab label="收款记录" />
            </Tabs>
          </Box>

          {/* 基本信息 */}
          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  基本信息
                </Typography>
              </CardHeader>
              <CardContent>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      客户名称
                    </InputLabel>
                    <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                      {customer.name}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      客户代码
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.code || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      行业
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.industry || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      网站
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.website || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      邮箱
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.email || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      电话
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.phone || "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: "span 2" }}>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      地址
                    </InputLabel>
                    <Typography sx={{ mt: 0.5 }}>
                      {customer.address || "-"}
                    </Typography>
                  </Box>
                  <Box>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      状态
                    </InputLabel>
                    <Box sx={{ mt: 0.5 }}>
                      {getStatusBadge(customer.status)}
                    </Box>
                  </Box>
                </Box>
                {customer.notes && (
                  <Box sx={{ mt: 3 }}>
                    <InputLabel sx={{ fontSize: 12, color: "text.secondary" }}>
                      备注
                    </InputLabel>
                    <Typography sx={{ mt: 0.5, color: "text.secondary" }}>
                      {customer.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          {/* 财务信息 */}
          <TabPanel value={tabValue} index={1}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, lg: "repeat(2, 1fr)" },
                gap: 3,
              }}
            >
              {/* 信用管理 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    信用管理
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">信用额度</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {formatCurrency(finInfo?.credit_limit)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">
                      信用期限（天）
                    </Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.credit_term_days || 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">付款条款</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.payment_terms || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                    }}
                  >
                    <Typography color="text.secondary">客户状态</Typography>
                    <Chip
                      size="small"
                      color={
                        finInfo?.status === "normal" ? "success" : "default"
                      }
                      label={
                        finInfo?.status === "normal"
                          ? "正常"
                          : finInfo?.status || "-"
                      }
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* 应收款概览 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    应收款概览
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">应收账款</Typography>
                    <Typography
                      sx={{ fontWeight: "medium", color: "warning.main" }}
                    >
                      {formatCurrency(finInfo?.accounts_receivable)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">逾期应收</Typography>
                    <Typography
                      sx={{ fontWeight: "medium", color: "error.main" }}
                    >
                      {formatCurrency(finInfo?.overdue_receivable)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">平均回款天数</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.avg_collection_days || 0} 天
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                    }}
                  >
                    <Typography color="text.secondary">最后交易日期</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {formatDate(finInfo?.last_transaction_date)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* 交易统计 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    交易统计
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">累计销售额</Typography>
                    <Typography
                      sx={{ fontWeight: "medium", color: "success.main" }}
                    >
                      {formatCurrency(finInfo?.total_sales)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">累计收款</Typography>
                    <Typography
                      sx={{ fontWeight: "medium", color: "primary.main" }}
                    >
                      {formatCurrency(finInfo?.total_received)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                    }}
                  >
                    <Typography color="text.secondary">应收余额</Typography>
                    <Typography
                      sx={{ fontWeight: "medium", color: "warning.main" }}
                    >
                      {formatCurrency(
                        (finInfo?.accounts_receivable || 0) -
                          (finInfo?.total_received || 0),
                      )}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* 银行账户信息 */}
              <Card>
                <CardHeader sx={{ pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    银行账户信息
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">开户银行</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.bank_name || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">银行账号</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.bank_account || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography color="text.secondary">账户名称</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.account_name || "-"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                    }}
                  >
                    <Typography color="text.secondary">税号</Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {finInfo?.tax_number || "-"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* 销售发票 */}
          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  销售发票列表
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Receipt size={16} />}
                >
                  新建发票
                </Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>发票号</TableCell>
                      <TableCell align="right">金额</TableCell>
                      <TableCell align="right">税额</TableCell>
                      <TableCell align="right">价税合计</TableCell>
                      <TableCell>发票日期</TableCell>
                      <TableCell>到期日</TableCell>
                      <TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          align="center"
                          sx={{ py: 8, color: "text.secondary" }}
                        >
                          暂无发票数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice: any) => (
                        <TableRow key={invoice.id} hover>
                          <TableCell sx={{ fontWeight: "medium" }}>
                            {invoice.invoice_no}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(invoice.tax_amount)}
                          </TableCell>
                          <TableCell align="right">
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
          </TabPanel>

          {/* 收款记录 */}
          <TabPanel value={tabValue} index={3}>
            <Card>
              <CardHeader
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  收款记录列表
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Wallet size={16} />}
                >
                  新建收款
                </Button>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>收款单号</TableCell>
                      <TableCell align="right">收款金额</TableCell>
                      <TableCell>收款方式</TableCell>
                      <TableCell>收款日期</TableCell>
                      <TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {collections.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="center"
                          sx={{ py: 8, color: "text.secondary" }}
                        >
                          暂无收款记录数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      collections.map((record: any) => (
                        <TableRow key={record.id} hover>
                          <TableCell sx={{ fontWeight: "medium" }}>
                            {record.collection_no}
                          </TableCell>
                          <TableCell align="right">
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
                            <Chip
                              size="small"
                              color={
                                record.status === "matched"
                                  ? "success"
                                  : record.status === "recorded"
                                    ? "info"
                                    : "default"
                              }
                              label={
                                record.status === "matched"
                                  ? "已核销"
                                  : record.status === "recorded"
                                    ? "已记录"
                                    : "已取消"
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabPanel>
        </Card>

        {/* 底部信息 */}
        <Card sx={{ mt: 3 }}>
          <CardContent
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                创建时间
              </Typography>
              <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                {new Date(customer.created_at).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                更新时间
              </Typography>
              <Typography sx={{ fontWeight: "medium", mt: 0.5 }}>
                {new Date(customer.updated_at).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                客户ID
              </Typography>
              <Typography
                sx={{
                  fontWeight: "medium",
                  mt: 0.5,
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                {customer.id.substring(0, 8)}...
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                状态
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getStatusBadge(customer.status)}</Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
};

export default CustomerDetailPage;
