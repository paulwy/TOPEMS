#![allow(dead_code)]

use serde::{Deserialize, Serialize};

use axum::extract::{Extension, Json, Query, State};

use chrono::{Datelike, Utc};

use super::super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize, Deserialize)]
struct PeriodResponse {
    period: String,
    year: i32,
    month: i32,
    start_date: Option<String>,
    end_date: Option<String>,
    status: String,
}

#[derive(Debug, Deserialize)]
struct PeriodRequest {
    period: String,
}

pub async fn get_current_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PeriodResponse>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let now = Utc::now();
    let year = now.year();
    let month = now.month() as i32;
    let period = format!("{}{:02}", year, month);

    Json(ApiResponse::success(
        PeriodResponse {
            period: period.clone(),
            year,
            month,
            start_date: Some(format!("{}-{:02}-01", year, month)),
            end_date: Some(format!(
                "{}-{:02}-{}",
                year,
                month,
                get_days_in_month(year, month)
            )),
            status: "open".to_string(),
        },
        "获取当前会计期间成功",
    ))
}

fn get_days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

pub async fn list_periods(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodListParams>,
) -> Json<ApiResponse<Vec<PeriodResponse>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let year = params.year.unwrap_or(Utc::now().year());
    let mut periods = Vec::new();

    for month in 1..=12 {
        periods.push(PeriodResponse {
            period: format!("{}{:02}", year, month),
            year,
            month,
            start_date: Some(format!("{}-{:02}-01", year, month)),
            end_date: Some(format!(
                "{}-{:02}-{}",
                year,
                month,
                get_days_in_month(year, month)
            )),
            status: if month <= Utc::now().month() as i32 {
                "open".to_string()
            } else {
                "closed".to_string()
            },
        });
    }

    Json(ApiResponse::success(periods, "获取会计期间列表成功"))
}

#[derive(Debug, Deserialize)]
struct PeriodListParams {
    year: Option<i32>,
    status: Option<String>,
}

pub async fn open_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success(
        (),
        &format!("会计期间 {} 已打开", req.period),
    ))
}

pub async fn close_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success(
        (),
        &format!("会计期间 {} 已关闭", req.period),
    ))
}
