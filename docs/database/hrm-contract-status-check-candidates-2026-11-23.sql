-- B215：HRM 劳动合同状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/contract_status.rs（ContractStatus）
-- 值集：active / expired / terminated / pending，取自前端合同 schema 的四个选项，
-- 后端写入方（创建默认 active、更新 COALESCE、续签执行回写 active、即将到期查询 active）全部落在值域内。
--
-- 重要：库内原有一个历史约束 ck_contracts_status_standard（仅 active/inactive/archived），
-- 与前后端值集冲突——更新接口写 expired/terminated/pending 会直接撞约束失败。
-- 因此本候选先删除历史约束，再建立 canonical 约束。
-- 对应迁移：database/migrations/20261123130000_hrm_contracts_status_canonical.sql
-- 列：hrm.contracts.status varchar NOT NULL DEFAULT 'active'，本地 0 行。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.contracts DROP CONSTRAINT IF EXISTS ck_contracts_status_standard;

ALTER TABLE hrm.contracts
    ADD CONSTRAINT ck_hrm_contracts_status_standard
    CHECK (status IN ('active', 'expired', 'terminated', 'pending')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_contracts_status_standard ON hrm.contracts
    IS '状态值域由 svc/hrm/src/modules/contract_status.rs 定义（B215）';

COMMIT;
