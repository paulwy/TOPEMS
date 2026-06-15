/**
 * PmContractDetailPage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 MUI 组件重构布局
 * 3. 保持业务逻辑不变
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Building,
  CheckCircle,
} from "lucide-react";
import type {
  Contract,
  ContractMilestone,
  ContractPaymentSchedule,
} from "../api/pm";
import { pmApi } from "../api/pm";
import { PageHeader } from "../components/layout";

// ============ 状态映射 ============
const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  pending: "待审批",
  approved: "已批准",
  active: "执行中",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  draft: { bgcolor: "#f3f4f6", color: "#4b5563" },
  pending: { bgcolor: "#fef9c3", color: "#a16207" },
  approved: { bgcolor: "#e9d5ff", color: "#6b21a8" },
  active: { bgcolor: "#dcfce7", color: "#166534" },
  completed: { bgcolor: "#dbeafe", color: "#1e40af" },
  cancelled: { bgcolor: "#f3f4f6", color: "#374151" },
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  construction: "工程合同",
  service: "服务合同",
  purchase: "采购合同",
  sales: "销售合同",
};

// ============ 辅助函数 ============
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("zh-CN");
};

const formatCurrency = (amount?: number) => {
  if (!amount) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getMilestoneStatusSx = (status: string) => {
  if (status === "completed") {
    return { bgcolor: "#dcfce7", color: "#166534" };
  }
  if (status === "pending") {
    return { bgcolor: "#fef9c3", color: "#a16207" };
  }
  return { bgcolor: "#f3f4f6", color: "#374151" };
};

const getPaymentStatusSx = (status?: string) => {
  if (status === "paid") {
    return { bgcolor: "#dcfce7", color: "#166534" };
  }
  if (status === "pending") {
    return { bgcolor: "#fef9c3", color: "#a16207" };
  }
  if (status === "overdue") {
    return { bgcolor: "#fee2e2", color: "#991b1b" };
  }
  return { bgcolor: "#f3f4f6", color: "#374151" };
};

const getPaymentStatusLabel = (status?: string) => {
  if (status === "paid") return "已支付";
  if (status === "pending") return "待支付";
  if (status === "overdue") return "已逾期";
  return status || "-";
};

// ============ 组件 ============
const PmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [payments, setPayments] = useState<ContractPaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContractData = useCallback(async (contractId: string) => {
    setLoading(true);
    try {
      const [contractRes, milestonesRes, paymentsRes] = await Promise.all([
        pmApi.contracts.get(contractId),
        pmApi.contracts.milestones.list(contractId),
        pmApi.contracts.payments.list(contractId),
      ]);

      if (contractRes.success && contractRes.data) {
        setContract(contractRes.data);
      }
      if (milestonesRes.success && milestonesRes.data) {
        setMilestones(milestonesRes.data);
      }
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
    } catch (error) {
      console.error("Failed to load contract data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadContractData(id);
    }
  }, [id, loadContractData]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 384,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: theme.palette.primary.main,
            borderTopColor: "transparent",
            animation: "spin 1s linear infinite",
            "@keyframes spin": {
              to: { transform: "rotate(360deg)" },
            },
          }}
        />
      </Box>
    );
  }

  if (!contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: "grey.500" }}>合同不存在</Typography>
      </Box>
    );
  }

  const statusKey = contract.status || "draft";
  const statusSx = STATUS_COLORS[statusKey] || STATUS_COLORS.draft;

  return (
    <>
      <PageHeader
        title={contract.contract_name}
        subtitle={contract.contract_code}
        showBack
        onBack={() => navigate("/pm/contracts")}
        actions={
          <Button
            variant="contained"
            startIcon={<Edit style={{ width: 16, height: 16 }} />}
            onClick={() => navigate(`/pm/contracts/${id}/edit`)}
          >
            编辑
          </Button>
        }
      />

      <Box sx={{ p: 3 }}>
        {/* 状态概览卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: "#dbeafe", borderRadius: "50%" }}>
                  <FileText size={24} color="#3b82f6" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    合同状态
                  </Typography>
                  <Badge sx={{ bgcolor: statusSx.bgcolor, color: statusSx.color }}>
                    {STATUS_LABELS[statusKey] || contract.status}
                  </Badge>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: "#e9d5ff", borderRadius: "50%" }}>
                  <DollarSign size={24} color="#7c3aed" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    合同金额
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "grey.900" }}>
                    {formatCurrency(contract.amount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: "#dcfce7", borderRadius: "50%" }}>
                  <Building size={24} color="#16a34a" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    合同类型
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: "grey.900" }}>
                    {CONTRACT_TYPE_LABELS[contract.contract_type || ""] || contract.contract_type || "-"}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 合同详情卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                },
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500", mb: 0.5 }}>
                  甲方
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
                  <Building size={16} color="#9ca3af" />
                  {contract.party_a_name || "-"}
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500", mb: 0.5 }}>
                  乙方
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
                  <Building size={16} color="#9ca3af" />
                  {contract.party_b_name || "-"}
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500", mb: 0.5 }}>
                  签署日期
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
                  <Calendar size={16} color="#9ca3af" />
                  {formatDate(contract.signing_date)}
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500", mb: 0.5 }}>
                  到期日期
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
                  <Calendar size={16} color="#9ca3af" />
                  {formatDate(contract.end_date)}
                </Box>
              </Box>
            </Box>
            {contract.description && (
              <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "grey.200" }}>
                <Typography variant="body2" sx={{ color: "grey.500", mb: 1 }}>
                  合同描述
                </Typography>
                <Typography sx={{ color: "grey.700" }}>
                  {contract.description}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 合同里程碑 */}
        {milestones.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardHeader sx={{ pb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircle size={20} color="#3b82f6" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  合同里程碑
                </Typography>
              </Box>
            </CardHeader>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 3 }}>
                {milestones.map((milestone) => (
                  <Box
                    key={milestone.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "grey.200",
                      borderRadius: 2,
                      p: 2,
                      "&:hover": { borderColor: "#93c5fd" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontWeight: 500 }}>
                            {milestone.name}
                          </Typography>
                          <Badge sx={{ ...getMilestoneStatusSx(milestone.status || "") }}>
                            {milestone.status === "completed"
                              ? "已完成"
                              : milestone.status === "pending"
                                ? "进行中"
                                : milestone.status}
                          </Badge>
                        </Box>
                        {milestone.description && (
                          <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                            {milestone.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          目标日期
                        </Typography>
                        <Typography sx={{ fontWeight: 500 }}>
                          {formatDate(milestone.target_date)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#7c3aed", mt: 0.5 }}>
                          {formatCurrency(milestone.payment_amount)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 付款计划 */}
        {payments.length > 0 && (
          <Card>
            <CardHeader sx={{ pb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DollarSign size={20} color="#7c3aed" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  付款计划
                </Typography>
              </Box>
            </CardHeader>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHead>期次</TableHead>
                      <TableHead>付款日期</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>比例</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={payment.id} sx={{ "&:hover": { bgcolor: "grey.50" } }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                            第 {index + 1} 期
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: "grey.500" }}>
                          {formatDate(payment.due_date)}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                            {formatCurrency(payment.payment_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: "grey.500" }}>
                          {payment.payment_percent || 0}%
                        </TableCell>
                        <TableCell>
                          <Badge sx={getPaymentStatusSx(payment.status)}>
                            {getPaymentStatusLabel(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell sx={{ color: "grey.500" }}>
                          -
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};

export default PmContractDetailPage;
