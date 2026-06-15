import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
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
        icon: <User size={16} />,
      },
      {
        id: "2",
        title: '上传文档 "项目报告.pdf"',
        type: "文档",
        time: "5分钟前",
        icon: <FileText size={16} />,
      },
      {
        id: "3",
        title: "审批通过采购申请",
        type: "工作流",
        time: "15分钟前",
        icon: <GitBranch size={16} />,
      },
      {
        id: "4",
        title: '创建新文件夹 "研发资料"',
        type: "文档",
        time: "1小时前",
        icon: <Folder size={16} />,
      },
      {
        id: "5",
        title: "完成安全培训课程",
        type: "培训",
        time: "2小时前",
        icon: <BookOpen size={16} />,
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
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "1.125rem", color: "grey.600" }}>
          加载中...
        </Typography>
      </Box>
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
      }}
    >
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

      <Box className="desktop-only">
        <DashboardHeader onLogout={handleLogout} />

        <Box
          component="main"
          sx={{
            maxWidth: "1280px",
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 4,
          }}
        >
          <Box className="mobile-only" sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                mb: 2,
              }}
            >
              {coreModules.slice(0, 4).map((item) => (
                <Box
                  key={item.title}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1.5,
                    p: 1.5,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: item.color.replace("bg-", ""),
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                    }}
                  >
                    <item.icon size={20} color="#fff" />
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: "grey.900",
                      fontSize: "0.875rem",
                    }}
                  >
                    {item.title}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "grey.900",
                mb: 1.5,
              }}
            >
              快速操作
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                mb: 3,
              }}
            >
              {defaultQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Box
                    key={action.label}
                    component="button"
                    onClick={() => handleQuickAccess(action.path)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      p: 1,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={20} color="#475569" />
                    <Typography
                      sx={{ fontSize: "0.75rem", color: "grey.700" }}
                    >
                      {action.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <Typography
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "grey.900",
                mb: 1.5,
              }}
            >
              服务状态
            </Typography>
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                p: 2,
              }}
            >
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
              ].map((service, index) => (
                <Box
                  key={service.name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1,
                    borderBottom:
                      index < 10 ? "1px solid" : "none",
                    borderColor: "grey.100",
                  }}
                >
                  <Typography
                    sx={{ fontSize: "0.875rem", color: "grey.700" }}
                  >
                    {service.name}
                  </Typography>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: service.status ? "green.500" : "red.500",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: "1.875rem",
                fontWeight: 700,
                color: "grey.900",
                mb: 1,
              }}
            >
              👋 欢迎回来，{user?.full_name || user?.username || "用户"}！
            </Typography>
            <Typography sx={{ color: "grey.600" }}>
              {getGreeting()}，今天有 {defaultQuickActions.length} 个待处理事项
            </Typography>
          </Box>

          <DashboardQuickActions
            quickActions={defaultQuickActions}
            serviceStatuses={serviceStatuses}
            onQuickAccess={handleQuickAccess}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              gap: 3,
              mb: 4,
            }}
          >
            <MetricCard
              title="在线服务"
              value={String(onlineServices)}
              icon={<Activity size={24} />}
              color="green"
              change={onlineServices > 5 ? 10 : -5}
            />
            <MetricCard
              title="文件数量"
              value={String(stats.fileCount)}
              icon={<FileText size={24} />}
              color="purple"
              change={8}
            />
            <MetricCard
              title="工作流"
              value={String(stats.workflowCount)}
              icon={<GitBranch size={24} />}
              color="orange"
              change={-3}
            />
            <MetricCard
              title="待处理"
              value={String(stats.notificationCount)}
              icon={<Clock size={24} />}
              color="blue"
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
              gap: 3,
              mb: 4,
            }}
          >
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
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
              mb: 4,
            }}
          >
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                boxShadow: 1,
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "indigo.100",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield size={20} color="#4f46e5" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                    供应商
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "grey.900",
                    }}
                  >
                    {moduleStats.srm.total}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.75rem",
                }}
              >
                <CheckCircle size={12} color="#22c55e" />
                <Typography
                  sx={{
                    ml: 0.5,
                    fontSize: "0.75rem",
                    color: "green.600",
                  }}
                >
                  {moduleStats.srm.active} 活跃
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                boxShadow: 1,
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "cyan.100",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList size={20} color="#0891b2" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                    实验室
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "grey.900",
                    }}
                  >
                    {moduleStats.lims.total}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.75rem",
                }}
              >
                <CheckCircle size={12} color="#22c55e" />
                <Typography
                  sx={{
                    ml: 0.5,
                    fontSize: "0.75rem",
                    color: "green.600",
                  }}
                >
                  {moduleStats.lims.active} 活跃
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                boxShadow: 1,
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "orange.100",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FlaskConical size={20} color="#ea580c" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", color: "grey.600" }}>
                    研发
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "grey.900",
                    }}
                  >
                    {moduleStats.rs.total}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.75rem",
                }}
              >
                <CheckCircle size={12} color="#22c55e" />
                <Typography
                  sx={{
                    ml: 0.5,
                    fontSize: "0.75rem",
                    color: "green.600",
                  }}
                >
                  {moduleStats.rs.active} 活跃
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "grey.900",
                mb: 2,
              }}
            >
              🚀 核心功能
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {coreModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size="large"
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "grey.900",
                mb: 2,
              }}
            >
              📊 业务模块
            </Typography>
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
              {businessModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {systemServicesModules.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "grey.900",
                  mb: 2,
                }}
              >
                ⚙️ 系统服务
              </Typography>
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
                {systemServicesModules.map((item) => (
                  <ModuleCard
                    key={item.title}
                    item={item}
                    onClick={() => navigate(item.path)}
                    size="medium"
                  />
                ))}
              </Box>
            </Box>
          )}

          <ServiceStatusMonitor
            serviceStatuses={serviceStatuses}
            onRefresh={checkAllServicesStatus}
          />

          <RecentActivities activities={recentActivities} />

          <Box
            sx={{
              mt: 4,
              textAlign: "center",
              fontSize: "0.875rem",
              color: "grey.500",
            }}
          >
            <Typography sx={{ color: "grey.500" }}>
              TOPEMS v2.0 | 化工新材料企业数字化平台
            </Typography>
            <Typography sx={{ color: "grey.500", mt: 0.5 }}>
              © 2026 TOPEMS Team. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>

      <MobileNav currentPage={currentPage} onNavigate={navigate} />
    </Box>
  );
};

export default DashboardPage;
