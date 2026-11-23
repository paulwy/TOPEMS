-- B197 到货通知单状态候选约束（2026-11-23）
--
-- 目标：把 `scm.incoming_notices.status` 收敛到唯一枚举
--   `IncomingNoticeStatus` → scm.incoming_notices.status
--
-- 列 text、NOT NULL、DB 默认 `pending`，与创建入口写入一致，无需改默认。
-- 值集与前端 `apps/web/src/schemas/scm/incomingNotice.ts` 下拉/筛选一致：pending / arrived。
-- 约束以 NOT VALID 应用，历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE scm.incoming_notices
  ADD CONSTRAINT ck_scm_incoming_notices_status_standard
  CHECK (status IN ('pending', 'arrived'))
  NOT VALID;
