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

## 7. 本轮未做（等你定窗口）

- prod 未执行任何 DDL/账本写入；
- 未启动窗口、未改迁移文件、未改 `checksums.txt`；
- 演练克隆库 `topems_tz_drill_20261106` 已用后即弃（不进入任何发布物）。
