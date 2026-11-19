/**
 * 向后兼容桥接：OpenAPI generated types 命名空间重定向
 *
 * 历史：原文件由老一代 generate-openapi-types.sh 生成（29,809 行，V285 前）。
 * 现：由 scripts/openapi/gen-types.mjs 生成的 ./generated/openapi.d.ts 作为权威源
 *      （830 paths / 568 schemas，更全）。
 *
 * 差异说明（V72 A4 老业务代码兼容）：
 *   老脚本的 operationId = "{service_prefix}_{original_oid}"（始终加模块前缀）
 *   新 aggregate.py 规则：仅在 operationId 跨服务冲突时才加 "{svc}_" 前缀
 *   → 老业务代码中显式使用的带前缀 operationId，在此文件中以别名补回
 *   → 新代码建议直接用 generated/openapi.d.ts 的原始 key
 *
 * 本文件通过从 generated/openapi.d.ts 再导出 + 类型别名映射实现，
 * 体积从 29,809 行压缩至 < 200 行（99.5% 缩减）。
 *
 * P1 路线图：所有老业务代码（srm/wms 等）的 Typed API 绑定，应逐步
 *           将 key 从 "srm_create_supplier" 改为 openapi.d.ts 中的真实 key
 *           （或重新 extract srm spec 后看真实 key 名字），
 *           完成后可删除本桥接文件。
 */

 
import type {
  paths as _Paths,
  components as _Components,
  operations as _Operations,
  webhooks as _Webhooks,
  $defs as _Defs,
} from './generated/openapi';

export type paths = _Paths;
export type components = _Components;
export type webhooks = _Webhooks;
export type $defs = _Defs;

/**
 * 老版本带模块前缀的 operationId 别名表 + V285 未 extract 服务 spec 降级。
 *
 * 两类缺失：
 *   A) 新 aggregate.py 生成的 operationId 不加模块前缀（wms_create_inventory → create_inventory），
 *      但老业务代码仍写前缀。对这类 key，做真实类型映射到 _Operations 中的真实 key。
 *   B) 对应服务的 spec 在 V285 未被重新 extract（crm customers/opportunities、
 *      srm suppliers、monitor rules/slos、部分 unified-core endpoints），
 *      这类 key 在新 openapi.d.ts 中根本不存在，降级为 unknown —— 编译可通过，
 *      但参数类型精度下降（等价于 any 透传）。待重抽 spec 后可恢复精确类型。
 *
 * 统计（2026-11-19 更新）：业务代码使用 78 个 unique operation key，多数已存在于新 openapi.d.ts；
 *       本别名表只保留 14 个缺失 key（wms 前缀映射 5、srm suppliers 5、unified-core virtual 4）。
 *       monitor rules/slos、CRM、business_metric 及 _qa_batch_delete_history/_qa_delete_history
 *       已被权威契约收录，对应别名已删除。
 */
type _PrefixedAliases = {
  // === A 类：前缀差异，做真实类型映射 ===
  wms_list_inventory: _Operations['list_inventory'];
  wms_get_inventory: _Operations['get_inventory'];
  wms_create_inventory: _Operations['create_inventory'];
  wms_update_inventory: _Operations['update_inventory'];
  wms_delete_inventory: _Operations['delete_inventory'];

  // === B 类：权威契约仍未收录，降级为 unknown ===

  // -- SRM suppliers service spec 未 extract（openapi-aggregated.json srm paths=0） --
  srm_list_suppliers: unknown;
  srm_get_supplier: unknown;
  srm_create_supplier: unknown;
  srm_update_supplier: unknown;
  srm_delete_supplier: unknown;

  // -- unified-core virtual endpoints（openapi-aggregated.json 未收录）--
  // （qa history + doc CRUD，下划线前缀私有 operation）
  _qa_history: unknown;
  _document_list: unknown;
  _document_get: unknown;
  _document_delete: unknown;
};

/**
 * operations 命名空间：原生 operations + 老版本前缀别名合并。
 * 优先级：原生 key > 别名 key（通过 & 交叉合并，如重名以后者为准）。
 */
export interface operations extends _Operations, _PrefixedAliases {}
