-- B41 · scm.sync_records 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/scm/src/modules/sync_status.rs
-- pending / running / completed / failed；completed 为终态（本地存量 546 行全部 completed）
-- 回滚：文件末尾。

ALTER TABLE scm.sync_records
  ADD CONSTRAINT sync_records_status_check
  CHECK (status = ANY (ARRAY['pending','running','completed','failed']))
  NOT VALID;

-- 列默认值 'pending' 是合法排队态；代码创建写 running 并立即后台转 completed，无需改默认。

-- 窗口内：
-- ALTER TABLE scm.sync_records VALIDATE CONSTRAINT sync_records_status_check;
-- 回滚：
-- ALTER TABLE scm.sync_records DROP CONSTRAINT IF EXISTS sync_records_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → running → completed 各 UPDATE 1；completed→'bogus' → 23514
--   回滚后 B41-DRILL 行 0、sync_records_status_check 约束 0。

-- 修复记录（本批代码改动，非 DDL）：
--   列表 status 过滤原本接受任意字符串（非法值静默空列表），改为严格解析后 400；
--   创建 INSERT 的 'running'、后台完成/重试/触发的 'completed' 全部改绑枚举。
--   与 WMS 同构表终态词不一致（WMS 用 success，SCM 用 completed），本批各自收口，不强行统一。
