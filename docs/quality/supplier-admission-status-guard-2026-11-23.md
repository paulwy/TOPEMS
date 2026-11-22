# 供应商准入状态守卫（B177）

- 批次：W5-B / B177
- 日期：2026-11-23
- 列：`scm.supplier_admissions.status`

## 唯一值源

`svc/scm/src/modules/supplier_admission_status.rs` 的 `SupplierAdmissionStatus`：

| 值 | 含义 |
| --- | --- |
| `draft` | 草稿（DB 默认） |
| `pending` | 已提交待审批 |
| `approved` | 审批通过 |
| `rejected` | 已驳回 |
| `active` | 已激活为正式供应商 |

与前端 `apps/web/src/schemas/scm/supplierAdmission.ts` 五值一致。`approval_status` 是独立列，本批不合并。

## 入口绑定

- 列表：`status` 查询参数由枚举校验，非法值 400，过滤真实生效；COUNT 同步过滤。
- 创建：原硬编码 `'draft'` 改为 `SupplierAdmissionStatus::DEFAULT.as_db_str()` 参数 `$18`。
- 更新：`status` 由枚举校验后作为参数写入；非法值 400。
- 提交/审批通过/驳回/审核自动流转/激活：五处 `SET status` 全部参数绑定枚举常量。
- 审核自动通过或驳回根据 `all_passed` 选择 `Approved` / `Rejected`。

## 数据库约束

- 约束名：`ck_scm_supplier_admissions_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['draft','pending','approved','rejected','active'])) NOT VALID`
- 本地已应用 `docs/database/supplier-admission-status-check-candidates-2026-11-23.sql`。
- 验证：表当前 0 行；最小插入 `status='bogus'` 被该约束拒绝后回滚。存量行未扫描，发布前需按窗口 `VALIDATE CONSTRAINT`。

## 门禁

- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-scm --lib`：361 passed
- catalog / inventory / queue / 事务 / scope / 术语 / i18n / 前端 typecheck：见批次推送记录

生产快照 `topems_prod_verify_20261106` 只读，未应用本候选。
