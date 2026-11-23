# B237 · `pm.project_resources.status` 状态守卫（2026-11-23）

## 结论

`pm.project_resources.status` 已收敛到唯一 Rust 枚举 `ProjectResourceStatus`
（`available` / `in_use` / `maintenance` / `retired`，默认 `available`）；
创建、更新、状态流转与数据库 CHECK 共用同一值集，非法值与非法流转返回 400。

## 修复的真实缺陷

1. **三套值集并存**：数据库默认 `allocated`、后端创建硬编码 `active`、前端色板与筛选只认
   `available` / `in_use` / `maintenance` / `retired`。新建资源在页面上既不显示为可用、也不能执行“释放”动作。
2. **更新可写任意状态**：`update_resource` 直接 `COALESCE($7, status)` 绑定原始入参，任意字符串可落库。
3. **状态可跳过生命周期**：retired 可被改回 available，in_use 可直接跳 retired 后再复用；现 retired 为终态。

## 生命周期

```text
available ↔ in_use ↔ maintenance
     ↘          ↘          ↓
      retired ← retired ← retired
```

允许：`available→in_use/maintenance/retired`、`in_use→available/maintenance/retired`、
`maintenance→available/in_use/retired`；`retired` 不再允许任何出边。
前端“释放”动作 `in_use → available` 保持可用。

## 兼容别名

`allocated` / `active` / `idle` → `available`；`in-use` / `occupied` → `in_use`；
`maintaining` → `maintenance`；`scrapped` → `retired`。仅用于读入归一，写库一律标准化值。

## 数据库

- 约束：`pm.project_resources.ck_project_resources_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['available','in_use','maintenance','retired'])) NOT VALID`
- 旧默认 `allocated` 已改为 `available`。
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 0 行，事务内探针 `bogus` 被 `violates check constraint` 拒绝。
- 参考库：表存在、约束不存在，`status` 仍为 `uncovered`；已登记 `prod-only-status-checks-2026-11-23.json`（第 405 条，`pm` schema）。

## 门禁

- `cargo clippy -p topems-pm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-pm --lib`：533 passed
- `dump-status-code-inventory.mjs`：303 枚举 / 239 值 / 192 不在 DB CHECK / 248 前端键 / 色板缺口 0
- `status-db-check-queue.mjs`：181 枚举 / 192 值
- mappings：289 条；prod-only：405 条
- request-txn / scope-api / txn-2xx / glossary / i18n 7-in-1、前端 `npm run typecheck`：见提交记录
