/**
 * TOPEMS 端口单一信源（Single Source of Truth）
 *
 * 数据来源：config/ports.env（后端 80xx + 基础设施）
 *         config/ports.env 末尾 MF_*_PORT 段（前端 Module Federation 30xx）
 *
 * 消费方：
 *  - apps/web/vite.config.ts  -> buildServiceProxies() API 代理（BACKEND_PORTS）
 *  - apps/web/src/microfrontend/config.ts -> REMOTE_MODULES 开发入口（MF_PORTS）
 *  - 任何需要动态端口的前端代码
 *
 * 注意：如需要新增端口，请修改 config/ports.env 后同步更新此文件两处
 */

// ── 后端服务 / 基础设施端口（80xx + 其他） ──────────────────────────
// 与 config/ports.env 完全对齐；端口权威来源为 ports.env
// ── Module Federation 前端独立 Dev Server 端口（3001-3019） ────────
// 与 config/ports.env `MF_*_PORT=30xx` 完全对齐；开发环境按微前端模块独立启动
export const MF_PORTS: Record<string, number> = {
  topems_core: 3001,
  topems_erp: 3002,
  topems_hrm: 3003,
  topems_crm: 3004,
  topems_scm: 3005,
  topems_wms: 3006,
  topems_mes: 3007,
  topems_pm: 3008,
  topems_finance: 3009,
  topems_srm: 3010,
  topems_pdm: 3011,
  topems_qms: 3012,
  topems_lims: 3013,
  topems_ehs: 3014,
  topems_bi: 3015,
  topems_monitor: 3016,
  topems_ai: 3017,
  topems_gis: 3018,
  topems_doc: 3019,
} as const;

/**
 * 便捷查找：按名称获取后端端口（找不到时返回 8000）
 */
/**
 * 便捷查找：按 federation 模块名获取 MF Dev Server 端口（找不到时返回 3000）
 */
export function getMfPort(name: string, fallback: number = 3000): number {
  return MF_PORTS[name] ?? fallback;
}
