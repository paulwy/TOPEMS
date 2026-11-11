# W7 · B4 LIMS 表清单冻结（v2 口径）

- 日期：2026-11-10
- 性质：**只读冻结**。本文不改代码、不写生产库、不新增迁移。
- 生产宿主：`xingzhai@192.168.110.115`，库 `topems_prod`，生产 HEAD `369887910`
- 证据：超管只读连接（`-U xingzhai`，peer）取 `pg_class` / `pg_policies` / `count(*)`，绕开 RLS
- 上游：[w7-b4-manufacturing-rls-freeze-2026-11-10.md](w7-b4-manufacturing-rls-freeze-2026-11-10.md)、
  [w7-cross-request-tenant-context-2026-11-10.md](w7-cross-request-tenant-context-2026-11-10.md)

## 0. 冻结口径

| 项 | 口径 |
| --- | --- |
| 范围 | LIMS 实际读写的两个 schema：`lims`（45 张）+ `public`（31 张 `qa_lab_*` / `qa_lims_*`） |
| 表范围 | 仅 `relkind='r'` 普通表 |
| 表名口径 | v2：`n.nspname\|\|'.'\|\|c.relname`，`COLLATE "C"`，UTF8，`psql -At`，LF |
| 行数 | 超管 `count(*)`；生产 LIMS 业务表当前**全为 0 行** |
| 策略口径 | `pg_policies` 全量 + `pg_class.relrowsecurity/relforcerowsecurity` |

**本轮最重要的发现：LIMS 的表不在一个 schema 里。**

- `lims.*` 45 张：`qa_lab_*` 与 `qa_lims_*` 的历史副本，全部有 RLS；
- `public.qa_lab_* / qa_lims_*` 31 张：**代码真正高频读写的那一套**，其中
  `public.qa_lab_samples`（38 处）、`public.qa_lab_tasks`（24 处）在 `lims` schema 里根本没有对应表；
- 也就是说，只冻结 `lims` schema 会漏掉一半以上真实读写面。本冻结把两者都纳入。

> 服务 `SEARCH_PATH = "lims, public, shared"`，未加 schema 前缀的 `qa_lims_*` 命中 `lims.*`，
> 显式写 `public.` 的命中 `public.*`。两套同名表并存，必须同时收敛，否则改一套等于没改。

## 1. 表清单冻结

### 1.1 `lims` schema（45 张）

- v2 SHA256：`18d5e2066aff1d20821e273906c842eb4301704f04d7c75df75cc4cea2e19b9f`
- 计算：
  ```bash
  ssh xingzhai@192.168.110.115 \
    "/opt/homebrew/opt/postgresql@17/bin/psql -X -At -d topems_prod -c \
     \"select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace \
       where n.nspname='lims' and c.relkind='r' order by (n.nspname||'.'||c.relname) collate \\\"C\\\";\"" \
    | shasum -a 256
  ```
- ENABLE 45/45，FORCE 44/45（`qa_lims_analytes` 未 FORCE），行数全 0，全局行 0。

### 1.2 `public` schema（31 张）

```sql
-- 冻结条件（可复算）
where n.nspname = 'public' and c.relkind = 'r'
  and (c.relname like 'qa_lab%' or c.relname like 'qa_lims%')
```

- 31/31 均有 `tenant_id`、ENABLE + FORCE、**每张 1 条策略**、行数全 0。
- v2 SHA256（同口径，`nspname='public'` + 上述 `relname` 条件）：
  `d0f5e85bdb90d7d15f58bbf7a3318c558dbb16bb392aed705596b6bce7137c8b`

## 2. 逐表策略形态

图例：`T`=租户 GUC 判定、`S`=系统通道、`N`=nil/空上下文分支、`C`=列侧 cast、`U`=`USING(true)`、`P`=同表多条 permissive、`—`=无策略。
多标记按 T→S→N→C→U→P 连接。

### 2.1 `lims.*`（45 张）

| # | 表名 | tenant_id | 行数 | ENABLE | FORCE | 策略数 | 现有形态 | 结论 |
|---|---|---|---|---|---|---|---|---|
| 1 | lims.ai_analyses | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 2 | lims.audit_logs | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 3 | lims.document_relations | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 4 | lims.inspection_processes | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 5 | lims.inspection_records | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 6 | lims.inspection_tasks | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 7 | lims.instrument_calibrations | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 8 | lims.instruments | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 9 | lims.lab_ledger | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 10 | lims.lims_inspection_records | Y | 0 | Y | Y | 1 | TNC | 需收敛 |
| 11 | lims.lims_safety_tasks | Y | 0 | Y | Y | 1 | TNC | 需收敛 |
| 12 | lims.maintenance_records | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 13 | lims.qa_lab_calibration_records | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 14 | lims.qa_lab_inspection_reports | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 15 | lims.qa_lab_instruments | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 16 | lims.qa_lab_processes | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 17 | lims.qa_lab_reagent_alerts | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 18 | lims.qa_lab_reagent_history | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 19 | lims.qa_lab_reagents | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 20 | lims.qa_lab_records | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 21 | lims.qa_lab_sample_lifecycle | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 22 | lims.qa_lims_analytes | Y | 0 | Y | **N** | 2 | TNCP | 需收敛 + 补 FORCE |
| 23 | lims.qa_lims_audit_logs | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 24 | lims.qa_lims_barcode_scan_records | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 25 | lims.qa_lims_collection_tasks | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 26 | lims.qa_lims_instrument_data | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 27 | lims.qa_lims_method_categories | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 28 | lims.qa_lims_method_validations | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 29 | lims.qa_lims_method_versions | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 30 | lims.qa_lims_parse_rules | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 31 | lims.qa_lims_pt_corrective_actions | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 32 | lims.qa_lims_pt_evaluations | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 33 | lims.qa_lims_pt_plans | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 34 | lims.qa_lims_pt_results | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 35 | lims.qa_lims_pt_samples | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 36 | lims.qa_lims_rfid_tags | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 37 | lims.qa_lims_sample_barcodes | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 38 | lims.qa_lims_sync_records | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 39 | lims.qa_lims_test_methods | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 40 | lims.qa_lims_uncertainty_components | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 41 | lims.qa_lims_uncertainty_projects | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 42 | lims.qa_lims_uncertainty_sources | Y | 0 | Y | Y | 2 | TNCP | 需收敛 |
| 43 | lims.reagent_usages | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 44 | lims.reagents | Y | 0 | Y | Y | 1 | U | 需收敛 |
| 45 | lims.samples | Y | 0 | Y | Y | 1 | TNC | 需收敛 |

### 2.2 `public.qa_lab_*` / `public.qa_lims_*`（31 张）

31 张的谓词**完全相同**，均为：

```sql
current_setting('app.tenant_id', true) IS NULL
OR current_setting('app.tenant_id', true) = ''
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
   OR tenant_id IS NULL
   OR NULLIF(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
```

即形态 `TN`：未设上下文 / 空上下文 / nil 上下文 / `tenant_id IS NULL` 四路全放行，**且无系统通道分支**。

| # | 表名 | tenant_id | 行数 | ENABLE | FORCE | 策略数 | 形态 |
|---|---|---|---|---|---|---|---|
| 1 | public.qa_lab_calibration_records | Y | 0 | Y | Y | 1 | TN |
| 2 | public.qa_lab_inspection_reports | Y | 0 | Y | Y | 1 | TN |
| 3 | public.qa_lab_instruments | Y | 0 | Y | Y | 1 | TN |
| 4 | public.qa_lab_processes | Y | 0 | Y | Y | 1 | TN |
| 5 | public.qa_lab_reagent_alerts | Y | 0 | Y | Y | 1 | TN |
| 6 | public.qa_lab_reagent_history | Y | 0 | Y | Y | 1 | TN |
| 7 | public.qa_lab_reagents | Y | 0 | Y | Y | 1 | TN |
| 8 | public.qa_lab_records | Y | 0 | Y | Y | 1 | TN |
| 9 | public.qa_lab_sample_lifecycle | Y | 0 | Y | Y | 1 | TN |
| 10 | public.qa_lab_samples | Y | 0 | Y | Y | 1 | TN |
| 11 | public.qa_lab_tasks | Y | 0 | Y | Y | 1 | TN |
| 12 | public.qa_lims_audit_logs | Y | 0 | Y | Y | 1 | TN |
| 13 | public.qa_lims_barcode_scan_records | Y | 0 | Y | Y | 1 | TN |
| 14 | public.qa_lims_collection_tasks | Y | 0 | Y | Y | 1 | TN |
| 15 | public.qa_lims_instrument_data | Y | 0 | Y | Y | 1 | TN |
| 16 | public.qa_lims_method_categories | Y | 0 | Y | Y | 1 | TN |
| 17 | public.qa_lims_method_validations | Y | 0 | Y | Y | 1 | TN |
| 18 | public.qa_lims_method_versions | Y | 0 | Y | Y | 1 | TN |
| 19 | public.qa_lims_parse_rules | Y | 0 | Y | Y | 1 | TN |
| 20 | public.qa_lims_pt_corrective_actions | Y | 0 | Y | Y | 1 | TN |
| 21 | public.qa_lims_pt_evaluations | Y | 0 | Y | Y | 1 | TN |
| 22 | public.qa_lims_pt_plans | Y | 0 | Y | Y | 1 | TN |
| 23 | public.qa_lims_pt_results | Y | 0 | Y | Y | 1 | TN |
| 24 | public.qa_lims_pt_samples | Y | 0 | Y | Y | 1 | TN |
| 25 | public.qa_lims_rfid_tags | Y | 0 | Y | Y | 1 | TN |
| 26 | public.qa_lims_sample_barcodes | Y | 0 | Y | Y | 1 | TN |
| 27 | public.qa_lims_sync_records | Y | 0 | Y | Y | 1 | TN |
| 28 | public.qa_lims_test_methods | Y | 0 | Y | Y | 1 | TN |
| 29 | public.qa_lims_uncertainty_components | Y | 0 | Y | Y | 1 | TN |
| 30 | public.qa_lims_uncertainty_projects | Y | 0 | Y | Y | 1 | TN |
| 31 | public.qa_lims_uncertainty_sources | Y | 0 | Y | Y | 1 | TN |

## 3. 目标形态（与 PDM 完全一致）

每张租户表最终**只保留 1 条**策略，历史策略全部 DROP：

```sql
ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <schema>.<table> FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON <schema>.<table> FOR ALL TO PUBLIC
  USING (
    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
  )
  WITH CHECK (同上);
```

- 无 `tenant_id IS NULL` 分支、无 nil UUID 分支、无空串放行、无列侧 cast；
- 未设上下文 = 0 行（fail-closed）；
- 系统通道 = `app.rls_system='on'` + `app.tenant_id='000…000'`。

**全局只读表登记：0 张。** LIMS 没有 `pdm_master_data_refs` 那种跨租户只读表；
`lims.*` 与 `public.qa_*` 全部带 `tenant_id`，无例外。

**启动/指纹类排除：** `lims` schema 无 `schema_defense_ledger`（24 个 schema 有，LIMS 没有）；
LIMS 启动期只有 DDL 自愈（`svc/lims/src/models/schema_defense.rs`），不写租户行，
已登记进 [范式文档 §6 例外 #3](w7-cross-request-tenant-context-2026-11-10.md)。

## 4. 代码盘点（改造清单）

| 类别 | 位置 | 现状 | 处置 |
| --- | --- | --- | --- |
| 事件处理器 | `svc/lims/src/event_handlers/mod.rs` | 裸 `PgPool`；`tenant_id` 硬编码全 0 UUID；忽略 payload 租户 | 按范式改（`require_event_tenant` + `scope_for_tenant`） |
| 缓存预热 | `svc/lims/src/main.rs` L111-151 | 裸池读 `public.qa_lab_samples/tasks`，写全局键 `lims:sample:list:warmup` | 改 `sweep_tenants` + `lims:sample:list:<tenant>` |
| 事件订阅启动 | `svc/lims/src/main.rs` L95 | `start_event_subscribers(ctx.db.clone())` 传 `PgPool` | 传 `Db` |
| 状态注入 | `svc/lims/src/shared/mod.rs` | `AppState.pool: PgPool` + `FromRef<AppState> for PgPool` | 改 `db: Db` + `FromRef<AppState> for Db` |
| 模块查询 | `svc/lims/src/modules/**`（27 个文件，202 处查询） | 直接 `&pool` / `&state.pool` | 裸池清零：`scope_with(txn)` / `scope_read` / `scope` |
| 启动 DDL | `svc/lims/src/models/schema_defense.rs` | 裸池 DDL | 保留，加 `// tenant-system:` 登记注释 |
| 缓存键 | `modules/sample.rs`、`modules/inspection_task.rs` | 已带 `tenant_id`（`lims:sample:{tenant}:...`） | 核对无遗漏 |

补充发现（本轮不做结构变更，只记录）：

- `modules/inspection_task.rs` 有 1 处 `lims.qa_lab_tasks`，其余为 `public.qa_lab_tasks`，
  同一逻辑表跨 schema 混用；本轮策略两套都收，代码统一到 `public.qa_lab_tasks`；
- `public.qa_lab_samples` / `public.qa_lab_tasks` 在 `lims` schema 下**没有**同名表，
  因此未加前缀的 `qa_lab_samples`（若有）会通过 `search_path` 落到 `public`。

## 5. 迁移与验证计划

1. 一条迁移：`database/migrations/<ts>_w7_b4_lims_rls_policies.sql`
   - 76 张表逐张 DROP 历史策略 → ENABLE + FORCE → 建 `rls_tenant_isolation`；
   - 守卫：表不存在 / 无 `tenant_id` → `WARNING` 跳过（不 fail），末段断言必须 76/76；
   - 幂等：可重复执行。
2. 全局只读表迁移：**无**（0 张）。
3. 验证脚本：`scripts/ops/w7_b4_lims_verify.sql`
   - 开头 `SET ROLE :"app_role"` + `rolsuper`/`rolbypassrls` 硬拦；
   - 临时表驱动 76 行断言：ENABLE/FORCE、策略数=1、谓词无 `USING(true)`、无 `tenant_id IS NULL`、无列侧 cast、含系统通道；
   - 双身份：系统通道 / 租户 A / 租户 B / 无上下文；
   - 写探测：`BEGIN … ROLLBACK`。
4. 本地验证库：`w7_b4_fresh`（从迁移链重建）或新库 `topems_lims_ab`；造 A/B 双租户数据。
5. 预演：单事务 `BEGIN … ROLLBACK`，记录耗时与逐表结果。

## 6. 风险

| 风险 | 说明 | 处置 |
| --- | --- | --- |
| 双 schema 同名表 | 改一套漏一套 = 隔离无效 | 本轮 76 张全收；验证脚本按 76 行断言 |
| 生产 LIMS 无数据 | 无法用真实数据验证 | 本地造 A/B 双租户数据 |
| 202 处查询改造 | 机械但面广，易漏 `&pool` | 改造后 `grep` 清零 + `cargo clippy` + 门禁；按文件分批提交 |
| 写路径进新事务 | 从 autocommit 改为请求 RLS 事务 | 与 PDM 一致，`scope_with(txn)` 不接管提交 |
| `qa_lims_analytes` 未 FORCE | 表所有者可绕过 | 迁移中显式补 FORCE |
