import i18n from '@/i18n';
/**
 * Service Port Registry — Single Source of Truth
 * Synced with: config/services.yaml, docker/docker-compose.yml, deploy/nginx/topems.conf
 *
 * Any port change MUST update all three locations above.
 */

export interface ServicePort {
  name: string;
  port: number;
  description: string;
  category: string;
}

export const SERVICE_PORTS: Record<string, ServicePort> = {
  core: {
    name: 'unified-core',
    port: 8000,
    description: i18n.t('shared.service-ports.k0'),
    category: 'core',
  },
  erp: {
    name: 'erp',
    port: 8010,
    description: i18n.t('shared.service-ports.k1'),
    category: 'business',
  },
  hrm: {
    name: 'hrm',
    port: 8020,
    description: i18n.t('shared.service-ports.k2'),
    category: 'collaboration',
  },
  pm: {
    name: 'pm',
    port: 8023,
    description: i18n.t('shared.service-ports.k3'),
    category: 'collaboration',
  },
  crm: {
    name: 'crm',
    port: 8029,
    description: i18n.t('shared.service-ports.k4'),
    category: 'collaboration',
  },
  mes: {
    name: 'mes',
    port: 8030,
    description: i18n.t('shared.service-ports.k5'),
    category: 'manufacturing',
  },
  pdm: {
    name: 'pdm',
    port: 8031,
    description: i18n.t('shared.service-ports.k6'),
    category: 'manufacturing',
  },
  scm: {
    name: 'scm',
    port: 8040,
    description: i18n.t('shared.service-ports.k7'),
    category: 'supply-chain',
  },
  wms: {
    name: 'wms',
    port: 8041,
    description: i18n.t('shared.service-ports.k8'),
    category: 'supply-chain',
  },
  srm: {
    name: 'srm',
    port: 8042,
    description: i18n.t('shared.service-ports.k9'),
    category: 'supply-chain',
  },
  qms: {
    name: 'qms',
    port: 8050,
    description: i18n.t('shared.service-ports.k10'),
    category: 'quality-rd',
  },
  lims: {
    name: 'lims',
    port: 8051,
    description: i18n.t('shared.service-ports.k11'),
    category: 'quality-rd',
  },
  ehs: {
    name: 'ehs',
    port: 8052,
    description: i18n.t('shared.service-ports.k12'),
    category: 'quality-rd',
  },
  rd: {
    name: 'rd',
    port: 8053,
    description: i18n.t('shared.service-ports.k13'),
    category: 'quality-rd',
  },
  bi: {
    name: 'bi',
    port: 8060,
    description: i18n.t('shared.service-ports.k14'),
    category: 'analytics',
  },
  report: {
    name: 'report',
    port: 8060,
    description: i18n.t('shared.service-ports.analytics_15'),
    category: 'analytics',
  },
  doc: {
    name: 'doc',
    port: 8000,
    description: i18n.t('shared.service-ports.k16'),
    category: 'core',
  },
  monitor: {
    name: 'monitor',
    port: 8000,
    description: i18n.t('shared.service-ports.k17'),
    category: 'core',
  },
  portal: {
    name: 'portal',
    port: 8063,
    description: i18n.t('shared.service-ports.k18'),
    category: 'analytics',
  },
  ai: {
    name: 'ai',
    port: 8013,
    description: i18n.t('shared.service-ports.ai_0'),
    category: 'business',
  },
  mobile: {
    name: 'mobile',
    port: 8070,
    description: i18n.t('shared.service-ports.k19'),
    category: 'infrastructure',
  },
  gis: {
    name: 'gis',
    port: 8071,
    description: i18n.t('shared.service-ports.k20'),
    category: 'infrastructure',
  },
  integration: {
    name: 'integration',
    port: 8072,
    description: i18n.t('shared.service-ports.k21'),
    category: 'infrastructure',
  },
};
