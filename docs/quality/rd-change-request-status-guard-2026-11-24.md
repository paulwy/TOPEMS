# RD 变更请求状态落库约束（B263）

日期：2026-11-24
表：`rs.change_requests`
迁移：`database/migrations/20261124180000_rd_change_request_status_standard.sql`

## 缺陷

- `rs.change_requests.status` 默认 `submitted`，但表上没有 CHECK。
- Rust 只有字符串函数 `change_request_can_transition`，流转入口把请求里的 `to` 直接落到 SQL；列表状态筛选也原样透传。
- 非法值只能依赖状态机提前拦截；一旦绕过 handler 直接 UPDATE，或外部写入，任意字符串都能进库。后续查询/前端颜色映射会遇到未知状态。
- 本地表 0 行，尚未产生脏数据，但写入面缺少最后一道数据库约束。

## 落地

- 新增 `ChangeRequestStatus` 五态：`submitted / under_review / approved / rejected / closed`，与迁移 CHECK 同源。
- 补 `DB_VALUES`、`as_db_str`、`from_db_str`、`normalize`；`normalize` 兼容 `in_review/reviewing → under_review`、`denied → rejected`、`done → closed`，未知值 fail-closed。
- 补 `can_transition_to`：提交可进入评审/驳回；评审中可批准/驳回；已批准仅可关闭；已驳回可重新提交；关闭终态；同值幂等。
- 创建 INSERT 的 `'submitted'` 字面量改为绑定 `ChangeRequestStatus::DEFAULT.as_db_str()`。
- 流转入口先解析当前态与目标态：库内未知状态 500 并拒绝流转，目标值非法或非法流转 400。
- 列表 `status` 筛选先 `normalize` 再绑定，非法筛选值 400，不再静默返回空列表。
- 创建变更单的“仅已批准可建”判断改走枚举比较。
- 迁移：已知别名归一 → 默认值固定 `'submitted'` → `ADD CONSTRAINT ck_change_requests_status_standard CHECK (status IN (五态)) NOT VALID` → `VALIDATE`。
- fail-closed：归一后仍有值集外行则 `RAISE EXCEPTION`。

## 本地应用与验证

- 迁移执行成功：`B263 完成：rs.change_requests.status 已建立五态约束`。
- `pg_constraint`：`ck_change_requests_status_standard`，`convalidated=t`。
- 事务内探针：插入一行默认状态为 `submitted`；更新为 `bogus` 被 23514 拒绝；事务回滚后表内 0 行。
- `cargo check -p topems-rd`、`cargo fmt`、`clippy --all-targets -- -D warnings` 通过。
- `TEST_DATABASE_URL=... cargo test -p topems-rd`：167 passed。
- 状态盘点：317 个 Rust 枚举；队列 187 枚举 / `real_gap 0`。

## 未纳入本批

`rs.change_orders.status` 仍只有默认 `planned`，代码中没有状态流转入口，也没有可靠的前端/文档值集；本批不凭空造 `executing/completed` 等值，留待有真实业务动作后单独收口。

## 回滚

`database/rollback/20261124180000_rd_change_request_status_standard.rollback.sql`：DROP 约束、默认值恢复 `'submitted'`。别名归一不可逆。
