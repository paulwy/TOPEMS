# WMS RLS fail-closed DDL 窗口手册

- 日期：2026-11-14
- 范围：`database/migrations/20261113100000_w7_b4_wms_rls_fail_closed_forward.sql`（生产库 `topems_prod`，schema `wms`）
- 性质：**窗口执行手册 + 已演练的回滚件**。本文档不投递生产、不改生产配置；所有演练均在本地副本库完成。

---

## 0. 交付物与基线数字

| 交付物 | 路径 | sha256 |
|---|---|---|
| 前向迁移（已合入 main，未投递） | `database/migrations/20261113100000_w7_b4_wms_rls_fail_closed_forward.sql` | `da5fcb9a743bd517824897f8ee679cbaed9a9cc95dbbe9990b013bac2cd635bf` |
| 回滚脚本（本次交付） | `database/rollback/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql` | `751bbafc118981d19d20dd99e1ac368a2c2c6c99d5775e32f48bff76d16efeca` |

生产基线（`wms` schema，2026-11-13 只读核对）：

| 指标 | 基线值 |
|---|---|
| 表数（`relkind='r'`） | 39 |
| 带 `tenant_id` 的表 | 37 |
| 策略总数 | 42 |
| `USING true` 且 `WITH CHECK true` 的策略 | 16 |
| RLS 开启的表 | 37 |
| FORCE RLS 的表 | 37 |
| `safety_stock_settings` | rls=false / force=false / 0 策略 |
| `schema_defense_ledger` | rls=false / force=false / 0 策略 |
| 账本 `_sqlx_migrations` | 667 条 success、0 失败、max `20261112190000` |

前向迁移目标态：39 表全部 ENABLE RLS、39 条 `rls_tenant_isolation` 策略、38 表 FORCE（`schema_defense_ledger` 仅 ENABLE）、37 张租户表带租户通道、2 张系统表仅 `app.rls_system` 通道。

---

## 1. 回滚脚本

### 1.1 口径

回滚不是「关掉 RLS」的半成品，而是**精确退回上述 fail-open 基线**：

1. `DROP` 掉 39 张表上的全部当前策略（含 `rls_tenant_isolation`）；
2. 按生产基线静态快照重建 42 条原策略（permissive / ALL / PUBLIC，`USING` 与 `WITH CHECK` 原值逐字节一致）；
3. `safety_stock_settings`：`NO FORCE` + `DISABLE ROW LEVEL SECURITY` + 0 策略；
4. `schema_defense_ledger`：`NO FORCE` + `DISABLE ROW LEVEL SECURITY` + 0 策略；
5. 其余 37 表逐表 `ENABLE` + `FORCE ROW LEVEL SECURITY`；
6. 末尾 DO 块硬校验：表数 39、策略数 42、`true/true` 16、RLS 37、FORCE 37、无 `app.rls_system` 残留、逐表策略条数（两张特殊表 0；`inventory` / `inventory_movements` / `slotting_rules` / `slotting_suggestions` / `slotting_zones` 为 2；其余 1），任一不符即 `RAISE EXCEPTION`。

> 注：前向迁移文件头部有一句「回滚不提供 DISABLE RLS 路径」的旧注释，指的是该迁移合入时的旧回滚件。**以本回滚脚本头部口径为准**；为避免改动已推送迁移文件，未回改该注释。

### 1.2 急停命令

单事务执行，失败自动整体回退，不会留下半套策略：

```bash
psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 \
  -f database/rollback/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql
```

生产（SSH 模式，属主身份）：

```bash
ssh xingzhai@192.168.110.115 \
  '/opt/homebrew/bin/psql -U topems_prod -d topems_prod --single-transaction -v ON_ERROR_STOP=1 \
   -f /tmp/w7b4/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql'
```

期望：退出码 0，最后一条 `NOTICE: B4-WMS 回滚完成：39 表 / 42 策略 / 16 条 true-true，逐表 RLS+FORCE 与基线一致`。

### 1.3 幂等性

脚本先按 `pg_policies` 枚举 `DROP POLICY IF EXISTS`，再重建固定策略集合，末尾用固定判据校验。**可重复执行**：第二次执行结果不变，输出同样的完成 NOTICE。

### 1.4 失败表现

- 任一 `DROP` / `CREATE` / `ALTER` 报错 → psql 以非 0 退出，`--single-transaction` 整笔回滚，库保持执行前状态；
- 校验 DO 块失败 → `RAISE EXCEPTION`，同样整笔回滚；
- `lock_timeout=5s` 抢不到锁 → 报 `canceling statement due to lock timeout`，整笔回滚；释放长事务后重试；
- `statement_timeout=60s` → 报 `canceling statement due to statement timeout`，整笔回滚；先排查锁等待再重试。

以上任意失败都**不会**让库处于「部分回滚」状态；重复执行安全。

### 1.5 回滚后的账本处置（必须人工决策，脚本不碰账本）

回滚脚本只回滚 DDL，**不删除** `_sqlx_migrations` 中 `20261113100000` 这一行。因此：

| 场景 | 处置 |
|---|---|
| 回滚后一段时间内不打算重新应用（默认） | 保留账本行。后续修复走 `version > 20261113100000` 的新前向补丁，`apply-forward.sh` 天然跳过已应用版本 |
| 回滚后要原样重新应用同一文件 | 必须在新变更单下、与重新应用**同一事务**内删除该账本行；单独删账本行会让账本与真实结构脱节，禁止 |

不推荐「删账本行后直接重跑」：`apply-forward.sh` 的锚点校验会因账本 max 变化而拒绝，除非显式改锚点，而 prod 模式不允许锚点偏离。

---

## 2. DDL 窗口手册

### 2.1 前置风险：硬复位、磁盘与并发构建（2026-11-14 复盘）

**事实（本次中断的现场证据）**

- 整机硬复位（看门狗）：`kern.boottime` = `2026-11-14 06:18:43`，`last reboot` 同一时间；`/Library/Logs/DiagnosticReports/ResetCounter-2026-11-14-064111.diag` 记录 `Reset count: 1`、`Boot faults: wdog,reset_in_1 timeout,dblclick_timeout target_off_restart`。
- PostgreSQL 没有干净关闭：服务日志只有 `database system was interrupted; last known up at 2026-11-14 06:10:01 CST`，没有 `received … shutdown request` / `database system is shut down`；数据目录残留 `postmaster.pid`（PID 862，复位后已被其他进程占用），brew 的 launchd 任务重试 158 次、`last exit 1`，每次报 `lock file "postmaster.pid" already exists`。
- `/private/tmp` 整体重建：目录 birth `06:40:52`，06:18 之前的条目一个不剩；`/var/tmp` 里的旧文件仍在，说明不是通用 tmp 清理，而是 `/private/tmp` 被重建。同机的会话工作目录若在 `/private/tmp` 下，现场会一起丢失。
- 诱因（用户复盘判断，非日志直证）：磁盘一度接近写满（复盘时 `df -h` 为 407 GiB 已用 / 26 GiB 可用，94%），且多会话共享同一 `/Users/air/TOPEMS/target` 并发跑重型 cargo 构建；本次一次 `LEFTHOOK_RUN_HEAVY=1` 的 pre-push 在 1365 秒被外部 `SIGTERM` 终止，日志只有 `signal: terminated`，是锁争用的直接表现。

**窗口纪律（写进执行清单，逐条打勾）**

1. **窗口内不跑任何并发重型构建**，只跑这一个迁移动作：cargo check/test/build、pnpm build、docker build、其它会话的重型门禁全部停掉；迁移开始前确认无 `cargo`/`rustc` 进程、1 分钟负载低于物理核心数。
2. 前置检查必须包含**磁盘余量与 `target` 占用**（见 §2.2 的 P9/P10），任一低于阈值就不开窗。
3. 窗口若中途被复位打断，恢复后**先查账本版本与策略形状，再决定重跑还是走回滚**，顺序见 §2.4，不得直接重跑。
4. **硬复位后 `postmaster.pid` 残留会导致 PostgreSQL 起不来**，恢复顺序是先清陈旧 pid 再起库（命令见 §2.4 第 1 步）；不要反复点启动、也不要直接删数据目录。

### 2.2 前置检查（全部只读，窗口前完成）

**P1 账本版本**

```sql
SELECT max(version) AS ledger_max, count(*) FILTER (WHERE NOT success) AS failed
  FROM _sqlx_migrations;
```

期望 `ledger_max = 20261112190000`、`failed = 0`、且 `SELECT 1 FROM _sqlx_migrations WHERE version = 20261113100000` 为空。锚点必须等于账本 max，`apply-forward.sh` 在 prod 模式下会强制校验。

**P2 表形状**

```sql
SELECT count(*) AS tables FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'wms' AND c.relkind = 'r';                       -- 期望 39
SELECT count(*) AS tenant_tables FROM information_schema.columns
 WHERE table_schema = 'wms' AND column_name = 'tenant_id';           -- 期望 37
SELECT count(*) AS bad_type FROM information_schema.columns
 WHERE table_schema = 'wms' AND column_name = 'tenant_id'
   AND udt_name <> 'uuid';                                          -- 期望 0
```

**P3 行数快照（备份前留档，窗口后对比）**

```sql
SELECT c.relname, c.reltuples::bigint AS est_rows
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'wms' AND c.relkind = 'r'
 ORDER BY c.relname;
```

需要精确值时可对 39 表逐表 `count(*)`；`reltuples` 只用于快速对比。

**P4 NULL 租户自查（只读）**

```sql
DO $$
DECLARE t record; n bigint;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN information_schema.columns col
        ON col.table_schema = 'wms' AND col.table_name = c.relname
       AND col.column_name = 'tenant_id'
     WHERE n.nspname = 'wms' AND c.relkind = 'r'
  LOOP
    EXECUTE format('SELECT count(*) FROM wms.%I WHERE tenant_id IS NULL', t.relname) INTO n;
    IF n > 0 THEN RAISE WARNING 'NULL_TENANT % = %', t.relname, n; END IF;
  END LOOP;
END $$;
```

2026-11-13 只读扫描结论：37 张租户表全部为 0。窗口时迁移内置同一自查（`app.rls_system='on'` 下全量统计），**任何非 0 都会 `RAISE EXCEPTION` 并整笔回滚**——这是最后一道闸门，不依赖人工记忆。

**P5 连接池余量**

```sql
SHOW max_connections;
SELECT count(*) AS total, count(*) FILTER (WHERE state <> 'idle') AS active
  FROM pg_stat_activity;
```

同时确认服务的 `DB_MAX_CONNECTIONS` 配置。迁移只做 39 次 `ALTER TABLE` / 39 次 `CREATE POLICY`，本身不建连接；余量检查是为了避免窗口内业务侧把连接占满、导致迁移取锁失败。

**P6 锁与长事务**

```sql
SELECT pid, usename, state, wait_event_type, left(query, 80) AS q, now() - xact_start AS xact_age
  FROM pg_stat_activity
 WHERE datname = 'topems_prod' AND xact_start IS NOT NULL
 ORDER BY xact_start;
```

窗口内不得有超过 30s 的未提交事务；迁移自带 `lock_timeout=5s`，抢锁失败会整体回滚而不是排队堆积。

**P7 备份**

`pg_dump -Fc`（结构 + 数据），记录 sha256；重点覆盖 `wms` 全部表与 `_sqlx_migrations`。

**P8 服务停机（与 EHS 窗口同口径）**

`launchctl bootout gui/501/com.topems.server`（`KeepAlive=true`，不能用 kill），轮询确认进程退出、`:8099` 无监听、`pg_stat_activity` 中 `usename='topems_prod'` 归零。

**P9 磁盘余量**

```bash
df -h /System/Volumes/Data
# 阈值：可用 ≥ 50 GiB 且使用率 ≤ 88%；任一不满足则先清理再开窗（2026-11-14 复盘时为 26 GiB / 94%，不合格）
```

**P10 `target` 占用与并发构建**

```bash
du -sh /Users/air/TOPEMS/target /private/tmp/*/target 2>/dev/null
pgrep -fl 'cargo|rustc' || echo "NO_CARGO"
uptime; sysctl -n hw.ncpu
```

阈值：单个 `target` 目录 ≤ 40 GiB；`pgrep` 无输出；1 分钟负载 < `hw.ncpu`。同一 `target` 只允许一个构建在跑——多会话共享同一 `target` 时，cargo 会串行抢锁，长任务更容易被外部 `SIGTERM` 打断（2026-11-14 已出现：3 个会话并发 `cargo test`，一次 pre-push 在 1365s 被终止）。

### 2.3 执行命令与事务边界

投递：`scp` 迁移文件到 `/tmp/w7b4/migrations/`，`scp` 回滚脚本与属主 psql 包装器到 `/tmp/w7b4/`，逐个 `shasum -a 256` 比对（迁移 `da5fcb9a…`，回滚 `751bbafc…`）。

执行（本地跑门禁，远端用属主身份）：

```bash
WINDOW_REMOTE_PSQL_BIN=/tmp/w7b4/psql_owner.sh \
bash scripts/migration/apply-forward.sh \
  --ssh-host xingzhai@192.168.110.115 \
  --remote-db topems_prod \
  --remote-mig-dir /tmp/w7b4/migrations \
  --anchor 20261112190000 \
  --prod --only 20261113100000
```

事务边界（`apply-forward.sh` 行为）：

1. 先做锚点校验（必须等于账本 max）、白名单扫描、破坏性语句门禁；任一不符**在产生任何 DDL 之前**退出 1；
2. 每个迁移文件在**单事务**内执行：`\i 迁移文件` + `INSERT INTO _sqlx_migrations`（checksum=SHA-384 文件字节）；
3. 迁移内的 4 个 DO 块（前置断言 → 策略重建 → 形状自检 → NULL 自查）任一 `RAISE EXCEPTION`，SQL 与账本行**同事务回滚**；
4. psql 以 `--single-transaction -v ON_ERROR_STOP=1` 运行，失败即退出，后续迁移不再执行。

即：**不存在「结构改了但账本没写」或「账本写了但结构没改」的中间态**。

期望输出：

```
== 待应用 1 条（anchor=20261112190000，only=20261113100000）
-- 20261113100000_w7_b4_wms_rls_fail_closed_forward.sql
NOTICE:  B4-WMS 已收敛 39 张表：租户表 37，系统通道表 2
NOTICE:  B4-WMS 租户自查：全部租户表 tenant_id IS NULL 行数 = 0
== OK：应用 1 条，无失败
```

退出码 0。

### 2.4 复位/中断打断后的恢复步骤

窗口执行中若整机复位或连接被强断，恢复后按下面顺序做，**不要直接重跑迁移**：

**第 1 步：清陈旧 pid，起库**

```bash
PGDATA=/opt/homebrew/var/postgresql@18
PID=$(head -1 "$PGDATA/postmaster.pid" 2>/dev/null || true)
[ -n "$PID" ] && ps -p "$PID" -o pid,comm    # 输出不是 postgres 才可继续
rm -f "$PGDATA/postmaster.pid"               # 仅确认陈旧后执行
brew services restart postgresql@18
/opt/homebrew/bin/pg_isready
```

起库后在服务日志确认崩溃恢复走完：

```bash
tail -f "$PGDATA/log/postgresql-$(date +%F).log"   # 直到 "database system is ready to accept connections"
psql -d postgres -Atc "select pg_is_in_recovery();"   # f
```

**第 2 步：查账本**

```sql
SELECT max(version), count(*) FILTER (WHERE NOT success) FROM _sqlx_migrations;
SELECT version, success, installed_on FROM _sqlx_migrations WHERE version = 20261113100000;
```

**第 3 步：查策略形状（四项 + 新形状）**

```sql
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'wms' AND c.relkind = 'r';                        -- 39
SELECT count(*) FILTER (WHERE c.relrowsecurity), count(*) FILTER (WHERE c.relforcerowsecurity)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'wms' AND c.relkind = 'r';                        -- 目标 39 / 38；基线 37 / 37
SELECT count(*) FROM pg_policies WHERE schemaname = 'wms';           -- 目标 39；基线 42
SELECT count(*) FROM pg_policies
 WHERE schemaname = 'wms' AND policyname = 'rls_tenant_isolation';
```

**第 4 步：按账本 + 形状决策**

| 账本 `20261113100000` | 形状 | 判定 | 动作 |
|---|---|---|---|
| 有 | 目标态：39 表 / rls 39 / force 38 / 策略 39 | 单事务已提交且完整 | **不重跑**；继续 §2.6 验收 + 业务 smoke |
| 无 | 基线：39 表 / rls 37 / force 37 / 策略 42 / `true-true` 16 | 单事务未提交，DDL 也未落 | 重新执行 §2.3；锚点用恢复后的账本 max |
| 无 | 目标态 | 结构已变但账本没写（理论上不应出现） | **停止**；用 §1.2 回滚脚本退回基线，复盘后再投递 |
| 有 | 基线 | 回滚脚本被执行过 | **不重跑同一版本**；按 §1.5 决策账本与前向补丁 |
| 其他（混合态、策略数不符） | 任意 | 不可判定 | **停止**；先用 §1.2 回滚脚本退回基线，再复盘 |

**第 5 步：重跑前重新校验**

确认服务仍停、无并发构建（P10）、迁移与回滚文件 sha256 未变、备份可用；再看一眼 P4 的 NULL 自查，然后才执行 §2.3。

### 2.5 失败表现与处理

| 失败点 | 原始表现 | 事务结果 | 处理 |
|---|---|---|---|
| 锚点不等于账本 max | `== 拒绝：锚点偏离账本水位` | 无 DDL | 重新读取 `max(version)` 后用正确锚点 |
| 白名单外 pending | `== 拒绝：检测到 N 条清单外 pending 迁移` | 无 DDL | 逐条评审，加入 `--only` 或 `--defer` |
| 破坏性门禁 | `DENIED … [破坏性语句]` | 无 DDL | 本迁移无 DELETE/UPDATE/TRUNCATE/DROP TABLE，正常不会触发；触发即说明文件被改，停止窗口 |
| 前置断言（表数/缺列/uuid 类型） | `B4-WMS 前置不满足：…` | 整笔回滚，库仍是 fail-open | 先查清形状漂移来源，修正后再开窗；不要为了过断言改迁移 |
| 策略重建/形状自检 | `B4-WMS 校验失败：N 处异常` + 上方 WARNING 指明表名 | 整笔回滚 | 按 WARNING 定位表；确认是迁移缺陷还是库内历史漂移 |
| NULL 租户自查 | `B4-WMS 租户自查失败：存在 tenant_id IS NULL 行 → 表=行数` | 整笔回滚，**未 FORCE**，业务不受影响 | 按第 3 节定性；属真实缺租户的数据需人工裁决回填，禁止自动回填 |
| `lock_timeout` | `canceling statement due to lock timeout` | 整笔回滚 | 找持锁会话；窗口内清空长事务后重试 |
| `statement_timeout` | `canceling statement due to statement timeout` | 整笔回滚 | 先查锁等待，排除后再重试；不要直接调大超时 |
| 账本 INSERT 失败 | 任意外键/权限错误 | 整笔回滚（含 DDL） | 检查属主权限与账本表结构 |
| 迁移成功但 smoke 失败 | 接口 5xx / 列表为空 / 写入被拒 | 已提交 | 进第 3 节决策 |

### 2.6 窗口验收查询

```sql
-- A1 账本
SELECT max(version) FROM _sqlx_migrations;                              -- 20261113100000

-- A2 四项计数
SELECT count(*) AS tables,
       count(*) FILTER (WHERE c.relrowsecurity) AS rls,
       count(*) FILTER (WHERE c.relforcerowsecurity) AS force
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'wms' AND c.relkind = 'r';                           -- 39 / 39 / 38

SELECT count(*) FROM pg_policies WHERE schemaname = 'wms';              -- 39
SELECT count(*) FROM pg_policies
 WHERE schemaname = 'wms' AND policyname = 'rls_tenant_isolation';      -- 39

-- A3 策略形状：39 条必须同形，且不含 fail-open 分支
SELECT count(*) FROM pg_policies
 WHERE schemaname = 'wms'
   AND qual LIKE '%app.rls_system%'
   AND qual NOT LIKE '%IS NULL%'
   AND qual NOT LIKE '%00000000-0000-0000-0000-000000000000%';          -- 39

-- A4 系统通道表
SELECT tablename, qual LIKE '%app.tenant_id%' AS has_tenant_branch
  FROM pg_policies WHERE schemaname = 'wms'
   AND tablename IN ('schema_defense_ledger', 'wms_master_data_refs');  -- 两行均 false

-- A5 账本与结构一致：无遗留旧策略名
SELECT count(*) FROM pg_policies
 WHERE schemaname = 'wms' AND policyname LIKE 'wms_allow_all_%';        -- 0
```

业务 smoke：用默认租户账号分别读/写 `inventory`、`inbound_orders`、`outbound_orders`、`transfer_orders`、`stock_takes`，确认非空读与写入均成功；再用系统任务路径（`app.rls_system='on'`）确认告警/同步任务可跨租户读到数据。

### 2.7 窗口后 24 小时观测

基线（EHS 窗口同期测得，近 24h）：`pool timed out = 0`、`Failed to begin RLS txn = 0`、`ERROR` 级日志 = 0、全站 5xx = 0。

应用日志 `/Users/xingzhai/topems/logs/server.out`（tracing，UTC 时间戳，含 ANSI 颜色码）：

```bash
CUT=$(date -u -v-24H +%Y-%m-%dT%H:%M:%S)
perl -pe 's/\e\[[0-9;]*m//g' /Users/xingzhai/topems/logs/server.out \
  | awk -v c="$CUT" '$1>=c && /pool timed out/ {n++} END{print n+0}'
perl -pe 's/\e\[[0-9;]*m//g' /Users/xingzhai/topems/logs/server.err \
  | grep -cE '42501|row-level security|Failed to begin RLS txn|deadlock detected'
```

nginx 访问日志 `/Users/xingzhai/topems/nginx/logs/access.log`（`$status` 第 9 字段，`[$time_local]` 为 +0800）：

```bash
grep '/api/wms/' /Users/xingzhai/topems/nginx/logs/access.log | awk '{print $9}' | sort | uniq -c
```

数据库侧：

```sql
-- 连接水位
SELECT count(*) FROM pg_stat_activity;                                  -- 对照 SHOW max_connections
-- 锁等待
SELECT count(*) FROM pg_locks WHERE NOT granted;
-- 因 RLS 拒绝的写入不会留库内痕迹，必须看应用日志的 42501
```

| 指标 | 基线 | 告警 | 立即回滚判断 |
|---|---|---|---|
| `42501` / `row-level security` | 0 | ≥1 | 5 分钟内 ≥3 次且定位到租户通道缺失 |
| `Failed to begin RLS txn` | 0 | ≥1 | 5 分钟内 ≥3 次 |
| `pool timed out` | 0 | ≥1 | 5 分钟内 ≥3 次 |
| `/api/wms/*` 5xx | 0 | 任意 1 条 | 5 分钟内 ≥3 条，或 5xx 率 > 0.5% 且请求数 ≥100 |
| `pg_locks` 未授予 | 0 | 持续 >10s | 持续 >60s 且伴随业务超时 |
| 连接数 / `max_connections` | 常态水位 | > 80% 持续 5 分钟 | > 95% 且伴随 `pool timed out` |

重点抽检业务动作（WMS 读写密集、最容易暴露租户通道缺失）：库存移动、入库/出库确认、调拨、盘点、补货建议生成、低库存告警、序列号登记。

---

## 3. 误判发现后的处置路径

### 3.1 先定性

| 现象 | 定性 | 依据 |
|---|---|---|
| 某表数据「消失」但行还在（`count(*)` 为 0） | 大概率 RLS 误判：请求没带 `app.tenant_id`，或该表本该 fail-open | 属主/超户能查到、应用角色查不到 |
| 写入报 `new row violates row-level security policy`（42501） | 租户 GUC 缺失或写入的 `tenant_id` 与当前租户不一致 | 看请求上下文与 `tenant_id` 来源 |
| 跨租户读被切断（原本依赖全局读） | 该表本应走系统通道（`app.rls_system='on'`），但代码用了普通请求池 | 调用方是否系统任务/后台任务 |
| 迁移后大量表同时不可见 | 中间件未按请求设置 GUC（整体故障），不是单表误判 | 所有表一致表现 |

### 3.2 先回滚还是先前向补丁

**默认先回滚**（回滚是已验证的精确基线恢复，风险最低）：

满足以下任一条件，直接执行第 1.2 节回滚：

- 影响面 > 1 张表，或涉及写入阻塞（用户无法入库/出库/盘点）；
- 24h 指标触发上表的回滚判断；
- 无法在 30 分钟内用前向补丁给出可验证的修复（窗口期业务损失大于回滚成本）；
- 误判表属于「本该 fail-open」的既有业务表，且无跨租户读设计。

**优先前向补丁**（不回滚）只在同时满足时成立：

- 影响面 = 1 张表，且为只读接口；
- 已定位到明确代码缺陷（缺谓词 / 裸池 / GUC 未设置），补丁可在 30 分钟内评审并演练；
- 回滚会破坏窗口内其它已完成的工作（例如同窗口还有其它已提交的前向变更）。

**禁止的路径**：

- 用 `ALTER TABLE … DISABLE ROW LEVEL SECURITY` 临时绕过（留下不可控的混合态，且账本仍显示已应用）；
- 手工 `UPDATE` 回填 `tenant_id`（缺租户归属是业务裁决，不是 DDL 能决定的事）；
- 直接删 `_sqlx_migrations` 行后重跑（账本与结构脱节，锚点校验会拒绝）；
- 只回滚部分表（回滚脚本是整库一致口径，局部回滚后校验必失败）。

### 3.3 前向补丁模板

回滚后要重新收敛，或单表误判需修复，都用 `version > 20261113100000` 的新文件（不改已推送迁移）：

```sql
-- database/migrations/20261114HHMMSS_w7_b4_wms_rls_<topic>.sql
-- 背景：<误判表 / 场景>，变更单 <ticket>
SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- 1) 仅对该表调整策略（示例：恢复租户通道并保留系统通道）
DROP POLICY IF EXISTS rls_tenant_isolation ON wms.<table>;
CREATE POLICY rls_tenant_isolation ON wms.<table> FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- 2) 形状自检：只允许目标表偏离基线
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'wms' AND policyname = 'rls_tenant_isolation';
  IF n <> 39 THEN
    RAISE EXCEPTION '补丁后策略数 %，期望 39', n;
  END IF;
END $$;
```

补丁同样要：先在副本库跑「基线 → 前向 → 补丁 → 断言」，再进窗口；补丁提交前更新 `database/checksums.txt`。

### 3.4 回滚后的复盘必填项

- 误判表的真实访问路径（请求池 / 系统池 / 后台任务）；
- 该表在基线中是否本来就是 fail-open（对照本文 §0 的 16 条 `true/true`）；
- 误判为何没被窗口验收（A2–A5 + smoke）发现，补哪条验收；
- 若是代码缺陷，对应的 `svc/wms` 修复提交与测试。

---

## 4. 副本演练原始输出摘要

演练库：`topems_wms_rls_rb3_20261114`，从生产基线副本 `topems_w7_reh_prod_20261111` 克隆（同一份 39 表 / 42 策略 / 16 `true/true` / rls 37 / force 37）。

**基线（克隆后、前向之前）**

```
tables=39
policies=42
true_true=16
rls=37 force=37
```

**正向迁移**（`psql --single-transaction -v ON_ERROR_STOP=1 -f …forward.sql`）

```
FORWARD_EXIT=0
NOTICE:  B4-WMS 已收敛 39 张表：租户表 37，系统通道表 2
NOTICE:  B4-WMS 租户自查：全部租户表 tenant_id IS NULL 行数 = 0
```

迁移后状态：

```
tables=39  policies=39  rls=39 force=38
```

**反向脚本**（`psql --single-transaction -v ON_ERROR_STOP=1 -f …rollback.sql`）

```
ROLLBACK_EXIT=0
NOTICE:  B4-WMS 回滚：已清空 wms 当前策略
NOTICE:  B4-WMS 回滚完成：39 表 / 42 策略 / 16 条 true-true，逐表 RLS+FORCE 与基线一致
```

**四项对比（回滚后 vs 基线）**

```
tables=39
policies=42
true_true=16
rls=37 force=37
```

**逐表比对**

```
$ diff 基线逐表状态 回滚后逐表状态
FLAGS_DIFF_EMPTY

$ diff 基线 42 条策略定义 回滚后策略定义
POLICY_DIFF_EMPTY
```

（逐表状态含 `relname|relrowsecurity|relforcerowsecurity|策略条数`；策略定义含 `tablename|policyname|permissive|roles|cmd|qual|with_check`。）

**幂等**

```
SECOND_RUN_EXIT=0
NOTICE:  B4-WMS 回滚完成：39 表 / 42 策略 / 16 条 true-true，逐表 RLS+FORCE 与基线一致
tables=39  policies=42  true_true=16  rls=37 force=37
```

结论：四项指标（表数、策略数、`true/true` 条数、`relforcerowsecurity`）全部回到基线，逐表 RLS/FORCE 标志与 42 条策略定义逐字节一致，二次执行幂等。**该回滚件已满足「在副本真跑过」的交付条件。**

---

## 5. 投递声明

- 本文档与回滚脚本均未对生产库执行任何 DDL/DML；
- 未修改生产配置、未投递迁移、未动 `_sqlx_migrations`；
- 演练全部发生在本地副本库 `topems_wms_rls_rb3_20261114`（克隆自 `topems_w7_reh_prod_20261111`）；
- 生产窗口执行与否，由变更单与窗口审批决定；本文档只提供执行与回滚口径。
