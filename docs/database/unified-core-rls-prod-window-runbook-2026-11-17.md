# 生产窗口执行清单：统一核心 RLS 收紧 + 平台语料归一（2026-11-17）

> 性质：**只出材料，不执行**。生产 DDL 与生产数据须经确认后按本清单执行；克隆库演练不受本清单约束。
> 配套记录：[阶段二正式读数](./unified-core-rls-stage2-record-2026-11-17.md)；决策依据：[unified-core-rls-decisions-2026-11-17.md](./unified-core-rls-decisions-2026-11-17.md)。
> 目标库：`topems_prod`（本机 127.0.0.1:5432）；服务：`com.topems.server`，端口 **8099**。

## 0. 阻塞项（窗口前必须拍板）

**生产与克隆库在段 B 的五张表上形态不同，现有迁移在生产会安全中止。**

- 生产已于 2026-11-16 应用 M-2 batch06，`core_workflows` / `core_workflow_versions` / `core_workflow_instances` / `core_workflow_tasks` / `monitor_settings` **已是严格 B 范式**（无 `IS NULL`、无全零分支）。
- `20261117180000` 的前置断言 §2.4 要求这五表「必须仍是宽松文本」，不满足即 `RAISE EXCEPTION`，整笔回滚（无部分落地）。
- 因此现有迁移**当前不具备生产可执行性**。三个选项：

| 选项 | 做法 | 评价 |
|---|---|---|
| **A（推荐）** | 新增一条前向补丁迁移（如 `20261118xxxxxx_unified_core_rls_strict_prod.sql`）：段 A/C/D/E 照原逻辑；段 B 改为「已是严格则校验一致、仍是宽松则收紧」的幂等处理；不改 `20261117180000` | 保留既有迁移与演练记录；需一次代码提交 + 从生产形态克隆重跑演练 |
| B | 窗口内先把五表策略临时还原成宽松文本，再跑原迁移 | 会在生产短暂重新引入宽松策略，且回滚证据链不干净，不建议 |
| C | 手工拆开执行 A/C/D/E，不记账 | 破坏单事务与账本一致性，禁止 |

**决策前不要进入执行阶段。** 若选 A，窗口顺延到补丁合入、克隆库（以生产形态为基线）演练通过之后。

## 1. 变更清单与执行顺序

| 顺序 | 对象 | 说明 |
|---:|---|---|
| 1 | `database/migrations/20261117120000_platform_corpus_null_to_nil.sql` | 平台语料 NULL → 全零 UUID，481 行（77/397/3/4）；**未改**，沿用既有 |
| 2 | `database/migrations/20261117180000_unified_core_rls_strict.sql` | 11 张表 RLS 收紧/补齐；受 §0 阻塞约束 |
| 3 | 新二进制 | 必须同时包含：平台语料读路径（`ec4aff8e8`）、阶段一 4 笔、阶段三 `43eb4726d` |

> 平台语料迁移头部要求读路径代码同窗口上线；生产当前二进制构建于 2026-11-16 23:39，**不含** `ec4aff8e8`（2026-11-17 08:00），因此必须换新二进制，不能只跑 DDL。
> 两条迁移均无业务 DML（平台语料为 481 行 UPDATE 归一；严格迁移纯 DDL），可放在同一停机窗口。

## 2. 前置检查（窗口前 1 天 + 窗口前 10 分钟各跑一次）

```bash
cd /Users/xingzhai/topems
psql -d topems_prod -X -A -F$'\t' -c "
-- 1) 账本：两条迁移不应存在；max 应为 20261116180000
select 'ledger', max(version), count(*) from _sqlx_migrations;
select 'pending', version, count(*) from _sqlx_migrations
 where version in (20261117120000,20261117180000) group by version;

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

-- 7) 连接与容量
select 'conn', count(*) from pg_stat_activity where datname='topems_prod';
select 'db_size', pg_size_pretty(pg_database_size('topems_prod'));
"
df -h /Users/xingzhai | tail -1
```

2026-11-17 实测基线（可复述）：账本 `max=20261116180000`（699 条）；11 张表**全部 0 行**；段 A 四表 + `search_logs` = `f/f/0`；段 B 五表**已是严格**；`alerts`/`alert_rules` 各 1 条 allow_all；平台语料 NULL `77/397/3/4`、全零 `0/0/0/0`。

## 3. 备份（停机前完成）

落盘目录：`/Users/xingzhai/topems/backups/`（与每日 03:00 备份同目录）。

```bash
cd /Users/xingzhai/topems
TS=$(date +%Y%m%d-%H%M)

# 1) 全库逻辑备份（自定义格式，可 pg_restore 选择性恢复）
pg_dump -Fc -d topems_prod -f "backups/unified-core-rls-pre-$TS.dump"
pg_restore -l "backups/unified-core-rls-pre-$TS.dump" | head -5
shasum -a 256 "backups/unified-core-rls-pre-$TS.dump" | tee "backups/unified-core-rls-pre-$TS.dump.sha256"

# 2) 受影响 11 表的策略快照（回滚比对证据）
psql -d topems_prod -X -A -F$'\t' -c "
select schemaname, tablename, policyname, cmd, permissive, roles::text, qual, with_check
  from pg_policies
 where schemaname='public'
   and tablename in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates',
                     'core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks',
                     'monitor_settings','alerts','search_logs','alert_rules')
 order by tablename, policyname;" > "backups/unified-core-rls-policies-pre-$TS.tsv"

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

```bash
cd /Users/xingzhai/topems
set -e

# 6.1 平台语料归一
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117120000_platform_corpus_null_to_nil.sql

# 6.2 严格 RLS 收紧（若走 §0 选项 A，替换为补丁迁移文件名）
/usr/bin/time -p psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/migrations/20261117180000_unified_core_rls_strict.sql

# 6.3 手工记账（scripts/migrate.sh 口径：sha384 48 字节、execution_time=0）
psql -d topems_prod -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117120000, 'platform corpus null to nil', now(), true,
        decode('30235bcd385e000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
VALUES (20261117180000, 'unified core rls strict', now(), true,
        decode('9b9ad378031c000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'), 0)
ON CONFLICT (version) DO NOTHING;
SQL

# 6.4 记账校验：checksum 必须是真实文件摘要
for f in database/migrations/20261117120000_platform_corpus_null_to_nil.sql \
         database/migrations/20261117180000_unified_core_rls_strict.sql; do
  echo "$f $(shasum -a 384 "$f" | cut -d' ' -f1)"
done
```

> 记账前必须用 `shasum -a 384` 的真实 96 位十六进制替换上面两个 `decode(...)` 占位串（本文只保留前缀便于识别）。checksum 不一致会导致服务启动自检失败。
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
select 'ledger', version, success from _sqlx_migrations where version in (20261117120000,20261117180000) order by version;
select 'rls', c.relname, c.relrowsecurity, c.relforcerowsecurity,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('core_flow_rules','core_flow_variables','core_flow_variable_history','core_flow_delegates','core_workflows','core_workflow_versions','core_workflow_instances','core_workflow_tasks','monitor_settings','alerts','search_logs','alert_rules') order by 1,2;
select 'alert_rules_policies', policyname, cmd, coalesce(left(qual,40),'')
 from pg_policies where schemaname='public' and tablename='alert_rules' order by 2;
select 'allow_all_left', count(*) from pg_policies where schemaname='public' and policyname like 'public_allow_all%';
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
| 账本 | 两条均 `success=t` |
| flow 四表 + `search_logs` | `rls=t / force=t / 1 条策略` |
| 段 B 五表（已严格） | 补丁形态：`t/t/1`，文本仍为严格 B 范式 |
| `alerts` | `t/t/1`，策略名 `rls_tenant_isolation` |
| `alert_rules` | `t/t/4`（1 读 + 3 写） |
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

### 9.2 回滚步骤（逆序：先 strict，后 platform，再换回二进制）

```bash
cd /Users/xingzhai/topems
set -e
launchctl bootout gui/$(id -u)/com.topems.server
sleep 2

# 1) 严格迁移回滚
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117180000_unified_core_rls_strict.rollback.sql

# 2) 平台语料回滚（全零 → NULL）
psql -d topems_prod -X -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql

# 3) 撤销账本登记（否则重跑会跳过）
psql -d topems_prod -X -v ON_ERROR_STOP=1 -c \
  "DELETE FROM _sqlx_migrations WHERE version in (20261117120000,20261117180000);"

# 4) 恢复旧二进制
cp -p "/Users/xingzhai/topems-backups/topems-server.bak-$TS-pre-uc-rls" bin/topems-server

# 5) 起服与验证
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.topems.server.plist
sleep 3
curl -s -o /dev/null -w 'health %{http_code}\n' http://127.0.0.1:8099/health
psql -d topems_prod -X -A -t -c "
select 'platform_restored',
 (select count(*) from public.core_dict_types where tenant_id is null),
 (select count(*) from public.core_dict_items where tenant_id is null),
 (select count(*) from ai.ai_prompt_templates where tenant_id is null),
 (select count(*) from ai.ai_models where tenant_id is null);
select 'ledger', count(*) from _sqlx_migrations where version in (20261117120000,20261117180000);"
```

回滚成功判据：health=200；平台语料 NULL 恢复 `77/397/3/4`；账本两条为 0；`pg_policies` 与 §3.2 快照逐行一致；flow 四表恢复 `f/f/0`。

> 若走 §0 选项 A（补丁迁移），回滚时改用补丁对应的 rollback 文件；如补丁对段 B 是 no-op，回滚也不应把已严格策略降级。

## 10. 时间估算与窗口编排

| 阶段 | 预计耗时 | 是否占停机 |
|---|---:|---|
| release 构建 + 门禁 + 二进制校验 | 6–8 min | 否（窗口前） |
| 全库备份 + 策略快照 + 校验 | 20–40 s | 否（停服前） |
| bootout + 连接排空 | 5–10 s | 是 |
| 平台语料迁移 | < 1 s（克隆 0.02 s） | 是 |
| 严格迁移（或补丁） | < 1 s（克隆 0.04 s） | 是 |
| 记账 + 校验 | 5–10 s | 是 |
| 二进制替换 + bootstrap + health | 10–20 s | 是 |
| 窗口内验收（SQL + 端点） | 1–2 min（可起服后并行） | 部分 |
| **纯停机时间** | **约 60–90 秒** | — |

参考：2026-11-16 M-2 窗口实测纯停机 56 秒（单条迁移 + 二进制替换），本次多一条迁移、DDL 均 < 0.1 s，预计同量级。
建议窗口：业务低峰（22:00–24:00），预留 15 分钟处置余量。

## 11. 发布说明与遗留事项

1. `search_logs` 的 `/suggestions` 由跨租户聚合改为**本租户聚合**，需在产品/运营侧提前知会。
2. `alert_rules` 读对所有身份开放、写仅系统通道；代码侧当前仅有内存规则、无 SQL 读写，若后续新增写入方必须带 `app.rls_system='on'`。
3. 平台语料迁移要求读路径同窗口上线，禁止「只跑 DDL 不换二进制」。
4. 冻结项 engagement 3 处（`core_comments` / `core_favorites`）不在本窗口范围，保持挂起。
5. 本次不修缺陷：变量写入不校验实例归属（见 `known-gate-defects.md` K16）。
