# B196 供应商报价单状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/scm/src/modules/supplier_quote_status.rs`
- 枚举：`SupplierQuoteStatus`
- 值集：`draft` / `submitted`
- 默认：`draft`
- 落库列：`scm.supplier_quotes.status`（varchar，NOT NULL）

值集依据代码侧全部写入点：`create_quote` 写 `draft`，`submit_quote` 写 `submitted`，
`update_quote` / `submit_quote` 都以 `draft` 为前置条件。表内不存在第三个写入值，未预先扩口径。

单测：DB 值往返；`bogus` 拒绝；`normalize` 对空串/未知值回落 `draft`、大小写归一。

## 写入口绑定

- `create_quote`：`INSERT ... status` 由字面量 `'draft'` 改为 `$13` 参数绑定
  `SupplierQuoteStatus::Draft`。
- `update_quote`：前置条件 `status = 'draft'` 改为 `status = $8` 参数绑定。
- `submit_quote`：`SET status = 'submitted'` 改为 `SET status = $4`，
  `WHERE status = 'draft'` 改为 `WHERE status = $5`，分别绑定 `Submitted` / `Draft`。

## 列表过滤绑定

`list_quotes` 此前 `let status_filter = params.status.clone();` 原样透传：非法值不报错、
只是查不到数据，空串还会被当成真实值过滤。本批改为：

- 先经 `from_db_str` 校验，`all` / 空串忽略，非法值返回 400（`无效的报价单状态`）。
- 列表 SQL 与计数 SQL 共用同一个已归一值，两处口径一致。

## 默认值对齐

列默认值原为 `'submitted'`，与创建入口写的 `draft` 相反，等价于“插入时若省略状态就自动提交”。
候选 SQL 中执行 `ALTER COLUMN status SET DEFAULT 'draft'`，本地已生效（`column_default = 'draft'`）。

## 读入口绑定

- `list_quotes` / `get_quote` 返回前经 `normalize` 归一，未知值回落 `draft`。

## 数据库验证

候选：`docs/database/supplier-quote-status-check-candidates-2026-11-23.sql`

- `ck_scm_supplier_quotes_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 条件为 `status IN ('draft','submitted')`（列 NOT NULL，无需 `IS NULL` 分支）。
- 应用时表 0 行，无需历史归一。
- 事务插入 `bogus` 行被拒：`violates check constraint "ck_scm_supplier_quotes_status_standard"`，
  插入后 `ROLLBACK`，表行数保持 0。

## 口径变化

| 项 | B195 | B196 |
| --- | --- | --- |
| 状态 CHECK | 376 | 377 |
| PG ENUM 类型 | 5 | 5 |
| 无约束状态列 | 347 | 346 |
| Rust 枚举 | 259 | 260 |
| Rust 枚举值 | 221 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 230 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

`rust_enum_values` 仍为 221 是盘点脚本既有口径问题（新增枚举值未计数），不是代码缺值。
`draft` / `submitted` 已在全局色板内，前端无需新增键。

## 门禁

- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-scm --lib`：369 passed（B195 时 SCM 为 367）
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选（含默认值变更）仅在本地 `topems` 应用。正式发布需逐条执行并按窗口 `VALIDATE`。
