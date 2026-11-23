# B197 到货通知单状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/scm/src/modules/incoming_notice_status.rs`
- 枚举：`IncomingNoticeStatus`
- 值集：`pending` / `arrived`
- 默认：`pending`
- 落库列：`scm.incoming_notices.status`（text，NOT NULL，DB 默认 `pending`）

值集与前端 `apps/web/src/schemas/scm/incomingNotice.ts` 的下拉、筛选完全一致
（`pending` 待收货 → `arrived` 已到货），后端创建也固定写 `pending`，DB 默认与写入口一致，无需改默认。

单测：DB 值往返；`bogus` 拒绝；`normalize` 对空串/未知值回落 `pending`、大小写归一。

## 写入口绑定

- `create_notice`：`INSERT ... status` 由字面量 `'pending'` 改为 `$16` 参数绑定
  `IncomingNoticeStatus::DEFAULT`。
- `update_notice`：此前直接把 `req.status`（任意字符串）绑进 `COALESCE($2, status)`，
  等于允许把任意值写进状态列。本批先经 `from_db_str` 校验：`None` / 空串 / `all` 视为不改，
  非法值返回 400（`无效的到货通知单状态`），合法值绑定归一后的枚举字符串。

## 列表过滤绑定

`list_notices` 此前 `let status_filter = params.status.clone();` 原样透传，非法值静默查空。
本批改为枚举校验 + 400，`all` / 空串忽略，列表 SQL 与计数 SQL 共用同一归一值。

## 读入口绑定

`notice_row_to_json` 是列表、创建、更新、详情四处响应的统一出口，`status` 现经
`normalize` 归一，未知值回落 `pending`，不再把库内原始串直接透出。

## 数据库验证

候选：`docs/database/incoming-notice-status-check-candidates-2026-11-23.sql`

- `ck_scm_incoming_notices_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 条件为 `status IN ('pending','arrived')`（列 NOT NULL，无需 `IS NULL` 分支）。
- 应用时表 0 行，无需历史归一。
- 事务插入 `bogus` 行被拒：`violates check constraint "ck_scm_incoming_notices_status_standard"`，
  插入后 `ROLLBACK`，表行数保持 0。

## 口径变化

| 项 | B196 | B197 |
| --- | --- | --- |
| 状态 CHECK | 377 | 378 |
| PG ENUM 类型 | 5 | 5 |
| 无约束状态列 | 346 | 345 |
| Rust 枚举 | 260 | 261 |
| Rust 枚举值 | 221 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 230 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

`rust_enum_values` 仍为 221 是盘点脚本既有口径问题（新增枚举值未计数），不是代码缺值。
`pending` / `arrived` 已在全局色板内，前端无需新增键。

## 门禁

- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-scm --lib`：371 passed（B196 时 SCM 为 369）
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。正式发布需逐条执行并按窗口 `VALIDATE`。
