-- B239：pm.settlements.status 收敛到 draft/pending/approved/rejected
--
-- 背景：
--   1) 创建入口硬编码 'draft'，但真库列默认值是 'pending'，两条写入路径初始态不一致；
--   2) 更新接口 COALESCE 原样写 status，任意字符串可落库；
--   3) 审批接口没有来源状态约束，已 approved 可重复审批、rejected 也能直接改成 approved。
--
-- 口径：
--   draft    新建初始态
--   pending  已提交待审批
--   approved 已审批终态
--   rejected 历史/外部拒绝值，仅允许退回 draft 重新提交
--
-- 本文件只登记候选；实际应用见 docs/quality/pm-settlement-status-guard-2026-11-23.md。

ALTER TABLE pm.settlements ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE pm.settlements
    ADD CONSTRAINT ck_settlements_status_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text]))
    ) NOT VALID;
