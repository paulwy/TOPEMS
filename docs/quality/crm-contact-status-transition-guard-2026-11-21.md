# B73 · CRM 联系人状态迁移约束（2026-11-21）

## 现状（改动前）
- `crm.contacts.status` 已在 B57 收敛为 `ContactStatus` 三值（active/inactive/archived），DB 有 `ck_contacts_status_standard`。
- 但编辑接口对任意合法值都直接放行，`archived` 可一步回到 `active`，历史脏状态也能被任意覆盖。
- 列表 `?status` 已支持过滤，但未写入 OpenAPI 参数。

## 改动
1. `ContactStatus` 增加 `can_transition_to`：active↔inactive、二者→archived、archived→inactive；同值视为无变更；archived 不允许直接回 active。
2. `update_contact` 在写入前校验当前态→目标态，非法跳转返回 409；当前态本身无法解析也返回 409，不静默覆盖。
3. 列表 OpenAPI 补 `status` 查询参数说明。

## 验证
- `cargo check -p topems-crm`、`cargo clippy -p topems-crm --all-targets -- -D warnings` 干净。
- 单元测试覆盖合法链与 archived→active 拒绝。
- 本地 `crm.contacts` 6 行全为 active，无脏值需要迁移。

## 残留
- 状态迁移只在前端编辑接口收口；若后续增加导入/批量写接口需复用同一规则。
- `crm.customers` 的客户状态仍是自由字符串模型，未纳入本批。
