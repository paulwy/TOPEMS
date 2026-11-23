-- B228 · pm.contracts.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/contract_status.rs
--     ContractStatus::DB_VALUES =
--       draft / pending / approved / rejected / active / completed / cancelled
--   与前端 apps/web/src/schemas/pm/contract.ts 的 STATUS_OPTIONS（补 rejected 后）一致；
--   默认 draft（列默认值）。
--
-- 历史别名：submitted → pending、canceled/terminated → cancelled、done/closed → completed、
--           signed → active（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内造父项目 + 合同，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 395→396）。

ALTER TABLE pm.contracts
  ADD CONSTRAINT ck_contracts_status_standard
  CHECK (status IN
    ('draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.contracts DROP CONSTRAINT IF EXISTS ck_contracts_status_standard;
