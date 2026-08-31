/**
 * TOPEMS 微服务名称常量（P2-R5 跨端共享）
 *
 * 单一信源：与后端 `config/services.yaml` 的 `service_groups` + `virtual_services` 严格对齐。
 * 所有前端应用（web/desktop/mobile）共享同一份 ServiceName 联合类型，避免漂移。
 *
 * 注意：前端 apiPath.ts 中的 SERVICE_CODES 是「前端别名 → 后端服务名」的映射层，
 * 别名（如 workflow→flow、master→master-data）属于前端路由关注点，不在此处声明。
 *
 * 同步校验：scripts/validate-plugin-config.py 会校验 plugin.yaml 与 services.yaml 一致性。
 */

// 后端独立进程服务（service_groups）
const INDEPENDENT_SERVICES = [
  // 核心服务 (8000-8009)
  'iam',
  // 经营管理 (8010-8019)
  'erp',
  'finance',
  'ai',
  // 协同办公 (8020-8029)
  'hrm',
  'pm',
  'crm',
  // 生产制造 (8030-8039)
  'mes',
  'pdm',
  // 供应链 (8040-8049)
  'scm',
  'wms',
  'srm',
  // 质量/研发 (8050-8059)
  'qms',
  'lims',
  'ehs',
  'rd',
  // 数据分析/门户 (8060-8069)
  'bi',
  'portal',
  // 基础设施 (8070-8079)
  'mobile',
  'gis',
  'integration',
  // 主数据 (8090)
  'master-data',
  // 扩展服务 (8082-8088)
  'search',
  'communication',
  'billing',
  'ticket',
  'feedback',
  // [V2026.08 已移除] 'lowcode'（空壳服务已归档 svc/_archive/lowcode）
  // 监控与插件 (8095-8096)
  'monitor',
  'plugin-registry',
  // 物流服务 (8073-8074，V284 补全至单一信源)
  'tms',
  'aps',
] as const;

// unified-core 虚拟服务（virtual_services，由 unified-core:8000 承载）
const VIRTUAL_SERVICES = [
  'flow',
  'file',
  'doc',
  'automation',
] as const;

export const SERVICE_NAMES = [...INDEPENDENT_SERVICES, ...VIRTUAL_SERVICES] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

/**
 * 校验字符串是否为合法的 ServiceName
 */
export function isValidServiceName(name: string): name is ServiceName {
  return (SERVICE_NAMES as readonly string[]).includes(name);
}
