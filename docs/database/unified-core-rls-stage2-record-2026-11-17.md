# 阶段二正式读数：统一核心 RLS 收紧迁移（2026-11-17）

> 性质：**阶段二（DDL 方案）的正式记录**，含提交哈希、覆盖清单、克隆库演练读数与耗时、与平台语料迁移的相互影响结论。
> 结论可直接复述；所有数字均为 2026-11-17 在克隆库 `m2_dryrun_20261116`（与生产同源）实测。
> 配套材料：[生产窗口执行清单](./unified-core-rls-prod-window-runbook-2026-11-17.md)；决策依据：[unified-core-rls-decisions-2026-11-17.md](./unified-core-rls-decisions-2026-11-17.md)。

## 1. 提交与文件

| 项 | 值 |
|---|---|
| 迁移提交 | `92219257b` — `feat(db): 收紧统一核心 RLS 策略并补齐缺失租户隔离` |
| 变更规模 | 4 个文件，`+712` 行（无删除） |
| 迁移文件 | [database/migrations/20261117180000_unified_core_rls_strict.sql](../../database/migrations/20261117180000_unified_core_rls_strict.sql)（448 行，SHA-384 前缀 `9b9ad378031c`） |
| 回滚文件 | [database/rollback/20261117180000_unified_core_rls_strict.rollback.sql](../../database/rollback/20261117180000_unified_core_rls_strict.rollback.sql)（237 行） |
| 登记 | `database/checksums.txt`（validate.sh 重算）、`database/migration_manifest.yaml` 的 `pending_forward_patches` |
| 平台语料迁移 | [database/migrations/20261117120000_platform_corpus_null_to_nil.sql](../../database/migrations/20261117120000_platform_corpus_null_to_nil.sql)（沿用，未改；SHA-384 前缀 `30235bcd385e`） |
| 平台语料回滚 | [database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql](../../database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql) |

## 2. 覆盖的表与策略清单

严格 B 范式文本（A/B/C/D 共用，USING 与 WITH CHECK 同构）：

```sql
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

已删除的四个宽松分支：GUC 未设置放行、GUC 空串放行、`tenant_id = 全零 UUID` 放行、`tenant_id IS NULL` 放行。

| 段 | 表 | 迁移前形态 | 迁移动作 | 策略数 |
|---|---|---|---|---:|
| A | `public.core_flow_rules` | RLS off / 0 策略 | ENABLE + FORCE + CREATE `rls_tenant_isolation`（ALL） | 1 |
| A | `public.core_flow_variables` | RLS off / 0 策略 | 同上 | 1 |
| A | `public.core_flow_variable_history` | RLS off / 0 策略 | 同上 | 1 |
| A | `public.core_flow_delegates` | RLS off / 0 策略 | 同上 | 1 |
| B | `public.core_workflows` | 宽松 `rls_tenant_isolation`（含 USING+WITH CHECK） | DROP + CREATE 严格文本 | 1 |
| B | `public.core_workflow_versions` | 宽松 `rls_tenant_isolation`（仅 USING） | DROP + CREATE 严格文本 | 1 |
| B | `public.core_workflow_instances` | 宽松 `rls_tenant_isolation`（仅 USING） | DROP + CREATE 严格文本 | 1 |
| B | `public.core_workflow_tasks` | 宽松 `rls_tenant_isolation`（仅 USING） | DROP + CREATE 严格文本 | 1 |
| B | `public.monitor_settings` | 宽松 `rls_tenant_isolation`（仅 USING） | DROP + CREATE 严格文本 | 1 |
| C | `public.alerts` | `public_allow_all_alerts`（ALL / `true`） | DROP + CREATE 严格文本 | 1 |
| D | `public.search_logs` | RLS off / 0 策略 | ENABLE + FORCE + CREATE 严格文本 | 1 |
| E | `public.alert_rules` | `public_allow_all_alert_rules`（ALL / `true`） | DROP + 4 条命令级策略 | 4 |

合计：**11 张表**；`DROP POLICY` 7 条、`CREATE POLICY` 15 条、`ENABLE/FORCE RLS` 各 5 次。

`alert_rules` 的四条策略（表无 `tenant_id` 列，归类为平台全局系统表）：

| 策略 | 命令 | 表达式 |
|---|---|---|
| `rls_alert_rules_read` | SELECT | `true`（所有身份可读，与迁移前一致） |
| `rls_alert_rules_insert` | INSERT | `COALESCE(current_setting('app.rls_system', true), 'off') = 'on'` |
| `rls_alert_rules_update` | UPDATE | 同上（USING + WITH CHECK） |
| `rls_alert_rules_delete` | DELETE | 同上（USING） |

> `core_workflow_tasks` 原不在「flow 三表」口径内；取证发现其策略文本与三表逐字相同、同属 GUC 空/NULL 放行面，故一并收紧（迁移头已注明）。

## 3. 断言与回填策略

**前置断言**（任一失败即整笔 `RAISE EXCEPTION` 回滚）：

1. 11 张表存在且均有 `tenant_id` 列；`alert_rules` 必须存在且**没有** `tenant_id` 列（若已加列，口径失效需重新拍板）。
2. 待加 RLS 的 5 张表（flow 四表 + `search_logs`）必须仍是 `rls=false / force=false / 0 策略`。
3. flow 四表 + `monitor_settings` 的 `rls_tenant_isolation` 必须仍是预期宽松文本（含 `IS NULL` 与全零 UUID）。
4. `alerts` / `alert_rules` 必须仍是单条 allow_all 策略。
5. 11 张带 `tenant_id` 的表，`tenant_id IS NULL` 行数必须为 **0**。

**回填策略**：不做任何自动归属。NULL 租户行无法从数据推断归属，非 0 即中止整笔迁移，须人工甄别后另发数据迁移。

**后置断言**：11 表 `rls=true / force=true`；每表唯一 `rls_tenant_isolation`；策略文本无宽松分支且含 `app.rls_system`；`alert_rules` 4 条策略、读策略 `qual='true'`、三条写策略含 `app.rls_system`、无 `public_allow_all%`；NULL 租户行数仍为 0。

**回滚能力**（脚本五步逆向）：

1. flow 四表 + `search_logs`：删策略、`NO FORCE`、`DISABLE RLS`；
2. flow 四表 + `monitor_settings`：严格文本 → 迁移前宽松文本（`core_workflows` 恢复 USING+WITH CHECK，其余四表恢复仅 USING）；
3. `alerts` → `public_allow_all_alerts`（`true/true`）；
4. `alert_rules` → `public_allow_all_alert_rules`（`true/true`）；
5. 断言目录形态恢复、NULL 行数仍为 0。

回滚只恢复数据库形态，不含 DML；up/down 均不读写业务数据。

## 4. 克隆库演练：up / 归一 / 六档 / down

演练库：`m2_dryrun_20261116`，角色 `topems_prod`（非 superuser、非 BYPASSRLS）；超级用户仅用于布置/清理 fixture。
执行方式：`psql -X -v ON_ERROR_STOP=1 --single-transaction -f <file>`，墙钟由 `/usr/bin/time -p` 记录。

### 4.1 平台语料归一（`20261117120000`）

| 步骤 | 耗时（real） | 读数 |
|---|---:|---|
| down（全零 → NULL） | 0.03 s | `UPDATE 77 / 397 / 3 / 4`，共 481 行还原 |
| up（NULL → 全零） | 0.02 s | `UPDATE 77 / 397 / 3 / 4`，共 481 行归一；前置/后置断言通过 |

归一后核对（`NULL` / 全零）：

| 表 | NULL 行 | 全零租户行 |
|---|---:|---:|
| `public.core_dict_types` | 0 | 77 |
| `public.core_dict_items` | 0 | 397 |
| `ai.ai_prompt_templates` | 0 | 3 |
| `ai.ai_models` | 0 | 4 |

### 4.2 严格迁移 up / down

| 步骤 | 耗时（real） | 结果 |
|---|---:|---|
| strict up | **0.04 s** | 前置/后置断言全部通过；11 表 RLS/force 全开 |
| strict down | **0.03 s** | 目录形态恢复：flow 四表与 `search_logs` 回到 `rls=f / force=f / 0 策略`；`alerts`/`alert_rules` 回到 allow_all |
| 六档读矩阵（6 个事务） | 0.01 s | 见 4.3 |

演练 fixture：`core_flow_rules` 3 行（A/B/全零）、`core_workflow_instances` 3 行（A/B/全零）、`alerts` 2 行（A/B）、`search_logs` 2 行（A/B）、`alert_rules` 1 行、`core_flow_variables` 2 行（A/B）、`monitor_settings` 3 行（A/B/全零）；`core_workflow_tasks`、`core_flow_variable_history`、`core_flow_delegates` 各 2 行（A/B）。演练后全部删除。

### 4.3 六档 GUC 读矩阵（行数）

| 档位 | `flow_rules` | `instances` | `alerts` | `search_logs` | `alert_rules` | `flow_variables` | `monitor_settings` |
|---|---:|---:|---:|---:|---:|---:|---:|
| L1 未设置 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| L2 空串 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| L3 全零租户 | 1 | 1 | 0 | 0 | 1 | 0 | 1 |
| L4 租户 A | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| L5 租户 B | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| L6 系统通道 | 3 | 3 | 2 | 2 | 1 | 2 | 3 |

- L1/L2 为 0：四个宽松分支已拆除，未设/空 GUC 一律 fail-closed。
- L3 仅见全零（平台）行：`flow_rules`/`instances`/`monitor_settings` 各 1 行；`alerts`/`search_logs` 无平台行。
- L4/L5 各见本租户 1 行，互不可见。
- L6 全量可见，行数等于 fixture 总量（`rules` 3 / `instances` 3 / `alerts` 2 / `search_logs` 2 / `variables` 2 / `monitor_settings` 3），未丢行。
- `alert_rules` 六档均为 1：读策略对所有身份开放，属设计口径。

### 4.4 WITH CHECK 与写收口（L4/L6）

| 场景 | 结果 |
|---|---|
| A 写本租户 `core_flow_rules` | 成功 |
| A 写 B 租户 `core_flow_rules` | `ERROR: new row violates row-level security policy for table "core_flow_rules"`（SQLSTATE 42501） |
| A 写 `alert_rules` | `ERROR: new row violates row-level security policy for table "alert_rules"` |
| 系统通道写 `alert_rules` | 成功 |

> 克隆库的 `topems_prod` 在原表上只有 SELECT；为完成 WITH CHECK 测试临时授予 INSERT/UPDATE/DELETE，演练后已 `REVOKE` 复原。属克隆库授权差异，非迁移内容。

## 5. 与平台语料迁移一起跑的相互影响结论

演练顺序：**platform down → platform up（归一）→ strict up → 六档 → strict down**。

| 检查点 | 结论 |
|---|---|
| 断言互斥性 | 平台语料迁移只操作 `public.core_dict_types` / `core_dict_items` / `ai.ai_prompt_templates` / `ai.ai_models`；严格迁移只操作 11 张 flow/monitor/search/alert 表，**无交集**，前置断言互不依赖。 |
| 会话 GUC | 两个迁移都在会话级 `set_config(..., false)` 走系统通道；各自独立 psql 会话，进程退出即失效，不会污染后续连接。 |
| 数据影响 | strict up/down 前后，平台语料全零行数保持 `77 / 397 / 3 / 4`、NULL 行保持 0；strict 不触碰字典/AI 表。 |
| 回滚交叉 | strict down 只恢复策略形态，不恢复平台语料数据；platform down 只将全零还原为 NULL，不触碰 flow/monitor 表。两者可独立回滚，**无先后依赖**（同窗口内建议按「先 strict、后 platform」回退，与执行顺序相反）。 |
| 结论 | **两者可同窗口执行，互不冲突**；已有平台语料的克隆演练结论可复述为「481 行归一 + 0.02 s，严格迁移 0.04 s，交叉后行数不变」。 |

## 6. 与生产现状的偏差（必须带入窗口决策）

2026-11-17 对生产 `topems_prod` 只读核查发现：**生产与克隆库在段 B 的五张表上形态不同**。

| 表 | 克隆库（演练时） | 生产（实测） |
|---|---|---|
| `core_workflows` / `core_workflow_versions` / `core_workflow_instances` / `core_workflow_tasks` / `monitor_settings` | 宽松文本（含 `IS NULL` + 全零分支） | **已是严格 B 范式**（`rls_system='on' OR tenant_id = NULLIF(...)`，无宽松分支） |

- 原因：生产已于 2026-11-16 应用 M-2 batch06（`public` 54 条策略收口），上述五表在其中；克隆库 `m2_dryrun_20261116` 未应用该批，仍停留在旧形态。
- 直接影响：严格迁移 §2.4 前置断言要求这五表「必须是宽松文本」，在生产会 **`RAISE EXCEPTION` 中止整笔迁移**（安全失败，无部分落地）。
- 其余段与生产一致：flow 四表 `rls=f/0 策略`、`search_logs rls=f/0 策略`、`alerts`/`alert_rules` 仍为 allow_all 单策略；平台语料 481 行 NULL、全零 0 行；账本 `max=20261116180000`（699 条），两条新迁移均未登记。
- 处置建议：**窗口前先拍板**——推荐新增一条前向补丁迁移（对段 B 做「已严格则校验、未严格则收紧」的幂等处理，A/C/D/E 照原样），保留既有迁移文件不动；在补丁合入并重跑克隆演练前，本迁移不具备生产可执行性。详见窗口清单 §0。

## 7. 复现命令

```bash
cd /Users/xingzhai/topems

# 平台语料 down / up（计时）
/usr/bin/time -p psql -d m2_dryrun_20261116 -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql
/usr/bin/time -p psql -d m2_dryrun_20261116 -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117120000_platform_corpus_null_to_nil.sql

# 严格迁移 up / down（计时）
/usr/bin/time -p psql -d m2_dryrun_20261116 -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117180000_unified_core_rls_strict.sql
/usr/bin/time -p psql -d m2_dryrun_20261116 -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117180000_unified_core_rls_strict.rollback.sql

# 六档矩阵（fixture 需先就位；模板见 /private/tmp/uc_six_levels.sql）
psql -d m2_dryrun_20261116 -X -q -f /private/tmp/uc_six_levels.sql | grep -E '^L[0-9]'
```
