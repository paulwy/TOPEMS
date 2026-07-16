use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::{Datelike, Utc};
use sqlx::Row;

use super::models::{AgingAnalysisItem, PayableSummary, ReceivableSummary, ReportParams};
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub async fn receivables_report(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<ReceivableSummary>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let start_date = params.start_date.clone().unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-01-01", now.year())
    });
    let end_date = params
        .end_date
        .clone()
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let result = sqlx::query(
        "SELECT SUM(amount) as total, status FROM plugin_erp.receivables WHERE due_date BETWEEN $1 AND $2 GROUP BY status",
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(ReceivableSummary {
                    status: row.try_get("status").unwrap_or_default(),
                    total: row.try_get("total").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取应收账款报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取应收账款报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取应收账款报表成功"))
}

pub async fn payables_report(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<PayableSummary>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let start_date = params.start_date.clone().unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-01-01", now.year())
    });
    let end_date = params
        .end_date
        .clone()
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let result = sqlx::query(
        "SELECT SUM(amount) as total, status FROM plugin_erp.payables WHERE due_date BETWEEN $1 AND $2 GROUP BY status",
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(&state.db)
    .await;

    let summary = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(PayableSummary {
                    status: row.try_get("status").unwrap_or_default(),
                    total: row.try_get("total").unwrap_or(0.0),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取应付账款报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取应付账款报表失败"));
        }
    };

    Json(ApiResponse::success(summary, "获取应付账款报表成功"))
}

pub async fn aging_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReportParams>,
) -> Json<ApiResponse<Vec<AgingAnalysisItem>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::ReportRead).await {
        return e;
    }

    let _period = params.period.unwrap_or_else(|| {
        let now = Utc::now();
        format!("{}-{:02}", now.year(), now.month())
    });

    let result = sqlx::query(
        r#"
        SELECT 
            'current' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '30天以内' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date >= NOW() - INTERVAL '30 days'
          AND p.due_date >= NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT 
            '30_60' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '30-60天' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '30 days' AND r.due_date >= NOW() - INTERVAL '60 days'
          AND p.due_date < NOW() - INTERVAL '30 days' AND p.due_date >= NOW() - INTERVAL '60 days'
        UNION ALL
        SELECT 
            '60_90' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '60-90天' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '60 days' AND r.due_date >= NOW() - INTERVAL '90 days'
          AND p.due_date < NOW() - INTERVAL '60 days' AND p.due_date >= NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT 
            'over_90' as period,
            COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.amount ELSE 0 END), 0.0) as receivables,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0.0) as payables,
            '90天以上' as description
        FROM plugin_erp.receivables r
        CROSS JOIN plugin_erp.payables p
        WHERE r.due_date < NOW() - INTERVAL '90 days'
          AND p.due_date < NOW() - INTERVAL '90 days'
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let analysis = match result {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(AgingAnalysisItem {
                    period: row.try_get("period").unwrap_or_default(),
                    receivables: row.try_get("receivables").unwrap_or(0.0),
                    payables: row.try_get("payables").unwrap_or(0.0),
                    description: row.try_get("description").unwrap_or_default(),
                });
            }
            items
        }
        Err(e) => {
            tracing::error!("获取账龄分析报表失败: {}", e);
            return Json(ApiResponse::error(500, "获取账龄分析报表失败"));
        }
    };

    Json(ApiResponse::success(analysis, "获取账龄分析报表成功"))
}
