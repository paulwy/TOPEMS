# RLS / 租户谓词审计线收口汇总（2026-11-25）

> 收口范围：2026-11-24 起的 RLS 覆盖分类、allow-all 策略口径、读侧谓词收敛、死表/重复表治理四条审计线。本文是各台账的结论索引与待生产窗口清单，**不改生产库、不改迁移链**；各分项证据与明细见引用台账。

## 1. 产物索引

| 台账 / 脚本 | 内容 |
|---|---|
| `tenant-read-predicate-rls-audit-2026-11-24.md` | 读侧可选租户谓词 × 表级 RLS 对照；A/B/C/D/E 分桶与剥除进度（§4.1、§7.2） |
| `rls-coverage-classification-2026-11-24.md` | 生产 RLS OFF 表分类（A1 / B 类 38 / C 类 53）与 23 张待定性表运行时复核 |
| `allow-all-policy-review-2026-11-24.md` | 37 条 `qual=true` 策略分档（档1 豁免 2 / 档2 漂移 5 / 档3 未收录 30），§3.1 既有迁移映射 |
| `cleanup-dead-duplicate-tables-2026-11-24.md` + `.csv` | 22 死表 + 49 重复副本（共 71 张）归档清理清单与前置条件 |
| `scripts/ops/rls-tier2-drift-fix-2026-11-25.{sql,rollback.sql,verify.sql}` | 档 2 五条漂移订正兜底补丁三件套（本地干跑验证，未连生产） |
| `scripts/ops/cleanup-pending-dependency-check-2026-11-25.sql` | 11 张独有表只读依赖核对（存在性/RLS/外键/视图/授权/发布/本体在位） |
| `docs/ops/rls-head-snapshot-recheck-2026-11-25.md` | P3 #6 head 库快照对照复跑：三层门禁盘点、实测读数、偏差定性与 CI/窗口复跑口径 |

## 2. 总体硬结论

1. **RLS 开关覆盖基本健康**：生产 1344 张基表，ON 959 / OFF 385；代码基准期望 ON 800，「基准已覆盖、生产待追平」仅 **1 张**。生产滞后主要体现在**策略内容**（allow-all 通道）与**历史重复/遗留表治理**，而非开关未开。
2. **读谓词收敛已落地两波**：A 桶经典旁路分批剥除并推送；B 桶 8 张 BI 表 21 处 SELECT 读旁路本轮剥除（保留 14 处变更守卫）。剩余 analytics 侧 26 处旁路均为有据保留（写守卫 14 + C 桶 `analytics_data` 10 + 两处非 B 桶校验 2）。
3. **隔离风险优先级**：档 2 五条漂移策略 > 档 3e 业务实体待定性 > 档 3d 通知消息归属 > 其余目录/日志类豁免确认。
4. **未发现「明确漏挂 RLS 的租户业务表」**：23 张待定性表经运行时链路复核，无一张可直接判定为漏挂。

## 3. 读谓词分桶结论（A–E）

| 桶 | 定义 | 结论 | 处置状态 |
|---|---|---|---|
| A 桶 | RLS ON + 隔离策略下的经典可选旁路 `($N::uuid IS NULL OR tenant_id=$N)` | 读旁路连同 bind 分批剥除；变更守卫保留 | **已闭环**（rd、qms、unified-core settings、audit/login_log、menu 等，见审计 §7） |
| B 桶 | 迁移 `20261118093000` 覆盖的 8 张 `bi.analytics_*` 表 | 迁移已在生产/verify/dryrun 生效，RLS ON+FORCE+严格策略；**21 处 SELECT 读旁路已剥除**，14 处 UPDATE/DELETE 守卫保留 | **本轮闭环**（提交 `9f05cc9c1`，双口径 check + 严格度 + 全目标离线绿，门禁 PASS） |
| C 桶 | 无 RLS 覆盖、应用谓词为唯一过滤 | `bi.analytics_data` 10 处、`analytics_sync_records` 相关校验 **保留**；待表 RLS 覆盖具备条件后再评估 | 保留，待复核 |
| D 桶 | UPDATE/DELETE 行级变更守卫 | 一律保留，不纳入读谓词收敛 | 保留口径 |
| E 桶 | 现存 allow-all（qual=true）、应用谓词是唯一业务过滤 | 禁止剥除（剥除即跨租户可见）；见 §5 档 1/档 3 | 保留口径 |

## 4. RLS 覆盖分类结论

| 分类 | 数量 | 复核定性 |
|---|---:|---|
| A 类（基准期望 ON、生产 OFF，待追平） | 1 | `iam.core_tenant_plugins`；疑似历史重复副本，追平前确认去留 |
| B 类（带 `tenant_id`、OFF、基准未列） | 38 | 10 死表 + 24 重复遗留副本不补 RLS；4 张在用待口径定性 |
| C 类（无 `tenant_id`、OFF、基准未列） | 53 | 12 死表 + 22 重复遗留副本；19 待定性（含基准白名单 `gis.track_positions`） |
| 待定性合计 | 23 | 目录/全局豁免、父表 JOIN 隔离、应用谓词在位、待口径拍板四类，无必须立即补 RLS 项 |

## 5. Allow-all 策略分档（37 条）

| 档 | 数量 | 口径 | 处置 |
|---|---:|---|---|
| 档 1 有意全局豁免 | 2 | `erp.core_erp_materials`、`gis.track_positions` | 保持全放行，登记豁免 |
| 档 2 基准已收紧、生产漂移 | 5 | `iam.roles`、`core.core_tenant_plugins`、`portal.user_preferences`、`mobile.oa_announcement_reads`、`pdm.pdm_master_data_refs` | 链上已有覆盖迁移（`150000/151000/161000`）；生产漂移系账本滞后，优先追平账本重放；兜底补丁三件套备窗口直改 |
| 档 3 基准未收录 | 30 | 日志审计 6 / 模板字典权限 4 / 全局配置规则偏好 3 / 通知消息 3 / 业务实体 13 / 聚合指标 1 | 按子类定性；业务实体 13 张需运行时链路复核后再定补策略 |

## 6. 表治理清单（破坏性，待窗口）

- **22 张死表**（源码零引用：21 空表 + 1 单行）+ **49 张空重复遗留副本**（本体在位、副本 0 行），共 **71 张**，明细与本体映射见 `cleanup-dead-duplicate-tables-2026-11-24.csv`。
- 处置路径：备份留存 → 核外键/视图/触发器/索引 → 预发演练 → 先 `RENAME` 归档、观察 1–2 发布周期 → 再 `DROP`。未备份未核依赖前禁止直接 DROP。

## 7. 待生产窗口决策清单

### P1 · 隔离风险直接，优先排窗

| # | 事项 | 现状与前置 | 执行物 | 口径归属 |
|---|---|---|---|---|
| 1 | 档 2 五条漂移策略订正 | 优先追平账本重放既有迁移；前置：预发演练通过、应用系统通道注入在位、核对无裸表名直连；隔离表 `tenant_id` 列/回填已就绪 | 操作手册 `rls-tier2-drift-fix-window-runbook-2026-11-25.md`；预检 `rls-tier2-precheck-2026-11-25.sql`；既有迁移 `20261119150000/151000/161000`；兜底补丁 `scripts/ops/rls-tier2-drift-fix-2026-11-25.*` | 安全 + DBA 窗口 |
| 2 | 23 张待定性表口径评审（优先 §9.5④ 四点） | `core_plugin_instances` 实例归属、`core_plugin_reviews` 可见性、`rs.document_relations` 全表分页读、`core_location_messages` chat 边界 | 评审材料 `rls-pending-classification-review-materials-2026-11-25.md`；结论回填分类台账 §9.5 | 产品 + 安全 |

### P2 · 表治理（破坏性，备份前置）

| # | 事项 | 前置条件 | 执行物 |
|---|---|---|---|
| 3 | 71 张死表/重复副本归档清理 | 账本追平、应用部署确认无副本命中；`pg_dump` 备份；单行表单独导出；外键/视图/触发器核对；预发演练归档与回滚。甄别结论：60 张已被既有归档迁移覆盖、随批次落地；11 张独有（7 死表 + 4 副本）另批处置 | 前置手册 `cleanup-pending-archive-prep-2026-11-25.md`；差集 `cleanup-pending-split-2026-11-25.csv`；依赖核对 `cleanup-pending-dependency-check-2026-11-25.sql`；上游台账 `cleanup-dead-duplicate-tables-2026-11-24.md` |
| 4 | A 类 1 张 `iam.core_tenant_plugins` 去留 | **复核定论：权威活表，保留，不可归档**；生产 OFF 系账本滞后，追平后重放 `20261119140000` 严格化迁移即对齐基准（tenant_isolation，ON+FORCE），前置断言 tenant_id NOT NULL、0 零/NULL 租户。壳表 `core.core_tenant_plugins` 随档 2；骨架副本 `public.core_tenant_plugins` 纳入下一批副本评审 | 结论回填分类台账 §4.1 |

### P3 · 复核与登记

| # | 事项 | 说明 |
|---|---|---|
| 5 | 档 3 其余 allow-all 逐张定性 | 复核闭环：17 条（日志 5 + 模板权限 4 + 配置 3 + 通知副本 3 + 聚合 1）中 **16 张为零路径遗留表/副本，随既有归档批次删除**；`bi.audit_logs` 例外保留（schema-defense 重建，已登记 exemption）；通知/邮件本体 `public.core_notifications`/`public.core_emails` 隔离口径随 P1 #2；业务实体 13 张并入 P1 #2 评审 | 台账 §4.4 `allow-all-policy-review-2026-11-24.md` |
| 6 | 超户/CI 全链 head 库复跑 RLS 对照 | **复跑闭环**：两个 head 校验库（`runtime_fixture_verify`、`runtime_gate_verify`）非超户连库实测 801 表 / 855 策略，与基准快照逐项一致 **PASS**，基准无 fixture 偏差；`drift_check`（800/835，35 项）、`smoke`（751 项）偏差系历史旧库未追平迁移链，非基准缺陷。连库 snapshot 门禁未挂 CI，当前由静态 shape 门禁覆盖 fail-open 回潮；生产追平账本后须在生产/`topems_drift` 复跑同一门禁 | 备忘 `rls-head-snapshot-recheck-2026-11-25.md`（口径、命令、快照更新红线、阻塞项） |
| 7 | C 桶 `analytics_data` 10 处读旁路 | 待该表 RLS 覆盖具备条件后，按 B 桶同口径评估剥除 |

## 8. 方法局限与复核前提

- **生产账本滞后**：水位 `20261119000002` vs 头版本 `20261124200000`；追平迁移后须重跑 RLS/策略对照，档 2 与 A 类结论以追平后快照为准。
- **源码命中口径**：裸表名 / 动态 SQL 可能漏配；运行时定性以路由 → 服务 → SQL 链路为准，测试夹具命中不计服务端依赖。
- **测试库不可作基准**：`topems_test_runner` 账本为空、schema 来源不可追溯；隔离判定以生产只读快照 + head 校验库为准。两个 head 校验库已复跑快照门禁 PASS（801/855），历史演练/烟测库偏差不计入基准。
- **本汇总不替代窗口评审**：破坏性 DROP、策略收紧、归属模型变更均须产品/安全确认后在生产窗口执行。

## 9. 本轮落地记录

- **F · B 桶读旁路剥除**：8 表 21 处 SELECT 旁路谓词及 bind 移除；`fallback_comparison_result` 同步去仅服务谓词的形参；14 处写守卫、C 桶与非 B 桶校验保留。双口径 `cargo check` + `-D warnings` + `--all-targets` 离线绿，写源门禁 PASS，`.sqlx` 缓存重生成入库。提交 `9f05cc9c1`。
- **E · 档 2 兜底补丁**：核对确认 5 条漂移链上已有覆盖迁移；生成订正/回滚/只读核对三件套，本地事务内干跑并整体回滚无残留。提交 `be4a01333`。
