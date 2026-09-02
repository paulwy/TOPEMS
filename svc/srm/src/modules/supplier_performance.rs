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
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{SupplierEvaluation, SupplierPerformance};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::ApiResponse;

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

    let result = sqlx::query_as::<_, SupplierPerformance>(only_own_schema_query!(
        "srm",
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
        "plugin_srm"
    ))
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
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
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
                "plugin_srm"
            ))
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

    let supplier_info =
        sqlx::query_as::<_, (String, String, String, String)>(only_own_schema_query!(
            "srm",
            r#"
        SELECT name, category, status, contact_person
        FROM plugin_srm.suppliers
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
        "#,
            "plugin_srm"
        ))
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

    let performance = sqlx::query_as::<_, SupplierPerformance>(only_own_schema_query!(
        "srm",
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
        "plugin_srm"
    ))
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
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1 AND tenant_id = $2
        ORDER BY evaluation_date DESC
        LIMIT 10
        "#, "plugin_srm"),
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
    >(only_own_schema_query!(
        "srm",
        r#"
        SELECT contract_no, title, start_date, end_date, total_amount
        FROM plugin_srm.supplier_contracts
        WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'active'
        ORDER BY start_date DESC
        LIMIT 5
        "#,
        "plugin_srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let products =
        sqlx::query_as::<_, (String, String, Option<f64>, Option<i32>)>(only_own_schema_query!(
            "srm",
            r#"
        SELECT product_no, name, unit_price, min_order_qty
        FROM plugin_srm.supplier_products
        WHERE supplier_id = $1 AND tenant_id = $2 AND status = 'active'
        ORDER BY unit_price ASC
        LIMIT 10
        "#,
            "plugin_srm"
        ))
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
    >(only_own_schema_query!(
        "srm",
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
        "plugin_srm"
    ))
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
        only_own_schema_query!("srm", r#"
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
        "#, "plugin_srm"),
    )
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let top_by_orders = sqlx::query_as::<_, SupplierPerformance>(
        only_own_schema_query!("srm", r#"
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
        "#, "plugin_srm"),
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
        only_own_schema_query!("srm", r#"
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
        "#, "plugin_srm"),
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

    let distribution = sqlx::query_as::<_, (String, i64)>(only_own_schema_query!(
        "srm",
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
        "plugin_srm"
    ))
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

    let total_suppliers = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND status != 'deleted'",
        "plugin_srm"
    ))
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let evaluated_suppliers = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(DISTINCT supplier_id) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1", "plugin_srm"),
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let avg_score = sqlx::query_scalar::<_, Option<f64>>(
        only_own_schema_query!("srm", "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE tenant_id = $1 AND overall_score IS NOT NULL", "plugin_srm"),
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0);

    let top_supplier = sqlx::query_as::<_, (String, f64)>(only_own_schema_query!(
        "srm",
        r#"
        SELECT s.name, AVG(e.overall_score) as avg_score
        FROM plugin_srm.supplier_evaluations e
        JOIN plugin_srm.suppliers s ON e.supplier_id = s.id
        WHERE e.tenant_id = $1 AND e.overall_score IS NOT NULL
        GROUP BY s.name
        ORDER BY avg_score DESC
        LIMIT 1
        "#,
        "plugin_srm"
    ))
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let bottom_supplier = sqlx::query_as::<_, (String, f64)>(only_own_schema_query!(
        "srm",
        r#"
        SELECT s.name, AVG(e.overall_score) as avg_score
        FROM plugin_srm.supplier_evaluations e
        JOIN plugin_srm.suppliers s ON e.supplier_id = s.id
        WHERE e.tenant_id = $1 AND e.overall_score IS NOT NULL
        GROUP BY s.name
        ORDER BY avg_score ASC
        LIMIT 1
        "#,
        "plugin_srm"
    ))
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    let category_scores = sqlx::query_as::<_, (String, f64, i64)>(only_own_schema_query!(
        "srm",
        r#"
        SELECT s.category, AVG(e.overall_score) as avg_score, COUNT(DISTINCT s.id) as supplier_count
        FROM plugin_srm.suppliers s
        LEFT JOIN plugin_srm.supplier_evaluations e ON s.id = e.supplier_id
        WHERE s.tenant_id = $1 AND s.status != 'deleted' AND e.overall_score IS NOT NULL
        GROUP BY s.category
        ORDER BY avg_score DESC
        "#,
        "plugin_srm"
    ))
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

pub fn moving_average_quarters(scores: &[Option<f64>]) -> f64 {
    if scores.is_empty() {
        return 0.0_f64;
    }

    let mut filled_scores: Vec<f64> = Vec::with_capacity(scores.len());
    let mut last_valid: Option<f64> = None;

    for opt in scores.iter() {
        match opt {
            Some(s) => {
                filled_scores.push(*s);
                last_valid = Some(*s);
            }
            None => {
                let fill_val = match last_valid {
                    Some(lv) => lv * 0.8_f64,
                    None => 0.0_f64,
                };
                filled_scores.push(fill_val);
                last_valid = Some(fill_val);
            }
        }
    }

    let sum: f64 = filled_scores.iter().sum();
    let avg = sum / filled_scores.len() as f64;
    avg.clamp(0.0_f64, 100.0_f64)
}

pub fn performance_trend(prev: Option<f64>, curr: f64) -> &'static str {
    match prev {
        None => "stable",
        Some(p) => {
            let diff = curr - p;
            if diff > 2.0_f64 {
                "rising"
            } else if diff < -2.0_f64 {
                "declining"
            } else if diff.abs() < 0.5_f64 {
                "flat"
            } else {
                "stable"
            }
        }
    }
}

pub fn promotion_judgement(
    last2: &[f64; 2],
    threshold_up: f64,
    threshold_down: f64,
) -> &'static str {
    let all_above_up = last2.iter().all(|s| *s >= threshold_up);
    let all_below_down = last2.iter().all(|s| *s < threshold_down);

    if all_above_up {
        "promote"
    } else if all_below_down {
        "demote"
    } else {
        "retain"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_moving_average_quarters_all_present() {
        let scores = vec![
            Some(80.0_f64),
            Some(85.0_f64),
            Some(90.0_f64),
            Some(95.0_f64),
        ];
        let result = moving_average_quarters(&scores);
        assert!(
            (result - 87.5_f64).abs() < 0.01_f64,
            "全有数据的简单均值计算错误"
        );
    }

    #[test]
    fn test_moving_average_quarters_some_none() {
        let scores = vec![Some(100.0_f64), None, Some(80.0_f64)];
        let result = moving_average_quarters(&scores);
        assert!(
            (result - (100.0_f64 + 80.0_f64 + 80.0_f64) / 3.0_f64).abs() < 0.01_f64,
            "None应按最近一季0.8惩罚填充"
        );
    }

    #[test]
    fn test_moving_average_quarters_empty() {
        let scores: Vec<Option<f64>> = vec![];
        assert_eq!(moving_average_quarters(&scores), 0.0_f64, "空列表返回0");
    }

    #[test]
    fn test_moving_average_quarters_all_none() {
        let scores = vec![None, None, None];
        assert_eq!(moving_average_quarters(&scores), 0.0_f64, "全None时返回0");
    }

    #[test]
    fn test_performance_trend_rising() {
        assert_eq!(
            performance_trend(Some(70.0_f64), 80.0_f64),
            "rising",
            "上升趋势判定错误"
        );
    }

    #[test]
    fn test_performance_trend_declining() {
        assert_eq!(
            performance_trend(Some(85.0_f64), 75.0_f64),
            "declining",
            "下降趋势判定错误"
        );
    }

    #[test]
    fn test_performance_trend_flat() {
        assert_eq!(
            performance_trend(Some(80.0_f64), 80.2_f64),
            "flat",
            "微波动应判定为flat"
        );
    }

    #[test]
    fn test_performance_trend_no_prev() {
        assert_eq!(
            performance_trend(None, 80.0_f64),
            "stable",
            "无前期数据应返回stable"
        );
    }

    #[test]
    fn test_promotion_judgement_promote() {
        let last2 = [85.0_f64, 88.0_f64];
        assert_eq!(
            promotion_judgement(&last2, 80.0_f64, 60.0_f64),
            "promote",
            "连续2季达标应升级"
        );
    }

    #[test]
    fn test_promotion_judgement_demote() {
        let last2 = [55.0_f64, 58.0_f64];
        assert_eq!(
            promotion_judgement(&last2, 80.0_f64, 60.0_f64),
            "demote",
            "连续2季不达标应降级"
        );
    }

    #[test]
    fn test_promotion_judgement_retain() {
        let last2 = [70.0_f64, 75.0_f64];
        assert_eq!(
            promotion_judgement(&last2, 80.0_f64, 60.0_f64),
            "retain",
            "介于中间应保留等级"
        );
    }

    #[test]
    fn test_moving_average_quarters_first_none_then_valid() {
        let scores = vec![None, Some(100.0_f64)];
        let result = moving_average_quarters(&scores);
        assert!(
            (result - 50.0_f64).abs() < 0.01_f64,
            "首个None用0填充，后续正常"
        );
    }

    #[test]
    fn test_performance_trend_small_change_stable() {
        assert_eq!(
            performance_trend(Some(80.0_f64), 81.5_f64),
            "stable",
            "小幅上升但小于2应判定stable"
        );
        assert_eq!(
            performance_trend(Some(80.0_f64), 78.5_f64),
            "stable",
            "小幅下降但大于-2应判定stable"
        );
    }

    #[test]
    fn test_promotion_judgement_mixed_results_retain() {
        let last2 = [90.0_f64, 50.0_f64];
        assert_eq!(
            promotion_judgement(&last2, 80.0_f64, 60.0_f64),
            "retain",
            "一季高一季低应保留等级"
        );
    }

    #[test]
    fn test_performance_trend_exactly_boundary() {
        assert_eq!(
            performance_trend(Some(80.0_f64), 82.0_f64),
            "stable",
            "刚好差2应判定stable边界"
        );
        assert_eq!(
            performance_trend(Some(80.0_f64), 78.0_f64),
            "stable",
            "刚好差-2应判定stable边界"
        );
    }
}
