-- 2026-08-31 P1-2 阶段0 schema 归位（B 项）：core_finance_* public → finance
-- 背景：
--   finance 代码已用 finance.core_finance_*（显式前缀 / 无前缀 + SEARCH_PATH='finance, public' 优先解析）；
--   public 旧版 13 列表（含 deleted_at）为历史遗留，与 finance 新版 26 列表（无 deleted_at，扩展字段）同名并存。
-- 处理：
--   ① public 独有 3 张（finance 无同名）→ SET SCHEMA finance；
--   ② 同名 10 张：public 旧版归档 _archive_core_finance_*（数据保留），finance 新版为运行真相。
-- 幂等：仅在表仍位于 public 时执行；已迁移/已归档环境自动跳过。
-- 数据说明：旧版数据保留在 _archive_*；如确需并入 finance 新版，按公共列 INSERT ... SELECT ... ON CONFLICT (id) DO NOTHING。
DO $mig$
BEGIN
  -- ① finance 无同名的 public 表 → 迁移
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_account_opening_balances' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_account_opening_balances SET SCHEMA finance; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_voucher_entries' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_voucher_entries SET SCHEMA finance; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_voucher_templates' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_voucher_templates SET SCHEMA finance; END IF;

  -- ② 同名旧表归档（数据保留）
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_accounts' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_accounts RENAME TO _archive_core_finance_accounts; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_approval_workflows' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_approval_workflows RENAME TO _archive_core_finance_approval_workflows; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_aux_accounts' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_aux_accounts RENAME TO _archive_core_finance_aux_accounts; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_aux_balances' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_aux_balances RENAME TO _archive_core_finance_aux_balances; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_ledger' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_ledger RENAME TO _archive_core_finance_ledger; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_periods' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_periods RENAME TO _archive_core_finance_periods; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_reconciliation_items' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_reconciliation_items RENAME TO _archive_core_finance_reconciliation_items; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_reconciliation_sessions' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_reconciliation_sessions RENAME TO _archive_core_finance_reconciliation_sessions; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_voucher_lines' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_voucher_lines RENAME TO _archive_core_finance_voucher_lines; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_vouchers' AND c.relkind='r')
  THEN ALTER TABLE public.core_finance_vouchers RENAME TO _archive_core_finance_vouchers; END IF;
END $mig$;
