-- 2026-10-26 移除 23 张业务表上误用的模板 status CHECK（同款炸弹批量修复）
-- 背景（全库扫描实测）：622 张表含 status CHECK；其中 23 张为「通用三态模板」
--       ck_*_status_standard CHECK (status IS NULL OR status IN ('active','inactive','archived'))
--       被批量贴到业务表，而业务 status DEFAULT 是领域态（draft/pending/open/unmatched/posted/
--       trial/submitted/applied/planned...）——DEFAULT 不在 CHECK 内，**不带 status 的 INSERT 必违反**
--       （与 ehs.training_records 'enrolled' 同款炸弹 ×23）。erp 业务代码实测枚举 7 态
--       （draft/approved/rejected/pending/active/inactive/archived），CHECK 只认 3 态——
--       约束拦的是合法业务值，属模板误用。
-- 处置：删除这 23 张表上的 *_status_standard CHECK（业务状态机由代码层枚举保证；
--       DEFAULT 业务态保留）。数据面：22 张 0 行、crm.contracts 1 行（active 合法）——
--       删除约束零数据风险。非 status_standard 的其他 CHECK 不动。
-- 幂等：按表名 + 约束名 LIKE '%_status_standard' 匹配删除，约束不存在即跳过，可重复执行。

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT n.nspname, c.relname, con.conname
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE con.contype = 'c'
          AND con.conname LIKE '%_status_standard'
          AND (n.nspname, c.relname) IN (
              ('communication','core_notification_deliveries'),
              ('core','knowledge_documents'),
              ('crm','contracts'),
              ('erp','vouchers'),
              ('finance','reconcile_items'),
              ('finance','reconcile_orders'),
              ('finance','vouchers'),
              ('flow','core_mdm_approvals'),
              ('lims','lims_safety_tasks'),
              ('master_data','mdm_billing_records'),
              ('master_data','mdm_sla_incidents'),
              ('mes','material_plans'),
              ('public','core_mdm_approvals'),
              ('public','subscriptions'),
              ('qms','qa_ehs_hazards'),
              ('rd','bugs'),
              ('rs','change_orders'),
              ('rs','change_requests'),
              ('rs','patents'),
              ('rs','research_costs'),
              ('scm','incoming_inspections'),
              ('scm','incoming_notices'),
              ('tms','tms_shipments')
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.nspname, r.relname, r.conname);
        RAISE NOTICE 'dropped % on %.%', r.conname, r.nspname, r.relname;
    END LOOP;
END $$;
