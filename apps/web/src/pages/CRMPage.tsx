import React, { lazy, Suspense, useState } from "react";
import {
  Building2,
  Users,
  Target,
  MessageSquare,
  LayoutDashboard,
  Award,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const CRMDashboardPage = lazy(() => import("./CRMDashboardPage"));
const CustomerManagementPage = lazy(() => import("./CustomerManagementPage"));
const ContactManagementPage = lazy(() => import("./ContactManagementPage"));
const OpportunityManagementPage = lazy(
  () => import("./OpportunityManagementPage"),
);
const InteractionManagementPage = lazy(
  () => import("./InteractionManagementPage"),
);
const CRMCustomerScoringPage = lazy(() => import("./CRMCustomerScoringPage"));
const CRMSalesForecastPage = lazy(() => import("./CRMSalesForecastPage"));

const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

const CRMPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { value: "dashboard", label: "仪表板", icon: LayoutDashboard },
    { value: "customers", label: "客户", icon: Building2 },
    { value: "contacts", label: "联系人", icon: Users },
    { value: "opportunities", label: "商机", icon: Target },
    { value: "interactions", label: "交互记录", icon: MessageSquare },
    { value: "scoring", label: "客户评分", icon: Award },
    { value: "forecast", label: "销售预测", icon: TrendingUp },
    { value: "finance", label: "财务", icon: Wallet },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>客户关系管理</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            管理客户、联系人、商机和交互记录
          </Typography>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.value}
              label={tab.label}
              icon={<tab.icon sx={{ width: 16, height: 16 }} />}
              iconPosition="start"
              id={`crm-tab-${index}`}
            />
          ))}
        </Tabs>

        <Box role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <LazyLoad>
              <CRMDashboardPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <LazyLoad>
              <CustomerManagementPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 2}>
          {tabValue === 2 && (
            <LazyLoad>
              <ContactManagementPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 3}>
          {tabValue === 3 && (
            <LazyLoad>
              <OpportunityManagementPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 4}>
          {tabValue === 4 && (
            <LazyLoad>
              <InteractionManagementPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 5}>
          {tabValue === 5 && (
            <LazyLoad>
              <CRMCustomerScoringPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 6}>
          {tabValue === 6 && (
            <LazyLoad>
              <CRMSalesForecastPage />
            </LazyLoad>
          )}
        </Box>

        <Box role="tabpanel" hidden={tabValue !== 7}>
          {tabValue === 7 && <CrmFinanceTab />}
        </Box>
      </Box>
    </Box>
  );
};

// CRM财务Tab组件
const CrmFinanceTab: React.FC = () => {
  const [financeTab, setFinanceTab] = useState<"invoices" | "collections" | "aging">("invoices");

  return (
    <Box sx={{ mt: 3 }}>
      {/* 子Tab切换 */}
      <Box sx={{ display: "flex", gap: 1, p: 1, bgcolor: "grey.100", borderRadius: 1, mb: 3 }}>
        <TabButton
          active={financeTab === "invoices"}
          onClick={() => setFinanceTab("invoices")}
        >
          销售发票
        </TabButton>
        <TabButton
          active={financeTab === "collections"}
          onClick={() => setFinanceTab("collections")}
        >
          收款记录
        </TabButton>
        <TabButton
          active={financeTab === "aging"}
          onClick={() => setFinanceTab("aging")}
        >
          账龄分析
        </TabButton>
      </Box>

      {/* 发票列表 */}
      {financeTab === "invoices" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ bgcolor: "info.light", borderRadius: 1, p: 2, mb: 3 }}>
            <Typography variant="body2" color="info.main">
              销售发票模块 - 管理客户销售发票，支持发票开具、作废、红冲等操作
            </Typography>
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>发票号</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>客户</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>金额</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>税额</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>价税合计</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>发票日期</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>到期日</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 500 }}>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} style={{ padding: "32px 16px", textAlign: "center", color: "text.disabled" }}>
                    暂无发票数据
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {/* 收款记录列表 */}
      {financeTab === "collections" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ bgcolor: "info.light", borderRadius: 1, p: 2, mb: 3 }}>
            <Typography variant="body2" color="info.main">
              收款记录模块 - 记录客户收款信息，支持收款确认、批量确认等操作
            </Typography>
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>收款单号</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>客户</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>收款金额</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>收款方式</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>收款日期</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>关联发票</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 500 }}>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: "text.disabled" }}>
                    暂无收款记录数据
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {/* 账龄分析 */}
      {financeTab === "aging" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ bgcolor: "info.light", borderRadius: 1, p: 2, mb: 3 }}>
            <Typography variant="body2" color="info.main">
              应收账龄分析 - 分析客户应收账款账龄，提供逾期预警
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 3 }}>
            <StatCard label="正常" value="¥0" color="success" />
            <StatCard label="30天内" value="¥0" color="warning" />
            <StatCard label="60天内" value="¥0" color="warning" />
            <StatCard label="90天以上" value="¥0" color="error" />
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "0.875rem" }}>
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>客户</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>应收总额</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>当前</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>30天内</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>60天内</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>90天以上</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 500 }}>风险等级</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: "text.disabled" }}>
                    暂无账龄数据
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Tab按钮组件
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
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
    }}
  >
    {children}
  </Box>
);

// 统计卡片组件
const StatCard: React.FC<{ label: string; value: string; color: "success" | "warning" | "error" }> = ({
  label,
  value,
  color,
}) => {
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
      <Typography variant="caption" sx={{ color: textColor }}>{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: textColor, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
};

export default CRMPage;
