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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">客户关系管理</h1>
          <p className="mt-2 text-muted-foreground">
            管理客户、联系人、商机和交互记录
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 lg:w-auto lg:inline-grid">
            <TabsTrigger
              value="dashboard"
              className="flex items-center space-x-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">仪表板</span>
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">客户</span>
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">联系人</span>
            </TabsTrigger>
            <TabsTrigger
              value="opportunities"
              className="flex items-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">商机</span>
            </TabsTrigger>
            <TabsTrigger
              value="interactions"
              className="flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">交互记录</span>
            </TabsTrigger>
            <TabsTrigger
              value="scoring"
              className="flex items-center space-x-2"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">客户评分</span>
            </TabsTrigger>
            <TabsTrigger
              value="forecast"
              className="flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">销售预测</span>
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="flex items-center space-x-2"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">财务</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <LazyLoad>
              <CRMDashboardPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="customers">
            <LazyLoad>
              <CustomerManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="contacts">
            <LazyLoad>
              <ContactManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="opportunities">
            <LazyLoad>
              <OpportunityManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="interactions">
            <LazyLoad>
              <InteractionManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="scoring">
            <LazyLoad>
              <CRMCustomerScoringPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="forecast">
            <LazyLoad>
              <CRMSalesForecastPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value="finance">
            <CrmFinanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// CRM财务Tab组件
const CrmFinanceTab: React.FC = () => {
  const [financeTab, setFinanceTab] = useState<
    "invoices" | "collections" | "aging"
  >("invoices");

  return (
    <div className="space-y-6">
      {/* 子Tab切换 */}
      <div className="flex space-x-1 bg-slate-50 rounded-lg p-1">
        <button
          onClick={() => setFinanceTab("invoices")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            financeTab === "invoices"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          销售发票
        </button>
        <button
          onClick={() => setFinanceTab("collections")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            financeTab === "collections"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          收款记录
        </button>
        <button
          onClick={() => setFinanceTab("aging")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            financeTab === "aging"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          账龄分析
        </button>
      </div>

      {/* 发票列表 */}
      {financeTab === "invoices" && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-600 text-sm">
              销售发票模块 - 管理客户销售发票，支持发票开具、作废、红冲等操作
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    发票号
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    客户
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    金额
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    税额
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    价税合计
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    发票日期
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    到期日
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    暂无发票数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 收款记录列表 */}
      {financeTab === "collections" && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-600 text-sm">
              收款记录模块 - 记录客户收款信息，支持收款确认、批量确认等操作
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    收款单号
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    客户
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    收款金额
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    收款方式
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    收款日期
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    关联发票
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    暂无收款记录数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 账龄分析 */}
      {financeTab === "aging" && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-600 text-sm">
              应收账龄分析 - 分析客户应收账款账龄，提供逾期预警
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-green-600 text-xs">正常</p>
              <p className="text-2xl font-bold text-green-700 mt-1">¥0</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-yellow-600 text-xs">30天内</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">¥0</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-orange-600 text-xs">60天内</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">¥0</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-red-600 text-xs">90天以上</p>
              <p className="text-2xl font-bold text-red-700 mt-1">¥0</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    客户
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    应收总额
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    当前
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    30天内
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    60天内
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    90天以上
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">
                    风险等级
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    暂无账龄数据
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
