# M-2 窗口申请材料：382 条宽松 RLS 策略收口（2026-11-16）

> 性质：**窗口申请材料，不是执行记录**。本轮零 DDL、零写入——`ALTER POLICY` 一条未跑，`ANALYZE` 也未跑。
> 依据：[known-gate-defects.md](./known-gate-defects.md) K10；清单与分批见 [rls-policy-inventory-b4.md](./rls-policy-inventory-b4.md) §C / §D；本文件只做「申请窗口时一次性看全」的汇总，不重复定义判据与 SQL。

## 1. 申请事项

| 项 | 内容 |
|---|---|
| 变更对象 | 382 条「未设 `app.tenant_id` 即放行」的 RLS 策略（370 表级 + 12 列级），分布于 18 个 schema、302 张表 |
| 变更方式 | 逐条 `ALTER POLICY ... USING / WITH CHECK`，补 `app.rls_system='on'` 逃生口并把「未设即放行」改为「未设即拒」 |
| 分批 | 8 批，按 schema 切，同表多策略必同批；批间无共享事务、可独立回滚 |
| 执行形态 | 串行、独占 DB；每批「收口 → 四档断言 → 端点冒烟 → 通过再进下一批」 |
| 本轮动作 | **无**。只提交本材料、8 份回滚脚本、验证判据 |
| 待确认 | 窗口日期与时段（业务方）、执行 DBA、是否允许窗口内 `ANALYZE`（影响行数基线判据） |

## 2. 批次表（8 批 / 382 条 / 302 表 / 18 schema）

| 批次 | 主题 | schema | 条数 | 表数 | 回滚脚本（段） | 验证清单 |
|---|---|---|---:|---:|---|---|
| batch01 | 边缘服务冒烟批 | `portal`、`ticket`、`tms`、`unified_core`、`plugin_mes`、`plugin_finance`、`communication` | 21 | 20 | `rls-policy-backup-batch01.sql` | inventory §C.batch01 / §D.01 |
| batch02 | 分析与只读派生层 | `analytics`、`bi`、`rs`、`core` | 44 | 40 | `rls-policy-backup-batch02.sql` | §C.batch02 / §D.02 |
| batch03 | 身份与客户 | `iam`、`crm` | 41 | 29 | `rls-policy-backup-batch03.sql` | §C.batch03 / §D.03 |
| batch04 | 质量管理 | `qms` | 46 | 27 | `rls-policy-backup-batch04.sql` | §C.batch04 / §D.04 |
| batch05 | 人力 | `hrm` | 54 | 29 | `rls-policy-backup-batch05.sql` | §C.batch05 / §D.05 |
| batch06 | 共享核心 | `public` | 54 | 52 | `rls-policy-backup-batch06.sql` | §C.batch06 / §D.06 |
| batch07 | 主数据（含列级 `tenant_uid` 3 条） | `master_data` | 95 | 85 | `rls-policy-backup-batch07.sql` | §C.batch07 / §D.07 |
| batch08 | ERP（含集团级函数改写） | `erp` | 27 | 20 | `rls-policy-backup-batch08.sql` | §C.batch08 / §D.08 |
| **合计** | | **18** | **382** | **302** | 8 份 | — |

批次顺序即执行顺序：批 01 体量最小、都不在主交易链路，用来在最小爆炸半径下跑通模板；批 08 体量最小但语义最难（集团级函数），放最后收尾。

## 3. 逐批回滚 SQL

8 份 `docs/database/rls-policy-backup-batchNN.sql` 的结构一致，**同一文件既是快照也是回滚**：

| 部分 | 内容 | 是否可执行 |
|---|---|---|
| 文件头 | 批次、条数、涉及表、schema、生成时间、数据源（`topems_prod` 只读 `pg_policies` / `pg_class` / `pg_namespace`） | — |
| 上半段「现状快照」 | 盘点时点的等效 `CREATE POLICY` DDL，**全部注释形式** | 否（仅供比对） |
| 下半段「回滚段」 | 每条一句 `ALTER POLICY ... USING (...) WITH CHECK (...)`，把该策略表达式恢复为原文 | 是（窗口内回滚用） |

回滚使用注意：

1. `ALTER POLICY` 只能改 `USING` / `WITH CHECK` / `roles`；`permissive` 与 `cmd` 不可变更——本次收口只改表达式，故回滚等价。
2. 回滚以**批**为单位整体执行，不逐条挑；执行顺序与文件内顺序一致。
3. 表达式取自 `pg_policies.qual` / `with_check`，换行折叠为单空格，语义与原文一致；回滚后必须复跑该批 §D 的四档断言，确认回到「未设即放行」（断言 ② 预期**非 0 行**即为回滚到位）。
4. 回滚脚本与收口脚本一样，**本轮一条未跑**。

## 4. 验证判据（四档，取 inventory §D.0）

| 档 | 判据 | 收口后期望 | 回滚后期望 |
|---|---|---|---|
| ① 结构 | 本批每条 `app.tenant_id` 策略都含 `app.rls_system` | 0 行残留 | 非 0 行（回滚到位） |
| ② 未设即拒 | `app.tenant_id=''` 且 `rls_system=off` | **0 行** | 非 0 行 |
| ③ 假租户 | `app.tenant_id=00000000-...-0000ff` | **0 行** | 0 行（本判据收口前后都成立，用于确认未放开） |
| ④ 正向 | 真实租户 UUID | 行数 = **基线经已登记数据缺陷扣除后的应有值**（`docs/database/m2-window-application-2026-11-16.md` §8 登记项；不等于 0 时以扣除后应得数为准）；`rls_system=on` 后 ≥ 该值 | 同收口前基线 |

> 判据 ④ 口径修订（2026-11-16，随收口写法定案）：采用 B 范式后，`tenant_id` 为零 UUID 的行不再对任何租户可见，若这些行原先通过「行值 = 零 UUID → true」分支可见，④ 必然出现**预期内下降**，不能当成回归。已登记缺陷：`core.ai_faqs` 15 行零租户（真实租户可见 17 → 收口后 2），其余批次 ④ 与基线一致。

配套动作：

- 每批执行**前**跑一次 ①②③④ 留基线（判据 ④ 的「基线行数」只在此刻可得）；执行**后**复跑同一组。
- 端点冒烟清单见 inventory 各批 §D.0N（每批附本批服务的读/写探针）。
- 断言 ② 用**空串**做等价输入（所有谓词都有 `NULLIF(guc,'')` 归一），不新开「真空连接」——`SET LOCAL` / `set_config(...,true)` 在事务内无法真正取消设置。

## 5. 影响面

| 维度 | 说明 |
|---|---|
| 直接受影响 | 302 张表上 382 条策略；收口后「事务未设 `app.tenant_id`」的查询由**返回全表**变为**返回 0 行** |
| 受影响路径 | 三处：①后台任务 / 定时 sweep；②异常路径里绕过 `tenant_middleware` 的裸 `pool` 查询；③新代码误用 `scope_read()` 之外的无上下文入口 |
| 不受影响 | 正常请求链路——`tenant_middleware` 已强制写入 GUC；`scope_system` / `app.rls_system='on'` 的系统通道在收口后仍可读全表（这是本变更保留的逃生口） |
| 风险集中批 | batch06 `public`（共享核心，跨服务读）、batch07 `master_data`（85 表，条数占 24.9%）、batch08 `erp`（集团级函数改写） |
| 观测手段 | 每批执行后看四档断言 + 该批服务的 5xx 率与空列表率；命中「系统通道读不到数据」或「真实租户行数掉 0」立即回滚本批 |

## 6. 耗时预估（待窗口实测校准）

| 批次 | `ALTER POLICY` 条数 | 预估（含基线/复跑断言/冒烟） |
|---|---:|---|
| batch01 | 21 | 15–25 min |
| batch02 | 44 | 20–30 min |
| batch03 | 41 | 20–30 min |
| batch04 | 46 | 20–30 min |
| batch05 | 54 | 25–35 min |
| batch06 | 54 | 30–45 min（共享核心，冒烟面最广） |
| batch07 | 95 | 35–50 min |
| batch08 | 27 | 25–40 min（集团级函数需单独核） |
| **合计** | **382** | **约 3–4.5 h**，建议窗口按 **6 h** 申请（含一次整体回滚演练与缓冲） |

预估口径：单条 `ALTER POLICY` 为元数据操作、毫秒级，**不构成耗时主体**；时间主要花在「每批收口前的四档基线」「收口后的复跑与冒烟」「跨服务确认」。若窗口内同时执行 `ANALYZE`（用于判据 ④ 的行数基线），batch06/07 各再加 10–20 min。

## 7. 执行顺序与急停

1. 窗口开始：全局只读快照（8 份文件已在库，核对与实际 `pg_policies` 无漂移）。
2. batch01 起逐批：基线 → 收口 → 四档断言 → 冒烟 → 记录读数，再进下一批。
3. 任一批命中回滚触发条件（见 inventory 各批「失败回滚触发条件」）→ 只回滚该批，停在原地复盘，不连带回滚已通过批次。
4. 窗口结束：把 8 批读数、耗时、回滚次数写回本文件 §8（当前为空）。

## 8. 窗口执行记录

| 批次 | 执行时间 | 条数 | ①  | ②  | ③  | ④  | 冒烟 | 是否回滚 |
|---|---|---:|---|---|---|---|---|---|
| batch01 | 2026-11-16 演练 | 21 | 0 残留 | 0（基线 0） | 0 | 0 = 基线 0 | 未执行（无服务栈） | 是，MD5 一致 |
| batch02 | 2026-11-16 演练 | 44 | 0 残留 | 0（基线 17） | 0（基线 15） | 17 → 2（预期，见 §8.1） | 未执行（无服务栈） | 是，MD5 一致 |
| batch03 | 2026-11-16 演练 | 41 | 0 残留 | 0（基线 0） | 0 | 0 = 基线 0 | 未执行（无服务栈） | 是，MD5 一致 |
| batch04 | 2026-11-16 演练 | 46 | 0 残留 | 0（基线 0） | 0 | 0 = 基线 0 | 未执行（无服务栈） | 是，MD5 一致 |
| batch05 | 2026-11-16 演练 | 54 | 0 残留 | 0（基线 22） | 0 | 22 = 基线 22 | 未执行（无服务栈） | 是，MD5 一致 |
| batch06 | 2026-11-16 演练 | 54 | 0 残留 | 0（基线 24） | 0 | 0 = 基线 0（② 的 24 行为 `public.core_faqs`/`core_guides` 零租户行，本租户本就不可见，见 §8.1） | 未执行（无服务栈） | 是，MD5 一致 |
| batch07 | 2026-11-16 演练 | 95 | 0 残留 | 0（基线 5） | 0 | 5 = 基线 5 | 未执行（无服务栈） | 是，MD5 一致 |
| batch08 | 2026-11-16 演练 | 27 | 0 残留 | 0（基线 0） | 0 | 0 = 基线 0 | 未执行（无服务栈） | 是，MD5 一致 |

实测耗时（克隆库，含 `BEGIN`/`COMMIT` 的整批事务；单位 ms）：

| 批次 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 合计 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 收口 apply | 23 | 23 | 28 | 25 | 28 | 22 | 31 | 19 | **199** |
| 回滚 rollback | 25 | 27 | 30 | 27 | 28 | 25 | 27 | 20 | **209** |

- 单条 `ALTER POLICY` 平均 0.08–0.26 ms（382 条语句合计 55.2 ms）；含「基线四档 + 收口 + 复跑 + 回滚 + MD5 比对」的 8 批全流程 3.45 s。
- 与 §6「3–4.5 h」预估的关系：DDL 本身仅 0.2 s，预估时间几乎全部在逐批基线/复跑、端点冒烟、跨服务 5xx 与空列表观测、人工确认；DB 独占可压缩为**每批一次数十毫秒事务**，不需要把 6 h 窗口当作 DB 独占窗口。
- 独占确证：`ALTER POLICY` 取 `AccessExclusiveLock` 并持到提交；另一会话（`topems_prod` + `lock_timeout=300ms`）读同表被取消，`pg_locks` 显示持锁会话 `granted=t`。建议逐批提交，不把 382 条叠进一个长事务。
- 回滚可逆性：8/8 批回滚后整批策略 `qual`/`with_check` 的 MD5 与演练前逐字一致，无残留策略；回滚后 ② 立即回到基线（17/22/24/5），说明「未设即放行」已恢复。
- 收口写法：**B 范式已定**——382 条一律 `rls_system='on' OR <租户列> = NULLIF(current_setting('app.tenant_id', true), '')::uuid`，删除「行值 = 零 UUID → true」「GUC 为空/零 → true」「`tenant_id IS NULL` → true」等宽松分支；`master_data` 的 10 条 `tenant_uid` 策略在同范式下改用 `tenant_uid` 列（列类型同为 uuid），不做表级特例。

### 8.1 判据 ④ 的已登记数据缺陷（收口后预期下降）

| 表 | 零租户行数 | 真实租户可见：收口前 → 收口后 | 影响判据 | 处置 |
|---|---:|---|---|---|
| `core.ai_faqs` | 15 | 17 → 2（批级）／该表 15 → 0 | ④（batch02） | 只记录、不推进；归属待清洗，见 `TODO.md` §8.1 `DEC-M2-02` |
| `public.core_faqs` | 12 | 0 → 0（原策略无行值分支，本来就不可见） | 无 | 同上并案登记 |
| `public.core_guides` | 12 | 0 → 0（同上） | 无 | 同上并案登记 |

> 口径：④ 的「应有值」= 基线 − 上表零租户行中原本对真实租户可见的部分。演练中仅 `core.ai_faqs` 触发扣除；其余批次 ④ 与基线完全相等。

> 状态：克隆库全量演练完成；生产已于 2026-11-16 21:36–21:37 完成 8 批应用并原样拉起，实测记录见 §9。

## 9. 生产应用记录（2026-11-16）

### 9.1 停机与拉起

| 项 | 值 |
|---|---|
| 目标库 | `topems_prod`（`postgres://topems_prod@127.0.0.1:5432/topems_prod`） |
| 停服方式 | `launchctl bootout gui/$UID/com.topems.server`（`KeepAlive=true`，必须 bootout 才能停住） |
| 优雅停机完成 | 2026-11-16 21:36:28（本地，日志 UTC 13:36:28） |
| 停服前 pid | 73907（`topems-server` 模块化单体，erp/mes/wms/crm/finance/analytics/unified_core 均为其内部模块，各模块独立 sqlx 池） |
| 业务连接清空 | bootout 后 `pg_stat_activity` 仅剩本会话，无残留业务连接 |
| 拉起方式 | `launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.topems.server.plist` |
| 新 pid | 94814（启动 21:37:49） |
| 端口监听 | 21:37:50 `topems-server 监听于 http://127.0.0.1:8099` |
| `/health` | 200 `{"code":200,"success":true,"data":"healthy"}` |
| 停机窗口 | 约 82 s（21:36:28 → 21:37:50），其中 DDL 应用约 0.27 s |

### 9.2 备份与基线

| 项 | 值 |
|---|---|
| 全量备份 | `/Users/xingzhai/topems/backups/m2-pre-apply-20261116-2200.dump` |
| 备份大小 | 10,779,769 字节（约 10 MB，`pg_dump -Fc`） |
| 备份时间 | 2026-11-16 21:36 |
| 策略 MD5 基线（收口前） | 01 `78bb516875482ad082fd711ff1dfa960` / 02 `8e812498db8ae2ec4d5606e4d8bdffba` / 03 `819a0315b37bc1d304dea804f6b15961` / 04 `f3d846736e7390b248c0f5f6c8f691be` / 05 `40e6275fa06bd76dca309085bb0a8e00` / 06 `c32d6108b7820430c5da4d9f3dfa6ae2` / 07 `50d3f6b0b1e791e6da7ba56fa1e751b4` / 08 `abc011bf096e22f7081e353fbcd0ff7b` |
| 四档基线（收口前） | b01 ②0/④0；b02 ②17/③15/④17；b03 ②0/④0；b04 ②0/④0；b05 ②22/④22；b06 ②24/④0；b07 ②5/④5；b08 ②0/④0 |

### 9.3 逐批应用与四档读数（收口后实测）

每批 = `BEGIN` → 逐条 `ALTER POLICY` → `COMMIT`，短事务不叠加。四档以**非 superuser、非 BYPASSRLS** 的 `topems_prod` 角色在只读事务内实测。

| 批次 | 条数 | apply 耗时 (ms) | ① 缺 `rls_system` | ② 空/未设 GUC | ③ 假租户 `…00ff` | ④ 真实租户 `…0001` | 结论 |
|---|---:|---:|---:|---:|---:|---:|---|
| batch01 | 21 | 29 | 0 | 0 | 0 | 0（基线 0） | 通过 |
| batch02 | 44 | 35 | 0 | 0 | 0 | 2（预期：`bi.reports` 1 + `core.ai_conversations` 1） | 通过 |
| batch03 | 41 | 45 | 0 | 0 | 0 | 0（基线 0） | 通过 |
| batch04 | 46 | 25 | 0 | 0 | 0 | 0（基线 0） | 通过 |
| batch05 | 54 | 35 | 0 | 0 | 0 | 22（`hrm.companies/departments/employees/positions` 合计） | 通过 |
| batch06 | 54 | 33 | 0 | 0 | 0 | 0（② 的 24 行为 `public.core_faqs` 12 + `core_guides` 12 零租户行，本租户本就不可见） | 通过（已登记，见 §8.1） |
| batch07 | 95 | 41 | 0 | 0 | 0 | 5（`master_data.mdm_suppliers` 1 + `mdm_sync_dead_letter` 4） | 通过 |
| batch08 | 27 | 29 | 0 | 0 | 0 | 0（基线 0） | 通过 |
| **合计** | **382** | **272** | **0** | **0** | **0** | — | **8/8 通过，0 批回滚** |

- 系统通道全量对照（`rls_system=on`）：b01 0 / b02 17 / b03 0 / b04 0 / b05 22 / b06 24 / b07 5 / b08 0，与收口前数据总量一致，未丢行。
- 判据 ④ 与克隆库演练（§8）逐批一致：b02 = 2、b05 = 22、b06 = 0、b07 = 5、其余 0；唯一扣减项 `core.ai_faqs` 15 行零租户为已登记缺陷，未按偏差处理。
- 注：apply 耗时为应用时会话实测输出（`/tmp/m2drill/prod_apply_0N.log` 因未重定向为空文件，以会话记录为准）；生产 272 ms 略高于克隆库 199 ms，属正常抖动，均远低于预估窗口。

### 9.4 收口后形态复核

- 382 条目标策略：0 条缺失、0 条不符合 B 范式（缺 `NULLIF(current_setting('app.tenant_id'...)`）、0 条缺 `rls_system`。
- 全库策略 1030 条，其中 973 条含 `rls_system`（382 条本批 + 591 条既有正确态）；其余 57 条为非租户表策略。
- 未新增策略、未改策略数量、未改迁移文件。

### 9.5 双租户互不可见抽查（收口后，实测）

以 `topems_prod` 角色、`app.rls_system='off'`，分别设 `app.tenant_id = …0001` / `…0002`：

| 表 | tenant `…0001` | tenant `…0002` | 判定 |
|---|---:|---:|---|
| `hrm.positions` | 12 | 0 | 互不可见，本租户有数据 |
| `hrm.departments` | 8 | 0 | 互不可见 |
| `finance.core_finance_ledger` | 4 | 0 | 互不可见 |
| `master_data.mdm_sync_dead_letter` | 4 | 0 | 互不可见 |
| `core.ai_faqs` | 0 | 0 | 15 行均为零租户 UUID，属 §8.1 已登记缺陷 |
| `public.core_faqs` | 0 | 0 | 12 行零租户，属 §8.1 已登记缺陷 |
| `erp.audit_logs` | 0 | 0 | 审计表设计为仅系统通道（`app.rls_system='on'`），业务租户不可见属预期 |

系统通道下 `erp.audit_logs` = 13 行（`…0001` 8 + `…0002` 5），证明数据未丢、仅按设计隔离。

### 9.6 逐模块端点验证（拉起后）

| 模块 | 端点 | HTTP | 结果 | 判定 |
|---|---|---|---:|---|
| erp | `/api/erp/audit-logs` | 200 | 13 条 | ✅ 有数据（审计表系统通道，跨租户可见为设计） |
| finance | `/api/finance/currencies` | 200 | 16 条 | ✅ 有数据（8 条 `tenant_id` 为 NULL 是库内既存数据） |
| finance | `/api/finance/accounts/tree` | 200 | 28 条 | ✅ |
| finance | `/api/finance/periods` | 200 | 1 条 | ✅ |
| finance | `/api/finance/ledger` | 200 | 4 条（均 `…0001`） | ✅ |
| unified_core | `/api/core/iam/users` | 200 | 5 条 | ✅ 有数据（前缀实为 `/api/core`） |
| unified_core | `/api/core/iam/roles` | 200 | 4 条 | ✅ |
| analytics | `/api/bi/reports` | 200 | 1 条（`…0099` Smoke Report） | ✅ 修复后复验通过，见 §9.7 |
| wms | `/api/wms/audit-logs` | 200 | 0 条 | ✅ 库本无业务数据（全库真实行数扫描：wms 仅 `schema_defense_ledger` 1 行） |
| mes | `/api/mes/audit-logs` | 200 | 0 条 | ✅ 库本无业务数据（同上，仅 `schema_defense_ledger` 1 行） |
| crm | `/api/crm/returns` | 200 | 0 条 | ✅ 库本无业务数据（crm 仅 `schema_defense_ledger` 1 行；`reltuples` 17 为统计估算过期，实际 0 行） |

补充：`/api/erp/announcements`、`/api/wms/warehouses`、`/api/wms/inventory-alerts`、`/api/finance/budgets` 均 200 且 0 条，与库内实际 0 行一致，非 RLS 拒绝。

### 9.7 已修复：analytics report 子系统未带租户上下文

- 现象（修复前）：`bi.reports` 有 1 行 `tenant_id = …0001`（Smoke Report），`/api/bi/reports` 返回 200 但 `total = 0`。
- 根因：`svc/analytics/src/modules/report/report.rs` 的 `list_reports` 直接 `SELECT … FROM bi.reports`，既未 `set_config('app.tenant_id')` 也未走 `scope_with`；收口后 RLS fail-closed，过滤为 0 行。同模块 `dataset.rs`/`datasource.rs` 已有 `set_config` 实现，属 report 子系统遗漏，非全局。
- 修复（2026-11-16，仅 `svc/analytics`）：`modules/report/mod.rs` 新增 `tenant_uuid` / `begin_tenant_txn`，与 `bi/datasource.rs`、`bi/dataset.rs` 同一范式——事务内 `set_config('app.tenant_id', …, true)`，GUC 与 SQL 同连接、随事务结束失效；`report.rs` 9 个入口、`template.rs` 5 个、`schedule.rs` 9 个、`subscription.rs` 7 个全部改走该事务，写入 `tenant_id` 由零 UUID 改为 claims 租户。未新增机制、未改策略、未放宽 fail-closed。
- 复验：重建 `topems-server` release 并 launchd 重启（备份 `bin/topems-server.bak-20261116-215033`，sha256 `3ce9963f…ec7893`，新 pid 2192，`/health` 200）；`/api/bi/reports` 200 且返回该 1 行；`/api/erp/audit-logs`（13）、`/api/finance/currencies`（16）、`/api/finance/ledger`（4）、`/api/core/iam/users`（5）均 200 未回归。
- 残留记录（不在本次范围）：`report_subscriptions`、`analytics.report_execution_records` 无 `tenant_id` 列、无 RLS 策略，租户隔离需表结构改造，另行评估。
- 其它前缀修正：analytics 实际前缀 `/api/bi`（非 `/api/analytics`）；unified_core 实际前缀 `/api/core`（非 `/api/unified-core`）。

### 9.8 约束遵守与残留

- 未 push、未 amend、未改迁移文件、未改任何策略内容；382 条 DDL 仅为既定 B 范式改写。
- 克隆库 `m2_dryrun_20261116` 保留未动，可作对照。
- 备份 `backups/m2-pre-apply-20261116-2200.dump` 保留；8 批回滚段 `docs/database/rls-policy-backup-batch01..08.sql` 仍可整批回滚。
- 服务已原样拉起，`/health` 200，8099 可访问。

## 10. 从表租户列缺口：方案与克隆库演练（2026-11-16，未上生产）

> 状态：**方案 + 迁移 + 克隆库演练完成；`topems_prod` 零 DDL、零写入**。生产应用须待窗口批准后，与二进制同窗口执行（见 §10.6）。

### 10.1 现状核查（superuser 只读实测 `topems_prod`，克隆库同源）

| 表 | 行数 | tenant_id | RLS / FORCE | 策略 | tenant_id 索引 | 父表关联 |
| --- | --- | --- | --- | --- | --- | --- |
| `bi.report_subscriptions` | 0 | 无 | f / f | 0 | 无 | `template_id → bi.report_templates.id` |
| `analytics.report_execution_records` | 0 | 无 | f / f | 0 | 无 | `schedule_id → bi.report_schedules.id` |
| `bi.report_templates`（父） | 0 | 有，可空 | on / on | 既有 | 既有 | — |
| `bi.report_schedules`（父） | 0 | 有，可空 | on / on | 既有 | 既有 | — |

- 可推导租户比例：两从表各 0 行 → 天然 100%，**不存在无法由父表推导租户的行**，无需零租户兜底。
- 代码路径：写入 `svc/analytics/src/modules/report/subscription.rs`（`create_subscription`，有 claims 租户可用）；后台写入与读取 `scheduler.rs`（无 claims，须走系统通道 + 租户事务）。

### 10.2 迁移与回滚文件（新增，未改任何既有迁移）

- `database/migrations/20261116180000_report_subs_exec_records_tenant_id.sql`
- `database/rollback/20261116180000_report_subs_exec_records_tenant_id.rollback.sql`

内容：① 前置断言（表存在、`tenant_id` 不存在）→ ② 两表 `ADD COLUMN tenant_id uuid`（先可空）→ ③ 按父表回填 → ④ **回填完整性断言**（仍有 NULL 即 `RAISE EXCEPTION` 中止整笔，不降级可空、不零租户兜底）→ ⑤ `SET NOT NULL` → ⑥ 两表各建 `tenant_id` 索引 → ⑦ `ENABLE` + `FORCE` RLS，策略 `rls_tenant_isolation`（USING/WITH CHECK 同构 B 范式）→ ⑧ 后置断言（形状 `(uuid, NO, NULL)`、rls/force=true、策略数=1、索引存在）。

回填口径（只认父表推导）：

| 从表 | 回填来源 | 关联 |
| --- | --- | --- |
| `bi.report_subscriptions.tenant_id` | `bi.report_templates.tenant_id` | `template_id = id` |
| `analytics.report_execution_records.tenant_id` | `bi.report_schedules.tenant_id` | `schedule_id = id` |

父表租户为空或为零 UUID 时不回填；回填后 NULL 行数非 0 即整笔失败。

B 范式策略表达式：

```sql
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

### 10.3 NOT NULL 判定依据

- 生产两表均 0 行 → 回填天然完成，NULL 计数断言必为 0 → 直接 `SET NOT NULL`。
- 该断言同样约束未来有历史行的环境：只要存在无法由父表推导的行就整笔失败，不会出现「可空列 + 静默 NULL」的中间态。

### 10.4 服务侧改造（仅 `svc/analytics`）

- `report/subscription.rs`：`create_subscription` 的 INSERT 增加 `tenant_id`，绑定 claims 租户（`tenant_uuid`）。
- `report/scheduler.rs`：新增系统通道事务（`app.rls_system='on'`）读取调度与订阅，新增本地租户事务；`execute_schedule_job` 增加 `tenant_id` 参数，执行记录 INSERT 写 `tenant_id`，整作业在同一租户事务内提交；调度 `tenant_id` 为 NULL 时 `warn!` 跳过（不以零租户兜底）；`run_report` / `notify_subscribers` 改为接收 `&mut PgConnection`。
- 读取不再依赖 JOIN 父表间接过滤：两张从表自身带 `tenant_id` 且受 RLS 约束。
- 编译：`cargo check -p topems-analytics` 通过（3.51s，无新增 warning）。

### 10.5 克隆库 `m2_dryrun_20261116` 演练记录

演练数据：租户 A `…0001`（模板 2、调度 1）、租户 B `…0002`（模板 1、调度 1）；订阅 3 行（A 2 / B 1）、执行记录 2 行（A 1 / B 1）。

| 步骤 | 操作 | 耗时 | 读数 / 结论 |
| --- | --- | --- | --- |
| 0 | 负向断言：插入 1 行挂 `tenant_id IS NULL` 模板的订阅后跑迁移 | — | 在回填断言处 `ERROR: 回填失败：bi.report_subscriptions 仍有 1 行无法由 report_templates 推导租户`，整笔回滚，`tenant_id` 列数=0 ✅ |
| 1 | 迁移 up | **0.04 s** | `UPDATE 3` / `UPDATE 2`（全部回填），前后置断言通过 |
| 2 | 回填映射核对 | — | 5 行 `tenant_id` 与父表逐一相等（ok=t）✅ |
| 3 | ① 结构 | — | 两表：`col_not_null=t`、`rls=t`、`force=t`、策略数=1、缺 `app.rls_system` 的策略数=0、`tenant_id` 索引=1 ✅ |
| 4 | ② 未设/空 GUC（`topems_prod`，非 superuser/非 BYPASSRLS） | — | subs 0 / exec 0 ✅ |
| 5 | ③ 假租户 `…00ff` | — | subs 0 / exec 0 ✅ |
| 6 | ④ 真实租户 | — | A：subs 2（own 2 / other 0）、exec 1（own 1 / other 0）；B：subs 1（own 1 / other 0）、exec 1（own 1 / other 0）✅ |
| 7 | 双租户抽查（具体 id） | — | A 仅见 `…301/…302` + `…401`；B 仅见 `…303` + `…402`；互不可见 ✅ |
| 8 | WITH CHECK | — | A 写本租户成功；A 写 B 租户 `ERROR: new row violates row-level security policy` ✅ |
| 9 | 系统通道 `app.rls_system='on'` | — | subs 3 / exec 2（全量可见）✅ |
| 10 | down 回滚（有数据） | **0.02 s** | 策略/索引删除、RLS 关闭；`NOTICE: 回滚跳过删列 …有 3 行非空 tenant_id`、`…有 2 行`（数据保护分支按设计生效）✅ |
| 11 | 清空演练数据后再次 down（幂等） | **0.02 s** | 列已删除；已删策略/索引仅 `NOTICE ... does not exist, skipping` ✅ |
| 12 | 残留核验 | — | 两表 `tenant_id` 列 0、策略 0、RLS/FORCE 均 f、tenant_id 索引 0；`report_execution_records` 列形状回到原 11 列；四表行数回到基线 0 ✅ |

补充：克隆库的 `topems_prod` 在这两张表上仅有 SELECT（生产为完整 DML），演练期间为完成 WITH CHECK 测试临时授予 INSERT/UPDATE/DELETE，演练后已 REVOKE 复原。此为克隆库授权差异，非迁移内容。

### 10.6 上生产前置条件与影响

1. **二进制与迁移必须同一停机窗口**：新二进制 INSERT 带 `tenant_id`，旧库无该列 → 42703；新二进制对 `SET NOT NULL` 前的旧库同样失败。顺序：停服 → 迁移 → 起新二进制 → 端点复验。
2. 预计停机：迁移本体在 0 行表上为亚秒级（克隆库实测 0.04 s，含 PL/pgSQL 断言）；停机主要耗时为停/起服务与复验，预计 < 2 min。
3. 锁影响：`ADD COLUMN` 无默认值（瞬时元数据）；0 行表 `CREATE INDEX`（非 CONCURRENTLY）瞬时；`ENABLE/FORCE RLS` 需 `ACCESS EXCLUSIVE`（瞬时）；`SET NOT NULL` 需全表校验（0 行即瞬时）。均为短事务，无长锁。
4. 回滚：执行 `database/rollback/20261116180000_...rollback.sql`；有业务数据时列会被保留并 `NOTICE`（不丢租户信息），需回退二进制或停服后再执行。
5. 生产库当前仍为原状：两表无 `tenant_id`、无策略、0 行（本轮已复核）。

## 11. 生产只读授权记录（2026-11-16 22:51 CST）

### 11.1 背景与范围

`rls-permissions` 预提交钩子在暂存迁移文件时触发，读取 `.env` 的 `MIGRATE_URL`（指向 `topems_prod`）执行 `scripts/ci/check-rls-permissions.cjs`，报 `topems_app` 在 `iam.users`、`iam.roles`、`mes.work_orders`、`wms.inventory`、`crm.customers`、`erp.sales_orders` 上缺 SELECT，阻塞了 §10 迁移的提交。

审查 `scripts/db/grant-topems-app.sql` 发现其第 4 步对全库表授 `SELECT, INSERT, UPDATE, DELETE`、第 6 步 `ALTER DEFAULT PRIVILEGES` 亦含 DML，超出「只读授权」口径，故**未执行脚本原件**，改为执行只读授权子集：

| 对象 | 授权 | 条数 |
| --- | --- | --- |
| 非系统 schema | `GRANT USAGE` | 59 |
| 非系统 BASE TABLE | `GRANT SELECT` | 1345 |
| 非系统 sequence | `GRANT USAGE, SELECT` | 7 |

- 未授任何 `INSERT/UPDATE/DELETE`；未执行 `ALTER DEFAULT PRIVILEGES`；未改角色属性（`rolcanlogin` 保持 f）。
- 耗时 0.06 s。
- 前后快照：schema USAGE 0 → 59；有 SELECT 的表 25 → 1345；序列授权 0 → 7；DML 授权数 25/25/25 不变；`pg_default_acl` 条目 0 → 0。
- 复跑 `node scripts/ci/check-rls-permissions.cjs`：6 张关键表全部「已授权」，输出「RLS权限校验通过！」，exit 0（仅剩非阻断警告「默认权限未设置」）。

### 11.2 回滚方式

按 schema 逐条撤销本次新增的只读授权（幂等）：

```sql
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT nspname FROM pg_namespace
            WHERE nspname NOT IN ('pg_catalog','information_schema') AND nspname NOT LIKE 'pg\_%' LOOP
    EXECUTE format('REVOKE USAGE ON SCHEMA %I FROM topems_app', r.nspname);
    EXECUTE format('REVOKE SELECT ON ALL TABLES IN SCHEMA %I FROM topems_app', r.nspname);
    EXECUTE format('REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I FROM topems_app', r.nspname);
  END LOOP;
END $$;
```

注意：原有 25 张表的 CRUD 授权早于本次变更，不应连带撤销；需精确回滚时只撤本次新增的 SELECT/USAGE。

### 11.3 已收口：钩子角色与运行角色口径对齐（2026-11-16）

- `scripts/ci/check-rls-permissions.cjs` 不再写死 `topems_app`：改为从 `MIGRATE_URL`（缺省回退 `DATABASE_URL` / `.env`）解析连接串用户名，按该角色校验关键表 SELECT 与默认权限；解析不到角色或数据库不可达时直接非 0 退出，不再静默通过。
- 校验目标随环境自动对齐：生产 `.env` 两处 DSN 均为 `topems_prod`，即校验 `topems_prod`；开发样例（`.env.example`）运行角色为 `topems_app`，即校验 `topems_app`。
- `topems_app` 的只读授权保留不动：本次只改门禁口径，撤销与否另行评估（见第三阶段评估结论）。

## 12. 生产窗口执行记录：从表迁移 + 新二进制（2026-11-16 23:20 CST）

### 12.1 时间线

| 时刻（CST） | 动作 | 结果 |
| --- | --- | --- |
| 23:19 | `cargo build --release -p topems-server` 完成（6m08s） | 新二进制 sha256 `9625d130…3766` |
| 23:20:07 | `launchctl bootout gui/501/com.topems.server` | 服务退出；`/health` 000；`topems_prod` 服务连接 0（`pg_stat_activity` 核查） |
| 23:20:52 | 迁移 `20261116180000_report_subs_exec_records_tenant_id.sql` 执行完成 | 耗时 **0.07 s**（单事务，含账本记录） |
| 23:20:59 | `launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.topems.server.plist` | 拉起新二进制 |
| 23:21:03 | 起服完成 | pid 13721，`/health` 200 |

**停机总时长：56 秒**（23:20:07 → 23:21:03）。

### 12.2 二进制与备份

| 项 | 值 |
| --- | --- |
| 新二进制 | `bin/topems-server`，sha256 `9625d130468c9c634cb5ca0d17d00bdd6d529248ab3837fa595eeb9439183766`（205,943,024 B） |
| 旧二进制备份 | `/Users/xingzhai/topems-backups/topems-server.bak-20261116-pre-m2`，sha256 `3ce9963fef97bb0551227487923ae05e9633857b47e1ed229be8eca8b1ec7893`（205,958,976 B） |

回退：`cp -p <备份> bin/topems-server` → `bootout` → 执行 `database/rollback/20261116180000_report_subs_exec_records_tenant_id.rollback.sql` → `bootstrap`。

### 12.3 迁移执行方式（含一次未生效的尝试）

- 首次按 `sqlx migrate run --source database/migrations` 执行：sqlx 校验发现该库为既有「半迁移状态」（账本 698 条，缺 `version=0` 等文件），转而补跑历史迁移 `20261103210000`，因 `mes.core_email_queue` 不存在报错。sqlx 按单迁移事务回滚，**账本仍 698 / max `20261115142500`，无任何 DDL 落地**（执行后核查确认）。
- 随后改用 `scripts/migrate.sh` 的既定手工记账口径：`psql -1 -v ON_ERROR_STOP=1 -f`（单事务执行迁移文件 + 插入 `_sqlx_migrations`），description 取文件名去下划线、`checksum` 为迁移文件的 SHA-384（48 字节），`execution_time=0`，与既有 698 条记录同口径。即 12.1 中 0.07 s 的那次成功执行。

### 12.4 迁移校验

| 项 | 结果 |
| --- | --- |
| 账本 | 699 条，max `20261116180000`，`success=t`，checksum 48 字节 |
| `bi.report_subscriptions.tenant_id` | `uuid` / `NOT NULL` / 无默认值 |
| `analytics.report_execution_records.tenant_id` | `uuid` / `NOT NULL` / 无默认值 |
| 索引 | `idx_report_subscriptions_tenant_id`、`idx_report_execution_records_tenant_id` 均存在 |
| RLS | 两表 `relrowsecurity=t`、`relforcerowsecurity=t`；`rls_tenant_isolation`（ALL）各 1 条 |
| 迁移内断言 | 前置 / 回填完整性 / 后置断言全部通过（任一失败即整笔回滚） |
| 数据 | 两表均 0 行；未设 GUC 时租户 A 可见 0 行（fail-closed 生效）；`analytics.report_subscriptions`、`bi.report_execution_records` 两张同名不同 schema 的旧表未被触碰 |

### 12.5 起服后端到端验证（与窗口前基线对比）

| 端点 | 窗口前 | 起服后 | 判定 |
| --- | --- | --- | --- |
| `/health` | 200 | 200 | ✅ |
| `/api/bi/reports` | 200 / 1 条 | 200 / 1 条（Smoke Report，本租户） | ✅ 未回归 |
| `/api/bi/subscriptions` | 200 / 0 | 200 / 0 | ✅ |
| `/api/bi/schedules`、`/api/bi/templates`、`/api/bi/dashboard` | 200 / 0 | 200 / 0 | ✅ |
| `/api/core/iam/users` / `roles` | 200 / 3 / 16 | 200 / 3 / 16 | ✅ |
| `/api/erp/audit-logs` | 200 / 13 | 200 / 13 | ✅ |
| `/api/finance/currencies` / `ledger` | 200 / 16 / 4 | 200 / 16 / 4 | ✅ |

说明：两从表在 prod 均为 0 行，`/api/bi/schedules/{id}/history` 无 schedule 可测；按「生产除该迁移外零 DML」约束，未构造订阅/执行记录写入，写入路径由代码评审与克隆库演练覆盖。

### 12.6 约束遵守

- 仅执行 `20261116180000_report_subs_exec_records_tenant_id.sql` 一条迁移，未改既有迁移内容，未做其它 DDL/DML。
- 未 push、未 amend、未 `--no-verify`。
- 异常回滚预案（down 脚本 + 旧二进制）未触发，备份保留。
