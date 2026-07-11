import { aiNavConfig } from '@/modules/ai/config';
import { adminNavConfig } from '@/modules/admin/config';
import { assetNavConfig } from './asset.nav';
import { biNavConfig } from './bi.nav';
import { crmNavConfig } from './crm.nav';
import { docNavConfig } from '@/modules/doc/config';
import { ehsNavConfig } from './ehs.nav';
import { erpNavConfig } from './erp.nav';
import { financeNavConfig } from './finance.nav';
import { gisNavConfig } from './gis.nav';
import { hrmNavConfig } from '@/modules/hrm/config';
import { iamNavConfig } from '@/modules/iam/config';
import { imNavConfig } from './im.nav';
import { integrationNavConfig } from '@/modules/integration/config';
import { limsNavConfig } from './lims.nav';
import { lowcodeNavConfig } from './lowcode.nav';
import { mesNavConfig } from './mes.nav';
import { mobileNavConfig } from '@/modules/mobile/config';
import { monitorNavConfig } from '@/modules/monitor/config';
import { notificationNavConfig } from '@/modules/notification/config';
import { oaNavConfig } from './oa.nav';
import { pdmNavConfig } from './pdm.nav';
import { pmNavConfig } from './pm.nav';
import { pluginNavConfig } from './plugin.nav';
import { qmsNavConfig } from './qms.nav';
import { reportNavConfig } from '@/modules/report/config';
import { rsNavConfig } from './rs.nav';
import { scmNavConfig } from './scm.nav';
import { srmNavConfig } from './srm.nav';
import { wmsNavConfig } from './wms.nav';
import { workflowNavConfig } from '@/modules/workflow/config';
import type { ModuleNavConfig } from '../types';

export const coreModuleNavConfigs: ModuleNavConfig[] = [
  adminNavConfig,
  iamNavConfig,
  workflowNavConfig,
  notificationNavConfig,
  docNavConfig,
  monitorNavConfig,
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
  oaNavConfig,
  lowcodeNavConfig,
  rsNavConfig,
  assetNavConfig,
  pluginNavConfig,
  imNavConfig,
  biNavConfig,
  gisNavConfig,
  reportNavConfig,
  limsNavConfig,
  ehsNavConfig,
];

export {
  aiNavConfig,
  adminNavConfig,
  assetNavConfig,
  biNavConfig,
  crmNavConfig,
  docNavConfig,
  ehsNavConfig,
  erpNavConfig,
  financeNavConfig,
  gisNavConfig,
  hrmNavConfig,
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
  rsNavConfig,
  scmNavConfig,
  srmNavConfig,
  wmsNavConfig,
  workflowNavConfig,
};
