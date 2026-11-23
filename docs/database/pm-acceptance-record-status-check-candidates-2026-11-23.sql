-- B240：pm.acceptance_records.status 收敛到 pending/passed/failed
--
-- 背景：
--   1) 生产登记了 `ck_acceptance_records_status_standard`（active/inactive/archived），
--      与代码写入的 passed/failed/pending 完全冲突，生产写入会被旧约束拒绝；
--   2) 创建/更新接口把请求体 status 原样落库，非法值可入库；
--   3) 更新接口没有终态保护，已 passed 的记录仍可改分数/结论。
--
-- 处理：
--   1) 旧约束名与新业务值集冲突，先 DROP IF EXISTS（生产部署时替换，本地无该约束）；
--   2) 用新名 `ck_acceptance_records_result_status_standard` 登记，避免与旧清单条目混淆；
--   3) NOT VALID：历史 active/inactive/archived 行不阻塞上线，待数据清理后再 VALIDATE。
--
-- 本文件只登记候选；实际应用见 docs/quality/pm-acceptance-record-status-guard-2026-11-23.md。

ALTER TABLE pm.acceptance_records
    DROP CONSTRAINT IF EXISTS ck_acceptance_records_status_standard;

ALTER TABLE pm.acceptance_records
    ADD CONSTRAINT ck_acceptance_records_result_status_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text]))
    ) NOT VALID;
