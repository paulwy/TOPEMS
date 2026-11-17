# 生产窗口执行卡：统一核心 RLS 收紧 + 平台语料归一

> 性质：**执行卡（可照着做）。本文档编写期间未执行任何生产动作**——不停服、不跑迁移、不换二进制、不重启、零写入；仅做过只读查询核对（`public.tenants` 表名、两库行数与策略读数）。
> 对应 runbook：[unified-core-rls-prod-window-runbook-2026-11-17.md](./unified-core-rls-prod-window-runbook-2026-11-17.md)。冲突时以 runbook 为准并先修卡。
> 目标库：`topems_prod`（127.0.0.1:5432）；服务：launchd `com.topems.server`，端口 **8099**。
> 时间（已确认）：`{{T0}}` = **2026-11-17 22:00（Asia/Shanghai）**；T-60 / T0 / T0+… 均相对 T0。T-60 准备段已于 2026-11-17 16:43 提前执行并留档。

## 0. 执行前提与角色

| 项 | 要求 |
|---|---|
| 授权 | 用户书面确认窗口时间与「可执行生产动作」；未确认前本卡只读 |
| 执行人 | 1 人操作 + 1 人复核（复核人逐项核对预期读数并签字） |
| 终端 | 全部命令在 `cd /Users/xingzhai/topems` 下执行 |
| 留档目录 | `backups/uc-rls-window-20261117-2200/`（第 9 节清单） |
| 总闸 | 任一「中止判据」命中 → 立即停手，按第 8 节判定「回滚到哪一格」 |
| 禁止 | 手工补跑剩余 SQL、跳过任何校验、执行 `20261117180000`、未经允许 `push`/改代码 |

## 1. 时间轴（T0 = 2026-11-17 22:00 Asia/Shanghai）

| 时点 | 动作 | 实际时刻 | 执行人 | 复核 |
|---|---|---|---|---|
| T-1440 | 窗口前 1 天：跑 §2 前置全量检查，结果留档 | 未单独跑（由 T-60 提前段覆盖） | | |
| T-60 | 本卡 §2：备份 + 快照 + 前置复检 + 二进制准备复核 | 2026-11-17 16:43 起（提前执行） | | |
| T-10 | 最终确认：前置全绿、备份 sha256 已落盘、新二进制 sha256 已记录 | 2026-11-17 21:50 | | |
| T0 | §3 停服，记录停服时刻 | 2026-11-17 22:00 | | |
| T0+1min | §4 迁移 #1 → #3 → #4 → #5 → #6 + 记账 | 2026-11-17 22:01 | | |
| T0+2min | §5 二进制替换 | 2026-11-17 22:02 | | |
| T0+3min | §6 起服 + 健康检查 | 2026-11-17 22:03 | | |
| T0+5min | §6.3 窗口内验收（SQL + 端点 + 六档抽查） | 2026-11-17 22:05 | | |
| T0+10min | §7 观察与收尾，签署执行记录 | 2026-11-17 22:10 | | |
| T0+15min | 未触发回滚 → 窗口关闭；触发 → 走 §8 | 2026-11-17 22:15 | | |

预计纯停机 60–90 秒，预留 15 分钟处置余量；建议业务低峰（22:00–24:00）。

## 2. T-60 前置检查（任一不符即中止，不进窗口）

### 2.1 建留档目录与时间戳

```bash
cd /Users/xingzhai/topems
TS=20261117-2200                       # 窗口标识（T0 = 2026-11-17 22:00）
ARCH="backups/uc-rls-window-$TS"
mkdir -p "$ARCH"
date '+%Y-%m-%d %H:%M:%S %Z' | tee "$ARCH/window-start.txt"
```

### 2.2 全库备份 + sha256（缺一不得停服）

```bash
pg_dump -Fc -d topems_prod -f "$ARCH/topems_prod-pre.dump"
pg_restore -l "$ARCH/topems_prod-pre.dump" | head -5 | tee "$ARCH/pg_restore-list.txt"
shasum -a 256 "$ARCH/topems_prod-pre.dump" | tee "$ARCH/topems_prod-pre.dump.sha256"
ls -lh "$ARCH/topems_prod-pre.dump"
```

判据（全满足才继续）：

| 项 | 预期 |
|---|---|
| dump 大小 | **> 5 MB**（2026-11-17 参考 10.7 MB） |
| `pg_restore -l` | 能列出对象（非空、无报错） |
| sha256 | 已写入 `*.sha256` 并回读一致 |
| 磁盘余量 | `df -h /Users/xingzhai` 可用 > dump 大小 × 3 |

### 2.3 策略快照与账本快照

```bash
psql -d topems_prod -X -A -F$'\t' -c "
select schemaname, tablename, policyname, cmd, permissive, roles::text, qual, with_check
  from pg_policies
 where (schemaname='public'
        and tablename in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
                          'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks',
                          'monitor_settings','alerts','search_logs','alert_rules',
                          'schema_registry','dynamic_data'))
    or (schemaname='flow' and tablename in ('core_comments','core_favorites'))
 order by schemaname, tablename, policyname;" > "$ARCH/policies-pre.tsv"

psql -d topems_prod -X -A -F$'\t' -c \
  "select version, description from _sqlx_migrations order by version;" > "$ARCH/ledger-pre.tsv"

wc -l "$ARCH/policies-pre.tsv" "$ARCH/ledger-pre.tsv"
```

### 2.4 账本与待应用清单

```bash
psql -d topems_prod -X -A -F$'\t' -c "
select 'ledger', max(version), count(*) from _sqlx_migrations;
select 'pending', version, count(*) from _sqlx_migrations
 where version in (20261117120000,20261117180000,20261117220000,20261117233000,20261117234000,20261117235500)
 group by version;" | tee "$ARCH/ledger-pre-check.txt"
```

预期：`max=20261116180000`；`count=699`；六条 pending **全部 0 行**（`20261117180000` 也不得已存在）。

### 2.5 二进制与代码提交

```bash
shasum -a 256 bin/topems-server | tee "$ARCH/old-binary.sha256"
shasum -a 256 bin/topems-server.new | tee "$ARCH/new-binary.sha256"
ls -lh bin/topems-server bin/topems-server.new
# 新二进制必须包含（缺一不可）
git merge-base --is-ancestor ec4aff8e8 HEAD && echo ec4aff8e8-ok
git merge-base --is-ancestor e112b39e7 HEAD && echo e112b39e7-ok
git merge-base --is-ancestor 59e2d7965 HEAD && echo 59e2d7965-ok
git merge-base --is-ancestor 2c914763e HEAD && echo 2c914763e-ok
git merge-base --is-ancestor 3bb52aeb1 HEAD && echo 3bb52aeb1-ok
git merge-base --is-ancestor 43eb4726d HEAD && echo 43eb4726d-ok
git merge-base --is-ancestor 1669a30aa HEAD && echo 1669a30aa-ok
git status --short    # 必须为空（生产不基于脏树构建）
```

> 构建与门禁（窗口前完成，不占停机）：`cargo build --release -p topems-server`（6–8 min）→ `cargo fmt -p topems-server -- --check` → `python3 scripts/ci/check-txn-write-non2xx.py` → `cp -p target/release/topems-server bin/topems-server.new`。
> 注意：当前 PATH 必须优先 `$HOME/.cargo/bin`，否则 Homebrew rustc 1.95 会覆盖 nightly。

### 2.6 runbook §2 全部前置项（逐项核对）

```bash
psql -d topems_prod -X -A -F$'\t' -c "
select 'rows', 'core_flow_rules', count(*), count(*) filter (where tenant_id is null) from public.core_flow_rules
union all select 'rows','core_flow_variables', count(*), count(*) filter (where tenant_id is null) from public.core_flow_variables
union all select 'rows','core_flow_variable_history', count(*), count(*) filter (where tenant_id is null) from public.core_flow_variable_history
union all select 'rows','core_flow_delegates', count(*), count(*) filter (where tenant_id is null) from public.core_flow_delegates
union all select 'rows','core_workflows', count(*), count(*) filter (where tenant_id is null) from public.core_workflows
union all select 'rows','core_workflow_versions', count(*), count(*) filter (where tenant_id is null) from public.core_workflow_versions
union all select 'rows','core_workflow_instances', count(*), count(*) filter (where tenant_id is null) from public.core_workflow_instances
union all select 'rows','core_workflow_tasks', count(*), count(*) filter (where tenant_id is null) from public.core_workflow_tasks
union all select 'rows','monitor_settings', count(*), count(*) filter (where tenant_id is null) from public.monitor_settings
union all select 'rows','alerts', count(*), count(*) filter (where tenant_id is null) from public.alerts
union all select 'rows','search_logs', count(*), count(*) filter (where tenant_id is null) from public.search_logs
union all select 'rows','alert_rules', count(*), null from public.alert_rules;

select 'rls', c.relname, c.relrowsecurity, c.relforcerowsecurity,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
   'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings','alerts','search_logs','alert_rules')
 order by c.relname;

select 'loose', tablename from pg_policies
 where schemaname='public'
   and tablename in ('core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings')
   and (qual like '%IS NULL%' or qual like '%00000000-0000-0000-0000-000000000000%');

select 'platform_null',
 (select count(*) from public.core_dict_types where tenant_id is null),
 (select count(*) from public.core_dict_items where tenant_id is null),
 (select count(*) from ai.ai_prompt_templates where tenant_id is null),
 (select count(*) from ai.ai_models where tenant_id is null);
select 'platform_zero',
 (select count(*) from public.core_dict_types where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from public.core_dict_items where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_prompt_templates where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_models where tenant_id='00000000-0000-0000-0000-000000000000');

select 'legacy_permissive',
 (select count(*) from public.core_files),
 (select count(*) from bi.analytics_datasets),
 (select count(*) from master_data.mdm_metadata_objects),
 (select count(*) from public.core_files where tenant_id is null)
   + (select count(*) from bi.analytics_datasets where tenant_id is null)
   + (select count(*) from master_data.mdm_metadata_objects where tenant_id is null);

select 'mdm_dynamic',
 (select count(*) from public.schema_registry),
 (select count(*) from public.dynamic_data),
 (select count(*) from information_schema.columns where table_schema='public' and table_name='schema_registry' and column_name='tenant_id'),
 (select relrowsecurity from pg_class where oid='public.schema_registry'::regclass),
 (select relrowsecurity from pg_class where oid='public.dynamic_data'::regclass);

select 'engagement',
 (select count(*) from flow.core_comments),
 (select count(*) from flow.core_favorites),
 (select count(*) from flow.core_comments where tenant_id is null)
   + (select count(*) from flow.core_favorites where tenant_id is null),
 (select count(*) from pg_policies where schemaname='flow' and tablename in ('core_comments','core_favorites')),
 (select relrowsecurity from pg_class where oid='flow.core_comments'::regclass),
 (select relrowsecurity from pg_class where oid='flow.core_favorites'::regclass);

select 'conn', count(*) from pg_stat_activity where datname='topems_prod';
select 'db_size', pg_size_pretty(pg_database_size('topems_prod'));" | tee "$ARCH/precheck.txt"
```

逐项预期（**任一不符即中止**）：

| # | 项 | 预期 |
|---|---|---|
| 1 | 账本 max / 总数 | `20261116180000` / `699` |
| 2 | 11 张 flow/monitor/search/alerts 表 | 全部 **0 行**、NULL 租户 0 |
| 3 | 段 A 四表 + `search_logs` | `rls=f / force=f / 0 策略` |
| 4 | 段 B 五表 | **已是严格**：`t/t/1`，`loose` 查询 0 行 |
| 5 | `alerts` / `alert_rules` | 各 1 条 `allow_all`（`qual='true'`） |
| 6 | 平台语料 NULL | **77 / 397 / 3 / 4** |
| 7 | 平台语料全零 | **0 / 0 / 0 / 0** |
| 8 | 第 5 条三表 | 各 0 行、NULL 合计 0 |
| 9 | `schema_registry` / `dynamic_data` | 各 **0 行**、无 `tenant_id` 列、`rls=false` |
| 10 | engagement 两表 | 各 **0 行**、NULL 合计 **0**、策略 **0**、`rls=false` |
| 11 | 连接数 | 记录基线（窗口要求停服后为 0） |
| 12 | 库大小 | 记录基线（起服后 ±5 MB 内） |

### 2.7 T-60 中止判据

- dump 大小 ≤ 5 MB 或 `pg_restore -l` 报错；
- §2.4 六条 pending 任一已存在；
- §2.6 第 1–10 项任一与预期不符（尤其 engagement 两表非 0 行 / NULL 非 0 / 已有策略 / `rls=true`；`schema_registry` 两表非 0 行；平台语料 NULL 非 77/397/3/4）；
- 新二进制 sha256 缺失、`git status` 非空、提交清单缺项；
- 磁盘余量不足。

命中任一项：**不进窗口**，记录原因，回报用户。

## 3. T0 停服

```bash
cd /Users/xingzhai/topems
date '+%Y-%m-%d %H:%M:%S %Z' | tee -a "$ARCH/window-log.txt"   # 记录停服时刻
launchctl bootout gui/$(id -u)/com.topems.server
sleep 2
launchctl print gui/$(id -u)/com.topems.server >/dev/null 2>&1 && echo "STILL LOADED" || echo "UNLOADED"
curl -s -o /dev/null -w 'health=%{http_code}\n' --max-time 3 http://127.0.0.1:8099/health
psql -d topems_prod -X -A -t -c \
  "select count(*) from pg_stat_activity where datname='topems_prod' and pid<>pg_backend_pid();" | tee "$ARCH/conn-after-stop.txt"
lsof -nP -iTCP:8099 -sTCP:LISTEN | tee "$ARCH/port-8099.txt" || echo "8099 已释放"
```

全部满足才继续：

| 项 | 预期 |
|---|---|
| launchd | `UNLOADED`（不再 loaded） |
| health | `000` |
| 数据库连接 | `0`（非 0 等 5 秒复查；仍非 0 → 取消窗口） |
| 8099 监听 | 无进程监听 |

## 4. 迁移逐条（T0+1min）

统一约束：每条都带 `--single-transaction` 与 `ON_ERROR_STOP=1`；**任一条非 0 退出 → 停手，按第 8 节判「格」**；不要手工补跑。

### 4.0 被跳过的 #2（先确认不执行）

| 项 | 内容 |
|---|---|
| 版本 | `20261117180000_unified_core_rls_strict.sql` |
| 状态 | manifest `superseded`（生产口径） |
| 原因 | 生产段 B 五表已由 M-2 batch06 收紧为严格 B 范式；该迁移 §2.4 前置断言要求五表仍是宽松文本，运行即 `RAISE EXCEPTION` 整笔回滚 |
| 替代 | `20261117220000_unified_core_rls_strict_prod.sql`（#3），二者互斥 |
| 不执行确认 | 窗口内不得出现该文件命令；记账后校验 `select count(*) from _sqlx_migrations where version=20261117180000` = **0** |

### 4.1 #1 平台语料归一

```bash
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117120000_platform_corpus_null_to_nil.sql 2>&1 | tee "$ARCH/step-1.log"
```

| 项 | 预期 |
|---|---|
| 耗时 | < 1 s（克隆 0.02 s） |
| DML | `UPDATE 77` / `397` / `3` / `4`，合计 **481** |
| 立即校验 | 平台语料 NULL `0/0/0/0`；全零 `77/397/3/4`；四表各 `1` 条严格策略、`t/t` |

```bash
psql -d topems_prod -X -A -t -c "
select 'platform_after_1',
 (select count(*) from public.core_dict_types where tenant_id is null),
 (select count(*) from public.core_dict_items where tenant_id is null),
 (select count(*) from ai.ai_prompt_templates where tenant_id is null),
 (select count(*) from ai.ai_models where tenant_id is null),
 (select count(*) from public.core_dict_types where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from public.core_dict_items where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_prompt_templates where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_models where tenant_id='00000000-0000-0000-0000-000000000000');" | tee "$ARCH/step-1-check.txt"
```

### 4.2 #3 严格 RLS 前向补丁（替代 #2）

```bash
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117220000_unified_core_rls_strict_prod.sql 2>&1 | tee "$ARCH/step-3.log"
```

| 项 | 预期 |
|---|---|
| 耗时 | < 1 s（克隆 0.05 s） |
| 立即校验 | flow 四表 + `search_logs`：`t/t/1`；段 B 五表：`t/t/1` 且策略文本仍严格（无 `IS NULL`、无全零放行）；`alerts` `t/t/1`；`alert_rules` `t/t/4`；残留 `public_allow_all%` = 0 |

```bash
psql -d topems_prod -X -A -F$'\t' -c "
select c.relname, c.relrowsecurity, c.relforcerowsecurity,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as pol,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname
    and (p.qual like '%IS NULL%' or p.qual like '%00000000-0000-0000-0000-000000000000%')) as loose
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
   'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings','alerts','search_logs','alert_rules')
 order by c.relname;
select 'allow_all_left', count(*) from pg_policies where schemaname='public' and policyname like 'public_allow_all%';" | tee "$ARCH/step-3-check.txt"
```

### 4.3 #4 master-data 动态 Schema 两表

```bash
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117233000_master_data_schema_registry_rls.sql 2>&1 | tee "$ARCH/step-4.log"
```

| 项 | 预期 |
|---|---|
| 耗时 | < 1 s（空表 DDL） |
| 前置硬断言 | 两表 0 行（否则本步自动中止） |
| 立即校验 | 两表 `tenant_id` 存在且 `NOT NULL`；各 `1` 条 `rls_tenant_isolation`、`t/t`；行数仍 0 |

```bash
psql -d topems_prod -X -A -t -c "
select 'mdm_dynamic_after_4',
 (select count(*) from public.schema_registry), (select count(*) from public.dynamic_data),
 (select count(*) from information_schema.columns where table_schema='public' and table_name='schema_registry' and column_name='tenant_id' and is_nullable='NO'),
 (select count(*) from information_schema.columns where table_schema='public' and table_name='dynamic_data' and column_name='tenant_id' and is_nullable='NO'),
 (select count(*) from pg_policies where schemaname='public' and tablename in ('schema_registry','dynamic_data'));" | tee "$ARCH/step-4-check.txt"
```

### 4.4 #5 三张历史宽松策略表收紧

```bash
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117234000_legacy_permissive_rls_to_strict.sql 2>&1 | tee "$ARCH/step-5.log"
```

| 项 | 预期 |
|---|---|
| 耗时 | < 1 s（0 行） |
| DML | 3 条归一 `UPDATE 0`（生产三表 0 行） |
| 立即校验 | 三表各 `1` 条 `rls_tenant_isolation`、`t/t`；含 `tenant_id IS NULL` 的残留策略 **0**；三表 `tenant_id NOT NULL`；索引 `idx_mdm_metadata_objects_tenant_id` 存在 |

```bash
psql -d topems_prod -X -A -t -c "
select 'legacy_after_5',
 (select count(*) from pg_policies where schemaname='public' and tablename='core_files'),
 (select count(*) from pg_policies where schemaname='bi' and tablename='analytics_datasets'),
 (select count(*) from pg_policies where schemaname='master_data' and tablename='mdm_metadata_objects'),
 (select count(*) from pg_policies where (schemaname,tablename) in (('public','core_files'),('bi','analytics_datasets'),('master_data','mdm_metadata_objects')) and qual like '%tenant_id IS NULL%'),
 (select count(*) from information_schema.columns where (table_schema,table_name,column_name) in (('public','core_files','tenant_id'),('bi','analytics_datasets','tenant_id'),('master_data','mdm_metadata_objects','tenant_id')) and is_nullable='NO'),
 (select count(*) from pg_indexes where indexname='idx_mdm_metadata_objects_tenant_id');" | tee "$ARCH/step-5-check.txt"
```

### 4.5 #6 engagement 两表补 RLS

```bash
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117235500_engagement_rls_strict.sql 2>&1 | tee "$ARCH/step-6.log"
```

| 项 | 预期 |
|---|---|
| 耗时 | < 1 s（0 行） |
| 前置硬断言 | 两表 0 行、NULL 0 |
| 立即校验 | 两表各 `1` 条 `rls_tenant_isolation`；`t/t`；含 `IS NULL` 的残留策略 0；行数仍 0 |

```bash
psql -d topems_prod -X -A -t -c "
select 'engagement_after_6',
 (select count(*) from flow.core_comments), (select count(*) from flow.core_favorites),
 (select count(*) from pg_policies where schemaname='flow' and tablename='core_comments'),
 (select count(*) from pg_policies where schemaname='flow' and tablename='core_favorites'),
 (select count(*) from pg_policies where schemaname='flow' and tablename in ('core_comments','core_favorites') and qual like '%tenant_id IS NULL%'),
 (select count(*) from pg_class where oid in ('flow.core_comments'::regclass,'flow.core_favorites'::regclass) and relrowsecurity and relforcerowsecurity);" | tee "$ARCH/step-6-check.txt"
```

### 4.6 记账与校验

```bash
CS1=$(shasum -a 384 database/migrations/20261117120000_platform_corpus_null_to_nil.sql | cut -d' ' -f1)
CS3=$(shasum -a 384 database/migrations/20261117220000_unified_core_rls_strict_prod.sql | cut -d' ' -f1)
CS4=$(shasum -a 384 database/migrations/20261117233000_master_data_schema_registry_rls.sql | cut -d' ' -f1)
CS5=$(shasum -a 384 database/migrations/20261117234000_legacy_permissive_rls_to_strict.sql | cut -d' ' -f1)
CS6=$(shasum -a 384 database/migrations/20261117235500_engagement_rls_strict.sql | cut -d' ' -f1)
echo "CS1=$CS1 CS3=$CS3 CS4=$CS4 CS5=$CS5 CS6=$CS6" | tee "$ARCH/checksums.txt"

psql -d topems_prod -X -v ON_ERROR_STOP=1 -v cs1="$CS1" -v cs3="$CS3" -v cs4="$CS4" -v cs5="$CS5" -v cs6="$CS6" <<'SQL'
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117120000, 'platform corpus null to nil', now(), true, decode(:'cs1', 'hex'), 0) ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117220000, 'unified core rls strict prod', now(), true, decode(:'cs3', 'hex'), 0) ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117233000, 'master data schema registry rls', now(), true, decode(:'cs4', 'hex'), 0) ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117234000, 'legacy permissive rls to strict', now(), true, decode(:'cs5', 'hex'), 0) ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117235500, 'engagement rls strict', now(), true, decode(:'cs6', 'hex'), 0) ON CONFLICT (version) DO NOTHING;
SQL

psql -d topems_prod -X -A -F$'\t' -c "
select version, encode(checksum,'hex'), success from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500) order by version;
select 'ledger_180000_absent', count(*) from _sqlx_migrations where version=20261117180000;" | tee "$ARCH/ledger-post.txt"
```

判据：5 行 `success=t`，checksum 与 `checksums.txt` 逐条相等；`20261117180000` 计数 **0**。

## 5. 二进制替换（T0+2min）

```bash
cp -p bin/topems-server.new bin/topems-server
shasum -a 256 bin/topems-server | tee "$ARCH/installed-binary.sha256"
diff <(cut -d' ' -f1 "$ARCH/new-binary.sha256") <(cut -d' ' -f1 "$ARCH/installed-binary.sha256") && echo "BINARY_SHA_MATCH"
ls -l bin/topems-server
```

| 项 | 预期 |
|---|---|
| 旧二进制留档 | `/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls`（§2.6 之前已 `cp -p`） |
| 新二进制 | sha256 与 `bin/topems-server.new` 一致 |
| 回读 | `BINARY_SHA_MATCH`，mtime 为替换时刻 |

若 sha 不一致：立即 `cp -p` 回旧二进制，按第 8 节「格 5」处置，不启动新二进制。

## 6. 起服与验收（T0+3min–T0+5min）

### 6.1 起服与健康检查

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:8099/health)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "health=$code" | tee "$ARCH/health.txt"
tail -80 /Users/xingzhai/Library/Logs/topems-server.err.log | tee "$ARCH/server-start.log"
```

30 秒内非 200 → 第 8 节「格 6」。

### 6.2 §8.1 数据库验收（全部项）

```bash
psql -d topems_prod -X -A -t -c "
select 'ledger', version, success from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500) order by version;
select 'ledger_180000_absent', count(*) from _sqlx_migrations where version = 20261117180000;
select 'rls', c.relname, c.relrowsecurity, c.relforcerowsecurity,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates','core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings','alerts','search_logs','alert_rules','schema_registry','dynamic_data') order by 1,2;
select 'alert_rules_policies', policyname, cmd from pg_policies where schemaname='public' and tablename='alert_rules' order by 2;
select 'allow_all_left', count(*) from pg_policies where schemaname='public' and policyname like 'public_allow_all%';
select 'mdm_dynamic_tid',
 (select count(*) from information_schema.columns where table_schema='public' and table_name='schema_registry' and column_name='tenant_id' and is_nullable='NO'),
 (select count(*) from information_schema.columns where table_schema='public' and table_name='dynamic_data' and column_name='tenant_id' and is_nullable='NO');
select 'mdm_dynamic_idx', indexname from pg_indexes where schemaname='public' and tablename in ('schema_registry','dynamic_data') order by 2;
select 'legacy_strict',
 (select count(*) from pg_policies where schemaname='public' and tablename='core_files'),
 (select count(*) from pg_policies where schemaname='bi' and tablename='analytics_datasets'),
 (select count(*) from pg_policies where schemaname='master_data' and tablename='mdm_metadata_objects'),
 (select count(*) from pg_policies where (schemaname,tablename) in (('public','core_files'),('bi','analytics_datasets'),('master_data','mdm_metadata_objects')) and qual like '%tenant_id IS NULL%');
select 'legacy_tid_notnull',
 (select count(*) from information_schema.columns where table_schema='master_data' and table_name='mdm_metadata_objects' and column_name='tenant_id' and is_nullable='NO'),
 (select count(*) from information_schema.columns where table_schema='bi' and table_name='analytics_datasets' and column_name='tenant_id' and is_nullable='NO');
select 'engagement_strict',
 (select count(*) from pg_policies where schemaname='flow' and tablename='core_comments'),
 (select count(*) from pg_policies where schemaname='flow' and tablename='core_favorites'),
 (select count(*) from pg_policies where schemaname='flow' and tablename in ('core_comments','core_favorites') and qual like '%tenant_id IS NULL%'),
 (select count(*) from pg_class where oid in ('flow.core_comments'::regclass,'flow.core_favorites'::regclass) and relrowsecurity and relforcerowsecurity);
select 'platform', (select count(*) from public.core_dict_types where tenant_id is null),
 (select count(*) from public.core_dict_items where tenant_id is null),
 (select count(*) from ai.ai_prompt_templates where tenant_id is null),
 (select count(*) from ai.ai_models where tenant_id is null),
 (select count(*) from public.core_dict_types where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from public.core_dict_items where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_prompt_templates where tenant_id='00000000-0000-0000-0000-000000000000'),
 (select count(*) from ai.ai_models where tenant_id='00000000-0000-0000-0000-000000000000');" | tee "$ARCH/acceptance-sql.txt"
```

验收表（逐行签字）：

| 项 | 预期 |
|---|---|
| 账本 | 5 条均 `success=t`；`20261117180000` = 0 |
| flow 四表 + `search_logs` | `t/t/1` |
| 段 B 五表 | `t/t/1`（严格文本） |
| `alerts` | `t/t/1`，`rls_tenant_isolation` |
| `alert_rules` | `t/t/4`（1 读 + 3 写） |
| `schema_registry` / `dynamic_data` | `t/t/1`；`tenant_id` 两列 `NOT NULL` |
| master-data 索引 | `schema_registry_tenant_name_key`（UNIQUE）+ `idx_dynamic_data_tenant_schema` |
| 第 5 条三表 | 各 `1` 条；`IS NULL` 残留 `0`；三表 `tenant_id NOT NULL`；`idx_mdm_metadata_objects_tenant_id` 存在 |
| 第 6 条 engagement | 两表各 `1` 条；`IS NULL` 残留 `0`；`rls/force` = `t/t` |
| 残留 allow_all | `0` |
| 平台语料 | NULL `0/0/0/0`；全零 `77/397/3/4` |

### 6.3 服务端点与六档抽查

```bash
BASE=http://127.0.0.1:8099
{
curl -s -o /dev/null -w 'health %{http_code}\n'        $BASE/health
curl -s -o /dev/null -w 'rules %{http_code}\n'         "$BASE/api/core/flow/rules"
curl -s -o /dev/null -w 'delegates %{http_code}\n'     "$BASE/api/core/flow/delegates"
curl -s -o /dev/null -w 'instances %{http_code}\n'     "$BASE/api/core/flow/instances"
curl -s -o /dev/null -w 'monitor %{http_code}\n'       "$BASE/api/core/flow/monitor/statistics"
curl -s -o /dev/null -w 'global-stats %{http_code}\n'  "$BASE/api/core/flow/statistics"
curl -s -o /dev/null -w 'dict %{http_code}\n'          "$BASE/api/master-data/dict/dict-types"
curl -s -o /dev/null -w 'ai-models %{http_code}\n'     "$BASE/api/ai/models"
} | tee "$ARCH/endpoints.txt"
```

预期：全部 200；flow 列表 0 条（不得 500 / permission denied）；`dict` 非空（验证 `ec4aff8e8` 生效）；`ai/models` 4 条；`global-stats` 与 §2.3 记录的停服前基线逐字段一致。

六档抽查（**只读**，必须用非超管应用角色）。租户取值（T-60 已确认）：`TENANT_A = 00000000-0000-0000-0000-000000000001`（「默认租户」，`public.core_tenants` 唯一真实租户；`public.tenants` 为空）；`TENANT_B = ffffffff-ffff-4fff-8fff-ffffffffffff`（**不存在的合成 UUID**，仅作越权对照，生产无第二真实租户）。

```bash
P="select (select count(*) from flow.core_comments)||'/'||(select count(*) from flow.core_favorites)||'/'||(select count(*) from public.core_dict_types)||'/'||(select count(*) from public.core_dict_items);"
PGOPTIONS="-c app.rls_system=off"                                       psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"   # 未设
PGOPTIONS="-c app.tenant_id='' -c app.rls_system=off"                   psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"   # 空串
PGOPTIONS="-c app.tenant_id=00000000-0000-0000-0000-000000000000 -c app.rls_system=off" psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"  # 全零
PGOPTIONS="-c app.tenant_id=00000000-0000-0000-0000-000000000001 -c app.rls_system=off" psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"  # A
PGOPTIONS="-c app.tenant_id=ffffffff-ffff-4fff-8fff-ffffffffffff -c app.rls_system=off" psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"  # B
PGOPTIONS="-c app.tenant_id=00000000-0000-0000-0000-000000000001 -c app.rls_system=on"  psql "postgres://topems_prod@localhost:5432/topems_prod" -X -A -t -c "$P"  # A+system
```

预期（comments/favorites/字典类型/字典项）：未设 `0/0/0/0`；空串 `0/0/0/0`；全零 `0/0/77/397`；A `0/0/0/0`；B `0/0/0/0`；A+system `0/0/77/397`。读数留档 `$ARCH/six-context.txt`。

## 7. 观察与收尾（T0+5min–T0+15min）

- 持续看 `topems-server.err.log` 5 分钟，无 `permission denied` / `no rows` / 500；
- 记录 `pg_database_size`（与停服前 ±5 MB 内）；
- 无异常 → 窗口关闭，填写第 10 节执行记录并签字；
- 有异常 → 按第 8 节判定回滚。

## 8. 回滚预案

### 8.1 触发条件（分阶段）

| 阶段 | 触发 | 处置 |
|---|---|---|
| T-60 | §2.7 任一中止判据 | 不进窗口，无回滚 |
| 停服后、起服前 | 任一迁移非 0 退出 | 单事务已回滚该条；按 8.2「格」回滚此前已成功条目，服务未启动可**原地**继续 |
| 迁移成功、替换二进制后 | sha 不一致 / 起服 30 s 内 health ≠ 200 | 换回旧二进制；按「格 6」回滚全部迁移 |
| 起服后 5 min 内 | `dict` 空/500；flow 端点 500 或 permission denied；跨租户可见；alert_rules 42501 且业务需要；业务方报不可用 | **先停服**（8.3），再按「格 6」回滚 |
| 起服后 > 5 min | 流量异常（错误率抬升、超时） | 先停服，按「格 6」回滚；保留现场日志 |

### 8.2 回滚到哪一格（判定标准）

| 格 | 已发生 | 回滚动作（逆序） | 账本清理 | 二进制 |
|---|---|---|---|---|
| 0 | 窗口未开始 | 无 | 无 | 不动 |
| 1 | #1 失败（已自动回滚） | 无 | 无 | 旧（未替换） |
| 2 | #1 成功、后续失败 | #1 | 删 #1 | 旧 |
| 3 | #1+#3 成功、后续失败 | #3 → #1 | 删 #3、#1 | 旧 |
| 4 | #1..#4 成功、后续失败 | #4 → #3 → #1 | 删 #4、#3、#1 | 旧 |
| 5 | #1..#5 成功、后续失败 | #5 → #4 → #3 → #1 | 删 #5、#4、#3、#1 | 旧 |
| 6 | #1..#6 成功（或起服/验收失败） | #6 → #5 → #4 → #3 → #1 | 删 5 条 | 旧 |
| 7 | 起服后异常 | 先停服 → 同「格 6」 | 同「格 6」 | 旧 |

原则：**回滚必须整段逆序，不跳格**；#3 的回滚对段 B 保持严格（不降级），只恢复 A/C/D/E。

### 8.3 回滚命令（#6 → #5 → #4 → #3 → #1）

```bash
cd /Users/xingzhai/topems
set -e
# 起服后回滚必须先停服；停服窗口内可跳过本步
launchctl bootout gui/$(id -u)/com.topems.server 2>/dev/null || true
sleep 2
echo "rollback start $(date '+%F %T')" | tee -a "$ARCH/rollback-log.txt"

psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117235500_engagement_rls_strict.rollback.sql 2>&1 | tee -a "$ARCH/rollback-log.txt"
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117234000_legacy_permissive_rls_to_strict.rollback.sql 2>&1 | tee -a "$ARCH/rollback-log.txt"
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117233000_master_data_schema_registry_rls.rollback.sql 2>&1 | tee -a "$ARCH/rollback-log.txt"
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117220000_unified_core_rls_strict_prod.rollback.sql 2>&1 | tee -a "$ARCH/rollback-log.txt"
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql 2>&1 | tee -a "$ARCH/rollback-log.txt"

psql -d topems_prod -X -v ON_ERROR_STOP=1 -c \
  "DELETE FROM _sqlx_migrations WHERE version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500);" \
  | tee -a "$ARCH/rollback-log.txt"

cp -p "/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls" bin/topems-server
shasum -a 256 bin/topems-server | tee "$ARCH/rollback-binary.sha256"
```

### 8.4 回滚后一致性核对

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist
sleep 3
curl -s -o /dev/null -w 'health %{http_code}\n' http://127.0.0.1:8099/health | tee "$ARCH/rollback-health.txt"

psql -d topems_prod -X -A -t -c "
select 'platform_restored',
 (select count(*) from public.core_dict_types where tenant_id is null),
 (select count(*) from public.core_dict_items where tenant_id is null),
 (select count(*) from ai.ai_prompt_templates where tenant_id is null),
 (select count(*) from ai.ai_models where tenant_id is null);
select 'mdm_dynamic_restored',
 (select count(*) from information_schema.columns where table_schema='public' and table_name='schema_registry' and column_name='tenant_id'),
 (select count(*) from information_schema.columns where table_schema='public' and table_name='dynamic_data' and column_name='tenant_id');
select 'engagement_restored',
 (select relrowsecurity from pg_class where oid='flow.core_comments'::regclass),
 (select relrowsecurity from pg_class where oid='flow.core_favorites'::regclass),
 (select count(*) from pg_policies where schemaname='flow' and tablename in ('core_comments','core_favorites'));
select 'ledger_left', count(*) from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500);" | tee "$ARCH/rollback-check.txt"

psql -d topems_prod -X -A -F$'\t' -c "
select schemaname, tablename, policyname, cmd, permissive, roles::text, qual, with_check
  from pg_policies
 where (schemaname='public'
        and tablename in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
                          'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks',
                          'monitor_settings','alerts','search_logs','alert_rules','schema_registry','dynamic_data'))
    or (schemaname='flow' and tablename in ('core_comments','core_favorites'))
 order by schemaname, tablename, policyname;" > "$ARCH/policies-after-rollback.tsv"
diff "$ARCH/policies-pre.tsv" "$ARCH/policies-after-rollback.tsv" | tee "$ARCH/policies-diff.txt"
```

回滚成功判据（全满足）：

| 项 | 预期 |
|---|---|
| health | 200 |
| 平台语料 | NULL 恢复 `77/397/3/4`；全零 `0/0/0/0` |
| `schema_registry` / `dynamic_data` | `tenant_id` 列已删除（各 0） |
| engagement 两表 | `rls=f`、策略 0 |
| 账本 | 5 条 = 0 |
| 策略快照 diff | 与 `policies-pre.tsv` 一致（无输出） |
| 二进制 | sha256 等于 `old-binary.sha256` |
| 库大小 | 与停服前 ±5 MB 内 |

### 8.5 原地回滚 vs 必须先停服

| 情形 | 判定 |
|---|---|
| 停服后、新二进制尚未启动 | **可原地回滚**：按 8.3 逆序执行（`set -e`，失败即停），无需再停服 |
| 新二进制已启动 | **必须先停服**：FORCE RLS / 列删除会让在线请求 42501 或读 0 行，回滚前 `bootout` 并确认连接数 0 |
| 只回滚二进制、不回滚 DB | 不允许：DB 已收紧而旧二进制走池直连，会读 0 行/写 42501 |
| 只回滚 DB、不回滚二进制 | 不允许：新二进制依赖严格策略与显式租户列，旧形态下行为不一致 |

### 8.6 数据一致性说明

- 唯一数据级回滚是 #1（全零 → NULL），生产涉及 481 行平台语料；#5 的 NULL→全零归一在生产为 0 行，回滚脚本**不回退**该归一（避免平台行失去归属），属预期。
- 窗口内若有业务写入（验收期服务在线）：新行归属真实租户，不参与平台语料归一；回滚前后核对各自表行数增量即可。
- 回滚后如仍异常：以 `$ARCH/topems_prod-pre.dump` 做全库恢复（`pg_restore --clean --if-exists`），该动作需用户二次确认，不在本卡自动执行。

## 9. 留档清单（`backups/uc-rls-window-20261117-2200/`）

| 文件 | 内容 |
|---|---|
| `topems_prod-pre.dump` + `.sha256` | 全库备份与摘要 |
| `pg_restore-list.txt` | 备份可读性证明 |
| `policies-pre.tsv` / `policies-after-rollback.tsv` / `policies-diff.txt` | 策略前后比对 |
| `ledger-pre.tsv` / `ledger-pre-check.txt` / `ledger-post.txt` | 账本前后 |
| `precheck.txt` | §2 全量前置读数 |
| `tenants-sample.txt` / `six-context.txt` | 六档抽查输入与读数 |
| `old-binary.sha256` / `new-binary.sha256` / `installed-binary.sha256` | 二进制摘要 |
| `step-1.log` … `step-6.log` + `step-*-check.txt` | 每条迁移耗时与即时校验 |
| `checksums.txt` | 五条迁移 sha384 |
| `health.txt` / `server-start.log` / `endpoints.txt` | 起服与端点 |
| `acceptance-sql.txt` | §8.1 全量验收输出 |
| `window-log.txt` / `window-start.txt` | 停服时刻与时间线 |
| `rollback-log.txt` / `rollback-check.txt` / `rollback-health.txt` / `rollback-binary.sha256` | 仅回滚时产生 |
| `execution-record.md` | 第 10 节签字版 |

保留期：dump 至少 30 天；其余随发布归档长期保留。

## 10. 执行记录（执行时填写）

| 检查点 | 预期 | 实际 | 通过 | 时刻 | 执行/复核 |
|---|---|---|---|---|---|
| T-60 备份 sha256 | 已落盘且一致 | | ☐ | | |
| T-60 前置 12 项 | 全部符合 | | ☐ | | |
| T-60 新二进制 sha256 | 已记录、提交齐全 | | ☐ | | |
| T0 停服 | UNLOADED / health 000 / 连接 0 / 端口释放 | | ☐ | | |
| #1 | 481 行归一、NULL 0 | | ☐ | | |
| #2 不执行确认 | 账本计数 0 | | ☐ | | |
| #3 | 12 表 `t/t/1`、allow_all 0 | | ☐ | | |
| #4 | 两表 NOT NULL、各 1 策略 | | ☐ | | |
| #5 | 三表各 1 策略、mdm NOT NULL、索引存在 | | ☐ | | |
| #6 | 两表各 1 策略、`t/t` | | ☐ | | |
| 记账 | 5 条 success=t、checksum 一致 | | ☐ | | |
| 二进制替换 | sha 回读一致 | | ☐ | | |
| 起服 health | 200 | | ☐ | | |
| §8.1 验收 | 全表符合 | | ☐ | | |
| 端点 + 六档 | 全 200、读数符合 | | ☐ | | |
| 窗口关闭 / 回滚 | 勾选处置 | | ☐ | | |

执行人签字：__________　复核人签字：__________　窗口关闭时刻：__________
