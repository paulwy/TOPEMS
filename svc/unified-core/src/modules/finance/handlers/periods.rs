use axum::{extract::State, Json};
use chrono::Datelike;
use chrono::NaiveDate;
use sqlx::Row;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::utils::default_tenant_id;

pub async fn get_current_period(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = chrono::Local::now();
    let period = format!("{}{:02}", now.year(), now.month());

    Json(api_success(serde_json::json!({
        "period": period,
        "year": now.year(),
        "month": now.month()
    })))
}

pub async fn list_periods(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = default_tenant_id();

    let rows = match sqlx::query(
        r#"SELECT period, year, month, start_date, end_date, status
           FROM core_finance_periods WHERE tenant_id = $1 ORDER BY period DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询期间失败: {}", e);
            return Json(api_error(500, "查询期间失败"));
        }
    };

    let periods: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "period": row.get::<String, _>("period"),
                "year": row.get::<i32, _>("year"),
                "month": row.get::<i32, _>("month"),
                "start_date": row.get::<NaiveDate, _>("start_date"),
                "end_date": row.get::<NaiveDate, _>("end_date"),
                "status": row.get::<String, _>("status"),
            })
        })
        .collect();

    Json(api_success(periods))
}

pub async fn open_period(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();
    let period = body.get("period").and_then(|v| v.as_str()).unwrap_or("");

    if period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    let result = sqlx::query(
        r#"UPDATE core_finance_periods SET status = 'open', updated_at = NOW()
           WHERE tenant_id = $1 AND period = $2"#,
    )
    .bind(tenant_id)
    .bind(period)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "期间不存在")),
        Err(e) => {
            tracing::error!("打开期间失败: {}", e);
            Json(api_error(500, "打开期间失败"))
        }
    }
}

pub async fn close_period(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();
    let period = body.get("period").and_then(|v| v.as_str()).unwrap_or("");

    if period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    let result = sqlx::query(
        r#"UPDATE core_finance_periods SET status = 'closed', updated_at = NOW()
           WHERE tenant_id = $1 AND period = $2"#,
    )
    .bind(tenant_id)
    .bind(period)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "期间不存在")),
        Err(e) => {
            tracing::error!("关闭期间失败: {}", e);
            Json(api_error(500, "关闭期间失败"))
        }
    }
}
