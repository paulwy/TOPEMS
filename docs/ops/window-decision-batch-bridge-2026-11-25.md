# 审计线三项待窗口事项 · 衔接清单（2026-11-25）

> 用途：把档 2 漂移订正、23 张待定性拍板、71 表归档三项待生产决策事项，按风险、前置阻断、执行物与迁移窗口阶段串成一页，供安全 / 产品 / DBA 排窗评审直接引用。**本地不连生产、不改迁移链、不执行任何 DDL；明细与证据仍以各专项台账为准，本清单只做衔接索引。**

## 1. 共同前置（三项共用，先做）

1. **追平账本**：生产水位 `20261119000002` vs 头版本；档 2 漂移与 60 张 covered 表的根因都是账本滞后，追平重放既有迁移后再看终态。
2. **备份与基线**：按 `prod-schema-window-plan-2026-11-24.md` §3.1 完成整库 / 按表备份、基线对象数与策略数记录、磁盘与长事务检查。
3. **连接核验口径**：窗口后复跑一律用非超户角色；超户 / BYPASSRLS 连接绕过 RLS，断言恒真，不作对照（见 `rls-head-snapshot-recheck-2026-11-25.md` §2）。
4. **应用通道在位**：`app.rls_system` / `app.tenant_id` GUC 由请求事务注入；核对无裸表名直连绕过作用域（写源门禁口径）。

## 2. 三项对照

### 2.1 档 2 · 五条漂移策略订正（P1，隔离风险直接，优先）

| 项 | 内容 |
|---|---|
| 漂移表 | `iam.roles`、`core.core_tenant_plugins`（壳表）、`portal.user_preferences`、`mobile.oa_announcement_reads`、`pdm.pdm_master_data_refs` |
| 现状 | 五表生产仍挂 `qual=true` 全放行；基准已收紧为隔离 / 系统通道策略 |
| 根因 | 账本滞后，三条既有严格化迁移未在生产重放（非新缺陷） |
| 优先路径 A | 追平账本重放 `20261119150000` / `151000` / `161000`，phase1 区间按序推进 |
| 兜底路径 B | 账本不可重放时，幂等补丁直改策略层；**不改列、不改数据、不补索引**，前置断言校验列存在且 0 NULL，缺失即中止 |
| 前置阻断 | `pdm.refs` NULL / 零租户行必须 0；`mobile.reads` 回填 `unresolved` 必须 0；任一 >0 先定性回填再开严格化 |
| 执行物 | 手册 `rls-tier2-drift-fix-window-runbook-2026-11-25.md`；预检 `scripts/ops/rls-tier2-precheck-2026-11-25.sql`；补丁三件套 `scripts/ops/rls-tier2-drift-fix-2026-11-25.{sql,rollback.sql,verify.sql}` |
| 段间核验 | `psql -d topems_prod -f scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql`；期望六条策略 PASS、五表 RLS+FORCE 全开 |

### 2.2 23 张待定性表口径拍板（P1，产品 + 安全决策）

| 项 | 内容 |
|---|---|
| 范围 | RLS OFF、基准未收录的在用表 23 张（同源去重后独立 22 张） |
| 分组 | ① 目录/全局参考；② 父子关联靠父表 JOIN；③ 应用谓词在位；④ 待口径拍板；⑤ 基准白名单 |
| 优先拍板点 | `core.core_plugin_instances`（实例归属：平台运行时拓扑 vs 租户私有）、`core.core_plugin_reviews`（公开市场评价 vs 租户内可见）、`rs.document_relations`（全表分页读是否收敛/改系统通道/下线）、`communication.core_location_messages`（chat 边界成员资格校验） |
| 低风险可豁免登记 | 权限/角色/关联字典（#5/#6/#10–#16）、父表 JOIN 归属（#17/#18）、谓词在位（#19/#21）、身份主表（#20）、白名单全局读（#22） |
| 决策产物 | 拍板结论回填分类台账 §9.5；需补 RLS 的表另起迁移批次，不在本窗口直改 |
| 材料 | `rls-pending-classification-review-materials-2026-11-25.md`（每表源码链路证据 + Q1–Q6 决策清单） |

### 2.3 71 张死表 / 空副本归档（P2，破坏性，备份前置）

| 项 | 内容 |
|---|---|
| 总量 | 22 死表 + 49 空副本 = 71 张；甄别后 **60 张已被既有归档迁移覆盖**，**11 张独有**（7 死表 + 4 空副本）需另批 |
| 60 张 covered | 追平账本重放既有归档批次（`20261119100000` / `110000` / `160000` / `180000` / `200000`）后随批次归档 DROP；本批不重复处置 |
| 11 张独有 | 死表 7：`flow._deprecated_core_doc_document_versions`、`portal.graphql_execution_profiles`、`portal.portal_alert_thresholds`、`portal.portal_compatibility_reports`、`portal.portal_queue_messages`、`public._archive_core_doc_documents`、`ticket.schema_defense_ledger`（1 行单独备份）；副本 4：`iam.core_roles`（外键 R2）、`public.core_ticket_activities`、`public.core_ticket_comments`、`public.core_tickets` |
| 阻断条件 | R1 自愈/防御迁移重建；R2 `iam.core_roles` 被活表外键引用；R3 1 行表未备份；R4 追平后清单变化须重跑依赖核对；R5 近名表被外部报表误连；R6 序列/默认值牵连 |
| 执行物 | 前置手册 `cleanup-pending-archive-prep-2026-11-25.md`；差集 `cleanup-pending-split-2026-11-25.csv`；依赖核对 `scripts/ops/cleanup-pending-dependency-check-2026-11-25.sql`；上游台账 `cleanup-dead-duplicate-tables-2026-11-24.md` + `.csv` |
| 执行顺序 | 备份留存 → 核外键/视图/触发器/授权/发布 → 预发演练 → 先 RENAME 归档观察 1–2 发布周期 → 再 DROP；DROP 顺序：依赖视图 → 入向外键 → 表 |

## 3. 建议执行顺序

| 阶段 | 动作 | 依赖 |
|---|---|---|
| 阶段 0 | 备份 + 基线记录；非超户核验通道就位；写源/裸表名直连核对 | 无 |
| 阶段 1 | 追平账本，重放既有迁移批次；60 张 covered 随批次归档，档 2 三条严格化迁移入账 | 阶段 0 |
| 阶段 2 | 档 2 五表段间核验（`verify.sql` 全 PASS）；23 张口径拍板回填 | 阶段 1 |
| 阶段 3 | 11 张独有表按 R1–R6 复核 → 预发演练 → RENAME 归档观察 → DROP | 阶段 1 后快照复核通过 |
| 阶段 4 | 生产 / `topems_drift` 复跑快照门禁对账；重跑依赖核对与清单差集，更新台账 | 阶段 2/3 完成 |

## 4. 追平账本后的复跑对账口径

- **快照门禁**：非超户连库跑 `node scripts/ci/check-rls-policy-snapshot.mjs --dsn <DSN>`，对照基准 `database/rls_policy_expected.json`（801 表 / 855 策略）；表/策略缺失或多出、开关/谓词/角色不符均计入 problems。
- **依赖核对**：重跑 `cleanup-pending-dependency-check-2026-11-25.sql`，以追平后快照更新差集 CSV（R4）。
- **静态防线**：策略形态门禁 `check-rls-policy-shape.sh`、写源门禁 `check-tenant-write-sources.cjs --strict` 本地已绿；CI 连库 snapshot 步骤尚未挂载（见 `rls-head-snapshot-recheck-2026-11-25.md` §4）。

## 5. 本地边界

- 不连生产、不改迁移链、不刷新基准快照；破坏性 DROP、策略收紧、归属模型变更均须产品 / 安全确认后在生产窗口执行。
- 空库全链演练受 MIG-001（pgvector 扩展在非特权角色下阻塞）限制，预期失败，不进门禁，不以非超户角色强补。
