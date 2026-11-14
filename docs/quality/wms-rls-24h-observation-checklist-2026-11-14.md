# WMS RLS fail-closed 24h 观测清单（2026-11-14 起跑）

- 库身份：`topems_prod` @ `xingzhai@192.168.110.115`，PostgreSQL 18.4（Homebrew），端口 5432
- 起跑时间：**2026-11-14 10:58 CST**（DDL 生效时间 08:58:56，换件重启 08:47:55）
- 形态：迁移 `20261113100000` 已应用；39 表 / 39 策略 / `true/true` 0 / RLS 39 / FORCE 38
- 服务：pid 18043，launchd `runs=2`，`last exit code=0`，`/health` healthy
- 原则：全部只读；本清单不含任何写操作、不含构建、不含重启

---

## 0. 起跑基线（对照用）

| 指标 | 基线值 | 采集口径 |
|---|---|---|
| 账本 | `max=20261113100000`，失败 0 | `_sqlx_migrations` |
| 表 / 策略 | 39 / 39 | `wms` schema |
| `true/true` 策略 | 0 | `pg_policies` |
| RLS / FORCE | 39 / 38 | `pg_class` |
| PG 日志 RLS 违例（08:58:56 起） | **0** | `postgresql@18.log` |
| PG 日志 NULL 租户（08:58:56 起） | **0** | 同上 |
| 连接 / 活跃 / idle-in-txn | 8 / 1 / 0 | `pg_stat_activity` |
| `max_connections` | 100 | `current_setting` |
| nginx 今日请求 / 5xx | 331 / 0（全部在 08:58 前） | `nginx/logs/access.log` |
| nginx 窗口内请求 / 5xx | **0 / 0** | 同上，`$4 >= [14/Nov/2026:08:58:56` |
| nginx 窗口内 WMS 请求 | 0（无外网流量） | 同上 |
| 服务 pid / runs / last exit | 18043 / 2 / 0 | `launchctl print` |

> 历史累计（不要误判为新增）：PG 日志共 597 条 RLS 违例（最后一条 2026-11-13 07:13:25）、5 条 NULL 租户（最后一条 2026-11-07 16:29）。**判定一律用时间窗过滤，不用累计值。**

> 命令实测：2026-11-14 11:01 CST 全部执行通过（只读）。当时输出：M1=0、M3=0、M2=`39|0|0|39|38`、M4=`8|1|0|100` 且无 >60s 事务、M5 窗口内 `total=0 5xx=0`、M6 窗口内 `wms_all=0`、M7 `state=running / pid=18043 / runs=2 / last exit=0 / healthy`、回滚件在位且 sha `751bbafc…`。

---

## 1. 指标、命令与阈值

### M1 RLS 违例计数（最高优先级）

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'awk "/violates row-level security policy/ { if (\$1 \" \" \$2 >= \"2026-11-14 08:58:56\") c++ } END { print c+0 }" /opt/homebrew/var/log/postgresql@18.log'
```

- 阈值：**必须为 0**
- 越过：≥1 条 → 15 分钟内定位表名与进程；同一表 10 分钟内 ≥3 条，或落在 WMS 写入语句上 → **回滚 DDL**（见 §3）
- 说明：应用 `server.out` 自 08:47 后无新写入（新进程已打开该文件但未产生 stdout），应用侧以 PG 日志 + `/health` 为准

### M2 `true/true` 策略数（应为 0）

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 '/opt/homebrew/bin/psql -d topems_prod -X -A -F"|" -v ON_ERROR_STOP=1' <<'SQL'
select (select count(*) from pg_policies where schemaname='wms') pols,
       (select count(*) from pg_policies where schemaname='wms' and qual='true' and with_check='true') tt,
       (select count(*) from pg_policies where schemaname='wms' and policyname like 'wms_allow_all_%') old,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='wms' and c.relkind='r' and c.relrowsecurity) rls,
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='wms' and c.relkind='r' and c.relforcerowsecurity) frc;
SQL
```

- 阈值：`tt=0`、`old=0`、`pols=39`、`rls=39`、`frc=38`
- 越过：任一项偏离 → 视为策略被改写，**立即回滚 DDL** 并冻结该表写操作

### M3 NULL 租户写入尝试

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'awk "/null value in column \"tenant_id\"/ { if (\$1 \" \" \$2 >= \"2026-11-14 08:58:56\") c++ } END { print c+0 }" /opt/homebrew/var/log/postgresql@18.log'
```

- 阈值：**0**
- 越过：≥1 → 取同事务上下文里的 `statement:` 定位接口；若来自 WMS 写路径 → **回滚 DDL**，并登记为代码缺口
- 口径：本命令抓的是 `tenant_id` 为非空列时的 not-null 违例；若列可空，fail-closed 会先以 `new row violates row-level security policy` 拒绝 —— 那种情况计入 **M1**。即 **M1 是 NULL 写入的主信号，M3 是补充**

可选（每日一次，只读；表增长后跳过）：逐表扫 `tenant_id IS NULL` 行数

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 '/opt/homebrew/bin/psql -d topems_prod -X -A -F"|" -v ON_ERROR_STOP=1' <<'SQL'
select format('select %L as tbl, count(*) filter (where tenant_id is null) as nulls from %I.%I;', c.relname, n.nspname, c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='wms' and c.relkind='r'
   and exists (select 1 from information_schema.columns col
                where col.table_schema='wms' and col.table_name=c.relname and col.column_name='tenant_id')
\gexec
SQL
```

### M4 连接数与 idle-in-transaction

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 '/opt/homebrew/bin/psql -d topems_prod -X -A -F"|" -v ON_ERROR_STOP=1' <<'SQL'
select 'POOL', count(*), count(*) filter (where state='active'),
       count(*) filter (where state='idle in transaction'),
       current_setting('max_connections') from pg_stat_activity where datname='topems_prod';
select 'LONG', pid, usename, state, round(extract(epoch from now()-xact_start)) sec, left(query,60)
  from pg_stat_activity
 where datname='topems_prod' and xact_start is not null and now()-xact_start > interval '60 seconds';
SQL
```

- 阈值：连接 ≤80；`idle in transaction` ≤5；无 >60s 事务
- 越过：>80 或 idle-in-txn >5 **连续两次检查** → 查长事务来源；>95 或实例无响应 → `launchctl kickstart -k gui/501/com.topems.server`（只重启，不动 DDL）
- 峰值口径：清单为快照式，两次检查之间的真实峰值不可见；每次记录实测值，取 24h 内最大值作为"观测峰值"

### M5 nginx 5xx

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'L=$HOME/topems/nginx/logs/access.log; \
 awk "\$4 >= \"[14/Nov/2026:08:58:56\" {n++; if (\$9+0>=500) f++} END {print \"total=\" n+0 \" 5xx=\" f+0}" $L'
```

状态分布（排查用，可选）：

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'L=$HOME/topems/nginx/logs/access.log; \
 awk "\$4 >= \"[14/Nov/2026:08:58:56\" {c[\$9]++} END {for (k in c) print k, c[k]}" $L | sort -k2 -rn'
```

- 阈值：5xx 占窗口内请求 **≤1%**（样本 ≥100 才计比率）；WMS 路径 5xx **=0**
- 越过：任一 WMS 5xx，或 5xx 率 >1% → 先查 nginx `error.log` 与 PG 日志是否含 RLS 关键字；含 → **回滚 DDL**；不含 → 按普通故障排查
- 时间窗：nginx 自定义格式，`$4` = `[14/Nov/2026:HH:MM:SS`，用字符串比较做窗口过滤（与原 `grep 精确秒` 不同，后者只会命中那一秒）
- 当前约束：外网流量近零（窗口内 0 请求；今日 331 条均在 08:58 之前），比率无分母，**只看绝对条数**

### M6 WMS 关键写入路径失败率

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'L=$HOME/topems/nginx/logs/access.log; \
 awk "\$4 >= \"[14/Nov/2026:08:58:56\" { if (\$7 ~ /^\\/api\\/wms/) { w++; if (\$6 ~ /\"(POST|PUT|PATCH|DELETE)/) { t++; if (\$9+0>=500) f++ } else r++ } } END { print \"wms_all=\" w+0 \" wms_read=\" r+0 \" wms_write=\" t+0 \" w5xx=\" f+0 }" $L'
```

- 字段：`$4` 时间、`$6` 方法（含前引号）、`$7` 路径、`$9` 状态码
- 阈值：写请求失败率 ≤0.5%（写样本 ≥200）；任意 WMS 5xx → 人工确认
- 越过：≥1 条 5xx 且 PG 日志同步出现 RLS 违例 → **回滚 DDL**；仅有 5xx 无 RLS → 按业务错误处理

### M7 服务与实例（辅助）

```bash
ssh -o BatchMode=yes xingzhai@192.168.110.115 \
'launchctl print gui/501/com.topems.server | grep -E "state|pid|runs|last exit"; \
 curl -s -m 4 http://127.0.0.1:8099/health'
```

- 阈值：`state=running`、`pid=18043`（或记录新 pid）、`runs=2`、`last exit=0`、health `healthy`
- 越过：`runs` 增加 / pid 变化 = 异常重启，立即查 `~/topems/logs/server.err` 与 PG 日志；连续 2 次异常重启 → 回退二进制

---

## 2. 检查节奏

- **每 2 小时一次**：12:58、14:58、16:58、18:58、20:58、22:58、00:58、02:58、04:58、06:58、08:58，收口 10:58（T+24h）
- 首检 12:58（T+2h）；若期间发生发版、流量恢复、用户报障，立即加检
- 每次记录：时间、M1–M7 数值、与基线差值、是否越线、处置

建议记录表：

```
| 时间 | RLS | tt/old | NULL | conn/act/iit | nginx5xx | wms写失败 | pid/runs/health | 判定 |
```

---

## 3. 止损动作（按优先级）

1. **回滚 DDL**（fail-closed 引发读写异常时首选）
   - 回滚件已在生产：`/tmp/w7b4/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql`（sha256 `751bbafc…`）
   - 命令：
     ```bash
     ssh -o BatchMode=yes xingzhai@192.168.110.115 \
     '/opt/homebrew/bin/psql -d topems_prod --single-transaction -v ON_ERROR_STOP=1 \
      -f /tmp/w7b4/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql'
     ```
   - 目标态回到 `20261112190000` 基线（39 表 / 42 策略 / 16 条 `true/true` / RLS 37 / FORCE 37）
   - 账本行 `20261113100000` **保留不删**（手册 §1.5）；后续修复走更高版本前向补丁
2. **回退二进制**（新件自身异常、DDL 未回滚也需先恢复服务时）
   ```bash
   ssh … 'cp -p ~/TOPEMS/bin/topems-server.bak_pre_2a3da1cff_20261114-0847 ~/TOPEMS/bin/topems-server && \
          launchctl kickstart -k gui/501/com.topems.server'
   ```
   - 旧件 sha `6723ab2d…`；更早备份 `bak_scm3_20261113-215320`（`fd0e6f7b…`）
3. **只重启不换件**（连接耗尽、实例僵死）：`launchctl kickstart -k gui/501/com.topems.server`
4. **上报**：窗口负责人（本线程）+ DBA；附 M1/M2 原始输出、PG 日志时间窗片段、`launchctl print` 与 `/health`

---

## 4. 已知观测盲区（务必知情）

- `server.out` 自 08:47 后无新写入（新进程已持有 fd，但无 stdout 输出）→ 应用错误以 PG 日志与 `/health` 为准
- `/metrics` 只埋点到 `/health`、`/metrics`，业务路由（含 `/api/wms/*`）不出现在 `axum_http_requests_total` → 不能作为 WMS 失败率来源
- 生产 WMS 今日请求为 0、业务表 0 行 → "读回 0 行"与"读不到"**不能用日志区分**：正常的空表读取不会产生任何 RLS 违例，日志只能证明"没有异常拒绝"。二者必须靠 **§5 主动只读探针**（HTTP 契约矩阵 + 扫描增量 + 运行时差分）来区分
- nginx `access.log` 当前 mtime 停在 07:16，说明近期无外网流量；流量恢复后 M5/M6 才有统计意义

---

## 5. 主动只读探针（零流量下区分"没数据"与"被挡住"）

- 脚本：`scripts/ops/wms-rls-probe.sh`（随本清单提交仓库；生产执行时上传到 `/tmp/w7b4/`，**不常驻、不挂定时**）
- 运行位置：生产主机；仅 GET + 只读 SQL；不写业务数据、不改配置、不重启

```bash
scp scripts/ops/wms-rls-probe.sh xingzhai@192.168.110.115:/tmp/w7b4/
ssh -o BatchMode=yes xingzhai@192.168.110.115 'bash /tmp/w7b4/wms-rls-probe.sh'
```

**四层设计**

| 层 | 内容 | 判定作用 |
|---|---|---|
| A HTTP 契约矩阵 | 28 个 WMS 列表 GET × 5 种身份：无 token / 超户缺租户头 / 非超户 / 超户+`x-tenant-id` / 非超户伪造租户头 | 401 / 400 / 200 / 200 / 200 且伪造头不改变响应 |
| B 执行证据 | 整轮前后 `pg_stat_user_tables` 的 `seq_scan+idx_scan` 增量 | 证明查询真的打到 wms 表（不是被挡在门外） |
| C 运行时差分 | 应用角色 `topems_prod` 只读事务内对比：无 GUC / 租户 A / 租户 B / `app.rls_system=on` | 用 `ehs.safety_hazards`（1 行）证明 fail-closed 谓词真的在过滤 |
| D 形状与角色 | 39/39/0/39/38；应用角色非 super/bypassrls；探针窗口 RLS 违例 0 | 排除"策略被改写"与"角色绕过 RLS" |

- 非超户权限由服务端授权表按 `user_id` 解析，token 内 `permissions` 不生效；探针使用现有非超户 `tenant_admin`（`0d000000-…-000000000001`）的 `sub` + 租户 claim，**只读、不建账号、不改授权**
- 裸池路径（`serial-numbers`、`serial-numbers/statistics`、`analytics/flow-trend`、`analytics/dashboard-summary`）绕过请求事务，空表期响应与正常无法区分；**数据到位后这些入口返回 0 行即视为阻断**
- 探针不进入 §2 的 2 小时节奏；按需执行，数据首次写入后必须回归一次

**首轮实测（2026-11-14 11:10:25，只读）：`RESULT: PASS`，pass=36 / fail=0 / warn=5**

- 28 个端点全部满足 `401/400/200/200/200`；非超户与超户返回结构一致（均为空表）
- 扫描覆盖 18/39 表；未触达的 21 张多为 `*_items`、`replenishment_*`、`sync_*` 等无列表 GET 的内部表
- 运行时差分：`ehs` 无 GUC=0、租户 A=1、租户 B=0、系统通道=1；`wms.inventory` 各上下文均 0（表空）
- 已知例外：`wms.schema_defense_ledger` 无 FORCE，属主 `topems_prod` 可绕过 RLS（全局账本表，无 `tenant_id`）
- 非超户缺 `tenant_id` → 400（不落随机租户兜底）；探针窗口内 RLS 违例 0
