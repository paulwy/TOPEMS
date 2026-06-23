import { Card, CardContent, CardHeader, Chip, Typography, Box, Table, TableBody, TableCell, TableHead, TableRow, Paper,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  Mail,
  Phone,
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
import { scmApi } from "@/api/modules/scm/scm";
import { useNotification } from "@/hooks/useNotification";
import type { Supplier } from "@/api/modules/scm/scm";
import { apiLogger } from "@/utils/logger";
import { DetailPageTemplate, type SectionConfig } from "@/components/templates";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadSupplier = async (supplierId: string) => {
    setLoading(true);
    try {
      const res = await scmApi.suppliers.get(supplierId);
      if (res.success && res.data) {
        setSupplier(res.data);
      }
    } catch (err) {
      apiLogger.error("Failed to load supplier:", err);
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
    return (
      <Chip
        size="small"
        variant={s.variant === "outline" ? "outlined" : "filled"}
        label={s.label}
      />
    );
  };

  const statsData = [
    {
      label: "应付账款",
      value: formatCurrency(0),
      icon: CreditCard,
      color: "primary",
    },
    {
      label: "逾期应付",
      value: formatCurrency(0),
      icon: Clock,
      color: "error",
    },
    {
      label: "累计采购",
      value: formatCurrency(0),
      icon: TrendingUp,
      color: "success",
    },
    {
      label: "累计付款",
      value: formatCurrency(0),
      icon: Wallet,
      color: "warning",
    },
  ];

  const basicInfoItems = [
    { label: "供应商名称", value: supplier?.name },
    { label: "简称", value: supplier?.short_name || "-" },
    { label: "联系人", value: supplier?.contact_name || "-" },
    { label: "联系电话", value: supplier?.contact_phone || "-" },
    { label: "邮箱", value: supplier?.email || "-" },
    { label: "银行账户", value: supplier?.bank_account || "-" },
    { label: "地址", value: supplier?.address || "-" },
    { label: "税号", value: supplier?.tax_number || "-" },
    { label: "状态", value: getStatusBadge(supplier?.status || "") },
  ];

  const paymentTermsItems = [
    { label: "付款方式", value: "-" },
    { label: "付款期限", value: "-" },
    { label: "信用额度", value: "-" },
  ];

  const payableOverviewItems = [
    { label: "应付账款", value: formatCurrency(0), color: "warning.main" },
    { label: "逾期应付", value: formatCurrency(0), color: "error.main" },
    { label: "平均付款天数", value: "0 天" },
    { label: "最后交易日期", value: "-" },
  ];

  const transactionStatsItems = [
    { label: "累计采购", value: formatCurrency(0), color: "success.main" },
    { label: "累计付款", value: formatCurrency(0), color: "info.main" },
    { label: "应付余额", value: formatCurrency(0), color: "warning.main" },
  ];

  const bankInfoItems = [
    { label: "开户银行", value: "-" },
    { label: "银行账号", value: supplier?.bank_account || "-" },
    { label: "税号", value: supplier?.tax_number || "-" },
    {
      label: "供应商状态",
      value: supplier?.status === "active" ? "正常" : supplier?.status || "-",
    },
  ];

  const invoiceColumns = [
    { id: "invoice_no", label: "发票号" },
    { id: "amount", label: "金额", align: "right" as const },
    { id: "tax_amount", label: "税额", align: "right" as const },
    { id: "total", label: "价税合计", align: "right" as const },
    { id: "invoice_date", label: "发票日期" },
    { id: "due_date", label: "到期日" },
    { id: "status", label: "状态" },
  ];

  const paymentColumns = [
    { id: "payment_no", label: "付款单号" },
    { id: "amount", label: "付款金额", align: "right" as const },
    { id: "method", label: "付款方式" },
    { id: "date", label: "付款日期" },
    { id: "status", label: "状态" },
  ];

  const footerInfoItems = [
    {
      label: "创建时间",
      value: supplier?.created_at
        ? new Date(supplier.created_at).toLocaleString()
        : "-",
    },
    {
      label: "更新时间",
      value: supplier?.updated_at
        ? new Date(supplier.updated_at).toLocaleString()
        : "-",
    },
    {
      label: "供应商ID",
      value: supplier?.id ? `${supplier.id.substring(0, 8)}...` : "-",
    },
    { label: "状态", value: getStatusBadge(supplier?.status || "") },
  ];

  const renderGridItem = (item: { label: string; value: React.ReactNode }) => (
    <Box key={item.label}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {item.label}
      </Typography>
      <Typography sx={{ fontWeight: 500 }}>{item.value}</Typography>
    </Box>
  );

  const renderListItem = (item: {
    label: string;
    value: string;
    color?: string;
  }) => (
    <Box
      key={item.label}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography sx={{ color: "text.secondary" }}>{item.label}</Typography>
      <Typography sx={{ fontWeight: 500, color: item.color }}>
        {item.value}
      </Typography>
    </Box>
  );

  const renderTable = (
    columns: {
      id: string;
      label: string;
      align?: "left" | "center" | "right";
    }[],
  ) => (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col.id} align={col.align}>
              {col.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={columns.length}
            sx={{ textAlign: "center", py: 6, color: "text.secondary" }}
          >
            暂无数据
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const sections: SectionConfig[] = [
    {
      id: "basic-info",
      title: "基本信息",
      content: (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {basicInfoItems.map(renderGridItem)}
        </Box>
      ),
    },
    {
      id: "payment-terms",
      title: "付款条款",
      content: <Box>{paymentTermsItems.map(renderListItem)}</Box>,
    },
    {
      id: "payable-overview",
      title: "应付款概览",
      content: <Box>{payableOverviewItems.map(renderListItem)}</Box>,
    },
    {
      id: "transaction-stats",
      title: "交易统计",
      content: <Box>{transactionStatsItems.map(renderListItem)}</Box>,
    },
    {
      id: "bank-info",
      title: "银行账户信息",
      content: <Box>{bankInfoItems.map(renderListItem)}</Box>,
    },
    {
      id: "purchase-invoices",
      title: "采购发票列表",
      content: <Box sx={{ p: 0 }}>{renderTable(invoiceColumns)}</Box>,
    },
    {
      id: "payment-records",
      title: "付款记录列表",
      content: <Box sx={{ p: 0 }}>{renderTable(paymentColumns)}</Box>,
    },
    {
      id: "footer-info",
      title: "",
      content: (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {footerInfoItems.map((item, index) => (
            <Box
              key={index}
              sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      ),
    },
  ];

  if (!loading && !supplier) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "slate.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <AlertCircle
            sx={{
              width: 48,
              height: 48,
              color: "grey.400",
              mx: "auto",
              mb: 1.5,
            }}
          />
          <Typography sx={{ color: "grey.500" }}>供应商不存在</Typography>
          <Button onClick={() => navigate("/srm/suppliers")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <DetailPageTemplate
      title="供应商详情"
      subtitle="查看和编辑供应商档案信息"
      loading={loading}
      backHref="/srm/suppliers"
      onBack={() => navigate("/srm/suppliers")}
      onEdit={() => setIsEditing(!isEditing)}
      infoCard={
        supplier
          ? {
              avatar: <Truck sx={{ width: 32, height: 32 }} />,
              title: supplier.name,
              subtitle: supplier.short_name,
              tags: [
                supplier.contact_name,
                supplier.contact_phone,
                supplier.email,
              ].filter((tag): tag is string => Boolean(tag)),
              stats: statsData.map((stat) => ({
                label: stat.label,
                value: stat.value,
              })),
            }
          : undefined
      }
      sections={sections}
    />
  );
};

export default SupplierDetailPage;
