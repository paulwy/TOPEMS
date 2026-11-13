# W7-B4 EHS 窗口现场检查表（单页版）

窗口：**02:00–04:00**　执行人：xingzhai　DB：`topems_prod` @ 192.168.110.115　文档：`w7-b4-ehs-plan-2026-11-12.md` §7

**主表（1–24）就是现场照着念的一页；下面的 SQL 片段是附页，按编号取用，不重复正文。**

**身份纪律（念一遍）**：迁移**前**只读检查用**超户** `xingzhai`；迁移**执行**和**后复核**用**属主** `topems_prod`（复核 NULL 时加 `SET app.rls_system='on'`）。两者不可混用。

现场变量：

```bash
DUMP=/tmp/w7b4/topems_prod-$(date +%Y%m%d_%H%M).dump
MIG_VER=20261112190000
PREV_VER=20261112160000
```

| # | 动作 | 命令（原样） | 期望输出 | 不符怎么办 |
|---|---|---|---|---|
| 1 | 库身份 | `PGHOST=/tmp psql -U xingzhai -d topems_prod -Atc "select current_database(), inet_server_addr(), current_user"` | `topems_prod\|192.168.110.115\|xingzhai` | **停**。连错库，见附录 K.0 |
| 2 | 账本水位 | `... -Atc "select max(version) from public._sqlx_migrations"` | `20261112160000` | 停，查是否已有人跑过 |
| 3 | 形状基线 | `... -Atc "select count(*) from information_schema.tables where table_schema='ehs'; select count(*) from information_schema.columns where table_schema='ehs' and column_name='tenant_id'"` | `71` / `70` | 停 |
| 4 | RLS 基线 | 见下方 **B1** | `45 / 39 / 34 / 32 / 5` | 停 |
| 5 | 备份 | `pg_dump -h /tmp -U xingzhai -d topems_prod -Fc -f $DUMP && shasum -a 256 $DUMP \| tee $DUMP.sha256` | 文件生成、sha256 落盘 | 停 |
| 6 | 备份完整性 | `pg_restore -l $DUMP \| grep -c 'TABLE DATA ehs'` | `71` | 停，重备（`--schema-only` 不算） |
| 7 | NULL 前置断言 | 见下方 **B2**（超户） | `NOTICE ... = 0` | 停；>0 需人工裁决，禁止回填 |
| 8 | 停机 | `launchctl bootout gui/501/com.topems.server`；`lsof -nP -iTCP:8099 -sTCP:LISTEN` | 无输出（无监听） | 停，别用 kill（KeepAlive 会拉起） |
| 9 | 停机确认 | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/health` | `502` | 等 10–20s；>120s 仍 200 则排查进程 |
| 10 | 投递校验 | `shasum -a 256 /tmp/w7b4/topems-server.new` 与 S1 记录比对；migrations 目录 sha256 比对 | 完全一致 | 停 |
| 11 | 执行迁移 | `WINDOW_REMOTE_PSQL_BIN=/tmp/w7b4/psql_owner.sh bash scripts/migration/apply-forward.sh --ssh-host xingzhai@192.168.110.115 --remote-db topems_prod --remote-mig-dir /tmp/w7b4/migrations --anchor $PREV_VER --prod --only $MIG_VER` | `== OK：应用 1 条，无失败`，exit 0 | **停并回滚**；先跑 **B1** 确认回到 45/39/34/32/5，再决定 |
| 12 | A3 三条断言（属主） | 见 **A3** | `71` / `70` / `0` | 停并回滚 |
| 13 | A4 账本 | `set role topems_prod; select max(version) from public._sqlx_migrations;` | `20261112190000` | 停 |
| 14 | A5 形状（属主） | 见 **A5** | `70 / 70 / 70 / 1 / 0 / 0` | 停并回滚 |
| 15 | A6 属主无 GUC 写 T2 | 见 **A6** | `ERROR: new row violates row-level security policy`（42501） | 停（FORCE 未生效） |
| 16 | A7 GUC=T1 写 T2 | 见 **A7** | 同上 42501 | 停 |
| 17 | A8 T1 自读自写 | 见 **A8** | `INSERT 0 1`；`1`；`ROLLBACK` 后 `0` | 停 |
| 18 | A9 无 GUC 读 | `set role topems_prod; select count(*) from ehs.safety_hazards;` / 超户同句 | 属主 `0`；超户 `1` | 停 |
| 19 | 启动 | `launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.topems.server.plist` | — | — |
| 20 | A10 健康 | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8099/health` | 120s 内 `200` | 停并回滚 |
| 21 | A11 无 token | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8099/api/ehs/issues` | `401` | 停 |
| 22 | A12 连接 | `select count(*) from pg_stat_activity where datname='topems_prod' and backend_type='client backend'`（启动后 5/10/15/20 分钟各一次） | **≤ 35**（16 池×2；池上限 3、min=0）、`idle_tx=0`、20 分钟不增长 | 若 >35 或 20 分钟仍不回落 → 停，报 |
| 23 | A13 软删 smoke 行 | 见 **A13** | `UPDATE 1`；应用口径 `0` | 重跑 UPDATE；仍 0 则登记 |
| 24 | 观察窗 | 7.6 三条 grep + nginx 5xx，前 2h 每 15 分钟 | 全 0 | 触发回滚列即回滚 |

## 现场 SQL 片段

**B1 迁移前 RLS 基线（超户）**

```sql
select (select count(*) from pg_policies where schemaname='ehs') as policies,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relrowsecurity) as rls_on,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relforcerowsecurity) as forced,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and not c.relrowsecurity) as rls_off,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relrowsecurity and not c.relforcerowsecurity) as enabled_not_forced;
-- 45 / 39 / 34 / 32 / 5
```

**B2 NULL 前置断言（超户）**

```sql
do $$
declare t record; n bigint; msg text := '';
begin
  for t in select c.relname from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
             join information_schema.columns col on col.table_schema='ehs'
              and col.table_name=c.relname and col.column_name='tenant_id'
            where ns.nspname='ehs' and c.relkind='r' order by 1
  loop
    execute format('select count(*) from ehs.%I where tenant_id is null', t.relname) into n;
    if n>0 then msg := msg || format('%s=%s ', t.relname, n); end if;
  end loop;
  if msg <> '' then raise exception 'B4-EHS 前置断言失败: %', msg; end if;
  raise notice 'B4-EHS 前置断言：71 表 / 70 租户列 / tenant_id IS NULL = 0';
end $$;
```

**A3（属主 + 系统通道）**

```sql
set role topems_prod;
select 'tables='||count(*) from information_schema.tables where table_schema='ehs';
select 'tenant_cols='||count(*) from information_schema.columns where table_schema='ehs' and column_name='tenant_id';
set app.rls_system='on';
select 'null_rows='||count(*) from ehs.safety_hazards where tenant_id is null;
```

**A5（属主）**

```sql
set role topems_prod;
select (select count(*) from pg_policies where schemaname='ehs') as policies,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relrowsecurity) as rls_on,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relforcerowsecurity) as forced,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and not c.relrowsecurity) as rls_off,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='ehs' and c.relkind='r' and c.relrowsecurity and not c.relforcerowsecurity) as on_not_forced,
       (select count(*) from pg_policies where schemaname='ehs' and tablename='schema_defense_ledger') as ledger_policies;
-- 70 / 70 / 70 / 1 / 0 / 0
```

**A6 / A7**（同一 `psql -U topems_prod` 会话）

```sql
-- A6 无 GUC 写 T2 → 42501
insert into ehs.safety_hazards (hazard_no,name,category,level,status,tenant_id)
values ('QA-A6-20261112','qa','safety','medium','active','22222222-2222-2222-2222-222222222222');

-- A7 GUC=T1 写 T2 → 42501
begin;
  set local app.tenant_id='11111111-1111-1111-1111-111111111111';
  insert into ehs.safety_hazards (hazard_no,name,category,level,status,tenant_id)
  values ('QA-A7-20261112','qa','safety','medium','active','22222222-2222-2222-2222-222222222222');
rollback;
```

**A8（T1 自读自写，最后回滚）**

```sql
begin;
  set local app.tenant_id='11111111-1111-1111-1111-111111111111';
  insert into ehs.safety_hazards (hazard_no,name,category,level,status,tenant_id)
  values ('QA-A8-20261112','qa','safety','medium','active','11111111-1111-1111-1111-111111111111');
  select count(*) from ehs.safety_hazards where tenant_id='11111111-1111-1111-1111-111111111111';  -- 1
rollback;
select count(*) from ehs.safety_hazards;  -- 0
```

**A13（A12 通过后立即执行）**

```sql
select column_name, data_type, is_nullable from information_schema.columns
 where table_schema='ehs' and table_name='safety_hazards' and column_name='deleted_at';  -- 1 行
update ehs.safety_hazards set deleted_at=now()
 where id='d663d7a4-a3f8-486e-b522-a62e27df4d37' and deleted_at is null;                 -- UPDATE 1
select count(*) from ehs.safety_hazards
 where tenant_id='00000000-0000-0000-0000-000000000001' and deleted_at is null;          -- 0
```

## 回滚（逐条，失败也不许跳）

| # | 命令 | 期望 |
|---|---|---|
| R1 | 停写：`launchctl bootout gui/501/com.topems.server` | 无 8099 监听 |
| R2 | 属主执行 `database/rollback/20261112190000_..._rollback.sql`（`--single-transaction`） | 45 / 39 / 34 / 32 / 5，ledger 策略 0 |
| R3 | `delete from public._sqlx_migrations where version=20261112190000 and success;` | `DELETE 1`；max=`20261112160000` |
| R4 | 换回旧二进制 + 重启 | `/health` 200 |
| R5 | 复跑 B1 | `45 / 39 / 34 / 32 / 5` |

漏做 R3 的症状：下次 `--anchor 20261112160000` 被拒（`锚点偏离账本水位`）；改成 `--anchor 20261112190000` 会静默跳过。

**最后手段**：`pg_restore --clean --if-exists -d topems_prod <dump>` → 旧二进制 → 启动 → R5。

## 复盘（2026-11-13 本次执行）

1. **A12 原判据不适用**：`≤ 启动前值 +1` 抄自 WMS 窗口（热更新、池已预热）；EHS 是冷启动、全模块建池，实测 35 = 16 池×2 + unified_core 4 + ehs 1，属 `min_connections=0`、`idle_timeout=120s` 的正常形态。判据已改为"启动后 ≤35、`idle_tx=0`、20 分钟不增长，随后回落"。
2. **流程**：窗口内禁止"起后台 → 结束 turn 等通知"。02:38 结束、02:55 构建成功、07:09 才发现，差点废窗。长任务必须同 turn 短轮询或前台跑。
3. 实测：停机 ≈15s（bootout 1s、迁移 6s、换件+启动 5s），A6/A7 均 42501，A13 `UPDATE 1`。
