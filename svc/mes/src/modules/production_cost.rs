//! 生产成本核算模块
//!
//! 核心能力：
//! - 工单成本归集：材料成本、人工成本、制造费用
//! - 成本分析报告：成本构成、趋势分析、对比分析
//! - 成本预测：基于历史数据预测未来成本

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Datelike, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use topems_shared_db::decimal::big_decimal_to_f64;

use std::collections::{BTreeMap, HashMap};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::{response::ApiResponse, TopemsError};

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/cost/work-order/{id}", get(calculate_work_order_cost))
        .route(
            "/cost/work-order/{id}/detail",
            get(get_work_order_cost_detail),
        )
        .route(
            "/cost/production-order/{id}",
            get(calculate_production_order_cost),
        )
        .route("/cost/period", get(get_period_cost_report))
        .route("/cost/trend", get(get_cost_trend))
        .route("/cost/comparison", post(get_cost_comparison))
        .route("/cost/forecast", get(get_cost_forecast))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct WorkOrderCostResult {
    pub work_order_id: Uuid,
    pub work_order_no: String,
    pub production_order_no: Option<String>,
    pub total_cost: f64,
    pub material_cost: f64,
    pub labor_cost: f64,
    pub overhead_cost: f64,
    pub unit_cost: f64,
    pub quantity: f64,
    pub currency: String,
    pub calculated_at: DateTime<Utc>,
    pub cost_breakdown: Vec<CostBreakdownItem>,
    /// 本条成本里「有量无价/有工无率」等缺口。空数组才代表料工费全部按真实口径计价。
    #[serde(default)]
    pub data_gaps: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CostBreakdownItem {
    pub category: String,
    pub sub_category: String,
    pub description: String,
    pub amount: f64,
    pub unit: String,
    pub unit_price: f64,
    pub quantity: f64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductionOrderCostResult {
    pub production_order_id: Uuid,
    pub production_order_no: String,
    pub total_cost: f64,
    pub material_cost: f64,
    pub labor_cost: f64,
    pub overhead_cost: f64,
    pub unit_cost: f64,
    pub quantity: f64,
    pub currency: String,
    pub calculated_at: DateTime<Utc>,
    pub work_order_costs: Vec<WorkOrderCostResult>,
    pub cost_summary: CostSummary,
}

#[derive(Debug, Clone, Serialize)]
pub struct CostSummary {
    pub material_percentage: f64,
    pub labor_percentage: f64,
    pub overhead_percentage: f64,
    pub avg_unit_cost: f64,
    pub total_quantity: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PeriodCostReport {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_cost: f64,
    pub material_cost: f64,
    pub labor_cost: f64,
    pub overhead_cost: f64,
    pub cost_by_product: Vec<ProductCostItem>,
    pub cost_by_workshop: Vec<WorkshopCostItem>,
    pub cost_by_month: Vec<MonthlyCostItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductCostItem {
    pub product_code: String,
    pub product_name: String,
    pub total_cost: f64,
    pub unit_cost: f64,
    pub quantity: f64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkshopCostItem {
    pub workshop_id: Uuid,
    pub workshop_name: String,
    pub total_cost: f64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MonthlyCostItem {
    pub month: String,
    pub total_cost: f64,
    pub material_cost: f64,
    pub labor_cost: f64,
    pub overhead_cost: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CostTrendData {
    pub period: String,
    pub labels: Vec<String>,
    pub total_cost: Vec<f64>,
    pub material_cost: Vec<f64>,
    pub labor_cost: Vec<f64>,
    pub overhead_cost: Vec<f64>,
    pub avg_unit_cost: Vec<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CostComparisonRequest {
    pub items: Vec<ComparisonItem>,
    pub compare_type: ComparisonType,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ComparisonItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub item_type: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComparisonType {
    Product,
    Period,
    Workshop,
}

#[derive(Debug, Clone, Serialize)]
pub struct CostComparisonResult {
    pub items: Vec<ComparisonResultItem>,
    pub base_item: Option<String>,
    pub comparison_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ComparisonResultItem {
    pub id: String,
    pub name: String,
    pub total_cost: f64,
    pub material_cost: f64,
    pub labor_cost: f64,
    pub overhead_cost: f64,
    pub unit_cost: f64,
    pub quantity: f64,
    pub cost_index: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CostForecastResult {
    pub forecast_period: String,
    pub forecast_start: DateTime<Utc>,
    pub forecast_end: DateTime<Utc>,
    pub forecast_total_cost: f64,
    pub forecast_material_cost: f64,
    pub forecast_labor_cost: f64,
    pub forecast_overhead_cost: f64,
    pub forecast_avg_unit_cost: f64,
    pub confidence: f64,
    pub trend: String,
    pub historical_data: Vec<HistoricalCostPoint>,
    pub forecast_data: Vec<ForecastCostPoint>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoricalCostPoint {
    pub date: String,
    pub total_cost: f64,
    pub unit_cost: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ForecastCostPoint {
    pub date: String,
    pub total_cost: f64,
    pub lower_bound: f64,
    pub upper_bound: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PeriodQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub period_type: Option<String>,
}

// ==================== Helper Functions ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

/// 解析请求时间窗口：显式传入的时间解析失败就报错，不静默回落到默认窗口。
fn parse_period_window(
    params: &PeriodQuery,
    default_days: i64,
    label: &str,
) -> Result<(DateTime<Utc>, DateTime<Utc>), String> {
    let end_date = match params.end_date.as_deref() {
        Some(raw) => DateTime::parse_from_rfc3339(raw)
            .map(|d| d.with_timezone(&Utc))
            .map_err(|e| format!("{label}: end_date 无法解析（需 RFC3339 时间）: {raw} ({e})"))?,
        None => Utc::now(),
    };
    let start_date = match params.start_date.as_deref() {
        Some(raw) => DateTime::parse_from_rfc3339(raw)
            .map(|d| d.with_timezone(&Utc))
            .map_err(|e| format!("{label}: start_date 无法解析（需 RFC3339 时间）: {raw} ({e})"))?,
        None => end_date - Duration::days(default_days),
    };
    if start_date > end_date {
        return Err(format!("{label}: start_date 晚于 end_date"));
    }
    Ok((start_date, end_date))
}

/// 成本趋势聚合桶：料/工/费与完工数量，全部来自真实归集（不做 55/25/20 拆分）
#[derive(Default)]
struct CostTrendBucket {
    material: f64,
    labor: f64,
    overhead: f64,
    quantity: f64,
}

#[allow(dead_code)]
fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

// ==================== Cost Calculation Logic ====================

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
#[allow(unused_assignments)]
async fn calculate_work_order_cost_detail_db(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    work_order_id: Uuid,
    tenant_id: Uuid,
) -> Result<(WorkOrderCostResult, Vec<CostBreakdownItem>), TopemsError> {
    let work_order = sqlx::query(
        r#"
        SELECT wo.id, wo.work_order_no, wo.order_no, wo.product_code, wo.product_name,
               wo.planned_quantity, wo.completed_quantity, wo.actual_start_date, wo.actual_end_date,
               wo.work_station_id, wo.team_id, wo.operator
        FROM mes.work_orders wo
        WHERE wo.id = $1
          AND EXISTS (
                   SELECT 1 FROM mes.production_orders po
                   WHERE po.id = wo.order_id AND po.tenant_id = $2::uuid
               )
        "#,
    )
    .bind(work_order_id)
    .bind(tenant_id)
    .fetch_optional(&mut *scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("查询工单失败: {}", e)))?;

    let work_order = match work_order {
        Some(r) => r,
        None => {
            return Err(TopemsError::ResourceNotFound("工单不存在".to_string()));
        }
    };

    // 读列失败一律显形：变成 nil uuid / 空串会让 BOM 查不到、材料成本静默归 0
    let id: Uuid = work_order
        .try_get("id")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取工单 id 失败: {e}")))?;
    let work_order_no: String = work_order
        .try_get("work_order_no")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取工单号失败: {e}")))?;
    let order_no: Option<String> = work_order
        .try_get("order_no")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取生产订单号失败: {e}")))?;
    let product_code: String = work_order
        .try_get("product_code")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取产品编码失败: {e}")))?;
    let planned_qty = big_decimal_to_f64(
        work_order
            .try_get::<Option<BigDecimal>, _>("planned_quantity")
            .map_err(|e| TopemsError::DatabaseQuery(format!("读取计划数量失败: {e}")))?,
    );
    let completed_qty = big_decimal_to_f64(
        work_order
            .try_get::<Option<BigDecimal>, _>("completed_quantity")
            .map_err(|e| TopemsError::DatabaseQuery(format!("读取完工数量失败: {e}")))?,
    );
    // 产出量：优先完工数量，其次计划数量；两者都为 0 时不臆造 1（那样单价与用料量都是假的）
    let output_qty = if completed_qty > 0.0 {
        completed_qty
    } else {
        planned_qty
    };

    // 列名必须是 actual_start_date/actual_end_date（work_orders 无 *_time 列）；
    // 读列失败要显形，不能再回落成「默认 8 小时」这种编出来的工时
    let actual_start: Option<DateTime<Utc>> = work_order
        .try_get("actual_start_date")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取实际开工时间失败: {e}")))?;
    let actual_end: Option<DateTime<Utc>> = work_order
        .try_get("actual_end_date")
        .map_err(|e| TopemsError::DatabaseQuery(format!("读取实际完工时间失败: {e}")))?;
    let duration_hours: Option<f64> = match (actual_start, actual_end) {
        (Some(start), Some(end)) => {
            let hours = (end - start).num_seconds() as f64 / 3600.0;
            (hours > 0.0).then_some(hours)
        }
        _ => None,
    };
    let mut data_gaps: Vec<String> = Vec::new();
    if duration_hours.is_none() {
        data_gaps
            .push("工单无可用实际开完工时间（actual_start_date/actual_end_date 缺失或非正区间），人工工时未计入".to_string());
    }

    let mut cost_breakdown = Vec::new();
    let mut material_cost = 0.0;

    // 材料成本：用量按 BOM 损耗率放大，单价取共享层 public.inventory.unit_price。
    // 权威单价在 wms.inventory.standard_cost / erp.materials.unit_price，但 mes 的 schema 边界
    // （scripts/schema_boundary.json: services.mes.allow=[]）不允许跨 schema 读，缺口显式记入 data_gaps。
    let bom_items = sqlx::query(
        r#"
        SELECT bi.material_code, bi.material_name, bi.quantity, bi.unit, bi.loss_rate
        FROM mes.bom_items bi
        JOIN mes.material_boms b ON bi.bom_id = b.id
        WHERE b.product_code = $1
          AND EXISTS (
                   SELECT 1 FROM mes.production_orders po
                   WHERE po.product_code = b.product_code AND po.tenant_id = $2::uuid
               )
        "#,
    )
    .bind(&product_code)
    .bind(tenant_id)
    .fetch_all(&mut *scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(format!("查询 BOM 用料失败: {e}")))?;

    let mut bom_rows: Vec<(String, String, f64, String)> = Vec::new();
    let mut material_codes: Vec<String> = Vec::new();
    for item in bom_items {
        let mat_code: String = item
            .try_get("material_code")
            .map_err(|e| TopemsError::DatabaseQuery(format!("读取 BOM 物料编码失败: {e}")))?;
        let mat_name: String = item
            .try_get("material_name")
            .map_err(|e| TopemsError::DatabaseQuery(format!("读取 BOM 物料名称失败: {e}")))?;
        let bom_qty = big_decimal_to_f64(
            item.try_get::<Option<BigDecimal>, _>("quantity")
                .map_err(|e| TopemsError::DatabaseQuery(format!("读取 BOM 用量失败: {e}")))?,
        );
        let loss_rate = big_decimal_to_f64(
            item.try_get::<Option<BigDecimal>, _>("loss_rate")
                .map_err(|e| TopemsError::DatabaseQuery(format!("读取 BOM 损耗率失败: {e}")))?,
        );
        let unit: String = item
            .try_get("unit")
            .map_err(|e| TopemsError::DatabaseQuery(format!("读取 BOM 单位失败: {e}")))?;
        material_codes.push(mat_code.clone());
        // 用量 = BOM 单耗 × (1 + 损耗率) × 产出量
        let per_unit = bom_qty * (1.0 + loss_rate);
        bom_rows.push((mat_code, mat_name, per_unit, unit));
    }

    let mut unit_prices: HashMap<String, f64> = HashMap::new();
    if !material_codes.is_empty() {
        let price_rows = sqlx::query(
            r#"
            SELECT material_code, MAX(NULLIF(unit_price, 0)) AS unit_price
            FROM public.inventory
            WHERE tenant_id = $1
              AND deleted_at IS NULL
              AND material_code = ANY($2)
            GROUP BY material_code
            "#,
        )
        .bind(tenant_id)
        .bind(&material_codes)
        .fetch_all(&mut *scope)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(format!("查询库存单价失败: {e}")))?;
        for r in price_rows {
            let code: String = r.try_get("material_code").map_err(|e| {
                TopemsError::DatabaseQuery(format!("读取库存单价物料编码失败: {e}"))
            })?;
            let price: Option<f64> = r
                .try_get("unit_price")
                .map_err(|e| TopemsError::DatabaseQuery(format!("读取库存单价失败: {e}")))?;
            if let Some(price) = price.filter(|p| *p > 0.0) {
                unit_prices.insert(code, price);
            }
        }
    }

    for (mat_code, mat_name, per_unit, unit) in bom_rows {
        let quantity = per_unit * output_qty;
        match unit_prices.get(&mat_code) {
            Some(&unit_price) => {
                let item_total = quantity * unit_price;
                material_cost += item_total;
                cost_breakdown.push(CostBreakdownItem {
                    category: "材料成本".to_string(),
                    sub_category: mat_code,
                    description: mat_name,
                    amount: item_total,
                    unit,
                    unit_price,
                    quantity,
                    percentage: 0.0,
                });
            }
            None => {
                // 有量无价：并入缺口清单，金额不进 total，避免把 0 当成真实成本
                data_gaps.push(format!(
                    "物料 {mat_code} 在 public.inventory 无有效单价（用量 {quantity:.4}{unit}），材料成本未计入"
                ));
                cost_breakdown.push(CostBreakdownItem {
                    category: "材料成本".to_string(),
                    sub_category: mat_code,
                    description: mat_name,
                    amount: 0.0,
                    unit,
                    unit_price: 0.0,
                    quantity,
                    percentage: 0.0,
                });
            }
        }
    }

    // 人工成本：只按真实工时计，费率无来源就不计（原 50.0 元/小时是编的）
    if let Some(duration_hours) = duration_hours {
        data_gaps.push(
            "人工费率无权威来源（HR 月薪/工艺工时定额未接入 mes），人工成本按 0 计，仅记真实工时"
                .to_string(),
        );
        cost_breakdown.push(CostBreakdownItem {
            category: "人工成本".to_string(),
            sub_category: "直接人工".to_string(),
            description: format!("实际工时 {duration_hours:.2} 小时；小时费率未接入，金额不计"),
            amount: 0.0,
            unit: "元".to_string(),
            unit_price: 0.0,
            quantity: duration_hours,
            percentage: 0.0,
        });
    }
    let labor_cost = 0.0;

    // 制造费用：原先按人工成本的固定倍数编分摊系数，已删；无费率与分摊依据就不计
    let overhead_cost = 0.0;
    data_gaps.push("制造费用无分摊依据（设备折旧/能耗/管理费用费率未接入），按 0 计".to_string());

    let total_cost = material_cost + labor_cost + overhead_cost;

    for item in &mut cost_breakdown {
        item.percentage = if total_cost > 0.0 {
            (item.amount / total_cost * 100.0).round()
        } else {
            0.0
        };
    }

    // 单位成本：分母用真实产出量；产出量为 0 时明确为 0（不可计算），不做 max(1.0) 掩护
    let unit_cost = if output_qty > 0.0 {
        total_cost / output_qty
    } else {
        0.0
    };

    Ok((
        WorkOrderCostResult {
            work_order_id: id,
            work_order_no,
            production_order_no: order_no,
            total_cost,
            material_cost,
            labor_cost,
            overhead_cost,
            unit_cost,
            quantity: output_qty,
            currency: "CNY".to_string(),
            calculated_at: Utc::now(),
            cost_breakdown,
            data_gaps,
        },
        vec![],
    ))
}

// ==================== API Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/work-order/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Cost"
)]
pub async fn calculate_work_order_cost(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkOrderCostResult> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("计算工单成本失败");
        }
    };

    match calculate_work_order_cost_detail_db(&mut scope, id, get_tenant_id(&claims)).await {
        Ok((result, _)) => ApiResponse::success(result, "工单成本计算成功"),
        Err(err) => {
            tracing::error!("计算工单成本失败: {}", err);
            // ResourceNotFound 应返回 HTTP200+内层404，而非包装为 500
            if matches!(err, TopemsError::ResourceNotFound(_)) {
                return ApiResponse::not_found("工单不存在");
            }
            ApiResponse::from(TopemsError::internal("计算工单成本失败", err))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/work-order/{id}/detail",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Cost"
)]
pub async fn get_work_order_cost_detail(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkOrderCostResult> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工单成本详情失败");
        }
    };

    match calculate_work_order_cost_detail_db(&mut scope, id, get_tenant_id(&claims)).await {
        Ok((result, _)) => ApiResponse::success(result, "获取工单成本详情成功"),
        Err(err) => {
            tracing::error!("获取工单成本详情失败: {}", err);
            if matches!(err, TopemsError::ResourceNotFound(_)) {
                return ApiResponse::not_found("工单不存在");
            }
            ApiResponse::from(TopemsError::internal("获取工单成本详情失败", err))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/production-order/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Cost"
)]
pub async fn calculate_production_order_cost(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProductionOrderCostResult> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("查询生产订单失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);

    let order = sqlx::query(
        r#"
        SELECT id, order_number AS order_no, product_code, product_name, quantity::numeric, status
        FROM mes.production_orders
        WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;

    let order = match order {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::not_found("生产订单不存在");
        }
        Err(e) => {
            tracing::error!("查询生产订单失败: {}", e);
            return ApiResponse::server_error("查询生产订单失败");
        }
    };

    let order_id: Uuid = match order.try_get("id") {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("读取生产订单 id 失败", e)),
    };
    let order_no: String = match order.try_get("order_no") {
        Ok(v) => v,
        Err(e) => return ApiResponse::from(TopemsError::internal("读取生产订单号失败", e)),
    };
    let quantity = match order.try_get::<Option<BigDecimal>, _>("quantity") {
        Ok(v) => big_decimal_to_f64(v),
        Err(e) => return ApiResponse::from(TopemsError::internal("读取生产订单数量失败", e)),
    };

    let work_order_ids = sqlx::query(
        r#"
        SELECT id FROM mes.work_orders WHERE order_id = $1
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;

    let mut work_order_costs = Vec::new();
    let mut total_material = 0.0;
    let mut total_labor = 0.0;
    let mut total_overhead = 0.0;

    let rows = match work_order_ids {
        Ok(r) => r,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询生产订单工单失败", e)),
    };
    for row in rows {
        let wo_id: Uuid = match row.try_get("id") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取工单 id 失败", e)),
        };
        // 单张工单归集失败不许跳过：跳过等于总额少一块却仍报「计算成功」
        let (cost, _) =
            match calculate_work_order_cost_detail_db(&mut scope, wo_id, tenant_id).await {
                Ok(v) => v,
                Err(e) => return ApiResponse::from(TopemsError::internal("归集工单成本失败", e)),
            };
        work_order_costs.push(cost.clone());
        total_material += cost.material_cost;
        total_labor += cost.labor_cost;
        total_overhead += cost.overhead_cost;
    }

    let total_cost = total_material + total_labor + total_overhead;
    // 数量为 0 时单价不可计算：返回 0 而不是用 max(1.0) 把分母硬撑成 1（那样单价是假的）
    let unit_cost = if quantity > 0.0 {
        total_cost / quantity
    } else {
        0.0
    };

    ApiResponse::success(
        ProductionOrderCostResult {
            production_order_id: order_id,
            production_order_no: order_no,
            total_cost,
            material_cost: total_material,
            labor_cost: total_labor,
            overhead_cost: total_overhead,
            unit_cost,
            quantity,
            currency: "CNY".to_string(),
            calculated_at: Utc::now(),
            work_order_costs,
            cost_summary: CostSummary {
                material_percentage: if total_cost > 0.0 {
                    (total_material / total_cost * 100.0).round()
                } else {
                    0.0
                },
                labor_percentage: if total_cost > 0.0 {
                    (total_labor / total_cost * 100.0).round()
                } else {
                    0.0
                },
                overhead_percentage: if total_cost > 0.0 {
                    (total_overhead / total_cost * 100.0).round()
                } else {
                    0.0
                },
                avg_unit_cost: unit_cost,
                total_quantity: quantity,
            },
        },
        "生产订单成本计算成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/period",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Cost"
)]
pub async fn get_period_cost_report(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodQuery>,
) -> ApiResponse<PeriodCostReport> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取周期成本报告失败");
        }
    };

    let end_date = params
        .end_date
        .and_then(|d| DateTime::parse_from_rfc3339(&d).ok())
        .map(|d| d.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    let start_date = params
        .start_date
        .and_then(|d| DateTime::parse_from_rfc3339(&d).ok())
        .map(|d| d.with_timezone(&Utc))
        .unwrap_or_else(|| end_date - Duration::days(30));

    let tenant_id = get_tenant_id(&claims);
    let mut total_material = 0.0;
    let mut total_labor = 0.0;
    let mut total_overhead = 0.0;

    let work_orders = sqlx::query(
        r#"
        SELECT wo.id, wo.product_code, wo.product_name, wo.completed_quantity,
               wo.actual_start_date, wo.actual_end_date, wo.work_station_id,
               ws.station_name
        FROM mes.work_orders wo
        LEFT JOIN mes.work_stations ws ON ws.id = wo.work_station_id
        WHERE wo.actual_start_date IS NOT NULL
        AND wo.actual_start_date >= $1 AND wo.actual_start_date <= $2
        AND EXISTS (
                 SELECT 1 FROM mes.production_orders po
                 WHERE po.id = wo.order_id AND po.tenant_id = $3::uuid
             )
        "#,
    )
    .bind(start_date)
    .bind(end_date)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;

    let mut product_costs: HashMap<String, (f64, f64)> = HashMap::new();
    let mut product_names: HashMap<String, String> = HashMap::new();
    let mut workshop_costs: HashMap<Uuid, f64> = HashMap::new();
    let mut station_names: HashMap<Uuid, String> = HashMap::new();
    // 月度成本按工单实际开工月份归集（原先把总额除 6 摊到 6 个月，是编造出来的平滑曲线）
    let mut month_costs: HashMap<(i32, u32), (f64, f64, f64)> = HashMap::new();

    let rows = match work_orders {
        Ok(r) => r,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询周期成本工单失败", e)),
    };
    for row in rows {
        let wo_id: Uuid = match row.try_get("id") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取工单 id 失败", e)),
        };
        let product_code: String = match row.try_get("product_code") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取产品编码失败", e)),
        };
        let product_name: String = match row.try_get::<Option<String>, _>("product_name") {
            Ok(v) => v.unwrap_or_default(),
            Err(e) => return ApiResponse::from(TopemsError::internal("读取产品名称失败", e)),
        };
        let completed_qty = match row.try_get::<Option<BigDecimal>, _>("completed_quantity") {
            Ok(v) => big_decimal_to_f64(v),
            Err(e) => return ApiResponse::from(TopemsError::internal("读取完工数量失败", e)),
        };
        let ws_id: Option<Uuid> = match row.try_get("work_station_id") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取工位 id 失败", e)),
        };
        let station_name: Option<String> = match row.try_get("station_name") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取工位名称失败", e)),
        };
        let start_at: Option<DateTime<Utc>> = match row.try_get("actual_start_date") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取实际开工时间失败", e)),
        };

        // 单张工单归集失败就整体报错：跳过会让总额悄悄少一块，报表看起来仍然"成功"
        let (cost, _) =
            match calculate_work_order_cost_detail_db(&mut scope, wo_id, tenant_id).await {
                Ok(v) => v,
                Err(e) => return ApiResponse::from(TopemsError::internal("归集工单成本失败", e)),
            };

        total_material += cost.material_cost;
        total_labor += cost.labor_cost;
        total_overhead += cost.overhead_cost;

        if let Some(dt) = start_at {
            let key = (dt.year(), dt.month());
            let entry = month_costs.entry(key).or_insert((0.0, 0.0, 0.0));
            entry.0 += cost.material_cost;
            entry.1 += cost.labor_cost;
            entry.2 += cost.overhead_cost;
        }

        // 产品维度：键用产品编码，展示名优先真实 product_name（缺失才回落编码）
        if !product_name.is_empty() {
            product_names
                .entry(product_code.clone())
                .or_insert(product_name);
        }
        let entry = product_costs.entry(product_code).or_insert((0.0, 0.0));
        entry.0 += cost.total_cost;
        entry.1 += completed_qty;

        // 工位维度：键与展示名都取真实工位（原先用产品名当工位名）
        if let Some(wid) = ws_id {
            let entry = workshop_costs.entry(wid).or_insert(0.0);
            *entry += cost.total_cost;
            if let Some(name) = station_name {
                station_names.insert(wid, name);
            }
        }
    }

    let total_cost = total_material + total_labor + total_overhead;

    let product_cost_items: Vec<ProductCostItem> = product_costs
        .into_iter()
        .map(|(code, (cost, qty))| {
            let name = product_names
                .get(&code)
                .cloned()
                .unwrap_or_else(|| code.clone());
            ProductCostItem {
                product_code: code,
                product_name: name,
                total_cost: cost,
                unit_cost: if qty > 0.0 { cost / qty } else { 0.0 },
                quantity: qty,
                percentage: if total_cost > 0.0 {
                    (cost / total_cost * 100.0).round()
                } else {
                    0.0
                },
            }
        })
        .collect();

    let workshop_cost_items: Vec<WorkshopCostItem> = workshop_costs
        .into_iter()
        .map(|(id, cost)| {
            let name = station_names
                .get(&id)
                .cloned()
                .unwrap_or_else(|| id.to_string());
            WorkshopCostItem {
                workshop_id: id,
                workshop_name: name,
                total_cost: cost,
                percentage: if total_cost > 0.0 {
                    (cost / total_cost * 100.0).round()
                } else {
                    0.0
                },
            }
        })
        .collect();

    // 近 6 个自然月：只填真实有工单的月份，其余月份如实为 0
    let mut monthly_costs = Vec::new();
    let mut cursor = end_date;
    let mut keys: Vec<(i32, u32)> = Vec::new();
    for _ in 0..6 {
        keys.push((cursor.year(), cursor.month()));
        let first = cursor
            .date_naive()
            .with_day(1)
            .unwrap_or(cursor.date_naive());
        let prev_last = first - Duration::days(1);
        cursor = DateTime::<Utc>::from_naive_utc_and_offset(
            prev_last.and_hms_opt(12, 0, 0).unwrap_or_default(),
            Utc,
        );
    }
    keys.reverse();
    for (y, m) in keys {
        let (material, labor, overhead) =
            month_costs.get(&(y, m)).copied().unwrap_or((0.0, 0.0, 0.0));
        monthly_costs.push(MonthlyCostItem {
            month: format!("{y}-{m:02}"),
            total_cost: material + labor + overhead,
            material_cost: material,
            labor_cost: labor,
            overhead_cost: overhead,
        });
    }

    ApiResponse::success(
        PeriodCostReport {
            period_start: start_date,
            period_end: end_date,
            total_cost,
            material_cost: total_material,
            labor_cost: total_labor,
            overhead_cost: total_overhead,
            cost_by_product: product_cost_items,
            cost_by_workshop: workshop_cost_items,
            cost_by_month: monthly_costs,
        },
        "获取周期成本报告成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/trend",
    params(
        ("start_date" = Option<String>, Query, description = "RFC3339 起始时间，缺省为 end_date 前 90 天"),
        ("end_date" = Option<String>, Query, description = "RFC3339 结束时间，缺省为当前时间"),
        ("period_type" = Option<String>, Query, description = "聚合粒度：week（周一为起点）/ month，缺省 week"),
    ),
    responses(
        (status = 200, description = "按自然周/自然月聚合的真实归集成本", body = serde_json::Value),
        (status = 400, description = "时间窗口或聚合粒度非法"),
        (status = 500, description = "查询工单或归集成本失败")
    ),
    tag = "Cost"
)]
pub async fn get_cost_trend(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodQuery>,
) -> ApiResponse<CostTrendData> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    // 原实现固定「近 12 周」，把工单数乘 500 当成本、按 55/25/20 硬拆料工费、
    // 单价用 100 + i*5 递增——全部是编造。这里只做真实聚合，粒度不支持就明确拒绝。
    let monthly = match params.period_type.as_deref() {
        None => false,
        Some(pt) if pt.eq_ignore_ascii_case("week") || pt.eq_ignore_ascii_case("weekly") => false,
        Some(pt) if pt.eq_ignore_ascii_case("month") || pt.eq_ignore_ascii_case("monthly") => true,
        Some(other) => {
            return ApiResponse::bad_request(&format!(
                "成本趋势不支持 period_type={other}，仅支持 week / month（其他粒度未实现，不返回编造曲线）"
            ));
        }
    };
    let (start_date, end_date) = match parse_period_window(&params, 90, "成本趋势") {
        Ok(v) => v,
        Err(msg) => return ApiResponse::bad_request(&msg),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取成本趋势失败");
        }
    };

    let tenant_id = get_tenant_id(&claims);
    let rows = sqlx::query(
        r#"
        SELECT wo.id, wo.completed_quantity, wo.actual_start_date
        FROM mes.work_orders wo
        WHERE wo.actual_start_date IS NOT NULL
          AND wo.actual_start_date >= $1 AND wo.actual_start_date <= $2
          AND EXISTS (
                   SELECT 1 FROM mes.production_orders po
                   WHERE po.id = wo.order_id AND po.tenant_id = $3::uuid
               )
        ORDER BY wo.actual_start_date
        "#,
    )
    .bind(start_date)
    .bind(end_date)
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await;
    let rows = match rows {
        Ok(r) => r,
        Err(e) => return ApiResponse::from(TopemsError::internal("查询成本趋势工单失败", e)),
    };

    // 键：weekly → 该周周一日期；monthly → 该月 1 日
    let mut buckets: BTreeMap<chrono::NaiveDate, CostTrendBucket> = BTreeMap::new();
    for row in rows {
        let wo_id: Uuid = match row.try_get("id") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取工单 id 失败", e)),
        };
        let quantity = match row.try_get::<Option<BigDecimal>, _>("completed_quantity") {
            Ok(v) => big_decimal_to_f64(v),
            Err(e) => return ApiResponse::from(TopemsError::internal("读取完工数量失败", e)),
        };
        let started_at: Option<DateTime<Utc>> = match row.try_get("actual_start_date") {
            Ok(v) => v,
            Err(e) => return ApiResponse::from(TopemsError::internal("读取实际开工时间失败", e)),
        };
        let Some(started_at) = started_at else {
            // SQL 已排除 NULL；真出现说明数据被并发改动，报错而不是悄悄跳过
            return ApiResponse::from(TopemsError::internal(
                "工单缺少实际开工时间",
                wo_id.to_string(),
            ));
        };
        let (cost, _) =
            match calculate_work_order_cost_detail_db(&mut scope, wo_id, tenant_id).await {
                Ok(v) => v,
                Err(e) => return ApiResponse::from(TopemsError::internal("归集工单成本失败", e)),
            };
        let naive = started_at.date_naive();
        let key = if monthly {
            naive.with_day(1).unwrap_or(naive)
        } else {
            naive - Duration::days(i64::from(started_at.weekday().num_days_from_monday()))
        };
        let bucket = buckets.entry(key).or_default();
        bucket.material += cost.material_cost;
        bucket.labor += cost.labor_cost;
        bucket.overhead += cost.overhead_cost;
        bucket.quantity += quantity;
    }

    let mut labels = Vec::with_capacity(buckets.len());
    let mut total_costs = Vec::with_capacity(buckets.len());
    let mut material_costs = Vec::with_capacity(buckets.len());
    let mut labor_costs = Vec::with_capacity(buckets.len());
    let mut overhead_costs = Vec::with_capacity(buckets.len());
    let mut unit_costs = Vec::with_capacity(buckets.len());
    for (key, bucket) in buckets {
        labels.push(if monthly {
            key.format("%Y-%m").to_string()
        } else {
            key.format("%m-%d").to_string()
        });
        let total = bucket.material + bucket.labor + bucket.overhead;
        total_costs.push(total);
        material_costs.push(bucket.material);
        labor_costs.push(bucket.labor);
        overhead_costs.push(bucket.overhead);
        unit_costs.push(if bucket.quantity > 0.0 {
            total / bucket.quantity
        } else {
            0.0
        });
    }

    let period = if monthly { "monthly" } else { "weekly" };
    ApiResponse::success(
        CostTrendData {
            period: period.to_string(),
            labels,
            total_cost: total_costs,
            material_cost: material_costs,
            labor_cost: labor_costs,
            overhead_cost: overhead_costs,
            avg_unit_cost: unit_costs,
        },
        "获取成本趋势成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:cost:write"])),
    path = "/cost/comparison",
    responses(
        (status = 503, description = "成本对比未接入真实口径"),
    ),
    tag = "Cost"
)]
pub async fn get_cost_comparison(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<CostComparisonRequest>,
) -> ApiResponse<CostComparisonResult> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    // 原实现按数组下标编：total = 10000 + idx*2000，料/工/费按 55/25/20 拆，
    // 单价 100 + idx*20、数量 100 + idx*50，与库里任何一行都无关。
    // 真实对比需要「实体 id → 生产订单/产品/车间」的映射和时间窗口，请求契约两者都没有，
    // 因此显式不提供，而不是继续给经营决策喂假数。
    ApiResponse::from(TopemsError::ServiceUnavailable(
        "成本对比未接入真实口径：请求只带 id/name/type，缺少时间窗口与实体映射，暂不返回编造数值"
            .to_string(),
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:cost:read"])),
    path = "/cost/forecast",
    responses(
        (status = 503, description = "成本预测模型未接入"),
    ),
    tag = "Cost"
)]
pub async fn get_cost_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodQuery>,
) -> ApiResponse<CostForecastResult> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionCostRead).await
    {
        return e;
    }

    // 原实现的历史点 50000 + i*5000、预测点 80000 + i*3000、置信区间 ±10%、
    // confidence 85、trend "upward"、料工费 55/25/20 全是常量，与真实成本无关。
    // 预测需要模型与回测口径，本服务没有任何实现，故显式 503。
    let requested_months = params.period_type.unwrap_or_else(|| "30d".to_string());
    ApiResponse::from(TopemsError::ServiceUnavailable(format!(
        "成本预测未接入：本服务没有预测模型与回测口径（请求参数 {requested_months}），不返回编造预测"
    )))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }
}
