# mdm_subscriptions.starts_at 类型收敛：窗口只读统计与判据

> 对象：`master_data.mdm_subscriptions.starts_at`（当前 `text NOT NULL DEFAULT ''`）
> 草稿迁移：`database/migrations/20261114130000_mdm_subscriptions_starts_at_timestamptz.sql`
> 回滚：`database/rollback/20261114130000_mdm_subscriptions_starts_at_timestamptz.rollback.sql`
> 状态：**草稿，未投递生产**；本文只约束窗口内动作，不代表已排期。

## 只读统计（窗口内跑）

脚本：`database/scripts/mdm_starts_at_window_stats.sql`

```bash
psql "$TARGET_DB_URL" -X -v ON_ERROR_STOP=1 \
  -f database/scripts/mdm_starts_at_window_stats.sql
```

脚本内已设 `default_transaction_read_only = on`，只有 SELECT，不写库、不加排他锁。
输出包含：库身份与 `starts_at` 当前类型、`total/null/empty/invalid/valid` 计数、异常明细样例（最多 20 行）。

## 判据表

| 统计结果 | 含义 | 动作 | 决策人 |
|---|---|---|---|
| `total_rows = 0` | 无存量数据 | 可在窗口内执行迁移草稿（入口 `psql --single-transaction`）；执行后核验列类型、DEFAULT、NOT NULL、约束 | DBA / 发布执行人，留存执行输出 |
| `total_rows > 0` 且 `empty_rows = 0`、`invalid_rows = 0`、`null_rows = 0` | 存量全部为合法 timestamptz 文本 | 可执行迁移草稿；执行前抽样核对转换后的时间值与业务预期（尤其无偏移量字符串），执行后核验同上 | DBA / 发布执行人执行；业务方抽检确认 |
| `total_rows > 0` 且（`empty_rows > 0` 或 `invalid_rows > 0` 或 `null_rows > 0`） | 存量不合规 | **不执行迁移**；只回报各档计数与样例 id，等待数据来源确认与补数/清洗方案 | 业务 / 数据负责人决策；执行人不自行决定，不用 `NULLIF`、不回填固定值、不 `DROP NOT NULL` |

## 补充约束

1. 统计与执行之间存在窗口期：迁移内部会再校验一次，期间新增的空串/非法值同样触发 `RAISE EXCEPTION`，整事务中止。
2. 迁移只做类型收敛：全部合法时执行 `ALTER COLUMN starts_at TYPE timestamptz USING btrim(starts_at)::timestamptz`，并 `DROP DEFAULT`（不安装新默认值，避免静默落值）。
3. 任一门禁失败时数据库保持原状：列类型仍为 `text`、DEFAULT 仍为 `''::text`、NOT NULL 与约束不变。

## 版本号台账

`20261114130000` 这个号此前用于已撤回的 `..._w7_b4_ledger_monotonic_guard.sql`（`78cdae151` 引入，`a9fa83343` 连同回滚与 manifest 条目一起删除）。撤回后，版本单调守卫改为只在迁移入口层实现，数据库层不再有触发器。

复用前核查结果：本机 46 个非模板库的 `_sqlx_migrations` 中该版本行数全部为 0；271 个 ref 的最终树中均无该守卫文件。因此现由 `starts_at` 迁移复用该号。

**复用风险**：若将来从备份恢复一个曾应用过该守卫的库，或基于 `78cdae151` 复建分支，`starts_at` 新文件会被账本判为「该版本已应用」而静默跳过，类型收敛不会执行。届时须先查目标库 `_sqlx_migrations` 是否已有 `20261114130000` 行，再决定是否换号，不可直接按默认路径应用。
