#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, State},
    Json,
};
use chrono::{Datelike, TimeZone, Timelike, Utc};
use uuid::Uuid;

use super::super::ApiState;
use crate::models::finance::AccountingPeriod;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, api_success, ApiResponse};

/// 从 Claims 中解析 tenant_id。
fn resolve_tenant_id<T>(claims: &Claims) -> Result<Uuid, Json<ApiResponse<T>>> {
    match &claims.tenant_id {
        Some(id) => match Uuid::parse_str(id) {
            Ok(uuid) => Ok(uuid),
            Err(_) => Err(Json(api_error::<T>(401, "无效的租户ID"))),
        },
        None => Err(Json(api_error::<T>(401, "缺少租户ID"))),
    }
}

pub async fn get_current_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<AccountingPeriod>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id::<AccountingPeriod>(&claims) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    let now = Utc::now();
    let current_period = format!("{:04}{:02}", now.year(), now.month());

    // 查询当前期间
    let existing = sqlx::query_as::<_, AccountingPeriod>(
        r#"
        SELECT id, period, year, month, start_date, end_date, status, fiscal_year, tenant_id, created_at, updated_at, closed_at
        FROM erp.accounting_periods
        WHERE period = $1 AND tenant_id = $2
        "#,
    )
    .bind(&current_period)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match existing {
        Ok(Some(period)) => Json(api_success(period)),
        Ok(None) => {
            // 当前期间不存在，自动创建
            let start = now
                .with_day(1)
                .and_then(|d| d.with_hour(0))
                .and_then(|d| d.with_minute(0))
                .and_then(|d| d.with_second(0))
                .and_then(|d| d.with_nanosecond(0))
                .unwrap_or(now);
            // 月末：下个月 1 号 - 1 秒
            let next_month = if now.month() == 12 {
                Utc::with_ymd_and_hms(&Utc, now.year() + 1, 1, 1, 0, 0, 0)
                    .expect("valid date should always be constructible")
            } else {
                Utc::with_ymd_and_hms(&Utc, now.year(), now.month() + 1, 1, 0, 0, 0)
                    .expect("valid date should always be constructible")
            };
            let end = next_month - chrono::Duration::seconds(1);

            let new_id = Uuid::new_v4();
            let fiscal_year = now.year().to_string();

            let inserted = sqlx::query_as::<_, AccountingPeriod>(
                r#"
                INSERT INTO erp.accounting_periods
                    (id, period, year, month, start_date, end_date, status, fiscal_year, tenant_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, NOW(), NOW())
                RETURNING id, period, year, month, start_date, end_date, status, fiscal_year, tenant_id, created_at, updated_at, closed_at
                "#,
            )
            .bind(new_id)
            .bind(&current_period)
            .bind(now.year())
            .bind(now.month() as i32)
            .bind(start)
            .bind(end)
            .bind(&fiscal_year)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;

            match inserted {
                Ok(period) => Json(api_success(period)),
                Err(e) => Json(api_error::<AccountingPeriod>(
                    500,
                    &format!("创建当前会计期间失败: {}", e),
                )),
            }
        }
        Err(e) => Json(api_error::<AccountingPeriod>(
            500,
            &format!("查询当前会计期间失败: {}", e),
        )),
    }
}

pub async fn list_periods(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AccountingPeriod>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id::<Vec<AccountingPeriod>>(&claims) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    let year = Utc::now().year();

    match sqlx::query_as::<_, AccountingPeriod>(
        r#"
        SELECT id, period, year, month, start_date, end_date, status, fiscal_year, tenant_id, created_at, updated_at, closed_at
        FROM erp.accounting_periods
        WHERE year = $1 AND tenant_id = $2
        ORDER BY period ASC
        "#,
    )
    .bind(year)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await
    {
        Ok(periods) => Json(api_success(periods)),
        Err(e) => Json(api_error::<Vec<AccountingPeriod>>(
            500,
            &format!("查询会计期间列表失败: {}", e),
        )),
    }
}

pub async fn open_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id::<serde_json::Value>(&claims) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    match sqlx::query(
        r#"
        UPDATE erp.accounting_periods
        SET status = 'open', updated_at = NOW(), closed_at = NULL
        WHERE period = $1 AND tenant_id = $2
        "#,
    )
    .bind(&period)
    .bind(tenant_id)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return Json(api_error::<serde_json::Value>(
                    404,
                    &format!("会计期间 {} 不存在", period),
                ));
            }
            Json(api_success(
                serde_json::json!({"period": period, "status": "open"}),
            ))
        }
        Err(e) => Json(api_error::<serde_json::Value>(
            500,
            &format!("打开会计期间失败: {}", e),
        )),
    }
}

pub async fn close_period(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id::<serde_json::Value>(&claims) {
        Ok(id) => id,
        Err(resp) => return resp,
    };

    match sqlx::query(
        r#"
        UPDATE erp.accounting_periods
        SET status = 'closed', updated_at = NOW(), closed_at = NOW()
        WHERE period = $1 AND tenant_id = $2
        "#,
    )
    .bind(&period)
    .bind(tenant_id)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return Json(api_error::<serde_json::Value>(
                    404,
                    &format!("会计期间 {} 不存在", period),
                ));
            }
            Json(api_success(
                serde_json::json!({"period": period, "status": "closed"}),
            ))
        }
        Err(e) => Json(api_error::<serde_json::Value>(
            500,
            &format!("关闭会计期间失败: {}", e),
        )),
    }
}
