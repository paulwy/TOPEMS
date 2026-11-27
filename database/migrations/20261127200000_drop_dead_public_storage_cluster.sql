-- ============================================================
-- 20261127200000: 清除 public 层「死存储簇」33 张表（EHS / LIMS / finance 凭证 / 配置版本）
--
-- 背景（2026-11-27 public 层第二批，接 20261127160000/27180000 的方法论）：
--   上一轮证明 public 不能整层删；本批用「依赖闭包」把可删范围算清楚，条件是同一张表要同时满足：
--     ① 0 行；② 运行期代码（svc/apps/crates 的 *.rs）没有 `public.<表名>` 引用；③ init 与 migrations 里没有创建它的语句；
--     ④ 它的所有入向引用方要么也在本批，要么本身也是「0 行 + 无运行期引用」。
--   按此算法收敛出 33 张，且全部落在三个自洽的簇里（子表 → 父表的引用全在簇内，没有任何跨 schema 外部引用）：
--     · EHS：qa_ehs_accidents / _investigations / _reviews / _treatments、qa_ehs_hazardous_materials / _material_stocks / _stock_records、
--            qa_ehs_health_exam_plans / _records / _abnormalities、qa_ehs_inspection_plans / _items（12 张）
--     · LIMS：qa_lab_reagents / _alerts / _history、qa_lims_method_categories / _test_methods / _validations / _versions、
--            qa_lims_pt_plans / _samples / _evaluations / _results / _corrective_actions、
--            qa_lims_uncertainty_projects / _sources / _components、qa_lims_sample_barcodes / _barcode_scan_records（18 张）
--     · 其他：finance_voucher_templates + core_finance_vouchers、versions + configurations（3 张）
--   注意：这 33 张与上一轮那 4 张不同——它们在 init/migrations 中**也没有创建语句**（属架构试验期遗留），
--   只在库里存在，所以删掉不会让新库构建「凭空少东西」，也不会被脚本重建回来。
--
-- 明确保留（被运行期代码引用，即使 0 行也不能删）：
--   qa_lab_instruments（LIMS 仪器，被 calibration_records / instrument_data / collection_tasks 引用，但自身有运行期 SQL）
--   qa_lab_tasks（被 lims.qa_lab_records 外键指向，且有运行期 SQL）
--   core_doc_documents / core_doc_folders / core_doc_templates / core_flow_variables / automation_rules（均有运行期引用，
--   其中 core_doc_folders/_templates 还被 flow.core_doc_documents 外键指向 → 另批处理，不在本轮）
--
-- 实测（2026-11-27）：本机 dev 33 张全部 0 行；生产 topems_prod 33 张**全部不存在** → 生产为纯空跑。
--
-- 动作（顺序固定）：
--   1) 预检：逐张断言 0 行、无外部入向 FK、无视图依赖；缺席则跳过；
--   2) 摘除簇内 27 条外键（含 qa_lims_method_categories 自引用），消除删除顺序依赖；
--   3) 一次 DROP TABLE 33 张（IF EXISTS）；
--   4) 收尾断言：33 张全部不存在。
--
-- 幂等：to_regclass 守卫 + IF EXISTS。
-- 事务：文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261127200000_*.rollback.sql（pg_dump 原样重建 33 张空结构）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 0) 建立本批名单（后续断言与外键摘除都按它判定）
CREATE TEMP TABLE pg_temp._doomed33(t text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO pg_temp._doomed33(t) VALUES
      ('configurations'),
      ('core_finance_vouchers'),
      ('finance_voucher_templates'),
      ('qa_ehs_accident_investigations'),
      ('qa_ehs_accident_reviews'),
      ('qa_ehs_accident_treatments'),
      ('qa_ehs_accidents'),
      ('qa_ehs_hazardous_materials'),
      ('qa_ehs_health_abnormalities'),
      ('qa_ehs_health_exam_plans'),
      ('qa_ehs_health_exam_records'),
      ('qa_ehs_inspection_items'),
      ('qa_ehs_inspection_plans'),
      ('qa_ehs_material_stocks'),
      ('qa_ehs_stock_records'),
      ('qa_lab_reagent_alerts'),
      ('qa_lab_reagent_history'),
      ('qa_lab_reagents'),
      ('qa_lims_barcode_scan_records'),
      ('qa_lims_method_categories'),
      ('qa_lims_method_validations'),
      ('qa_lims_method_versions'),
      ('qa_lims_pt_corrective_actions'),
      ('qa_lims_pt_evaluations'),
      ('qa_lims_pt_plans'),
      ('qa_lims_pt_results'),
      ('qa_lims_pt_samples'),
      ('qa_lims_sample_barcodes'),
      ('qa_lims_test_methods'),
      ('qa_lims_uncertainty_components'),
      ('qa_lims_uncertainty_projects'),
      ('qa_lims_uncertainty_sources'),
      ('versions');


-- 1) 预检断言
DO $mig$
DECLARE
  r record; v_rows bigint; v_ext text; v_vdep int;
BEGIN
  FOR r IN SELECT t FROM pg_temp._doomed33 ORDER BY t
  LOOP
    IF to_regclass(format('public.%I', r.t)) IS NULL THEN
      RAISE NOTICE 'skip: public.% 不存在', r.t;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', r.t) INTO v_rows;
    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'public.% 有 % 行，拒绝删除（本批只处理 0 行死表）', r.t, v_rows;
    END IF;

    SELECT string_agg(format('%s.%s(%s)', cn.nspname, cl.relname, con.conname), ', ') INTO v_ext
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace cn ON cn.oid = cl.relnamespace
     WHERE con.contype = 'f'
       AND con.confrelid = format('public.%I', r.t)::regclass
       AND NOT (cn.nspname = 'public' AND cl.relname IN (SELECT t FROM pg_temp._doomed33));
    IF v_ext IS NOT NULL THEN
      RAISE EXCEPTION 'public.% 仍被簇外引用: %，必须先从本批剔除并单独处理', r.t, v_ext;
    END IF;

    SELECT count(*) INTO v_vdep FROM pg_depend d
     WHERE d.refobjid = format('public.%I', r.t)::regclass AND d.deptype = 'n'
       AND EXISTS (SELECT 1 FROM pg_rewrite rv WHERE rv.oid = d.objid);
    IF v_vdep <> 0 THEN
      RAISE EXCEPTION 'public.% 仍被 % 个视图依赖', r.t, v_vdep;
    END IF;
  END LOOP;
  RAISE NOTICE 'preflight ok: 33 张均为 0 行且簇外零引用';
END
$mig$;

-- 2) 摘除簇内外键（先摘后删，避免删除顺序与自引用循环）
DO $mig$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT cn.nspname AS sch, cl.relname AS tbl, con.conname AS con
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_namespace cn ON cn.oid = cl.relnamespace
     WHERE con.contype = 'f'
       AND cn.nspname = 'public'
       AND cl.relname IN (SELECT t FROM pg_temp._doomed33)
       AND con.confrelid IN (
             -- 空库/生产缺席时跳过：必须先 to_regclass 判空再 cast，
             -- 否则 regclass 转换会因 relation 不存在中止整条迁移。
             SELECT to_regclass(format('public.%I', t))
               FROM pg_temp._doomed33
              WHERE to_regclass(format('public.%I', t)) IS NOT NULL
           )
     ORDER BY 1,2,3
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.sch, r.tbl, r.con);
    RAISE NOTICE 'dropped fk: %.% %', r.sch, r.tbl, r.con;
  END LOOP;
END
$mig$;

-- 3) 物理删除（33 张 0 行死表；生产侧全部不存在 → 空跑）
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: public 层死存储簇 33 张：0 行、无运行期引用、无 init/migration 创建来源、簇外零引用
-- destructive-owner: platform
-- destructive-ticket: PUB-LEGACY-20261127
-- destructive-expires: 2027-05-26
-- destructive-rows-at-review: 0
-- destructive-backup: 0 行；结构由本迁移 rollback 按 pg_dump 原样重建
DROP TABLE IF EXISTS
  public.configurations,
  public.core_finance_vouchers,
  public.finance_voucher_templates,
  public.qa_ehs_accident_investigations,
  public.qa_ehs_accident_reviews,
  public.qa_ehs_accident_treatments,
  public.qa_ehs_accidents,
  public.qa_ehs_hazardous_materials,
  public.qa_ehs_health_abnormalities,
  public.qa_ehs_health_exam_plans,
  public.qa_ehs_health_exam_records,
  public.qa_ehs_inspection_items,
  public.qa_ehs_inspection_plans,
  public.qa_ehs_material_stocks,
  public.qa_ehs_stock_records,
  public.qa_lab_reagent_alerts,
  public.qa_lab_reagent_history,
  public.qa_lab_reagents,
  public.qa_lims_barcode_scan_records,
  public.qa_lims_method_categories,
  public.qa_lims_method_validations,
  public.qa_lims_method_versions,
  public.qa_lims_pt_corrective_actions,
  public.qa_lims_pt_evaluations,
  public.qa_lims_pt_plans,
  public.qa_lims_pt_results,
  public.qa_lims_pt_samples,
  public.qa_lims_sample_barcodes,
  public.qa_lims_test_methods,
  public.qa_lims_uncertainty_components,
  public.qa_lims_uncertainty_projects,
  public.qa_lims_uncertainty_sources,
  public.versions;

-- 4) 收尾断言
DO $mig$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO v_left
    FROM pg_temp._doomed33 WHERE to_regclass(format('public.%I', t)) IS NOT NULL;
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION '仍有死表未清除: %', v_left;
  END IF;
  RAISE NOTICE 'done: public 层 33 张死表已清除';
END
$mig$;
