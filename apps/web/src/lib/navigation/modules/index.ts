import { adminNavConfig } from '@/modules/admin/config';
import { aiNavConfig } from '@/modules/ai/config';
import { apsNavConfig } from '@/modules/aps/config';
import { assetNavConfig } from '@/modules/asset/config';
import { automationNavConfig } from '@/modules/automation/config';
import { biNavConfig } from '@/modules/bi/config';
import { crmNavConfig } from '@/modules/crm/config';
import { docNavConfig } from '@/modules/doc/config';
import { ehsNavConfig } from '@/modules/ehs/config';
import { erpNavConfig } from '@/modules/erp/config';
import { financeNavConfig } from '@/modules/finance/config';
import { gisNavConfig } from '@/modules/gis/config';
import { hrmNavConfig } from '@/modules/hrm/config';
import { iamNavConfig } from '@/modules/iam/config';
import { imNavConfig } from '@/modules/im/config';
import { integrationNavConfig } from '@/modules/integration/config';
import { limsNavConfig } from '@/modules/lims/config';
import { mesNavConfig } from '@/modules/mes/config';
import { mobileNavConfig } from '@/modules/mobile/config';
import { monitorNavConfig } from '@/modules/monitor/config';
import { notificationNavConfig } from '@/modules/notification/config';
import { oaNavConfig } from '@/modules/oa/config';
import { pdmNavConfig } from '@/modules/pdm/config';
import { pluginNavConfig } from '@/modules/plugin/config';
import { pmNavConfig } from '@/modules/pm/config';
import { qmsNavConfig } from '@/modules/qms/config';
import { rdNavConfig } from '@/modules/rd/config';
import { reportNavConfig } from '@/modules/report/config';
import { scmNavConfig } from '@/modules/scm/config';
import { srmNavConfig } from '@/modules/srm/config';
import { ticketNavConfig } from '@/modules/ticket/config';
import { tmsNavConfig } from '@/modules/tms/config';
import { wmsNavConfig } from '@/modules/wms/config';
import { workflowNavConfig } from '@/modules/workflow/config';
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
