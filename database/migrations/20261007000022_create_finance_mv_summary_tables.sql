-- =============================================================================
-- 20261007000022_create_finance_mv_summary_tables.sql
-- =============================================================================
-- 修复 BE-04（审计 P1）：finance 域查询 mv_receivable_aging / mv_voucher_summary，
--   两库 pg_matviews 均无记录、亦无常量表。
-- 证据：svc/finance/src/domain/pg_materialized_views.rs
--   - SELECT  : :46/55/65/75/92/105（voucher）、:253/262/272/282/299/336（aging）
--   - INSERT  : :146-158（voucher, ON CONFLICT(id)）、:417-428（aging, ON CONFLICT(id)）
--   - UPDATE  : :175/:189（voucher）、:450/:475（aging）
--   - DELETE  : :207 / :493（rebuild()）
--   - 路由接入：svc/finance/src/modules/cqrs_routes.rs:153/169/183/242/247（活路径）
--   - projector 注册：svc/finance/src/domain/cqrs.rs:245-255
--
-- 决策：(a) 创建 —— 但建为【普通表】而非原生 PostgreSQL MATERIALIZED VIEW。
--   理由：代码对这两个关系做 INSERT ... ON CONFLICT DO UPDATE / UPDATE / DELETE
--   （handle_event 增量维护 + rebuild() 全量清空）。原生物化视图只读，拒绝全部 DML，
--   一旦建成 matview，VoucherCreated/ReceivableCreated 等事件投影即崩溃。
--   这里的 "materialized view" 是 CQRS 架构意义上的物化汇总表（应用经事件增量维护），
--   故以普通表落地，关系名保持 mv_* 不变（代码绑定的就是该名）。
--
-- 刷新/维护策略登记：
--   - 无独立定时 REFRESH：数据由 CQRS projector 在每次 FinanceDomainEvent 时增量维护
--     （handle_event：INSERT ON CONFLICT / UPDATE bucket|status），见 cqrs.rs:245-255。
--   - 全量重建走 HTTP 端点 POST /cqrs/views/rebuild（rebuild_all → 本表 rebuild()=DELETE），
--     见 cqrs_routes.rs:224-230。
--   - 本迁移创建空表（两库均无历史数据），演进库由应用事件阶段写入真实数据。
--
-- 列定义 = 全部被引用列的并集（INSERT 写列 + SELECT 取列 + row_to_* 读列）。
--   其中 period/total_debit/total_credit（voucher）与 receivable_no/invoice_no/due_date/
--   amount/received_amount/days_overdue（aging）仅出现在 SELECT 列表、从不被写入，
--   建为可空列以保证现有 SELECT 计划校验通过（空表时 list() 返回空、不触发行映射）。
-- 幂等：CREATE TABLE IF NOT EXISTS + 策略幂等。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mv_voucher_summary
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.mv_voucher_summary (
    id            TEXT PRIMARY KEY,
    voucher_no    TEXT NOT NULL,
    voucher_date  DATE NOT NULL,
    voucher_type  TEXT NOT NULL,
    status        TEXT NOT NULL,
    summary       TEXT NOT NULL DEFAULT '',
    total_amount  NUMERIC NOT NULL DEFAULT 0,
    created_by    TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL,
    posted_at     TIMESTAMPTZ,
    version       BIGINT NOT NULL DEFAULT 1,
    -- SELECT 列表引用、当前不被写入的列（保留以对齐既有查询）
    period        DATE,
    total_debit   NUMERIC,
    total_credit  NUMERIC,
    tenant_id     UUID
);

-- -----------------------------------------------------------------------------
-- mv_receivable_aging
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance.mv_receivable_aging (
    id                TEXT PRIMARY KEY,
    customer_id       TEXT NOT NULL,
    customer_name     TEXT NOT NULL DEFAULT '',
    total_amount      NUMERIC NOT NULL DEFAULT 0,
    current_amount    NUMERIC NOT NULL DEFAULT 0,
    bucket_30_amount  NUMERIC NOT NULL DEFAULT 0,
    bucket_60_amount  NUMERIC NOT NULL DEFAULT 0,
    bucket_90_amount  NUMERIC NOT NULL DEFAULT 0,
    bucket_180_amount NUMERIC NOT NULL DEFAULT 0,
    over_180_amount   NUMERIC NOT NULL DEFAULT 0,
    status            TEXT NOT NULL,
    version           BIGINT NOT NULL DEFAULT 1,
    updated_at        TIMESTAMPTZ NOT NULL,
    -- SELECT 列表引用、当前不被写入的列（保留以对齐既有查询）
    receivable_no     TEXT,
    invoice_no        TEXT,
    due_date          DATE,
    amount            NUMERIC,
    received_amount   NUMERIC,
    days_overdue      BIGINT,
    created_at        TIMESTAMPTZ,
    tenant_id         UUID
);

-- 这两张是系统经事件增量维护的汇总投影表（写入不带 tenant_id → 行 tenant_id 恒为 NULL）。
-- 启用 RLS + tenant_isolation：策略对 tenant_id IS NULL 与 nil/系统租户放行，
-- 既避免“RLS 开 + 无策略 = 全拒”（见 20261006000004 教训），又不阻断投影写入/读取。
ALTER TABLE finance.mv_voucher_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.mv_voucher_summary FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.mv_receivable_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.mv_receivable_aging FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON finance.mv_voucher_summary;
CREATE POLICY tenant_isolation ON finance.mv_voucher_summary
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

DROP POLICY IF EXISTS tenant_isolation ON finance.mv_receivable_aging;
CREATE POLICY tenant_isolation ON finance.mv_receivable_aging
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
