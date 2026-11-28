use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::modules::consolidation_report_approval_status::ConsolidationReportApprovalStatus;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

use super::common::{
    call_finance_core_approval, log_audit, require_action_permission, ConsolidationListParams,
};
use super::ApiState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/reports",
    tag = "Consolidation",
    responses((status = 200, description = "获取合并报表列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_reports(
    State(_state): State<ApiState>,
    Query(params): Query<ConsolidationListParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PaginatedResponse<ConsolidationReport>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        SELECT cr.*, cs.name as scope_name
        FROM erp.consolidation_reports cr
        LEFT JOIN erp.consolidation_scopes cs ON cs.id = cr.scope_id
        WHERE ($1::uuid IS NULL OR cr.scope_id = $1)
          AND ($2::text IS NULL OR cr.report_type = $2)
          AND ($3::text IS NULL OR cr.period >= $3)
          AND ($4::text IS NULL OR cr.period <= $4)
        ORDER BY cr.created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(params.scope_id)
    .bind(&params.report_type)
    .bind(&params.period_from)
    .bind(&params.period_to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(reports) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.consolidation_reports
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR scope_id = $1)
                  AND ($2::text IS NULL OR report_type = $2)
                  AND ($3::text IS NULL OR period >= $3)
                  AND ($4::text IS NULL OR period <= $4)
                "#,
            )
            .bind(params.scope_id)
            .bind(&params.report_type)
            .bind(&params.period_from)
            .bind(&params.period_to)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(reports, total, page, page_size),
                "获取合并报表列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取合并报表列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取合并报表列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/reports/{reportId}",
    tag = "Consolidation",
    params(("reportId" = String, Path, description = "报表ID")),
    responses((status = 200, description = "获取合并报表详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_report(
    State(_state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ConsolidationReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query_as::<_, ConsolidationReport>(
        r#"
        SELECT cr.*, cs.name as scope_name
        FROM erp.consolidation_reports cr
        LEFT JOIN erp.consolidation_scopes cs ON cs.id = cr.scope_id
        WHERE cr.id = $1
        "#,
    )
    .bind(report_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(report)) => ApiResponse::success(report, "获取合并报表成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("合并报表不存在".to_string())),
        Err(e) => {
            tracing::error!("获取合并报表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取合并报表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-report:write"])),
    path = "/erp/consolidation/reports/generate-report",
    tag = "ConsolidationReports",
    operation_id = "generate_report",
    responses(
        (status = 200, description = "操作成功"),
        (status = 501, description = "功能未接入"),
    ),
)]
pub async fn generate_report(
    Extension(claims): Extension<Claims>,
    Json(_req): Json<GenerateConsolidationReportRequest>,
) -> ApiResponse<ConsolidationReport> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-report:write") {
        return e.0;
    }

    // P0 止血：此前此处用 `1000000.0 + rand()` 造数并写入正式表、置为 completed。
    // 在法人主体账簿归集与内部交易识别能力落地前，禁止写入任何金额。
    ApiResponse::not_implemented(
        "合并报表生成未接入：尚无法人主体账簿归集与内部交易匹配能力，功能暂不开放",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/reports/{reportId}/lines",
    tag = "Consolidation",
    params(("reportId" = String, Path, description = "报表ID")),
    responses((status = 200, description = "获取合并报表行项目成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_report_lines(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ConsolidationReportLine>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启请求事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("获取合并报表行项目失败".to_string()));
        }
    };
    let report_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM erp.consolidation_reports WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(report_id)
    .fetch_one(&mut scope)
    .await;

    match report_exists {
        Ok(0) => return ApiResponse::<Vec<ConsolidationReportLine>>::error(404, "合并报表不存在"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("校验合并报表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("获取合并报表行项目失败".to_string()));
        }
    }

    match sqlx::query_as::<_, ConsolidationReportLine>(
        "SELECT * FROM erp.consolidation_report_lines WHERE report_id = $1 ORDER BY line_no ASC",
    )
    .bind(report_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(lines) => ApiResponse::success(lines, "获取合并报表行项目成功"),
        Err(e) => {
            tracing::error!("获取合并报表行项目失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取合并报表行项目失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/reports/export-report",
    tag = "ConsolidationReports",
    operation_id = "export_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn export_report(Path(_report_id): Path<Uuid>) -> ApiResponse<serde_json::Value> {
    // P0 止血：历史假数据仍可能残留于 erp.consolidation_reports，
    // 导出会把这些金额带走。真实合并链路落地前统一不提供导出。
    ApiResponse::not_implemented("合并报表导出未接入：合并数据生成能力尚未开放")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/consolidation/reports/{reportId}/submit",
    tag = "ConsolidationReports",
    operation_id = "submit_report",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn submit_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ConsolidationReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let username = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("system");

    let _ = username;

    let report_result = sqlx::query_as::<_, ConsolidationReport>(
        "SELECT * FROM erp.consolidation_reports WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(report_id)
    .fetch_optional(&mut **txn)
    .await;

    let report = match report_result {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("合并报表不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询失败: {}", e)),
    };

    let approval_status =
        match ConsolidationReportApprovalStatus::from_db_str(&report.approval_status) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request(&format!(
                    "合并报表审批状态非法: {}",
                    report.approval_status
                ))
            }
        };
    if !approval_status.can_submit_from() {
        return ApiResponse::bad_request("当前审批状态不允许提交");
    }

    if let Err(e) = call_finance_core_approval(
        &state.finance_client,
        &state.system_pool,
        "consolidation_report",
        report_id,
        &report.report_no,
        "submit",
        username,
        None,
        None,
    )
    .await
    {
        tracing::warn!("调用 Finance Core 审批失败: {}", e);
    }

    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE erp.consolidation_reports
        SET approval_status = $2
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(report_id)
    .bind(ConsolidationReportApprovalStatus::Pending.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(report) => {
            log_audit(
                &state.system_pool,
                "submit",
                "consolidation_report",
                Some(report_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(report, "提交审批成功")
        }
        Err(e) => {
            tracing::error!("提交审批失败: {}", e);
            ApiResponse::from(TopemsError::Internal("提交审批失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/consolidation/reports/{reportId}/approve",
    tag = "Consolidation",
    params(("reportId" = String, Path, description = "报表ID")),
    responses((status = 200, description = "审批合并报表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn approve_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ConsolidationReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let username = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("system");

    let _ = username;

    let report_result = sqlx::query_as::<_, ConsolidationReport>(
        "SELECT * FROM erp.consolidation_reports WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(report_id)
    .fetch_optional(&mut **txn)
    .await;

    let report = match report_result {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("合并报表不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询失败: {}", e)),
    };

    let approval_status =
        match ConsolidationReportApprovalStatus::from_db_str(&report.approval_status) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request(&format!(
                    "合并报表审批状态非法: {}",
                    report.approval_status
                ))
            }
        };
    if !approval_status.can_approve_from() {
        return ApiResponse::bad_request("仅待审批状态的合并报表可审批");
    }

    if let Err(e) = call_finance_core_approval(
        &state.finance_client,
        &state.system_pool,
        "consolidation_report",
        report_id,
        &report.report_no,
        "approve",
        username,
        None,
        None,
    )
    .await
    {
        tracing::warn!("调用 Finance Core 审批失败: {}", e);
    }

    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE erp.consolidation_reports
        SET approval_status = $2, approved_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(report_id)
    .bind(ConsolidationReportApprovalStatus::Approved.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(report) => {
            log_audit(
                &state.system_pool,
                "approve",
                "consolidation_report",
                Some(report_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(report, "审批合并报表成功")
        }
        Err(e) => {
            tracing::error!("审批合并报表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("审批合并报表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-report:approve"])),
    path = "/erp/consolidation/reports/{reportId}/publish",
    tag = "Consolidation",
    params(("reportId" = String, Path, description = "报表ID")),
    responses(
        (status = 200, description = "发布合并报表成功", body = ApiResponse<serde_json::Value>),
        (status = 501, description = "功能未接入"),
    )
)]
pub async fn publish_report(
    Extension(claims): Extension<Claims>,
    Path(_report_id): Path<Uuid>,
) -> ApiResponse<ConsolidationReport> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-report:approve") {
        return e.0;
    }

    // P0 止血：生成链路已停用，历史报表中的金额不可信，禁止把假数据发布出去。
    ApiResponse::not_implemented("合并报表发布未接入：合并数据生成能力尚未开放")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/consolidation/reports/{reportId}",
    tag = "Consolidation",
    params(("reportId" = String, Path, description = "报表ID")),
    responses((status = 200, description = "删除合并报表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn delete_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query(
        "UPDATE erp.consolidation_reports SET deleted_at = NOW() WHERE id = $1 AND (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)",
    )
        .bind(report_id)
        .execute(&mut **txn)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "合并报表不存在".to_string(),
                ))
            } else {
                log_audit(
                    &state.system_pool,
                    "delete",
                    "consolidation_report",
                    Some(report_id),
                    &headers,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return ApiResponse::server_error("事务提交失败");
                    }
                }
                ApiResponse::success((), "删除合并报表成功")
            }
        }
        Err(e) => {
            tracing::error!("删除合并报表失败: {}", e);
            ApiResponse::from(TopemsError::Internal(
                "删除合并报表失败".to_string(),
            ))
        }
    }
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod p0_tests {
    use super::*;

    fn claims(permissions: Vec<String>, is_superuser: bool) -> Claims {
        Claims {
            sub: "11111111-1111-1111-1111-111111111111".to_string(),
            username: "tester".to_string(),
            role: "employee".to_string(),
            roles: vec!["employee".to_string()],
            permissions,
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    fn generate_req() -> GenerateConsolidationReportRequest {
        GenerateConsolidationReportRequest {
            scope_id: Uuid::nil(),
            report_type: "balance_sheet".to_string(),
            period: "2026-10".to_string(),
            include_prior_period: None,
            auto_eliminate: None,
        }
    }

    #[tokio::test]
    async fn generate_denies_module_level_user() {
        let resp = generate_report(
            Extension(claims(vec!["erp:write".to_string()], false)),
            Json(generate_req()),
        )
        .await;
        assert_eq!(resp.code, 403);
        assert!(resp.data.is_none());
    }

    #[tokio::test]
    async fn generate_returns_not_implemented_without_persisting() {
        let resp = generate_report(
            Extension(claims(
                vec!["erp:consolidation-report:write".to_string()],
                false,
            )),
            Json(generate_req()),
        )
        .await;
        assert_eq!(resp.code, 501);
        assert!(resp.data.is_none());
        assert!(resp.message.contains("未接入"));
    }

    #[tokio::test]
    async fn publish_denies_module_level_user() {
        let resp = publish_report(
            Extension(claims(vec!["erp:write".to_string()], false)),
            Path(Uuid::nil()),
        )
        .await;
        assert_eq!(resp.code, 403);
        assert!(resp.data.is_none());
    }

    #[tokio::test]
    async fn publish_returns_not_implemented_for_authorized_user() {
        let resp = publish_report(
            Extension(claims(
                vec!["erp:consolidation-report:approve".to_string()],
                false,
            )),
            Path(Uuid::nil()),
        )
        .await;
        assert_eq!(resp.code, 501);
        assert!(resp.data.is_none());
        assert!(resp.message.contains("未接入"));
    }
}
