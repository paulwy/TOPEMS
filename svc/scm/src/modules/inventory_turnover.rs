use axum::{
    extract::{Extension, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/scm/inventory-turnover", get(calculate_turnover))
        .route("/api/scm/inventory-turnover/days", get(turnover_days))
        .route(
            "/api/scm/inventory-turnover/abc-analysis",
            get(abc_analysis),
        )
        .route("/api/scm/inventory-turnover/trend", get(turnover_trend))
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TurnoverQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InventoryTurnoverItem {
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub beginning_inventory: f64,
    pub ending_inventory: f64,
    pub average_inventory: f64,
    pub cost_of_goods_sold: f64,
    pub turnover_rate: f64,
    pub turnover_days: f64,
    pub inventory_value: f64,
}

pub async fn calculate_turnover(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TurnoverQueryParams>,
    Query(pagination): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = pagination.page.unwrap_or(1).max(1);
    let page_size = pagination.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(90);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params
        .end_date
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let search_pattern = pagination.search.clone().map(|s| format!("%{}%", s));

    let result = sqlx::query(
        r#"
        WITH inventory_period AS (
            SELECT 
                i.material_code,
                i.material_name,
                i.specification,
                i.unit,
                i.category,
                i.warehouse_id,
                w.name as warehouse_name,
                COALESCE(i.quantity, 0) as ending_inventory,
                COALESCE(i.total_value, 0) as ending_value
            FROM wms.inventory i
            LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
            WHERE i.deleted_at IS NULL
              AND ($5::uuid IS NULL OR i.warehouse_id = $5)
              AND ($6::text IS NULL OR i.category = $6)
        ),
        outbound_summary AS (
            SELECT 
                material_code,
                warehouse_id,
                SUM(quantity) as total_outbound_quantity,
                SUM(total_value) as total_outbound_value
            FROM wms.inventory_movements
            WHERE movement_type = 'outbound'
              AND created_at >= $1::timestamptz
              AND created_at <= $2::timestamptz
              AND ($5::uuid IS NULL OR warehouse_id = $5)
            GROUP BY material_code, warehouse_id
        ),
        beginning_inventory AS (
            SELECT 
                material_code,
                warehouse_id,
                AVG(quantity) as avg_beginning
            FROM wms.inventory_snapshots
            WHERE snapshot_date >= $1::date
              AND snapshot_date <= $2::date
              AND ($5::uuid IS NULL OR warehouse_id = $5)
            GROUP BY material_code, warehouse_id
        )
        SELECT 
            ip.material_code,
            ip.material_name,
            ip.specification,
            ip.unit,
            ip.category,
            ip.warehouse_id,
            ip.warehouse_name,
            COALESCE(bi.avg_beginning, ip.ending_inventory) as beginning_inventory,
            ip.ending_inventory,
            (COALESCE(bi.avg_beginning, ip.ending_inventory) + ip.ending_inventory) / 2 as average_inventory,
            COALESCE(os.total_outbound_value, 0) as cost_of_goods_sold,
            CASE 
                WHEN (COALESCE(bi.avg_beginning, ip.ending_inventory) + ip.ending_inventory) / 2 > 0
                THEN COALESCE(os.total_outbound_value, 0) / ((COALESCE(bi.avg_beginning, ip.ending_inventory) + ip.ending_inventory) / 2)
                ELSE 0
            END as turnover_rate,
            CASE 
                WHEN 
                    (COALESCE(bi.avg_beginning, ip.ending_inventory) + ip.ending_inventory) / 2 > 0
                    AND COALESCE(os.total_outbound_value, 0) > 0
                THEN ((COALESCE(bi.avg_beginning, ip.ending_inventory) + ip.ending_inventory) / 2) * 90 / COALESCE(os.total_outbound_value, 1)
                ELSE 999
            END as turnover_days,
            ip.ending_value as inventory_value
        FROM inventory_period ip
        LEFT JOIN outbound_summary os 
            ON ip.material_code = os.material_code 
            AND ip.warehouse_id = os.warehouse_id
        LEFT JOIN beginning_inventory bi 
            ON ip.material_code = bi.material_code 
            AND ip.warehouse_id = bi.warehouse_id
        WHERE ($3::text IS NULL OR ip.material_name ILIKE $3 OR ip.material_code ILIKE $3)
        ORDER BY turnover_rate DESC
        LIMIT $4 OFFSET $7
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(params.warehouse_id)
    .bind(&params.category)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) 
                FROM wms.inventory i
                WHERE i.deleted_at IS NULL
                  AND ($1::uuid IS NULL OR i.warehouse_id = $1)
                  AND ($2::text IS NULL OR i.category = $2)
                  AND ($3::text IS NULL OR i.material_name ILIKE $3 OR i.material_code ILIKE $3)
                "#,
            )
            .bind(params.warehouse_id)
            .bind(&params.category)
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items: Vec<InventoryTurnoverItem> = rows
                .iter()
                .map(|row| InventoryTurnoverItem {
                    material_code: row.try_get("material_code").unwrap_or_default(),
                    material_name: row.try_get("material_name").unwrap_or_default(),
                    specification: row.try_get("specification").unwrap_or_default(),
                    unit: row.try_get("unit").unwrap_or_default(),
                    category: row.try_get("category").unwrap_or_default(),
                    warehouse_id: row.try_get("warehouse_id").unwrap_or_default(),
                    warehouse_name: row.try_get("warehouse_name").unwrap_or_default(),
                    beginning_inventory: row.try_get("beginning_inventory").unwrap_or(0.0),
                    ending_inventory: row.try_get("ending_inventory").unwrap_or(0.0),
                    average_inventory: row.try_get("average_inventory").unwrap_or(0.0),
                    cost_of_goods_sold: row.try_get("cost_of_goods_sold").unwrap_or(0.0),
                    turnover_rate: row.try_get("turnover_rate").unwrap_or(0.0),
                    turnover_days: row.try_get("turnover_days").unwrap_or(0.0),
                    inventory_value: row.try_get("inventory_value").unwrap_or(0.0),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "start_date": start_date,
                    "end_date": end_date
                }),
                "库存周转率计算成功",
            ))
        }
        Err(e) => {
            tracing::error!("计算库存周转率失败: {}", e);
            Json(api_error(500, "计算库存周转率失败"))
        }
    }
}

pub async fn turnover_days(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TurnoverQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(90);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params
        .end_date
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let result = sqlx::query(
        r#"
        WITH overall_stats AS (
            SELECT 
                SUM(COALESCE(i.total_value, 0)) as total_inventory_value,
                COUNT(*) as sku_count
            FROM wms.inventory i
            WHERE i.deleted_at IS NULL
              AND ($3::uuid IS NULL OR i.warehouse_id = $3)
        ),
        outbound_stats AS (
            SELECT 
                SUM(total_value) as total_outbound_value,
                COUNT(DISTINCT material_code) as active_skus
            FROM wms.inventory_movements
            WHERE movement_type = 'outbound'
              AND created_at >= $1::timestamptz
              AND created_at <= $2::timestamptz
              AND ($3::uuid IS NULL OR warehouse_id = $3)
        )
        SELECT 
            os.total_outbound_value,
            os.active_skus,
            os2.total_inventory_value,
            os2.sku_count,
            CASE 
                WHEN os2.total_inventory_value > 0 AND os.total_outbound_value > 0
                THEN os2.total_inventory_value * 90 / os.total_outbound_value
                ELSE 0
            END as overall_turnover_days,
            CASE 
                WHEN os2.total_inventory_value > 0
                THEN os.total_outbound_value / os2.total_inventory_value
                ELSE 0
            END as overall_turnover_rate
        FROM outbound_stats os
        CROSS JOIN overall_stats os2
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            let total_outbound_value: f64 = row.try_get("total_outbound_value").unwrap_or(0.0);
            let active_skus: i64 = row.try_get("active_skus").unwrap_or(0);
            let total_inventory_value: f64 = row.try_get("total_inventory_value").unwrap_or(0.0);
            let sku_count: i64 = row.try_get("sku_count").unwrap_or(0);
            let overall_turnover_days: f64 = row.try_get("overall_turnover_days").unwrap_or(0.0);
            let overall_turnover_rate: f64 = row.try_get("overall_turnover_rate").unwrap_or(0.0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "overall_turnover_rate": overall_turnover_rate,
                    "overall_turnover_days": overall_turnover_days,
                    "total_inventory_value": total_inventory_value,
                    "total_outbound_value": total_outbound_value,
                    "sku_count": sku_count,
                    "active_skus": active_skus,
                    "start_date": start_date,
                    "end_date": end_date
                }),
                "库存周转天数查询成功",
            ))
        }
        Ok(None) => Json(api_error(404, "暂无数据")),
        Err(e) => {
            tracing::error!("查询库存周转天数失败: {}", e);
            Json(api_error(500, "查询库存周转天数失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AbcAnalysisResult {
    pub category: String,
    pub sku_count: i64,
    pub sku_percentage: f64,
    pub inventory_value: f64,
    pub value_percentage: f64,
    pub avg_turnover_rate: f64,
    pub avg_turnover_days: f64,
}

pub async fn abc_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TurnoverQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(90);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params
        .end_date
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let result = sqlx::query(
        r#"
        WITH ranked_inventory AS (
            SELECT 
                i.material_code,
                i.material_name,
                COALESCE(i.total_value, 0) as inventory_value,
                SUM(COALESCE(im.total_value, 0)) as outbound_value,
                ROW_NUMBER() OVER (ORDER BY COALESCE(i.total_value, 0) DESC) as rn,
                COUNT(*) OVER () as total_count,
                SUM(COALESCE(i.total_value, 0)) OVER () as total_value
            FROM wms.inventory i
            LEFT JOIN wms.inventory_movements im 
                ON i.material_code = im.material_code 
                AND im.movement_type = 'outbound'
                AND im.created_at >= $1::timestamptz
                AND im.created_at <= $2::timestamptz
            WHERE i.deleted_at IS NULL
              AND ($3::uuid IS NULL OR i.warehouse_id = $3)
            GROUP BY i.material_code, i.material_name, i.total_value
        ),
        cumulative AS (
            SELECT 
                *,
                SUM(inventory_value) OVER (ORDER BY rn) as cumulative_value,
                (SUM(inventory_value) OVER (ORDER BY rn) / NULLIF(total_value, 0)) * 100 as cumulative_pct
            FROM ranked_inventory
        ),
        abc_classified AS (
            SELECT 
                *,
                CASE 
                    WHEN cumulative_pct <= 70 THEN 'A'
                    WHEN cumulative_pct <= 90 THEN 'B'
                    ELSE 'C'
                END as abc_category
            FROM cumulative
        )
        SELECT 
            abc_category as category,
            COUNT(*) as sku_count,
            (COUNT(*) * 100.0 / NULLIF(MAX(total_count), 0)) as sku_percentage,
            SUM(inventory_value) as inventory_value,
            (SUM(inventory_value) * 100.0 / NULLIF(MAX(total_value), 0)) as value_percentage,
            AVG(CASE 
                WHEN inventory_value > 0 THEN outbound_value / inventory_value
                ELSE 0
            END) as avg_turnover_rate,
            AVG(CASE 
                WHEN inventory_value > 0 AND outbound_value > 0
                THEN inventory_value * 90 / outbound_value
                ELSE 999
            END) as avg_turnover_days
        FROM abc_classified
        GROUP BY abc_category
        ORDER BY abc_category
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let results: Vec<AbcAnalysisResult> = rows
                .iter()
                .map(|row| AbcAnalysisResult {
                    category: row.try_get("category").unwrap_or_default(),
                    sku_count: row.try_get("sku_count").unwrap_or(0),
                    sku_percentage: row.try_get("sku_percentage").unwrap_or(0.0),
                    inventory_value: row.try_get("inventory_value").unwrap_or(0.0),
                    value_percentage: row.try_get("value_percentage").unwrap_or(0.0),
                    avg_turnover_rate: row.try_get("avg_turnover_rate").unwrap_or(0.0),
                    avg_turnover_days: row.try_get("avg_turnover_days").unwrap_or(0.0),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "abc_analysis": results,
                    "start_date": start_date,
                    "end_date": end_date
                }),
                "ABC分类分析成功",
            ))
        }
        Err(e) => {
            tracing::error!("ABC分类分析失败: {}", e);
            Json(api_error(500, "ABC分类分析失败"))
        }
    }
}

pub async fn turnover_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TurnoverQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(180);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params
        .end_date
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

    let result = sqlx::query(
        r#"
        WITH monthly_data AS (
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(CASE WHEN movement_type = 'outbound' THEN total_value ELSE 0 END) as outbound_value,
                SUM(CASE WHEN movement_type = 'inbound' THEN total_value ELSE 0 END) as inbound_value
            FROM wms.inventory_movements
            WHERE created_at >= $1::timestamptz
              AND created_at <= $2::timestamptz
              AND ($3::uuid IS NULL OR warehouse_id = $3)
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month
        ),
        monthly_inventory AS (
            SELECT 
                DATE_TRUNC('month', snapshot_date) as month,
                AVG(total_value) as avg_inventory_value
            FROM wms.inventory_snapshots
            WHERE snapshot_date >= $1::date
              AND snapshot_date <= $2::date
              AND ($3::uuid IS NULL OR warehouse_id = $3)
            GROUP BY DATE_TRUNC('month', snapshot_date)
        )
        SELECT 
            md.month,
            md.outbound_value,
            md.inbound_value,
            mi.avg_inventory_value,
            CASE 
                WHEN mi.avg_inventory_value > 0 AND md.outbound_value > 0
                THEN md.outbound_value / mi.avg_inventory_value
                ELSE 0
            END as turnover_rate,
            CASE 
                WHEN mi.avg_inventory_value > 0 AND md.outbound_value > 0
                THEN mi.avg_inventory_value * 30 / md.outbound_value
                ELSE 0
            END as turnover_days
        FROM monthly_data md
        LEFT JOIN monthly_inventory mi ON md.month = mi.month
        ORDER BY md.month
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let trend_data: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "month": row.try_get::<chrono::NaiveDateTime, _>("month").ok().map(|m| m.format("%Y-%m").to_string()),
                        "outbound_value": row.try_get::<f64, _>("outbound_value").unwrap_or(0.0),
                        "inbound_value": row.try_get::<f64, _>("inbound_value").unwrap_or(0.0),
                        "avg_inventory_value": row.try_get::<Option<f64>, _>("avg_inventory_value").unwrap_or(Some(0.0)),
                        "turnover_rate": row.try_get::<f64, _>("turnover_rate").unwrap_or(0.0),
                        "turnover_days": row.try_get::<f64, _>("turnover_days").unwrap_or(0.0),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "trend": trend_data,
                    "start_date": start_date,
                    "end_date": end_date
                }),
                "库存周转率趋势查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询库存周转率趋势失败: {}", e);
            Json(api_error(500, "查询库存周转率趋势失败"))
        }
    }
}
