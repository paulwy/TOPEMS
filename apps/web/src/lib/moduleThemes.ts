/**
 * 模块主题配置 - 定义各业务模块的图标、渐变色、主题色
 *
 * NOTE: 当前未被任何组件直接导入。保留作为基础设施配置，
 * 未来可在模块概览页、侧边栏、主题切换等功能中使用。
 * 可通过 `import { moduleThemes, getModuleTheme } from '@/lib/moduleThemes'` 使用。
 */
import type React from 'react';
import {
  Shield,
  Users,
  Building2,
  Package,
  Factory,
  LineChart,
  FileText,
  Wallet,
  Truck,
  Handshake,
  FolderKanban,
  CalendarCheck,
  FlaskConical,
  ClipboardCheck,
  Settings,
  BarChart3,
  Workflow,
  BookOpen,
  Activity,
  Bell,
  Database,
  Layers,
  Zap,
  Globe,
  Puzzle,
  FileBarChart,
  Code2,
  Map,
  Plug,
  FileSpreadsheet,
  MessageSquare,
  UserCog,
} from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export interface ModuleTheme {
  code: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  color: string;
}

export const moduleThemes: Record<string, ModuleTheme> = {
  iam: {
    code: 'iam',
    name: '系统管理',
    icon: Shield,
    gradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
    color: ct.secondary[400],
  },
  crm: {
    code: 'crm',
    name: '客户关系管理',
    icon: Users,
    gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
    color: ct.info.main,
  },
  erp: {
    code: 'erp',
    name: '企业资源规划',
    icon: Building2,
    gradient: `linear-gradient(135deg, ${ct.warning[500]} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning[500],
  },
  wms: {
    code: 'wms',
    name: '仓储管理',
    icon: Package,
    gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
    color: ct.info.main,
  },
  mes: {
    code: 'mes',
    name: '制造执行系统',
    icon: Factory,
    gradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error.dark} 100%)`,
    color: ct.error.main,
  },
  qms: {
    code: 'qms',
    name: '质量管理系统',
    icon: ClipboardCheck,
    gradient: `linear-gradient(135deg, ${ct.info[400]} 0%, ${ct.info.dark} 100%)`,
    color: ct.info[400],
  },
  hrm: {
    code: 'hrm',
    name: '人力资源管理',
    icon: Users,
    gradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
    color: ct.success.main,
  },
  finance: {
    code: 'finance',
    name: '财务管理',
    icon: Wallet,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success.main,
  },
  scm: {
    code: 'scm',
    name: '供应链管理',
    icon: Truck,
    gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning.main,
  },
  srm: {
    code: 'srm',
    name: '供应商关系管理',
    icon: Handshake,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success[400],
  },
  pm: {
    code: 'pm',
    name: '项目管理',
    icon: FolderKanban,
    gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning.main,
  },
  oa: {
    code: 'oa',
    name: '办公自动化',
    icon: CalendarCheck,
    gradient: `linear-gradient(135deg, ${ct.info[400]} 0%, ${ct.info.dark} 100%)`,
    color: ct.info[400],
  },
  ehs: {
    code: 'ehs',
    name: '安全环保健康',
    icon: Activity,
    gradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
    color: ct.success.main,
  },
  lims: {
    code: 'lims',
    name: '实验室信息管理',
    icon: FlaskConical,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success[400],
  },
  bi: {
    code: 'bi',
    name: '商业智能',
    icon: BarChart3,
    gradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
    color: ct.secondary.main,
  },
  workflow: {
    code: 'workflow',
    name: '工作流',
    icon: Workflow,
    gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
    color: ct.info.main,
  },
  docs: {
    code: 'docs',
    name: '文档管理',
    icon: BookOpen,
    gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning.main,
  },
  monitor: {
    code: 'monitor',
    name: '系统监控',
    icon: Activity,
    gradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error.dark} 100%)`,
    color: ct.error.main,
  },
  notification: {
    code: 'notification',
    name: '通知中心',
    icon: Bell,
    gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning.main,
  },
  integration: {
    code: 'integration',
    name: '系统集成',
    icon: Plug,
    gradient: `linear-gradient(135deg, ${ct.grey[500]} 0%, ${ct.grey[600]} 100%)`,
    color: ct.grey[500],
  },
  gis: {
    code: 'gis',
    name: '地理信息系统',
    icon: Map,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success.main,
  },
  pdm: {
    code: 'pdm',
    name: '产品数据管理',
    icon: Database,
    gradient: `linear-gradient(135deg, ${ct.info[400]} 0%, ${ct.info.dark} 100%)`,
    color: ct.info[400],
  },
  rs: {
    code: 'rs',
    name: '研发管理',
    icon: Code2,
    gradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
    color: ct.secondary[400],
  },
  report: {
    code: 'report',
    name: '报表管理',
    icon: FileBarChart,
    gradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
    color: ct.primary.main,
  },
  plugin: {
    code: 'plugin',
    name: '插件市场',
    icon: Puzzle,
    gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
    color: ct.warning.main,
  },
  ai: {
    code: 'ai',
    name: 'AI 助手',
    icon: Zap,
    gradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
    color: ct.primary.main,
  },
  admin: {
    code: 'admin',
    name: '管理后台',
    icon: Settings,
    gradient: `linear-gradient(135deg, ${ct.grey[500]} 0%, ${ct.grey[600]} 100%)`,
    color: ct.grey[500],
  },
  asset: {
    code: 'asset',
    name: '资产管理',
    icon: Layers,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success[400],
  },
  im: {
    code: 'im',
    name: '即时通讯',
    icon: MessageSquare,
    gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
    color: ct.success.main,
  },
};

export function getModuleTheme(moduleCode: string): ModuleTheme | undefined {
  return moduleThemes[moduleCode.toLowerCase()];
}

export function getModuleThemeFromPath(pathname: string): ModuleTheme | undefined {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return undefined;
  return getModuleTheme(pathParts[0]);
}
