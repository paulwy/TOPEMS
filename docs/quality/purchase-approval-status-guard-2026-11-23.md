# B194 采购单据审批状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/scm/src/modules/purchase_requisition_approval_status.rs`
- 枚举：`PurchaseRequisitionApprovalStatus`
- 值集：`pending` / `approved` / `rejected`
- 默认：`pending`
- 落库列：`scm.purchase_requisitions.approval_status`（varchar，可空，无默认）

- 文件：`svc/scm/src/modules/purchase_contract_approval_status.rs`
- 枚举：`PurchaseContractApprovalStatus`
- 值集：`pending` / `approved` / `rejected`
- 默认：`pending`
- 落库列：`scm.purchase_contracts.approval_status`（varchar，可空，无默认）

两列与各自表的 `status` 主状态是不同语义：`status` 走草稿/提交/取消/转单/签约/终止，
`approval_status` 只记录审批结果。NULL 表示尚未审批，因此 CHECK 保留 `IS NULL`。

单测：DB 值往返；`bogus` 拒绝；`normalize_option` 对 NULL 返回 `None`、未知值回落 `pending`、
大小写归一。

## 写入口绑定

- `purchase_requisition.rs` 的 `approve_requisition`：`approval_status = 'approved'` 改为 `$6` 参数绑定
  `PurchaseRequisitionApprovalStatus::Approved`。
- `purchase_requisition.rs` 的 `reject_requisition`：`approval_status = 'rejected'` 改为 `$6` 参数绑定
  `PurchaseRequisitionApprovalStatus::Rejected`。
- `purchase_contract.rs` 的 `approve_contract` / `reject_contract` 同样改为参数绑定。
- 四条 UPDATE 的 `status = $5` 与新增 `$6` 顺序一致，占位符与 bind 顺序一一对应，编译期已校验。

## 读入口绑定

- `list_requisitions` / `get_requisition`：返回前统一经 `normalize_option` 归一，
  未知值回落 `pending`，NULL 仍返回 `null`。
- `list_contracts` / `get_contract`：同上，`contract` 对象内的 `approval_status` 一并归一。
- 该两列此前没有独立状态更新入口，也没有创建/更新请求字段可传入审批状态，因此不存在
  “接口接受任意字符串”的入口；本批的非法值防护由写绑定 + 读兜底 + DB CHECK 三层构成。

## 数据库验证

候选：`docs/database/purchase-approval-status-check-candidates-2026-11-23.sql`

- `ck_scm_purchase_requisitions_approval_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- `ck_scm_purchase_contracts_approval_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 条件均为 `approval_status IS NULL OR approval_status IN ('pending','approved','rejected')`。
- 应用时两表均 0 行，无需历史归一。
- 两表分别以事务插入 `bogus` 行验证被拒，报错分别为：
  - `violates check constraint "ck_scm_purchase_requisitions_approval_status_standard"`
  - `violates check constraint "ck_scm_purchase_contracts_approval_status_standard"`
  - 两次插入均 `ROLLBACK`，两表行数保持 0 / 0。

## 口径变化

| 项 | B193 | B194 |
| --- | --- | --- |
| 状态 CHECK | 373 | 375 |
| PG ENUM 类型 | 5 | 5 |
| 无约束状态列 | 350 | 348 |
| Rust 枚举 | 256 | 258 |
| Rust 枚举值 | 221 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 230 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

`rust_enum_values` 仍为 221 是盘点脚本既有口径问题（新增枚举值未计数），不是代码缺值：
两个新枚举各 3 值、单测覆盖齐全。前端色板无需新增键，`pending/approved/rejected` 已在全局色板内。

## 门禁

- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-scm --lib`：365 passed（B193 时 SCM 为 361）
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。正式发布需逐条执行并按窗口 `VALIDATE`。
