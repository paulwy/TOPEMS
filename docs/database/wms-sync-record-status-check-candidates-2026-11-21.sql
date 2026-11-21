-- B39 · wms.sync_records 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/wms/src/modules/sync_status.rs
-- pending / running / success / failed / completed（completed 为历史终态，与 success 同义，代码不再写入）
-- 回滚：文件末尾。

ALTER TABLE wms.sync_records
  ADD CONSTRAINT sync_records_status_check
  CHECK (status = ANY (ARRAY['pending','running','success','failed','completed']))
  NOT VALID;

-- 列默认值 'pending' 与代码写入的 'running' 不同，但 pending 是合法排队态，
-- 直接 INSERT 落 pending 也能被统计的 active 桶统计到，无需改默认。

-- 窗口内：
-- ALTER TABLE wms.sync_records VALIDATE CONSTRAINT sync_records_status_check;
-- 回滚：
-- ALTER TABLE wms.sync_records DROP CONSTRAINT IF EXISTS sync_records_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → UPDATE running → UPDATE success 各 1 行；success→'bogus' → 23514
--   存量读数：success 830 / completed 4，均在候选集合内；details 表 0 行。

-- 修复记录（本批代码改动，非 DDL）：
--   列表 status 过滤原本接受任意字符串（非法值静默空列表），改为严格解析后 400；
--   统计「成功」原本只认 success，4 条历史 completed 未计入，改为 success|completed。
