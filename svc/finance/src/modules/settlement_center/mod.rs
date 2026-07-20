//! Settlement Center - 统一结算对账中心模块
//!
//! 整合分散在 erp.fin_reconciliations 和 pm.settlements 的对账结算功能，
//! 提供统一的 API 入口、统一的数据视图、统一的业务流程。
//!
//! # 业务流程闭环
//! 1. 创建对账单（统一入口） → `create_reconciliation`
//! 2. 执行对账（手工/自动） → `reconcile` / `auto_reconcile`
//! 3. 发现差异时创建差异调整 → `create_difference`
//! 4. 差异审批 → `approve_difference` / `reject_difference`
//! 5. 关联结算单 → `create_link`
//! 6. 执行结算 → `approve_settlement`
//!
//! # 数据隔离
//! 所有查询带 tenant_id 过滤，跨 schema 查询时使用完整表名
//! （erp.fin_reconciliations, pm.settlements, core.reconciliation_settlement_links）。

pub mod handlers;
pub mod models;
pub mod routes;
pub mod service;

pub use routes::create_routes;

use sqlx::PgPool;

/// 初始化结算对账中心数据库表（幂等）
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 1. 对账单与结算单关联表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.reconciliation_settlement_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            reconciliation_id UUID NOT NULL,
            settlement_id UUID NOT NULL,
            link_type VARCHAR(20) NOT NULL,
            amount NUMERIC(15, 2),
            status VARCHAR(20) NOT NULL DEFAULT 'linked',
            remark TEXT,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rsl_tenant_id ON core.reconciliation_settlement_links(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rsl_reconciliation_id ON core.reconciliation_settlement_links(reconciliation_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rsl_settlement_id ON core.reconciliation_settlement_links(settlement_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rsl_status ON core.reconciliation_settlement_links(status)",
    )
    .execute(pool)
    .await?;

    // 2. 结算对账中心仪表盘配置表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.settlement_center_dashboards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            config JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_scd_tenant_id ON core.settlement_center_dashboards(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_scd_active ON core.settlement_center_dashboards(is_active)",
    )
    .execute(pool)
    .await?;

    // 3. 差异调整表
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core.difference_adjustments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            source_type VARCHAR(20) NOT NULL,
            source_id UUID NOT NULL,
            difference_type VARCHAR(20) NOT NULL,
            difference_amount NUMERIC(15, 2) NOT NULL,
            reason VARCHAR(255) NOT NULL,
            adjustment_amount NUMERIC(15, 2),
            adjustment_type VARCHAR(20),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            approved_by UUID,
            approved_at TIMESTAMPTZ,
            remark TEXT,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_da_tenant_id ON core.difference_adjustments(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_da_source ON core.difference_adjustments(source_type, source_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_da_status ON core.difference_adjustments(status)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_da_difference_type ON core.difference_adjustments(difference_type)",
    )
    .execute(pool)
    .await?;

    Ok(())
}
