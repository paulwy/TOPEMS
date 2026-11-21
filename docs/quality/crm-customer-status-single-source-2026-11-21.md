# B38 · crm.customers 状态单一源（2026-11-21）

## 现状（改动前）
`crm.customers` 本地 301 行，全部 `active`。DB 已有 `ck_customers_status_standard`（`active/inactive/archived`），但 Rust 侧没有对应枚举：

- 创建：`customer.rs` 绑 `req.status.as_deref().unwrap_or("active")`，任意字符串直接进 SQL，非法值靠 CHECK 报 23514 → 用户拿到 500；
- 编辑：`status = req.status.or(existing.status)` 原样绑库，同样只有 DB 兜底；
- 列表/统计等读取面无解析。

## 改动
1. 新增 `svc/crm/src/modules/customer_status.rs`：`CustomerStatus { Active, Inactive, Archived }`、`DB_VALUES`（与既有 CHECK 完全一致）、`DEFAULT=Active`、严格 `from_db_str`/`as_db_str`、1 个单测。
2. `customer.rs`：创建先解析 `req.status`（未知值 `400`，缺省 `DEFAULT`）再绑枚举；编辑同样先解析（未知值 `400`），未传保留原值。
3. 无新增候选 DDL —— 该列已有 CHECK，映射登记为 `existing:ck_customers_status_standard`。

## 验证
- `cargo test -p topems-crm --lib customer_status`：1 passed；`cargo check/clippy -p topems-crm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 盘点：枚举 147→148、值 156、不在 DB CHECK 117、色板缺口 0；前端键 171 不变；队列 106；映射 82→83。
- 不改 DB：现有 CHECK 已覆盖三值，本地 301 行全在集合内，无需演练 VALIDATE。

## 残留
- `crm.customers.approval_status`（`none/pending/approved/rejected`，本地默认 `none`）仍是无枚举的自由文本，审批流转 `pending→approved/rejected` 写入口都是字面量；建议作为独立批次收口。
- DB CHECK 是 `status IS NULL OR ...` 形式，但列 NOT NULL，`IS NULL` 分支是历史遗留，可在窗口内收紧。
- 非法状态以前返回 500，现在返回 400，属于行为改善；若有调用方依赖 500 文案需同步。
