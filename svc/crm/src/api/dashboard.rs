use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{Datelike, TimeZone, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    DashboardStats, CustomerStats, ContactStats, OpportunityStats, InteractionStats,
    CustomerWithDetails, IndustryCount, StageCount, TypeCount, FunnelStage, SalesForecast,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct ForecastParams {
    pub months: Option<i64>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/crm/dashboard/stats", get(get_dashboard_stats))
        .route("/api/crm/dashboard/funnel", get(get_sales_funnel))
        .route("/api/crm/dashboard/forecast", get(get_sales_forecast))
        .route("/api/crm/customers/{id}/details", get(get_customer_details))
}

async fn get_dashboard_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardStats>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let customers_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let customers_active: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM customers WHERE status = 'active'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let by_industry: Vec<IndustryCount> = sqlx::query_as(
        "SELECT industry, COUNT(*) as count FROM customers WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let contacts_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contacts")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let contacts_active: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contacts WHERE status = 'active'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let opportunities_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM opportunities")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let by_stage: Vec<StageCount> = sqlx::query_as(
        "SELECT stage, COUNT(*) as count FROM opportunities GROUP BY stage ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    let total_value: Option<i64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM opportunities WHERE value IS NOT NULL"
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0));

    let interactions_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM interactions")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let interactions_scheduled: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM interactions WHERE status = 'scheduled'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let interactions_completed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM interactions WHERE status = 'completed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let by_type: Vec<TypeCount> = sqlx::query_as(
        "SELECT type, COUNT(*) as count FROM interactions GROUP BY type ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let stats = DashboardStats {
        customers: CustomerStats {
            total: customers_total,
            active: customers_active,
            by_industry,
        },
        contacts: ContactStats {
            total: contacts_total,
            active: contacts_active,
        },
        opportunities: OpportunityStats {
            total: opportunities_total,
            by_stage,
            total_value,
        },
        interactions: InteractionStats {
            total: interactions_total,
            scheduled: interactions_scheduled,
            completed: interactions_completed,
            by_type,
        },
    };

    Json(ApiResponse::success(stats, "获取仪表板统计成功"))
}

async fn get_customer_details(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CustomerWithDetails>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let customer = sqlx::query_as::<_, crate::models::Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match customer {
        Ok(Some(customer)) => {
            let contacts = sqlx::query_as::<_, crate::models::Contact>(
                "SELECT id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
                 FROM contacts WHERE customer_id = $1 ORDER BY created_at DESC"
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            let opportunities = sqlx::query_as::<_, crate::models::Opportunity>(
                "SELECT id, customer_id, name, value, stage, probability, close_date, notes, created_at, updated_at
                 FROM opportunities WHERE customer_id = $1 ORDER BY created_at DESC"
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            let recent_interactions = sqlx::query_as::<_, crate::models::Interaction>(
                "SELECT id, customer_id, contact_id, type, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at
                 FROM interactions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10"
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            let details = CustomerWithDetails {
                customer,
                contacts,
                opportunities,
                recent_interactions,
            };

            Json(ApiResponse::success(details, "获取客户详情成功"))
        }
        Ok(None) => Json(topems_shared::api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户详情失败: {}", e);
            Json(topems_shared::api_error(500, "获取客户详情失败"))
        }
    }
}

async fn get_sales_funnel(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FunnelStage>>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let stages = vec![
        ("prospecting", "线索"),
        ("qualified", "合格"),
        ("proposal", "提案"),
        ("negotiation", "谈判"),
        ("closed_won", "赢单"),
        ("closed_lost", "输单"),
    ];
    
    let mut funnel_stages = Vec::new();
    
    for (stage, stage_label) in stages {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM plugin_crm.opportunities WHERE stage = $1"
        )
        .bind(stage)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

        let total_value: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(SUM(value), 0) FROM plugin_crm.opportunities WHERE stage = $1 AND value IS NOT NULL"
        )
        .bind(stage)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0));

        funnel_stages.push(FunnelStage {
            stage: stage.to_string(),
            count,
            total_value,
        });
    }

    Json(ApiResponse::success(funnel_stages, "获取销售漏斗成功"))
}

async fn get_sales_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ForecastParams>,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let months = params.months.unwrap_or(12).min(24).max(1);
    
    let mut forecast_data = Vec::new();
    
    for i in 0..months as usize {
        let forecast_month = Utc::now() + chrono::Duration::days(i as i64 * 30);
        let month_start = Utc.from_utc_datetime(&forecast_month.date_naive().with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap());
        let month_end = month_start + chrono::Duration::days(31);
        
        let weighted_value: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(value * probability / 100), 0) 
            FROM plugin_crm.opportunities 
            WHERE close_date >= $1 AND close_date < $2 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(month_start)
        .bind(month_end)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(Some(0.0));

        forecast_data.push((month_start, weighted_value.unwrap_or(0.0)));
    }

    let total_forecast: f64 = forecast_data.iter().map(|(_, v)| v).sum();
    
    let last_month = Utc::now() - chrono::Duration::days(30);
    let last_month_start = Utc.from_utc_datetime(&last_month.date_naive().with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap());
    let last_month_end = last_month_start + chrono::Duration::days(31);
    
    let last_month_actual: Option<f64> = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(value), 0) 
        FROM plugin_crm.opportunities 
        WHERE close_date >= $1 AND close_date < $2 AND stage = 'closed_won'
        "#,
    )
    .bind(last_month_start)
    .bind(last_month_end)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(Some(0.0));

    let forecast = SalesForecast {
        months: months as i32,
        total_forecast,
        last_month_actual: last_month_actual.unwrap_or(0.0),
        monthly_forecast: forecast_data.into_iter()
            .map(|(date, value)| serde_json::json!({
                "month": date.format("%Y-%m").to_string(),
                "forecast_value": value
            }))
            .collect(),
    };

    Json(ApiResponse::success(forecast, "获取销售预测成功"))
}