# B324 菜单/菜单分组状态与软删守卫（2026-11-25）

## 结论

`public.core_menus` 本地 213 行、`public.core_menu_groups` 62 行，状态全部为 `active`；两表 DB CHECK 均限定 `active/inactive/archived`。

- `update_menu` / `update_group` 的 `status = COALESCE($N, status)` 直接接收请求字符串：非法值落库时被 CHECK 拒绝，返回 500 而不是 400；`archived` 记录仍可继续改名称、路径、权限。
- UPDATE 没有当前态谓词，读到 active 后并发改成 archived，仍可继续写入。
- `delete_menu` / `delete_group` 的软删 UPDATE 没有 `deleted_at IS NULL`，重复删除会假成功并刷新 `deleted_at`。

## 代码改动

新增 `svc/unified-core/src/modules/menu/menu_status.rs`：

- `MenuStatus::{Active,Inactive,Archived}`，`DB_VALUES` 与 DB CHECK 对齐；
- `from_db_str` 严格解析、`as_str` 唯一写值；
- `can_transition_to`：active ↔ inactive，二者可归档；archived 终态；
- 2 项单测：值 roundtrip / 未知值拒绝、archived 终态。

`svc/unified-core/src/modules/menu/handlers.rs`：

1. `update_menu` / `update_group` 入口先严格解析 `status`，非法值 400。
2. 写前读取当前状态（带 id、租户、`deleted_at IS NULL`）；不存在 404，当前值不在规范集合 400。
3. 当前为 `archived` 时拒绝任何编辑；目标态与当前态不满足 `can_transition_to` 时 400。
4. 两条 UPDATE 补 `status = 当前态 AND deleted_at IS NULL`；0 行返回“状态已变化或已被删除”，不再返回 404。
5. 写请求显式绑定规范化后的状态字符串，不再把原始请求值直接落库。
6. `delete_menu` / `delete_group` 软删 UPDATE 补 `deleted_at IS NULL`，避免重复删除假成功。

无 DDL；创建路径仍固定写 `active`，未改。

## 验证

- `cargo fmt -p topems-unified-core` PASS
- `cargo check -p topems-unified-core` PASS
- `cargo test -p topems-unified-core --lib menu::menu_status`：2 passed
- `check-request-txn --changed-only` PASS；`check-destructive-sql` PASS

## 风险

- 目前无 `inactive/archived` 存量，状态流转未在真实数据上触发；仅 active → active 路径会影响现有编辑。
- 菜单编辑允许超管跨租户（`tenant_opt=None`），与本模块既有语义一致；普通用户仍按 claims 租户过滤。
