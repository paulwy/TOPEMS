-- B199 请假申请（erp.leave_requests）状态候选约束（2026-11-23）
--
-- 目标：把 `erp.leave_requests.status` 收敛到唯一枚举
--   `LeaveRequestStatus` → erp.leave_requests.status
--
-- 现状：列 varchar NOT NULL，DB 默认 `draft`；创建写 `draft`，提交 → `pending`，
-- 批准 → `approved`，驳回 → `rejected`，撤销 → `cancelled`。
-- 代码侧三处原先都是 SQL 字符串字面量（创建 `'draft'`、提交 `'pending'`、
-- 批准 `'approved'`、驳回 `'rejected'`、撤销 `'cancelled'`，以及 WHERE 里的期望态），
-- 且列表 `status` 过滤是原样透传（非法值静默查空、空串当真实值查）。
-- 本批全部改为枚举绑定，DB 默认值与枚举默认一致（`draft`），无需变更默认、无需回填。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE erp.leave_requests
  ADD CONSTRAINT ck_erp_leave_requests_status_standard
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled'))
  NOT VALID;
