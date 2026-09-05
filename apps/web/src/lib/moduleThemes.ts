/**
 * 模块主题配置 - 定义各业务模块的图标、渐变色、主题色
 *
 * NOTE: 当前未被任何组件直接导入。保留作为基础设施配置，
 * 未来可在模块概览页、侧边栏、主题切换等功能中使用。
 * 可通过 `import { getModuleThemes, getModuleTheme } from '@/lib/moduleThemes'` 使用。
 */
import type React from 'react';
import {
  Shield,
  Users,
  Building2,
  Package,
  Factory,
  Wallet,
  Truck,
  Handshake,
  FolderKanban,
  FlaskConical,
  ClipboardCheck,
  Settings,
  BarChart3,
  Workflow,
  BookOpen,
  Activity,
  Bell,
  Database,
  Zap,
  Puzzle,
  FileBarChart,
  Code2,
  Map,
  Plug,
  MessageSquare,
} from 'lucide-react';
import i18n from '@/i18n';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export interface ModuleTheme {
  code: string;
  name: string;
  icon: React.ComponentType;
  gradient: string;
  color: string;
}

export function getModuleThemes(): Record<string, ModuleTheme> {
  return {
    iam: {
      code: 'iam',
      name: i18n.t('module_themes.iam'),
      icon: Shield,
      gradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      color: ct.secondary[400],
    },
    crm: {
      code: 'crm',
      name: i18n.t('module_themes.crm'),
      icon: Users,
      gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
      color: ct.info.main,
    },
    erp: {
      code: 'erp',
      name: i18n.t('module_themes.erp'),
      icon: Building2,
      gradient: `linear-gradient(135deg, ${ct.warning[500]} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning[500],
    },
    wms: {
      code: 'wms',
      name: i18n.t('module_themes.wms'),
      icon: Package,
      gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
      color: ct.info.main,
    },
    mes: {
      code: 'mes',
      name: i18n.t('module_themes.mes'),
      icon: Factory,
      gradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error.dark} 100%)`,
      color: ct.error.main,
    },
    qms: {
      code: 'qms',
      name: i18n.t('module_themes.qms'),
      icon: ClipboardCheck,
      gradient: `linear-gradient(135deg, ${ct.info[400]} 0%, ${ct.info.dark} 100%)`,
      color: ct.info[400],
    },
    hrm: {
      code: 'hrm',
      name: i18n.t('module_themes.hrm'),
      icon: Users,
      gradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      color: ct.success.main,
    },
    finance: {
      code: 'finance',
      name: i18n.t('module_themes.finance'),
      icon: Wallet,
      gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
      color: ct.success.main,
    },
    scm: {
      code: 'scm',
      name: i18n.t('module_themes.scm'),
      icon: Truck,
      gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning.main,
    },
    srm: {
      code: 'srm',
      name: i18n.t('module_themes.srm'),
      icon: Handshake,
      gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
      color: ct.success[400],
    },
    pm: {
      code: 'pm',
      name: i18n.t('module_themes.pm'),
      icon: FolderKanban,
      gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning.main,
    },
    ehs: {
      code: 'ehs',
      name: i18n.t('module_themes.ehs'),
      icon: Activity,
      gradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      color: ct.success.main,
    },
    lims: {
      code: 'lims',
      name: i18n.t('module_themes.lims'),
      icon: FlaskConical,
      gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
      color: ct.success[400],
    },
    bi: {
      code: 'bi',
      name: i18n.t('module_themes.bi'),
      icon: BarChart3,
      gradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      color: ct.secondary.main,
    },
    workflow: {
      code: 'workflow',
      name: i18n.t('module_themes.workflow'),
      icon: Workflow,
      gradient: `linear-gradient(135deg, ${ct.info.main} 0%, ${ct.info.dark} 100%)`,
      color: ct.info.main,
    },
    docs: {
      code: 'docs',
      name: i18n.t('module_themes.docs'),
      icon: BookOpen,
      gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning.main,
    },
    monitor: {
      code: 'monitor',
      name: i18n.t('module_themes.monitor'),
      icon: Activity,
      gradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error.dark} 100%)`,
      color: ct.error.main,
    },
    notification: {
      code: 'notification',
      name: i18n.t('module_themes.notification'),
      icon: Bell,
      gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning.main,
    },
    integration: {
      code: 'integration',
      name: i18n.t('module_themes.integration'),
      icon: Plug,
      gradient: `linear-gradient(135deg, ${ct.grey[500]} 0%, ${ct.grey[600]} 100%)`,
      color: ct.grey[500],
    },
    gis: {
      code: 'gis',
      name: i18n.t('module_themes.gis'),
      icon: Map,
      gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
      color: ct.success.main,
    },
    pdm: {
      code: 'pdm',
      name: i18n.t('module_themes.pdm'),
      icon: Database,
      gradient: `linear-gradient(135deg, ${ct.info[400]} 0%, ${ct.info.dark} 100%)`,
      color: ct.info[400],
    },
    rs: {
      code: 'rs',
      name: i18n.t('module_themes.rs'),
      icon: Code2,
      gradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.dark} 100%)`,
      color: ct.secondary[400],
    },
    report: {
      code: 'report',
      name: i18n.t('module_themes.report'),
      icon: FileBarChart,
      gradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      color: ct.primary.main,
    },
    plugin: {
      code: 'plugin',
      name: i18n.t('module_themes.plugin'),
      icon: Puzzle,
      gradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      color: ct.warning.main,
    },
    ai: {
      code: 'ai',
      name: i18n.t('module_themes.ai'),
      icon: Zap,
      gradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      color: ct.primary.main,
    },
    admin: {
      code: 'admin',
      name: i18n.t('module_themes.admin'),
      icon: Settings,
      gradient: `linear-gradient(135deg, ${ct.grey[500]} 0%, ${ct.grey[600]} 100%)`,
      color: ct.grey[500],
    },
    im: {
      code: 'im',
      name: i18n.t('module_themes.im'),
      icon: MessageSquare,
      gradient: `linear-gradient(135deg, ${ct.success[400]} 0%, ${ct.success.dark} 100%)`,
      color: ct.success.main,
    },
  };
}

export function getModuleTheme(moduleCode: string): ModuleTheme | undefined {
  return getModuleThemes()[moduleCode.toLowerCase()];
}

export function getModuleThemeFromPath(pathname: string): ModuleTheme | undefined {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return undefined;
  return getModuleTheme(pathParts[0]);
}
