use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{SupplierEvaluation, SupplierPerformance};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PerformanceQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub min_score: Option<f64>,
    pub max_score: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CompareParams {
    pub supplier_ids: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TrendParams {
    pub supplier_id: Option<String>,
    pub period: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/performance/reports", get(get_performance_reports))
        .route("/performance/reports/{id}", get(get_performance_report))
        .route("/performance/compare", get(compare_supplier_performance))
        .route("/performance/trend", get(get_performance_trend))
        .route("/performance/top-suppliers", get(get_top_suppliers))
        .route("/performance/export", get(export_performance_report))
        .route(
            "/performance/score-level-distribution",
            get(get_score_level_distribution),
        )
        .route("/performance/summary", get(get_performance_summary))
        .with_state(state);

    Ok(app)
}

async fn get_performance_reports(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PerformanceQueryParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let category_filter = params.category.clone();
    let status_filter = params.status.clone();

    let start_date = params.start_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let end_date = params.end_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let min_score = params.min_score;
    let max_score = params.max_score;

    let result = sqlx::query_as::<_, SupplierPerformance>(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT 
                supplier_id,
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $1
              AND status != 'cancelled'
              AND ($6::timestamptz IS NULL OR created_at >= $6)
              AND ($7::timestamptz IS NULL OR created_at <= $7)
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT 
                supplier_id,
                AVG(quality_score) as avg_quality_score,
                AVG(delivery_score) as avg_delivery_score,
                AVG(service_score) as avg_service_score,
                AVG(price_score) as avg_price_score,
                AVG(overall_score) as avg_overall_score,
                MAX(evaluation_date) as last_evaluation_date,
                COUNT(*) as evaluation_count,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as on_time_delivery_rate,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1
              AND ($6::timestamptz IS NULL OR evaluation_date >= $6)
              AND ($7::timestamptz IS NULL OR evaluation_date <= $7)
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1
          AND s.status != 'deleted'
          AND ($2::text IS NULL OR s.name ILIKE $2)
          AND ($3::text IS NULL OR s.category = $3)
          AND ($4::text IS NULL OR s.status = $4)
          AND ($8::double precision IS NULL OR e.avg_overall_score >= $8)
          AND ($9::double precision IS NULL OR e.avg_overall_score <= $9)
        ORDER BY e.avg_overall_score DESC NULLS LAST
        LIMIT $5 OFFSET $10
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&category_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(start_date)
    .bind(end_date)
    .bind(min_score)
    .bind(max_score)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(performances) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM plugin_srm.suppliers s
                LEFT JOIN (
                    SELECT supplier_id, AVG(overall_score) as avg_overall_score
                    FROM plugin_srm.supplier_evaluations
                    WHERE tenant_id = $1
                      AND ($6::timestamptz IS NULL OR evaluation_date >= $6)
                      AND ($7::timestamptz IS NULL OR evaluation_date <= $7)
                    GROUP BY supplier_id
                ) e ON s.id = e.supplier_id
                WHERE s.tenant_id = $1
                  AND s.status != 'deleted'
                  AND ($2::text IS NULL OR s.name ILIKE $2)
                  AND ($3::text IS NULL OR s.category = $3)
                  AND ($4::text IS NULL OR s.status = $4)
                  AND ($8::double precision IS NULL OR e.avg_overall_score >= $8)
                  AND ($9::double precision IS NULL OR e.avg_overall_score <= $9)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&category_filter)
            .bind(&status_filter)
            .bind(start_date)
            .bind(end_date)
            .bind(min_score)
            .bind(max_score)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "performances": performances,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商绩效报表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商绩效报表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商绩效报表失败",
            ))
        }
    }
}

async fn get_performance_report(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let supplier_info = sqlx::query_as::<_, (String, String, String, String)>(
        r#"
        SELECT name, category, status, contact_person
        FROM plugin_srm.suppliers
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let (supplier_name, category, status, contact_person) = match supplier_info {
        Ok(Some(s)) => s,
        Ok(None) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                404,
                "供应商不存在或已删除",
            ));
        }
        Err(e) => {
            tracing::error!("查询供应商信息失败: {}", e);
            return Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询供应商信息失败",
            ));
        }
    };

    let performance = sqlx::query_as::<_, SupplierPerformance>(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT 
                supplier_id,
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $2
              AND status != 'cancelled' AND supplier_id = $1
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT 
                supplier_id,
                AVG(quality_score) as avg_quality_score,
                AVG(delivery_score) as avg_delivery_score,
                AVG(service_score) as avg_service_score,
                AVG(price_score) as avg_price_score,
                AVG(overall_score) as avg_overall_score,
                MAX(evaluation_date) as last_evaluation_date,
                COUNT(*) as evaluation_count,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as on_time_delivery_rate,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $2 AND supplier_id = $1
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.id = $1 AND s.tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let performance = match performance {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                404,
                "未找到供应商绩效数据",
            ));
        }
        Err(e) => {
            tracing::error!("查询供应商绩效失败: {}", e);
            return Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询供应商绩效失败",
            ));
        }
    };

    let evaluation_history = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1 AND tenant_id = $2
        ORDER BY evaluation_date DESC
        LIMIT 10
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let contracts = sqlx::query_as::<
        _,
        (
            String,
            String,
            Option<DateTime<Utc>>,
            Option<DateTime<Utc>>,
            Option<f64>,
        ),
    >(
        r#"
        SELECT contract_no, title, start_date, end_date, total_amount
        FROM plugin_srm.supplier_contracts
        WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'active'
        ORDER BY start_date DESC
        LIMIT 5
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let products = sqlx::query_as::<_, (String, String, Option<f64>, Option<i32>)>(
        r#"
        SELECT product_no, name, unit_price, min_order_qty
        FROM plugin_srm.supplier_products
        WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'active'
        ORDER BY unit_price ASC
        LIMIT 10
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let result = serde_json::json!({
        "supplier_info": {
            "id": id,
            "name": supplier_name,
            "category": category,
            "status": status,
            "contact_person": contact_person
        },
        "performance": performance,
        "evaluation_history": evaluation_history,
        "active_contracts": contracts,
        "products": products
    });

    Json(ApiResponse::success(result, "获取供应商绩效详情成功"))
}

async fn compare_supplier_performance(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CompareParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let supplier_ids_str = params.supplier_ids.clone().unwrap_or_default();
    let supplier_ids: Vec<Uuid> = supplier_ids_str
        .split(',')
        .filter(|s| !s.is_empty())
        .filter_map(|s| Uuid::parse_str(s).ok())
        .collect();

    if supplier_ids.is_empty() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "请至少选择一个供应商ID",
        ));
    }

    let placeholders: Vec<String> = (2..=supplier_ids.len() + 1)
        .map(|i| format!("${}", i))
        .collect();
    let placeholders_str = placeholders.join(", ");

    let query = format!(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT 
                supplier_id,
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $1 AND status != 'cancelled'
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT 
                supplier_id,
                AVG(quality_score) as avg_quality_score,
                AVG(delivery_score) as avg_delivery_score,
                AVG(service_score) as avg_service_score,
                AVG(price_score) as avg_price_score,
                AVG(overall_score) as avg_overall_score,
                MAX(evaluation_date) as last_evaluation_date,
                COUNT(*) as evaluation_count,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as on_time_delivery_rate,
                ROUND(
                    CASE WHEN COUNT(*) > 0 THEN 
                        (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
                    ELSE NULL END, 2
                ) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1 AND s.id IN ({}) AND s.status != 'deleted'
        ORDER BY e.avg_overall_score DESC NULLS LAST
        "#,
        placeholders_str
    );

    let mut query_builder = sqlx::query_as::<_, SupplierPerformance>(&query);
    query_builder = query_builder.bind(tenant_id);
    for id in &supplier_ids {
        query_builder = query_builder.bind(*id);
    }

    let result = query_builder.fetch_all(&state.db).await;

    match result {
        Ok(performances) => {
            let comparison = serde_json::json!({
                "suppliers": performances,
                "metrics": [
                    {"name": "avg_overall_score", "label": "综合评分", "unit": "分"},
                    {"name": "avg_quality_score", "label": "质量评分", "unit": "分"},
                    {"name": "avg_delivery_score", "label": "交付评分", "unit": "分"},
                    {"name": "avg_service_score", "label": "服务评分", "unit": "分"},
                    {"name": "avg_price_score", "label": "价格评分", "unit": "分"},
                    {"name": "on_time_delivery_rate", "label": "准时交付率", "unit": "%"},
                    {"name": "defect_rate", "label": "缺陷率", "unit": "%"},
                    {"name": "total_orders", "label": "订单总数", "unit": "笔"},
                    {"name": "total_amount", "label": "订单总金额", "unit": "元"}
                ]
            });

            Json(ApiResponse::success(comparison, "供应商绩效对比成功"))
        }
        Err(e) => {
            tracing::error!("供应商绩效对比失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "供应商绩效对比失败",
            ))
        }
    }
}

async fn get_performance_trend(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TrendParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let supplier_id = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());

    let period = params.period.clone().unwrap_or("3m".to_string());

    let interval = match period.as_str() {
        "1m" => "1 month",
        "3m" => "3 months",
        "6m" => "6 months",
        "1y" => "1 year",
        "2y" => "2 years",
        _ => "6 months",
    };

    let result = sqlx::query_as::<
        _,
        (
            String,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            i64,
        ),
    >(
        r#"
        SELECT 
            TO_CHAR(evaluation_date, 'YYYY-MM') as month,
            AVG(quality_score) as avg_quality_score,
            AVG(delivery_score) as avg_delivery_score,
            AVG(service_score) as avg_service_score,
            AVG(price_score) as avg_price_score,
            AVG(overall_score) as avg_overall_score,
            COUNT(*) as evaluation_count
        FROM plugin_srm.supplier_evaluations
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR supplier_id = $2)
          AND evaluation_date >= NOW() - INTERVAL $3
        GROUP BY TO_CHAR(evaluation_date, 'YYYY-MM')
        ORDER BY month
        "#,
    )
    .bind(tenant_id)
    .bind(supplier_id)
    .bind(interval)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(trends) => {
            let trend_data = trends
                .into_iter()
                .map(
                    |(month, quality, delivery, service, price, overall, count)| {
                        serde_json::json!({
                            "month": month,
                            "avg_quality_score": quality,
                            "avg_delivery_score": delivery,
                            "avg_service_score": service,
                            "avg_price_score": price,
                            "avg_overall_score": overall,
                            "evaluation_count": count
                        })
                    },
                )
                .collect::<Vec<_>>();

            let result = serde_json::json!({
                "period": period,
                "supplier_id": supplier_id,
                "trend_data": trend_data
            });

            Json(ApiResponse::success(result, "获取供应商绩效趋势成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商绩效趋势失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商绩效趋势失败",
            ))
        }
    }
}

async fn get_top_suppliers(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let top_by_score = sqlx::query_as::<_, SupplierPerformance>(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT supplier_id, COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $1 AND status != 'cancelled'
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT supplier_id, AVG(quality_score) as avg_quality_score, AVG(delivery_score) as avg_delivery_score,
                   AVG(service_score) as avg_service_score, AVG(price_score) as avg_price_score,
                   AVG(overall_score) as avg_overall_score, MAX(evaluation_date) as last_evaluation_date,
                   COUNT(*) as evaluation_count,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as on_time_delivery_rate,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1 AND s.status = 'active' AND e.avg_overall_score IS NOT NULL
        ORDER BY e.avg_overall_score DESC
        LIMIT 10
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let top_by_orders = sqlx::query_as::<_, SupplierPerformance>(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT supplier_id, COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $1 AND status != 'cancelled'
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT supplier_id, AVG(quality_score) as avg_quality_score, AVG(delivery_score) as avg_delivery_score,
                   AVG(service_score) as avg_service_score, AVG(price_score) as avg_price_score,
                   AVG(overall_score) as avg_overall_score, MAX(evaluation_date) as last_evaluation_date,
                   COUNT(*) as evaluation_count,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as on_time_delivery_rate,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        ORDER BY po.total_orders DESC NULLS LAST
        LIMIT 10
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let result = serde_json::json!({
        "top_by_score": top_by_score,
        "top_by_orders": top_by_orders
    });

    Json(ApiResponse::success(result, "获取TOP供应商成功"))
}

async fn export_performance_report(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PerformanceQueryParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let category_filter = params.category.clone();
    let status_filter = params.status.clone();

    let start_date = params.start_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let end_date = params.end_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let min_score = params.min_score;
    let max_score = params.max_score;

    let result = sqlx::query_as::<_, SupplierPerformance>(
        r#"
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COALESCE(po.total_orders, 0) as total_orders,
            COALESCE(po.total_amount, 0) as total_amount,
            COALESCE(e.avg_quality_score, NULL) as avg_quality_score,
            COALESCE(e.avg_delivery_score, NULL) as avg_delivery_score,
            COALESCE(e.avg_service_score, NULL) as avg_service_score,
            COALESCE(e.avg_price_score, NULL) as avg_price_score,
            COALESCE(e.avg_overall_score, NULL) as avg_overall_score,
            COALESCE(e.on_time_delivery_rate, NULL) as on_time_delivery_rate,
            COALESCE(e.defect_rate, NULL) as defect_rate,
            e.last_evaluation_date,
            COALESCE(e.evaluation_count, 0) as evaluation_count
        FROM plugin_srm.suppliers s
        LEFT JOIN (
            SELECT supplier_id, COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
            FROM plugin_srm.purchase_orders
            WHERE tenant_id = $1
              AND status != 'cancelled'
              AND ($6::timestamptz IS NULL OR created_at >= $6)
              AND ($7::timestamptz IS NULL OR created_at <= $7)
            GROUP BY supplier_id
        ) po ON s.id = po.supplier_id
        LEFT JOIN (
            SELECT supplier_id, AVG(quality_score) as avg_quality_score, AVG(delivery_score) as avg_delivery_score,
                   AVG(service_score) as avg_service_score, AVG(price_score) as avg_price_score,
                   AVG(overall_score) as avg_overall_score, MAX(evaluation_date) as last_evaluation_date,
                   COUNT(*) as evaluation_count,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN delivery_score >= 80 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as on_time_delivery_rate,
                   ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE NULL END, 2) as defect_rate
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1
              AND ($6::timestamptz IS NULL OR evaluation_date >= $6)
              AND ($7::timestamptz IS NULL OR evaluation_date <= $7)
            GROUP BY supplier_id
        ) e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1
          AND s.status != 'deleted'
          AND ($2::text IS NULL OR s.name ILIKE $2)
          AND ($3::text IS NULL OR s.category = $3)
          AND ($4::text IS NULL OR s.status = $4)
          AND ($8::double precision IS NULL OR e.avg_overall_score >= $8)
          AND ($9::double precision IS NULL OR e.avg_overall_score <= $9)
        ORDER BY e.avg_overall_score DESC NULLS LAST
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&category_filter)
    .bind(&status_filter)
    .bind(start_date)
    .bind(end_date)
    .bind(min_score)
    .bind(max_score)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(performances) => {
            let report = serde_json::json!({
                "report_type": "supplier_performance",
                "generated_at": Utc::now().to_rfc3339(),
                "filters": {
                    "search": params.search,
                    "category": params.category,
                    "status": params.status,
                    "start_date": params.start_date,
                    "end_date": params.end_date,
                    "min_score": params.min_score,
                    "max_score": params.max_score
                },
                "total_count": performances.len(),
                "data": performances
            });

            Json(ApiResponse::success(report, "导出供应商绩效报表成功"))
        }
        Err(e) => {
            tracing::error!("导出供应商绩效报表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "导出供应商绩效报表失败",
            ))
        }
    }
}

async fn get_score_level_distribution(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let distribution = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT 
            CASE 
                WHEN avg_overall_score >= 90 THEN 'A'
                WHEN avg_overall_score >= 80 THEN 'B'
                WHEN avg_overall_score >= 70 THEN 'C'
                WHEN avg_overall_score >= 60 THEN 'D'
                ELSE 'E'
            END as level,
            COUNT(*) as count
        FROM (
            SELECT supplier_id, AVG(overall_score) as avg_overall_score
            FROM plugin_srm.supplier_evaluations
            WHERE tenant_id = $1 AND overall_score IS NOT NULL
            GROUP BY supplier_id
        ) s
        GROUP BY level
        ORDER BY level
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let level_labels: Vec<serde_json::Value> = distribution
        .into_iter()
        .map(|(level, count)| {
            let label = match level.as_str() {
                "A" => "优秀 (90-100)",
                "B" => "良好 (80-89)",
                "C" => "中等 (70-79)",
                "D" => "及格 (60-69)",
                "E" => "较差 (<60)",
                _ => &level,
            };
            serde_json::json!({
                "level": level,
                "label": label,
                "count": count
            })
        })
        .collect();

    let result = serde_json::json!({
        "distribution": level_labels,
        "level_definitions": [
            {"level": "A", "range": "90-100", "description": "优秀供应商，各方面表现出色"},
            {"level": "B", "range": "80-89", "description": "良好供应商，整体表现优秀"},
            {"level": "C", "range": "70-79", "description": "中等供应商，需持续改进"},
            {"level": "D", "range": "60-69", "description": "及格供应商，有较大改进空间"},
            {"level": "E", "range": "<60", "description": "较差供应商，需重点关注"}
        ]
    });

    Json(ApiResponse::success(result, "获取评分等级分布成功"))
}

async fn get_performance_summary(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let total_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted'",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let evaluated_suppliers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(DISTINCT supplier_id) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1 AND overall_score IS NOT NULL",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let top_supplier = sqlx::query_as::<_, (String, f64)>(
        r#"
        SELECT s.name, AVG(e.overall_score) as avg_score
        FROM plugin_srm.supplier_evaluations e
        JOIN plugin_srm.suppliers s ON e.supplier_id = s.id
        WHERE e.tenant_id = $1 AND e.overall_score IS NOT NULL
        GROUP BY s.name
        ORDER BY avg_score DESC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let bottom_supplier = sqlx::query_as::<_, (String, f64)>(
        r#"
        SELECT s.name, AVG(e.overall_score) as avg_score
        FROM plugin_srm.supplier_evaluations e
        JOIN plugin_srm.suppliers s ON e.supplier_id = s.id
        WHERE e.tenant_id = $1 AND e.overall_score IS NOT NULL
        GROUP BY s.name
        ORDER BY avg_score ASC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let category_scores = sqlx::query_as::<_, (String, f64, i64)>(
        r#"
        SELECT s.category, AVG(e.overall_score) as avg_score, COUNT(DISTINCT s.id) as supplier_count
        FROM plugin_srm.suppliers s
        LEFT JOIN plugin_srm.supplier_evaluations e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1 AND s.status != 'deleted' AND e.overall_score IS NOT NULL
        GROUP BY s.category
        ORDER BY avg_score DESC
        "#,
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let category_scores_json: Vec<serde_json::Value> = category_scores
        .into_iter()
        .map(|(category, avg_score, supplier_count)| {
            serde_json::json!({
                "category": category,
                "avg_score": avg_score,
                "supplier_count": supplier_count
            })
        })
        .collect();

    let result = serde_json::json!({
        "total_suppliers": total_suppliers,
        "evaluated_suppliers": evaluated_suppliers,
        "evaluation_rate": if total_suppliers > 0 {
            ((evaluated_suppliers as f64 / total_suppliers as f64) * 100.0).round() / 100.0
        } else {
            0.0
        },
        "avg_overall_score": avg_score,
        "top_supplier": top_supplier.map(|(name, score)| {
            serde_json::json!({"name": name, "avg_score": score})
        }),
        "bottom_supplier": bottom_supplier.map(|(name, score)| {
            serde_json::json!({"name": name, "avg_score": score})
        }),
        "category_scores": category_scores_json
    });

    Json(ApiResponse::success(result, "获取绩效汇总成功"))
}
