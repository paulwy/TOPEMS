-- ============================================================
-- P4: prod 反向表收敛（首批 11 张）
--
-- 依据：prod vs topems_test 只读盘点（prod 独有 74 张），处置单见
--   docs/quality/prod-governance-baseline-2026-11-04.md §7。
-- 本批两类：
--   A. 直接删除 3 张：0 行、0 入站 FK、运行时代码 0 引用
--      core.core_plugin_pricing / finance.core_finance_account_opening_balances / srm.supplier_users
--   B. 先重指向 FK 再删除 8 张 public 影子表（19 条 FK → iam/mobile/ehs 权威表）
--      mes.tenant_permissions / public.mobile_users / public.qa_ehs_* 6 张
-- 保留：qms 三张（无明确权威表）、finance.core_finance_currencies（16 行且运行时 CRUD）、
--   其余 60 张需业务确认。
--
-- 安全：每条 FK 先校验孤儿行（LEFT JOIN 权威表），再 DROP 旧约束、ADD ... NOT VALID + VALIDATE；
--   每张表 DROP 前校验 0 行且无入站 FK；全部 DROP 均不带 CASCADE。
-- 幂等：FK 已指向权威表 / 表已不存在时跳过。
-- 回滚：DDL 不可逆；恢复 2026-11-05 01:46 的 prod 备份
--   （~/topems/backups/topems_prod_pre_p4_20261105_014629.dump，4,178,289 字节，pg_restore -l 8320 行）。
-- ============================================================

SET lock_timeout = '5s';

-- ---------- A. 直接删除（0 行 / 0 FK / 0 运行时引用） ----------

DO $$
BEGIN
  IF to_regclass('core.core_plugin_pricing') IS NOT NULL THEN
    IF (SELECT count(*) FROM core.core_plugin_pricing) > 0 THEN
      RAISE EXCEPTION 'P4 ABORT: core.core_plugin_pricing has rows';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('core.core_plugin_pricing')) THEN
      RAISE EXCEPTION 'P4 ABORT: core.core_plugin_pricing still referenced by FK';
    END IF;
    DROP TABLE core.core_plugin_pricing;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('finance.core_finance_account_opening_balances') IS NOT NULL THEN
    IF (SELECT count(*) FROM finance.core_finance_account_opening_balances) > 0 THEN
      RAISE EXCEPTION 'P4 ABORT: finance.core_finance_account_opening_balances has rows';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('finance.core_finance_account_opening_balances')) THEN
      RAISE EXCEPTION 'P4 ABORT: finance.core_finance_account_opening_balances still referenced by FK';
    END IF;
    DROP TABLE finance.core_finance_account_opening_balances;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('srm.supplier_users') IS NOT NULL THEN
    IF (SELECT count(*) FROM srm.supplier_users) > 0 THEN
      RAISE EXCEPTION 'P4 ABORT: srm.supplier_users has rows';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('srm.supplier_users')) THEN
      RAISE EXCEPTION 'P4 ABORT: srm.supplier_users still referenced by FK';
    END IF;
    DROP TABLE srm.supplier_users;
  END IF;
END $$;

-- ---------- B1. FK 重指向：mes.tool_permissions → iam.tenant_permissions ----------

DO $$
BEGIN
  IF to_regclass('mes.tool_permissions') IS NOT NULL AND to_regclass('iam.tenant_permissions') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('mes.tool_permissions') AND conname = 'tool_permissions_tenant_permission_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('mes.tool_permissions') AND conname = 'tool_permissions_tenant_permission_id_fkey' AND confrelid = to_regclass('iam.tenant_permissions')) THEN
    IF EXISTS (SELECT 1 FROM mes.tool_permissions c LEFT JOIN iam.tenant_permissions p ON c.tenant_permission_id = p.id WHERE c.tenant_permission_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: mes.tool_permissions orphan rows vs iam.tenant_permissions';
    END IF;
    ALTER TABLE mes.tool_permissions DROP CONSTRAINT tool_permissions_tenant_permission_id_fkey;
    ALTER TABLE mes.tool_permissions ADD CONSTRAINT tool_permissions_tenant_permission_id_fkey FOREIGN KEY (tenant_permission_id) REFERENCES iam.tenant_permissions (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE mes.tool_permissions VALIDATE CONSTRAINT tool_permissions_tenant_permission_id_fkey;
  END IF;
END $$;

-- ---------- B2. FK 重指向：public.mobile_users 的 10 条引用 → mobile.mobile_users ----------

DO $$
BEGIN
  IF to_regclass('public.user_settings') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.user_settings') AND conname = 'user_settings_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.user_settings') AND conname = 'user_settings_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.user_settings c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.user_settings orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.user_settings DROP CONSTRAINT user_settings_user_id_fkey;
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.user_settings VALIDATE CONSTRAINT user_settings_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.barcode_scans') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.barcode_scans') AND conname = 'barcode_scans_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.barcode_scans') AND conname = 'barcode_scans_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.barcode_scans c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.barcode_scans orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.barcode_scans DROP CONSTRAINT barcode_scans_user_id_fkey;
    ALTER TABLE public.barcode_scans ADD CONSTRAINT barcode_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.barcode_scans VALIDATE CONSTRAINT barcode_scans_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.devices') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.devices') AND conname = 'devices_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.devices') AND conname = 'devices_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.devices c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.devices orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.devices DROP CONSTRAINT devices_user_id_fkey;
    ALTER TABLE public.devices ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.devices VALIDATE CONSTRAINT devices_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.mobile_scan_records') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.mobile_scan_records') AND conname = 'mobile_scan_records_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.mobile_scan_records') AND conname = 'mobile_scan_records_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.mobile_scan_records c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.mobile_scan_records orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.mobile_scan_records DROP CONSTRAINT mobile_scan_records_user_id_fkey;
    ALTER TABLE public.mobile_scan_records ADD CONSTRAINT mobile_scan_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.mobile_scan_records VALIDATE CONSTRAINT mobile_scan_records_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.offline_operations') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.offline_operations') AND conname = 'offline_operations_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.offline_operations') AND conname = 'offline_operations_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.offline_operations c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.offline_operations orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.offline_operations DROP CONSTRAINT offline_operations_user_id_fkey;
    ALTER TABLE public.offline_operations ADD CONSTRAINT offline_operations_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.offline_operations VALIDATE CONSTRAINT offline_operations_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.offline_sync_records') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.offline_sync_records') AND conname = 'offline_sync_records_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.offline_sync_records') AND conname = 'offline_sync_records_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.offline_sync_records c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.offline_sync_records orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.offline_sync_records DROP CONSTRAINT offline_sync_records_user_id_fkey;
    ALTER TABLE public.offline_sync_records ADD CONSTRAINT offline_sync_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.offline_sync_records VALIDATE CONSTRAINT offline_sync_records_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.photo_uploads') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.photo_uploads') AND conname = 'photo_uploads_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.photo_uploads') AND conname = 'photo_uploads_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.photo_uploads c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.photo_uploads orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.photo_uploads DROP CONSTRAINT photo_uploads_user_id_fkey;
    ALTER TABLE public.photo_uploads ADD CONSTRAINT photo_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.photo_uploads VALIDATE CONSTRAINT photo_uploads_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.push_devices') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.push_devices') AND conname = 'push_devices_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.push_devices') AND conname = 'push_devices_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.push_devices c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.push_devices orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.push_devices DROP CONSTRAINT push_devices_user_id_fkey;
    ALTER TABLE public.push_devices ADD CONSTRAINT push_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.push_devices VALIDATE CONSTRAINT push_devices_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.shortcuts') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.shortcuts') AND conname = 'shortcuts_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.shortcuts') AND conname = 'shortcuts_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.shortcuts c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.shortcuts orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.shortcuts DROP CONSTRAINT shortcuts_user_id_fkey;
    ALTER TABLE public.shortcuts ADD CONSTRAINT shortcuts_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.shortcuts VALIDATE CONSTRAINT shortcuts_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sync_policies') IS NOT NULL AND to_regclass('mobile.mobile_users') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.sync_policies') AND conname = 'sync_policies_user_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.sync_policies') AND conname = 'sync_policies_user_id_fkey' AND confrelid = to_regclass('mobile.mobile_users')) THEN
    IF EXISTS (SELECT 1 FROM public.sync_policies c LEFT JOIN mobile.mobile_users p ON c.user_id = p.id WHERE c.user_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.sync_policies orphan rows vs mobile.mobile_users';
    END IF;
    ALTER TABLE public.sync_policies DROP CONSTRAINT sync_policies_user_id_fkey;
    ALTER TABLE public.sync_policies ADD CONSTRAINT sync_policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES mobile.mobile_users (id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE public.sync_policies VALIDATE CONSTRAINT sync_policies_user_id_fkey;
  END IF;
END $$;

-- ---------- B3. FK 重指向：public.qa_ehs_* 8 条引用 → ehs.qa_ehs_* ----------

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_compliance_items') IS NOT NULL AND to_regclass('ehs.qa_ehs_compliance_evaluations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_compliance_items') AND conname = 'qa_ehs_compliance_items_evaluation_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_compliance_items') AND conname = 'qa_ehs_compliance_items_evaluation_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_compliance_evaluations')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_compliance_items c LEFT JOIN ehs.qa_ehs_compliance_evaluations p ON c.evaluation_id = p.id WHERE c.evaluation_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_compliance_items orphan rows (evaluation_id)';
    END IF;
    ALTER TABLE public.qa_ehs_compliance_items DROP CONSTRAINT qa_ehs_compliance_items_evaluation_id_fkey;
    ALTER TABLE public.qa_ehs_compliance_items ADD CONSTRAINT qa_ehs_compliance_items_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES ehs.qa_ehs_compliance_evaluations (id) NOT VALID;
    ALTER TABLE public.qa_ehs_compliance_items VALIDATE CONSTRAINT qa_ehs_compliance_items_evaluation_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_compliance_items') IS NOT NULL AND to_regclass('ehs.qa_ehs_environmental_regulations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_compliance_items') AND conname = 'qa_ehs_compliance_items_regulation_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_compliance_items') AND conname = 'qa_ehs_compliance_items_regulation_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_environmental_regulations')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_compliance_items c LEFT JOIN ehs.qa_ehs_environmental_regulations p ON c.regulation_id = p.id WHERE c.regulation_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_compliance_items orphan rows (regulation_id)';
    END IF;
    ALTER TABLE public.qa_ehs_compliance_items DROP CONSTRAINT qa_ehs_compliance_items_regulation_id_fkey;
    ALTER TABLE public.qa_ehs_compliance_items ADD CONSTRAINT qa_ehs_compliance_items_regulation_id_fkey FOREIGN KEY (regulation_id) REFERENCES ehs.qa_ehs_environmental_regulations (id) NOT VALID;
    ALTER TABLE public.qa_ehs_compliance_items VALIDATE CONSTRAINT qa_ehs_compliance_items_regulation_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_detection_records') IS NOT NULL AND to_regclass('ehs.qa_ehs_hazard_factors') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_detection_records') AND conname = 'qa_ehs_detection_records_factor_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_detection_records') AND conname = 'qa_ehs_detection_records_factor_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_hazard_factors')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_detection_records c LEFT JOIN ehs.qa_ehs_hazard_factors p ON c.factor_id = p.id WHERE c.factor_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_detection_records orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_detection_records DROP CONSTRAINT qa_ehs_detection_records_factor_id_fkey;
    ALTER TABLE public.qa_ehs_detection_records ADD CONSTRAINT qa_ehs_detection_records_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES ehs.qa_ehs_hazard_factors (id) NOT VALID;
    ALTER TABLE public.qa_ehs_detection_records VALIDATE CONSTRAINT qa_ehs_detection_records_factor_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_drill_evaluations') IS NOT NULL AND to_regclass('ehs.qa_ehs_drill_records') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_evaluations') AND conname = 'qa_ehs_drill_evaluations_drill_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_evaluations') AND conname = 'qa_ehs_drill_evaluations_drill_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_drill_records')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_drill_evaluations c LEFT JOIN ehs.qa_ehs_drill_records p ON c.drill_id = p.id WHERE c.drill_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_evaluations orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_drill_evaluations DROP CONSTRAINT qa_ehs_drill_evaluations_drill_id_fkey;
    ALTER TABLE public.qa_ehs_drill_evaluations ADD CONSTRAINT qa_ehs_drill_evaluations_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records (id) NOT VALID;
    ALTER TABLE public.qa_ehs_drill_evaluations VALIDATE CONSTRAINT qa_ehs_drill_evaluations_drill_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_drill_problems') IS NOT NULL AND to_regclass('ehs.qa_ehs_drill_records') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_problems') AND conname = 'qa_ehs_drill_problems_drill_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_problems') AND conname = 'qa_ehs_drill_problems_drill_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_drill_records')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_drill_problems c LEFT JOIN ehs.qa_ehs_drill_records p ON c.drill_id = p.id WHERE c.drill_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_problems orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_drill_problems DROP CONSTRAINT qa_ehs_drill_problems_drill_id_fkey;
    ALTER TABLE public.qa_ehs_drill_problems ADD CONSTRAINT qa_ehs_drill_problems_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES ehs.qa_ehs_drill_records (id) NOT VALID;
    ALTER TABLE public.qa_ehs_drill_problems VALIDATE CONSTRAINT qa_ehs_drill_problems_drill_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_drill_records') IS NOT NULL AND to_regclass('ehs.qa_ehs_drill_plans') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_records') AND conname = 'qa_ehs_drill_records_plan_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_drill_records') AND conname = 'qa_ehs_drill_records_plan_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_drill_plans')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_drill_records c LEFT JOIN ehs.qa_ehs_drill_plans p ON c.plan_id = p.id WHERE c.plan_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_records orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_drill_records DROP CONSTRAINT qa_ehs_drill_records_plan_id_fkey;
    ALTER TABLE public.qa_ehs_drill_records ADD CONSTRAINT qa_ehs_drill_records_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES ehs.qa_ehs_drill_plans (id) NOT VALID;
    ALTER TABLE public.qa_ehs_drill_records VALIDATE CONSTRAINT qa_ehs_drill_records_plan_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_hazards') IS NOT NULL AND to_regclass('ehs.qa_ehs_inspection_records') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_hazards') AND conname = 'qa_ehs_hazards_inspection_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_hazards') AND conname = 'qa_ehs_hazards_inspection_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_inspection_records')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_hazards c LEFT JOIN ehs.qa_ehs_inspection_records p ON c.inspection_id = p.id WHERE c.inspection_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_hazards orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_hazards DROP CONSTRAINT qa_ehs_hazards_inspection_id_fkey;
    ALTER TABLE public.qa_ehs_hazards ADD CONSTRAINT qa_ehs_hazards_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES ehs.qa_ehs_inspection_records (id) NOT VALID;
    ALTER TABLE public.qa_ehs_hazards VALIDATE CONSTRAINT qa_ehs_hazards_inspection_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_inspection_record_items') IS NOT NULL AND to_regclass('ehs.qa_ehs_inspection_records') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_inspection_record_items') AND conname = 'qa_ehs_inspection_record_items_record_id_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.qa_ehs_inspection_record_items') AND conname = 'qa_ehs_inspection_record_items_record_id_fkey' AND confrelid = to_regclass('ehs.qa_ehs_inspection_records')) THEN
    IF EXISTS (SELECT 1 FROM public.qa_ehs_inspection_record_items c LEFT JOIN ehs.qa_ehs_inspection_records p ON c.record_id = p.id WHERE c.record_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_inspection_record_items orphan rows';
    END IF;
    ALTER TABLE public.qa_ehs_inspection_record_items DROP CONSTRAINT qa_ehs_inspection_record_items_record_id_fkey;
    ALTER TABLE public.qa_ehs_inspection_record_items ADD CONSTRAINT qa_ehs_inspection_record_items_record_id_fkey FOREIGN KEY (record_id) REFERENCES ehs.qa_ehs_inspection_records (id) NOT VALID;
    ALTER TABLE public.qa_ehs_inspection_record_items VALIDATE CONSTRAINT qa_ehs_inspection_record_items_record_id_fkey;
  END IF;
END $$;

-- ---------- B4. 删除 8 张已无入站 FK 的 public 影子表 ----------

DO $$
BEGIN
  IF to_regclass('mes.tenant_permissions') IS NOT NULL THEN
    IF (SELECT count(*) FROM mes.tenant_permissions) > 0 THEN RAISE EXCEPTION 'P4 ABORT: mes.tenant_permissions has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('mes.tenant_permissions')) THEN RAISE EXCEPTION 'P4 ABORT: mes.tenant_permissions inbound FK remains'; END IF;
    DROP TABLE mes.tenant_permissions;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.mobile_users') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.mobile_users) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.mobile_users has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.mobile_users')) THEN RAISE EXCEPTION 'P4 ABORT: public.mobile_users inbound FK remains'; END IF;
    DROP TABLE public.mobile_users;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_compliance_evaluations') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_compliance_evaluations) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_compliance_evaluations has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_compliance_evaluations')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_compliance_evaluations inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_compliance_evaluations;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_drill_plans') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_drill_plans) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_plans has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_drill_plans')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_plans inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_drill_plans;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_drill_records') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_drill_records) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_records has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_drill_records')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_drill_records inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_drill_records;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_environmental_regulations') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_environmental_regulations) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_environmental_regulations has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_environmental_regulations')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_environmental_regulations inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_environmental_regulations;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_hazard_factors') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_hazard_factors) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_hazard_factors has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_hazard_factors')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_hazard_factors inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_hazard_factors;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.qa_ehs_inspection_records') IS NOT NULL THEN
    IF (SELECT count(*) FROM public.qa_ehs_inspection_records) > 0 THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_inspection_records has rows'; END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = to_regclass('public.qa_ehs_inspection_records')) THEN RAISE EXCEPTION 'P4 ABORT: public.qa_ehs_inspection_records inbound FK remains'; END IF;
    DROP TABLE public.qa_ehs_inspection_records;
  END IF;
END $$;

-- ---------- B5. 终态校验（任一不满足即回滚） ----------

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM (VALUES
    ('core.core_plugin_pricing'),('finance.core_finance_account_opening_balances'),('srm.supplier_users'),
    ('mes.tenant_permissions'),('public.mobile_users'),('public.qa_ehs_compliance_evaluations'),
    ('public.qa_ehs_drill_plans'),('public.qa_ehs_drill_records'),('public.qa_ehs_environmental_regulations'),
    ('public.qa_ehs_hazard_factors'),('public.qa_ehs_inspection_records')) v(t)
  WHERE to_regclass(t) IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION 'P4 VERIFY: % shadow tables still present', n; END IF;

  SELECT count(*) INTO n FROM pg_constraint WHERE NOT convalidated;
  IF n > 0 THEN RAISE EXCEPTION 'P4 VERIFY: % NOT VALID constraints remain', n; END IF;

  SELECT count(*) INTO n FROM pg_constraint
  WHERE conname IN ('tool_permissions_tenant_permission_id_fkey','user_settings_user_id_fkey','barcode_scans_user_id_fkey','devices_user_id_fkey','mobile_scan_records_user_id_fkey','offline_operations_user_id_fkey','offline_sync_records_user_id_fkey','photo_uploads_user_id_fkey','push_devices_user_id_fkey','shortcuts_user_id_fkey','sync_policies_user_id_fkey','qa_ehs_compliance_items_evaluation_id_fkey','qa_ehs_compliance_items_regulation_id_fkey','qa_ehs_detection_records_factor_id_fkey','qa_ehs_drill_evaluations_drill_id_fkey','qa_ehs_drill_problems_drill_id_fkey','qa_ehs_hazards_inspection_id_fkey','qa_ehs_inspection_record_items_record_id_fkey')
    AND connamespace::regnamespace::text IN ('public','mes')
    AND confrelid IN (to_regclass('iam.tenant_permissions'),to_regclass('mobile.mobile_users'),to_regclass('ehs.qa_ehs_compliance_evaluations'),to_regclass('ehs.qa_ehs_drill_plans'),to_regclass('ehs.qa_ehs_drill_records'),to_regclass('ehs.qa_ehs_environmental_regulations'),to_regclass('ehs.qa_ehs_hazard_factors'),to_regclass('ehs.qa_ehs_inspection_records'));
  IF n <> 18 THEN RAISE EXCEPTION 'P4 VERIFY: expected 18 re-pointed FKs, got %', n; END IF;
END $$;
