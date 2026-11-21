-- B40 · srm.inquiries 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/srm/src/modules/inquiry_status.rs
-- draft / published / in_progress / closed / awarded / cancelled（与前端 srm/inquiry.ts 六态对齐）
-- 回滚：文件末尾。

ALTER TABLE srm.inquiries
  ADD CONSTRAINT inquiries_status_check
  CHECK (status = ANY (ARRAY['draft','published','in_progress','closed','awarded','cancelled']))
  NOT VALID;

-- 列默认值已是 'draft'，与创建入口一致，无需改默认。
-- 本地存量 273 行全部 draft，均在候选集合内。

-- 窗口内：
-- ALTER TABLE srm.inquiries VALIDATE CONSTRAINT inquiries_status_check;
-- 回滚：
-- ALTER TABLE srm.inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert draft → published → in_progress → awarded 各 UPDATE 1；awarded→'bogus' → 23514
--   回滚后 B40-DRILL 行 0、inquiries_status_check 约束 0。

-- 修复记录（本批代码改动，非 DDL）：
--   创建/编辑原本把请求 status 原样写库，任意字符串可落库；改为严格解析，未知值 400。
--   列表过滤原本接受任意字符串（非法值静默空列表），改为严格解析后 400。
--   publish/close 的目标态与起始态集合改由枚举提供，不再散落字面量。
