import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
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
    return (
      <Chip
        size="small"
        variant={s.variant === "outline" ? "outlined" : "filled"}
        label={s.label}
      />
    );
  };

  if (loading) {
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
        <Box
          sx={{
            animation: "spin 1s linear infinite",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: 8,
            borderColor: "primary.main",
            borderTopColor: "transparent",
          }}
        />
      </Box>
    );
  }

  if (!supplier) {
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* 顶部导航 */}
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="text" onClick={() => navigate("/srm/suppliers")}>
              <ArrowLeft sx={{ width: 16, height: 16, mr: 1 }} />
              返回
            </Button>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                供应商详情
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                查看和编辑供应商档案信息
              </Typography>
            </Box>
            <Box sx={{ ml: "auto" }}>
              <Button onClick={() => setIsEditing(!isEditing)}>
                <Edit2 sx={{ width: 16, height: 16, mr: 1 }} />
                编辑
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
        {/* 供应商概览卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
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
                <Truck sx={{ width: 32, height: 32 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {supplier.name}
                  </Typography>
                  {getStatusBadge(supplier.status)}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    fontSize: "0.875rem",
                    color: "text.secondary",
                  }}
                >
                  {supplier.short_name && (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <FileText sx={{ width: 16, height: 16 }} />
                      {supplier.short_name}
                    </Box>
                  )}
                  {supplier.contact_name && (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <FileText sx={{ width: 16, height: 16 }} />
                      {supplier.contact_name}
                    </Box>
                  )}
                  {supplier.email && (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Mail sx={{ width: 16, height: 16 }} />
                      {supplier.email}
                    </Box>
                  )}
                  {supplier.contact_phone && (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Phone sx={{ width: 16, height: 16 }} />
                      {supplier.contact_phone}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 财务概览 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.2s" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{ p: 1, borderRadius: "50%", bgcolor: "primary.light" }}
                >
                  <CreditCard sx={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    应付账款
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatCurrency(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.2s" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: "50%", bgcolor: "error.light" }}>
                  <Clock sx={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    逾期应付
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "error.main" }}
                  >
                    {formatCurrency(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.2s" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{ p: 1, borderRadius: "50%", bgcolor: "success.light" }}
                >
                  <TrendingUp sx={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    累计采购
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    {formatCurrency(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{ "&:hover": { boxShadow: 3 }, transition: "box-shadow 0.2s" }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{ p: 1, borderRadius: "50%", bgcolor: "warning.light" }}
                >
                  <Wallet sx={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    累计付款
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "warning.main" }}
                  >
                    {formatCurrency(0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 基本信息 */}
        <Card sx={{ mb: 3 }}>
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
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  供应商名称
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  简称
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.short_name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  联系人
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.contact_name || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  联系电话
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.contact_phone || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  邮箱
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.email || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  银行账户
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.bank_account || "-"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  地址
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.address || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  税号
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.tax_number || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier.status)}</Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 财务信息 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
            gap: 3,
            mb: 3,
          }}
        >
          {/* 付款条款 */}
          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                付款条款
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  付款方式
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>-</Typography>
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
                <Typography sx={{ color: "text.secondary" }}>
                  付款期限
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>-</Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  信用额度
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>-</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 应付款概览 */}
          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                应付款概览
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  应付账款
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "warning.main" }}>
                  {formatCurrency(0)}
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
                <Typography sx={{ color: "text.secondary" }}>
                  逾期应付
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "error.main" }}>
                  {formatCurrency(0)}
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
                <Typography sx={{ color: "text.secondary" }}>
                  平均付款天数
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>0 天</Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  最后交易日期
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>-</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 交易统计 */}
          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                交易统计
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  累计采购
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "success.main" }}>
                  {formatCurrency(0)}
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
                <Typography sx={{ color: "text.secondary" }}>
                  累计付款
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "info.main" }}>
                  {formatCurrency(0)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  应付余额
                </Typography>
                <Typography sx={{ fontWeight: 500, color: "warning.main" }}>
                  {formatCurrency(0)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 银行账户信息 */}
          <Card>
            <CardHeader sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                银行账户信息
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  开户银行
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>-</Typography>
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
                <Typography sx={{ color: "text.secondary" }}>
                  银行账号
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.bank_account || "-"}
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
                <Typography sx={{ color: "text.secondary" }}>税号</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {supplier.tax_number || "-"}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", py: 1 }}
              >
                <Typography sx={{ color: "text.secondary" }}>
                  供应商状态
                </Typography>
                <Chip
                  size="small"
                  variant={supplier.status === "active" ? "filled" : "outlined"}
                  label={
                    supplier.status === "active"
                      ? "正常"
                      : supplier.status || "-"
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 采购发票 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            sx={{
              pb: 1,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              采购发票列表
            </Typography>
            <Button variant="outlined" size="small">
              <Receipt sx={{ width: 16, height: 16, mr: 1 }} />
              新建发票
            </Button>
          </CardHeader>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead>发票号</TableHead>
                  <TableHead sx={{ textAlign: "right" }}>金额</TableHead>
                  <TableHead sx={{ textAlign: "right" }}>税额</TableHead>
                  <TableHead sx={{ textAlign: "right" }}>价税合计</TableHead>
                  <TableHead>发票日期</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={7}
                    sx={{ textAlign: "center", py: 6, color: "text.secondary" }}
                  >
                    暂无发票数据
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 付款记录 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            sx={{
              pb: 1,
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              付款记录列表
            </Typography>
            <Button variant="outlined" size="small">
              <DollarSign sx={{ width: 16, height: 16, mr: 1 }} />
              新建付款
            </Button>
          </CardHeader>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead>付款单号</TableHead>
                  <TableHead sx={{ textAlign: "right" }}>付款金额</TableHead>
                  <TableHead>付款方式</TableHead>
                  <TableHead>付款日期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ textAlign: "center", py: 6, color: "text.secondary" }}
                  >
                    暂无付款记录数据
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                gap: 2,
              }}
            >
              <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  创建时间
                </Typography>
                <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                  {new Date(supplier.created_at).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  更新时间
                </Typography>
                <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                  {new Date(supplier.updated_at).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  供应商ID
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 500,
                    mt: 0.5,
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {supplier.id.substring(0, 8)}...
                </Typography>
              </Box>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(supplier.status)}</Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default SupplierDetailPage;
