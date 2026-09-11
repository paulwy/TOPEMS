use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

const TASK_SELECT_COLS: &str = "id::TEXT, tenant_id::TEXT, task_no, sample_id::TEXT, sample_no, test_items, status, assigned_to, instrument_id::TEXT, planned_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, result, conclusion, recorded_by, created_at::TEXT, updated_at::TEXT";

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/tasks", get(list_tasks).post(create_task))
        .route(
            "/tasks/{id}",
            get(get_task).put(update_task).delete(delete_task),
        )
        .route("/tasks/{id}/result", post(submit_result))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct InspectionTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub sample_id: String,
    pub sample_no: String,
    pub test_items: serde_json::Value,
    pub status: String,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub result: Option<serde_json::Value>,
    pub conclusion: Option<String>,
    pub recorded_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTaskRequest {
    pub sample_id: String,
    pub test_items: Vec<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub planned_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub instrument_id: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitResultRequest {
    pub result: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:read"])),
    path = "/lims/tasks",
    tag = "inspection_task",
    responses(
        (status = 200, description = "List of inspection tasks", body = ApiResponse<Vec<InspectionTask>>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_tasks(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
) -> Json<ApiResponse<Vec<InspectionTask>>> {
    let rows = sqlx::query(&format!(
        "SELECT {} FROM qa_lab_tasks WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY created_at DESC",
        TASK_SELECT_COLS
    ))
    .bind(ctx.tenant_id)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => {
            let tasks = data
                .into_iter()
                .map(|row| InspectionTask {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    task_no: row.get("task_no"),
                    sample_id: row.get("sample_id"),
                    sample_no: row.get("sample_no"),
                    test_items: row.get("test_items"),
                    status: row.get("status"),
                    assigned_to: row.get("assigned_to"),
                    instrument_id: row.get("instrument_id"),
                    planned_date: row.get("planned_date"),
                    actual_start_date: row.get("actual_start_date"),
                    actual_end_date: row.get("actual_end_date"),
                    result: row.get("result"),
                    conclusion: row.get("conclusion"),
                    recorded_by: row.get("recorded_by"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(tasks, "获取检测任务列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch tasks: {}", e);
            Json(ApiResponse::error(500, "获取检测任务列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:write"])),
    path = "/lims/tasks",
    tag = "inspection_task",
    request_body = CreateTaskRequest,
    responses(
        (status = 200, description = "Inspection task created", body = ApiResponse<InspectionTask>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_task(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };

    let row = sqlx::query("SELECT id, sample_no FROM qa_lab_samples WHERE id = $1")
        .bind(sample_id)
        .fetch_one(&state.pool)
        .await;

    let sample = match row {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch sample: {}", e);
            return Json(ApiResponse::error(404, "样品不存在"));
        }
    };

    let task_no = format!(
        "TK-{}-{}",
        chrono::Local::now().format("%Y%m%d"),
        uuid::Uuid::new_v4().to_string()[..6].to_uppercase()
    );

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let row = sqlx::query(&format!(
        "INSERT INTO qa_lab_tasks (tenant_id, task_no, sample_id, sample_no, test_items, assigned_to, instrument_id, planned_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING {}",
        TASK_SELECT_COLS
    ))
    .bind(ctx.tenant_id)
    .bind(task_no)
    .bind(sample_id)
    .bind(sample.get::<String, _>("sample_no"))
    .bind(serde_json::to_value(&req.test_items).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.planned_date)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "检测任务创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create task: {}", e);
            Json(ApiResponse::error(500, "检测任务创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:read"])),
    path = "/lims/tasks/{id}",
    tag = "inspection_task",
    params(
        ("id" = String, Path, description = "Task ID"),
    ),
    responses(
        (status = 200, description = "Inspection task detail", body = ApiResponse<InspectionTask>),
        (status = 404, description = "Task not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_task(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(&format!(
        "SELECT {} FROM qa_lab_tasks WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
        TASK_SELECT_COLS
    ))
    .bind(id)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取检测任务成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch task: {}", e);
            Json(ApiResponse::error(500, "获取检测任务失败"))
        }
    }
}

pub async fn update_task(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateTaskRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let instrument_id = req
        .instrument_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let row = sqlx::query(&format!(
        "UPDATE qa_lab_tasks SET status = COALESCE($2, status), assigned_to = COALESCE($3, assigned_to), instrument_id = COALESCE($4, instrument_id), actual_start_date = COALESCE($5, actual_start_date), actual_end_date = COALESCE($6, actual_end_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $7 RETURNING {}",
        TASK_SELECT_COLS
    ))
    .bind(id)
    .bind(&req.status)
    .bind(&req.assigned_to)
    .bind(instrument_id)
    .bind(&req.actual_start_date)
    .bind(&req.actual_end_date)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "检测任务更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update task: {}", e);
            Json(ApiResponse::error(500, "检测任务更新失败"))
        }
    }
}

pub async fn submit_result(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<SubmitResultRequest>,
) -> Json<ApiResponse<InspectionTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query(&format!(
        "UPDATE qa_lab_tasks SET result = $2, conclusion = $3, recorded_by = $4, status = 'completed', actual_end_date = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $5 RETURNING {}",
        TASK_SELECT_COLS
    ))
    .bind(id)
    .bind(req.result)
    .bind(&req.conclusion)
    .bind(&req.recorded_by)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            let task = InspectionTask {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                task_no: r.get("task_no"),
                sample_id: r.get("sample_id"),
                sample_no: r.get("sample_no"),
                test_items: r.get("test_items"),
                status: r.get("status"),
                assigned_to: r.get("assigned_to"),
                instrument_id: r.get("instrument_id"),
                planned_date: r.get("planned_date"),
                actual_start_date: r.get("actual_start_date"),
                actual_end_date: r.get("actual_end_date"),
                result: r.get("result"),
                conclusion: r.get("conclusion"),
                recorded_by: r.get("recorded_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let tid = Uuid::parse_str(&task.id).unwrap_or_else(|_| Uuid::nil());
                let tno = task.task_no.clone();
                let sid = Uuid::parse_str(&task.sample_id).unwrap_or_else(|_| Uuid::nil());
                let sno = task.sample_no.clone();
                let conclusion = task.conclusion.clone().unwrap_or_default();
                let recorded_by = task.recorded_by.clone().unwrap_or_default();
                let result_val = task.result.clone().unwrap_or(serde_json::Value::Null);
                tokio::spawn(async move {
                    let payload =
                        topems_shared_event::event::LimsInspectionResultSubmittedPayload {
                            task_id: tid,
                            task_no: tno,
                            sample_id: sid,
                            sample_no: sno,
                            conclusion,
                            result: result_val,
                            recorded_by,
                        };
                    if let Err(e) = publisher
                        .publish_event(
                            topems_shared_event::event::EventType::LimsInspectionResultSubmitted,
                            payload,
                        )
                        .await
                    {
                        tracing::warn!("[lims] LimsInspectionResultSubmitted 事件发布失败（graceful fallback）: {}", e);
                    } else {
                        tracing::info!(
                            "[lims] LimsInspectionResultSubmitted 事件发布成功 - task_id={}",
                            tid
                        );
                    }
                });
            }

            Json(ApiResponse::success(task, "检测结果提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit result: {}", e);
            Json(ApiResponse::error(500, "检测结果提交失败"))
        }
    }
}

pub async fn delete_task(
    State(state): State<crate::shared::AppState>,
    Extension(ctx): Extension<TenantContext>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let result =
        sqlx::query("UPDATE qa_lab_tasks SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(ctx.tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "检测任务删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete task: {}", e);
            Json(ApiResponse::error(500, "检测任务删除失败"))
        }
    }
}

// ============================================================================
// 检验结果判定：参考范围解析 + 数值判定纯函数
// ============================================================================

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum JudgeResult {
    InRange,    // 结果在范围内
    BelowRange, // 低于下限
    AboveRange, // 高于上限
    NoRange,    // 无参考范围，无法判定
    Invalid,    // 结果或范围格式无效
}

/// 解析 "3.9-6.1" / "<0.5" / ">2000" / "≤100" / "≥0.1" / "NEGATIVE" / "阴性" 等格式
/// 返回 (lower, upper, lower_inclusive, upper_inclusive)
///   None 表示无穷 / 缺失
pub fn parse_reference_range(range: &str) -> Option<(Option<f64>, Option<f64>, bool, bool)> {
    let r = range.trim();
    if r.is_empty() {
        return None;
    }
    // 区间格式 min-max
    if let Some(dash) = r.find('-') {
        let (a, b) = r.split_at(dash);
        let lo_s = a.trim();
        let hi_s = b[1..].trim();
        if let (Ok(lo), Ok(hi)) = (lo_s.parse::<f64>(), hi_s.parse::<f64>()) {
            if lo <= hi {
                return Some((Some(lo), Some(hi), true, true));
            }
        }
    }
    if let Some(rest) = r.strip_prefix("≤").or_else(|| r.strip_prefix("<=")) {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, true));
    }
    if let Some(rest) = r.strip_prefix('≤') {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, true));
    }
    if let Some(rest) = r.strip_prefix('≥').or_else(|| r.strip_prefix(">=")) {
        let lo = rest.trim().parse::<f64>().ok()?;
        return Some((Some(lo), None, true, true));
    }
    if let Some(rest) = r.strip_prefix('<') {
        let hi = rest.trim().parse::<f64>().ok()?;
        return Some((None, Some(hi), true, false));
    }
    if let Some(rest) = r.strip_prefix('>') {
        let lo = rest.trim().parse::<f64>().ok()?;
        return Some((Some(lo), None, false, true));
    }
    // 文本定性参考范围（positive/negative 等）不提供数值判定
    None
}

/// 判断结果是否在参考范围内
pub fn judge_value_against_range(value: f64, reference_range: &str) -> JudgeResult {
    if !value.is_finite() {
        return JudgeResult::Invalid;
    }
    let Some((lo, hi, lo_inc, hi_inc)) = parse_reference_range(reference_range) else {
        return JudgeResult::NoRange;
    };
    // check lower bound
    if let Some(l) = lo {
        let ok = if lo_inc { value >= l } else { value > l };
        if !ok {
            return JudgeResult::BelowRange;
        }
    }
    if let Some(h) = hi {
        let ok = if hi_inc { value <= h } else { value < h };
        if !ok {
            return JudgeResult::AboveRange;
        }
    }
    JudgeResult::InRange
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== parse_reference_range =====
    #[test]
    fn test_parse_basic_interval() {
        // "3.9-6.1"
        let (lo, hi, li, ui) = parse_reference_range("3.9-6.1").unwrap();
        assert!((lo.unwrap() - 3.9).abs() < 1e-9);
        assert!((hi.unwrap() - 6.1).abs() < 1e-9);
        assert!(li && ui);
    }

    #[test]
    fn test_parse_upper_bound_leq_lesseq() {
        let (lo, hi, _, ui) = parse_reference_range("<=100").unwrap();
        assert!(lo.is_none());
        assert!((hi.unwrap() - 100.0).abs() < 1e-9);
        assert!(ui);
        let (_, hi, _, ui) = parse_reference_range("≤50").unwrap();
        assert!((hi.unwrap() - 50.0).abs() < 1e-9);
        assert!(ui);
    }

    #[test]
    fn test_parse_lower_bound_ge_greatereq() {
        let (lo, hi, li, _) = parse_reference_range(">=0.1").unwrap();
        assert!(hi.is_none());
        assert!((lo.unwrap() - 0.1).abs() < 1e-9);
        assert!(li);
        let (lo, _, li, _) = parse_reference_range("≥1").unwrap();
        assert!((lo.unwrap() - 1.0).abs() < 1e-9);
        assert!(li);
    }

    #[test]
    fn test_parse_strict_lt_gt() {
        // < 10 → upper_inclusive=false
        let (_, hi, _, ui) = parse_reference_range("<10").unwrap();
        assert!(!ui);
        assert!((hi.unwrap() - 10.0).abs() < 1e-9);
        // > 0 → lower_inclusive=false
        let (lo, _, li, _) = parse_reference_range(">0").unwrap();
        assert!(!li);
        assert!((lo.unwrap() - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_parse_invalid_returns_none() {
        assert!(parse_reference_range("").is_none());
        assert!(parse_reference_range("阴性").is_none());
        assert!(parse_reference_range("abc-def").is_none());
        assert!(parse_reference_range("10-5").is_none()); // lo>hi 无效
    }

    // ===== judge_value_against_range =====
    #[test]
    fn test_judge_interval_in_range() {
        assert_eq!(
            judge_value_against_range(5.0, "3.9-6.1"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(3.9, "3.9-6.1"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(6.1, "3.9-6.1"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn test_judge_interval_outside() {
        assert_eq!(
            judge_value_against_range(3.8, "3.9-6.1"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(6.2, "3.9-6.1"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn test_judge_upper_bound_le() {
        assert_eq!(
            judge_value_against_range(100.0, "≤100"),
            JudgeResult::InRange
        );
        assert_eq!(
            judge_value_against_range(100.1, "≤100"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn test_judge_strict_lt() {
        assert_eq!(
            judge_value_against_range(10.0, "<10"),
            JudgeResult::AboveRange
        );
        assert_eq!(judge_value_against_range(9.99, "<10"), JudgeResult::InRange);
    }

    #[test]
    fn test_judge_strict_gt() {
        assert_eq!(
            judge_value_against_range(0.0, ">0"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(0.0001, ">0"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn test_judge_no_range_or_invalid() {
        assert_eq!(judge_value_against_range(1.0, "阴性"), JudgeResult::NoRange);
        assert_eq!(judge_value_against_range(1.0, ""), JudgeResult::NoRange);
        assert_eq!(
            judge_value_against_range(f64::NAN, "0-10"),
            JudgeResult::Invalid
        );
        assert_eq!(
            judge_value_against_range(f64::INFINITY, "0-10"),
            JudgeResult::Invalid
        );
    }

    // ===== parse_reference_range 补充 =====
    #[test]
    fn parse_empty_returns_none() {
        assert_eq!(parse_reference_range(""), None);
        assert_eq!(parse_reference_range("   "), None);
    }

    #[test]
    fn parse_textual_range_none() {
        assert_eq!(parse_reference_range("positive"), None);
        assert_eq!(parse_reference_range("negative"), None);
    }

    #[test]
    fn parse_leq_variants() {
        assert_eq!(
            parse_reference_range("<=5"),
            Some((None, Some(5.0), true, true))
        );
        assert_eq!(
            parse_reference_range("≤5"),
            Some((None, Some(5.0), true, true))
        );
    }

    #[test]
    fn parse_geq_variants() {
        assert_eq!(
            parse_reference_range(">=5"),
            Some((Some(5.0), None, true, true))
        );
        assert_eq!(
            parse_reference_range("≥5"),
            Some((Some(5.0), None, true, true))
        );
    }

    #[test]
    fn parse_strict_bounds() {
        assert_eq!(
            parse_reference_range("<5"),
            Some((None, Some(5.0), true, false))
        );
        assert_eq!(
            parse_reference_range(">5"),
            Some((Some(5.0), None, false, true))
        );
    }

    #[test]
    fn parse_inverted_range_none() {
        // 10-5 lo>hi → 无法解析
        assert_eq!(parse_reference_range("10-5"), None);
    }

    #[test]
    fn parse_invalid_number_none() {
        assert_eq!(parse_reference_range("abc-def"), None);
        assert_eq!(parse_reference_range(">abc"), None);
    }

    // ===== judge_value_against_range 补充 =====
    #[test]
    fn judge_in_range() {
        assert_eq!(judge_value_against_range(7.0, "5-10"), JudgeResult::InRange);
    }

    #[test]
    fn judge_boundaries_inclusive() {
        assert_eq!(judge_value_against_range(5.0, "5-10"), JudgeResult::InRange);
        assert_eq!(
            judge_value_against_range(10.0, "5-10"),
            JudgeResult::InRange
        );
    }

    #[test]
    fn judge_below_above() {
        assert_eq!(
            judge_value_against_range(4.0, "5-10"),
            JudgeResult::BelowRange
        );
        assert_eq!(
            judge_value_against_range(11.0, "5-10"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn judge_strict_boundary() {
        // >5，value=5 不含下界 → BelowRange
        assert_eq!(
            judge_value_against_range(5.0, ">5"),
            JudgeResult::BelowRange
        );
        // <5，value=5 不含上界 → AboveRange
        assert_eq!(
            judge_value_against_range(5.0, "<5"),
            JudgeResult::AboveRange
        );
    }

    #[test]
    fn judge_non_finite_invalid() {
        assert_eq!(
            judge_value_against_range(f64::NAN, "5-10"),
            JudgeResult::Invalid
        );
        assert_eq!(
            judge_value_against_range(f64::INFINITY, "5-10"),
            JudgeResult::Invalid
        );
    }

    #[test]
    fn judge_no_range() {
        assert_eq!(
            judge_value_against_range(5.0, "positive"),
            JudgeResult::NoRange
        );
    }
}
