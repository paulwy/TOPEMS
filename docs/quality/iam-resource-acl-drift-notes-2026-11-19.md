# iam.resource_permissions 授权闭环：生产列漂移登记（2026-11-19）

> 本文件只登记偏差点；生产库保持只读，不申请迁移窗口、不做任何写入。

## 1. 偏差点

| 表 | 偏差 | 仓库 DDL（迁移前） | 生产实际 | 处置 |
| --- | --- | --- | --- | --- |
| `iam.resource_permissions` | 多一列 | 无 `deleted_at` | `deleted_at timestamptz NULL`（`scripts/ci/data/prod_cols.psv`，2026-11-09 采集） | 迁移 `20261119010000` 用 `ADD COLUMN IF NOT EXISTS` 幂等补齐，生产已有该列时为 no-op |

## 2. 本轮处置

- 迁移补 `deleted_at`，与生产对齐；生产执行时该语句是 no-op。
- 撤销角色授予 / 移除用户例外一律写 `deleted_at = NOW()`，保留审计，不做物理删除。
- 判定与读取路径全部带 `deleted_at IS NULL`，软删后立即不可见。
- 回滚脚本保留 `deleted_at` 列：删除会连带清掉生产既有审计数据。

## 3. 基线同步

生产列基线（`scripts/ci/data/prod_cols.psv`）无需改动，仓库 DDL 已向生产收敛。
