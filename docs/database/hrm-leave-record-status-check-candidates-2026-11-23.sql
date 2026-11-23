-- B200 请假记录（hrm.leave_records）状态候选约束（2026-11-23）
--
-- 目标：把 `hrm.leave_records.status` 收敛到唯一枚举
--   `LeaveRecordStatus` → hrm.leave_records.status
--
-- 现状：列 varchar NOT NULL，DB 默认 `pending`；创建写 `pending`，批准 → `approved`，
-- 拒绝 → `rejected`；`cancelled` 由前端下拉/筛选暴露但后端暂无写入口。
-- 代码侧此前的写入全部是 SQL 字面量：创建 `'pending'`、更新与删除的 `WHERE status = 'pending'`、
-- 批准的 `SET status = 'approved' ... WHERE status = 'pending'`、
-- 拒绝的 `SET status = 'rejected' ... WHERE status = 'pending'`；
-- 列表 `status` 过滤是 `params.status` 原样透传（非法值静默查空、空串当真实值查）。
-- 本批全部改为枚举绑定，DB 默认与枚举默认一致（`pending`），无需变更默认、无需回填。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE hrm.leave_records
  ADD CONSTRAINT ck_hrm_leave_records_status_standard
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
  NOT VALID;

-- 同表第二列：`approval_status`（varchar NOT NULL，DB 默认 `pending`）
-- 该列此前没有任何代码写入，而 hrm 报表（svc/hrm/src/modules/reports.rs:593）
-- 的请假天数统计按 `approval_status = 'approved'` 计数，导致报表恒为 0。
-- 本批把审批结论绑进批准（approved）/ 拒绝（rejected）两个写入口，创建依赖 DB 默认 pending。
-- 同样 NOT VALID 应用，生产需按窗口单独 VALIDATE。

ALTER TABLE hrm.leave_records
  ADD CONSTRAINT ck_hrm_leave_records_approval_status_standard
  CHECK (approval_status IN ('pending', 'approved', 'rejected'))
  NOT VALID;
