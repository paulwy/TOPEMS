import { adminNavConfig } from '@/module-configs/admin/config';
import { aiNavConfig } from '@/module-configs/ai/config';
import { apsNavConfig } from '@/module-configs/aps/config';
import { assetNavConfig } from '@/module-configs/asset/config';
import { automationNavConfig } from '@/module-configs/automation/config';
import { biNavConfig } from '@/module-configs/bi/config';
import { crmNavConfig } from '@/module-configs/crm/config';
import { docNavConfig } from '@/module-configs/doc/config';
import { ehsNavConfig } from '@/module-configs/ehs/config';
import { erpNavConfig } from '@/module-configs/erp/config';
import { financeNavConfig } from '@/module-configs/finance/config';
import { gisNavConfig } from '@/module-configs/gis/config';
import { hrmNavConfig } from '@/module-configs/hrm/config';
import { iamNavConfig } from '@/module-configs/iam/config';
import { imNavConfig } from '@/module-configs/im/config';
import { integrationNavConfig } from '@/module-configs/integration/config';
import { limsNavConfig } from '@/module-configs/lims/config';
import { masterNavConfig } from '@/module-configs/master/config';
import { mesNavConfig } from '@/module-configs/mes/config';
import { mobileNavConfig } from '@/module-configs/mobile/config';
import { monitorNavConfig } from '@/module-configs/monitor/config';
import { notificationNavConfig } from '@/module-configs/notification/config';
import { oaNavConfig } from '@/module-configs/oa/config';
import { pdmNavConfig } from '@/module-configs/pdm/config';
import { pluginNavConfig } from '@/module-configs/plugin/config';
import { pmNavConfig } from '@/module-configs/pm/config';
import { qmsNavConfig } from '@/module-configs/qms/config';
import { rdNavConfig } from '@/module-configs/rd/config';
import { reportNavConfig } from '@/module-configs/report/config';
import { scmNavConfig } from '@/module-configs/scm/config';
import { srmNavConfig } from '@/module-configs/srm/config';
import { ticketNavConfig } from '@/module-configs/ticket/config';
import { tmsNavConfig } from '@/module-configs/tms/config';
import { wmsNavConfig } from '@/module-configs/wms/config';
import { workflowNavConfig } from '@/module-configs/workflow/config';
import type { ModuleNavConfig } from '../types';

// MONO 内建模式：聚合全部内建模块（含 bi/crm/finance 等专业模块，source='plugin'）的导航配置，
// 统一注册进导航注册表。面包屑/页签/顶部导航走 navigationRegistryV2.findNavItemByPath/getNavHierarchy。
// 消费方：src/lib/navigation/index.ts（注册）+ src/lib/plugin-loader/pluginManager.ts（builtInCodes 核心模块判定）。
// 注意：不要删除各模块 NavConfig 定义，它们是活数据（经本聚合被真消费）；也不要在本文件重新 export 各 NavConfig 名（避免 barrel 转发误判）。
const coreModuleNavConfigs: ModuleNavConfig[] = [
  adminNavConfig,
  aiNavConfig,
  apsNavConfig,
  assetNavConfig,
  automationNavConfig,
  biNavConfig,
  crmNavConfig,
  docNavConfig,
  ehsNavConfig,
  erpNavConfig,
  financeNavConfig,
  gisNavConfig,
  hrmNavConfig,
  iamNavConfig,
  imNavConfig,
  integrationNavConfig,
  limsNavConfig,
  masterNavConfig,
  mesNavConfig,
  mobileNavConfig,
  monitorNavConfig,
  notificationNavConfig,
  oaNavConfig,
  pdmNavConfig,
  pluginNavConfig,
  pmNavConfig,
  qmsNavConfig,
  rdNavConfig,
  reportNavConfig,
  scmNavConfig,
  srmNavConfig,
  ticketNavConfig,
  tmsNavConfig,
  wmsNavConfig,
  workflowNavConfig,
];

export { coreModuleNavConfigs };
