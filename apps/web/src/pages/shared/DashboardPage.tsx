import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { apiLogger } from "@/utils/logger";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
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
  Zap,
  ListTodo,
  Bell,
  Clock3,
} from "lucide-react";
import { authApi } from "@/api/iam";
import { docApi } from "@/api/doc";
import { flowApi } from "@/api/flow";
import { erpApi } from "@/api/erp";
import { hrmApi } from "@/api/hrm";
import { mobileApi } from "@/api/mobile";
import MobileNav from "@/components/MobileNav";
import MobileHeader from "@/components/MobileHeader";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/hooks/useAuth";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { StatsChart } from "@/components/StatsChart";
import { MetricCard } from "@/components/MetricCard";
import { useAppStore } from "../../store";
import {
  DashboardQuickActions,
  defaultQuickActions,
  ModuleCard,
  type ModuleItem,
  ServiceStatusMonitor,
  RecentActivities,
  type ActivityItem,
  MobileMenu,
  DashboardSection,
  QuickAccessSection,
  TodoListSection,
  ModuleNavigationSection,
  ServiceMonitorSection,
  RecentActivitySection,
} from "@/components/dashboard";

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
  const { serviceStatuses, refresh: refreshServiceStatuses } =
    useServiceStatus();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [todoTab, setTodoTab] = useState(0);
  const [todos, setTodos] = useState([
    { id: 1, title: "审批采购申请 #2024-001", type: "workflow", done: false },
    { id: 2, title: "查看实验室检测报告", type: "lims", done: false },
    { id: 3, title: "完成安全培训课程", type: "training", done: true },
    { id: 4, title: "提交月度工作报告", type: "report", done: false },
    { id: 5, title: "参加项目评审会议", type: "meeting", done: false },
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moduleToService: Record<string, string> = {
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
      apiLogger.error("加载统计失败:", err);
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
        await refreshServiceStatuses();
        await loadStats().catch((err) => {
          apiLogger.warn("加载统计数据失败:", err);
        });
        await loadRecentActivities().catch((err) => {
          apiLogger.warn("加载最近活动失败:", err);
        });
      } catch (err) {
        apiLogger.error("初始化失败:", err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const intervalId = setInterval(() => {
      refreshServiceStatuses();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [
    navigate,
    isAuthenticated,
    refreshServiceStatuses,
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
          permission: "iam:system_update",
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
          permission: "iam:system_update",
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
          permission: "iam:system_update",
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

  const pendingTodos = todos.filter((t) => !t.done);
  const completedTodos = todos.filter((t) => t.done);

  const handleTodoToggle = (id: number) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const getTodoIcon = (type: string) => {
    switch (type) {
      case "workflow":
        return <GitBranch size={18} />;
      case "lims":
        return <ClipboardList size={18} />;
      case "training":
        return <BookOpen size={18} />;
      case "report":
        return <FileText size={18} />;
      case "meeting":
        return <Calendar size={18} />;
      default:
        return <ListTodo size={18} />;
    }
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
        <Box
          component="main"
          sx={{
            width: "100%",
            py: 4,
          }}
        >
          {/* 欢迎标题 */}
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
              {getGreeting()}，今天有 {pendingTodos.length} 个待处理事项
            </Typography>
          </Box>

          {/* 今日概览分区 */}
          <DashboardSection title="今日概览" sx={{ mb: 4 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
                gap: 3,
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
                value={String(pendingTodos.length)}
                icon={<Clock size={24} />}
                color="blue"
              />
            </Box>
          </DashboardSection>

          {/* 快捷入口分区 */}
          <QuickAccessSection defaultExpanded={true}>
            <DashboardQuickActions
              quickActions={defaultQuickActions}
              serviceStatuses={serviceStatuses}
              onQuickAccess={handleQuickAccess}
            />
          </QuickAccessSection>

          {/* 待办事项分区 */}
          <TodoListSection>
            <Box sx={{ mb: 2 }}>
              <Tabs
                value={todoTab}
                onChange={(_, v) => setTodoTab(v)}
                sx={{
                  minHeight: 36,
                  "& .MuiTabs-indicator": {
                    bgcolor: "primary.main",
                  },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ListTodo size={16} />
                      <Typography sx={{ fontSize: "0.875rem" }}>
                        待处理
                      </Typography>
                      <Badge
                        badgeContent={pendingTodos.length}
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  sx={{ minHeight: 36, py: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckCircle size={16} />
                      <Typography sx={{ fontSize: "0.875rem" }}>
                        已完成
                      </Typography>
                      <Badge
                        badgeContent={completedTodos.length}
                        color="success"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  sx={{ minHeight: 36, py: 1 }}
                />
              </Tabs>
            </Box>
            <List sx={{ py: 0 }}>
              {(todoTab === 0 ? pendingTodos : completedTodos).map((todo) => (
                <ListItem
                  key={todo.id}
                  sx={{
                    px: 0,
                    borderBottom: "1px solid",
                    borderColor: "grey.100",
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <ListItemButton
                    sx={{
                      borderRadius: 1,
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        checked={todo.done}
                        onChange={() => handleTodoToggle(todo.id)}
                        size="small"
                        sx={{
                          color: "grey.400",
                          "&.Mui-checked": { color: "success.main" },
                        }}
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: todo.done ? "grey.100" : "primary.50",
                          color: todo.done ? "grey.500" : "primary.main",
                        }}
                      >
                        {getTodoIcon(todo.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={todo.title}
                      sx={{
                        "& .MuiListItemText-primary": {
                          fontSize: "0.875rem",
                          color: todo.done ? "grey.500" : "grey.900",
                          textDecoration: todo.done ? "line-through" : "none",
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </TodoListSection>

          {/* 模块导航分区 - 核心功能 */}
          <ModuleNavigationSection title="🚀 核心功能">
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
          </ModuleNavigationSection>

          {/* 模块导航分区 - 业务模块 */}
          <ModuleNavigationSection title="📊 业务模块">
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
          </ModuleNavigationSection>

          {/* 模块导航分区 - 系统服务 */}
          {systemServicesModules.length > 0 && (
            <ModuleNavigationSection title="⚙️ 系统服务">
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
            </ModuleNavigationSection>
          )}

          {/* 服务状态监测分区 */}
          <ServiceMonitorSection collapsible={true} defaultExpanded={false}>
            <ServiceStatusMonitor
              serviceStatuses={serviceStatuses}
              onRefresh={refreshServiceStatuses}
            />
          </ServiceMonitorSection>

          {/* 最近活动分区 */}
          <RecentActivitySection
            defaultExpanded={false}
            headerRight={
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: "primary.main",
                  cursor: "pointer",
                  "&:hover": { color: "primary.dark" },
                }}
              >
                查看全部
              </Typography>
            }
          >
            <RecentActivities activities={recentActivities} />
          </RecentActivitySection>

          {/* 页脚 */}
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
