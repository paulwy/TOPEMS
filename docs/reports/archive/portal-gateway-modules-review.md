# Portal 网关模块建表评估（2026-09-01）

## 背景
portal schema 120 张表审计：4 张真死表已 DROP（见 `20260901000012_drop_portal_dead.sql`），剩余 ~108 张为"建表无查询"表。
本文档评估这 108 张（分布在 18 个网关/基础设施模块）是否保留。

## 审计方法
1. 提取 portal 全部 `CREATE TABLE IF NOT EXISTS` → 18 个模块共 108 张表
2. 全服务 SQL 引用审计：这些表**无任何 FROM/INTO/UPDATE/JOIN**（0 查询）
3. 全 svc/lib/apps 裸字符串提及：表名仅出现在**建表代码所在文件** + schema_defense 注册
4. Rust struct 依赖检查：**无任何 models/struct 引用这些表**（删表不破坏编译）
5. 模块活跃度：18 模块全部有完整 handler（13-52 个）+ 路由挂载 + 内存态实现（HashMap/内存状态）

## 关键结论：这些是"内存态功能 + 持久化预留表"
| 证据 | 结论 |
|---|---|
| 18 模块全部有 handler + 路由挂载 | 模块功能**活跃**（非死代码） |
| handler 逻辑真实（过滤/协议处理/部署） | 功能用**内存态**实现，非 mock |
| 表 0 行、0 查询、无 struct 依赖 | 表是**持久化预留**（未来落库） |
| 前端使用：federation(16)/orchestration(4)/ai_ops(1) | 部分模块**业务入口活跃** |

## 模块分类（18 个）
| 类别 | 模块 | 前端引用 | 建议 |
|---|---|---|---|
| A 业务活跃 | federation_gateway / orchestration / ai_ops | 16/4/1 | **保留**（功能在用） |
| B 网关基础设施 | smart_gateway / intelligent_gateway / gateway_security / gateway_monitoring / gateway_security_v1 | 0（内部核心） | **保留**（网关核心功能） |
| C 后台/预留 | deployment_manager / edge_computing / adaptive_execution / version_control / subscription_manager / streaming_processing / realtime_processing / query_optimizer / persisted_query / deep_federation | 0 | **保留**（低使用度，可后续评估） |

## 评估结论：全部保留
- **不删除**理由：
  1. 所属模块功能活跃（内存态 API 运行中）
  2. 表是持久化预留——未来落库直接可用
  3. 空表无成本（0 行，portal 116 << 600 阈值）
  4. 删除需动 18 模块建表代码 + schema_defense——风险高收益极低
- **不建议立即清理**——当前"建表无查询"是**功能规划的持久化层**，非历史残留死表。

## 可选优化（需业务决策，非本专项执行）
若未来确认 C 类模块（deployment_manager/edge_computing 等）不在产品路线，可批量：
1. 移除对应模块的 `CREATE TABLE IF NOT EXISTS` 建表代码
2. 同步 schema_defense.rs 注册
3. DROP 对应空表
——但需先确认这些模块的 API 是否被任何客户端（内部服务/移动端）调用。
