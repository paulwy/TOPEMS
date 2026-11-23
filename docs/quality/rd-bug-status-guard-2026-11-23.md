# B236 · `rd.bugs.status` 状态守卫（2026-11-23）

## 结论

`rd.bugs.status` 已收敛到唯一 Rust 枚举 `BugStatus`（`open` / `in_progress` / `resolved` / `closed`，默认 `open`）；
创建、更新、列表过滤、状态流转与数据库 CHECK 共用同一值集，非法值返回 400。

## 修复的真实缺陷

1. **列表返回键与前端契约不一致**：后端返回 `items`，`RsBugPage` 读 `response.data.bugs`，列表始终为空；现同时返回 `bugs`（保留 `items` 兼容）。
2. **更新可写任意状态**：`update_bug` 直接 `COALESCE($5, status)` 绑定原始入参，任意字符串可落库；现先解析枚举、校验流转，再绑定归一值。
3. **创建状态靠表默认值隐式落库**：INSERT 未显式写 `status`；现绑定 `BugStatus::DEFAULT`。
4. **列表状态过滤未校验**：任意字符串直接拼进 `status = $1`；现先 `parse_filter`，非法值 400。

## 生命周期

```text
open → in_progress → resolved → closed
  ↘        ↘            ↓
   resolved  closed     open（reopen）
closed → open
```

允许：`open→in_progress/resolved/closed`、`in_progress→open/resolved/closed`、`resolved→open/closed`、`closed→open`；
其余流转返回 400「不允许的缺陷状态流转」。

## 数据库

- 约束：`rd.bugs.ck_rd_bugs_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['open','in_progress','resolved','closed'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 0 行，事务内探针 `bogus` 被 `violates check constraint` 拒绝。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 404 条，`rs` schema）。

## 门禁

- `cargo clippy -p topems-rd --lib --tests -- -D warnings`：通过
- `cargo test -p topems-rd --lib`（`TEST_DATABASE_URL` 指向临时库 `topems_rd_test`）：157 passed
- `dump-status-code-inventory.mjs`：302 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：180 枚举 / 192 值不变（`BugStatus` 四值均已在其他 CHECK 中覆盖）
- mappings：288 条；prod-only：404 条
- 7-in-1 门禁、前端 `npm run typecheck`：见提交记录
