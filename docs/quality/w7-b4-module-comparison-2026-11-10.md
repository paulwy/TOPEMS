# W7 · B4 八模块横向对比与试点切口（2026-11-10）

> 只读评估。本轮**未修改任何业务代码、未写入生产库、未新增迁移**（唯一动作是两份冻结文档 §1.1 的口径升级）。
> 采集时点 2026-11-10 20:05–21:30（+08:00），生产宿主 `xingzhai@192.168.110.115`，库 `topems_prod`。
> 上游：`w7-b5-finance-freeze-2026-11-10.md`（B5 已验收）、`w7-b4-manufacturing-rls-freeze-2026-11-10.md`（B4 评估）。

## 0. 本轮已定的三条口径如何落地

| 口径 | 落地结果 |
|---|---|
| **fail-closed，按模块分窗** | 批次划分不再按"清理/补 FORCE/收紧"横切（原 B4-A~E），改为**按模块竖切**：一个模块 = 一次窗口，窗口内同时完成「代码 scope 化 → 本地非超户验证 → 策略收紧」。B4 文档 §6 的原批次表已标注为存档；新的模块顺序见本文 §1.3，阻断项见 §4。 |
| **表名 SHA 升级 v2** | 口径改为 `n.nspname \|\| '.' \|\| c.relname`，其余（`relkind='r'`、`COLLATE "C"`、UTF8、`psql -At` LF、SHA-256）不变。已写入 B5 §1.1（119 行 → `31e68a23…1e85`）与 B4 §1.1（326 行 → `78204999…9ca0`），两份文档的旧值均标注为**历史口径**，R4 风险关闭。全仓只保留这一套算法。 |
| **造数只在验证库** | 生产窗口只做：SQL 层随机租户上下文 + 只读探针（`SET LOCAL app.tenant_id` 后 `SELECT count(*)`），**不 INSERT**。A/B 双租户样本建在本地 `w7_b4_fresh`（当前不存在，需新建；B5 用的是 `w7_b2_fresh`）。 |

**v2 复算命令（唯一）：**

```sh
# B5（finance）
PGHOST=/tmp PGCLIENTENCODING=UTF8 /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relkind='r' ORDER BY (n.nspname||'.'||c.relname) COLLATE \"C\"" \
  | shasum -a 256 | cut -d' ' -f1
# → 31e68a2338793f319f1be5811226823150881fecc9c82108190476b732901e85（119 行）

# B4（八 schema）
PGHOST=/tmp PGCLIENTENCODING=UTF8 /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('mes','wms','scm','srm','pdm','qms','lims','ehs') AND c.relkind='r' ORDER BY (n.nspname||'.'||c.relname) COLLATE \"C\"" \
  | shasum -a 256 | cut -d' ' -f1
# → 78204999a7c557c769e8784f42ce4776c8df69bf3222add0726aa15c7e0b9ca0（326 行）
```

---

## 1. A. 八模块横向对比

### 1.1 主表

口径：表数/带 `tenant_id`/策略达标/非空表 来自 `pg_class + pg_attribute + pg_policies`（超户取数，行数绕 RLS）；SQL/执行/未走 scope 来自 `svc/<module>/src`（不含 tests）；路由数 = `.route(` 注册点数（含嵌套 Router，属上界）；后台任务 = `tokio::spawn` / `interval` / `EventSubscriber`。

| 模块 | 表数 | 带 tenant_id | 策略达标（ENABLE+FORCE+≥1 策略） | 非空业务表 | SQL 执行调用 | 未走 scope | 路由注册点 | 后台 worker / 事件消费者 | 跨模块直接调用（跨 schema SQL） |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| **pdm** | 22 | 20 | **20 / 20** | 0 | **147** | **0** | 71 | 有：`EventSubscriber("pdm")`（`PurchaseOrderCreated` / `ProductionOrderCreated` / `ScmShipmentReceived` + `MasterDataDomain::AccountSubject`）+ 缓存失效订阅 + 15s outbox relay + 缓存预热 | 0 |
| **srm** | 21 | 20 | **20 / 20** | 0 | 234 | 233 | 78 | 有：`EventSubscriber("srm")` + relay + 预热 | 0 |
| **scm** | 37 | 31 | **31 / 31** | 0 | 252 | 248 | 98 | 有：`EventSubscriber("scm")`（2 handler）+ relay + 预热 | 0 |
| **wms** | 39 | 37 | 36 / 37 | 0 | 339 | 339 | 172 | 有：`EventSubscriber("wms")` + relay + 预热 | 0（对 `scm.supplier_products` 的旧 JOIN 已移除，仅注释） |
| **mes** | 51 | 31 | 30 / 31 | 0 | 383 | 356 | **215** | 有：`EventSubscriber("mes-business")` + `EventSubscriber("mes-cache-invalidation")` + 15s relay + 缓存预热。模块内 13 处 `tokio::spawn` 全为**一次性**缓存失效发布（不访问 DB） | 0 |
| **lims** | 45 | 45 | 44 / 45 | 0 | 239 | 239 | 131 | 有：`EventSubscriber("lims")` + relay + 预热 | 0 |
| **ehs** | 71 | 70 | 34 / 70 | 0 | 242 | 237 | 129 | 有：`EventSubscriber("ehs")` + relay + 预热 | 0 |
| **qms** | 40 | 30 | 27 / 30 | 0 | 293 | 289 | 162 | 仅缓存失效订阅 + relay，**无业务事件消费者** | 0 |

补充事实：

- **非空业务表全为 0。** 326 张表里仅 5 张非空，全部是各 schema 的 `schema_defense_ledger`（各 1 行）。因此任何模块都无法用现网数据做"跨租户 0 行"的证明，必须靠本地 A/B 造数 + 生产只读探针。
- **未走 scope 合计 1941 处**（逐模块相加；其中 6 处差异来自 pdm 的 `&mut scope` 与执行调用一对多复用，B4 文档 §4 的 1935 是"总执行 2124 − 总 scope 189"的未封底口径，两者不矛盾）。
- **nil UUID 兜底是第二个普遍缺口**（`tenant_id = tenant_opt.unwrap_or(nil)` 一类）：`ehs 222`、`mes 212`、`scm 208`、`wms 168`、`pdm 107`、`srm 90`、`lims 25`、`qms 19`。这些位置在 fail-open 下写/读 nil 行，在 fail-closed 下会静默变成 0 行——**每个模块的窗口都必须同时清零这块**，不是可选项。`qms`/`lims` 在这项上明显最轻。
- **策略形态仍全部是 fail-open**：359 条策略全 `cmd='*'`、全 PERMISSIVE、0 RESTRICTIVE；198 条含 nil 分支、283 条含列侧 cast、76 条 `USING(true)`、99 组同表同 cmd 重复。
- **无一处跨 schema 直接 SQL 调用。** 模块间协作走事件总线（Redis/`EventSubscriber`）与 HTTP，这意味着**单个模块可以独立开窗**，不会因为别的模块的 schema 没改而阻断。

### 1.2 改造量 / 风险 / 可验证性 打分

评分：改造量 1=最小、5=最大；风险 1=最低、5=最高；可验证性 1=最难、5=最易。

| 模块 | 改造量 | 风险 | 可验证性 | 依据 |
|---|---:|---:|---:|---|
| **pdm** | **2** | **1** | **5** | 147 条执行调用全部落在 `scope_with` 上（`&mut scope` 153 处），`AppState` 只有 `Db` 没有裸池，`PgPool` 仅出现在启动建表；71 路由。改造量给 2 而不是 1，是因为还有 **107 处 nil 兜底**（`tenant_id = tenant_opt.unwrap_or(nil)`，集中在 16 个 handler 文件，模式完全一致，可机械替换） |
| **srm** | 2 | 2 | 3 | 21 表、78 路由，规模第二小；但 234 条执行里 211 条是 `&mut **txn` 事务直连，需要改连接类型 |
| **scm** | 2 | 3 | 2 | 252 条执行仅 4 处 scope；31/31 策略角度"齐"但全是 fail-open；`data_sync` 有后台任务 |
| **wms** | 4 | 4 | 2 | 339 条执行 0 处 scope，`state.db` 裸池 290 处；39 表/172 路由；事务直连密集 |
| **mes** | **5** | **4** | 2 | 383 条执行（最多）、356 处未 scope、215 个路由、13 个 spawn；`state.pool` 567 处引用 |
| **lims** | 2 | 3 | 2 | 239 条执行 0 处 scope，但 nil 兜底仅 25 处（全模块第二低）；45/45 表都有 tenant_id、44/45 达标（仅 `qa_lims_analytes` 缺 FORCE）；痛点集中在 30 组重复策略与 33 表 nil 分支 |
| **ehs** | 3 | **5** | 2 | 71 表最多、**34/70 达标**（36 张无 RLS 或 FORCE）、nil 兜底 222 处（全模块最多）、仅 5 处 `&mut scope` 基础；模块缺口最大 |
| **qms** | 3 | 4 | 2 | 30 表里 3 张无 RLS、3 张无 tenant_id 却挂 RLS；无业务事件消费者（少一个跨请求面） |

### 1.3 排序建议

**先 PDM，再 LIMS → SRM → QMS → SCM → EHS → WMS → MES。**

排序依据（改造量加权 = 未走 scope 数 + nil 兜底数 + 表数，越小越先做）：

| 顺位 | 模块 | 加权值 | 备注 |
|---:|---|---:|---|
| 1 | pdm | 129 | 0 + 107 + 22，且 SQL 已全 scope |
| 2 | lims | 309 | 239 + 25 + 45；45/45 表全有 tenant_id，仅 1 张缺 FORCE |
| 3 | srm | 344 | 233 + 90 + 21；表最少但事务直连最密（211 处 `&mut **txn`） |
| 4 | qms | 348 | 289 + 19 + 40；**无业务事件消费者**（少一类跨请求面），但 3 张表缺 RLS、3 张无 tenant_id 需产品先决，故排在 srm 之后 |
| 5 | scm | 493 | 248 + 208 + 37 |
| 6 | ehs | 530 | 237 + 222 + 71；**覆盖率缺口最大（34/70）**，需先补 36 张表 |
| 7 | wms | 546 | 339 + 168 + 39；0 处 scope |
| 8 | mes | 619 | 383 + 212 + 51；改造量最大，最后做 |

理由（单选一个"最划算"的）：

1. **PDM 是唯一"SQL 已全量 scope 化"的模块**：20 张 tenant 表全达标，147 条执行全部通过 `Db::scope_with(&mut txn)`，`AppState` 里没有 `PgPool` 字段。剩下的代码工作只有两类：1 处事件处理器改用 `scope_for_tenant`、107 处 `tenant_opt.unwrap_or(nil)` 机械替换。**它是唯一能验证"策略收紧后业务不塌"的模块**——因为它没有"1935 处裸执行"这个宏观风险，失败只可能来自局部改造遗漏，可定位。
2. **PDM 表最少（22 张，20 张 tenant）**，迁移一个文件就能覆盖，回滚脚本也最短。
3. **PDM 有真实调用方且端到端可验**：71 个路由覆盖 BOM/文档/图纸/物料/项目/工作流，本地 A/B 造数后可以用真实 HTTP 请求验"A 租户看不到 B 租户的 BOM"。
4. **PDM 恰好踩中两个关键阻断项**（事件处理器 `db.scope()`、`pdm_master_data_refs` 无 tenant_id 却挂 allow_all），试点一次能把"系统通道"的设计验证掉，后面 7 个模块直接复用。

反面：不建议先做 EHS（36 张表缺 RLS，一旦开窗策略收紧会把缺口一次性暴露）或 MES（改造量最大，356 处裸执行，窗口内做不完）。WMS 虽然表数不多，但 339 条执行 0 处 scope，属于"改造量被低估"的模块。

---

## 2. B. 三个异常查清

### 2.1 35 张 tenant 表无 RLS —— 结论：**全部是"建表时未接入 RLS"，无一张是"曾启用后被删"**

判定方法：对每张表在 `database/migrations/*.sql` 全量搜索 `ENABLE / FORCE / CREATE POLICY`（按完整表名匹配，排除 `qa_ehs_environment` vs `qa_ehs_environment_incidents` 这类前缀误命中）。**35 张无一命中任何 RLS 语句**，只有建表语句。

| 来源 | 张数 | 具体表 | 判断 |
|---|---:|---|---|
| `20261007000006_rebuild_orphan_tables.sql`（2026-10-07 重建孤儿表） | 31 | `ehs.`：`qa_ehs_accident_investigations`、`qa_ehs_accident_reviews`、`qa_ehs_accident_treatments`、`qa_ehs_compliance_items`、`qa_ehs_contraindications`、`qa_ehs_detection_records`、`qa_ehs_disease_cases`、`qa_ehs_drill_plans`、`qa_ehs_drill_problems`、`qa_ehs_drill_records`、`qa_ehs_emergency_plan_approvals`、`qa_ehs_emergency_plan_supplies`、`qa_ehs_emergency_plan_versions`、`qa_ehs_emergency_plans`、`qa_ehs_environment`、`qa_ehs_hazard_rectifications`、`qa_ehs_hazard_verifications`、`qa_ehs_health_abnormalities`、`qa_ehs_health_exam_plans`、`qa_ehs_health_exam_records`、`qa_ehs_health_trainings`、`qa_ehs_inspection_items`、`qa_ehs_inspection_plans`、`qa_ehs_inspection_record_items`、`qa_ehs_inspection_records`、`qa_ehs_material_stocks`、`qa_ehs_msds`、`qa_ehs_protection_measures`、`qa_ehs_stock_records`、`qa_ehs_sync_records`、`qa_ehs_trainings` | **新功能未接入**：建表晚于 2026-09 的 RLS 批量（`20260908000016`/`20260910000008`），重建脚本只建表不写 RLS |
| `20261007000009_align_orphan_tables_selfheal3.sql`（2026-10-07 自愈） | 1 | `wms.safety_stock_settings` | 同上 |
| `20261105235000_test_baseline_20_reverse_tables.sql`（2026-11-05 **test 基线迁移**） | 3 | `qms.qa_inspection_items`、`qms.qa_inspection_plans`、`qms.qa_sampling_plans` | **历史漏建 + 迁移来源异常**：该文件命名带 `test_`，按 `apply-forward.sh` 的 `DENY_RE` 在 prod 应被拒绝，但它已以 `success=true` 存在于生产账本（说明是绕过白名单渠道应用的）。三表建表即无 RLS。 |

> 附带发现（需单列）：`20261105235000_test_baseline_20_reverse_tables.sql` 这类测试基线迁移进入生产账本，说明账本里存在非受控来源的迁移。后续任何"按迁移链推断现状"的结论都要打折，必须回到 `pg_class/pg_policies` 实测。

### 2.2 7 张有 RLS 无 FORCE —— 结论：**新迁移模板漏写 FORCE**

| 表 | 启用迁移 | 该迁移的 ENABLE/FORCE 计数 | 判断 |
|---|---|---|---|
| `ehs.qa_ehs_compliance_evaluations` | `20261102220000_rls_enable_biz_batch1.sql` | ENABLE 29 / **FORCE 0** | 新 RLS 模板只写 ENABLE |
| `ehs.qa_ehs_discharge_permits` | 同上 | 同上 | 同上 |
| `ehs.qa_ehs_env_monitor_records` | 同上 | 同上 | 同上 |
| `ehs.qa_ehs_environment_incidents` | 同上 | 同上 | 同上 |
| `ehs.qa_ehs_environmental_regulations` | 同上 | 同上 | 同上 |
| `mes.work_orders` | `20261102230000_rls_enable_biz_batch2.sql` | ENABLE 2 / **FORCE 0** | 同上 |
| `lims.qa_lims_analytes` | `20261031200000_pdm_drawings_create_lims_rls.sql` | ENABLE 2 / FORCE 1（FORCE 只给了 `pdm.pdm_drawings`） | 同文件内漏一张 |

结论一致：**不是历史遗留，而是 2026-11 的新迁移沿用了"只 ENABLE"的模板**。在无 FORCE 时，表 owner（`topems_prod` 是这些表的 owner）绕过 RLS —— 这就是为什么这 7 张表在生产上"看起来有 RLS 但实际不隔离"。

### 2.3 11 张无 `tenant_id` 却挂 RLS —— 结论：**不是坏谓词，是"先锁死、再放行"的两段产物**

逐张核对（`pg_attribute` 精确按 `oid` 查，避免跨 schema 同名表混淆）：

| schema.表 | tenant_id | 策略名 | 谓词 | 创建迁移 | 建表迁移 | 判定 |
|---|---|---|---|---|---:|---|
| `mes.material_categories` | **无** | `mes_allow_all_material_categories` | `ALL/PERMISSIVE USING(true) WITH CHECK(true)` | `20261003000011_b3a_platform_tables_permissive` | `20260725000000_business_base_tables` | 无效防护（全放行），非坏谓词 |
| `mes.material_requirement_items` | **无** | `mes_allow_all_material_requirement_items` | 同上 | 同上 | 同上 | 同上 |
| `pdm.pdm_master_data_refs` | **无** | `pdm_allow_all_pdm_master_data_refs` | 同上 | 同上 | 同上 | 同上；**但事件处理器会写入此表** |
| `qms.audit_logs` | **无** | `qms_allow_all_audit_logs` | 同上 | 同上 | 同上 | 同上 |
| `qms.corrective_actions` | **无** | `qms_allow_all_corrective_actions` | 同上 | 同上 | 同上 | 同上 |
| `qms.dashboard_metrics` | **无** | `qms_allow_all_dashboard_metrics` | 同上 | 同上 | 同上 | 同上 |
| `qms.inspection_items` | **无** | `qms_allow_all_inspection_items` | 同上 | 同上 | 同上 | 同上 |
| `qms.quality_inspections` | **无** | `qms_allow_all_quality_inspections` | 同上 | 同上 | 同上 | 同上（注意 `mes.quality_inspections` 是另一张表，有 tenant_id） |
| `qms.quality_issues` | **无** | `qms_allow_all_quality_issues` | 同上 | 同上 | 同上 | 同上 |
| `qms.quality_standards` | **无** | `qms_allow_all_quality_standards` | 同上 | 同上 | 同上 | 同上（`mes.quality_standards` 另表，有 tenant_id） |
| `wms.wms_master_data_refs` | **无** | `wms_allow_all_wms_master_data_refs` | 同上 | 同上 | 同上 | 同上 |

**来由（可复现的两段历史）：**

1. 早期批量迁移（`20260908000016_rls_enable_all.sql` 及同期批次）对名单内表**无条件** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`（只校验表存在），而策略创建被 `IF NOT pol_exists AND col_exists` 保护——**没有 `tenant_id` 的表因此变成"RLS=ON、0 策略"的锁死状态**（非 owner 角色零行）。
   > 精度声明：能唯一对上迁移文件的是其中 2 张（`mes.material_categories`、`mes.material_requirement_items`）；其余 9 张在迁移链中没有留下显式 `ENABLE` 语句，最可能来自同一批次的动态循环，或 `public → <schema>` 的 `SET SCHEMA` 搬迁（`20260831190100` 等）时保留了 `relrowsecurity` 标志。**这一点无法从迁移链 100% 复现**，但现场状态（RLS=ON、0 策略、无 tenant_id）与 B3a 的补救条件完全吻合，足以确定因果。
2. `20261003000011_b3a_platform_tables_permissive.sql` 的选取条件正是「RLS=ON + 零 policy + 无 tenant_id 列」，于是给它们补了 `<schema>_allow_all_<table>` 的 `USING(true) WITH CHECK(true)`，把锁死"解开"。

**是否引用不存在的列：否。** 11 条策略的 `qual`/`with_check` 都是常量 `true`，不引用任何列，不存在"坏谓词"。它们的问题是**等于没防护**：任何非 owner 角色都能全表读写。

**写入路径只有一处：`pdm.pdm_master_data_refs`**（[event_handlers/mod.rs:255](file:///Users/air/TOPEMS/svc/pdm/src/event_handlers/mod.rs#L255) 的 `INSERT INTO pdm_master_data_refs`）。其余 10 张的代码引用实测：

| 分类 | 表 | 依据 |
|---|---|---|
| **零引用（疑似死表）** | `mes.material_categories`、`mes.material_requirement_items`、`qms.corrective_actions`、`qms.dashboard_metrics`、`qms.quality_issues`、`wms.wms_master_data_refs` | 各自所属 `svc/<module>/src` 下 0 个文件命中 |
| **仅有读引用** | `qms.audit_logs`（1 文件）、`qms.inspection_items`（1）、`qms.quality_inspections`（2）、`qms.quality_standards`（1） | 无 INSERT/UPDATE 语句 |

**处置建议（不在本轮执行）**：
- `pdm_master_data_refs`：保留全局可读语义，但**只给 SELECT**（`USING(true)`），写入口收归系统通道（`app.rls_system='on'`）。这是唯一符合"主数据引用跨租户共享"语义的做法。
- `wms_master_data_refs` 及其余 5 张零引用表：确认死表后**从 RLS 名单移除并 `DISABLE ROW LEVEL SECURITY`**，不要保留 `USING(true)`——它是"看起来做了 RLS"的假象。
- 4 张有读引用的 qms 表：读路径保留"全局只读"（`FOR SELECT USING (true)`），写路径关闭；若后续确需按租户写入，再补 `tenant_id` 列并改租户策略。

### 2.4 `schema_defense_ledger` 那 5 行是什么

| 项 | 结论 |
|---|---|
| 内容 | 每行 = 一个服务启动时的 schema 指纹：`service_schema`、`schema_hash`、`tables_count`、`cols_count`、`applied_at`、`last_skipped_ensure` |
| 5 行归属 | `mes`、`qms`、`scm`、`srm`、`wms` 各 1 行（`applied_at` 均为 2026-11-10 19:41:45–46，即 B5 窗口重启服务的时刻） |
| 有没有 `tenant_id` | 无 |
| 有没有 RLS | 无（`relrowsecurity=false`，0 策略） |
| **写入路径** | **有，且是启动期写入**：[schema.rs](file:///Users/air/TOPEMS/lib/shared-db/src/schema.rs#L191-L205) 的 `ensure_ledger_table()` 用**裸 `PgPool`** `CREATE TABLE IF NOT EXISTS`；[schema.rs](file:///Users/air/TOPEMS/lib/shared-db/src/schema.rs#L350-L360) 用 `INSERT ... ON CONFLICT (service_schema) DO UPDATE` 写指纹。由 `shared-bootstrap` 在每个服务启动时调用。 |
| 对本轮的意义 | 这是**第一个"生命周期跨越请求、且无租户上下文"的已知写路径**。它现在安全只因为该表没有 RLS。任何"给所有表批量开 RLS"的动作必须先把它排除，否则 5 个服务下次启动直接失败。 |

---

### 2.5 系统通道与 RLS 例外清单（PDM 试点落地）

| 对象 | 处置 | 理由 |
|---|---|---|
| `pdm.pdm_master_data_refs` | **全局只读 + 系统通道写**：`SELECT` 对全部租户可见（`USING (true)`）；写入只允许 `app.rls_system='on'`（`scope_system()`） | 表无 `tenant_id`（主数据引用是跨租户共享的元数据）；写路径只有事件处理器 `MasterDataEvent` 一处，事件没有请求上下文，只能用系统通道。代码侧已改为 `self.db.scope_system()`，并对 `event.tenant_id.is_nil()` 直接报错。 |
| `<schema>.schema_defense_ledger`（实测 24 个 schema 各 1 张） | **排除出 RLS 范围**（本轮决策，二选一取此项） | 它是启动期写的 schema 指纹（`service_schema` 唯一键），**生命周期完全不经过请求、没有任何租户上下文**。给它开 RLS 只能靠系统通道，而启动期连请求都没有，等于给启动路径强绑一个不属于它的语义；且它与业务数据无关，泄漏面为零。实测 `relrowsecurity=false / relforcerowsecurity=false / 0 策略`，维持现状即可，`lib/shared-db/src/schema.rs` 的裸池 upsert **不改**。已在 `scripts/ci/check-rls-policy-shape.sh` 加断言：任何迁移若对该表 `ENABLE/FORCE ROW LEVEL SECURITY` 直接失败，防止后续批次误伤 24 个服务的启动。 |

---

## 3. C. 试点模块：PDM

### 3.1 为什么是 PDM（证据，非判断）

| 证据 | 数值 |
|---|---|
| 表数 / 带 tenant_id | 22 / 20（另有 `pdm_master_data_refs` 无 tenant_id、`schema_defense_ledger` 系统表） |
| 策略达标 | 20 / 20 已 ENABLE + FORCE + 有策略 |
| 执行调用 / 已 scope | **147 / 153 处 `&mut scope`**（每个查询都在作用域内，部分查询共用作用域） |
| `scope::Db::new` | 1 处：[main.rs](file:///Users/air/TOPEMS/svc/pdm/src/main.rs#L47) `Db::new(ctx.db.clone(), "pdm, public")` |
| `AppState` 连接类型 | 只有 `Db`，**无 `PgPool` 字段**：[shared/mod.rs](file:///Users/air/TOPEMS/svc/pdm/src/shared/mod.rs#L9-L18)，源码注释即写明"连接治理 B：模块不再持有连接池，所有查询经 `Db` 作用域" |
| 裸池 `PgPool` | 仅 1 处：[models/mod.rs](file:///Users/air/TOPEMS/svc/pdm/src/models/mod.rs#L6) 启动建表 |
| nil UUID 兜底 | **107 处**，分布在 16 个 handler 文件（`project.rs 16`、`document.rs 11`、`product.rs 9`、`document_version.rs 9`、`bom.rs 9`、`material.rs 8`、`version.rs 7`、`production_batch.rs 7`、`configuration.rs 7`、`workflow.rs 6`、`change_notice.rs 6`、`production_step.rs 3`、`production_process.rs 3`、`production_formula.rs 3`、`settings.rs 1`、`drawings.rs 1`），形态统一为 `tenant_opt.unwrap_or_else(|| Uuid::parse_str("0000…0000"))` |
| 路由注册点 | 71 |
| 现网业务数据 | 0 行（全部空表） |

### 3.2 逐表策略方案

目标形态（沿用 B5 定稿）：**每张 tenant 表只保留 1 条 `rls_tenant_isolation`，`FOR ALL`、PERMISSIVE，谓词同时用于 `USING` 与 `WITH CHECK`：**

```sql
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

- 无 nil UUID 全量分支；未设上下文 = 0 行（fail-closed）。
- 不做 `(tenant_id)::text` 列侧 cast；`WITH CHECK` 不含 `tenant_id IS NULL`。
- 先 `DROP POLICY` 掉该表现有全部策略（PDM 每张表都有 2 条重复：`rls_tenant_isolation` + `tenant_isolation_<table>`，两条都是 fail-open 且带 nil 分支）。

| # | 表 | tenant_id | 现策略数 | 目标策略 | 说明 |
|---:|---|---:|---:|---|---|
| 1 | `pdm_bom_items` | 有 | 2 | 1 条 `rls_tenant_isolation` FOR ALL | 去重 + fail-closed |
| 2 | `pdm_boms` | 有 | 2 | 同上 | |
| 3 | `pdm_change_notices` | 有 | 2 | 同上 | 代码侧有 nil 兜底（`change_notice.rs`），需先改代码 |
| 4 | `pdm_configurations` | 有 | 2 | 同上 | |
| 5 | `pdm_document_versions` | 有 | 2 | 同上 | |
| 6 | `pdm_documents` | 有 | 2 | 同上 | |
| 7 | `pdm_drawings` | 有 | 2 | 同上 | |
| 8 | `pdm_materials` | 有 | 2 | 同上 | 缓存预热读此表 |
| 9 | `pdm_production_batches` | 有 | 2 | 同上 | |
| 10 | `pdm_production_formulas` | 有 | 2 | 同上 | |
| 11 | `pdm_production_processes` | 有 | 2 | 同上 | |
| 12 | `pdm_production_steps` | 有 | 2 | 同上 | |
| 13 | `pdm_products` | 有 | 2 | 同上 | |
| 14 | `pdm_project_members` | 有 | 2 | 同上 | |
| 15 | `pdm_project_phases` | 有 | 2 | 同上 | |
| 16 | `pdm_projects` | 有 | 2 | 同上 | |
| 17 | `pdm_versions` | 有 | 2 | 同上 | |
| 18 | `pdm_workflow_instances` | 有 | 2 | 同上 | |
| 19 | `pdm_workflows` | 有 | 2 | 同上 | |
| 20 | `module_settings` | 有 | 1（已是单条） | 1 条 `rls_tenant_isolation` FOR ALL | 谓词重写为 fail-closed |
| 21 | `pdm_master_data_refs` | **无** | 1（allow_all） | **全局只读**：`pdm_master_data_refs_read FOR SELECT USING (true)` + `pdm_master_data_refs_system FOR ALL USING/CHECK (rls_system='on')` | 无 tenant_id，不能按租户隔离；写入只允许系统通道 |
| 22 | `schema_defense_ledger` | **无** | 0 | **不动**（保持无 RLS） | 启动期自检写入；若非要挂，只能加系统通道策略 |

合计：**20 张 tenant 表 × 1 条 + 1 张全局只读 2 条 = 22 条策略**（现网 `pg_policies` 实测 40 条 → 目标 22 条）。

### 3.3 代码改动清单（只列，不改）

| # | 文件 | 函数 / 位置 | 原连接类型 | 目标 scope 方法 | 必要性 |
|---:|---|---|---|---|---|
| 1 | [event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/pdm/src/event_handlers/mod.rs#L252) | `upsert_local_master_data_ref()` L252 | `self.db.scope()`（依赖请求 task-local） | **`self.db.scope_for_tenant(event.tenant_id)`** | **阻断级**：事件消费无请求上下文，`scope()` 必返回 `RLS context missing`，切 fail-closed 后该路径 100% 失败；`MasterDataEvent.tenant_id` 是 `Uuid`（非 Option），可直接传入 |
| 2 | [event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/pdm/src/event_handlers/mod.rs#L80) | 3 处计数查询 L80/L127/L181 | `self.db.scope_read_system()` | 保持（系统通道，读全量做存在性判断） | 复核：确认这 3 处只用于日志/计数，不参与业务决策 |
| 3 | [main.rs](file:///Users/air/TOPEMS/svc/pdm/src/main.rs#L101) | 缓存预热 | `scope_read_system()` | 保持，但**缓存键必须加租户维度或改为不缓存全局列表** | 高风险：`pdm:material:list:default:...` 键无租户，系统通道读全量后会把 A 租户数据写给 B 租户 |
| 4 | [models/mod.rs](file:///Users/air/TOPEMS/svc/pdm/src/models/mod.rs#L6) | `init_database(&PgPool)` | 裸 `PgPool` | 不动（启动 DDL） | 需确认该函数不写业务表 |
| 5 | 16 个 handler 文件（`project.rs` / `document.rs` / `product.rs` / `document_version.rs` / `bom.rs` / `material.rs` / `version.rs` / `production_batch.rs` / `configuration.rs` / `workflow.rs` / `change_notice.rs` / `production_step.rs` / `production_process.rs` / `production_formula.rs` / `settings.rs` / `drawings.rs`） | 107 处 `let tenant_id = tenant_opt.unwrap_or_else(\|\| Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());` | 从请求头 `tenant_opt` 解析，失败落 nil | **改为从 `Db`/请求上下文取租户，缺失即 `return Err(...)`**；删除全部 nil 兜底 | **阻断级**：切 fail-closed 后 nil 兜底会让写入落到 nil 租户（不可见）、读取返回 0 行。107 处形态完全一致，可脚本化替换 + 逐文件 diff 复核 |
| 6 | [modules/*.rs](file:///Users/air/TOPEMS/svc/pdm/src/modules) | 22 个 handler 文件（另有 `mod.rs`）的 `scope_with(txn)` | `state.db.scope_with(&mut txn)` | 保持（已正确） | 无需改动，仅复核 147 条执行全部在作用域内 |
| 7 | 全部 20 张 tenant 表 | 各 handler 的 `INSERT` | — | — | **静态核查**：每条 `INSERT INTO pdm_*` 的列清单必须含 `tenant_id` 且绑定请求租户（`WITH CHECK` 会拒绝缺失） |

> 结论：**PDM 的代码改动 = 3 类结构性修改（#1 事件处理器、#3 缓存键、#5 的 107 处 nil 兜底）+ 1 项静态核查（#7）**；147 处 SQL 执行本身不需要改（已全部 scope 化）。这是选它做试点的核心理由——**改造面是"租户解析"而不是"连接治理"**，前者可以机械替换并逐文件验收。

### 3.4 本地验证方案（`w7_b4_fresh`）

**建库与装载（本地，不碰生产）：**

```sh
# 1) 建库
createdb -h /tmp w7_b4_fresh

# 2) 只导 pdm schema 结构与函数（不导数据；本域生产无业务数据）
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/pg_dump -U topems_prod -d topems_prod \
  --schema=pdm --no-owner --no-privileges -Fc' > /tmp/pdm_schema.dump
pg_restore -h /tmp -d w7_b4_fresh --no-owner --no-privileges /tmp/pdm_schema.dump

# 3) 建非超户验证角色（关键：不能用 superuser，否则 RLS 不生效）
psql -h /tmp -d w7_b4_fresh -c "CREATE ROLE w7_b4_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '...'"
psql -h /tmp -d w7_b4_fresh -c "GRANT USAGE ON SCHEMA pdm TO w7_b4_app; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA pdm TO w7_b4_app"
```

**A/B 双租户造数（`scripts/ops/w7_b4_seed.sql`，只在本地跑）：**

- 租户常量：`A = 11111111-1111-1111-1111-111111111111`、`B = 22222222-2222-2222-2222-222222222222`（不用 nil、不用生产 `…0001`）。
- 对 20 张 tenant 表各插 2 行（A/B 各 1 行，字段取最小必填集），共 40 行。
- 对 `pdm_master_data_refs` 插 2 行（A/B 各 1 行，无 tenant_id）。
- 造数用**超户**执行（本地 `air`），绕开 RLS 写入，保证样本存在。

**断言（`scripts/ops/w7_b4_verify.sql`，以 `w7_b4_app` 执行）：**

| # | 断言 | 期望 |
|---:|---|---|
| A1 | 结构：20 张 tenant 表 `relrowsecurity` / `relforcerowsecurity` 均为 true，且 `pg_policies` 每表恰好 1 条 | 20/20 |
| A2 | 谓词：20 条策略的 `qual` 与 `with_check` 都不含 `IS NULL`、不含 `::text`、不含 nil UUID 字面量，且都含 `app.rls_system` | 20/20 |
| A3 | 无上下文：不设 `app.tenant_id`，`SELECT count(*) FROM pdm.pdm_products` | **0** |
| A4 | A 租户：`SET LOCAL app.tenant_id='1111…'` 后查 20 张表 | 每表 1 行，且 `tenant_id` 全为 A |
| A5 | B 租户：同上换 B | 每表 1 行，且全为 B |
| A6 | 跨租户：A 上下文下 `SELECT count(*) ... WHERE tenant_id='2222…'` | 每表 0 |
| A7 | 越权写：A 上下文下 `INSERT ... tenant_id='2222…'` | 被 `WITH CHECK` 拒绝（`ERROR: new row violates row-level security policy`） |
| A8 | 系统通道：`set_config('app.rls_system','on')` + nil 租户 | 20 张表都能看到 A+B 共 2 行 |
| A9 | 全局只读表：无上下文 `SELECT count(*) FROM pdm.pdm_master_data_refs` | 2（全局可读） |
| A10 | 全局只读表写入：无系统通道 `INSERT INTO pdm.pdm_master_data_refs ...` | 拒绝；开系统通道后可写 |
| A11 | `schema_defense_ledger`：`relrowsecurity=false` 且 0 策略 | 保持不动 |
| A12 | `EXPLAIN`：A4 的任一查询走 `tenant_id` 索引（若有）或无 Seq Scan 全表 | 记录执行计划留档 |

**生产窗口内的只读探针（不造数）：**

```sql
-- 以非超户 topems_prod 执行，只读
BEGIN READ ONLY;
SELECT set_config('app.tenant_id', (SELECT tenant_id::text FROM public.tenants ORDER BY random() LIMIT 1), true);
SELECT 'pdm_products' t, count(*) FROM pdm.pdm_products
UNION ALL SELECT 'pdm_boms', count(*) FROM pdm.pdm_boms
/* ... 20 张 ... */;
ROLLBACK;
```
预期全部为 0（现网无数据）；另跑一次"未设上下文"，同样全部 0，证明 fail-closed 生效。

### 3.5 预计迁移笔数与窗口时长

| 项 | 数量 |
|---|---:|
| **窗口外的前置开发** | 1 处 `scope_for_tenant` + 107 处 nil 兜底替换 + 缓存键租户化；`cargo test -p topems-pdm` 全绿后才申请窗口 |
| 迁移文件 | **2 笔**：`w7_b4_pdm_1_tenant_policies.sql`（20 张 tenant 表收敛）、`w7_b4_pdm_2_master_data_refs.sql`（全局只读 + 系统通道） |
| 回滚脚本 | 1 笔（按表还原旧策略；旧策略可由 `pg_policies` 快照重建） |
| 账本行 | 2 行（`_sqlx_migrations`，手工事务内写入，checksum = SHA-384 文件字节） |
| 停写时长 | **≈ 3 分钟**（停 server + backup → 备份 pdm schema + 策略快照 → 应用 2 笔 → 校验 → 起服务） |
| 总窗口 | **5–8 分钟**（含本地已完成的验证复跑与冒烟） |
| 回滚时长 | ≤ 2 分钟 |

B5 参考：119 张表 + 4 笔迁移的窗口实测停写 **59 秒**；PDM 规模是 1/6，主要成本在验证不在 DDL。

### 3.6 预演方案（事务内 ROLLBACK，待批准后开窗）

**状态：未执行。** 本节只定义动作与判据，预演本身需要在用户点头后、正式窗口前单独跑一次。生产本轮不动。

**预演只回答 4 个问题：**

| # | 问题 | 判据 |
|---:|---|---|
| P-1 | 两笔迁移在生产 schema 上能否一次跑通 | `psql` 退出码 0，无 `RAISE EXCEPTION` |
| P-2 | 21 张表的 `ACCESS EXCLUSIVE` 锁能否在 `lock_timeout=5s` 内拿到 | 无 `canceling statement due to lock timeout` |
| P-3 | 迁移自带结构断言是否全过 | 20 张租户表各 1 条策略、refs 2 条、ledger 未开 RLS |
| P-4 | 迁移应用耗时 | `< 3 分钟`（`\timing` 实测） |

**预演不验证（各自已有出处）：** 业务功能与缓存隔离（§3.4 本地 `w7_b4_fresh` 三条证据）、生产数据可见性（现网 `pdm` 无业务数据，见 §3.4 探针预期）。

**硬约束：**

1. 单事务 + 显式 `ROLLBACK`，**不写** `_sqlx_migrations`（预演不登账）。
2. 生产 server **不停**；`lock_timeout=5s` 拿不到锁即失败退出，绝不排队等锁。
3. 预演前后各做一次 `pg_policies` / `relrowsecurity` 快照，diff 必须为空——这是"零残留"的唯一证据。
4. 预演宿主、DSN、角色必须与正式窗口一致（owner/超户差异会改变断言结果）。
5. 不改 launchd、不改 DSN、不动数据、不部署二进制。

**步骤：**

**P0 前置（只读）**

```sh
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT current_user, rolsuper, current_setting('"'"'server_version'"'"')" \
  -c "SELECT coalesce(max(version),0) FROM _sqlx_migrations"'
```

判据：`rolsuper = f`；`max(version) < 20261110204000`（否则版本号冲突，停手）。

**P1 快照（回滚对照物）**

```sh
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod -c "
  SELECT schemaname||'\''.'\''||tablename||'\''|'\''||policyname||'\''|'\''||cmd||'\''|'\''
         ||coalesce(qual,'\'''\'')||'\''|'\''||coalesce(with_check,'\'''\'')
  FROM pg_policies WHERE schemaname='\''pdm'\'' ORDER BY 1 COLLATE \"C\""' > /tmp/pdm_policies_before.txt

ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod -c "
  SELECT n.nspname||'\''.'\''||c.relname||'\''|'\''||c.relrowsecurity||'\''|'\''||c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='\''pdm'\'' AND c.relkind='\''r'\'' ORDER BY 1 COLLATE \"C\""' > /tmp/pdm_rls_flags_before.txt
```

**P2 备份（保留到窗口结束）**

```sh
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/pg_dump -U topems_prod -d topems_prod \
  --schema=pdm --no-owner --no-privileges -Fc' > /tmp/pdm_before_w7b4.dump
```

**P3 预演（单事务，结尾 ROLLBACK）**

```sh
scp database/migrations/20261110204000_w7_b4_pdm_rls_policies.sql  xingzhai@192.168.110.115:/tmp/w7b4_1.sql
scp database/migrations/20261110204100_w7_b4_pdm_master_data_refs.sql xingzhai@192.168.110.115:/tmp/w7b4_2.sql

ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -v ON_ERROR_STOP=1 \
  -U topems_prod -d topems_prod' <<'SQL'
\timing on
BEGIN;
\i /tmp/w7b4_1.sql
\i /tmp/w7b4_2.sql
-- P-3 追加断言（迁移自带断言之外）
DO $p$
DECLARE v_on int; v_bad int; v_ledger boolean;
BEGIN
  SELECT count(*) INTO v_on FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pdm' AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity;
  IF v_on < 21 THEN RAISE EXCEPTION '预演断言：ENABLE+FORCE 表数=%（期望≥21）', v_on; END IF;

  SELECT count(*) INTO v_bad FROM pg_policies
   WHERE schemaname='pdm'
     AND (coalesce(qual,'') LIKE '%IS NULL%' OR coalesce(with_check,'') LIKE '%IS NULL%'
          OR coalesce(qual,'') LIKE '%::text%' OR coalesce(with_check,'') LIKE '%::text%');
  IF v_bad > 0 THEN RAISE EXCEPTION '预演断言：仍有 % 条 fail-open 谓词', v_bad; END IF;

  SELECT c.relrowsecurity OR c.relforcerowsecurity INTO v_ledger
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pdm' AND c.relname='schema_defense_ledger';
  IF coalesce(v_ledger,false) THEN RAISE EXCEPTION '预演断言：schema_defense_ledger 被开了 RLS'; END IF;
END
$p$;
ROLLBACK;
SQL
```

**P4 零残留验证（新会话，必须与 P1 完全一致）**

```sh
ssh xingzhai@192.168.110.115 '... 同 P1 两条查询 ...' > /tmp/pdm_policies_after.txt
ssh xingzhai@192.168.110.115 '... 同 P1 两条查询 ...' > /tmp/pdm_rls_flags_after.txt
diff /tmp/pdm_policies_before.txt /tmp/pdm_policies_after.txt && \
diff /tmp/pdm_rls_flags_before.txt /tmp/pdm_rls_flags_after.txt && echo "ZERO-RESIDUE OK"
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT count(*) FROM _sqlx_migrations WHERE version IN (20261110204000,20261110204100)"'
# 期望 0
```

**P5 留档：** P3 的 `\timing` 输出、P4 的 `diff` 结果、P0 的角色/版本查询结果，写入本节下方"预演实测"。

**停手条件（命中任一条立即停，不做后续步骤）：**

1. `lock_timeout` 触发（记录被锁的表名）。
2. 任一 `RAISE EXCEPTION`（迁移自带或 P-3 追加）。
3. P4 的 `diff` 非空，或 `_sqlx_migrations` 出现 2 个版本号。
4. P3 迁移部分耗时 > 3 分钟。
5. P0 显示 `max(version) ≥ 20261110204000` 或 `rolsuper = t`。

**正式开窗与预演的差异（批准后执行，届时单独出步骤单）：**

| 项 | 预演 | 正式窗口 |
|---|---|---|
| 事务结尾 | `ROLLBACK` | `COMMIT` |
| server | 不停 | 停写（同 B5 口径） |
| `_sqlx_migrations` | 不写 | 事务内手工 INSERT 2 行（checksum = 文件字节 SHA-384） |
| 校验 | 结构断言 + P4 零残留 | 结构断言 + §3.4 生产只读探针 + 起服务冒烟 |
| 回滚 | 自动（ROLLBACK） | 用 P1 快照重建旧策略；`DELETE` 2 行账本 |

#### 3.6.1 预演实测（2026-11-10，生产 `topems_prod`，未提交、未登账）

| 项 | 结果 |
|---|---|
| P0 角色/权限 | `topems_prod`，`rolsuper = f`，PG 18.4 |
| P0 账本 | 652 行，`max(version)=20261110120300`（< 本笔 20261110204000） |
| P1 前快照 | 策略 **40** 条；21 张表 ENABLE+FORCE；`schema_defense_ledger` 无 RLS |
| P2 备份 | `pg_dump --schema=pdm --schema-only` → `/tmp/pdm_before_w7b4_schema.dump`；全表 `n_live_tup=0`（无数据可备；带数据 dump 被 FORCE RLS 拒，属预期） |
| P3 迁移应用 | 两笔均通过自带断言；`20 张收敛 / 跳过 0`、refs `2 条策略`；耗时 **23.2ms + 6.2ms**（断言 51.9ms） |
| P3 断言 A/B/B2/C/D | ENABLE+FORCE 表数 21 ✔；无 `IS NULL`/nil-UUID 放行分支 ✔；20 张租户表策略均含 `app.rls_system` ✔；`schema_defense_ledger` 未开 RLS ✔；refs = `SELECT/true` + `ALL/app.rls_system` ✔ |
| P3 事务内策略 | 总数 **22** = 20×1（`rls_tenant_isolation`）+ refs×2（`pdm_master_data_refs_read` / `_write`） |
| P4 零残留 | 策略快照 `diff` 空；RLS 标志 `diff` 空；账本仍 **652**，两笔版本 0 行 |
| 停手条件 | 无一命中 |

> 预演首轮失败过一次：追加断言把 `::text` 当作 fail-open 特征，但策略反解析后 `current_setting('app.tenant_id'::text, …)` 天然带 `::text`，误报 21 条。改为只认 `IS NULL` / nil-UUID 字面量后重跑通过。迁移本身首轮即通过，未做任何修改。

### 3.7 超管租户口径（本轮拍板并落地）

**口径：** 超管允许显式选租户，不允许隐式跨租户。

| 情形 | 行为 |
|---|---|
| 超管 + `x-tenant-id: <uuid>` | `tenant_middleware` 把该租户写入 `Claims.tenant_id`，按租户作用域读写（系统通道关闭） |
| 超管 + 无租户头 | 中间件直接 `400`，`message="缺少租户上下文"` |
| 超管 + 非法租户头 | `400`，`message="无效的租户ID格式"` |
| 普通用户 + 任意 `x-tenant-id` | 忽略该头，恒按 `Claims.tenant_id` 解析 |

**代码落点：**
- `lib/shared-auth/src/middleware/tenant.rs`：新增超管分支（显式头 → 写入 `Claims`；无头 → `bad_request("缺少租户上下文")`）；`rls_request_tenant` 改为「有显式租户即租户作用域」，系统通道只留给 service 身份；`resolve_create_tenant` 去掉超管 `→ None`，改为返回显式租户。
- `svc/pdm/src/modules/*.rs`：删除 125+9 处 `if claims.is_superuser { None }` 抹租户逻辑，统一直接读 `Claims.tenant_id`，缺失即 400；补齐 `bom.rs` / `document_version.rs` / `production_formula.rs` 三处漏改（原为 `unwrap_or_default()` 落 nil UUID + `($N IS NULL OR tenant_id = $N)` fail-open SQL）。

**实测（本地 `w7_b4_fresh`，真实 `tenant_middleware` + 真实 `pdm` 表与策略）：**

| 用例 | 状态码 | 返回 |
|---|---|---|
| 超管 + `x-tenant-id: A` | **200** | `tenants=["1111…"]`（只见 A） |
| 超管 + 无租户头 | **400** | `{"code":400,"message":"缺少租户上下文"}` |
| 普通用户(租户 A) + `x-tenant-id: B` | **200** | `tenants=["1111…"]`（仍按 A，头无效） |
| 超管 + 租户 A 调 PDM 列表（handler 级） | **200** | 仅 A 的 1 行 |
| 超管无租户调 PDM 列表（handler 级） | **400** | `code=400` |

> 生产实例仍运行改动前二进制，故 200/400 只能在本地同构库取证；生产 HTTP 三例要等窗口部署后再补。

---

## 4. D. 阻断项（必须先决才能开工）

### 4.1 跨请求生命周期：拿不到请求上下文的 SQL（最高优先级）

| # | 位置 | 现状 | 为什么是阻断 | 需要的决策 |
|---:|---|---|---|---|
| **D1** | [pdm/event_handlers/mod.rs:252](file:///Users/air/TOPEMS/svc/pdm/src/event_handlers/mod.rs#L252) | `self.db.scope()` | 事件消费在后台线程，无 task-local 租户；`apply_request_tenant()` 直接 `Err("RLS context missing")`。切 fail-closed 后主数据同步 100% 失败 | 改为 `scope_for_tenant(event.tenant_id)`（字段已是 `Uuid`）。**这是试点内必须改的第 1 项** |
| **D2** | `wms` / `scm` / `srm` / `lims` / `ehs` 的 `event_handlers` | 全部持裸 `PgPool`（wms 6 处、scm 4、srm 4、lims 4、ehs 4）。租户绑定各不相同：`wms` 用 `payload.tenant_id.unwrap_or(uuid::Uuid::nil())`；`scm` 直接 `.bind(payload.tenant_id)`（`Option<Uuid>`，None 即 NULL 行）；`srm` 3 处 nil 兜底；`ehs` 有明确注释"事件总线消费者无 HTTP 会话/租户上下文，**落全局集成行（tenant_id=nil）**" | nil/NULL 租户在 fail-closed 下写不进任何行；当前 fail-open 下这些行已写入 nil/NULL，收紧后既不可见也无法再写。`ehs` 的做法是刻意的全局行设计，需要单独定"全局行"策略 | 统一改为"事件必须携带 tenant_id，缺失即丢弃 + 告警"；`ehs` 的全局行要么登记为全局只读/全局可见，要么改走系统通道；连接改 `Db::scope_for_tenant` |
| **D3** | [mes/event_handlers.rs:105](file:///Users/air/TOPEMS/svc/mes/src/event_handlers.rs#L105) | `SELECT set_config('app.tenant_id', $1, true)` 直接在裸池上执行 | `true` = `SET LOCAL`，**只对当前事务有效**；在 autocommit 单语句下随即失效，下一句查询又变回无上下文。当前能"工作"是因为策略 fail-open，收紧后必断 | 必须改用 `Db::scope_for_tenant` 包住整段读写，不允许裸 `set_config` |
| **D4** | `svc/<module>/src/main.rs` 的 15s `run_relay` | `commit_retry::run_relay` 只操作 Redis ZSET，**不碰数据库** | 非阻断（已核实） | 无需动作，登记为"安全" |
| **D5** | 各模块 `main.rs` 的启动缓存预热 | 只有 **pdm** 走 `scope_read_system()`（全仓 `scope_*_system` 仅 4 处，全在 pdm）；其余 7 个模块预热走裸池，无租户上下文。且**所有缓存键都没有租户维度**（如 `pdm:material:list:default:...`） | 两种失败模式：pdm = 系统通道读全量 + 无租户缓存键 = **B 租户可能拿到 A 租户数据**；其余 7 个 = fail-closed 下预热读到 0 行，缓存为空（功能退化但不泄露） | 缓存键必须加租户前缀；预热按租户遍历（`scope_for_tenant`）或干脆取消跨租户预热。**这是所有模块的共同阻断项，PDM 试点必须先解决** |
| **D6** | [shared-db/schema.rs:191](file:///Users/air/TOPEMS/lib/shared-db/src/schema.rs#L191) `ensure_ledger_table` + L350 upsert | 裸 `PgPool`，启动期写 `schema_defense_ledger` | 任何批量 RLS 覆盖会打断 5 个服务启动 | 明确该表永久排除在 RLS 之外（或加系统通道策略） |

> **结论：** 8 个模块全部存在"后台/事件路径无请求上下文"的问题，**只有 PDM 的形态最接近可解**（缺 1 处 `scope_for_tenant`）。因此"按模块分窗"的顺序必须由 **D1–D3 的代码改造完成度**决定，而不是由表数决定。

### 4.2 口径与数据类阻断

| # | 阻断 | 卡点 | 需要谁定 |
|---:|---|---|---|
| **D7** | 11 张无 `tenant_id` 的 `USING(true)` 表怎么处置 | 已查明：1 张活写（`pdm_master_data_refs`）、4 张活读（qms 4 表）、6 张零引用。剩余决策点只有两个：6 张零引用表能否直接删/停用；4 张活读表是否认可"全局只读"语义 | 产品 + 架构 |
| **D8** | 35 张无 RLS 表的写入路径是否都带 `tenant_id` | 补齐 RLS 后，任何 `INSERT` 缺 `tenant_id` 都会被拒绝；当前未逐条核查 31 张 `qa_ehs_*` 的 INSERT 列清单 | 研发：需一次静态核查（`grep INSERT INTO qa_ehs_*` 对照列清单） |
| **D9** | 生产运行角色是否确为非超户 | RLS 只对非 superuser / 非 owner 生效。B5 已验证 `topems_prod` 为业务角色，但 launchd 的 DSN 需再确认一次 | 运维：启动前 `SELECT current_user, rolsuper` 留档 |
| **D10** | 测试基线迁移进入生产账本 | `20261105235000_test_baseline_20_reverse_tables.sql` 已在 prod `success=true`，且建了 3 张 qms 表 | 研发/运维：补一份"非受控迁移"清单，确认是否还有其他同类 |
| **D11** | `ehs` 34/70 达标：36 张表同时缺 RLS 和 FORCE | 该模块一旦按 fail-closed 开窗，等于一次性给 36 张表上锁；任何未 scope 的读取立刻归零 | 研发负责人：EHS 必须先完成 237 处 scope 化，窗口才有意义 |
| **D12** | 99 组重复 permissive 策略 | 去重与收紧必须同窗口；只去重不收紧无收益，只收紧不去重会留下两套谓词 | DBA：按模块生成"旧策略快照 → 新策略"对照表 |

### 4.3 本轮未做、但开工前必须补齐的验证物

1. `scripts/ops/w7_b4_seed.sql`（本地 A/B 造数）—— 本轮只给方案，未落脚本。
2. `scripts/ops/w7_b4_verify.sql`（A1–A12 断言）—— 本轮只给断言表，未落 SQL。
3. PDM 20 张表的**旧策略快照**（回滚依据）—— 窗口前用 `pg_policies` 导出。
4. PDM 全部 `INSERT` 语句的 `tenant_id` 列清单核查结果。

---

## 5. 附：本轮采集命令与可复现性

- 表/策略/行数：`pg_class + pg_attribute + pg_policies`，超户 `-U xingzhai`（peer）取精确行数，非超户 `topems_prod` 取策略与 RLS 标志（策略定义不受 RLS 影响）。
- 迁移溯源：`grep -rn "<table>" database/migrations/*.sql`，按 `ENABLE|FORCE|CREATE POLICY` 过滤。
- 代码统计：`svc/<module>/src` 下 `sqlx::query*` 计 SQL、`.fetch_*/.execute` 计执行调用、`&mut scope` 计已 scope 化、`.route(` 计路由、`tokio::spawn|interval|EventSubscriber` 计后台面。
- 本轮的三个数字口径已固化：B5 v2 SHA `31e68a23…1e85`（119 行）、B4 v2 SHA `78204999…9ca0`（326 行）、未走 scope 1941 处（逐模块相加）。

**建议下一步：** 只做 PDM —— 先落 §3.3 的 #1（`scope_for_tenant`）、#3（缓存键租户化）、#5（107 处 nil 兜底），本地 `w7_b4_fresh` 跑 A1–A12，全绿后再申请 PDM 窗口。其余模块在 PDM 窗口验收后再排。
