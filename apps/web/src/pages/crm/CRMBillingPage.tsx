import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Typography } from "@mui/material";
import type { BillingRecord } from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Receipt, CheckCircle, Clock, AlertCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/templates";

const CRMBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "invoices" | "collections" | "aging"
  >("invoices");
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<BillingRecord[]>([]);

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadBills();
  }, [activeTab]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const status =
        activeTab === "collections"
          ? "paid"
          : activeTab === "invoices"
            ? "pending"
            : undefined;
      const response = await crmApi.billing.list(
        status ? { status } : undefined,
      );
      setBills(response.data?.items || []);
    } catch (error) {
      console.error("加载账单数据失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载账单数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await crmApi.billing.markPaid(id);
      addNotification({
        type: "success",
        title: "成功",
        message: "账单已标记为已支付",
      });
      loadBills();
    } catch (error) {
      console.error("标记支付失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "标记账单支付失败",
      });
    }
  };

  const handleSendNotification = async (id: string) => {
    try {
      await crmApi.billing.sendNotification(id);
      addNotification({
        type: "success",
        title: "成功",
        message: "账单通知已发送",
      });
    } catch (error) {
      console.error("发送通知失败:", error);
      addNotification({
        type: "error",
        title: "发送失败",
        message: "发送账单通知失败",
      });
    }
  };

  const getStatusChip = (status: string) => {
    const config: Record<
      string,
      { label: string; color: string; icon?: React.ReactElement }
    > = {
      pending: {
        label: "待支付",
        color: "warning.light",
        icon: <Clock sx={{ width: 14, height: 14 }} />,
      },
      paid: {
        label: "已支付",
        color: "success.light",
        icon: <CheckCircle sx={{ width: 14, height: 14 }} />,
      },
      overdue: {
        label: "已逾期",
        color: "error.light",
        icon: <AlertCircle sx={{ width: 14, height: 14 }} />,
      },
      cancelled: { label: "已取消", color: "grey.light" },
    };
    const cfg = config[status] || { label: status, color: "info.light" };
    return (
      <Chip
        size="small"
        label={cfg.label}
        icon={cfg.icon}
        sx={{ bgcolor: cfg.color }}
      />
    );
  };

  const getAgingStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 0) return { label: "正常", color: "success" };
    if (daysDiff <= 30) return { label: "30天内", color: "warning" };
    if (daysDiff <= 60) return { label: "60天内", color: "warning" };
    return { label: "90天以上", color: "error" };
  };

  const agingSummary = {
    normal: bills
      .filter((b) => getAgingStatus(b.due_date).color === "success")
      .reduce((sum, b) => sum + b.amount, 0),
    days30: bills
      .filter((b) => getAgingStatus(b.due_date).label === "30天内")
      .reduce((sum, b) => sum + b.amount, 0),
    days60: bills
      .filter((b) => getAgingStatus(b.due_date).label === "60天内")
      .reduce((sum, b) => sum + b.amount, 0),
    days90: bills
      .filter((b) => getAgingStatus(b.due_date).label === "90天以上")
      .reduce((sum, b) => sum + b.amount, 0),
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        <PageHeader
          title="账单管理"
          subtitle="管理客户账单、收款和账龄分析"
          breadcrumbs={[
            { label: "客户关系管理", href: "/crm" },
            { label: "账单管理" },
          ]}
          backButton={{ onClick: () => navigate("/crm") }}
        />

        <Box
          sx={{
            display: "flex",
            gap: 1,
            p: 1,
            bgcolor: "grey.100",
            borderRadius: 1,
            mb: 3,
          }}
        >
          <TabButton
            active={activeTab === "invoices"}
            onClick={() => setActiveTab("invoices")}
          >
            <Receipt sx={{ width: 16, height: 16, mr: 1 }} />
            待收账单
          </TabButton>
          <TabButton
            active={activeTab === "collections"}
            onClick={() => setActiveTab("collections")}
          >
            <CheckCircle sx={{ width: 16, height: 16, mr: 1 }} />
            已收账单
          </TabButton>
          <TabButton
            active={activeTab === "aging"}
            onClick={() => setActiveTab("aging")}
          >
            <Clock sx={{ width: 16, height: 16, mr: 1 }} />
            账龄分析
          </TabButton>
        </Box>

        {activeTab === "invoices" && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box sx={{ bgcolor: "info.light", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="info.main">
                  待收账单模块 - 管理客户待收账单，支持标记支付、发送通知等操作
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                待收总额: ¥
                {bills.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#f5f5f5" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      发票号
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      客户
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      金额
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      到期日
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      状态
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length > 0 ? (
                    bills.map((bill) => (
                      <tr key={bill.id} style={{ borderBottom: "1px solid" }}>
                        <td style={{ padding: "12px 16px" }}>
                          {bill.invoice_no}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {bill.customer_name}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: 500,
                          }}
                        >
                          ¥{bill.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {new Date(bill.due_date).toLocaleDateString()}
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          {getStatusChip(bill.status)}
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "center",
                            }}
                          >
                            <Button
                              size="small"
                              color="success"
                              onClick={() => handleMarkPaid(bill.id)}
                            >
                              标记支付
                            </Button>
                            <Button
                              size="small"
                              color="primary"
                              onClick={() => handleSendNotification(bill.id)}
                              startIcon={
                                <Send sx={{ width: 14, height: 14 }} />
                              }
                            >
                              发通知
                            </Button>
                          </Box>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          color: "text.disabled",
                        }}
                      >
                        暂无待收账单
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {activeTab === "collections" && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box sx={{ bgcolor: "success.light", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="success.main">
                  已收账单模块 - 查看已支付的账单记录
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                已收总额: ¥
                {bills.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#f5f5f5" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      发票号
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      客户
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      金额
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      支付日期
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length > 0 ? (
                    bills.map((bill) => (
                      <tr key={bill.id} style={{ borderBottom: "1px solid" }}>
                        <td style={{ padding: "12px 16px" }}>
                          {bill.invoice_no}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {bill.customer_name}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: 500,
                          }}
                        >
                          ¥{bill.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {bill.paid_at
                            ? new Date(bill.paid_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          {getStatusChip(bill.status)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          color: "text.disabled",
                        }}
                      >
                        暂无已收账单
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Box>
        )}

        {activeTab === "aging" && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ bgcolor: "info.light", borderRadius: 1, p: 2, mb: 3 }}>
              <Typography variant="body2" color="info.main">
                应收账龄分析 - 分析客户应收账款账龄，提供逾期预警
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
                mb: 3,
              }}
            >
              <StatCard
                label="正常"
                value={`¥${agingSummary.normal.toLocaleString()}`}
                color="success"
              />
              <StatCard
                label="30天内"
                value={`¥${agingSummary.days30.toLocaleString()}`}
                color="warning"
              />
              <StatCard
                label="60天内"
                value={`¥${agingSummary.days60.toLocaleString()}`}
                color="warning"
              />
              <StatCard
                label="90天以上"
                value={`¥${agingSummary.days90.toLocaleString()}`}
                color="error"
              />
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#f5f5f5" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      客户
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      应收总额
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      到期日
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      账龄状态
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      风险等级
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length > 0 ? (
                    bills.map((bill) => {
                      const aging = getAgingStatus(bill.due_date);
                      return (
                        <tr key={bill.id} style={{ borderBottom: "1px solid" }}>
                          <td style={{ padding: "12px 16px" }}>
                            {bill.customer_name}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontWeight: 500,
                            }}
                          >
                            ¥{bill.amount.toLocaleString()}
                          </td>
                          <td
                            style={{ padding: "12px 16px", textAlign: "right" }}
                          >
                            {new Date(bill.due_date).toLocaleDateString()}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                          >
                            <Chip
                              size="small"
                              label={aging.label}
                              sx={{
                                bgcolor:
                                  aging.color === "success"
                                    ? "success.light"
                                    : aging.color === "warning"
                                      ? "warning.light"
                                      : "error.light",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                aging.color === "error"
                                  ? "高风险"
                                  : aging.color === "warning"
                                    ? "中风险"
                                    : "低风险"
                              }
                              sx={{
                                bgcolor:
                                  aging.color === "success"
                                    ? "success.light"
                                    : aging.color === "warning"
                                      ? "warning.light"
                                      : "error.light",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          color: "text.disabled",
                        }}
                      >
                        暂无账龄数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      px: 2,
      py: 1,
      borderRadius: 1,
      cursor: "pointer",
      textAlign: "center",
      fontSize: "0.875rem",
      fontWeight: 500,
      transition: "all 0.2s",
      bgcolor: active ? "background.paper" : "transparent",
      color: active ? "primary.main" : "text.secondary",
      boxShadow: active ? 1 : 0,
      "&:hover": {
        bgcolor: active ? "background.paper" : "grey.200",
      },
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </Box>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  color: "success" | "warning" | "error";
}> = ({ label, value, color }) => {
  const bgColor = {
    success: "success.light",
    warning: "warning.light",
    error: "error.light",
  }[color];
  const textColor = {
    success: "success.dark",
    warning: "warning.dark",
    error: "error.dark",
  }[color];

  return (
    <Box sx={{ bgcolor: bgColor, borderRadius: 1, p: 2 }}>
      <Typography variant="caption" sx={{ color: textColor }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{ fontWeight: "bold", color: textColor, mt: 0.5 }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default CRMBillingPage;
