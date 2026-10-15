-- C6：DROP 非 chat 死表（过度工程补充清理）。
--
-- 背景：
--   * core_billing_invoices / core_billing_plans / core_subscriptions /
--     core_finance_voucher_entries / core_finance_voucher_templates 五表名，
--     全仓 .rs 代码引用 ≈0（仅白名单注释或无条目），live 恒空、无读写。
--   * 对照活表保留：core_finance_vouchers(65 引用) / core_finance_voucher_lines(29) /
--     core_notifications(47) 不动；仅其 siblings entries/templates 死。
--   * chat 3 表（core_chat_rooms/members/messages，K2 CONFIRM）不在本迁移范围。
--
-- scope（按决策映射 C6）：
--   core_billing_invoices / core_billing_plans → iam / mes / public
--   core_subscriptions                          → iam / mes（public 另计/K2 联动）
--   core_finance_voucher_entries / templates    → public
--
-- 依赖顺序：core_billing_invoices.subscription_id 有 FK → core_subscriptions，
--   且 core_subscriptions.plan_id 有 FK → core_billing_plans；
--   故须先 drop invoices → 再 drop subscriptions → 最后 billing_plans（CASCADE 仅摘除死表 FK）。
--   public.core_subscriptions（out-of-scope 保留）对 public.core_billing_plans 仍持 FK，
--   故 billing_plans 用 CASCADE 仅摘除死表上的 FK 约束（不级联任何活表）。
-- 幂等：全部 IF EXISTS。
-- 2026-10-15 空库重建链修复：原顺序 subscriptions 先于 invoices，
--   空库上 rebuild_orphan_tables（20261007000006）重建了完整 FK 链，DROP subscriptions 被
--   billing_invoices 的 FK 依赖阻断（cannot drop ... other objects depend on it）→ 调整为先删 invoices。

DROP TABLE IF EXISTS "iam"."core_billing_invoices";
DROP TABLE IF EXISTS "mes"."core_billing_invoices";
DROP TABLE IF EXISTS "public"."core_billing_invoices";

DROP TABLE IF EXISTS "iam"."core_subscriptions";
DROP TABLE IF EXISTS "mes"."core_subscriptions";

DROP TABLE IF EXISTS "iam"."core_billing_plans" CASCADE;
DROP TABLE IF EXISTS "mes"."core_billing_plans" CASCADE;
DROP TABLE IF EXISTS "public"."core_billing_plans" CASCADE;

DROP TABLE IF EXISTS "public"."core_finance_voucher_entries";
DROP TABLE IF EXISTS "public"."core_finance_voucher_templates";
