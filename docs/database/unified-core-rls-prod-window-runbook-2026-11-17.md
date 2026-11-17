# 生产窗口执行清单：统一核心 RLS 收紧 + 平台语料归一（2026-11-17）

> 性质：**只出材料，不执行**。生产 DDL 与生产数据须经确认后按本清单执行；克隆库演练不受本清单约束。
> 配套记录：[阶段二正式读数](./unified-core-rls-stage2-record-2026-11-17.md)；决策依据：[unified-core-rls-decisions-2026-11-17.md](./unified-core-rls-decisions-2026-11-17.md)。
> 目标库：`topems_prod`（本机 127.0.0.1:5432）；服务：`com.topems.server`，端口 **8099**。

## 0. 原阻塞项（已解除，2026-11-17）

**原阻塞**：生产已于 2026-11-16 应用 M-2 batch06，`core_workflows` / `core_workflow_versions` / `core_workflow_instances` / `core_workflow_tasks` / `monitor_settings` **已是严格 B 范式**；`20261117180000` 的前置断言 §2.4 要求这五表「仍是宽松文本」，不满足即 `RAISE EXCEPTION` 整笔回滚。

**处理（原选项 A，已落地）**：新增前向补丁 `database/migrations/20261117220000_unified_core_rls_strict_prod.sql`（提交 `da6c99228`，manifest 已登记）：段 A/C/D/E 与原迁移一致；段 B 允许「宽松」或「已严格」两种输入，统一归一为 `USING` + `WITH CHECK` 全显式的严格 B 范式。

**执行口径**：

- 生产：用**前向补丁**替代 `20261117180000`。
- `20261117180000` 仍保留给非生产库（克隆/测试），**二者互斥**，不得在同一库先后执行（补丁后段 B 已严格，原迁移 §2.4 仍会中止）。
- 克隆库（已切生产形态）up/down 往返演练通过，见 manifest `20261117220000` 的 `rehearsal` 证据。

## 1. 变更清单与执行顺序

发布包共 **6 条迁移**（下表 #1–#6）；生产实际执行 **5 条**（#2 由 #3 替代，二者互斥）。另有 1 个新二进制。

| 顺序 | 对象 | 生产执行 | 说明 |
|---:|---|---|---|
| 1 | `database/migrations/20261117120000_platform_corpus_null_to_nil.sql` | 是 | 平台语料 NULL → 全零 UUID，481 行（77/397/3/4）；**未改**，沿用既有 |
| 2 | `database/migrations/20261117180000_unified_core_rls_strict.sql` | **否**（由 #3 替代） | 11 张表 RLS 收紧/补齐；保留给非生产库；与 #3 互斥，见 §0 |
| 3 | `database/migrations/20261117220000_unified_core_rls_strict_prod.sql` | 是 | 生产前向补丁，段 B 幂等（宽松/已严格两种输入），其余段与 #2 逐字一致 |
| 4 | `database/migrations/20261117233000_master_data_schema_registry_rls.sql` | 是 | `public.schema_registry` / `public.dynamic_data` 补 `tenant_id NOT NULL` + 严格 B 范式 RLS；`name` 唯一键改租户内唯一 |
| 5 | `database/migrations/20261117234000_legacy_permissive_rls_to_strict.sql` | 是 | 三张历史宽松策略表收紧：`public.core_files` / `bi.analytics_datasets` / `master_data.mdm_metadata_objects`；NULL 租户归一全零平台租户，重建唯一严格 `rls_tenant_isolation` |
| 6 | `database/migrations/20261117235500_engagement_rls_strict.sql` | 是 | engagement 两表补 RLS：`flow.core_comments` / `flow.core_favorites`；此前 `rls=false` 且无策略，现重建唯一严格 `rls_tenant_isolation` |
| — | 新二进制 | — | 必须同时包含：平台语料读路径（`ec4aff8e8`）、阶段一 4 笔、阶段三 `43eb4726d`、master-data 批次 3e（`1669a30aa`）、engagement 请求事务改造 |

> 口径核对：上表 6 个版本在 `database/rollback/` 均有同名 `.rollback.sql`；manifest 中 #2 `20261117180000` 状态为 `superseded`（生产口径，由 #3 `20261117220000` 承接，仅非生产库使用），其余 5 条为 `to_apply`。

> 平台语料迁移头部要求读路径代码同窗口上线；生产当前二进制构建于 2026-11-16 23:39，**不含** `ec4aff8e8`（2026-11-17 08:00），因此必须换新二进制，不能只跑 DDL。
> 五条待执行迁移：仅 #1 有业务 DML（481 行 UPDATE 归一）；#5 有 3 条 `WHERE tenant_id IS NULL` 的归一 UPDATE（生产三表 0 行，实际 0 行）；#3/#4/#6 纯 DDL。可放在同一停机窗口。
> #4 与 master-data 代码改造硬耦合：只上迁移会让旧池直连代码读 0 行、写入因 `tenant_id NOT NULL` 失败；因此二进制必须含 `1669a30aa`。

## 2. 前置检查（窗口前 1 天 + 窗口前 10 分钟各跑一次）

```bash
cd /Users/xingzhai/topems
psql -d topems_prod -X -A -F$'\t' -c "
-- 1) 账本：五条迁移均不应存在；max 应为 20261116180000
select 'ledger', max(version), count(*) from _sqlx_migrations;
select 'pending', version, count(*) from _sqlx_migrations
 where version in (20261117120000,20261117180000,20261117220000,20261117233000,20261117234000,20261117235500) group by version;

-- 2) 11 张目标表行数与 NULL 租户（预期全部 0）
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

-- 3) RLS 现状：段 A 四表 + search_logs 应为 f/f/0；段 B 五表应已是严格（§0 阻塞的取证）
select 'rls', c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
   and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
                     'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks',
                     'monitor_settings','alerts','search_logs','alert_rules')
 order by c.relname;

-- 4) 五表宽松分支计数（生产预期 0；若为 0，原迁移必然中止 → 走 §0 选项 A）
select 'loose', tablename from pg_policies
 where schemaname='public'
   and tablename in ('core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings')
   and (qual like '%IS NULL%' or qual like '%00000000-0000-0000-0000-000000000000%');

-- 5) 告警表仍应为 allow_all 单策略
select 'allow_all', tablename, policyname from pg_policies
 where schemaname='public' and tablename in ('alerts','alert_rules') and qual = 'true';

-- 6) 平台语料：NULL 应为 77/397/3/4，全零应为 0/0/0/0
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

-- 7) 第 5 条三表（迁移 #5 的前置：均应 0 行；NULL/全零/真实租户分布全 0）
select 'legacy_permissive',
 (select count(*) from public.core_files),
 (select count(*) from bi.analytics_datasets),
 (select count(*) from master_data.mdm_metadata_objects),
 (select count(*) from public.core_files where tenant_id is null)
   + (select count(*) from bi.analytics_datasets where tenant_id is null)
   + (select count(*) from master_data.mdm_metadata_objects where tenant_id is null) as null_rows;

-- 8) 连接与容量
select 'conn', count(*) from pg_stat_activity where datname='topems_prod';
select 'db_size', pg_size_pretty(pg_database_size('topems_prod'));

-- 9) master-data 动态 Schema 两表（迁移 #4 的前置：必须 0 行、无 tenant_id、rls=false）
select 'mdm_dynamic',
 (select count(*) from public.schema_registry) as schema_rows,
 (select count(*) from public.dynamic_data) as data_rows,
 (select count(*) from information_schema.columns
   where table_schema='public' and table_name='schema_registry' and column_name='tenant_id') as schema_has_tid,
 (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.schema_registry')) as schema_rls,
 (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.dynamic_data')) as data_rls;

-- 10) engagement 两表（迁移 #6 的前置：均应 0 行、NULL 租户 0 行、无策略、rls=false）
select 'engagement',
 (select count(*) from flow.core_comments) as comments_rows,
 (select count(*) from flow.core_favorites) as favorites_rows,
 (select count(*) from flow.core_comments where tenant_id is null)
   + (select count(*) from flow.core_favorites where tenant_id is null) as null_rows,
 (select count(*) from pg_policies where schemaname='flow' and tablename in ('core_comments','core_favorites')) as policies,
 (select relrowsecurity from pg_class where oid = 'flow.core_comments'::regclass) as comments_rls,
 (select relrowsecurity from pg_class where oid = 'flow.core_favorites'::regclass) as favorites_rls;
"
df -h /Users/xingzhai | tail -1
```

2026-11-17 实测基线（可复述）：账本 `max=20261116180000`（699 条）；11 张 flow/monitor/search/alerts 表**全部 0 行**；段 A 四表 + `search_logs` = `f/f/0`；段 B 五表**已是严格**；`alerts`/`alert_rules` 各 1 条 allow_all；平台语料 NULL `77/397/3/4`、全零 `0/0/0/0`；`schema_registry`/`dynamic_data` 均 0 行、无 `tenant_id`、`rls=false`；第 5 条三表（`core_files`/`analytics_datasets`/`mdm_metadata_objects`）均 0 行、NULL 租户 0 行；engagement 两表（`flow.core_comments`/`flow.core_favorites`）均 0 行、NULL 租户 0 行、`rls=false`、0 策略。

> 第 9 项若出现非 0 行，**不得进入窗口**：迁移 #4 的断言会中止，且历史行租户归属无法自动推断，需先另发数据迁移。
> 第 7 项若出现非 0 行：迁移 #5 仍可执行（NULL 行会被归一为全零平台租户），但须先把行数记入窗口台账，并在 §8.1 复核归一后行数不丢。
> 第 10 项若出现非 0 行：迁移 #6 的前置断言会中止（两表要求 0 行且无 NULL 租户），需先定性历史行归属。

## 3. 备份（停机前完成）

落盘目录：`/Users/xingzhai/topems/backups/`（与每日 03:00 备份同目录）。

```bash
cd /Users/xingzhai/topems
TS=$(date +%Y%m%d-%H%M)

# 1) 全库逻辑备份（自定义格式，可 pg_restore 选择性恢复）
pg_dump -Fc -d topems_prod -f "backups/unified-core-rls-pre-$TS.dump"
pg_restore -l "backups/unified-core-rls-pre-$TS.dump" | head -5
shasum -a 256 "backups/unified-core-rls-pre-$TS.dump" | tee "backups/unified-core-rls-pre-$TS.dump.sha256"

# 2) 受影响表的策略快照（回滚比对证据；含 master-data 两表与 engagement 两表）
psql -d topems_prod -X -A -F$'\t' -c "
select schemaname, tablename, policyname, cmd, permissive, roles::text, qual, with_check
  from pg_policies
 where (schemaname='public'
        and tablename in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
                          'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks',
                          'monitor_settings','alerts','search_logs','alert_rules',
                          'schema_registry','dynamic_data'))
    or (schemaname='flow' and tablename in ('core_comments','core_favorites'))
 order by schemaname, tablename, policyname;" > "backups/unified-core-rls-policies-pre-$TS.tsv"

# 3) 账本快照
psql -d topems_prod -X -A -F$'\t' -c "select version, description from _sqlx_migrations order by version;" \
  > "backups/unified-core-rls-ledger-pre-$TS.tsv"

# 4) 旧二进制备份（起服前）
cp -p bin/topems-server "/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls"
shasum -a 256 "/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls"
```

备份判据：dump 大小 > 5 MB（参考 2026-11-17 全库 10.7 MB）、`pg_restore -l` 可列出对象、sha256 落盘。**不满足不得停服。**

## 4. 新二进制准备（窗口前完成，不占停机时间）

```bash
cd /Users/xingzhai/topems
cargo build --release -p topems-server          # 预计 6–8 分钟
cargo fmt -p topems-server -- --check
python3 scripts/ci/check-txn-write-non2xx.py
cp -p target/release/topems-server bin/topems-server.new
sha256sum bin/topems-server.new
```

必须确认二进制含以下提交（缺一不可）：

| 提交 | 内容 |
|---|---|
| `ec4aff8e8` | 平台语料读路径（与 `20261117120000` 配套） |
| `e112b39e7` / `59e2d7965` / `2c914763e` / `3bb52aeb1` | 阶段一：D-01 / D-02+D-03 / TenantScope (b) / statistics 系统通道 |
| `43eb4726d` | 阶段三：flow 规则/变量/委托/监控请求事务迁移 |
| `1669a30aa` | master-data 批次 3e：`schema_registry` / `master_plugin` 请求事务 + `persist.rs` 系统通道（与 `20261117233000` 配套） |

## 5. 停服（目标停机起点）

```bash
launchctl bootout gui/$(id -u)/com.topems.server
sleep 2
launchctl print gui/$(id -u)/com.topems.server >/dev/null 2>&1 && echo "STILL LOADED" || echo "UNLOADED"
curl -s -o /dev/null -w 'health=%{http_code}\n' --max-time 3 http://127.0.0.1:8099/health   # 预期 000
psql -d topems_prod -X -A -t -c "select count(*) from pg_stat_activity where datname='topems_prod' and pid<>pg_backend_pid();"
```

连接数必须为 **0** 才继续；非 0 时等待 5 秒复查，仍非 0 则取消窗口（可能有迁移/批处理在运行）。

## 6. 执行迁移（单事务、遇错即停）

> 本窗口实际执行 5 条（#1 平台语料、#3 严格前向补丁、#4 master-data 动态 Schema、#5 三表宽松策略收紧、#6 engagement 两表补 RLS）。
> **不要**执行 `20261117180000`：它已由 #3 替代，在本库会因 §2.4 前置断言中止（见 §0）。

```bash
cd /Users/xingzhai/topems
set -e

# 6.1 平台语料归一（#1）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117120000_platform_corpus_null_to_nil.sql

# 6.2 严格 RLS 收紧 —— 生产前向补丁（#3，替代 20261117180000）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117220000_unified_core_rls_strict_prod.sql

# 6.3 master-data 动态 Schema/数据两表补租户列 + 严格 RLS（#4）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117233000_master_data_schema_registry_rls.sql

# 6.4 三张历史宽松策略表收紧（#5；含 3 条归一 UPDATE，ticket PLATFORM-CORPUS-20261117）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117234000_legacy_permissive_rls_to_strict.sql

# 6.5 engagement 两张表补 RLS（#6；纯 DDL，前置断言要求两表 0 行）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117235500_engagement_rls_strict.sql

# 6.6 手工记账（scripts/migrate.sh 口径：sha384 48 字节、execution_time=0）
#     checksum 直接取真实文件摘要，避免占位串残留
CS1=$(shasum -a 384 database/migrations/20261117120000_platform_corpus_null_to_nil.sql | cut -d' ' -f1)
CS3=$(shasum -a 384 database/migrations/20261117220000_unified_core_rls_strict_prod.sql | cut -d' ' -f1)
CS4=$(shasum -a 384 database/migrations/20261117233000_master_data_schema_registry_rls.sql | cut -d' ' -f1)
CS5=$(shasum -a 384 database/migrations/20261117234000_legacy_permissive_rls_to_strict.sql | cut -d' ' -f1)
CS6=$(shasum -a 384 database/migrations/20261117235500_engagement_rls_strict.sql | cut -d' ' -f1)
echo "CS1=$CS1"; echo "CS3=$CS3"; echo "CS4=$CS4"; echo "CS5=$CS5"; echo "CS6=$CS6"

psql -d topems_prod -X -v ON_ERROR_STOP=1 -v cs1="$CS1" -v cs3="$CS3" -v cs4="$CS4" -v cs5="$CS5" -v cs6="$CS6" <<'SQL'
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117120000, 'platform corpus null to nil', now(), true, decode(:'cs1', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117220000, 'unified core rls strict prod', now(), true, decode(:'cs3', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117233000, 'master data schema registry rls', now(), true, decode(:'cs4', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117234000, 'legacy permissive rls to strict', now(), true, decode(:'cs5', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117235500, 'engagement rls strict', now(), true, decode(:'cs6', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
SQL

# 6.7 记账校验：账本 checksum 必须与文件摘要逐条一致
psql -d topems_prod -X -A -F$'\t' -c "
select version, encode(checksum,'hex') from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500) order by version;"
```

> checksum 不一致会导致服务启动自检失败；6.7 的输出必须与 6.6 打印的 `CS1/CS3/CS4/CS5/CS6` 逐条相等。
> `20261117180000` 本窗口**不登记**（未执行）。若该库此前已应用过 `20261117180000`（仅限非生产），则改跑 `20261117220000` 前需先确认段 B 形态，二者互斥。
> 任何一步失败：整笔已由 `--single-transaction` 回滚；停止后续步骤，按 §9 回滚判据处理，**不要**手工补执行剩余 SQL。

## 7. 起服

```bash
cp -p bin/topems-server.new bin/topems-server
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:8099/health)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "health=$code"        # 预期 200；30 秒仍未 200 进入回滚判据
tail -80 /Users/xingzhai/Library/Logs/topems-server.err.log
```

## 8. 窗口内验收（起服后 5 分钟内）

### 8.1 数据库读数

```bash
psql -d topems_prod -X -A -t -c "
select 'ledger', version, success from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500) order by version;
select 'ledger_180000_absent', count(*) from _sqlx_migrations where version = 20261117180000;
select 'rls', c.relname, c.relrowsecurity, c.relforcerowsecurity,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates','core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings','alerts','search_logs','alert_rules','schema_registry','dynamic_data') order by 1,2;
select 'alert_rules_policies', policyname, cmd, coalesce(left(qual,40),'')
 from pg_policies where schemaname='public' and tablename='alert_rules' order by 2;
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
 (select count(*) from ai.ai_models where tenant_id='00000000-0000-0000-0000-000000000000');
"
```

预期读数：

| 项 | 预期 |
|---|---|
| 账本 | 五条（`20261117120000` / `20261117220000` / `20261117233000` / `20261117234000` / `20261117235500`）均 `success=t` |
| `20261117180000` 账本行 | `0`（本窗口未执行） |
| flow 四表 + `search_logs` | `rls=t / force=t / 1 条策略` |
| 段 B 五表（已严格） | 补丁形态：`t/t/1`，文本仍为严格 B 范式 |
| `alerts` | `t/t/1`，策略名 `rls_tenant_isolation` |
| `alert_rules` | `t/t/4`（1 读 + 3 写） |
| `schema_registry` / `dynamic_data` | `t/t/1`，策略名 `rls_tenant_isolation` |
| master-data 两表 `tenant_id` | 两列均存在且 `is_nullable='NO'` |
| master-data 索引 | `schema_registry_tenant_name_key`（UNIQUE）+ `idx_dynamic_data_tenant_schema` |
| 第 5 条三表策略 | 各 `1` 条（`rls_tenant_isolation`）；含 `tenant_id IS NULL` 的残留策略 `0` |
| 第 5 条三表 `tenant_id` | `core_files` / `analytics_datasets` / `mdm_metadata_objects` 均 `NOT NULL` |
| 第 6 条 engagement 两表 | 各 `1` 条策略（`rls_tenant_isolation`）；含 `tenant_id IS NULL` 的残留策略 `0`；`rls/force` 两表均 `t/t` |
| 残留 allow_all | `0` |
| 平台语料 | NULL `0/0/0/0`；全零 `77/397/3/4` |

### 8.2 服务读数

生产 flow 表当前 0 行，端点预期为「200 + 空列表」，不是报错：

```bash
BASE=http://127.0.0.1:8099
curl -s -o /dev/null -w 'health %{http_code}\n'      $BASE/health
curl -s -o /dev/null -w 'rules %{http_code}\n'       "$BASE/api/core/flow/rules"
curl -s -o /dev/null -w 'delegates %{http_code}\n'   "$BASE/api/core/flow/delegates"
curl -s -o /dev/null -w 'instances %{http_code}\n'   "$BASE/api/core/flow/instances"
curl -s -o /dev/null -w 'monitor %{http_code}\n'     "$BASE/api/core/flow/monitor/statistics"
curl -s -o /dev/null -w 'global-stats %{http_code}\n' "$BASE/api/core/flow/statistics"
curl -s -o /dev/null -w 'dict %{http_code}\n'        "$BASE/api/master-data/dict/dict-types"
curl -s -o /dev/null -w 'ai-models %{http_code}\n'   "$BASE/api/ai/models"
```

| 端点 | 预期 |
|---|---|
| `/health` | 200 |
| `/api/core/flow/rules`、`/delegates`、`/instances`、`/monitor/statistics` | 200；列表 0 条（生产无 flow 数据），**不得 500 / 不得 permission denied** |
| `/api/core/flow/statistics` | 200，跨租户全局数字与窗口前一致（记录窗口前基线用于逐项比对） |
| `/api/master-data/dict/dict-types` | 200，返回平台字典（验证 `ec4aff8e8` 读路径生效；若为空说明二进制未更新） |
| `/api/ai/models` | 200，返回 4 条平台模型 |

带鉴权的端点（flow 列表）需管理端令牌；若窗口内无现成令牌，以「服务日志无 `permission denied` / 无 `no rows` 异常」+ SQL 读数作为等价判据。

### 8.3 窗口前必须记录的对比基线

| 指标 | 采集时机 | 预期 |
|---|---|---|
| `/api/core/flow/statistics` 各字段 | 停服前 | 与起服后逐字段一致 |
| 全库 `pg_database_size` | 停服前 | 起服后 ±5 MB 内 |
| `pg_policies` 快照 | 停服前 | 与 §3.2 TSV 对比，仅预期策略变化 |

## 9. 回滚脚本与回滚判据

### 9.1 触发判据（任一命中即回滚）

1. 任一迁移非 0 退出（断言失败 / SQL 错误）——单事务已回滚，只需恢复服务；
2. 起服 30 秒内 `/health` 非 200；
3. `/api/master-data/dict/dict-types` 返回空/500（平台语料读路径未生效）；
4. flow 任一端点 500、`permission denied`、`no rows` 异常日志；
5. 出现跨租户可见（同一请求身份看到非本租户行）或 `alert_rules` 写入报 42501 且确属业务需要；
6. 业务方在窗口内报告字典/审批不可用。

### 9.2 回滚步骤（逆序：先 #6，再 #5，再 #4，再 #3，后 #1，最后换回二进制）

```bash
cd /Users/xingzhai/topems
set -e
launchctl bootout gui/$(id -u)/com.topems.server
sleep 2

# 1) engagement 两表回滚（#6：DROP 策略、NO FORCE/DISABLE RLS、恢复 tenant_id 可空）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117235500_engagement_rls_strict.rollback.sql

# 2) 三张历史宽松策略表回滚（#5：恢复宽松策略；NULL→全零归一不回退）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117234000_legacy_permissive_rls_to_strict.rollback.sql

# 3) master-data 动态 Schema 两表回滚（#4：删策略/索引、DROP tenant_id 列）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117233000_master_data_schema_registry_rls.rollback.sql

# 4) 严格前向补丁回滚（#3：段 B 保持严格不降级，A/C/D/E 恢复迁移前形态）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117220000_unified_core_rls_strict_prod.rollback.sql

# 5) 平台语料回滚（全零 → NULL）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql

# 6) 撤销账本登记（否则重跑会跳过）
psql -d topems_prod -X -v ON_ERROR_STOP=1 -c \
  "DELETE FROM _sqlx_migrations WHERE version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500);"

# 7) 恢复旧二进制
cp -p "/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls" bin/topems-server

# 8) 起服与验证
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist
sleep 3
curl -s -o /dev/null -w 'health %{http_code}\n' http://127.0.0.1:8099/health
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
select 'ledger', count(*) from _sqlx_migrations
 where version in (20261117120000,20261117220000,20261117233000,20261117234000,20261117235500);"
```

回滚成功判据：health=200；平台语料 NULL 恢复 `77/397/3/4`；账本五条为 0；`schema_registry`/`dynamic_data` 的 `tenant_id` 列已删除；engagement 两表恢复 `rls=f`、策略 0；`pg_policies` 与 §3.2 快照逐行一致；flow 四表恢复 `f/f/0`。

> #3 的回滚对段 B 是「保持严格、不降级」，避免把生产 M-2 batch06 的成果重新放松；A/C/D/E 恢复迁移前形态。
> `20261117180000` 不在本窗口登记，回滚无需处理；若该库此前应用过它，按该迁移自身的 rollback 处理。

## 10. 时间估算与窗口编排

| 阶段 | 预计耗时 | 是否占停机 |
|---|---:|---|
| release 构建 + 门禁 + 二进制校验 | 6–8 min | 否（窗口前） |
| 全库备份 + 策略快照 + 校验 | 20–40 s | 否（停服前） |
| bootout + 连接排空 | 5–10 s | 是 |
| 平台语料迁移（#1） | < 1 s（克隆 0.02 s） | 是 |
| 严格前向补丁（#3） | < 1 s（克隆 0.05 s） | 是 |
| master-data 动态 Schema（#4） | < 1 s（空表 DDL） | 是 |
| 三表宽松策略收紧（#5） | < 1 s（克隆实测 < 0.1 s，0 行） | 是 |
| engagement 两表补 RLS（#6） | < 1 s（克隆实测 < 0.1 s，0 行） | 是 |
| 记账 + 校验 | 5–10 s | 是 |
| 二进制替换 + bootstrap + health | 10–20 s | 是 |
| 窗口内验收（SQL + 端点） | 1–2 min（可起服后并行） | 部分 |
| **纯停机时间** | **约 60–90 秒** | — |

参考：2026-11-16 M-2 窗口实测纯停机 56 秒（单条迁移 + 二进制替换），本次多四条迁移、DDL 均 < 0.1 s，预计同量级。
建议窗口：业务低峰（22:00–24:00），预留 15 分钟处置余量。

## 11. 发布说明与遗留事项

1. `search_logs` 的 `/suggestions` 由跨租户聚合改为**本租户聚合**，需在产品/运营侧提前知会。
2. `alert_rules` 读对所有身份开放、写仅系统通道；代码侧当前仅有内存规则、无 SQL 读写，若后续新增写入方必须带 `app.rls_system='on'`。
3. 平台语料迁移要求读路径同窗口上线，禁止「只跑 DDL 不换二进制」。
4. engagement 两表（`flow.core_comments` / `flow.core_favorites`）已并入本窗口（#6）：代码改为请求事务作用域 + 显式租户谓词，写入显式绑定 `tenant_id`；只上迁移不换二进制会让旧池直连代码读 0 行、写 42501。
5. 本次不修缺陷：变量写入不校验实例归属（见 `known-gate-defects.md` K16）。
6. `20261117233000` 对 `public.schema_registry` / `public.dynamic_data` 有「必须 0 行」的硬断言；窗口前第 8 项读数非 0 即中止窗口，不做自动租户归属。
7. 发布包 6 条迁移中 `20261117180000` 不在生产执行（由 `20261117220000` 替代），实跑 5 条，台账口径已写明，避免账本/文件比对误判。
8. `20261117234000` 的 `core_files` 归一覆盖「NULL 租户 = 平台可见文件」；生产该表 0 行，归一为 0 行操作。平台可见性走全零租户作用域，不通过策略放行。
9. 拍板口径（2026-11-17）：跨租户读取只保留「平台语料」与「显式系统通道」两个入口，业务可见性一律查询层显式谓词；本窗口不会引入 `OR is_public` 之类的策略级可见性开关。详见决策文档 §6。

## 12. 后续排期（窗口完成并验收通过后，按序，代码在此期间冻结）

1. **crm 轨两处**（先结，因它污染全仓复验读数）
   - `svc/crm/src/modules/analytics.rs:1002`：`unused variable: tenant`
   - 同处测试助手 INSERT 仅 bind 3 个参数而 SQL 为 `$1..$4`，漏绑 `tenant_id`
   - 验收：全仓 `cargo check --workspace --all-targets` 回到 0 warning；相关测试全绿
2. **推池直连改造**：按 **wms → erp → scm** 顺序，每服务单独分批、单独提交；每批给出改动处数、编译与门禁结果、验证方式与读数。
