import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  GitBranch,
  Bot,
  Users,
  Package,
  User,
  Activity,
  Building,
  Folder,
  BarChart3,
  Box,
  MapPin,
  Smartphone,
  MessageSquare,
  Receipt,
  TrendingUp,
  Briefcase,
  Calendar,
  DollarSign,
  BookOpen,
  HelpCircle,
  FileCheck,
  FlaskConical,
  ClipboardList,
  Shield,
  AlertCircle,
  Clock,
  Database,
  X,
  Link,
  Factory,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Warehouse,
  Map,
  MessageCircle,
  BarChart2,
  Mail,
  ChevronRight,
  Book,
  FolderKanban,
  Settings,
  CheckCircle,
} from "lucide-react";
import { authApi } from "../api/iam";
import { docApi } from "../api/doc";
import { flowApi } from "../api/flow";
import { erpApi } from "../api/erp";
import { hrmApi } from "../api/hrm";
import { mobileApi } from "../api/mobile";
import MobileNav from "../components/MobileNav";
import MobileHeader from "../components/MobileHeader";
import { usePermission } from "../hooks/usePermission";
import { useAuth } from "../hooks/useAuth";
import { StatsChart } from "../components/StatsChart";
import { MetricCard } from "../components/MetricCard";
import { useAppStore } from "../store";
import {
  DashboardHeader,
  DashboardQuickActions,
  defaultQuickActions,
  ModuleCard,
  type ModuleItem,
  ServiceStatusMonitor,
  RecentActivities,
  type ActivityItem,
  MobileMenu,
} from "../components/dashboard";

interface DashboardPageProps {
  onLogout?: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    logout: authLogout,
    isAuthenticated,
    hasPermission,
  } = useAuth();
  const shortcuts = useAppStore((state) => state.shortcuts);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    fileCount: 0,
    workflowCount: 0,
    docCount: 0,
    notificationCount: 5,
  });
  const [moduleStats, setModuleStats] = useState({
    qms: { total: 25, active: 23 },
    ehs: { total: 20, active: 18 },
    srm: { total: 15, active: 14 },
    lims: { total: 20, active: 19 },
    rs: { total: 12, active: 10 },
  });
  const [chartData, setChartData] = useState({
    moduleDistribution: [] as { name: string; value: number; color: string }[],
    monthlyTrend: [] as { name: string; value: number }[],
  });
  const [serviceStatuses, setServiceStatuses] = useState<
    Record<string, boolean>
  >({
    iam: false,
    rs: false,
    lims: false,
    doc: false,
    ai: false,
    flow: false,
    erp: false,
    hrm: false,
    mobile: false,
    notification: false,
    report: false,
    pm: false,
    bi: false,
    integration: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  const moduleToService: Record<string, keyof typeof serviceStatuses> = {
    rs: "rs",
    lims: "lims",
    doc: "doc",
    ai: "ai",
    workflow: "flow",
    iam: "iam",
    qms: "qms",
    ehs: "ehs",
    srm: "srm",
    pdm: "pdm",
    crm: "crm",
    mes: "mes",
    mail: "mail",
    mobile: "mobile",
    hrm: "hrm",
    erp: "erp",
    gis: "gis",
    pm: "pm",
    bi: "bi",
    integration: "integration",
    notification: "notification",
    portal: "portal",
    scm: "scm",
    wms: "wms",
    im: "im",
    report: "report",
    contract: "hrm",
  };

  const initialized = useRef(false);

  const checkServiceStatus = useCallback(
    async (serviceKey: string, port: number) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`/${serviceKey}/health`, {
          signal: controller.signal,
          method: "GET",
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const checkAllServicesStatus = useCallback(async () => {
    const services = [
      { key: "iam", port: 8000 },
      { key: "doc", port: 8001 },
      { key: "pm", port: 8002 },
      { key: "notification", port: 8003 },
      { key: "integration", port: 8004 },
      { key: "portal", port: 8005 },
      { key: "flow", port: 8006 },
      { key: "erp", port: 8010 },
      { key: "hrm", port: 8011 },
      { key: "crm", port: 8012 },
      { key: "ai", port: 8013 },
      { key: "rs", port: 8020 },
      { key: "lims", port: 8022 },
      { key: "pdm", port: 8023 },
      { key: "mes", port: 8030 },
      { key: "qms", port: 8031 },
      { key: "ehs", port: 8032 },
      { key: "scm", port: 8040 },
      { key: "srm", port: 8041 },
      { key: "wms", port: 8042 },
      { key: "gis", port: 8050 },
      { key: "im", port: 8051 },
      { key: "bi", port: 8052 },
      { key: "report", port: 8053 },
      { key: "mail", port: 8054 },
      { key: "mobile", port: 8055 },
    ];

    const statusPromises = services.map(async (service) => {
      const status = await checkServiceStatus(service.key, service.port);
      return { [service.key]: status };
    });

    const results = await Promise.all(statusPromises);
    const newStatuses = Object.assign({}, ...results);
    setServiceStatuses(newStatuses as Record<string, boolean>);
  }, [checkServiceStatus]);

  const loadStats = useCallback(async () => {
    try {
      const [docRes] = await Promise.allSettled([docApi.list()]);

      const newStats = {
        fileCount:
          (docRes.status === "fulfilled" &&
            docRes.value.success &&
            docRes.value.data?.files?.length) ||
          0,
        workflowCount: 0,
        docCount: 0,
        notificationCount: 5,
      };

      setStats(newStats);
    } catch (err) {
      console.error("加载统计失败:", err);
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    const activities: ActivityItem[] = [
      {
        id: "1",
        title: "成功登录系统",
        type: "系统",
        time: "刚刚",
        icon: <User className="w-4 h-4" />,
      },
      {
        id: "2",
        title: '上传文档 "项目报告.pdf"',
        type: "文档",
        time: "5分钟前",
        icon: <FileText className="w-4 h-4" />,
      },
      {
        id: "3",
        title: "审批通过采购申请",
        type: "工作流",
        time: "15分钟前",
        icon: <GitBranch className="w-4 h-4" />,
      },
      {
        id: "4",
        title: '创建新文件夹 "研发资料"',
        type: "文档",
        time: "1小时前",
        icon: <Folder className="w-4 h-4" />,
      },
      {
        id: "5",
        title: "完成安全培训课程",
        type: "培训",
        time: "2小时前",
        icon: <BookOpen className="w-4 h-4" />,
      },
    ];
    setRecentActivities(activities);
  }, []);

  const shouldShowModule = useCallback(
    (module: {
      permission?: string | null;
      module?: string | null;
    }): boolean => {
      const hasAccess =
        !module.permission ||
        (user?.is_superuser ? true : hasPermission(module.permission));
      if (!hasAccess) return false;
      if (!module.module) return true;
      const serviceKey = moduleToService[module.module];
      return serviceStatuses[serviceKey];
    },
    [hasPermission, user?.is_superuser, moduleToService, serviceStatuses],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const init = async () => {
      try {
        await checkAllServicesStatus();
        await loadStats().catch((err) => {
          console.warn("加载统计数据失败:", err);
        });
        await loadRecentActivities().catch((err) => {
          console.warn("加载最近活动失败:", err);
        });
      } catch (err) {
        console.error("初始化失败:", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const intervalId = setInterval(() => {
      checkAllServicesStatus();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [
    navigate,
    isAuthenticated,
    checkAllServicesStatus,
    loadStats,
    loadRecentActivities,
  ]);

  const handleLogout = useCallback(() => {
    authLogout();
    navigate("/login");
    onLogout?.();
  }, [authLogout, navigate, onLogout]);

  const handleQuickAccess = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  const coreModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: "文档管理",
          icon: FileText,
          description: "文件上传、下载、版本管理",
          path: "/documents",
          color: "bg-blue-500",
          status: "online" as const,
          permission: "doc:read",
          module: "doc",
        },
        {
          title: "AI 知识库",
          icon: Bot,
          description: "智能问答、知识检索",
          path: "/ai",
          color: "bg-purple-500",
          status: "online" as const,
          permission: "ai:read",
          module: "ai",
        },
        {
          title: "工作流",
          icon: GitBranch,
          description: "流程审批、任务管理",
          path: "/workflows",
          color: "bg-green-500",
          status: "online" as const,
          permission: "workflow:read",
          module: "workflow",
        },
        {
          title: "通讯录",
          icon: Book,
          description: "企业通讯录、组织架构",
          path: "/addressbook",
          color: "bg-emerald-500",
          status: "online" as const,
          permission: null,
          module: null,
        },
        {
          title: "项目管理",
          icon: FolderKanban,
          description: "项目全生命周期、合同、预算、风险管理",
          path: "/pm/projects",
          color: "bg-rose-500",
          status: "online" as const,
          permission: null,
          module: "pm",
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule],
  );

  const systemServicesModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: "系统管理",
          icon: Settings,
          description: "用户、角色、权限、系统设置管理",
          path: "/system",
          color: "bg-slate-600",
          status: "online" as const,
          permission: "system:admin",
          module: "iam",
          adminOnly: true,
        },
        {
          title: "系统集成",
          icon: Link,
          description: "LIMS-QMS/MES-ERP/WMS-SCM 等系统间数据同步",
          path: "/integration",
          color: "bg-blue-500",
          status: "online" as const,
          permission: "system:admin",
          module: "integration",
          adminOnly: true,
        },
        {
          title: "报表中心",
          icon: BarChart3,
          description: "RS/LIMS/QMS/EHS/SRM/PDM 各模块报表",
          path: "/reports",
          color: "bg-emerald-500",
          status: "online" as const,
          permission: "system:admin",
          module: "iam",
          adminOnly: true,
        },
        {
          title: "模板管理",
          icon: FileText,
          description: "文档模板、流程模板管理",
          path: "/templates",
          color: "bg-violet-500",
          status: "online" as const,
          permission: "doc:admin",
          module: "doc",
          adminOnly: true,
        },
        {
          title: "帮助中心",
          icon: HelpCircle,
          description: "使用指南、视频教程、常见问题",
          path: "/help",
          color: "bg-amber-500",
          status: "online" as const,
          permission: null,
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule],
  );

  const businessModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: "公司管理",
          icon: Building,
          description: "企业信息、组织架构",
          path: "/hrm/companies",
          color: "bg-blue-500",
          status: "online" as const,
          permission: "hrm:read",
          module: "hrm",
          adminOnly: true,
        },
        {
          title: "部门管理",
          icon: Folder,
          description: "部门结构、层级关系",
          path: "/hrm/departments",
          color: "bg-teal-500",
          status: "online" as const,
          permission: "hrm:read",
          module: "hrm",
          adminOnly: true,
        },
        {
          title: "员工管理",
          icon: Users,
          description: "员工信息、任职管理",
          path: "/hrm/employees",
          color: "bg-emerald-500",
          status: "online" as const,
          permission: "hrm:read",
          module: "hrm",
          adminOnly: true,
        },
        {
          title: "薪酬管理",
          icon: DollarSign,
          description: "薪资计算、奖金社保、个税管理",
          path: "/hrm/payroll",
          color: "bg-yellow-500",
          status: "online" as const,
          permission: "hrm:read",
          module: "hrm",
          adminOnly: true,
        },
        {
          title: "资产管理",
          icon: Box,
          description: "企业资产、设备台账、点巡检、维护维修",
          path: "/assets",
          color: "bg-purple-500",
          status: "online" as const,
          permission: "erp:admin",
          module: "erp",
          adminOnly: true,
        },
        {
          title: "行政综合管理",
          icon: Briefcase,
          description: "资产、会议室、车辆统一管理",
          path: "/administration",
          color: "bg-sky-500",
          status: "online" as const,
          permission: "erp:admin",
          module: "erp",
          adminOnly: true,
        },
        {
          title: "合同管理",
          icon: FileCheck,
          description: "员工合同、续签流程、到期提醒",
          path: "/contracts",
          color: "bg-violet-500",
          status: "online" as const,
          permission: "contract:read",
          module: "contract",
          adminOnly: true,
        },
        {
          title: "预算管理",
          icon: TrendingUp,
          description: "部门预算、使用进度、预警",
          path: "/budget",
          color: "bg-green-500",
          status: "online" as const,
          permission: "erp:admin",
          module: "erp",
          adminOnly: true,
        },
        {
          title: "费用管理",
          icon: Receipt,
          description: "费用报销、预算、应收应付",
          path: "/finance",
          color: "bg-indigo-500",
          status: "online" as const,
          permission: "erp:admin",
          module: "erp",
          adminOnly: true,
        },
        {
          title: "文档中心",
          icon: BookOpen,
          description: "企业文档管理、知识共享",
          path: "/document-center",
          color: "bg-blue-500",
          status: "online" as const,
          permission: "doc:read",
          module: "doc",
        },
        {
          title: "商业智能",
          icon: BarChart3,
          description: "数据大屏、概览分析、各模块数据统计",
          path: "/bi/dashboard",
          color: "bg-emerald-500",
          status: "new" as const,
          permission: null,
          module: "bi",
        },
        {
          title: "科研研发",
          icon: FlaskConical,
          description: "项目管理、配方管理",
          path: "/rs",
          color: "bg-orange-500",
          status: "beta" as const,
          permission: "rs:read",
          module: "rs",
        },
        {
          title: "实验室管理",
          icon: ClipboardList,
          description: "样品管理、检测记录",
          path: "/lims",
          color: "bg-cyan-500",
          status: "beta" as const,
          permission: "lims:read",
          module: "lims",
        },
        {
          title: "质量管理",
          icon: Shield,
          description: "质量管控、合规管理",
          path: "/qms",
          color: "bg-indigo-500",
          status: "online" as const,
          permission: "qms:read",
          module: "qms",
        },
        {
          title: "环境健康安全",
          icon: AlertCircle,
          description: "安全风险、应急预案",
          path: "/ehs",
          color: "bg-red-500",
          status: "online" as const,
          permission: "ehs:read",
          module: "ehs",
        },
        {
          title: "供应商关系",
          icon: Users,
          description: "供应商管理、采购订单",
          path: "/srm",
          color: "bg-purple-500",
          status: "online" as const,
          permission: "srm:read",
          module: "srm",
        },
        {
          title: "生产数据管理",
          icon: Package,
          description: "生产工艺、配方批次",
          path: "/pdm",
          color: "bg-amber-500",
          status: "online" as const,
          permission: "pdm:read",
          module: "pdm",
        },
        {
          title: "厂区空间",
          icon: MapPin,
          description: "设备点位、管线、仓储管理",
          path: "/gis",
          color: "bg-teal-500",
          status: "new" as const,
          permission: "gis:read",
          module: "gis",
        },
        {
          title: "移动工作台",
          icon: Smartphone,
          description: "巡检打卡、扫码入库、移动任务",
          path: "/mobile-workstation",
          color: "bg-indigo-500",
          status: "new" as const,
          permission: null,
          module: "mobile",
        },
        {
          title: "即时通讯",
          icon: MessageSquare,
          description: "聊天会话、项目群组、消息通知",
          path: "/im",
          color: "bg-pink-500",
          status: "new" as const,
          permission: "im:read",
          module: "im",
        },
        {
          title: "邮件管理",
          icon: Mail,
          description: "邮件发送、模板管理、邮件记录",
          path: "/mail",
          color: "bg-cyan-500",
          status: "new" as const,
          permission: "mail:read",
          module: "mail",
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">加载中...</div>
      </div>
    );
  }

  const onlineServices = Object.values(serviceStatuses).filter(Boolean).length;
  const currentPage = location.pathname.replace("/", "") || "dashboard";

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MobileHeader
        title="TOPEMS"
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentPage={currentPage}
        onNavigate={navigate}
      />

      <div className="desktop-only">
        <DashboardHeader onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mobile-only mb-6">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {coreModules.slice(0, 4).map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-lg p-3 cursor-pointer"
                  onClick={() => navigate(item.path)}
                >
                  <div
                    className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-2`}
                  >
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-medium text-slate-900 text-sm">
                    {item.title}
                  </h4>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              快速操作
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {defaultQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAccess(action.path)}
                    className="flex flex-col items-center p-2 bg-white rounded-lg"
                  >
                    <Icon className="w-5 h-5 text-slate-600 mb-1" />
                    <span className="text-xs text-slate-700">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              服务状态
            </h3>
            <div className="bg-white rounded-xl p-4">
              {[
                { name: "身份认证", status: serviceStatuses.iam },
                { name: "研发管理", status: serviceStatuses.rs },
                { name: "实验室管理", status: serviceStatuses.lims },
                { name: "文档管理", status: serviceStatuses.doc },
                { name: "AI 服务", status: serviceStatuses.ai },
                { name: "流程引擎", status: serviceStatuses.flow },
                { name: "企业资源", status: serviceStatuses.erp },
                { name: "人力资源", status: serviceStatuses.hrm },
                { name: "通知服务", status: serviceStatuses.notification },
                { name: "报表服务", status: serviceStatuses.report },
                { name: "移动服务", status: serviceStatuses.mobile },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="text-sm text-slate-700">{service.name}</span>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${service.status ? "bg-green-500" : "bg-red-500"}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              👋 欢迎回来，{user?.full_name || user?.username || "用户"}！
            </h2>
            <p className="text-slate-600">
              {getGreeting()}，今天有 {defaultQuickActions.length} 个待处理事项
            </p>
          </div>

          <DashboardQuickActions
            quickActions={defaultQuickActions}
            serviceStatuses={serviceStatuses}
            onQuickAccess={handleQuickAccess}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="在线服务"
              value={String(onlineServices)}
              icon={<Activity className="w-6 h-6" />}
              color="green"
              change={onlineServices > 5 ? 10 : -5}
            />
            <MetricCard
              title="文件数量"
              value={String(stats.fileCount)}
              icon={<FileText className="w-6 h-6" />}
              color="purple"
              change={8}
            />
            <MetricCard
              title="工作流"
              value={String(stats.workflowCount)}
              icon={<GitBranch className="w-6 h-6" />}
              color="orange"
              change={-3}
            />
            <MetricCard
              title="待处理"
              value={String(stats.notificationCount)}
              icon={<Clock className="w-6 h-6" />}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <StatsChart
              type="pie"
              title="业务模块分布"
              data={
                chartData.moduleDistribution.length > 0
                  ? chartData.moduleDistribution
                  : [
                      { name: "质量管理", value: 25, color: "#6366f1" },
                      { name: "安全管理", value: 20, color: "#8b5cf6" },
                      { name: "供应商管理", value: 15, color: "#a855f7" },
                      { name: "实验室管理", value: 20, color: "#d946ef" },
                      { name: "研发管理", value: 20, color: "#ec4899" },
                    ]
              }
              yKey="value"
            />
            <StatsChart
              type="line"
              title="月度趋势"
              data={
                chartData.monthlyTrend.length > 0
                  ? chartData.monthlyTrend
                  : [
                      { name: "1月", value: 65 },
                      { name: "2月", value: 78 },
                      { name: "3月", value: 85 },
                      { name: "4月", value: 72 },
                      { name: "5月", value: 90 },
                      { name: "6月", value: 88 },
                    ]
              }
              yKey="value"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">供应商</p>
                  <p className="text-xl font-bold text-slate-900">
                    {moduleStats.srm.total}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs">
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">
                  {moduleStats.srm.active} 活跃
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">实验室</p>
                  <p className="text-xl font-bold text-slate-900">
                    {moduleStats.lims.total}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs">
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">
                  {moduleStats.lims.active} 活跃
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">研发</p>
                  <p className="text-xl font-bold text-slate-900">
                    {moduleStats.rs.total}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs">
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-green-600">
                  {moduleStats.rs.active} 活跃
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              🚀 核心功能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size="large"
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              📊 业务模块
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {businessModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size="small"
                />
              ))}
            </div>
          </div>

          {systemServicesModules.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                ⚙️ 系统服务
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemServicesModules.map((item) => (
                  <ModuleCard
                    key={item.title}
                    item={item}
                    onClick={() => navigate(item.path)}
                    size="medium"
                  />
                ))}
              </div>
            </div>
          )}

          <ServiceStatusMonitor
            serviceStatuses={serviceStatuses}
            onRefresh={checkAllServicesStatus}
          />

          <RecentActivities activities={recentActivities} />

          <div className="mt-8 text-center text-sm text-slate-500">
            <p>TOPEMS v2.0 | 化工新材料企业数字化平台</p>
            <p className="mt-1">© 2026 TOPEMS Team. All rights reserved.</p>
          </div>
        </main>
      </div>

      <MobileNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
};

export default DashboardPage;
