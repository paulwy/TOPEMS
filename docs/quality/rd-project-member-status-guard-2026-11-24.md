# RD 项目成员状态大小写收口（B260）

日期：2026-11-24
表：`rs.project_members`
迁移：`database/migrations/20261124160000_rd_project_members_status_standard.sql`

## 缺陷

- `rs.project_members.status` 没有 CHECK，列默认值是 `'ACTIVE'`。
- Rust 创建走 `MemberStatus::Active.to_string()`，写入 `'ACTIVE'`。
- `project_permission.rs` 判定成员权限却查 `status = 'active'`（小写）。

结果是：新建成员成功后，成员本人仍会被判为“不是项目成员”。当前本地表 0 行，所以尚未显性爆发，但写入路径已埋雷。

## 落地

- `MemberStatus` 补 `DB_VALUES`、`as_db_str`、`from_db_str`、`normalize`，DB 契约固定 `active/inactive`；`Display` 保留大写，API 枚举契约不变。
- 创建成员绑定 `MemberStatus::Active.as_db_str()`，更新绑定 `payload.status.map(|s| s.as_db_str())`。
- 权限查询改为 `lower(status) = 'active'`，在迁移前后都能命中。
- 迁移：存量 `lower(status)` 归一 → 列默认 `'active'` → `ADD CONSTRAINT ck_project_members_status_standard CHECK (status IN ('active','inactive')) NOT VALID` → `VALIDATE`。
- fail-closed：归一后仍有值集外行则 `RAISE EXCEPTION`。

## 本地应用与验证

- 本地迁移执行成功：`B260 完成：rs.project_members.status 已归一为小写并建立约束`。
- 二次执行幂等：`跳过 ADD：约束已存在，已重新 VALIDATE`。
- `pg_constraint`：`ck_project_members_status_standard`，`convalidated=t`。
- 列默认值：`'active'::character varying`。
- `cargo check -p topems-rd`、`clippy --all-targets -- -D warnings`、`fmt` 通过。
- `TEST_DATABASE_URL=... cargo test -p topems-rd`：162 passed（lib）。
- status 台账门禁：catalog 35/5/681、queue 185/192、enum contract 12/12 均 PASS。

## 回滚

`database/rollback/20261124160000_rd_project_members_status_standard.rollback.sql`：DROP 约束、默认值恢复 `'ACTIVE'`、存量大写化。仅在代码同步回退大写写入版本时使用。
