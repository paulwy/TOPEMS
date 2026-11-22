# B172 · 采购合同状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/purchase_contract_status.rs` → `PurchaseContractStatus`：`draft / pending / reviewing / approved / rejected / signed / cancelled / expired / terminated`，默认 `draft`。
- 后端流转覆盖七个态；`reviewing / signed` 为前端签约向导使用的态，一并纳入统一集合，避免前后端值集分叉。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 过滤支持空 / `all`，非法值返回 400；查询与计数共用规范化状态绑定，原先被忽略的 `status` 参数已生效。
- 创建：`INSERT` 的 `'draft'` 改为绑定 `PurchaseContractStatus::DEFAULT`。
- 更新：请求体 `status` 先解析枚举，非法值返回 400，再以 `COALESCE($11, status)` 落库。
- 状态流转：提交、审批通过、驳回、取消、终止、续签六处 `SET status` 全部参数绑定，分别绑定 `pending / approved / rejected / cancelled / terminated / draft`。
- 前端 `purchaseContractWizard.ts` 的状态选项、色板、筛选补齐 `pending / rejected / cancelled`，并新增中英文 i18n 文案。

## 本地 DB 应用
文件：`docs/database/purchase-contract-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.purchase_contracts.status` → `ck_scm_purchase_contracts_status_standard`（九值）

表当前 0 行。构造 `status='bogus'` 的新插入，被该约束拦截，随后 `ROLLBACK`，未留下数据。

## 刷新结果
- catalog：**351 条状态 CHECK / 5 个 PG ENUM / 372 个无约束状态列**
- 盘点：**234 个 Rust 枚举 / 209 个值 / 59 个不在 DB CHECK / 219 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **206 条**

## 门禁
- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：351 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`approval_status` 是独立列，本批未纳入约束。
