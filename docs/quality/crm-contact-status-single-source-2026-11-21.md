# B57 · crm.contacts 状态单一源（2026-11-21）

## 现状（改动前）
- `crm.contacts.status`：本地 6 行全部 `active`；列非空，DB 默认 `'active'`；已有 `ck_contacts_status_standard`（active/inactive/archived）。
- 创建接口写死字面量 `'active'`；列表 `?status=` 与编辑接口接受任意字符串，非法值只能靠 DB 23514 变成 500。
- 联系人列表 SELECT 缺少 `deleted_at IS NULL`，而总数 COUNT 有该条件，导致列表会显示已删除联系人且与 total 不一致。

## 改动
1. 新增 `svc/crm/src/modules/contact_status.rs`：`ContactStatus`（active/inactive/archived，DEFAULT active，与 DB CHECK 一致），附 1 单测。
2. `contact.rs`：
   - 创建状态由字面量改为绑定 `ContactStatus::DEFAULT`；
   - 列表状态筛选严格解析，未知值 400；
   - 编辑状态严格解析，未知值 400；
   - 列表 SELECT 补 `deleted_at IS NULL`，与 COUNT 口径一致。
3. 无新增候选 DDL：该列已有 `ck_contacts_status_standard`，直接复用。

## 验证
- `cargo check -p topems-crm`、`cargo clippy -p topems-crm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-crm --lib contact_status`：1 passed。
- 本地事务内 `status='disabled'` → `ck_contacts_status_standard` 23514；回滚，存量 6 行 active 不变。

## 残留
- 编辑接口允许 active/inactive/archived 任意互转，没有独立停用/归档动作。
- 创建仍写死 `approval_status='none'`，由 B56 的 `ContactApprovalStatus` 负责（同一 INSERT 里的另一字面量）。
- 列表状态筛选参数未写进 OpenAPI `params`，接口文档缺失该 query 参数。
- 无新增迁移，DB CHECK 已在线上。
