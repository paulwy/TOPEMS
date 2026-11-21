-- CRM 退换货状态上线前只读预检（B105）
-- 本批不新增 CHECK：crm.returns.status 的规范集合就是既有 ck_returns_status_standard。
-- 预期：异常值 0 行；约束定义包含下方七值；282 行 pending 不受影响。

-- 1) 存量是否落在规范集合之外
SELECT status, count(*)
FROM crm.returns
WHERE status IS NULL
   OR status NOT IN (
       'pending', 'accepted', 'approved', 'rejected',
       'processing', 'completed', 'cancelled'
   )
GROUP BY status
ORDER BY count(*) DESC;

-- 2) 既有约束定义
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'crm.returns'::regclass
  AND conname = 'ck_returns_status_standard';

-- 3) 现状分布
SELECT status, count(*)
FROM crm.returns
GROUP BY status
ORDER BY count(*) DESC;

-- 4) 历史 spec 值残留（严格 CHECK 下预期 0）
SELECT count(*) FILTER (WHERE status = 'resolving') AS resolving_rows,
       count(*) FILTER (WHERE status = 'done') AS done_rows,
       count(*) FILTER (WHERE status = 'received') AS received_rows
FROM crm.returns;
