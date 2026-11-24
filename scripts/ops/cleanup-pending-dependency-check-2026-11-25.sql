-- ============================================================
-- 待清理表 · 归档前只读依赖核对（2026-11-25）
--
-- 用法（生产只读事务）：
--   PGOPTIONS='-cdefault_transaction_read_only=on' \
--   psql -v ON_ERROR_STOP=1 -d topems_prod \
--     -f scripts/ops/cleanup-pending-dependency-check-2026-11-25.sql
--
-- 范围：本批 71 张中尚未被既有链上归档迁移覆盖的 11 张独有表
--       （7 dead + 4 duplicate）；60 张与既有批次重叠，追平账本后由既有迁移处置，
--       不在本脚本重复核对。清单与归属见 docs/ops/cleanup-dead-duplicate-tables-2026-11-24.md。
--
-- 全部 SELECT，不修改任何对象。输出用于归档窗口放行单：
--   行数必须与台账一致（0 行；ticket.schema_defense_ledger 1 行需单独导出备份）；
--   入向外键/依赖视图/非属主授权/发布/FDW 必须为空或来源同样在待归档集合内。
-- ============================================================

\pset pager off

CREATE TEMP TABLE cand(sch text, tbl text, body text, kind text);
INSERT INTO cand(sch, tbl, body, kind) VALUES
  ('flow',     '_deprecated_core_doc_document_versions', '', 'dead'),
  ('portal',   'graphql_execution_profiles',             '', 'dead'),
  ('portal',   'portal_alert_thresholds',               '', 'dead'),
  ('portal',   'portal_compatibility_reports',           '', 'dead'),
  ('portal',   'portal_queue_messages',                  '', 'dead'),
  ('public',   '_archive_core_doc_documents',           '', 'dead'),
  ('ticket',   'schema_defense_ledger',                  '', 'dead-1row'),
  ('iam',      'core_roles',                             'public.core_roles', 'duplicate'),
  ('public',   'core_ticket_activities',                'ticket.core_ticket_activities', 'duplicate'),
  ('public',   'core_ticket_comments',                   'ticket.core_ticket_comments',   'duplicate'),
  ('public',   'core_tickets',                           'ticket.core_tickets',           'duplicate');

-- ① 存在性 / 行数 / RLS / FORCE / 策略数 / 触发器数
SELECT c.sch || '.' || c.tbl AS "表", c.kind AS "类别",
       EXISTS(SELECT 1 FROM pg_class x JOIN pg_namespace n ON n.oid=x.relnamespace
              WHERE n.nspname=c.sch AND x.relname=c.tbl) AS "存在",
       (SELECT count(*) FROM information_schema.tables t
         WHERE t.table_schema=c.sch AND t.table_name=c.tbl) AS "info_schema",
       c.body AS "本体",
       k.rls AS "RLS", k.force AS "FORCE", k.pol AS "策略", k.trg AS "触发器"
FROM cand c
LEFT JOIN LATERAL (
  SELECT relrowsecurity AS rls, relforcerowsecurity AS force,
         (SELECT count(*) FROM pg_policy p WHERE p.polrelid=cls.oid) AS pol,
         (SELECT count(*) FROM pg_trigger t WHERE t.tgrelid=cls.oid AND NOT t.tgisinternal) AS trg
  FROM pg_class cls JOIN pg_namespace n ON n.oid=cls.relnamespace
  WHERE n.nspname=c.sch AND cls.relname=c.tbl
) k ON TRUE
ORDER BY 1;

-- ② 实际行数（逐表 count；0 行方可按死表归档，1 行须先导出备份）
SELECT c.sch || '.' || c.tbl AS "表",
       (SELECT reltuples::bigint FROM pg_class x JOIN pg_namespace n ON n.oid=x.relnamespace
         WHERE n.nspname=c.sch AND x.relname=c.tbl) AS "估算行数"
FROM cand c ORDER BY 1;
-- 精确行数（窗口执行人按表执行；空库/0 行时与估算一致）：
-- SELECT count(*) FROM <sch>.<tbl>;

-- ③ 入向外键：哪些活表引用本批表（来源若也在待归档集合内，依赖图封闭；否则阻断）
SELECT tn.nspname || '.' || tc.relname AS "被引用表",
       sn.nspname || '.' || sc.relname AS "引用方",
       k.conname AS "约束", pg_get_constraintdef(k.oid) AS "定义"
FROM pg_constraint k
JOIN pg_class sc ON sc.oid=k.conrelid  JOIN pg_namespace sn ON sn.oid=sc.relnamespace
JOIN pg_class tc ON tc.oid=k.confrelid JOIN pg_namespace tn ON tn.oid=tc.relnamespace
JOIN cand c ON c.sch=tn.nspname AND c.tbl=tc.relname
WHERE k.contype='f'
ORDER BY 1,2;

-- ④ 向外外键：本批表引用谁（DROP 前随表一并移除，快照进 _fk_snapshot）
SELECT sn.nspname || '.' || sc.relname AS "本批表",
       tn.nspname || '.' || tc.relname AS "被引用表",
       k.conname AS "约束", pg_get_constraintdef(k.oid) AS "定义"
FROM pg_constraint k
JOIN pg_class sc ON sc.oid=k.conrelid  JOIN pg_namespace sn ON sn.oid=sc.relnamespace
JOIN pg_class tc ON tc.oid=k.confrelid JOIN pg_namespace tn ON tn.oid=tc.relnamespace
JOIN cand c ON c.sch=sn.nspname AND c.tbl=sc.relname
WHERE k.contype='f'
ORDER BY 1,2;

-- ⑤ 依赖视图 / 物化视图（DROP 前须先快照并 DROP）
SELECT DISTINCT vn.nspname || '.' || v.relname AS "依赖对象", v.relkind AS "类型",
       tn.nspname || '.' || t.relname AS "依赖于"
FROM pg_depend d
JOIN pg_rewrite rw ON rw.oid=d.objid
JOIN pg_class v ON v.oid=rw.ev_class JOIN pg_namespace vn ON vn.oid=v.relnamespace
JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace tn ON tn.oid=t.relnamespace
JOIN cand c ON c.sch=tn.nspname AND c.tbl=t.relname
WHERE v.relkind IN ('v','m') AND v.oid <> t.oid
ORDER BY 3,1;

-- ⑥ 非属主授权（除表属主外谁还能读；外部角色授权需 DBA 单独确认）
SELECT g.table_schema || '.' || g.table_name AS "表", g.grantee, g.privilege_type, g.is_grantable
FROM information_schema.role_table_grants g
JOIN cand c ON c.sch=g.table_schema AND c.tbl=g.table_name
JOIN pg_class k ON k.oid=to_regclass(format('%I.%I', g.table_schema, g.table_name))
JOIN pg_roles r ON r.oid=k.relowner
WHERE g.grantee <> r.rolname
ORDER BY 1,2;

-- ⑦ 逻辑复制发布 / 外部表（外部消费线索）
SELECT p.pubname, pt.schemaname || '.' || pt.tablename AS "表"
FROM pg_publication_tables pt JOIN pg_publication p ON p.pubname=pt.pubname
JOIN cand c ON c.sch=pt.schemaname AND c.tbl=pt.tablename;

SELECT foreign_table_schema || '.' || foreign_table_name AS "外部表", foreign_server_name
FROM information_schema.foreign_tables
JOIN cand c ON c.sch=foreign_table_schema AND c.tbl=foreign_table_name;

-- ⑧ 副本本体在位核对（本体缺失则副本不能直接归档，先查本体去向）
SELECT c.sch || '.' || c.tbl AS "副本", c.body AS "本体",
       EXISTS(SELECT 1 FROM pg_class x JOIN pg_namespace n ON n.oid=x.relnamespace
              WHERE n.nspname=split_part(c.body,'.',1) AND x.relname=split_part(c.body,'.',2)) AS "本体在位"
FROM cand c WHERE c.kind='duplicate'
ORDER BY 1;
