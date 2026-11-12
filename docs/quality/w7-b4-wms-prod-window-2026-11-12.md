# W7-B4 第二批 WMS 生产窗口方案（2026-11-12 已执行）

- 状态：**2026-11-12 已执行完成**（A1–A7 全部通过，未回滚；复盘与偏差见 §7）
- 目标环境：`xingzhai@192.168.110.115`（`id -u = 501`），launchd `gui/501/com.topems.server`，监听 `8099`，二进制 `/Users/xingzhai/topems/bin/topems-server`
- 目标库：生产 `topems_prod`（plist `DATABASE_URL` 指向它）
- 变更范围：`wms.outbound_orders.expected_ship_date / actual_ship_date` 统一为 `timestamptz`；出库日期读写口径对齐；统计口径修正
- 明确不在本窗口：连接池容量（见 `docs/quality/w7-b4-wms-plan-2026-11-12.md` §7，单独立项，不改池大小）
- 验收身份：**一律非超户**。DB 侧用 `topems_prod`（实测 `rolsuper=f`、`rolbypassrls=f`，且是两表 owner）；API 侧必须用非超户业务账号签发的 token，不得使用任何超户/运维账号

## 1. 变更内容与生产影响

| 项 | 内容 |
|---|---|
| 迁移 | `database/migrations/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.sql` |
| 回滚 | `database/rollback/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.rollback.sql` |
| 代码 | 出库创建/更新/发货写入统一为 `Asia/Shanghai` 当日 00:00；`analytics` 天数差先落 `date`；`schema_defense` 期望类型同步 `TIMESTAMPTZ` |
| 生产现状（2026-11-12 只读实测） | 两列 `date`、可空；`wms.outbound_orders` = **0 行**、`wms.outbound_order_items` = **0 行**；items 表不存在这两列；两表 owner = `topems_prod` |
| RLS 基线 | `wms` 37 张表全部 `relrowsecurity=true` 且 `relforcerowsecurity=true`；`pg_policies` 共 **42** 条；PG `max_connections=100` |
| 迁移性质 | **真改类型，不是 no-op**：`date → timestamptz`；因 0 行，属元数据级变更，无数据重写、无长锁 |
| 可见影响 | 迁移后两列为 `timestamptz`，存量（0 行）无变化；读接口输出 RFC3339 UTC（`+08 当日 00:00` = 前一日 `16:00:00Z`），前端按本地时区渲染回原日期 |

## 2. 部署顺序（迁移可独立先上）

**结论：迁移先上、二进制后上；迁移也可单独停留在生产而不部署新二进制，不引入回归。**

依据：

1. 旧二进制模型字段本就是 `Option<DateTime<Utc>>`（`svc/wms/src/models/outbound_order.rs:49/51/55/57/143/152/153`，TIMESTAMPTZ），与迁移后的列类型一致；迁移前是 DB `date` 与模型不匹配，任何有数据的列表/详情/创建/更新/发货读回都会因 sqlx 解码失败而 500。
2. 迁移后旧二进制立刻可正常解码；旧二进制写入若带非 0 时分秒也仍是合法 `timestamptz`，不影响 `actual <= expected` 的日期判定。
3. 新二进制只是把写入归一为 `+08 当日 00:00`，并把 `analytics` 的差值先落 `date`。因此迁移不依赖新二进制即可独立上线。

窗口顺序：备份 → 迁移 → 类型/行数校验 → 部署新二进制 → 健康检查 → 非超户验收。任一步失败即停止，不进入下一步。

**停机边界**

- 迁移：**不停机**。对 0 行表执行 `ALTER COLUMN TYPE`，持有 `ACCESS EXCLUSIVE` 锁，毫秒级完成；迁移内 `lock_timeout=5s`，拿不到锁即失败并整体回滚（`psql -1` 单事务）。
- 二进制切换：**短暂停服**。`launchctl kickstart -k` 重启进程；停服窗口目标 ≤ 2 分钟，期间 WMS 请求连接失败（5xx/拒绝连接），不产生半写数据。

## 3. 执行命令与期望输出

> 以下 `psql`/`launchctl` 命令均在**生产机**执行。先在生产机准备一次：
>
> ```bash
> export PGPASSWORD=$(sed -n 's#.*postgres://topems_prod:\([^@]*\)@localhost:5432/topems_prod.*#\1#p' \
>   ~/Library/LaunchAgents/com.topems.server.plist | head -1)
> alias psql=/opt/homebrew/bin/psql
> ```

### 3.1 备份（窗口前，**结构与数据**）

```bash
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p ~/topems/backups
pg_dump -h 127.0.0.1 -U xingzhai -d topems_prod \
  -t wms.outbound_orders -t wms.outbound_order_items \
  -f ~/topems/backups/w7b4_wms_shipdate_before_$TS.sql
psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc \
  "select 'orders='||count(*) from wms.outbound_orders;
   select 'items='||count(*) from wms.outbound_order_items;"
```

- **dump 必须用超户**：两表为 `FORCE ROW LEVEL SECURITY`，用 `topems_prod` 导数据段会报
  `query would be affected by row-level security policy for table "..."` 并以非 0 退出，产出残缺文件。
- **不要加 `--schema-only`**：本备份必须同时含结构与数据。
- **0 行也要留证**：文件里应出现两段 `COPY wms.<table> (...) FROM stdin;`，各自紧跟一行 `\.`，中间无数据行。
- 行数由上面的 `psql`（非超户）单独记录，与 dump 互为交叉验证。

期望：结构（两表 `CREATE TABLE`）+ 数据段（两条 `COPY` 各 0 行）齐全；`orders=0`、`items=0`；备份文件含两列 `date` 定义。

### 3.2 预检（只读）

```bash
PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=8000' \
psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc "
select table_name||'.'||column_name||'='||data_type||'|nullable='||is_nullable
  from information_schema.columns
 where table_schema='wms' and table_name='outbound_orders'
   and column_name in ('expected_ship_date','actual_ship_date');"
```

期望：

```
outbound_orders.expected_ship_date=date|nullable=YES
outbound_orders.actual_ship_date=date|nullable=YES
```

### 3.3 交付并执行迁移（表属主身份，单事务）

从构建机交付三个文件（迁移、回滚、更新后的 checksums）：

```bash
# 在 /tmp/topems-wms（w7-b4-wms 分支，含本次提交）执行
ssh xingzhai@192.168.110.115 'mkdir -p ~/topems/database_tmp'
rsync -avzP \
  database/migrations/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.sql \
  database/rollback/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.rollback.sql \
  database/checksums.txt xingzhai@192.168.110.115:~/topems/database_tmp/

# 生产机
mkdir -p ~/topems/database/rollback
cp ~/topems/database_tmp/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.sql ~/topems/database/migrations/
cp ~/topems/database_tmp/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.rollback.sql ~/topems/database/rollback/
cp ~/topems/database_tmp/checksums.txt ~/topems/database/checksums.txt
cd ~/topems && ./scripts/migration/validate.sh
```

期望：`validate.sh` 输出 `Errors: 0`，checksum 无不匹配。

执行迁移：

```bash
psql -h 127.0.0.1 -U topems_prod -d topems_prod -1 -v ON_ERROR_STOP=1 \
  -f ~/topems/database/migrations/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.sql
```

期望 NOTICE（4 条，顺序固定）：

```
NOTICE:  wms.outbound_orders.expected_ship_date: date -> timestamptz (Asia/Shanghai)
NOTICE:  wms.outbound_orders.actual_ship_date: date -> timestamptz (Asia/Shanghai)
NOTICE:  wms.outbound_order_items.expected_ship_date: 当前=<不存在>，跳过
NOTICE:  wms.outbound_order_items.actual_ship_date: 当前=<不存在>，跳过
```

### 3.4 迁移后校验（只读）

```bash
psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc "
select table_name||'.'||column_name||'='||data_type
  from information_schema.columns
 where table_schema='wms' and table_name='outbound_orders'
   and column_name in ('expected_ship_date','actual_ship_date') order by column_name;
select 'orders='||count(*) from wms.outbound_orders;
select 'items='||count(*) from wms.outbound_order_items;"
```

期望：

```
outbound_orders.actual_ship_date=timestamp with time zone
outbound_orders.expected_ship_date=timestamp with time zone
orders=0
items=0
```

### 3.5 部署二进制（构建机 → 生产，短暂停服）

```bash
# 构建机：从含本次提交的仓库构建交付包（w7-b4-wms 分支；未推送时即从 /tmp/topems-wms 构建）
cd /tmp/topems-wms && ./scripts/release/build-release.sh
PKG=$(ls -t ~/topems-release/topems-server-*.tar.gz | head -1)
rsync -avzP "$PKG" "xingzhai@192.168.110.115:~/topems/releases/"

# 生产机：校验 → 备份旧二进制 → 替换 → 重启 → 探针
cd ~/topems/releases
PKG=$(ls -t topems-server-*.tar.gz | head -1)
tar xzf "$PKG" && cd "${PKG%.tar.gz}"
cat VERSION && file topems-server
cp ~/topems/bin/topems-server ~/topems/bin/topems-server.prev
cp topems-server ~/topems/bin/topems-server
launchctl kickstart -k gui/501/com.topems.server
sleep 2
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8099/health
```

期望：`200`；`~/topems/bin/topems-server.prev` 存在（回滚锚点）。

### 3.6 非超户验收（禁止超户 token）

前置：确认验收 DB 角色属性

```bash
psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc \
  "select rolname||'|rolsuper='||rolsuper||'|rolbypassrls='||rolbypassrls
     from pg_roles where rolname='topems_prod';"
```

期望：`topems_prod|rolsuper=f|rolbypassrls=f`。API 断言使用**非超户业务账号**登录取得的 `TOKEN`，`BASE=http://127.0.0.1:8099`。

| # | 断言 | 原始命令 | 期望 |
|---|---|---|---|
| A1 | 出库列表不 panic | `curl -s -w '\n%{http_code}\n' -H "Authorization: Bearer $TOKEN" "$BASE/api/wms/outbound-orders?page=1&page_size=20"` | `200`；`data.orders=[]`、`data.total=0`；无 500 |
| A2 | 出库详情不存在 → 404 | `curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" "$BASE/api/wms/outbound-orders/00000000-0000-0000-0000-000000000000"` | `404` |
| A3 | 统计 SQL 不再 interval 错误（本次改动唯一命中点） | `curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" "$BASE/api/wms/analytics/order-fulfillment?start_date=2026-01-01&end_date=2026-12-31&group_by=month"` | `200` |
| A4 | 健康检查 | `curl -s -o /dev/null -w '%{http_code}\n' "$BASE/health"` | `200` |
| A5 | 类型锁定 | 见 3.4 类型查询 | 两列 `timestamp with time zone` |
| A6 | 数据不变 | 见 3.4 行数查询 | `orders=0`、`items=0` |
| A7 | RLS 未被破坏 | `psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc "select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='wms' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity)||'|'||(select count(*) from pg_policies where schemaname='wms');"` | `37|42`（与窗口前基线一致） |

> 本窗口**不造业务数据**。0 行时 A1 不会触发行解码，因此生产以「读路径 200 + 统计 200 + 类型正确」验收；两列的真实行解码（列表/详情 `expected/actual`）已由副本矩阵 F 组覆盖：`expected_delivery=2026-11-04T16:00:00Z`、`actual_delivery` 以 `T16:00:00Z` 结尾。

### 3.7 窗口后观测（24h）

- WMS 5xx 日志中不得出现 `error decoding` / `unexpected type` / `sqlx::Error::ColumnDecode`（漂移期典型错误）。
- `wms.outbound_orders` / `outbound_order_items` 行数按业务自然增长；非空发货日期在 `Asia/Shanghai` 下小时数为 0：
  ```bash
  psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc \
    "select count(*) from wms.outbound_orders
      where expected_ship_date is not null
        and extract(hour from expected_ship_date at time zone 'Asia/Shanghai') <> 0;"
  ```
  期望：`0`。

## 4. 回滚

### 4.1 数据库回滚

```bash
psql -h 127.0.0.1 -U topems_prod -d topems_prod -1 -v ON_ERROR_STOP=1 \
  -f ~/topems/database/rollback/20261112160000_w7_b4_wms_outbound_ship_date_timestamptz.rollback.sql
psql -h 127.0.0.1 -U topems_prod -d topems_prod -Atc "
select table_name||'.'||column_name||'='||data_type
  from information_schema.columns
 where table_schema='wms' and table_name='outbound_orders'
   and column_name in ('expected_ship_date','actual_ship_date') order by column_name;"
```

期望 NOTICE：两列 `timestamptz -> date`、items 两条跳过；类型查询输出：

```
outbound_orders.actual_ship_date=date
outbound_orders.expected_ship_date=date
```

丢失内容：时分秒被截断。按应用写入口径恒为 `+08 当日 00:00`，不丢业务信息；若有人绕过应用写入非 0 时分秒，会丢失该时间。

**注意**：回滚到 `date` 后，两个版本的二进制模型都是 `DateTime<Utc>`，**一旦有数据读接口仍会 500**（回到已知漂移态）。因此 DB 回滚仅适用于「窗口内、两表仍为 0 行」且决定整体放弃本次变更的场景。

### 4.2 二进制回滚

```bash
launchctl kickstart -k gui/501/com.topems.server   # 如已停服则跳过
cp ~/topems/bin/topems-server.prev ~/topems/bin/topems-server
launchctl kickstart -k gui/501/com.topems.server
sleep 2
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8099/health
```

期望：`200`。旧二进制与 `timestamptz` 兼容，**单独回滚二进制是安全的**。

### 4.3 同时回滚的顺序

仅当决定整体放弃：**先停服（`launchctl bootout gui/501/com.topems.server`）→ DB 回滚 → 启动旧二进制**。不得在服务运行且有写入时把列改回 `date`。

## 5. 验收判据汇总

进入窗口的必要条件（全部满足）：`cargo fmt --check`、`clippy -D warnings`、`cargo test -p topems-wms`、`validate.sh`（Errors=0）、`check-migration-names --strict`、静态 `check-schema-defense.mjs`、属主身份 `schema-defense-check`（missing=0、无 `must be owner` 跳过）全绿；副本矩阵 A/A2/B/C/D/E/F 全绿。

退出窗口的充分条件：3.4 类型/行数、3.6 A1–A7 全部符合期望；否则按 §4 回滚。

## 6. 不在本次窗口

- 连接池容量：`topems-wms` 独立进程池硬编码 10、收货路径提交后另开只读作用域导致 20 并发 `pool timed out`（10s）；生产单体 WMS 模块池 max=2（有效并发 1，`DB_MAX_CONNECTIONS=8` 在嵌入路径不生效）。事实、实测旁证与撞墙阈值见计划文档 §7，单独立项，本窗口不改池大小。

## 7. 窗口复盘（2026-11-12）

### 7.1 结果

- 迁移走 sqlx migrator，只应用 `20261112160000`；账本 max `20261112104000 → 20261112160000`（count 665 → 666，`success=true`），checksum 已追加到 `database/checksums.txt`。
- 两列 `date → timestamp with time zone`；两表仍 0 行；`wms` RLS 仍 `37` 表强制、`pg_policies=42`。
- 二进制由 `w7-b4-wms` HEAD `c9f3f8bcb` 构建，安装后 mtime 晚于提交时间；`launchctl kickstart -k` 后 pid `6315 → 97708`，健康检查 200，停机约 4 秒。
- 非超户 token 顺序验收 A1–A7 全部符合期望，未触发回滚。

### 7.2 教训：方案与派单纪律口径冲突

- **事实**：本方案 §3.1 原写作 `pg_dump ... --schema-only`（只备结构）；派单纪律要求"备份要含两表**结构与数据**（0 行也要留证）"。执行严格照方案做，导致窗口备份缺少数据段，事后才发现与更严的派单口径不符。
- **根因**：方案先定稿、派单纪律后到；执行前没有做"方案条目 ↔ 派单硬要求"的逐条对照，默认方案即派单的完整落地。
- **处置**：当次不接受回滚（数据面为零、当日 03:00 全库 dump 含两表 `TABLE DATA` 段），改为补一份"变更后留存"的含数据段 dump（`tables_after_with_data_<TS>.sql`，超户导出、两条 `COPY` 各 0 行），并把 §3.1 改为"结构+数据"。
- **衍生发现**：数据段必须超户导出——两表 `FORCE ROW LEVEL SECURITY`，非超户 `pg_dump` 会直接报错退出并留下残缺文件。原 §3.1 用 `topems_prod` 导出数据本就跑不通。

### 7.3 流程改进

1. 派单的硬要求先落成"窗口执行清单"，方案的每条命令必须能映射到清单条目；映射不上就是方案缺口。
2. 方案与派单口径冲突时，**以更严者为准**，并在开窗前停下确认，不按"方案已批准"自行取宽。
3. 备份类步骤的验收要落到产物内容（有无 `COPY`/`\.`），而不是只看命令退出码与文件存在。
