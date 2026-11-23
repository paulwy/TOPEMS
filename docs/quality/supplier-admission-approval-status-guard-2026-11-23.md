# B195 供应商准入审批状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/scm/src/modules/supplier_admission_approval_status.rs`
- 枚举：`SupplierAdmissionApprovalStatus`
- 值集：`pending` / `approved` / `rejected`
- 默认：`pending`
- 落库列：`scm.supplier_admissions.approval_status`（varchar，可空，无默认）

该列与主状态 `status`（`draft/pending/approved/rejected/active`）语义分离：`status` 走准入流程，
`approval_status` 只记录审核结果。NULL 表示尚未审核，故 CHECK 保留 `IS NULL`。

单测：DB 值往返；`bogus` 拒绝；`normalize_option` 对 NULL 返回 `None`、未知值回落 `pending`、
大小写归一。

## 写入口绑定

- `approve_admission`：`approval_status = 'approved'` 改为 `$6` 参数绑定
  `SupplierAdmissionApprovalStatus::Approved`。
- `reject_admission`：`approval_status = 'rejected'` 改为 `$6` 参数绑定
  `SupplierAdmissionApprovalStatus::Rejected`。
- `audit_admission`：原来 `let approval_status = status;` 直接复用主状态字符串，现改为独立按
  审核结论取 `Approved/Rejected`，避免两列口径被强绑在一起。

## 列表过滤绑定

`SupplierAdmissionQueryParams` 一直声明了 `approval_status`，但此前列表完全忽略该参数。
本批补齐：

- `approval_status` 先经 `from_db_str` 校验，`all` / 空串忽略；非法值返回 400（`无效的供应商准入审批状态`）。
- 列表 SQL 增加 `AND ($5::text IS NULL OR approval_status = $5)`，计数 SQL 增加 `$3` 同条件，
  过滤真实生效且两处口径一致。

## 读入口绑定

- `list_admissions` / `get_admission` 返回前统一经 `normalize_option` 归一，未知值回落
  `pending`，NULL 仍返回 `null`。

## 数据库验证

候选：`docs/database/supplier-admission-approval-status-check-candidates-2026-11-23.sql`

- `ck_scm_supplier_admissions_approval_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 条件为 `approval_status IS NULL OR approval_status IN ('pending','approved','rejected')`。
- 应用时表 0 行，无需历史归一。
- 事务插入 `bogus` 行被拒：`violates check constraint "ck_scm_supplier_admissions_approval_status_standard"`，
  插入后 `ROLLBACK`，表行数保持 0。

## 口径变化

| 项 | B194 | B195 |
| --- | --- | --- |
| 状态 CHECK | 375 | 376 |
| PG ENUM 类型 | 5 | 5 |
| 无约束状态列 | 348 | 347 |
| Rust 枚举 | 258 | 259 |
| Rust 枚举值 | 221 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 230 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

`rust_enum_values` 仍为 221 是盘点脚本既有口径问题（新增枚举值未计数），不是代码缺值。
`pending/approved/rejected` 已在全局色板内，前端无需新增键。

## 门禁

- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-scm --lib`：367 passed（B194 时 SCM 为 365）
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。正式发布需逐条执行并按窗口 `VALIDATE`。
