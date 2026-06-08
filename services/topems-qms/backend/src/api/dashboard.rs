use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};

use crate::models::{
    DashboardStats, StandardStats, InspectionStats, IssueStats, ActionStats,
    QualityInspection, QualityStandard, QualityIssue, CorrectiveAction,
    IssueWithActions, InspectionWithStandard,
};
use crate::models::dashboard::{CategoryCount, TypeCount, SeverityCount, PriorityCount};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/dashboard/stats", get(get_dashboard_stats))
        .route("/api/v1/dashboard/issues-with-actions", get(get_issues_with_actions))
        .route("/api/v1/dashboard/inspections-with-standards", get(get_inspections_with_standards))
}

/// 获取仪表盘统计数据
async fn get_dashboard_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardStats>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    // 获取质量标准统计
    let standards_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_standards")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let standards_active: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_standards WHERE status = 'active'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let standards_archived: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_standards WHERE status = 'archived'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let standards_by_category: Vec<CategoryCount> = sqlx::query_as(
        "SELECT category as category, COUNT(*) as count FROM qms.quality_standards WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    // 获取质量检查统计
    let inspections_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_pending: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections WHERE status = 'pending'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_in_progress: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections WHERE status = 'in_progress'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_completed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections WHERE status = 'completed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_passed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections WHERE result = 'passed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_failed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_inspections WHERE result = 'failed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let inspections_by_type: Vec<TypeCount> = sqlx::query_as(
        "SELECT inspection_type as inspection_type, COUNT(*) as count FROM qms.quality_inspections GROUP BY inspection_type ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    // 获取质量问题统计
    let issues_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_issues")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let issues_open: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_issues WHERE status = 'open'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let issues_in_progress: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_issues WHERE status = 'in_progress'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let issues_resolved: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_issues WHERE status = 'resolved'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let issues_closed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.quality_issues WHERE status = 'closed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let issues_overdue: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qms.quality_issues WHERE due_date IS NOT NULL AND due_date < NOW() AND status NOT IN ('resolved', 'closed')"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    let issues_by_severity: Vec<SeverityCount> = sqlx::query_as(
        "SELECT severity as severity, COUNT(*) as count FROM qms.quality_issues GROUP BY severity ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    let issues_by_priority: Vec<PriorityCount> = sqlx::query_as(
        "SELECT priority as priority, COUNT(*) as count FROM qms.quality_issues WHERE priority IS NOT NULL GROUP BY priority ORDER BY count DESC"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    // 获取纠正措施统计
    let actions_total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let actions_pending: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions WHERE status = 'pending'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let actions_in_progress: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions WHERE status = 'in_progress'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let actions_implemented: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions WHERE status = 'implemented'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let actions_verified: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions WHERE status = 'verified'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let actions_closed: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qms.corrective_actions WHERE status = 'closed'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);
    
    let stats = DashboardStats {
        standards: StandardStats {
            total: standards_total,
            active: standards_active,
            archived: standards_archived,
            by_category: standards_by_category,
        },
        inspections: InspectionStats {
            total: inspections_total,
            pending: inspections_pending,
            in_progress: inspections_in_progress,
            completed: inspections_completed,
            passed: inspections_passed,
            failed: inspections_failed,
            by_type: inspections_by_type,
        },
        issues: IssueStats {
            total: issues_total,
            open: issues_open,
            in_progress: issues_in_progress,
            resolved: issues_resolved,
            closed: issues_closed,
            by_severity: issues_by_severity,
            by_priority: issues_by_priority,
            overdue: issues_overdue,
        },
        actions: ActionStats {
            total: actions_total,
            pending: actions_pending,
            in_progress: actions_in_progress,
            implemented: actions_implemented,
            verified: actions_verified,
            closed: actions_closed,
        },
    };
    
    Json(ApiResponse::success(stats, "获取仪表盘统计数据成功"))
}

/// 获取问题列表（包含关联的纠正措施）
async fn get_issues_with_actions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<IssueWithActions>>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    // 获取所有开放和处理中的问题
    let issues: Vec<QualityIssue> = sqlx::query_as(
        "SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at FROM qms.quality_issues WHERE status IN ('open', 'in_progress') ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    let mut result: Vec<IssueWithActions> = Vec::new();
    
    for issue in issues {
        let actions: Vec<CorrectiveAction> = sqlx::query_as(
            "SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at FROM qms.corrective_actions WHERE issue_id = $1 ORDER BY created_at DESC"
        )
        .bind(issue.id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();
        
        result.push(IssueWithActions { issue, actions });
    }
    
    Json(ApiResponse::success(result, "获取问题及关联措施成功"))
}

/// 获取检查列表（包含关联的质量标准）
async fn get_inspections_with_standards(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<InspectionWithStandard>>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    // 获取最近的检查记录
    let inspections: Vec<QualityInspection> = sqlx::query_as(
        "SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at FROM qms.quality_inspections ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    
    let mut result: Vec<InspectionWithStandard> = Vec::new();
    
    for inspection in inspections {
        let standard: Option<QualityStandard> = if let Some(standard_id) = inspection.standard_id {
            sqlx::query_as(
                "SELECT id, code, name, description, category, version, status, created_at, updated_at FROM qms.quality_standards WHERE id = $1"
            )
            .bind(standard_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None)
        } else {
            None
        };
        
        result.push(InspectionWithStandard { inspection, standard });
    }
    
    Json(ApiResponse::success(result, "获取检查及关联标准成功"))
}