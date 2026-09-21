use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{Datelike, TimeZone, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    ContactStats, CustomerStats, CustomerWithDetails, DashboardStats, FunnelStage, IndustryCount,
    InteractionStats, OpportunityStats, SalesForecast, StageCount, TypeCount,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct ForecastParams {
    pub months: Option<i64>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/dashboard/stats", get(get_dashboard_stats))
        .route("/dashboard/funnel", get(get_sales_funnel))
        .route("/dashboard/forecast", get(get_sales_forecast))
        .route("/customers/{id}/details", get(get_customer_details))
}

async fn get_dashboard_stats(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<DashboardStats>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let customers_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.customers WHERE ($1::uuid IS NULL OR tenant_id = $1)")
            .bind(tenant_opt)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

    let customers_active: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.customers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'active'",
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let by_industry: Vec<IndustryCount> = sqlx::query_as(
        "SELECT industry, COUNT(*) as count FROM crm.customers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND industry IS NOT NULL GROUP BY industry ORDER BY count DESC"
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();

    let contacts_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.contacts WHERE ($1::uuid IS NULL OR tenant_id = $1)")
            .bind(tenant_opt)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

    let contacts_active: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.contacts WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'active'",
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let opportunities_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1)")
            .bind(tenant_opt)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

    let by_stage: Vec<StageCount> = sqlx::query_as(
        "SELECT stage, COUNT(*) as count FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) GROUP BY stage ORDER BY count DESC",
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();

    let total_value: Option<i64> = sqlx::query_scalar(
        "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE ($1::uuid IS NULL OR tenant_id = $1) AND value IS NOT NULL",
    )
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0));

    let interactions_total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM crm.interactions WHERE ($1::uuid IS NULL OR tenant_id = $1)")
            .bind(tenant_opt)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

    let interactions_scheduled: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.interactions WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'scheduled'",
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let interactions_completed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM crm.interactions WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = 'completed'",
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let by_type: Vec<TypeCount> = sqlx::query_as(
        "SELECT type, COUNT(*) as count FROM crm.interactions WHERE ($1::uuid IS NULL OR tenant_id = $1) GROUP BY type ORDER BY count DESC",
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<CustomerWithDetails>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let customer = sqlx::query_as::<_, crate::models::Customer>(
        r#"
        SELECT id, tenant_id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM crm.customers WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    match customer {
        Ok(Some(customer)) => {
            let contacts = sqlx::query_as::<_, crate::models::Contact>(
                "SELECT id, tenant_id, customer_id, first_name, last_name, email, phone, position, status, notes, created_at, updated_at
                 FROM crm.contacts WHERE customer_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"
            )
            .bind(id)
            .bind(tenant_opt)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            let opportunities = sqlx::query_as::<_, crate::models::Opportunity>(
                "SELECT id, tenant_id, customer_id, name, value, stage, probability, close_date, notes, created_at, updated_at
                 FROM crm.opportunities WHERE customer_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"
            )
            .bind(id)
            .bind(tenant_opt)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            let recent_interactions = sqlx::query_as::<_, crate::models::Interaction>(
                "SELECT id, tenant_id, customer_id, contact_id, type, subject, content, scheduled_at, completed_at, status, notes, created_at, updated_at
                 FROM crm.interactions WHERE customer_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC LIMIT 10"
            )
            .bind(id)
            .bind(tenant_opt)
            .fetch_all(&mut **txn)
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
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户详情失败: {}", e);
            Json(api_error(500, "获取客户详情失败"))
        }
    }
}

async fn get_sales_funnel(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<FunnelStage>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

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
            "SELECT COUNT(*) FROM crm.opportunities WHERE stage = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
        )
        .bind(stage)
        .bind(tenant_opt)
        .fetch_one(&mut **txn)
        .await
        .unwrap_or(0);

        let total_value: Option<f64> = sqlx::query_scalar(
            "SELECT COALESCE(SUM(value), 0) FROM crm.opportunities WHERE stage = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND value IS NOT NULL"
        )
        .bind(stage)
        .bind(tenant_opt)
        .fetch_optional(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ForecastParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<SalesForecast>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OpportunityRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    let months = params.months.unwrap_or(12).min(24).max(1);

    let mut forecast_data = Vec::new();

    for i in 0..months as usize {
        let forecast_month = Utc::now() + chrono::Duration::days(i as i64 * 30);
        let month_start = if let Some(day1) = forecast_month.date_naive().with_day(1) {
            if let Some(dt) = day1.and_hms_opt(0, 0, 0) {
                Utc.from_utc_datetime(&dt)
            } else {
                forecast_month
            }
        } else {
            forecast_month
        };
        let month_end = month_start + chrono::Duration::days(31);

        let weighted_value: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(value * probability / 100), 0) 
            FROM crm.opportunities 
            WHERE ($3::uuid IS NULL OR tenant_id = $3) AND close_date >= $1 AND close_date < $2 AND stage NOT IN ('closed_won', 'closed_lost')
            "#,
        )
        .bind(month_start)
        .bind(month_end)
        .bind(tenant_opt)
        .fetch_optional(&mut **txn)
        .await
        .unwrap_or(Some(0.0));

        forecast_data.push((month_start, weighted_value.unwrap_or(0.0)));
    }

    let total_forecast: f64 = forecast_data.iter().map(|(_, v)| v).sum();

    let last_month = Utc::now() - chrono::Duration::days(30);
    let last_month_start = if let Some(day1) = last_month.date_naive().with_day(1) {
        if let Some(dt) = day1.and_hms_opt(0, 0, 0) {
            Utc.from_utc_datetime(&dt)
        } else {
            last_month
        }
    } else {
        last_month
    };
    let last_month_end = last_month_start + chrono::Duration::days(31);

    let last_month_actual: Option<f64> = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(value), 0) 
        FROM crm.opportunities 
        WHERE ($3::uuid IS NULL OR tenant_id = $3) AND close_date >= $1 AND close_date < $2 AND stage = 'closed_won'
        "#,
    )
    .bind(last_month_start)
    .bind(last_month_end)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(Some(0.0));

    let forecast = SalesForecast {
        months: months as i32,
        total_forecast,
        last_month_actual: last_month_actual.unwrap_or(0.0),
        monthly_forecast: forecast_data
            .into_iter()
            .map(|(date, value)| {
                serde_json::json!({
                    "month": date.format("%Y-%m").to_string(),
                    "forecast_value": value
                })
            })
            .collect(),
    };

    Json(ApiResponse::success(forecast, "获取销售预测成功"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_forecast_params_deserialize() {
        let query = "months=6";
        let params: ForecastParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.months, Some(6));
    }

    #[test]
    fn test_forecast_params_default() {
        let query = "";
        let params: ForecastParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.months.is_none());
    }
}
