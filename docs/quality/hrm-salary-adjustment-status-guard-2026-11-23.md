# B207 · HRM 薪资调整状态护栏证据（2026-11-23）

## 范围

- 表：`hrm.salary_adjustments`
- 列：`status`（varchar(20) NOT NULL DEFAULT `pending`）、`approval_status`（同类型同默认，**无代码读写**）
- 代码：`svc/hrm/src/modules/salary_adjustment.rs`
- 枚举：`svc/hrm/src/modules/salary_adjustment_status.rs`（新增）
- 本地数据：0 行

## 值集

`SalaryAdjustmentStatus = { pending, approved, rejected }`，默认 `pending`，
与前端 `apps/web/src/schemas/hrm/salaryAdjustment.ts` 的审批状态下拉、筛选、色板逐值一致。

## 修掉的缺陷

1. **更新接口可写任意审批态**：`update_salary_adjustment` 用 `status = COALESCE($7, status)`
   直接绑定 `req.status`，任何字符串都能把审批状态改成任意值（接口返回 `Option`，
   不存在的记录也不报错）。现校验后绑定，非法 400。
2. **列表过滤静默查空**：`params.status` 原样绑定到列表与 count 两条 SQL，
   非法值查空、空串当真实值。现 `parse_filter`：空/`all` 不过滤，未知值 400。
3. **状态机字面量**：创建 `'pending'`、批准 `SET status='approved'`、拒绝 `SET status='rejected'`
   全部改为参数绑定 + 枚举常量，状态机在三处写点共用同一词表。
4. **死列兜底**：`approval_status` 全仓无写入方，仍加同词表约束，防止外部脚本/手工 SQL 写脏值。
5. **响应出口**：列表、详情、创建、更新、批准、拒绝 6 处经 `normalize_sa`（`Option` 用 `map`）。

## 本地验证

```sql
ALTER TABLE hrm.salary_adjustments ADD CONSTRAINT ck_hrm_salary_adjustments_status_standard
  CHECK (status IN ('pending','approved','rejected')) NOT VALID;
ALTER TABLE hrm.salary_adjustments ADD CONSTRAINT ck_hrm_salary_adjustments_approval_status_standard
  CHECK (approval_status IN ('pending','approved','rejected')) NOT VALID;
```

- 两条均成功，`convalidated = f`。
- 负向验证：插入 `status='bogus'` 被 `ck_hrm_salary_adjustments_status_standard` 拒绝，事务回滚。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 刷新与门禁

- catalog：**395 条状态 CHECK / 5 个 PG ENUM / 328 个无约束列**
- 盘点：**277 个 Rust 枚举 / 234 值 / 57 不在 DB CHECK / 243 前端键 / 色板缺口 0**
- 缺口队列：**44 枚举 / 57 值，全部 internal_state**
- 映射新增 1 条（`status`）；`approval_status` 为无代码读写列，只加约束不挂映射。

## 已知取舍

`approval_status` 与 `status` 语义重复，长期应由迁移删除其中一个。本批不删列（涉及历史
数据与外部脚本风险），先用同词表约束把两列都钉死；后续清理时一并删除冗余列与对应约束。
