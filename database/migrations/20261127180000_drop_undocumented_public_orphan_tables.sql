-- ============================================================
-- 20261127180000: 清除 public 层四张「无来源、无引用、0 行」孤儿表
--
-- 背景（2026-11-27 public 层全量盘点结论，217 张表/86 张生产）：
--   逐一比对「结构来源（database/init + database/migrations）」与「引用方（外键/视图/运行期代码）」
--   后发现四张表两头皆空：既没有任何脚本创建它们，也没有任何外键、视图、Rust/SQL 代码指向它们，
--   且行数为 0 —— 属于历次人工试验后没有回收的残骸，不是「先建后删」的历史层。
--     · core_feedbacks                           （通用反馈收集，功能已由 iam 侧承接）
--     · hrm_master_data_refs                     （HRM 主数据映射，HRM 模块未落地）
--     · wms_master_data_refs                     （WMS 主数据映射，同上）
--     · qa_lab_samples_merge_backup_20260919     （2026-09-19 一次性数据合并的备份快照，早已清空）
--
--   为什么不是「整层 public 清理」：盘点证明 public 并非纯镜像层——
--   运行期代码显式写 `public.core_tenants` / `public.audit_logs` 等（1,257 处），
--   `finance.*` 有 60 条外键指向 `public.core_tenants`，`lims.*` 指向 `public.qa_lab_samples`。
--   这些 public 表是**在用**的权威表，同名业务 schema 表反而是另一份。故本轮只清「零引用孤儿」。
--
-- 动作：
--   1) 前置断言：四张表若存在，必须 0 行、无入向/出向外键、无视图依赖 → 否则报错中止；
--   2) 逐张 DROP TABLE（IF EXISTS，生产侧本就没有这四张，纯空跑）；
--   3) 收尾断言：四张表均不存在。
--
-- 幂等：全部走 to_regclass 守卫；表已不在则跳过。
-- 事务：文件内不含 BEGIN/COMMIT（由迁移执行器包裹）。
-- 回滚：database/rollback/20261127180000_*.rollback.sql（按 pg_dump 结构原样重建，含索引/RLS/策略/授权）
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 1) 前置断言：只能是「0 行 + 零引用」的孤儿
DO $mig$
DECLARE
  r record;
  v_rows bigint;
  v_infk int;
  v_vdep int;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('core_feedbacks'),
      ('hrm_master_data_refs'),
      ('wms_master_data_refs'),
      ('qa_lab_samples_merge_backup_20260919')
    ) AS v(tbl)
  LOOP
    IF to_regclass(format('public.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip: public.% 不存在（生产侧预期如此）', r.tbl;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', r.tbl) INTO v_rows;
    SELECT count(*) INTO v_infk FROM pg_constraint
     WHERE confrelid = format('public.%I', r.tbl)::regclass AND contype = 'f';
    SELECT count(*) INTO v_vdep FROM pg_depend d
     WHERE d.refobjid = format('public.%I', r.tbl)::regclass AND d.deptype = 'n'
       AND EXISTS (SELECT 1 FROM pg_rewrite rv WHERE rv.oid = d.objid);

    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'public.% 有 % 行，不是空表，拒绝删除', r.tbl, v_rows;
    END IF;
    IF v_infk <> 0 THEN
      RAISE EXCEPTION 'public.% 仍被 % 条外键引用，先退引用', r.tbl, v_infk;
    END IF;
    IF v_vdep <> 0 THEN
      RAISE EXCEPTION 'public.% 仍被 % 个视图依赖，先改视图', r.tbl, v_vdep;
    END IF;

    RAISE NOTICE 'ok: public.% 0 行、零引用，可删', r.tbl;
  END LOOP;
END
$mig$;

-- 2) 物理删除（结构与数据均由 rollback 脚本原样重建）
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 无来源、无引用、0 行的历史试验残骸（四个表名均已确认在 init/migrations/代码中零出现）
-- destructive-owner: platform
-- destructive-ticket: PUB-LEGACY-20261127
-- destructive-expires: 2027-05-26
-- destructive-rows-at-review: 0
-- destructive-backup: 0 行；结构已归档于 rollback 脚本（pg_dump 原样导出）
DROP TABLE IF EXISTS public.core_feedbacks;
DROP TABLE IF EXISTS public.hrm_master_data_refs;
DROP TABLE IF EXISTS public.wms_master_data_refs;
DROP TABLE IF EXISTS public.qa_lab_samples_merge_backup_20260919;

-- 3) 收尾断言
DO $mig$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_left FROM (VALUES
    ('core_feedbacks'),
    ('hrm_master_data_refs'),
    ('wms_master_data_refs'),
    ('qa_lab_samples_merge_backup_20260919')
  ) AS v(t)
  WHERE to_regclass(format('public.%I', t)) IS NOT NULL;

  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION '仍有孤儿表未清除: %', v_left;
  END IF;
  RAISE NOTICE 'done: 四张 public 孤儿表已清除';
END
$mig$;
