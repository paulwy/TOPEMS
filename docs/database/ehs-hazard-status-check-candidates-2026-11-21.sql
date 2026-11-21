-- B42 · ehs.qa_ehs_hazards 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/hazard_status.rs
-- 后端实际流转：reported → pending_approval → rectifying → pending_verification → closed
--                验收不通过回退 rectifying
-- 历史终态：resolved（本地 39 行，代码不再写入）
-- 前端保留态：verified / rejected（当前后端不写入，保留兼容）
-- 回滚：文件末尾。

ALTER TABLE ehs.qa_ehs_hazards
  ADD CONSTRAINT qa_ehs_hazards_status_check
  CHECK (status = ANY (ARRAY['reported','pending_approval','rectifying','pending_verification','verified','closed','rejected','resolved']))
  NOT VALID;

-- 列默认值已是 'reported'，与创建入口一致，无需改默认。
-- 本地存量：reported 78 / resolved 39，均在候选集合内。

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_hazards VALIDATE CONSTRAINT qa_ehs_hazards_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_hazards DROP CONSTRAINT IF EXISTS qa_ehs_hazards_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert reported → pending_approval → rectifying → pending_verification → closed 各 UPDATE 1；
--   closed→'bogus' → 23514；回滚后 B42-DRILL 行 0、约束 0。

-- 修复记录（本批代码改动，非 DDL）：
--   列表 status 过滤与编辑接口原本接受任意字符串，改为严格解析后 400；
--   启动审批/关闭/创建整改/提交整改/验收的状态改绑枚举，并加起始态谓词；
--   前端补 pending_approval（审批中）与 resolved（已解决），修掉启动审批后灰色 fallback。

-- B76 关闭/验收写入口加固（2026-11-21）：
--   关闭 UPDATE 增加 status = ANY(close_from)，closed 不再可改；resolved 可借关闭动作归一为 closed。
--   验收前先 SELECT 确认 pending_verification，状态不符直接 409，不会先插验收记录。
--   启动审批/关闭 0 行由 404 改为 409（状态不符或不存在）。
