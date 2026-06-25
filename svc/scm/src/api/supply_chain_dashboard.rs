use axum::{
    extract::{Extension, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/scm/dashboard/overview", get(overview))
        .route(
            "/api/scm/dashboard/purchase-inbound-outbound",
            get(purchase_inbound_outbound_stats),
        )
        .route(
            "/api/scm/dashboard/supplier-performance",
            get(supplier_performance),
        )
        .route(
            "/api/scm/dashboard/real-time-status",
            get(real_time_status),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct DashboardQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

async fn overview(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DashboardQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(30);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params.end_date.unwrap_or_else(|| {
        chrono::Utc::now().format("%Y-%m-%d").to_string()
    });

    let purchase_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
            COUNT(*) FILTER (WHERE status = 'approved') as approved_orders,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected_orders,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
            COALESCE(SUM(total_amount), 0) as total_amount,
            COALESCE(AVG(total_amount), 0) as avg_order_amount
        FROM scm.purchase_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(&state.db)
    .await;

    let supplier_stats = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM scm.suppliers WHERE status = 'active'
        "#,
    )
    .fetch_one(&state.db)
    .await;

    let inventory_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_skus,
            COALESCE(SUM(quantity), 0) as total_quantity,
            COALESCE(SUM(total_value), 0) as total_value,
            COUNT(*) FILTER (WHERE available_quantity < COALESCE(min_quantity, 0)) as low_stock_count
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND ($3::uuid IS NULL OR warehouse_id = $3)
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await;

    let inbound_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_inbound,
            COALESCE(SUM(total_quantity), 0) as total_inbound_quantity,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_inbound,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_inbound
        FROM wms.inbound_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await;

    let outbound_stats = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_outbound,
            COALESCE(SUM(total_quantity), 0) as total_outbound_quantity,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_outbound,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_outbound
        FROM wms.outbound_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await;

    let mut overview_data = serde_json::json!({
        "period": {
            "start_date": start_date,
            "end_date": end_date
        }
    });

    if let Ok(row) = purchase_stats {
        overview_data["purchase"] = serde_json::json!({
            "total_orders": row.try_get::<i64, _>("total_orders").unwrap_or(0),
            "pending_orders": row.try_get::<i64, _>("pending_orders").unwrap_or(0),
            "approved_orders": row.try_get::<i64, _>("approved_orders").unwrap_or(0),
            "rejected_orders": row.try_get::<i64, _>("rejected_orders").unwrap_or(0),
            "completed_orders": row.try_get::<i64, _>("completed_orders").unwrap_or(0),
            "total_amount": row.try_get::<f64, _>("total_amount").unwrap_or(0.0),
            "avg_order_amount": row.try_get::<f64, _>("avg_order_amount").unwrap_or(0.0),
        });
    }

    overview_data["suppliers"] = serde_json::json!({
        "active_count": supplier_stats.unwrap_or(0)
    });

    if let Ok(row) = inventory_stats {
        overview_data["inventory"] = serde_json::json!({
            "total_skus": row.try_get::<i64, _>("total_skus").unwrap_or(0),
            "total_quantity": row.try_get::<f64, _>("total_quantity").unwrap_or(0.0),
            "total_value": row.try_get::<f64, _>("total_value").unwrap_or(0.0),
            "low_stock_count": row.try_get::<i64, _>("low_stock_count").unwrap_or(0),
        });
    }

    if let Ok(row) = inbound_stats {
        overview_data["inbound"] = serde_json::json!({
            "total_orders": row.try_get::<i64, _>("total_inbound").unwrap_or(0),
            "total_quantity": row.try_get::<f64, _>("total_inbound_quantity").unwrap_or(0.0),
            "pending_count": row.try_get::<i64, _>("pending_inbound").unwrap_or(0),
            "completed_count": row.try_get::<i64, _>("completed_inbound").unwrap_or(0),
        });
    }

    if let Ok(row) = outbound_stats {
        overview_data["outbound"] = serde_json::json!({
            "total_orders": row.try_get::<i64, _>("total_outbound").unwrap_or(0),
            "total_quantity": row.try_get::<f64, _>("total_outbound_quantity").unwrap_or(0.0),
            "pending_count": row.try_get::<i64, _>("pending_outbound").unwrap_or(0),
            "completed_count": row.try_get::<i64, _>("completed_outbound").unwrap_or(0),
        });
    }

    Json(ApiResponse::success(
        overview_data,
        "获取供应链概览数据成功",
    ))
}

async fn purchase_inbound_outbound_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DashboardQueryParams>,
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
    let end_date = params.end_date.unwrap_or_else(|| {
        chrono::Utc::now().format("%Y-%m-%d").to_string()
    });

    let purchase_trend = sqlx::query(
        r#"
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount), 0) as total_amount
        FROM scm.purchase_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    let inbound_trend = sqlx::query(
        r#"
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as order_count,
            COALESCE(SUM(total_quantity), 0) as total_quantity
        FROM wms.inbound_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_all(&state.db)
    .await;

    let outbound_trend = sqlx::query(
        r#"
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as order_count,
            COALESCE(SUM(total_quantity), 0) as total_quantity
        FROM wms.outbound_orders
        WHERE created_at >= $1::timestamptz
          AND created_at <= $2::timestamptz
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .bind(params.warehouse_id)
    .fetch_all(&state.db)
    .await;

    let format_trend = |rows: Result<Vec<sqlx::postgres::PgRow>, sqlx::Error>,
                        amount_field: &str|
     -> Vec<serde_json::Value> {
        match rows {
            Ok(rows) => rows
                .iter()
                .map(|row| {
                    let date: chrono::NaiveDateTime = row.try_get("date").unwrap_or_default();
                    let order_count: i64 = row.try_get("order_count").unwrap_or(0);
                    let amount: f64 = row.try_get(amount_field).unwrap_or(0.0);
                    serde_json::json!({
                        "date": date.format("%Y-%m-%d").to_string(),
                        "order_count": order_count,
                        "amount": amount
                    })
                })
                .collect(),
            Err(e) => {
                tracing::error!("查询趋势数据失败: {}", e);
                vec![]
            }
        }
    };

    let purchase_data = format_trend(purchase_trend, "total_amount");
    let inbound_data = format_trend(inbound_trend, "total_quantity");
    let outbound_data = format_trend(outbound_trend, "total_quantity");

    Json(ApiResponse::success(
        serde_json::json!({
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "purchase_trend": purchase_data,
            "inbound_trend": inbound_data,
            "outbound_trend": outbound_data,
        }),
        "获取采购-入库-出库全链路统计成功",
    ))
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SupplierPerformanceItem {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub category: Option<String>,
    pub total_orders: i64,
    pub total_amount: f64,
    pub on_time_delivery_rate: f64,
    pub quality_pass_rate: f64,
    pub avg_response_time_hours: f64,
    pub overall_score: f64,
    pub level: Option<String>,
}

async fn supplier_performance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DashboardQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierEvaluationRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let start_date = params.start_date.unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let start = now - chrono::Duration::days(90);
        start.format("%Y-%m-%d").to_string()
    });
    let end_date = params.end_date.unwrap_or_else(|| {
        chrono::Utc::now().format("%Y-%m-%d").to_string()
    });

    let result = sqlx::query(
        r#"
        SELECT 
            s.id,
            s.name,
            s.code,
            s.category,
            COUNT(po.id) as total_orders,
            COALESCE(SUM(po.total_amount), 0) as total_amount,
            COALESCE(AVG(CASE 
                WHEN po.delivery_date IS NOT NULL AND po.updated_at <= po.delivery_date THEN 100
                WHEN po.delivery_date IS NOT NULL THEN 50
                ELSE 70
            END), 0) as on_time_delivery_rate,
            COALESCE(AVG(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM scm.incoming_inspections ii
                    WHERE ii.notice_id IN (
                        SELECT id FROM scm.incoming_notices 
                        WHERE purchase_order_id = po.id
                    ) AND ii.status = 'passed'
                ) THEN 100
                WHEN EXISTS (
                    SELECT 1 FROM scm.incoming_inspections ii
                    WHERE ii.notice_id IN (
                        SELECT id FROM scm.incoming_notices 
                        WHERE purchase_order_id = po.id
                    ) AND ii.status = 'failed'
                ) THEN 60
                ELSE 85
            END), 0) as quality_pass_rate,
            COALESCE(AVG(
                EXTRACT(EPOCH FROM (po.created_at - s.created_at)) / 3600
            ), 0) as avg_response_time_hours,
            COALESCE(se.total_score, 0) as overall_score,
            s.level
        FROM scm.suppliers s
        LEFT JOIN scm.purchase_orders po 
            ON po.supplier_id = s.id
            AND po.created_at >= $1::timestamptz
            AND po.created_at <= $2::timestamptz
        LEFT JOIN (
            SELECT supplier_id, MAX(total_score) as total_score
            FROM scm.supplier_evaluations
            WHERE created_at >= $1::timestamptz
              AND created_at <= $2::timestamptz
            GROUP BY supplier_id
        ) se ON s.id = se.supplier_id
        WHERE s.status = 'active'
        GROUP BY s.id, s.name, s.code, s.category, se.total_score, s.level
        ORDER BY overall_score DESC
        LIMIT 10
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let suppliers: Vec<SupplierPerformanceItem> = rows
                .iter()
                .map(|row| SupplierPerformanceItem {
                    id: row.try_get("id").unwrap_or_default(),
                    name: row.try_get("name").unwrap_or_default(),
                    code: row.try_get("code").unwrap_or_default(),
                    category: row.try_get("category").unwrap_or_default(),
                    total_orders: row.try_get("total_orders").unwrap_or(0),
                    total_amount: row.try_get("total_amount").unwrap_or(0.0),
                    on_time_delivery_rate: row.try_get("on_time_delivery_rate").unwrap_or(0.0),
                    quality_pass_rate: row.try_get("quality_pass_rate").unwrap_or(0.0),
                    avg_response_time_hours: row
                        .try_get("avg_response_time_hours")
                        .unwrap_or(0.0),
                    overall_score: row.try_get("overall_score").unwrap_or(0.0),
                    level: row.try_get("level").unwrap_or_default(),
                })
                .collect();

            let category_distribution = sqlx::query(
                r#"
                SELECT 
                    category,
                    COUNT(*) as supplier_count,
                    COALESCE(SUM(total_amount), 0) as total_purchase_amount
                FROM (
                    SELECT 
                        s.category,
                        s.id,
                        COALESCE(SUM(po.total_amount), 0) as total_amount
                    FROM scm.suppliers s
                    LEFT JOIN scm.purchase_orders po 
                        ON po.supplier_id = s.id
                        AND po.created_at >= $1::timestamptz
                        AND po.created_at <= $2::timestamptz
                    WHERE s.status = 'active'
                    GROUP BY s.category, s.id
                ) sub
                GROUP BY category
                ORDER BY supplier_count DESC
                "#,
            )
            .bind(&start_date)
            .bind(&end_date)
            .fetch_all(&state.db)
            .await;

            let category_stats: Vec<serde_json::Value> = match category_distribution {
                Ok(rows) => rows
                    .iter()
                    .map(|row| {
                        serde_json::json!({
                            "category": row.try_get::<Option<String>, _>("category").unwrap_or(Some("未分类".to_string())).unwrap_or_else(|| "未分类".to_string()),
                            "supplier_count": row.try_get::<i64, _>("supplier_count").unwrap_or(0),
                            "total_purchase_amount": row.try_get::<f64, _>("total_purchase_amount").unwrap_or(0.0),
                        })
                    })
                    .collect(),
                Err(e) => {
                    tracing::error!("查询供应商分类统计失败: {}", e);
                    vec![]
                }
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "period": {
                        "start_date": start_date,
                        "end_date": end_date
                    },
                    "top_suppliers": suppliers,
                    "category_distribution": category_stats,
                }),
                "获取供应商绩效概览成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商绩效概览失败: {}", e);
            Json(api_error(500, "获取供应商绩效概览失败"))
        }
    }
}

async fn real_time_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DashboardQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let pending_purchase = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM scm.purchase_orders WHERE status = 'pending'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pending_inbound = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM wms.inbound_orders 
        WHERE status = 'pending'
          AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND deleted_at IS NULL
        "#,
    )
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pending_outbound = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM wms.outbound_orders 
        WHERE status = 'pending'
          AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND deleted_at IS NULL
        "#,
    )
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let low_stock_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM wms.inventory
        WHERE available_quantity < COALESCE(min_quantity, 0)
          AND deleted_at IS NULL
          AND ($1::uuid IS NULL OR warehouse_id = $1)
        "#,
    )
    .bind(params.warehouse_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pending_inspection = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM scm.incoming_inspections WHERE status = 'pending'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let replenishment_suggestions = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM wms.replenishment_suggestions WHERE status = 'draft'
        "#,
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let mrp_suggestions = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM scm.mrp_suggestions WHERE status = 'draft'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({
            "pending_purchase_orders": pending_purchase,
            "pending_inbound_orders": pending_inbound,
            "pending_outbound_orders": pending_outbound,
            "low_stock_items": low_stock_count,
            "pending_inspections": pending_inspection,
            "pending_replenishment_suggestions": replenishment_suggestions,
            "pending_mrp_suggestions": mrp_suggestions,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        "获取实时状态成功",
    ))
}
