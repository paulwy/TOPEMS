-- 数据库治理：CHECK 约束补链（低风险状态/布尔类，对齐 topems_prod 权威值域）
-- 来源：topems_prod 只读审计 2026-11-03 —— 以 prod 现有 25 个 CHECK 为基准，
--       对拍 topems(6)/topems_prepare(16) 缺失项；数据先校验（违规 0）后补链。
-- 演练：topems_prepare 先行（9 项）→ topems 落地（11 项）→ prod 幂等 no-op。
-- 守卫：to_regclass 变量（NULL 安全）+ conname 不存在才 ADD + information_schema 列存在。
-- 兜底：数据违反值域 → RAISE EXCEPTION 阻断（不静默跳过）。
-- 注：crm.audit_logs ck_audit_logs_status_standard 因 topems 存在 'error' 值（11 条，prod 值域缺失）
--     值域冲突，另行登记统一，本轮不入补链。

DO $$ DECLARE t oid := to_regclass('ai.ai_models'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ai_models_status_check')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ai' AND table_name='ai_models' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM ai.ai_models WHERE status IS NOT NULL AND status NOT IN ('active','inactive','maintenance')) THEN
      RAISE EXCEPTION 'db-governance: ai.ai_models.status violates CHECK value set';
    END IF;
    ALTER TABLE ai.ai_models ADD CONSTRAINT ai_models_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('ai.ai_models'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ai_models_type_check')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ai' AND table_name='ai_models' AND column_name='type') THEN
    IF EXISTS (SELECT 1 FROM ai.ai_models WHERE type IS NOT NULL AND type NOT IN ('chat','embedding','image','audio')) THEN
      RAISE EXCEPTION 'db-governance: ai.ai_models.type violates CHECK value set';
    END IF;
    ALTER TABLE ai.ai_models ADD CONSTRAINT ai_models_type_check CHECK ((type = ANY (ARRAY['chat'::text, 'embedding'::text, 'image'::text, 'audio'::text])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('ehs.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_duration_hours')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='training_records' AND column_name='duration_hours') THEN
    IF EXISTS (SELECT 1 FROM ehs.training_records WHERE duration_hours IS NOT NULL AND duration_hours < 0) THEN
      RAISE EXCEPTION 'db-governance: ehs.training_records.duration_hours negative';
    END IF;
    ALTER TABLE ehs.training_records ADD CONSTRAINT ck_training_records_duration_hours CHECK (((duration_hours IS NULL) OR (duration_hours >= (0)::numeric)));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('ehs.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_pass_rate')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='training_records' AND column_name='pass_rate') THEN
    IF EXISTS (SELECT 1 FROM ehs.training_records WHERE pass_rate IS NOT NULL AND (pass_rate < 0 OR pass_rate > 100)) THEN
      RAISE EXCEPTION 'db-governance: ehs.training_records.pass_rate out of [0,100]';
    END IF;
    ALTER TABLE ehs.training_records ADD CONSTRAINT ck_training_records_pass_rate CHECK (((pass_rate IS NULL) OR ((pass_rate >= (0)::numeric) AND (pass_rate <= (100)::numeric))));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('ehs.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='training_records' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM ehs.training_records WHERE status IS NOT NULL AND status NOT IN ('ongoing','completed','failed')) THEN
      RAISE EXCEPTION 'db-governance: ehs.training_records.status violates CHECK value set';
    END IF;
    ALTER TABLE ehs.training_records ADD CONSTRAINT ck_training_records_status CHECK (((status)::text = ANY ((ARRAY['ongoing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('finance.sales_invoices'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='sales_invoices_invoice_type_check')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='sales_invoices' AND column_name='invoice_type') THEN
    IF EXISTS (SELECT 1 FROM finance.sales_invoices WHERE invoice_type IS NOT NULL AND invoice_type NOT IN ('tax','普通发票','专用发票')) THEN
      RAISE EXCEPTION 'db-governance: finance.sales_invoices.invoice_type violates CHECK value set';
    END IF;
    ALTER TABLE finance.sales_invoices ADD CONSTRAINT sales_invoices_invoice_type_check CHECK (((invoice_type)::text = ANY ((ARRAY['tax'::character varying, '普通发票'::character varying, '专用发票'::character varying])::text[])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('finance.sales_invoices'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='sales_invoices_status_check')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='sales_invoices' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM finance.sales_invoices WHERE status IS NOT NULL AND status NOT IN ('draft','issued','paid','overdue','cancelled')) THEN
      RAISE EXCEPTION 'db-governance: finance.sales_invoices.status violates CHECK value set';
    END IF;
    ALTER TABLE finance.sales_invoices ADD CONSTRAINT sales_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'issued'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('hrm.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_cost')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='cost') THEN
    IF EXISTS (SELECT 1 FROM hrm.training_records WHERE cost IS NOT NULL AND cost < 0) THEN
      RAISE EXCEPTION 'db-governance: hrm.training_records.cost negative';
    END IF;
    ALTER TABLE hrm.training_records ADD CONSTRAINT ck_training_records_cost CHECK (((cost IS NULL) OR (cost >= (0)::numeric)));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('hrm.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_duration_hours')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='duration_hours') THEN
    IF EXISTS (SELECT 1 FROM hrm.training_records WHERE duration_hours IS NOT NULL AND duration_hours < 0) THEN
      RAISE EXCEPTION 'db-governance: hrm.training_records.duration_hours negative';
    END IF;
    ALTER TABLE hrm.training_records ADD CONSTRAINT ck_training_records_duration_hours CHECK (((duration_hours IS NULL) OR (duration_hours >= (0)::numeric)));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('hrm.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_score')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='score') THEN
    IF EXISTS (SELECT 1 FROM hrm.training_records WHERE score IS NOT NULL AND (score < 0 OR score > 100)) THEN
      RAISE EXCEPTION 'db-governance: hrm.training_records.score out of [0,100]';
    END IF;
    ALTER TABLE hrm.training_records ADD CONSTRAINT ck_training_records_score CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric))));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('hrm.training_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_training_records_status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM hrm.training_records WHERE status IS NOT NULL AND status NOT IN ('planned','active','inactive','archived','completed','cancelled')) THEN
      RAISE EXCEPTION 'db-governance: hrm.training_records.status violates CHECK value set';
    END IF;
    ALTER TABLE hrm.training_records ADD CONSTRAINT ck_training_records_status CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('mobile.mobile_tasks'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_mobile_tasks_status_standard')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mobile' AND table_name='mobile_tasks' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM mobile.mobile_tasks WHERE status IS NOT NULL AND status NOT IN ('pending','in_progress','completed','cancelled','on_hold')) THEN
      RAISE EXCEPTION 'db-governance: mobile.mobile_tasks.status violates CHECK value set';
    END IF;
    ALTER TABLE mobile.mobile_tasks ADD CONSTRAINT ck_mobile_tasks_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'on_hold'::character varying])::text[]))));
  END IF;
END $$;

DO $$ DECLARE t oid := to_regclass('crm.returns'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND conname='ck_returns_status_standard')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='crm' AND table_name='returns' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM crm.returns WHERE status IS NOT NULL AND status NOT IN ('pending','accepted','approved','rejected','processing','completed','cancelled')) THEN
      RAISE EXCEPTION 'db-governance: crm.returns.status violates CHECK value set';
    END IF;
    ALTER TABLE crm.returns ADD CONSTRAINT ck_returns_status_standard CHECK (((status IS NULL) OR (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'completed'::text, 'cancelled'::text]))));
  END IF;
END $$;
