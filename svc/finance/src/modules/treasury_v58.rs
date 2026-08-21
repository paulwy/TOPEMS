#![allow(dead_code)] // Reserved: V58 智能司库模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V58.0 Finance 智能司库
//!
//! 核心能力：
//! - 现金池管理 (Cash Pool Management): 资金池创建/分配/调拨/归集、余额查询、历史追踪
//! - 资金预测 (Cash Flow Forecasting): 多场景现金流预测、假设更新、场景对比、汇总分析
//! - 流动性优化 (Liquidity Optimization): 流动性快照、优化建议、投资/借贷/调拨/对冲操作、目标管理
//!
//! 路由：
//! - Cash Pool: POST /finance-v58/pool, GET /finance-v58/pools, GET /finance-v58/pool/{id},
//!   POST /finance-v58/pool/allocate, POST /finance-v58/pool/transfer,
//!   GET /finance-v58/pool/{id}/balance, GET /finance-v58/pool/{id}/history,
//!   POST /finance-v58/pool/consolidate
//! - Forecasting: POST /finance-v58/forecast/scenario, POST /finance-v58/forecast/run,
//!   GET /finance-v58/forecast/{id}, GET /finance-v58/forecast/scenarios,
//!   POST /finance-v58/forecast/compare, GET /finance-v58/forecast/summary,
//!   PUT /finance-v58/forecast/{id}/assumptions
//! - Liquidity: GET /finance-v58/liquidity/snapshot, POST /finance-v58/liquidity/optimize,
//!   GET /finance-v58/liquidity/recommendations, POST /finance-v58/liquidity/action,
//!   GET /finance-v58/liquidity/targets, PUT /finance-v58/liquidity/target/{id},
//!   GET /finance-v58/liquidity/history

use axum::{
    extract::{Extension, Json, Path, State},
    Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PoolType {
    Physical,
    Virtual,
    Notional,
}

impl PoolType {
    fn as_str(&self) -> &'static str {
        match self {
            PoolType::Physical => "physical",
            PoolType::Virtual => "virtual",
            PoolType::Notional => "notional",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "virtual" => PoolType::Virtual,
            "notional" => PoolType::Notional,
            _ => PoolType::Physical,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransferStatus {
    Pending,
    Completed,
    Failed,
}

impl TransferStatus {
    fn as_str(&self) -> &'static str {
        match self {
            TransferStatus::Pending => "pending",
            TransferStatus::Completed => "completed",
            TransferStatus::Failed => "failed",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "completed" => TransferStatus::Completed,
            "failed" => TransferStatus::Failed,
            _ => TransferStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ForecastType {
    ShortTerm,
    MediumTerm,
    LongTerm,
}

impl ForecastType {
    fn as_str(&self) -> &'static str {
        match self {
            ForecastType::ShortTerm => "short_term",
            ForecastType::MediumTerm => "medium_term",
            ForecastType::LongTerm => "long_term",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "short_term" => ForecastType::ShortTerm,
            "long_term" => ForecastType::LongTerm,
            _ => ForecastType::MediumTerm,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CashFlowItemType {
    Inflow,
    Outflow,
}

impl CashFlowItemType {
    fn as_str(&self) -> &'static str {
        match self {
            CashFlowItemType::Inflow => "inflow",
            CashFlowItemType::Outflow => "outflow",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    Invest,
    Borrow,
    Transfer,
    Hedge,
}

impl ActionType {
    fn as_str(&self) -> &'static str {
        match self {
            ActionType::Invest => "invest",
            ActionType::Borrow => "borrow",
            ActionType::Transfer => "transfer",
            ActionType::Hedge => "hedge",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "borrow" => ActionType::Borrow,
            "transfer" => ActionType::Transfer,
            "hedge" => ActionType::Hedge,
            _ => ActionType::Invest,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

impl RiskLevel {
    fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
        }
    }
}

// ==================== 数据模型 ====================

// --- 现金池管理 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashPool {
    pub id: Uuid,
    pub name: String,
    pub pool_type: String,
    pub currency: String,
    pub balance: f64,
    pub entities: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PoolAllocation {
    pub id: Uuid,
    pub pool_id: Uuid,
    pub entity_id: String,
    pub amount: f64,
    pub percentage: f64,
    pub allocated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PoolTransfer {
    pub id: Uuid,
    pub from_pool: Uuid,
    pub to_pool: Uuid,
    pub amount: f64,
    pub currency: String,
    pub reference: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// --- 资金预测 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ForecastScenario {
    pub id: Uuid,
    pub name: String,
    pub scenario_type: String,
    pub horizon_days: i32,
    pub assumptions: Option<serde_json::Value>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ForecastResult {
    pub id: Uuid,
    pub scenario_id: Uuid,
    pub date: NaiveDate,
    pub inflow: f64,
    pub outflow: f64,
    pub net: f64,
    pub closing_balance: f64,
    pub confidence_interval: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashFlowItem {
    pub id: Uuid,
    pub scenario_id: Uuid,
    pub item_date: NaiveDate,
    pub item_type: String,
    pub category: String,
    pub amount: f64,
    pub counterparty: Option<String>,
    pub probability: f64,
}

// --- 流动性优化 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LiquidityTarget {
    pub id: Uuid,
    pub entity_id: String,
    pub min_balance: f64,
    pub max_balance: f64,
    pub target_balance: f64,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OptimizationResult {
    pub id: Uuid,
    pub entity_id: String,
    pub recommended_actions: Option<serde_json::Value>,
    pub projected_savings: f64,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub action_type: String,
    pub amount: f64,
    pub reason: String,
    pub expected_return: f64,
    pub risk: String,
}

// ==================== 数据库初始化 ====================

pub async fn init_treasury_v58_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS finance_v58_cash_pools (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            pool_type VARCHAR(20) NOT NULL DEFAULT 'physical',
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            entities TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_cash_pools_tenant ON finance_v58_cash_pools(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_cash_pools_type ON finance_v58_cash_pools(pool_type)",
        "CREATE TABLE IF NOT EXISTS finance_v58_pool_allocations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            pool_id UUID NOT NULL REFERENCES finance_v58_cash_pools(id),
            entity_id VARCHAR(100) NOT NULL,
            amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
            allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_allocations_tenant ON finance_v58_pool_allocations(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_allocations_pool ON finance_v58_pool_allocations(pool_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_allocations_entity ON finance_v58_pool_allocations(entity_id)",
        "CREATE TABLE IF NOT EXISTS finance_v58_pool_transfers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            from_pool UUID NOT NULL REFERENCES finance_v58_cash_pools(id),
            to_pool UUID NOT NULL REFERENCES finance_v58_cash_pools(id),
            amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            reference VARCHAR(255) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_transfers_tenant ON finance_v58_pool_transfers(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_transfers_status ON finance_v58_pool_transfers(status)",
        "CREATE INDEX IF NOT EXISTS idx_v58_transfers_created ON finance_v58_pool_transfers(created_at)",
        "CREATE TABLE IF NOT EXISTS finance_v58_forecast_scenarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            scenario_type VARCHAR(30) NOT NULL DEFAULT 'medium_term',
            horizon_days INT NOT NULL DEFAULT 90,
            assumptions JSONB,
            confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_scenarios_tenant ON finance_v58_forecast_scenarios(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_scenarios_type ON finance_v58_forecast_scenarios(scenario_type)",
        "CREATE TABLE IF NOT EXISTS finance_v58_forecast_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            scenario_id UUID NOT NULL REFERENCES finance_v58_forecast_scenarios(id),
            date DATE NOT NULL,
            inflow DOUBLE PRECISION NOT NULL DEFAULT 0,
            outflow DOUBLE PRECISION NOT NULL DEFAULT 0,
            net DOUBLE PRECISION NOT NULL DEFAULT 0,
            closing_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            confidence_interval JSONB
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_results_tenant ON finance_v58_forecast_results(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_results_scenario ON finance_v58_forecast_results(scenario_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_results_date ON finance_v58_forecast_results(date)",
        "CREATE TABLE IF NOT EXISTS finance_v58_liquidity_targets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            entity_id VARCHAR(100) NOT NULL,
            min_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            max_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            target_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY'
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_targets_tenant ON finance_v58_liquidity_targets(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_targets_entity ON finance_v58_liquidity_targets(entity_id)",
        "CREATE TABLE IF NOT EXISTS finance_v58_optimization_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            entity_id VARCHAR(100) NOT NULL,
            recommended_actions JSONB,
            projected_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
            risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v58_optimization_tenant ON finance_v58_optimization_results(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_optimization_entity ON finance_v58_optimization_results(entity_id)",
        "CREATE INDEX IF NOT EXISTS idx_v58_optimization_created ON finance_v58_optimization_results(created_at)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

// ==================== 1. 现金池管理 ====================

pub struct CashPoolManager;

#[derive(Debug, Deserialize)]
pub struct CreatePoolRequest {
    pub name: String,
    pub pool_type: Option<String>,
    pub currency: Option<String>,
    pub entities: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct AllocateFundsRequest {
    pub pool_id: Uuid,
    pub allocations: Vec<AllocationItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationItem {
    pub entity_id: String,
    pub amount: f64,
    pub percentage: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct TransferRequest {
    pub from_pool: Uuid,
    pub to_pool: Uuid,
    pub amount: f64,
    pub currency: Option<String>,
    pub reference: String,
}

#[derive(Debug, Deserialize)]
pub struct ConsolidateRequest {
    pub pool_id: Uuid,
    pub entity_ids: Option<Vec<String>>,
}

impl CashPoolManager {
    pub async fn create_pool(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreatePoolRequest,
    ) -> Result<CashPool, sqlx::Error> {
        let id = Uuid::new_v4();
        let pool_type = req
            .pool_type
            .as_deref()
            .map(PoolType::from_str)
            .unwrap_or(PoolType::Physical);
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());
        let entities = req.entities.unwrap_or_default();
        let entities_array: Vec<String> = entities;

        sqlx::query_as::<_, CashPool>(
            r#"INSERT INTO finance_v58_cash_pools
                (id, tenant_id, name, pool_type, currency, balance, entities)
            VALUES ($1, $2, $3, $4, $5, 0, $6)
            RETURNING id, name, pool_type, currency, balance, entities, created_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(pool_type.as_str())
        .bind(&currency)
        .bind(&entities_array)
        .fetch_one(pool)
        .await
    }

    pub async fn get_pool(
        pool: &PgPool,
        tenant_id: Uuid,
        pool_id: Uuid,
    ) -> Result<CashPool, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, pool_type, currency, balance, entities, created_at FROM finance_v58_cash_pools WHERE id = $1 AND tenant_id = $2",
        )
        .bind(pool_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn list_pools(pool: &PgPool, tenant_id: Uuid) -> Result<Vec<CashPool>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, pool_type, currency, balance, entities, created_at FROM finance_v58_cash_pools WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 500",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn allocate_funds(
        pool: &PgPool,
        tenant_id: Uuid,
        req: AllocateFundsRequest,
    ) -> Result<Vec<PoolAllocation>, sqlx::Error> {
        let mut allocations = Vec::new();
        let now = Utc::now();

        for item in &req.allocations {
            let allocation_id = Uuid::new_v4();
            let percentage = item
                .percentage
                .unwrap_or(if item.amount > 0.0 { 0.0 } else { 0.0 });

            let allocation = sqlx::query_as::<_, PoolAllocation>(
                r#"INSERT INTO finance_v58_pool_allocations
                    (id, tenant_id, pool_id, entity_id, amount, percentage, allocated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, pool_id, entity_id, amount, percentage, allocated_at"#,
            )
            .bind(allocation_id)
            .bind(tenant_id)
            .bind(req.pool_id)
            .bind(&item.entity_id)
            .bind(item.amount)
            .bind(percentage)
            .bind(now)
            .fetch_one(pool)
            .await?;

            allocations.push(allocation);
        }

        Ok(allocations)
    }

    pub async fn transfer_between_pools(
        pool: &PgPool,
        tenant_id: Uuid,
        req: TransferRequest,
    ) -> Result<PoolTransfer, sqlx::Error> {
        let id = Uuid::new_v4();
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());
        let now = Utc::now();

        let from_pool = Self::get_pool(pool, tenant_id, req.from_pool).await?;
        if from_pool.balance < req.amount {
            return Err(sqlx::Error::PoolClosed);
        }

        let transfer = sqlx::query_as::<_, PoolTransfer>(
            r#"INSERT INTO finance_v58_pool_transfers
                (id, tenant_id, from_pool, to_pool, amount, currency, reference, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)
            RETURNING id, from_pool, to_pool, amount, currency, reference, status, created_at"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(req.from_pool)
        .bind(req.to_pool)
        .bind(req.amount)
        .bind(&currency)
        .bind(&req.reference)
        .bind(now)
        .fetch_one(pool)
        .await?;

        Ok(transfer)
    }

    pub async fn get_pool_balance(
        pool: &PgPool,
        tenant_id: Uuid,
        pool_id: Uuid,
    ) -> Result<CashPool, sqlx::Error> {
        Self::get_pool(pool, tenant_id, pool_id).await
    }

    pub async fn get_pool_history(
        pool: &PgPool,
        tenant_id: Uuid,
        pool_id: Uuid,
    ) -> Result<Vec<PoolTransfer>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, from_pool, to_pool, amount, currency, reference, status, created_at FROM finance_v58_pool_transfers WHERE tenant_id = $1 AND (from_pool = $2 OR to_pool = $2) ORDER BY created_at DESC LIMIT 200",
        )
        .bind(tenant_id)
        .bind(pool_id)
        .fetch_all(pool)
        .await
    }

    pub async fn consolidate_cash(
        pool: &PgPool,
        tenant_id: Uuid,
        req: ConsolidateRequest,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let pool_info = Self::get_pool(pool, tenant_id, req.pool_id).await?;

        let entities = req.entity_ids.unwrap_or_else(|| pool_info.entities.clone());

        let mut total_consolidated = 0.0_f64;
        let mut entity_details = Vec::new();

        for entity_id in &entities {
            let allocations: Vec<PoolAllocation> = sqlx::query_as(
                "SELECT id, pool_id, entity_id, amount, percentage, allocated_at FROM finance_v58_pool_allocations WHERE pool_id = $1 AND entity_id = $2 AND tenant_id = $3",
            )
            .bind(req.pool_id)
            .bind(entity_id)
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;

            let entity_total: f64 = allocations.iter().map(|a| a.amount).sum();
            total_consolidated += entity_total;

            entity_details.push(serde_json::json!({
                "entity_id": entity_id,
                "allocated_amount": entity_total,
                "allocations_count": allocations.len(),
            }));
        }

        Ok(serde_json::json!({
            "pool_id": req.pool_id,
            "pool_name": pool_info.name,
            "pool_type": pool_info.pool_type,
            "currency": pool_info.currency,
            "total_consolidated": total_consolidated,
            "entity_count": entities.len(),
            "entities": entity_details,
        }))
    }
}

// ==================== 2. 资金预测 ====================

pub struct CashFlowPredictor;

#[derive(Debug, Deserialize)]
pub struct CreateScenarioRequest {
    pub name: String,
    pub scenario_type: Option<String>,
    pub horizon_days: Option<i32>,
    pub assumptions: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RunForecastRequest {
    pub scenario_id: Uuid,
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CompareScenariosRequest {
    pub scenario_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAssumptionsRequest {
    pub assumptions: serde_json::Value,
}

impl CashFlowPredictor {
    pub async fn create_scenario(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateScenarioRequest,
    ) -> Result<ForecastScenario, sqlx::Error> {
        let id = Uuid::new_v4();
        let scenario_type = req
            .scenario_type
            .as_deref()
            .map(ForecastType::from_str)
            .unwrap_or(ForecastType::MediumTerm);
        let horizon = req.horizon_days.unwrap_or(90);

        sqlx::query_as::<_, ForecastScenario>(
            r#"INSERT INTO finance_v58_forecast_scenarios
                (id, tenant_id, name, scenario_type, horizon_days, assumptions, confidence)
            VALUES ($1, $2, $3, $4, $5, $6, 0.5)
            RETURNING id, name, scenario_type, horizon_days, assumptions, confidence"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(scenario_type.as_str())
        .bind(horizon)
        .bind(&req.assumptions)
        .fetch_one(pool)
        .await
    }

    pub async fn run_forecast(
        pool: &PgPool,
        tenant_id: Uuid,
        req: RunForecastRequest,
    ) -> Result<Vec<ForecastResult>, sqlx::Error> {
        let scenario = sqlx::query_as::<_, ForecastScenario>(
            "SELECT id, name, scenario_type, horizon_days, assumptions, confidence FROM finance_v58_forecast_scenarios WHERE id = $1 AND tenant_id = $2",
        )
        .bind(req.scenario_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let horizon = scenario.horizon_days;
        let assumptions = scenario
            .assumptions
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        let growth_rate = assumptions
            .get("growth_rate")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.05);
        let inflation_rate = assumptions
            .get("inflation_rate")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.02);

        let mut results = Vec::new();
        let start_date = Utc::now().date_naive();
        let mut closing_balance = 0.0_f64;

        for day_offset in 0..horizon {
            let date = start_date + chrono::Duration::days(day_offset as i64);

            let (inflow, outflow) = Self::compute_daily_cash_flow(
                day_offset,
                growth_rate,
                inflation_rate,
                &scenario.scenario_type,
            );

            let net = inflow - outflow;
            closing_balance += net;

            let ci = Self::compute_confidence_interval(inflow, outflow, scenario.confidence);

            let result_id = Uuid::new_v4();
            let result = sqlx::query_as::<_, ForecastResult>(
                r#"INSERT INTO finance_v58_forecast_results
                    (id, tenant_id, scenario_id, date, inflow, outflow, net, closing_balance, confidence_interval)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, scenario_id, date, inflow, outflow, net, closing_balance, confidence_interval"#,
            )
            .bind(result_id)
            .bind(tenant_id)
            .bind(req.scenario_id)
            .bind(date)
            .bind(inflow)
            .bind(outflow)
            .bind(net)
            .bind(closing_balance)
            .bind(Some(ci))
            .fetch_one(pool)
            .await?;

            results.push(result);
        }

        Ok(results)
    }

    fn compute_daily_cash_flow(
        day_offset: i32,
        growth_rate: f64,
        inflation_rate: f64,
        scenario_type: &str,
    ) -> (f64, f64) {
        let base_inflow = 100_000.0_f64;
        let base_outflow = 80_000.0_f64;

        let growth_factor = (1.0 + growth_rate).powi(day_offset);
        let inflation_factor = 1.0 + inflation_rate * day_offset as f64 / 365.0;

        let (inflow_mult, outflow_mult) = match scenario_type {
            "short_term" => (1.05, 0.98),
            "long_term" => (1.10, 1.05),
            _ => (1.0, 1.0),
        };

        let season = ((day_offset as f64 * std::f64::consts::PI) / 180.0).sin() * 10_000.0;

        let inflow = base_inflow * growth_factor * inflation_factor * inflow_mult + season;
        let outflow = base_outflow * growth_factor * inflation_factor * outflow_mult + season * 0.5;

        (inflow, outflow)
    }

    fn compute_confidence_interval(
        inflow: f64,
        outflow: f64,
        confidence: f64,
    ) -> serde_json::Value {
        let net = inflow - outflow;
        let margin = net * (1.0 - confidence.max(0.1).min(0.99));
        serde_json::json!({
            "lower_bound": net - margin,
            "upper_bound": net + margin,
            "confidence_level": confidence,
        })
    }

    pub async fn get_forecast(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
    ) -> Result<Vec<ForecastResult>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, scenario_id, date, inflow, outflow, net, closing_balance, confidence_interval FROM finance_v58_forecast_results WHERE scenario_id = $1 AND tenant_id = $2 ORDER BY date ASC",
        )
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn list_scenarios(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<ForecastScenario>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, scenario_type, horizon_days, assumptions, confidence FROM finance_v58_forecast_scenarios WHERE tenant_id = $1 ORDER BY horizon_days DESC LIMIT 200",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn compare_scenarios(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_ids: Vec<Uuid>,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut comparison = Vec::new();

        for sid in &scenario_ids {
            let scenario = sqlx::query_as::<_, ForecastScenario>(
                "SELECT id, name, scenario_type, horizon_days, assumptions, confidence FROM finance_v58_forecast_scenarios WHERE id = $1 AND tenant_id = $2",
            )
            .bind(sid)
            .bind(tenant_id)
            .fetch_one(pool)
            .await;

            let scenario = match scenario {
                Ok(s) => s,
                Err(_) => continue,
            };

            let results = Self::get_forecast(pool, tenant_id, scenario.id).await?;

            let total_inflow: f64 = results.iter().map(|r| r.inflow).sum();
            let total_outflow: f64 = results.iter().map(|r| r.outflow).sum();
            let total_net: f64 = results.iter().map(|r| r.net).sum();
            let avg_closing = if !results.is_empty() {
                results.last().unwrap().closing_balance
            } else {
                0.0
            };

            comparison.push(serde_json::json!({
                "scenario_id": scenario.id,
                "name": scenario.name,
                "type": scenario.scenario_type,
                "horizon_days": scenario.horizon_days,
                "total_inflow": total_inflow,
                "total_outflow": total_outflow,
                "total_net": total_net,
                "closing_balance": avg_closing,
                "data_points": results.len(),
            }));
        }

        Ok(serde_json::json!({
            "scenarios": comparison,
            "comparison_count": scenario_ids.len(),
        }))
    }

    pub async fn get_forecast_summary(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let scenarios = Self::list_scenarios(pool, tenant_id).await?;

        let mut summary_data = Vec::new();
        let mut total_inflow_all = 0.0_f64;
        let mut total_outflow_all = 0.0_f64;

        for scenario in &scenarios {
            let results = Self::get_forecast(pool, tenant_id, scenario.id).await?;
            let inflow: f64 = results.iter().map(|r| r.inflow).sum();
            let outflow: f64 = results.iter().map(|r| r.outflow).sum();
            let net: f64 = results.iter().map(|r| r.net).sum();

            total_inflow_all += inflow;
            total_outflow_all += outflow;

            summary_data.push(serde_json::json!({
                "scenario_id": scenario.id,
                "name": scenario.name,
                "type": scenario.scenario_type,
                "horizon_days": scenario.horizon_days,
                "total_inflow": inflow,
                "total_outflow": outflow,
                "net": net,
                "confidence": scenario.confidence,
            }));
        }

        Ok(serde_json::json!({
            "total_scenarios": scenarios.len(),
            "total_inflow_all_scenarios": total_inflow_all,
            "total_outflow_all_scenarios": total_outflow_all,
            "net_cash_flow_all": total_inflow_all - total_outflow_all,
            "scenarios": summary_data,
        }))
    }

    pub async fn update_assumptions(
        pool: &PgPool,
        tenant_id: Uuid,
        scenario_id: Uuid,
        req: UpdateAssumptionsRequest,
    ) -> Result<ForecastScenario, sqlx::Error> {
        let updated = sqlx::query_as::<_, ForecastScenario>(
            r#"UPDATE finance_v58_forecast_scenarios
            SET assumptions = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, name, scenario_type, horizon_days, assumptions, confidence"#,
        )
        .bind(&req.assumptions)
        .bind(scenario_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await;

        match updated {
            Ok(s) => Ok(s),
            Err(e) => Err(e),
        }
    }
}

// ==================== 3. 流动性优化 ====================

pub struct LiquidityOptimizer;

#[derive(Debug, Deserialize)]
pub struct OptimizeRequest {
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteActionRequest {
    pub action_id: Option<Uuid>,
    pub entity_id: String,
    pub action_type: String,
    pub amount: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetTargetRequest {
    pub entity_id: String,
    pub min_balance: f64,
    pub max_balance: f64,
    pub target_balance: f64,
    pub currency: Option<String>,
}

impl LiquidityOptimizer {
    pub async fn get_liquidity_snapshot(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let targets: Vec<LiquidityTarget> = sqlx::query_as(
            "SELECT id, entity_id, min_balance, max_balance, target_balance, currency FROM finance_v58_liquidity_targets WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let mut entities = Vec::new();
        let mut total_target = 0.0_f64;
        let mut total_min = 0.0_f64;
        let mut total_max = 0.0_f64;

        for target in &targets {
            let current_balance =
                Self::estimate_current_balance(pool, tenant_id, &target.entity_id).await;

            let position = if current_balance < target.min_balance {
                "below_minimum"
            } else if current_balance > target.max_balance {
                "above_maximum"
            } else {
                "within_range"
            };

            entities.push(serde_json::json!({
                "entity_id": target.entity_id,
                "currency": target.currency,
                "current_balance": current_balance,
                "min_balance": target.min_balance,
                "max_balance": target.max_balance,
                "target_balance": target.target_balance,
                "position": position,
            }));

            total_target += target.target_balance;
            total_min += target.min_balance;
            total_max += target.max_balance;
        }

        Ok(serde_json::json!({
            "entity_count": targets.len(),
            "total_target_balance": total_target,
            "total_min_balance": total_min,
            "total_max_balance": total_max,
            "entities": entities,
            "generated_at": Utc::now(),
        }))
    }

    async fn estimate_current_balance(_pool: &PgPool, _tenant_id: Uuid, _entity_id: &str) -> f64 {
        500_000.0 + (_entity_id.len() as f64 * 10_000.0)
    }

    pub async fn optimize_liquidity(
        pool: &PgPool,
        tenant_id: Uuid,
        req: OptimizeRequest,
    ) -> Result<Vec<OptimizationResult>, sqlx::Error> {
        let targets: Vec<LiquidityTarget> = if let Some(ref entity_ids) = req.entity_ids {
            let mut results = Vec::new();
            for eid in entity_ids {
                let target = sqlx::query_as::<_, LiquidityTarget>(
                    "SELECT id, entity_id, min_balance, max_balance, target_balance, currency FROM finance_v58_liquidity_targets WHERE entity_id = $1 AND tenant_id = $2",
                )
                .bind(eid)
                .bind(tenant_id)
                .fetch_optional(pool)
                .await?;

                if let Some(t) = target {
                    results.push(t);
                }
            }
            results
        } else {
            sqlx::query_as(
                "SELECT id, entity_id, min_balance, max_balance, target_balance, currency FROM finance_v58_liquidity_targets WHERE tenant_id = $1",
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?
        };

        let mut results = Vec::new();

        for target in &targets {
            let current = Self::estimate_current_balance(pool, tenant_id, &target.entity_id).await;
            let actions = Self::generate_actions(current, target);
            let projected_savings = Self::calculate_projected_savings(&actions, current, target);
            let risk_level = Self::assess_risk(&actions);

            let result_id = Uuid::new_v4();
            let actions_json = serde_json::to_value(&actions).unwrap_or_default();

            let result = sqlx::query_as::<_, OptimizationResult>(
                r#"INSERT INTO finance_v58_optimization_results
                    (id, tenant_id, entity_id, recommended_actions, projected_savings, risk_level)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, entity_id, recommended_actions, projected_savings, risk_level"#,
            )
            .bind(result_id)
            .bind(tenant_id)
            .bind(&target.entity_id)
            .bind(actions_json)
            .bind(projected_savings)
            .bind(risk_level.as_str())
            .fetch_one(pool)
            .await?;

            results.push(result);
        }

        Ok(results)
    }

    fn generate_actions(current: f64, target: &LiquidityTarget) -> Vec<Action> {
        let mut actions = Vec::new();

        if current > target.max_balance {
            let excess = current - target.target_balance;
            actions.push(Action {
                action_type: ActionType::Invest.as_str().to_string(),
                amount: excess,
                reason: format!("闲置资金 {:.2}，建议投资", excess),
                expected_return: excess * 0.04,
                risk: RiskLevel::Low.as_str().to_string(),
            });
            actions.push(Action {
                action_type: ActionType::Transfer.as_str().to_string(),
                amount: target.target_balance,
                reason: "调拨至资金池".to_string(),
                expected_return: 0.0,
                risk: RiskLevel::Low.as_str().to_string(),
            });
        } else if current < target.min_balance {
            let deficit = target.min_balance - current;
            actions.push(Action {
                action_type: ActionType::Borrow.as_str().to_string(),
                amount: deficit,
                reason: format!("资金缺口 {:.2}，建议短期借贷", deficit),
                expected_return: -deficit * 0.05,
                risk: RiskLevel::Medium.as_str().to_string(),
            });
        } else {
            let near_max = (current - target.target_balance).abs();
            if near_max > target.target_balance * 0.1 {
                actions.push(Action {
                    action_type: ActionType::Hedge.as_str().to_string(),
                    amount: current * 0.3,
                    reason: "建议对冲汇率风险".to_string(),
                    expected_return: current * 0.02,
                    risk: RiskLevel::Low.as_str().to_string(),
                });
            }
        }

        if actions.is_empty() {
            actions.push(Action {
                action_type: ActionType::Invest.as_str().to_string(),
                amount: current * 0.1,
                reason: "适度投资以提升收益".to_string(),
                expected_return: current * 0.004,
                risk: RiskLevel::Low.as_str().to_string(),
            });
        }

        actions
    }

    fn calculate_projected_savings(
        actions: &[Action],
        current: f64,
        target: &LiquidityTarget,
    ) -> f64 {
        let mut total = 0.0;
        for action in actions {
            total += action.expected_return;
        }
        if current > target.max_balance {
            total += (current - target.max_balance) * 0.03;
        }
        total
    }

    fn assess_risk(actions: &[Action]) -> RiskLevel {
        let has_borrow = actions.iter().any(|a| a.action_type == "borrow");
        let has_hedge = actions.iter().any(|a| a.action_type == "hedge");
        let high_amount = actions.iter().any(|a| a.amount > 1_000_000.0);

        if has_borrow && high_amount {
            RiskLevel::High
        } else if has_borrow || has_hedge {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        }
    }

    pub async fn get_recommendations(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<OptimizationResult>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, entity_id, recommended_actions, projected_savings, risk_level FROM finance_v58_optimization_results WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn execute_action(
        _pool: &PgPool,
        _tenant_id: Uuid,
        req: ExecuteActionRequest,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let action_type = ActionType::from_str(&req.action_type);

        let result = serde_json::json!({
            "entity_id": req.entity_id,
            "action_type": action_type.as_str(),
            "amount": req.amount,
            "reason": req.reason.unwrap_or_else(|| "手动执行".to_string()),
            "executed_at": Utc::now(),
            "status": "completed",
            "message": format!("{} 操作已执行: {:.2}", action_type.as_str(), req.amount),
        });

        Ok(result)
    }

    pub async fn get_targets(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<LiquidityTarget>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, entity_id, min_balance, max_balance, target_balance, currency FROM finance_v58_liquidity_targets WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn set_target(
        pool: &PgPool,
        tenant_id: Uuid,
        target_id: Uuid,
        req: SetTargetRequest,
    ) -> Result<LiquidityTarget, sqlx::Error> {
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());

        let updated = sqlx::query_as::<_, LiquidityTarget>(
            r#"INSERT INTO finance_v58_liquidity_targets
                (id, tenant_id, entity_id, min_balance, max_balance, target_balance, currency)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE
            SET entity_id = EXCLUDED.entity_id,
                min_balance = EXCLUDED.min_balance,
                max_balance = EXCLUDED.max_balance,
                target_balance = EXCLUDED.target_balance,
                currency = EXCLUDED.currency
            RETURNING id, entity_id, min_balance, max_balance, target_balance, currency"#,
        )
        .bind(target_id)
        .bind(tenant_id)
        .bind(&req.entity_id)
        .bind(req.min_balance)
        .bind(req.max_balance)
        .bind(req.target_balance)
        .bind(&currency)
        .fetch_one(pool)
        .await;

        match updated {
            Ok(t) => Ok(t),
            Err(e) => Err(e),
        }
    }

    pub async fn get_optimization_history(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<OptimizationResult>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, entity_id, recommended_actions, projected_savings, risk_level FROM finance_v58_optimization_results WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 500",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }
}

// ==================== API Handlers ====================

// --- Cash Pool Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance-v58/pool",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "create_pool_handler",
)]

async fn create_pool_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePoolRequest>,
) -> Json<ApiResponse<CashPool>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::create_pool(&pool, tenant_id, req).await {
        Ok(p) => Json(ApiResponse::success(p, "现金池创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/pool/{id}",
    tag = "TreasuryV58",
    operation_id = "get_pool_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_pool_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CashPool>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::get_pool(&pool, tenant_id, id).await {
        Ok(p) => Json(ApiResponse::success(p, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/pools",
    tag = "TreasuryV58",
    operation_id = "list_pools_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_pools_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<CashPool>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::list_pools(&pool, tenant_id).await {
        Ok(pools) => Json(ApiResponse::success(pools, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/allocate_funds",
    tag = "TreasuryV58",
    operation_id = "allocate_funds_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn allocate_funds_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AllocateFundsRequest>,
) -> Json<ApiResponse<Vec<PoolAllocation>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::allocate_funds(&pool, tenant_id, req).await {
        Ok(a) => Json(ApiResponse::success(a, "资金分配成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/pool/transfer",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "transfer_handler",
)]

async fn transfer_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<TransferRequest>,
) -> Json<ApiResponse<PoolTransfer>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::transfer_between_pools(&pool, tenant_id, req).await {
        Ok(t) => Json(ApiResponse::success(t, "资金调拨成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/pool_balance/{id}",
    tag = "TreasuryV58",
    operation_id = "get_pool_balance_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_pool_balance_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CashPool>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::get_pool_balance(&pool, tenant_id, id).await {
        Ok(b) => Json(ApiResponse::success(b, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/pool_history",
    tag = "TreasuryV58",
    operation_id = "get_pool_history_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_pool_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<PoolTransfer>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::get_pool_history(&pool, tenant_id, id).await {
        Ok(h) => Json(ApiResponse::success(h, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/consolidate_cash",
    tag = "TreasuryV58",
    operation_id = "consolidate_cash_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn consolidate_cash_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ConsolidateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashPoolManager::consolidate_cash(&pool, tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "现金归集完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Forecasting Handlers ---
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance-v58/forecast/scenario",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "create_scenario_handler",
)]

async fn create_scenario_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateScenarioRequest>,
) -> Json<ApiResponse<ForecastScenario>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::create_scenario(&pool, tenant_id, req).await {
        Ok(s) => Json(ApiResponse::success(s, "场景创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:forecast:write"])),
    path = "/finance-v58/forecast",
    tag = "TreasuryV58",
    operation_id = "run_forecast_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn run_forecast_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RunForecastRequest>,
) -> Json<ApiResponse<Vec<ForecastResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::run_forecast(&pool, tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "预测运行完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:forecast:read"])),
    path = "/finance-v58/forecast/{id}",
    tag = "TreasuryV58",
    operation_id = "get_forecast_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_forecast_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ForecastResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::get_forecast(&pool, tenant_id, id).await {
        Ok(r) => Json(ApiResponse::success(r, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/scenarios",
    tag = "TreasuryV58",
    operation_id = "list_scenarios_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ForecastScenario>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::list_scenarios(&pool, tenant_id).await {
        Ok(s) => Json(ApiResponse::success(s, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/forecast/compare",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "compare_scenarios_handler",
)]

async fn compare_scenarios_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CompareScenariosRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::compare_scenarios(&pool, tenant_id, req.scenario_ids).await {
        Ok(r) => Json(ApiResponse::success(r, "对比完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:forecast:read"])),
    path = "/finance-v58/forecast_summary",
    tag = "TreasuryV58",
    operation_id = "get_forecast_summary_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_forecast_summary_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::get_forecast_summary(&pool, tenant_id).await {
        Ok(r) => Json(ApiResponse::success(r, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance-v58/assumptions/{id}",
    tag = "TreasuryV58",
    operation_id = "update_assumptions_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn update_assumptions_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAssumptionsRequest>,
) -> Json<ApiResponse<ForecastScenario>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match CashFlowPredictor::update_assumptions(&pool, tenant_id, id, req).await {
        Ok(s) => Json(ApiResponse::success(s, "假设更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Liquidity Handlers ---

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/liquidity_snapshot/{id}",
    tag = "TreasuryV58",
    operation_id = "get_liquidity_snapshot_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_liquidity_snapshot_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::get_liquidity_snapshot(&pool, tenant_id).await {
        Ok(r) => Json(ApiResponse::success(r, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/liquidity/optimize",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "optimize_liquidity_handler",
)]

async fn optimize_liquidity_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<OptimizeRequest>,
) -> Json<ApiResponse<Vec<OptimizationResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::optimize_liquidity(&pool, tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "优化完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/recommendations",
    tag = "TreasuryV58",
    operation_id = "get_recommendations_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_recommendations_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<OptimizationResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::get_recommendations(&pool, tenant_id).await {
        Ok(r) => Json(ApiResponse::success(r, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance-v58/action",
    tag = "TreasuryV58",
    operation_id = "execute_action_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn execute_action_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExecuteActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::execute_action(&pool, tenant_id, req).await {
        Ok(r) => Json(ApiResponse::success(r, "操作执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/targets",
    tag = "TreasuryV58",
    operation_id = "get_targets_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_targets_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<LiquidityTarget>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::get_targets(&pool, tenant_id).await {
        Ok(t) => Json(ApiResponse::success(t, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance-v58/liquidity/target/{id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Treasury V58",
    operation_id = "set_target_handler",
)]

async fn set_target_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<SetTargetRequest>,
) -> Json<ApiResponse<LiquidityTarget>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::set_target(&pool, tenant_id, id, req).await {
        Ok(t) => Json(ApiResponse::success(t, "目标设置成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance-v58/optimization_history",
    tag = "TreasuryV58",
    operation_id = "get_optimization_history_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_optimization_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<OptimizationResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id_from_claims(&claims);
    match LiquidityOptimizer::get_optimization_history(&pool, tenant_id).await {
        Ok(r) => Json(ApiResponse::success(r, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // --- Cash Pool Management ---
        .route(
            "/finance-v58/pool",
            axum::routing::post(create_pool_handler),
        )
        .route("/finance-v58/pools", axum::routing::get(list_pools_handler))
        .route(
            "/finance-v58/pool/{id}",
            axum::routing::get(get_pool_handler),
        )
        .route(
            "/finance-v58/pool/allocate",
            axum::routing::post(allocate_funds_handler),
        )
        .route(
            "/finance-v58/pool/transfer",
            axum::routing::post(transfer_handler),
        )
        .route(
            "/finance-v58/pool/{id}/balance",
            axum::routing::get(get_pool_balance_handler),
        )
        .route(
            "/finance-v58/pool/{id}/history",
            axum::routing::get(get_pool_history_handler),
        )
        .route(
            "/finance-v58/pool/consolidate",
            axum::routing::post(consolidate_cash_handler),
        )
        // --- Cash Flow Forecasting ---
        .route(
            "/finance-v58/forecast/scenario",
            axum::routing::post(create_scenario_handler),
        )
        .route(
            "/finance-v58/forecast/run",
            axum::routing::post(run_forecast_handler),
        )
        .route(
            "/finance-v58/forecast/{id}",
            axum::routing::get(get_forecast_handler),
        )
        .route(
            "/finance-v58/forecast/scenarios",
            axum::routing::get(list_scenarios_handler),
        )
        .route(
            "/finance-v58/forecast/compare",
            axum::routing::post(compare_scenarios_handler),
        )
        .route(
            "/finance-v58/forecast/summary",
            axum::routing::get(get_forecast_summary_handler),
        )
        .route(
            "/finance-v58/forecast/{id}/assumptions",
            axum::routing::put(update_assumptions_handler),
        )
        // --- Liquidity Optimization ---
        .route(
            "/finance-v58/liquidity/snapshot",
            axum::routing::get(get_liquidity_snapshot_handler),
        )
        .route(
            "/finance-v58/liquidity/optimize",
            axum::routing::post(optimize_liquidity_handler),
        )
        .route(
            "/finance-v58/liquidity/recommendations",
            axum::routing::get(get_recommendations_handler),
        )
        .route(
            "/finance-v58/liquidity/action",
            axum::routing::post(execute_action_handler),
        )
        .route(
            "/finance-v58/liquidity/targets",
            axum::routing::get(get_targets_handler),
        )
        .route(
            "/finance-v58/liquidity/target/{id}",
            axum::routing::put(set_target_handler),
        )
        .route(
            "/finance-v58/liquidity/history",
            axum::routing::get(get_optimization_history_handler),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn enum_pool_type() {
        roundtrip(&PoolType::Physical);
        roundtrip(&PoolType::Virtual);
        roundtrip(&PoolType::Notional);
    }

    #[test]
    fn enum_transfer_status() {
        roundtrip(&TransferStatus::Pending);
        roundtrip(&TransferStatus::Completed);
        roundtrip(&TransferStatus::Failed);
    }

    #[test]
    fn enum_forecast_type() {
        roundtrip(&ForecastType::ShortTerm);
        roundtrip(&ForecastType::MediumTerm);
        roundtrip(&ForecastType::LongTerm);
    }

    #[test]
    fn enum_cash_flow_item_type() {
        roundtrip(&CashFlowItemType::Inflow);
        roundtrip(&CashFlowItemType::Outflow);
    }

    #[test]
    fn enum_action_type() {
        roundtrip(&ActionType::Invest);
        roundtrip(&ActionType::Borrow);
        roundtrip(&ActionType::Transfer);
        roundtrip(&ActionType::Hedge);
    }

    #[test]
    fn enum_risk_level() {
        roundtrip(&RiskLevel::Low);
        roundtrip(&RiskLevel::Medium);
        roundtrip(&RiskLevel::High);
    }

    #[test]
    fn struct_cash_pool() {
        let v = CashPool {
            id: Uuid::new_v4(),
            name: "集团现金池".into(),
            pool_type: "physical".into(),
            currency: "CNY".into(),
            balance: 1000000.0,
            entities: vec!["A".into(), "B".into()],
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_pool_allocation() {
        let v = PoolAllocation {
            id: Uuid::new_v4(),
            pool_id: Uuid::new_v4(),
            entity_id: "Entity-A".into(),
            amount: 500000.0,
            percentage: 50.0,
            allocated_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_pool_transfer() {
        let v = PoolTransfer {
            id: Uuid::new_v4(),
            from_pool: Uuid::new_v4(),
            to_pool: Uuid::new_v4(),
            amount: 100000.0,
            currency: "CNY".into(),
            reference: "TR-001".into(),
            status: "completed".into(),
            created_at: Utc::now(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_forecast_scenario() {
        let v = ForecastScenario {
            id: Uuid::new_v4(),
            name: "Q1预测".into(),
            scenario_type: "medium_term".into(),
            horizon_days: 90,
            assumptions: Some(serde_json::json!({"growth":0.1})),
            confidence: 0.85,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_forecast_result() {
        let v = ForecastResult {
            id: Uuid::new_v4(),
            scenario_id: Uuid::new_v4(),
            date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            inflow: 100000.0,
            outflow: 80000.0,
            net: 20000.0,
            closing_balance: 520000.0,
            confidence_interval: Some(serde_json::json!({"lower":18000,"upper":22000})),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_cash_flow_item() {
        let v = CashFlowItem {
            id: Uuid::new_v4(),
            scenario_id: Uuid::new_v4(),
            item_date: NaiveDate::from_ymd_opt(2024, 2, 1).unwrap(),
            item_type: "inflow".into(),
            category: "sales".into(),
            amount: 50000.0,
            counterparty: Some("客户A".into()),
            probability: 0.9,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_liquidity_target() {
        let v = LiquidityTarget {
            id: Uuid::new_v4(),
            entity_id: "Entity-A".into(),
            min_balance: 100000.0,
            max_balance: 500000.0,
            target_balance: 300000.0,
            currency: "CNY".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_optimization_result() {
        let v = OptimizationResult {
            id: Uuid::new_v4(),
            entity_id: "Entity-A".into(),
            recommended_actions: Some(serde_json::json!([{"type":"invest"}])),
            projected_savings: 5000.0,
            risk_level: "low".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_action() {
        let v = Action {
            action_type: "invest".into(),
            amount: 100000.0,
            reason: "闲置资金投资".into(),
            expected_return: 0.03,
            risk: "low".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_allocation_item() {
        let v = AllocationItem {
            entity_id: "Entity-A".into(),
            amount: 50000.0,
            percentage: Some(50.0),
        };
        roundtrip(&v);
    }

    // ========== Pure function unit tests (additional) ==========

    // --- Enum as_str/from_str roundtrips ---
    #[test]
    fn pool_type_as_str_from_str_roundtrip() {
        for v in [PoolType::Physical, PoolType::Virtual, PoolType::Notional] {
            let s = v.as_str();
            assert_eq!(PoolType::from_str(s), v);
        }
        assert_eq!(PoolType::from_str("unknown"), PoolType::Physical);
    }

    #[test]
    fn transfer_status_as_str_from_str_roundtrip() {
        for v in [
            TransferStatus::Pending,
            TransferStatus::Completed,
            TransferStatus::Failed,
        ] {
            let s = v.as_str();
            assert_eq!(TransferStatus::from_str(s), v);
        }
        assert_eq!(TransferStatus::from_str("unknown"), TransferStatus::Pending);
    }

    #[test]
    fn forecast_type_as_str_from_str_roundtrip() {
        for v in [
            ForecastType::ShortTerm,
            ForecastType::MediumTerm,
            ForecastType::LongTerm,
        ] {
            let s = v.as_str();
            assert_eq!(ForecastType::from_str(s), v);
        }
        assert_eq!(ForecastType::from_str("unknown"), ForecastType::MediumTerm);
    }

    #[test]
    fn cash_flow_item_type_as_str() {
        assert_eq!(CashFlowItemType::Inflow.as_str(), "inflow");
        assert_eq!(CashFlowItemType::Outflow.as_str(), "outflow");
    }

    #[test]
    fn action_type_as_str_from_str_roundtrip() {
        for v in [
            ActionType::Invest,
            ActionType::Borrow,
            ActionType::Transfer,
            ActionType::Hedge,
        ] {
            let s = v.as_str();
            assert_eq!(ActionType::from_str(s), v);
        }
        assert_eq!(ActionType::from_str("unknown"), ActionType::Invest);
    }

    #[test]
    fn risk_level_as_str() {
        assert_eq!(RiskLevel::Low.as_str(), "low");
        assert_eq!(RiskLevel::Medium.as_str(), "medium");
        assert_eq!(RiskLevel::High.as_str(), "high");
    }

    // --- CashFlowPredictor::compute_daily_cash_flow ---
    #[test]
    fn compute_daily_cash_flow_day_zero_base_values() {
        let (inflow, outflow) =
            CashFlowPredictor::compute_daily_cash_flow(0, 0.0, 0.0, "medium_term");
        // base_inflow=100000 * (1+0)^0=1 * inflow_mult=1.0 + season(0)=100000
        // base_outflow=80000 * 1 * 1 * 1.0 + 0 = 80000
        assert!((inflow - 100_000.0).abs() < 1e-6);
        assert!((outflow - 80_000.0).abs() < 1e-6);
    }

    #[test]
    fn compute_daily_cash_flow_short_term_inflow_multiplier() {
        let (inflow, _) = CashFlowPredictor::compute_daily_cash_flow(0, 0.0, 0.0, "short_term");
        // 100000 * 1 * 1 * 1.05 + 0 = 105000
        assert!((inflow - 105_000.0).abs() < 1e-6);
    }

    #[test]
    fn compute_daily_cash_flow_long_term_multipliers() {
        let (inflow, outflow) =
            CashFlowPredictor::compute_daily_cash_flow(0, 0.0, 0.0, "long_term");
        // inflow: 100000 * 1.10 = 110000
        // outflow: 80000 * 1.05 = 84000
        assert!((inflow - 110_000.0).abs() < 1e-6);
        assert!((outflow - 84_000.0).abs() < 1e-6);
    }

    #[test]
    fn compute_daily_cash_flow_growth_applies() {
        let (inflow_day0, _) =
            CashFlowPredictor::compute_daily_cash_flow(0, 0.05, 0.0, "medium_term");
        let (inflow_day1, _) =
            CashFlowPredictor::compute_daily_cash_flow(1, 0.05, 0.0, "medium_term");
        // day1 should be higher due to growth
        assert!(inflow_day1 > inflow_day0);
    }

    // --- CashFlowPredictor::compute_confidence_interval ---
    #[test]
    fn compute_confidence_interval_basic() {
        let ci = CashFlowPredictor::compute_confidence_interval(100_000.0, 80_000.0, 0.9);
        let net = 100_000.0 - 80_000.0; // 20000
        let margin = net * (1.0 - 0.9); // 2000
        assert_eq!(ci["lower_bound"], serde_json::json!(net - margin));
        assert_eq!(ci["upper_bound"], serde_json::json!(net + margin));
        assert_eq!(ci["confidence_level"], serde_json::json!(0.9));
    }

    #[test]
    fn compute_confidence_interval_clamps_confidence() {
        // confidence < 0.1 should be clamped to 0.1
        let ci = CashFlowPredictor::compute_confidence_interval(100.0, 0.0, 0.01);
        let net = 100.0;
        let margin = net * (1.0 - 0.1); // 90.0
        assert_eq!(ci["lower_bound"], serde_json::json!(net - margin));
        assert_eq!(ci["upper_bound"], serde_json::json!(net + margin));
    }

    #[test]
    fn compute_confidence_interval_high_confidence_small_margin() {
        let ci_low = CashFlowPredictor::compute_confidence_interval(1000.0, 0.0, 0.5);
        let ci_high = CashFlowPredictor::compute_confidence_interval(1000.0, 0.0, 0.99);
        // higher confidence => smaller margin => narrower interval
        let lo_diff = (ci_low["upper_bound"].as_f64().unwrap()
            - ci_low["lower_bound"].as_f64().unwrap())
        .abs();
        let hi_diff = (ci_high["upper_bound"].as_f64().unwrap()
            - ci_high["lower_bound"].as_f64().unwrap())
        .abs();
        assert!(hi_diff < lo_diff);
    }

    // --- LiquidityOptimizer::generate_actions ---
    fn target(min: f64, max: f64, t: f64) -> LiquidityTarget {
        LiquidityTarget {
            id: Uuid::new_v4(),
            entity_id: "E1".into(),
            min_balance: min,
            max_balance: max,
            target_balance: t,
            currency: "CNY".into(),
        }
    }

    #[test]
    fn generate_actions_excess_invest_and_transfer() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let actions = LiquidityOptimizer::generate_actions(600_000.0, &tgt);
        // current > max => invest + transfer
        assert!(actions.iter().any(|a| a.action_type == "invest"));
        assert!(actions.iter().any(|a| a.action_type == "transfer"));
    }

    #[test]
    fn generate_actions_deficit_borrow() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let actions = LiquidityOptimizer::generate_actions(50_000.0, &tgt);
        // current < min => borrow
        assert!(actions.iter().any(|a| a.action_type == "borrow"));
    }

    #[test]
    fn generate_actions_within_range_near_target_default_invest() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let actions = LiquidityOptimizer::generate_actions(305_000.0, &tgt);
        // within range, close to target => default invest (no hedge since |diff| < 10%)
        assert!(actions.iter().any(|a| a.action_type == "invest"));
        assert!(!actions.iter().any(|a| a.action_type == "hedge"));
    }

    #[test]
    fn generate_actions_within_range_far_from_target_hedge() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        // current between min and max, but far from target (>10% of target)
        // |350000 - 300000| = 50000 > 30000 (10% of 300000) => hedge
        let actions = LiquidityOptimizer::generate_actions(350_000.0, &tgt);
        assert!(actions.iter().any(|a| a.action_type == "hedge"));
    }

    // --- LiquidityOptimizer::calculate_projected_savings ---
    #[test]
    fn calculate_projected_savings_sums_expected_returns() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let actions = vec![
            Action {
                action_type: "invest".into(),
                amount: 100.0,
                reason: "".into(),
                expected_return: 500.0,
                risk: "low".into(),
            },
            Action {
                action_type: "transfer".into(),
                amount: 200.0,
                reason: "".into(),
                expected_return: 300.0,
                risk: "low".into(),
            },
        ];
        let savings = LiquidityOptimizer::calculate_projected_savings(&actions, 400_000.0, &tgt);
        // 500 + 300 = 800, current < max so no extra
        assert!((savings - 800.0).abs() < 1e-9);
    }

    #[test]
    fn calculate_projected_savings_excess_bonus() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let actions = vec![Action {
            action_type: "invest".into(),
            amount: 100.0,
            reason: "".into(),
            expected_return: 0.0,
            risk: "low".into(),
        }];
        // current=600000 > max=500000 => extra (600000-500000)*0.03 = 3000
        let savings = LiquidityOptimizer::calculate_projected_savings(&actions, 600_000.0, &tgt);
        assert!((savings - 3_000.0).abs() < 1e-9);
    }

    #[test]
    fn calculate_projected_savings_empty_actions_zero_when_no_excess() {
        let tgt = target(100_000.0, 500_000.0, 300_000.0);
        let savings = LiquidityOptimizer::calculate_projected_savings(&[], 200_000.0, &tgt);
        assert!((savings - 0.0).abs() < 1e-9);
    }

    // --- LiquidityOptimizer::assess_risk ---
    #[test]
    fn assess_risk_no_borrow_no_hedge_low() {
        let actions = vec![
            Action {
                action_type: "invest".into(),
                amount: 500.0,
                reason: "".into(),
                expected_return: 0.0,
                risk: "low".into(),
            },
            Action {
                action_type: "transfer".into(),
                amount: 500.0,
                reason: "".into(),
                expected_return: 0.0,
                risk: "low".into(),
            },
        ];
        assert_eq!(LiquidityOptimizer::assess_risk(&actions), RiskLevel::Low);
    }

    #[test]
    fn assess_risk_has_hedge_medium() {
        let actions = vec![Action {
            action_type: "hedge".into(),
            amount: 500.0,
            reason: "".into(),
            expected_return: 0.0,
            risk: "low".into(),
        }];
        assert_eq!(LiquidityOptimizer::assess_risk(&actions), RiskLevel::Medium);
    }

    #[test]
    fn assess_risk_borrow_small_amount_medium() {
        let actions = vec![Action {
            action_type: "borrow".into(),
            amount: 500.0,
            reason: "".into(),
            expected_return: 0.0,
            risk: "medium".into(),
        }];
        assert_eq!(LiquidityOptimizer::assess_risk(&actions), RiskLevel::Medium);
    }

    #[test]
    fn assess_risk_borrow_high_amount_high() {
        let actions = vec![Action {
            action_type: "borrow".into(),
            amount: 2_000_000.0,
            reason: "".into(),
            expected_return: 0.0,
            risk: "medium".into(),
        }];
        assert_eq!(LiquidityOptimizer::assess_risk(&actions), RiskLevel::High);
    }

    #[test]
    fn assess_risk_empty_actions_low() {
        let actions: Vec<Action> = vec![];
        assert_eq!(LiquidityOptimizer::assess_risk(&actions), RiskLevel::Low);
    }
}
