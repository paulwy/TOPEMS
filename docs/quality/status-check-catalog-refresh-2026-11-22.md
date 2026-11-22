# B150 · 状态 CHECK 目录刷新与门禁接线

日期：2026-11-22

## 背景

B149 在本地实际应用了一批历史候选，`pg_constraint` 中的状态 CHECK 已从 215 条增至 270 条，但 `docs/database/status-check-catalog.json` 仍是 B1 时点快照，`dump-status-checks.mjs --check` 开始报漂移。

## 本轮处理

- 用本地 `topems` 库重生成 `docs/database/status-check-catalog.json`。
- 目录读数：**270 条状态 CHECK / 5 个 PostgreSQL ENUM 类型 / 452 个无约束状态列**；此前为 215 / 5 / 507。
- `node scripts/ci/dump-status-checks.mjs --dsn 'postgresql:///topems?host=/tmp' --check` PASS。
- `lefthook.yml` 新增 `status-catalog` 钩子：当目录、`database/migrations/**` 或 `svc/*/migrations/**` 变更时自动跑 `--check`，防止状态约束与目录再次漂移。
- 状态枚举队列维持 144 枚举 / 152 值、`resolved_enums=144`；盘点维持 208 Rust 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0。
- 生产快照仍只读，未应用；生产真实 CHECK 数要等发布窗口逐条执行候选并 `VALIDATE` 后才会追上。

## 说明

`status-check-catalog.json` 只记录 DB 中已存在的 CHECK，不代表所有候选都已在生产落地。本地 270 条是候选应用后的现状；生产仍以发布窗口执行结果为准。
