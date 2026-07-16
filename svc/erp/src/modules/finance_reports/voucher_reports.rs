use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::{Datelike, Utc};
use sqlx::Row;

use super::models::{ReportParams, VoucherDetail, VoucherSummary, VoucherTrend};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn voucher_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let page = params
        .project_id
        .as_ref()
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(1)
        .max(1);
    let page_size = params
        .department_id
        .as_ref()
        .and_then(|d| d.parse::<i64>().ok())
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT v.voucher_number, v.voucher_date, v.summary, v.status, 
               v.total_debit, v.total_credit, v.maker_name, v.created_at
        FROM plugin_erp.financial_vouchers v
        WHERE v.period = $1
        ORDER BY v.voucher_date DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&period)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let vouchers = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(VoucherSummary {
                    voucher_number: row.try_get("voucher_number").unwrap_or_default(),
                    voucher_date: row.try_get("voucher_date").unwrap_or_else(|_| Utc::now()),
                    summary: row.try_get("summary").ok(),
                    status: row.try_get("status").unwrap_or_default(),
                    total_debit: row.try_get("total_debit").unwrap_or(0.0),
                    total_credit: row.try_get("total_credit").unwrap_or(0.0),
                    maker_name: row.try_get("maker_name").ok(),
                    created_at: row.try_get("created_at").unwrap_or_else(|_| Utc::now()),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证汇总数据失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证汇总数据失败"));
        }
    };

    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_erp.financial_vouchers WHERE period = $1",
    )
    .bind(&period)
    .fetch_one(&state.db)
    .await;

    let total = count_result.unwrap_or(0);

    Json(ApiResponse::success(
        serde_json::json!({
            "vouchers": vouchers,
            "total": total,
            "page": page,
            "page_size": page_size
        }),
        "获取凭证汇总成功",
    ))
}

pub async fn voucher_details(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherDetail>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT v.voucher_number, v.voucher_date, v.summary, 
               vi.subject_code, vi.subject_name, vi.debit_amount, vi.credit_amount, v.maker_name
        FROM plugin_erp.financial_vouchers v
        JOIN plugin_erp.voucher_items vi ON v.id = vi.voucher_id
        WHERE v.period = $1
        ORDER BY v.voucher_date, v.voucher_number
        "#,
    )
    .bind(&period)
    .fetch_all(&state.db)
    .await;

    let details = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(VoucherDetail {
                    voucher_number: row.try_get("voucher_number").unwrap_or_default(),
                    voucher_date: row.try_get("voucher_date").unwrap_or_else(|_| Utc::now()),
                    summary: row.try_get("summary").ok(),
                    subject_code: row.try_get("subject_code").unwrap_or_default(),
                    subject_name: row.try_get("subject_name").ok(),
                    debit_amount: row.try_get("debit_amount").unwrap_or(0.0),
                    credit_amount: row.try_get("credit_amount").unwrap_or(0.0),
                    maker_name: row.try_get("maker_name").ok(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证明细失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证明细失败"));
        }
    };

    Json(ApiResponse::success(details, "获取凭证明细成功"))
}

pub async fn voucher_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<VoucherTrend>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let limit = params
        .project_id
        .as_ref()
        .and_then(|p| p.parse::<i64>().ok())
        .unwrap_or(12);

    let result = sqlx::query(
        r#"
        SELECT v.period, COUNT(*) as voucher_count, SUM(v.total_debit) as total_amount
        FROM plugin_erp.financial_vouchers v
        WHERE v.status = 'posted'
        GROUP BY v.period
        ORDER BY v.period DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await;

    let trend = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(VoucherTrend {
                    period: row.try_get("period").unwrap_or_default(),
                    voucher_count: row.try_get("voucher_count").unwrap_or(0),
                    total_amount: row.try_get("total_amount").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取凭证趋势报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取凭证趋势报表失败"));
        }
    };

    Json(ApiResponse::success(trend, "获取凭证趋势报表成功"))
}
