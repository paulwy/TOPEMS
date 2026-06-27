import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
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
} from 'lucide-react';
import { docApi } from '@/api/doc';
import { workflowApi } from '@/api/workflow';
import { erpApi } from '@/api/erp';
import { hrmApi } from '@/api/hrm';
import { mobileApi } from '@/api/mobile';
import { pluginApi, type TenantInstalledPlugin } from '@/api/plugin';
import { qmsApi } from '@/api/qms';
import { ehsApi } from '@/api/ehs';
import { srmApi } from '@/api/srm';
import { limsApi } from '@/api/lims';
import { rsApi } from '@/api/rs';
import { biApi } from '@/api/bi';
import { scmApi } from '@/api/scm';
import { useInstalledPlugins } from '../../context/PluginContext';
import MobileHeader from '@/components/layout/MobileHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { useServiceStatus } from '@/hooks/useServiceStatus';
import { StatsChart } from '@/components/bi/StatsChart';
import { MetricCard } from '@/components/bi/MetricCard';
import { useAppStore } from '../../store';
import {
  DashboardQuickActions,
  defaultQuickActions,
  ModuleCard,
  type ModuleItem,
  ServiceStatusMonitor,
  RecentActivities,
  type ActivityItem,
  DashboardSection,
  QuickAccessSection,
  TodoListSection,
  ModuleNavigationSection,
  ServiceMonitorSection,
  RecentActivitySection,
} from '@/components/dashboard';
import { PageContainer } from '@/components/common';

interface DashboardPageProps {
  onLogout?: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: authLogout, isAuthenticated, hasPermission } = useAuth();
  const { serviceStatuses, refresh: refreshServiceStatuses } = useServiceStatus();
  const { installedPlugins, isPluginInstalled } = useInstalledPlugins();
  const shortcuts = useAppStore((state) => state.shortcuts);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [moduleStatsLoading, setModuleStatsLoading] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(false);
  const [todosLoading, setTodosLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [moduleStatsError, setModuleStatsError] = useState<string | null>(null);
  const [chartDataError, setChartDataError] = useState<string | null>(null);
  const [todosError, setTodosError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    fileCount: 0,
    workflowCount: 0,
    docCount: 0,
    notificationCount: 0,
  });
  const [moduleStats, setModuleStats] = useState({
    qms: { total: 0, active: 0 },
    ehs: { total: 0, active: 0 },
    srm: { total: 0, active: 0 },
    lims: { total: 0, active: 0 },
    rs: { total: 0, active: 0 },
  });
  const [chartData, setChartData] = useState({
    moduleDistribution: [] as { name: string; value: number; color: string }[],
    monthlyTrend: [] as { name: string; value: number }[],
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [todoTab, setTodoTab] = useState(0);
  const [todos, setTodos] = useState<
    Array<{ id: number; title: string; type: string; done: boolean }>
  >([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moduleToService: Record<string, string> = {
    rs: 'rs',
    lims: 'lims',
    doc: 'doc',
    ai: 'ai',
    workflow: 'flow',
    iam: 'iam',
    qms: 'qms',
    ehs: 'ehs',
    srm: 'srm',
    pdm: 'pdm',
    crm: 'crm',
    mes: 'mes',
    mail: 'mail',
    mobile: 'mobile',
    hrm: 'hrm',
    erp: 'erp',
    gis: 'gis',
    pm: 'pm',
    bi: 'bi',
    integration: 'integration',
    notification: 'notification',
    portal: 'portal',
    scm: 'scm',
    wms: 'wms',
    im: 'im',
    report: 'report',
    contract: 'hrm',
  };

  const initialized = useRef(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [docRes, flowStatsRes, notificationRes] = await Promise.allSettled([
        docApi.list(),
        workflowApi.getStatistics(),
        user?.id ? workflowApi.getNotificationCount(user.id) : Promise.resolve({ success: false, data: { count: 0 } } as any),
      ]);

      const docData = docRes.status === 'fulfilled' && docRes.value.success ? docRes.value.data : null;
      const flowData = flowStatsRes.status === 'fulfilled' && flowStatsRes.value.success ? flowStatsRes.value.data : null;
      const notificationData = notificationRes.status === 'fulfilled' && notificationRes.value.success ? notificationRes.value.data : null;

      const newStats = {
        fileCount: docData?.files?.length || 0,
        docCount: docData?.total || 0,
        workflowCount: flowData?.total_workflows || 0,
        notificationCount: (notificationData as any)?.count ?? (notificationData as any)?.total ?? 0,
      };

      setStats(newStats);
    } catch (err: unknown) {
      apiLogger.error('加载统计失败:', err);
      setStatsError(err instanceof Error ? err.message : '加载统计失败');
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id]);

  const loadModuleStats = useCallback(async () => {
    setModuleStatsLoading(true);
    setModuleStatsError(null);
    try {
      const [qmsRes, srmRes, limsRes, rsRes, ehsRes] = await Promise.allSettled([
        qmsApi.getStatistics(),
        srmApi.getStatistics(),
        limsApi.getStatistics(),
        rsApi.getStatistics(),
        ehsApi.listHazards({ page: 1, page_size: 1000 }),
      ]);

      const newModuleStats = {
        qms: {
          total:
            (qmsRes.status === 'fulfilled' && qmsRes.value.success && qmsRes.value.data?.total_inspections) || 0,
          active:
            (qmsRes.status === 'fulfilled' && qmsRes.value.success && qmsRes.value.data?.active_standards) || 0,
        },
        ehs: {
          total:
            (ehsRes.status === 'fulfilled' && ehsRes.value.success && ehsRes.value.data?.total) || 0,
          active:
            (ehsRes.status === 'fulfilled' &&
              ehsRes.value.success &&
              ehsRes.value.data?.data?.filter((h: any) => h.status === 'active').length) || 0,
        },
        srm: {
          total:
            (srmRes.status === 'fulfilled' && srmRes.value.success && srmRes.value.data?.total_suppliers) || 0,
          active:
            (srmRes.status === 'fulfilled' && srmRes.value.success && srmRes.value.data?.active_suppliers) || 0,
        },
        lims: {
          total:
            (limsRes.status === 'fulfilled' && limsRes.value.success && limsRes.value.data?.total_samples) || 0,
          active:
            (limsRes.status === 'fulfilled' && limsRes.value.success && limsRes.value.data?.testing_samples) || 0,
        },
        rs: {
          total:
            (rsRes.status === 'fulfilled' && rsRes.value.success && rsRes.value.data?.total_projects) || 0,
          active:
            (rsRes.status === 'fulfilled' && rsRes.value.success && rsRes.value.data?.in_progress_projects) || 0,
        },
      };

      setModuleStats(newModuleStats);
    } catch (err: unknown) {
      apiLogger.error('加载模块统计失败:', err);
      setModuleStatsError(err instanceof Error ? err.message : '加载模块统计失败');
    } finally {
      setModuleStatsLoading(false);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    setChartDataLoading(true);
    setChartDataError(null);
    try {
      const [summaryRes, flowStatsRes] = await Promise.allSettled([
        biApi.fetchSummaryDashboard(),
        workflowApi.getStatistics(),
      ]);

      const summary = summaryRes.status === 'fulfilled' && summaryRes.value.success ? summaryRes.value.data : null;
      const flowStats = flowStatsRes.status === 'fulfilled' && flowStatsRes.value.success ? flowStatsRes.value.data : null;

      setChartData({
        moduleDistribution: summary?.key_metrics?.map((metric: any) => ({
          name: metric.title,
          value: metric.value,
          color: metric.icon || '#3b82f6',
        })) || [],
        monthlyTrend: flowStats?.monthly_data?.map((item: any) => ({
          name: item.month,
          value: item.instances_started || item.approvals_processed || 0,
        })) || [],
      });
    } catch (err: unknown) {
      apiLogger.error('加载图表数据失败:', err);
      setChartDataError(err instanceof Error ? err.message : '加载图表数据失败');
    } finally {
      setChartDataLoading(false);
    }
  }, []);

  const loadTodos = useCallback(async () => {
    setTodosLoading(true);
    setTodosError(null);
    try {
      const [tasksRes] = await Promise.allSettled([
        workflowApi.listApprovalTasks({ status: 'pending', page: 1, page_size: 10 }),
      ]);

      if (tasksRes.status === 'fulfilled' && tasksRes.value.success && tasksRes.value.data?.items) {
        const tasks = tasksRes.value.data.items.map((task: any, index: number) => ({
          id: task.id ? parseInt(task.id, 10) || index + 1 : index + 1,
          title: task.task_name || task.name || '待办任务',
          type: task.workflow_name || 'workflow',
          done: task.status === 'completed' || task.status === 'approved',
        }));
        setTodos(tasks);
      }
    } catch (err: unknown) {
      apiLogger.error('加载待办任务失败:', err);
      setTodosError(err instanceof Error ? err.message : '加载待办任务失败');
    } finally {
      setTodosLoading(false);
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const [logsRes] = await Promise.allSettled([
        scmApi.auditLogs.list({ page: 1, pageSize: 10 }),
      ]);

      if (logsRes.status === 'fulfilled' && logsRes.value.success && logsRes.value.data?.items) {
        const logs = logsRes.value.data.items;
        const activities: ActivityItem[] = logs.map((log: any) => {
          let icon = <User size={16} />;
          let type = '系统';

          if (log.module?.includes('doc') || log.module?.includes('file')) {
            icon = <FileText size={16} />;
            type = '文档';
          } else if (log.module?.includes('flow') || log.module?.includes('workflow') || log.module?.includes('approval')) {
            icon = <GitBranch size={16} />;
            type = '工作流';
          } else if (log.module?.includes('folder')) {
            icon = <Folder size={16} />;
            type = '文档';
          }

          const timeDiff = Date.now() - new Date(log.created_at).getTime();
          const minutes = Math.floor(timeDiff / 60000);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          let time = '刚刚';
          if (days > 0) {
            time = `${days}天前`;
          } else if (hours > 0) {
            time = `${hours}小时前`;
          } else if (minutes > 0) {
            time = `${minutes}分钟前`;
          }

          return {
            id: log.id,
            title: log.action || '系统操作',
            type,
            time,
            icon,
          };
        });

        setRecentActivities(activities);
      }
    } catch (err: unknown) {
      apiLogger.error('加载最近活动失败:', err);
      setActivitiesError(err instanceof Error ? err.message : '加载最近活动失败');
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const shouldShowModule = useCallback(
    (module: { permission?: string | null; module?: string | null }): boolean => {
      // 1. 检查权限
      const hasAccess =
        !module.permission || (user?.is_superuser ? true : hasPermission(module.permission));
      if (!hasAccess) return false;

      // 2. 如果没有指定 module，默认显示（如通讯录、帮助中心等）
      if (!module.module) return true;

      // 3. 检查插件是否已安装
      if (!isPluginInstalled(module.module)) return false;

      // 4. 检查服务是否在线
      const serviceKey = moduleToService[module.module];
      return serviceStatuses[serviceKey];
    },
    [hasPermission, user?.is_superuser, moduleToService, serviceStatuses, isPluginInstalled]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
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
          apiLogger.warn('加载统计数据失败:', err);
        });
        await loadModuleStats().catch((err) => {
          apiLogger.warn('加载模块统计失败:', err);
        });
        await loadChartData().catch((err) => {
          apiLogger.warn('加载图表数据失败:', err);
        });
        await loadTodos().catch((err) => {
          apiLogger.warn('加载待办任务失败:', err);
        });
        await loadRecentActivities().catch((err) => {
          apiLogger.warn('加载最近活动失败:', err);
        });
      } catch (err: unknown) {
        apiLogger.error('初始化失败:', err);
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
    loadModuleStats,
    loadChartData,
    loadTodos,
    loadRecentActivities,
  ]);

  const handleLogout = useCallback(() => {
    authLogout();
    navigate('/login');
    onLogout?.();
  }, [authLogout, navigate, onLogout]);

  const handleQuickAccess = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  const coreModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: '文档管理',
          icon: FileText,
          description: '文件上传、下载、版本管理',
          path: '/documents',
          color: 'bg-blue-500',
          status: 'online' as const,
          permission: 'doc:read',
          module: 'doc',
        },
        {
          title: 'AI 知识库',
          icon: Bot,
          description: '智能问答、知识检索',
          path: '/ai',
          color: 'bg-purple-500',
          status: 'online' as const,
          permission: 'ai:read',
          module: 'ai',
        },
        {
          title: '工作流',
          icon: GitBranch,
          description: '流程审批、任务管理',
          path: '/flow/definitions',
          color: 'bg-green-500',
          status: 'online' as const,
          permission: 'workflow:read',
          module: 'workflow',
        },
        {
          title: '通讯录',
          icon: Book,
          description: '企业通讯录、组织架构',
          path: '/addressbook',
          color: 'bg-emerald-500',
          status: 'online' as const,
          permission: null,
          module: null,
        },
        {
          title: '项目管理',
          icon: FolderKanban,
          description: '项目全生命周期、合同、预算、风险管理',
          path: '/pm/projects',
          color: 'bg-rose-500',
          status: 'online' as const,
          permission: null,
          module: 'pm',
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule]
  );

  const systemServicesModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: '系统管理',
          icon: Settings,
          description: '用户、角色、权限、系统设置管理',
          path: '/iam/system',
          color: 'bg-slate-600',
          status: 'online' as const,
          permission: 'iam:system_update',
          module: 'iam',
          adminOnly: true,
        },
        {
          title: '系统集成',
          icon: Link,
          description: 'LIMS-QMS/MES-ERP/WMS-SCM 等系统间数据同步',
          path: '/integration',
          color: 'bg-blue-500',
          status: 'online' as const,
          permission: 'iam:system_update',
          module: 'integration',
          adminOnly: true,
        },
        {
          title: '报表中心',
          icon: BarChart3,
          description: 'RS/LIMS/QMS/EHS/SRM/PDM 各模块报表',
          path: '/report/list',
          color: 'bg-emerald-500',
          status: 'online' as const,
          permission: 'iam:system_update',
          module: 'iam',
          adminOnly: true,
        },
        {
          title: '模板管理',
          icon: FileText,
          description: '文档模板、流程模板管理',
          path: '/templates',
          color: 'bg-violet-500',
          status: 'online' as const,
          permission: 'doc:admin',
          module: 'doc',
          adminOnly: true,
        },
        {
          title: '帮助中心',
          icon: HelpCircle,
          description: '使用指南、视频教程、常见问题',
          path: '/help',
          color: 'bg-amber-500',
          status: 'online' as const,
          permission: null,
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule]
  );

  const businessModules = useMemo(
    (): ModuleItem[] =>
      [
        {
          title: '公司管理',
          icon: Building,
          description: '企业信息、组织架构',
          path: '/hrm/companies',
          color: 'bg-blue-500',
          status: 'online' as const,
          permission: 'hrm:read',
          module: 'hrm',
          adminOnly: true,
        },
        {
          title: '部门管理',
          icon: Folder,
          description: '部门结构、层级关系',
          path: '/hrm/departments',
          color: 'bg-teal-500',
          status: 'online' as const,
          permission: 'hrm:read',
          module: 'hrm',
          adminOnly: true,
        },
        {
          title: '员工管理',
          icon: Users,
          description: '员工信息、任职管理',
          path: '/hrm/employees',
          color: 'bg-emerald-500',
          status: 'online' as const,
          permission: 'hrm:read',
          module: 'hrm',
          adminOnly: true,
        },
        {
          title: '薪酬管理',
          icon: DollarSign,
          description: '薪资计算、奖金社保、个税管理',
          path: '/hrm/payroll',
          color: 'bg-yellow-500',
          status: 'online' as const,
          permission: 'hrm:read',
          module: 'hrm',
          adminOnly: true,
        },
        {
          title: '资产管理',
          icon: Box,
          description: '企业资产、设备台账、点巡检、维护维修',
          path: '/assets',
          color: 'bg-purple-500',
          status: 'online' as const,
          permission: 'erp:admin',
          module: 'erp',
          adminOnly: true,
        },
        {
          title: '行政办公',
          icon: Briefcase,
          description: '办公用品、会议室、车辆、公告管理',
          path: '/administration',
          color: 'bg-sky-500',
          status: 'online' as const,
          permission: 'erp:admin',
          module: 'erp',
          adminOnly: true,
        },
        {
          title: '合同管理',
          icon: FileCheck,
          description: '员工合同、续签流程、到期提醒',
          path: '/hrm/contracts',
          color: 'bg-violet-500',
          status: 'online' as const,
          permission: 'contract:read',
          module: 'contract',
          adminOnly: true,
        },
        {
          title: '预算管理',
          icon: TrendingUp,
          description: '部门预算、使用进度、预警',
          path: '/budget',
          color: 'bg-green-500',
          status: 'online' as const,
          permission: 'erp:admin',
          module: 'erp',
          adminOnly: true,
        },
        {
          title: '费用管理',
          icon: Receipt,
          description: '费用报销、预算、应收应付',
          path: '/finance',
          color: 'bg-indigo-500',
          status: 'online' as const,
          permission: 'erp:admin',
          module: 'erp',
          adminOnly: true,
        },
        {
          title: '文档中心',
          icon: BookOpen,
          description: '企业文档管理、知识共享',
          path: '/document-center',
          color: 'bg-blue-500',
          status: 'online' as const,
          permission: 'doc:read',
          module: 'doc',
        },
        {
          title: '商业智能',
          icon: BarChart3,
          description: '数据大屏、概览分析、各模块数据统计',
          path: '/bi/dashboard',
          color: 'bg-emerald-500',
          status: 'new' as const,
          permission: null,
          module: 'bi',
        },
        {
          title: '科研研发',
          icon: FlaskConical,
          description: '项目管理、配方管理',
          path: '/rs',
          color: 'bg-orange-500',
          status: 'beta' as const,
          permission: 'rs:read',
          module: 'rs',
        },
        {
          title: '实验室管理',
          icon: ClipboardList,
          description: '样品管理、检测记录',
          path: '/lims',
          color: 'bg-cyan-500',
          status: 'beta' as const,
          permission: 'lims:read',
          module: 'lims',
        },
        {
          title: '质量管理',
          icon: Shield,
          description: '质量管控、合规管理',
          path: '/qms',
          color: 'bg-indigo-500',
          status: 'online' as const,
          permission: 'qms:read',
          module: 'qms',
        },
        {
          title: '环境健康安全',
          icon: AlertCircle,
          description: '安全风险、应急预案',
          path: '/ehs',
          color: 'bg-red-500',
          status: 'online' as const,
          permission: 'ehs:read',
          module: 'ehs',
        },
        {
          title: '供应商关系',
          icon: Users,
          description: '供应商管理、采购订单',
          path: '/srm',
          color: 'bg-purple-500',
          status: 'online' as const,
          permission: 'srm:read',
          module: 'srm',
        },
        {
          title: '生产数据管理',
          icon: Package,
          description: '生产工艺、配方批次',
          path: '/pdm',
          color: 'bg-amber-500',
          status: 'online' as const,
          permission: 'pdm:read',
          module: 'pdm',
        },
        {
          title: '厂区空间',
          icon: MapPin,
          description: '设备点位、管线、仓储管理',
          path: '/gis',
          color: 'bg-teal-500',
          status: 'new' as const,
          permission: 'gis:read',
          module: 'gis',
        },
        {
          title: '移动工作台',
          icon: Smartphone,
          description: '巡检打卡、扫码入库、移动任务',
          path: '/mobile-workstation',
          color: 'bg-indigo-500',
          status: 'new' as const,
          permission: null,
          module: 'mobile',
        },
        {
          title: '即时通讯',
          icon: MessageSquare,
          description: '聊天会话、项目群组、消息通知',
          path: '/im',
          color: 'bg-pink-500',
          status: 'new' as const,
          permission: 'im:read',
          module: 'im',
        },
        {
          title: '邮件管理',
          icon: Mail,
          description: '邮件发送、模板管理、邮件记录',
          path: '/mail',
          color: 'bg-cyan-500',
          status: 'new' as const,
          permission: 'mail:read',
          module: 'mail',
        },
      ].filter((module) => shouldShowModule(module)),
    [shouldShowModule]
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', color: 'grey.600' }}>加载中...</Typography>
      </Box>
    );
  }

  const onlineServices = Object.values(serviceStatuses).filter(Boolean).length;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const pendingTodos = todos.filter((t) => !t.done);
  const completedTodos = todos.filter((t) => t.done);

  const handleTodoToggle = (id: number) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const getTodoIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return <GitBranch size={18} />;
      case 'lims':
        return <ClipboardList size={18} />;
      case 'training':
        return <BookOpen size={18} />;
      case 'report':
        return <FileText size={18} />;
      case 'meeting':
        return <Calendar size={18} />;
      default:
        return <ListTodo size={18} />;
    }
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f8fafc, grey.100)',
      }}
    >
      <MobileHeader
        title='TOPEMS'
        onMenuClick={() => setMobileNavOpen(true)}
      />

      <Box sx={{ '& > .MuiIconButton-root': { display: 'none' } }}>
        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          onOpen={() => setMobileNavOpen(true)}
        />
      </Box>

      <Box className='desktop-only'>
        <Box
          component='main'
          sx={{
            width: '100%',
            py: 4,
          }}
        >
          {/* 欢迎标题 */}
          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                fontSize: '1.875rem',
                fontWeight: 700,
                color: 'grey.900',
                mb: 1,
              }}
            >
              👋 欢迎回来，{user?.full_name || user?.username || '用户'}！
            </Typography>
            <Typography sx={{ color: 'grey.600' }}>
              {getGreeting()}，今天有 {pendingTodos.length} 个待处理事项
            </Typography>
          </Box>

          {/* 今日概览分区 */}
          <DashboardSection
            title='今日概览'
            sx={{ mb: 4 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                gap: 3,
              }}
            >
              <MetricCard
                title='在线服务'
                value={String(onlineServices)}
                icon={<Activity size={24} />}
                color='green'
                change={onlineServices > 5 ? 10 : -5}
              />
              <MetricCard
                title='文件数量'
                value={String(stats.fileCount)}
                icon={<FileText size={24} />}
                color='purple'
                change={8}
              />
              <MetricCard
                title='工作流'
                value={String(stats.workflowCount)}
                icon={<GitBranch size={24} />}
                color='orange'
                change={-3}
              />
              <MetricCard
                title='待处理'
                value={String(pendingTodos.length)}
                icon={<Clock size={24} />}
                color='blue'
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
                  '& .MuiTabs-indicator': {
                    bgcolor: 'primary.main',
                  },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ListTodo size={16} />
                      <Typography sx={{ fontSize: '0.875rem' }}>待处理</Typography>
                      <Badge
                        badgeContent={pendingTodos.length}
                        color='primary'
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  sx={{ minHeight: 36, py: 1 }}
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle size={16} />
                      <Typography sx={{ fontSize: '0.875rem' }}>已完成</Typography>
                      <Badge
                        badgeContent={completedTodos.length}
                        color='success'
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
                    borderBottom: '1px solid',
                    borderColor: 'grey.100',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <ListItemButton
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        checked={todo.done}
                        onChange={() => handleTodoToggle(todo.id)}
                        size='small'
                        sx={{
                          color: 'grey.400',
                          '&.Mui-checked': { color: 'success.main' },
                        }}
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: todo.done ? 'grey.100' : 'primary.50',
                          color: todo.done ? 'grey.500' : 'primary.main',
                        }}
                      >
                        {getTodoIcon(todo.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={todo.title}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          color: todo.done ? 'grey.500' : 'grey.900',
                          textDecoration: todo.done ? 'line-through' : 'none',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </TodoListSection>

          {/* 模块导航分区 - 核心功能 */}
          <ModuleNavigationSection title='🚀 核心功能'>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {coreModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size='large'
                />
              ))}
            </Box>
          </ModuleNavigationSection>

          {/* 模块导航分区 - 业务模块 */}
          <ModuleNavigationSection title='📊 业务模块'>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 3,
              }}
            >
              {businessModules.map((item) => (
                <ModuleCard
                  key={item.title}
                  item={item}
                  onClick={() => navigate(item.path)}
                  size='small'
                />
              ))}
            </Box>
          </ModuleNavigationSection>

          {/* 模块导航分区 - 系统服务 */}
          {systemServicesModules.length > 0 && (
            <ModuleNavigationSection title='⚙️ 系统服务'>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(4, 1fr)',
                  },
                  gap: 3,
                }}
              >
                {systemServicesModules.map((item) => (
                  <ModuleCard
                    key={item.title}
                    item={item}
                    onClick={() => navigate(item.path)}
                    size='medium'
                  />
                ))}
              </Box>
            </ModuleNavigationSection>
          )}

          {/* 服务状态监测分区 */}
          <ServiceMonitorSection
            collapsible={true}
            defaultExpanded={false}
          >
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
                  fontSize: '0.875rem',
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.dark' },
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
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'grey.500',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              TOPEMS v2.0 | 化工新材料企业数字化平台
            </Typography>
            <Typography sx={{ color: 'grey.500', mt: 0.5 }}>
              © 2026 TOPEMS Team. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default DashboardPage;
