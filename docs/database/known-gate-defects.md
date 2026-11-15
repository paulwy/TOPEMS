# 数据库门禁已知缺陷登记

编号沿用当前的 K 系列（本文件首条为 **K6**）。每条只登记现状、证据与建议修复方案，不代表已修复。

## K6 ledger-ddl-drift 门禁对「无 _sqlx_migrations 的库」放行

- **位置**：[scripts/migration/check-ledger-ddl-drift.mjs](../../scripts/migration/check-ledger-ddl-drift.mjs)，pre-push 门禁 `ledger-ddl-drift`（`lefthook.yml`）。
- **现象**：目标库可连接但没有 `_sqlx_migrations` 表（空库、新建库、误指其他库）时，清单内 12 项断言全部按「源迁移未记账」打 NOTE 跳过，最后输出 `PASS 断言 12 项，记账校验 0 项` 并 **exit 0**，只留一条 WARN。
- **实测（2026-11-15）**：`MIGRATION_DRIFT_DB_URL` 指向本地 `topems_test`（无账本）执行 `bash scripts/ci/check-ledger-ddl-drift.sh`，输出前述 NOTE 与 `PASS`，退出码 0；同一份代码指向 `topems_prod` 才会真正做结构断言。
- **风险**：该门禁声明为 fail-closed（缺库即失败），但「库可连、账本不存在」被当成「无需校验」，形成**空库放行口子**。CI 或本地一旦把 DSN 误配到空库，账本 vs DDL 漂移门禁即静默失效。
- **本轮不修**：本轮只做 manifest 台账对齐，修门禁判定语义属独立改动；避免在同一提交里混入行为变更。
- **建议修复**：库可连续但 `to_regclass('public._sqlx_migrations') IS NULL` 时直接 `FAILED` + exit 1；若确需演练，只允许显式 `MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1` 放行，并打印库名与 DSN 摘要（不含口令）。
