import { aiNavConfig } from '@/modules/ai/config';
import { adminNavConfig } from '@/modules/admin/config';
import { apsNavConfig } from '@/modules/aps/config';
import { automationNavConfig } from '@/modules/automation/config';
import { assetNavConfig } from '@/modules/asset/config';
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
import { lowcodeNavConfig } from '@/modules/lowcode/config';
import { mesNavConfig } from '@/modules/mes/config';
import { mobileNavConfig } from '@/modules/mobile/config';
import { monitorNavConfig } from '@/modules/monitor/config';
import { notificationNavConfig } from '@/modules/notification/config';
import { oaNavConfig } from '@/modules/oa/config';
import { ticketNavConfig } from '@/modules/ticket/config';
import { pdmNavConfig } from '@/modules/pdm/config';
import { pmNavConfig } from '@/modules/pm/config';
import { pluginNavConfig } from '@/modules/plugin/config';
import { qmsNavConfig } from '@/modules/qms/config';
import { reportNavConfig } from '@/modules/report/config';
import { rdNavConfig } from '@/modules/rd/config';
import { scmNavConfig } from '@/modules/scm/config';
import { srmNavConfig } from '@/modules/srm/config';
import { tmsNavConfig } from '@/modules/tms/config';
import { wmsNavConfig } from '@/modules/wms/config';
import { workflowNavConfig } from '@/modules/workflow/config';
import type { ModuleNavConfig } from '../types';

export const coreModuleNavConfigs: ModuleNavConfig[] = [
  adminNavConfig,
  automationNavConfig,
  iamNavConfig,
  workflowNavConfig,
  notificationNavConfig,
  assetNavConfig,
  lowcodeNavConfig,
  oaNavConfig,
  docNavConfig,
  monitorNavConfig,
  ticketNavConfig,
  integrationNavConfig,
  aiNavConfig,
  mobileNavConfig,
  hrmNavConfig,
  financeNavConfig,
  crmNavConfig,
  mesNavConfig,
  qmsNavConfig,
  scmNavConfig,
  erpNavConfig,
  wmsNavConfig,
  pmNavConfig,
  pdmNavConfig,
  srmNavConfig,
  rdNavConfig,
  pluginNavConfig,
  imNavConfig,
  biNavConfig,
  gisNavConfig,
  reportNavConfig,
  limsNavConfig,
  ehsNavConfig,
  tmsNavConfig,
  apsNavConfig,
];

export {
  aiNavConfig,
  adminNavConfig,
  apsNavConfig,
  automationNavConfig,
  assetNavConfig,
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
  lowcodeNavConfig,
  mesNavConfig,
  mobileNavConfig,
  monitorNavConfig,
  notificationNavConfig,
  oaNavConfig,
  pdmNavConfig,
  pmNavConfig,
  pluginNavConfig,
  qmsNavConfig,
  reportNavConfig,
  rdNavConfig,
  scmNavConfig,
  srmNavConfig,
  ticketNavConfig,
  tmsNavConfig,
  wmsNavConfig,
  workflowNavConfig,
};
