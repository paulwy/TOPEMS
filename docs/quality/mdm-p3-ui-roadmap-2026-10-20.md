# mdm P3 预留能力 UI 排期路线图

> 依据：`docs/quality/master-data-contract-review-2026-10-20.md` 七、建议处置优先级 P3 行
> 决策：产品确认**要做**，排 UI。本文档为 4 个能力域的 UI 落地排期与批次划分。

## 总览

| 批次 | 能力域 | 端点数 | UI 形态 | 页面路由 | 前置依赖 | 价值/成本 |
|---|---|---|---|---|---|---|
| 1（本期） | B4 schema-registry 元数据驱动动态 API | 10 | Schema 注册表 + 动态数据 CRUD | `/master/schema-registry` | 无 | 高/低（基础平台能力） |
| 2 | B1 lineage-v52 数据血缘登记/影响分析/变更传播 | 15 | 血缘分析工作台（影响分析/模拟/传播/回滚） | `/master/lineage-analytics` | v60 血缘已落地 | 高/中 |
| 3 | B3 mdm-v59 数据治理 AI/匹配/自动分类 | 23 | AI 治理工作台（建议列表+匹配裁决+分类管理） | `/master/ai-governance` | 无 | 中高/高 |
| 4 | B2 mdm-v55 API 商业化/计量计费/SLA | 23 | 商业化控制台（产品/订阅/账单/SLA） | `/master/commercial` | 无 | 中/高 |

## 批次 1：schema-registry（本期实施）

- **后端契约**（`svc/master-data/src/modules/schema_registry.rs`）：
  - `SchemaDefinition{id,name,title,description?,schema_json,table_name,is_active,version,created_at,updated_at}`
  - `CreateSchemaRequest{name,title,description?,schema_json}`；`UpdateSchemaRequest{title?,description?,schema_json?,is_active?}`
  - 动态数据：`POST/GET /schemas/{id}/data`（body 任意 JSON）、`GET/PUT/DELETE /schemas/{id}/data/{record_id}`
  - 路由前缀 `/schema-registry`，前端经 `apiClient.master`（`/api/master-data`）访问
- **前端交付**：`schemaRegistry.ts` wrapper（10 方法）+ `SchemaRegistryPage`（列表 + 新建/编辑 + 详情弹窗内动态数据 CRUD）+ 路由/菜单/i18n zh/en
- 验证：typecheck / eslint / i18n 7-in-1 / 单测

## 批次 2：lineage-v52（待排）

- 15 对：register/graph/upstream/downstream/export/delete/impact(analyze/report/simulate/scope)/propagate(+rules/log/rollback)
- 页面：血缘分析工作台——以 v60 血缘图为底座，叠加 v52 的影响分析/变更传播/回滚操作
- 依赖：v60 血缘面板已落地（B5），本批做分析交互增强

## 批次 3：mdm-v59 AI 治理（待排）

- 23 对：governance(analyze/suggestions/apply/dismiss/models/train)、matching(rule/rules/entities/results/review/confirm/reject/stats)、classifier(classifiers/classify/review/stats/rules)
- 页面：AI 治理工作台——治理建议列表 + 实体匹配裁决（review/confirm/reject）+ 分类管理
- 交互复杂，需拆 3 个子视图

## 批次 4：mdm-v55 商业化（待排）

- 23 对：products/subscribe/subscriptions/cancel/upgrade、usage(record/summary)、bill(billing/mark-paid/rate-cards)、sla(configure/measure/status/history/penalty/incident/report)
- 页面：商业化控制台——产品管理 + 订阅 + 账单 + SLA 面板（4 个 tab）
- 依赖产品商业化策略确认（计费口径）

## 状态

- [x] 批次 1 schema-registry **已完成**（2026-10-20 `883e70146` feat(master) 实现 + `f122d1b98`/`8ab52a995` 后端修复 + `4bf7e049c` 冒烟清零）：后端 10 路由已挂载（`mod.rs` /schema-registry），前端 wrapper 10 方法 + SchemaRegistryPage（列表/新建/编辑/动态数据 CRUD）+ 路由/菜单/i18n zh/en 38 key 齐全；typecheck/eslint 绿，契约 10 对闭合
- [ ] 批次 2 lineage-v52（待排）
- [ ] 批次 3 mdm-v59 AI 治理（待排）
- [ ] 批次 4 mdm-v55 商业化（待排，依赖计费口径确认）
