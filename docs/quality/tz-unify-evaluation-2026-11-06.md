# `20261106000000_tz_unify_timestamp_without_tz` 评估与执行方案

- 日期：2026-11-06
- 范围：**仅评估 + 本地演练**；prod 全程只读（`SELECT` / `information_schema` / `pg_catalog`），未执行任何 DDL
- 迁移文件：[20261106000000_tz_unify_timestamp_without_tz.sql](../../database/migrations/20261106000000_tz_unify_timestamp_without_tz.sql)
- 账本校验：[checksums.txt](../../database/checksums.txt) 第 485 行已有条目（本轮未改动）

---

## 0. 结论先行

| 环境 | 待转换列 | 预计 DDL 次数 | 预计窗口 |
| --- | --- | --- | --- |
| **prod（`topems_prod`）** | **0 列 / 0 表** | **0 次 ALTER** | **1–2 分钟（只写账本 1 行）** |
| 本地 `topems` | 26 列 / 9 表 | 26 次 ALTER | 实测 **87.5 ms** |
| 新装库（按迁移链建库） | 0 列 | 0 次 | 秒级 |

**prod 已完成同类迁移**：账本中 `20261103170000` / `20261103173000` / `20261104100000` 等已把
naive timestamp 全部转成 `timestamptz`，现场实测 3788 个时间列**全部为 `timestamp with time zone`**，
naive 计数为 **0**。因此本迁移在 prod 属**幂等空转**（DO 块 0 次循环，只有账本 INSERT）。

- 风险分级：**prod = 无**；带数据环境 = **低**（表重写，逐列 `ACCESS EXCLUSIVE`，`lock_timeout=5s` 保护）
- 推荐方案：**方案 A（单事务一次性）**，prod 窗口 5 分钟内可完成
- 不建议为 prod 采用「新增列 + 回填 + 切换 + 删旧列」在线路径（**没有可转换的列，零收益**）

---

## 1. 迁移内容逐项拆解

### 1.1 机制

```sql
SET lock_timeout = '5s';
SET statement_timeout = '0';
DO $$
  FOR r IN (SELECT ... pg_attribute WHERE atttypid = timestamp without time zone ...)
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE %s USING %I AT TIME ZONE ''UTC''', ...);
  END LOOP;
END $$;
```

- 方向：**`timestamp without time zone` → `timestamptz`**（单向升格，非反向）
- 语义：旧值一律按 **UTC** 解释（`USING col AT TIME ZONE 'UTC'`）
- 幂等：每列先按当前类型筛选，空库新装为 0 次操作；重复执行不报错
- 精度：按 `atttypmod` 动态保留 `timestamp(n)`（现场实测无 `timestamp(n)`）

### 1.2 逐表清单（本地实测，prod 同表已全部为 timestamptz）

| # | 表 | 列 | 默认值 | NOT NULL | 索引引用 | 行数 | 总大小 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `finance.core_finance_currencies` | `created_at` / `updated_at` | `CURRENT_TIMESTAMP` | 是 | 0 | 16 | 40 kB |
| 2 | `mes.workshops` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 3 | `mes.production_lines` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 4 | `mes.shifts` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 5 | `mes.work_calendars` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 6 | `public.workshops` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 7 | `public.production_lines` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 8 | `public.shifts` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |
| 9 | `public.work_calendars` | `created_at` / `updated_at` / `deleted_at` | `now()` | 否 | 0 | 0 | 24 kB |

- 合计 **26 列 / 9 表 / 232 kB**；除 `finance` 16 行外全部 0 行
- **索引**：9 表在受影响列上均无索引（`idx_ref=0`）；主键/唯一键/CHECK/外键均不引用这些列
- **视图/物化视图**：0（`pg_depend` 实测无引用）
- **生成列**：0（全库仅 `erp.fixed_assets` 两列，与本迁移无关）
- **分区表**：0
- `deleted_at` 无默认值，转换后仍为 NULL 语义

### 1.3 prod 侧现状（只读实测）

| 表 | 是否存在 | 行数 | 大小 | 时间列类型 |
| --- | --- | --- | --- | --- |
| `finance.core_finance_currencies` | 是 | 0 | 40 kB | `timestamptz` |
| `mes.workshops` / `production_lines` / `shifts` / `work_calendars` | 是 | 0 | 24–32 kB | `timestamptz` |
| `public.workshops` / `production_lines` / `shifts` / `work_calendars` | **否**（P4a 系列已删影子表） | — | — | — |

- 全库时间列：`timestamp with time zone` = **3788**，`timestamp without time zone` = **0**
- 表空间：全部 `pg_default`；库大小 73 MB；PG `18.4`，`TimeZone = Asia/Shanghai`（会话显示时区，不影响 UTC 存储）
- 账本：`20261106000000` **尚未应用**（窗口内曾被显式 defer）

---

## 2. 锁与重写评估

### 2.1 重写成本

`timestamptz → timestamp` 与 `timestamp → timestamptz` 都**不是二进制兼容**（内部语义不同，
`USING ... AT TIME ZONE` 会逐行求值），PostgreSQL 对 `ALTER COLUMN TYPE` 必然**重写表 + 重建该列索引**，
并持有该表 `ACCESS EXCLUSIVE`。

本地基准（克隆库内构造 30 万行 / 21 MB / 1 个索引，naive → timestamptz）：

```text
ALTER TABLE public.tz_bench ALTER COLUMN ts TYPE timestamptz USING ts AT TIME ZONE 'UTC';
时间：116.437 ms      -- 含索引重建，约 0.39 µs/行、~180 MB/s
```

| 场景 | 行数/大小 | 预计 ACCESS EXCLUSIVE | 说明 |
| --- | --- | --- | --- |
| prod 9 表 | 全部 0 列待转 | **0 ms**（不执行 ALTER） | 只写账本 |
| 本地 9 表 | 16 行 / 232 kB | 实测单列 0.95–7.26 ms，合计 87.5 ms | 见第 5 节 |
| 假设某表 100 万行 / 100 MB | — | ≈ 0.4 s / 列（磁盘写放大另计） | 按 0.39 µs/行外推 |

> `lock_timeout=5s` 的语义：**等不到锁就快速失败，不会长时间挂住**；单条 ALTER 的重写时间本身不受
> `lock_timeout` 约束（它只限制“等锁”）。重写期间该表所有读写阻塞。

### 2.2 是否用「新增列 + 回填 + 切换 + 删旧列」

| 维度 | 结论 |
| --- | --- |
| prod 是否必要 | **不必要**：0 列待转，在线路径没有可操作对象 |
| 带数据环境是否更优 | **不一定**：需 2 倍列存储 + 双写期 + 回填 2 次全表扫描 + 切表名/视图/外键重绑，操作复杂度显著高于 26 列小表 |
| 例外 | 若某表 > 数千万行且不允许秒级阻塞，才值得上在线路径；本仓库实际规模不触发 |

---

## 3. 兼容性核对

### 3.1 Rust / sqlx 解码

| 位置 | 现状 | 影响 |
| --- | --- | --- |
| [currencies.rs](../../svc/finance/src/modules/currencies.rs#L29-L30) | 模型 `DateTime<Utc>`；SQL 显式 `created_at::timestamptz` | 已写死 cast，**类型转换前后均正常** |
| [basics.rs](../../svc/mes/src/modules/basics.rs#L96-L196) | 模型 `DateTime<Utc>`；SELECT 直接取 `created_at, updated_at`（无 cast） | 迁移**前**若表有行，naive 列无法解码成 `DateTime<Utc>`；迁移**后**匹配。本地 0 行掩盖了该隐患，prod 已是 timestamptz |
| [schema_defense.rs](../../svc/mes/src/models/schema_defense.rs#L26) | 断言期望 `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 迁移后与代码期望**一致**（当前本地为 naive，属 schema 漂移） |
| `.sqlx/` 离线缓存 | 无 `workshops` / `production_lines` / `shifts` / `work_calendars` / `core_finance_currencies` 相关 query 文件 | **无需** `cargo sqlx prepare` |
| 宏 vs 运行时 SQL | 这些模块使用 `sqlx::query(...)` + 运行时字符串（`format!`） | 不依赖 `.sqlx` 缓存 |
| `AT TIME ZONE` / `SET TIME ZONE` | Rust 代码中**无** `AT TIME ZONE` 字面量用法 | 无会话时区依赖 |

### 3.2 默认值与时区语义

- `now()` / `CURRENT_TIMESTAMP` 在列改为 `timestamptz` 后**原生匹配**（不再是隐式 cast），行为不变；
- prod 会话 `TimeZone = Asia/Shanghai`，但迁移用 `AT TIME ZONE 'UTC'` 解释旧值，与
  `deploy/docker/docker-compose.yml`、`deploy/k8s/base/postgres.yaml` 的 `TZ=UTC/PGTZ=UTC` 前提一致；
- 既有先例 `20261103170000`（5433 库）、`20261103173000`（174 列）已经按同一口径执行。

### 3.3 本地 vs prod 类型差异

| 项 | 本地 `topems` | prod `topems_prod` |
| --- | --- | --- |
| naive timestamp 列 | **26**（9 表） | **0** |
| timestamptz 列 | 其余全部 | **3788**（全部时间列） |
| 账本 `20261106000000` | 未应用 | 未应用（defer） |
| `public.core_*` 影子表 | 已不存在（与基线一致） | 已不存在 |

> `scripts/date-type-baseline.json` 登记 28 条（源码口径），`python3 scripts/date-type-audit.py --sql`
> 输出 **“基线登记 28 列；仍待迁移 0 列；✅ 无时区 timestamp 列已归零”**（该脚本按迁移声明判覆盖，
> 不代表运行库实例状态）。

---

## 4. 执行方案设计

### 4.1 方案 A：单事务一次性（推荐，尤其 prod）

- 执行方式：`psql -X -v ON_ERROR_STOP=1 -f <迁移文件>`（`apply-forward.sh --only 20261106000000` 写账本）
- 事务边界：整个 `DO $$ ... $$` 是**单条语句**，任一列失败 → 全部 ALTER 回滚 → 无中间态
- 锁：逐列 `ACCESS EXCLUSIVE`；`lock_timeout=5s`，等不到锁即失败（可安全重试，迁移幂等）
- 中止点：
  1. 前置断言：待转列数 = `baseline` 口径数（prod 期望 **0**，本地期望 26）
  2. `NOTICE: 处理 N 列` 与期望一致
  3. 后置断言：naive 计数 = 0；`20261106000000` 出现在 `_sqlx_migrations`
  4. 冒烟：受影响表 `SELECT` 200 + 一条 `INSERT ... RETURNING created_at` 时间戳合理
- 失败回滚：事务自动回滚；若已提交则按 4.3 反向 ALTER
- 可用性预期：prod **无阻塞**（0 列）；带数据环境单表阻塞 = 该表重写耗时（本地 26 列合计 87.5 ms）

### 4.2 方案 B：分表分段（仅当某表大到不可接受时）

- 拆分为「每表一个事务」，各自 `SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'`
- 优点：单表失败只影响该表；已成功表保持已转换（迁移幂等，可断点续跑）
- 缺点：**存在中间态**（部分表 timestamptz、部分 naive），应用需同时容忍两种类型
  （`basics.rs` 的直接解码路径在 naive 表有行时会报错）
- 中止点（任一触发即停）：某表锁等待超 3s 连续 2 次；单表重写超 30s；转换后计数不符；应用 5xx
- 回滚：对已转换表逐列反向 ALTER（见 4.3），顺序与正向相反

### 4.3 反向是否可逆 / 会不会丢时区信息

```sql
ALTER TABLE <schema>.<table> ALTER COLUMN <col> TYPE timestamp USING <col> AT TIME ZONE 'UTC';
```

| 情形 | 结果 |
| --- | --- |
| 迁移前旧值本就按 UTC 写入（本仓库前提） | **完全可逆**，往返 epoch 不变（本地演练指纹 `20187a24…` 前后一致） |
| 迁移后应用继续写入 | 存的是绝对时刻，反向 `AT TIME ZONE 'UTC'` 仍可还原同一 epoch |
| 迁移后若有人按「本地时区」语义写 naive | 反向后与原值差一个时区偏移（**这是唯一的信息失真来源**） |
| 原始 offset 信息 | 从未存储，故不“丢失”（反向不引入新损失） |

> 结论：在“旧值=UTC、应用只用 `Utc::now()`”前提下，反向 ALTER **无损**。

---

## 5. 本地演练记录（克隆库 `topems_tz_drill_20261106`，`createdb -T topems`）

### 5.1 逐列耗时（instrumented 复刻同一 DDL，`clock_timestamp()` 计时）

| 表 | 列耗时（ms） | 表小计 |
| --- | --- | --- |
| `finance.core_finance_currencies` | 7.26 / 2.09 | 9.35 |
| `mes.production_lines` | 2.21 / 1.57 / 1.47 | 5.25 |
| `mes.shifts` | 2.05 / 1.81 / 1.75 | 5.61 |
| `mes.work_calendars` | 2.25 / 1.79 / 1.71 | 5.75 |
| `mes.workshops` | 1.68 / 1.46 / 1.25 | 4.39 |
| `public.production_lines` | 1.54 / 1.22 / 1.21 | 3.97 |
| `public.shifts` | 1.32 / 1.25 / 1.61 | 4.18 |
| `public.work_calendars` | 2.03 / 1.17 / 1.16 | 4.36 |
| `public.workshops` | 1.23 / 1.11 / 0.95 | 3.29 |
| **合计** | **26 列** | **DO 块 87.507 ms**（含首列 catalog 预热） |

### 5.2 锁表现

| 实验 | 现象 |
| --- | --- |
| 无竞争 | 每列 `ACCESS EXCLUSIVE` 持有 1–7 ms，无等待 |
| 会话 A 持 `ACCESS EXCLUSIVE` 10 s，会话 B 跑真实迁移 | **5.14 s 后失败**：`ERROR: canceling statement due to lock timeout` |
| 失败后该列状态 | 仍为 `timestamp without time zone`（**原子回滚**，未留半成品） |
| 幂等复跑（迁移成功后再执行） | `NOTICE: 处理 0 列`，无报错 |

### 5.3 数据与结构一致性

| 检查 | 结果 |
| --- | --- |
| 迁移后 naive 列 | **0** |
| 默认值 | `now()` / `CURRENT_TIMESTAMP` 保留（字符串不变） |
| 16 行 `core_finance_currencies` 指纹 | 迁移前 `20187a243818c5918a55e55f97e41488` → 迁移后**完全一致** |
| 值语义 | `2026-10-21 18:32:45+08` ⇔ `AT TIME ZONE 'UTC'` = `2026-10-21 10:32:45`（UTC 解释正确） |
| 索引/约束 | 9 表索引 18 个全部保留，未手工重建 |

### 5.4 应用侧读写路径（SQL 层，覆盖 9 表等价路径）

```text
INSERT mes.workshops            → created_at 2026-11-06 18:10:43.899472+08 ✅
INSERT mes.shifts               → created_at ✅
INSERT mes.production_lines     → created_at ✅
INSERT mes.work_calendars       → created_at ✅
INSERT finance.core_finance_currencies → created_at::timestamptz ✅
SELECT id, code, ... created_at, updated_at FROM workshops（应用真实列清单）→ 1 行 ✅
UPDATE ... SET deleted_at = NOW() → 软删时间写入 ✅
ROLLBACK 后复查 → 0 行（演练无残留）✅
```

> 说明：本地单体服务未运行（8099 未监听），故应用层以「真实 SQL 形状 + 模型列清单」验证；
> `DateTime<Utc>` 与 `timestamptz` 类型匹配已在第 3 节静态核对，且 `schema_defense` 断言与迁移后期望一致。

---

## 6. 推荐方案与窗口

| 项 | 建议 |
| --- | --- |
| 执行顺序 | prod：`apply-forward --only 20261106000000`（白名单内、单事务、写账本）→ 后置断言 → 冒烟 |
| 预计窗口 | **prod 1–2 分钟**（0 次 ALTER，仅账本 + 后置核对）；若夹带部署则按部署窗口另算 |
| 服务可用性 | prod 无 `ACCESS EXCLUSIVE`，无需摘流量；其他环境单表毫秒级阻塞 |
| 回滚判据 | ① `NOTICE` 列数 ≠ 期望；② 任一列 lock timeout/报错；③ 后置 naive 计数 ≠ 0；④ 受影响表读接口 5xx；⑤ 时间戳值偏移 > 1 分钟 → 立即停并反向 ALTER |
| 回滚动作 | 事务内失败：自动回滚；已提交失败：逐表 `USING col AT TIME ZONE 'UTC'` 反向 + 复跑冒烟 |
| 迁移文件 | **不改字节**（checksums 第 485 行已登记）；如需修补只新增后续迁移 |

---

## 7. 执行前状态（2026-11-06 18:25 前）

- prod 未执行任何 DDL/账本写入；
- 未启动窗口、未改迁移文件、未改 `checksums.txt`；
- 演练克隆库 `topems_tz_drill_20261106` 已用后即弃（不进入任何发布物）。

---

## 8. 执行记录（2026-11-06 18:25–18:29，方案 A + 本地对齐）

### 8.1 prod 短窗口：**零操作**（仅账本 1 行）

| 项 | 值 |
| --- | --- |
| 主机 / 库 | `xingzhai@192.168.110.115` / `topems_prod`（SSH 执行物模式） |
| 执行物 | `/tmp/topems_window_tz_20261106/20261106000000_tz_unify_timestamp_without_tz.sql` |
| sha256（本地 = 远端） | `c9d4143656f6ec3a04ad8d2e3e2f58f915328324a78a53d2b8e33fbdb8986cb6` |
| 守卫 | `check-destructive-sql --check-file` → `OK`（DO 块内 `pg_catalog`/`pg_attribute` 为守卫窗口） |
| 命令 | `WINDOW_TARGET=prod apply-forward.sh --prod --anchor 20261105235700 --only 20261106000000 --defer <16 条>` |
| 窗口起止 | `18:25:28` → `18:25:34`，**6 s**（扫描 + 单事务执行 + 账本写入） |
| 白名单拒绝 | 清单外 0 条；白名单版本被扫描到 1/1；`--only` + `--defer` 覆盖全部 17 条 pending |
| 账本前 | `total=578`、`max(version)=20261107000013` |
| 账本后 | `total=579`、`max(version)=20261107000013`（新行 version 小于当前 max，max 不变） |
| 新增 | **仅** `20261106000000`，`success=t`、`execution_time=0`、`installed_on=2026-11-06 18:25:34.052375+08` |
| checksum（账本） | `6231cd0ad147ce079a7b5460aca045dc36c2f20e9a276dbabd7dd5dd9d6444443a70feb3074054cd4a3aceda252102f3`（= 本地 `shasum -a 384`） |
| prod NOTICE | `NOTICE:  B4 timestamp→timestamptz 归一：处理 0 列` |
| naive 列（前/后） | `0 / 0` |
| 服务 pid（前/后） | `74405 / 74405`（`state=running`，`last exit code=(never exited)`；**未重启**） |
| `audit_logs`（前/后） | `362 / 362`（冒烟通知不写审计） |

执行后仍 pending 的 **16 条**（账本 `IN (...)` 计数 = 0，全部保持未应用）：

`20261105235800`、`20261106000001`、`20261107000001`、`20261107000002`、`20261107000003`、
`20261107000004`、`20261107000005`、`20261107000006`、`20261107000007`、`20261107000009`、
`20261107000010`、`20261107000011`、`20261107000012`、`20261107000014`、`20261107000015`、
`20261107000016`。

冒烟（4 项，prod 主机内以 `JWT_SECRET` 现签 15 分钟 token，未落盘）：

| 检查 | 结果 |
| --- | --- |
| 超管字典列表 | HTTP 200，`total=77`，legacy 4 类齐全 |
| 探针租户 `1111…`（`wangy`） | HTTP 200，`total=0`（无系统字典泄露） |
| 通知创建 | HTTP 200（`id=7752a939-…`） |
| 补测租户 `…0001` | HTTP 200，`total=77` |
| `/health` | 200 `{"data":"healthy"}` |
| `/api/server/ready` | 200 `{"status":"ready","degraded_modules":[]}` |
| `/api/server/health` | 200 `{"status":"ok","server":"topems-server","modules":31,…}` |

> 结论：prod 侧 **26 列均为 0 次 ALTER**，窗口内无 `ACCESS EXCLUSIVE`、无表重写、无重启；
> 与第 0 节评估一致，属幂等空转 + 账本登记。

### 8.2 本地 `topems` 对齐

备份（`/tmp/tz_local_backup/`）：

| 产物 | 内容 |
| --- | --- |
| `finance_core_finance_currencies_before.csv` | 16 行整行（含 `created_at`/`updated_at`），md5 `7b46b3f6…` |
| `columns_before.txt` | 26 个 naive 列 × 9 表（列名 + 类型） |
| `indexes_before.txt` | 9 表索引 **18 个** |
| 另 8 表 CSV | `mes.*` / `public.*` 各 0 行（md5 为纯表头） |

执行（`apply-forward.sh --db topems --anchor 20261105235700 --only 20261106000000`，defer 13 条）：
`NOTICE: B4 timestamp→timestamptz 归一：处理 26 列`；本地账本 `551 → 552`。

| 核对项 | 前 | 后 |
| --- | --- | --- |
| naive 列（`atttypid = timestamp without time zone`） | 26 | **0** |
| 26 列类型 | `timestamp without time zone` | **26/26 `timestamp with time zone`** |
| 索引（9 表） | 18 | **18**（`diff` 为空，名称全部保留） |
| finance 16 行 | `created_at` naive | 按 UTC 解释；整行 10 列 **0 字段差异**（UTC 归一后逐字段比对） |
| 值语义对照 | `2026-10-21 10:32:45.733833`（naive，按 UTC） | `2026-10-21 18:32:45.733833+08` ⇔ `AT TIME ZONE 'UTC'` = `2026-10-21 10:32:45.733833` |
| 幂等复跑（直接 `psql -f` 同一文件） | — | `NOTICE: 处理 0 列`，`DO` 成功，无报错、账本未重复写入 |
| 读写往返（事务内 INSERT/SELECT/UPDATE → `ROLLBACK`） | — | `workshops` / `shifts` / `production_lines` / `work_calendars` / `currencies` 全部 `timestamp with time zone` 且读回正常；回滚后残留 `0` 行 |

### 8.3 受影响包测试（`cargo test -p topems-mes -p topems-finance`）

| 测试目标 | 结果 |
| --- | --- |
| `topems-mes` lib/bin | **1086 passed / 0 failed** |
| `topems-finance` bin | **1088 passed / 0 failed**（1 filtered） |
| `topems-mes` `integration_tests` | **45 passed / 2 failed** |
| `topems-finance` `openapi_extract` | **stack overflow**（`extract_openapi_spec`，与时间类型无关） |
| 其余 integration 二进制 | 全部 `ignored`（需外部依赖） |

2 个失败均为**既有 schema/测试口径漂移**，与时间戳类型无关，**未改测试**：

1. `tests::test_batch_record_crud`（`integration_tests.rs:1599`）：插入 `mes.batch_records`
   被 `ck_batch_records_status_standard` 拒绝——测试使用的 `status='in_stock'` 不在当前约束枚举内。
   手工 `psql` 复现为同一 `ERROR: new row ... violates check constraint`。
2. `tests::test_create_production_order_crud`（`integration_tests.rs:224`）：
   `completed_quantity` 列为 `NUMERIC`，测试按 `i64`（`INT8`）解码 → `ColumnDecode mismatched types`。

`openapi_extract` 的栈溢出在改动前后均可复现（OpenAPI 递归展开），与本迁移无关；
加 `--skip extract_openapi_spec` 后，除上述 2 个既有失败外其余用例全绿。
**没有任何测试或断言依赖 naive 时间类型而失败。**

### 8.4 遗留：`mes.basics.rs` 解码隐患（**本轮不改代码**）

- [basics.rs](../../svc/mes/src/modules/basics.rs) 的 `list_workshops` / `list_production_lines` /
  `list_shifts` / `list_work_calendars` 直接用 `SELECT ... created_at, updated_at` 映射
  `r.get::<_, DateTime<Utc>>()`，SQL 未加 `AT TIME ZONE` 转换；
- 列一旦为 naive 且**有数据**，sqlx 解码 `DateTime<Utc>` 会失败（0 行时被掩盖）；
- 本地已对齐为 `timestamptz`（prod 早已是 `timestamptz`），当前不影响这两处环境；
- 仍待处理：其他未迁移库（prepare/5433 等）或未来新建库若残留 naive 列，需二选一——
  加 `AT TIME ZONE 'UTC'` cast，或把迁移链纳入该库初始化；本轮按要求不改代码。
