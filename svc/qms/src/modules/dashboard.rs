//! Dashboard handlers

use axum::{extract::State, routing::get, Json, Router};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::Serialize;
use sqlx::Row;
use topems_shared::ApiResponse;

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_inspections: i64,
    pub pending_inspections: i64,
    pub completed_inspections: i64,
    pub qualified_rate: f64,
    pub total_issues: i64,
    pub open_issues: i64,
    pub resolved_issues: i64,
    pub pending_actions: i64,
    pub total_audit_plans: i64,
    pub in_progress_plans: i64,
}

pub async fn get_today_quality_pass_rate(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    // TODO(Mobile-BFF 数据迁移): 跨 schema 查询旧表待迁移
    //
    // 当前实现：跨 schema 查询 `plugin_mobile.quality_tasks`（mobile 服务私有
    // 表）统计今日合格率，违反服务边界原则。QMS 已有自有表
    // `qa_quality_inspections`（见 get_dashboard_stats），但 mobile 端通过
    // plugin_mobile.quality_tasks 写入的质检记录未同步过来。
    //
    // 迁移方案（5 阶段）：
    //
    // 阶段 1 — 数据导出：
    //   从 plugin_mobile.quality_tasks 导出（status, created_at, operator,
    //   task_no 等），并按 status 映射到 QMS 的质检状态枚举。
    //
    // 阶段 2 — 表结构映射：
    //   plugin_mobile.quality_tasks   →  qa_quality_inspections（已存在）
    //     status = 'passed'           →  status = 'completed' + result='pass'
    //     status = 'failed'           →  status = 'completed' + result='fail'
    //     status = 'pending'          →  status = 'pending'
    //     created_at      (timestamptz) →  created_at     (timestamptz)
    //     task_no          (text)      →  inspection_no   (text)
    //     operator         (text)      →  inspector_id   (uuid, 经员工映射)
    //   缺失字段 qualification_rate 按 passed/total 计算，audit_plan_id 置空。
    //
    // 阶段 3 — 数据导入：
    //   INSERT INTO qa_quality_inspections (...) SELECT ... FROM
    //   plugin_mobile.quality_tasks WHERE NOT EXISTS (...); 导入后比对
    //   COUNT(*) 与原表一致，并抽样校验 status 映射正确性。
    //
    // 阶段 4 — 端点切换：
    //   将下方两条 SQL 改为查 qa_quality_inspections：
    //     total = SELECT COUNT(*) FROM qa_quality_inspections
    //             WHERE created_at >= CURRENT_DATE
    //     passed = SELECT COUNT(*) FROM qa_quality_inspections
    //              WHERE status = 'completed' AND result = 'pass'
    //              AND created_at >= CURRENT_DATE
    //   注意 QMS 表用 qualification_rate 字段而非简单 passed 计数，可改为
    //   AVG(qualification_rate) WHERE status='completed'（与 get_dashboard_stats
    //   保持一致），或新增 result 字段区分 pass/fail。
    //
    // 阶段 5 — 旧表清理：
    //   确认 mobile 端不再写入 plugin_mobile.quality_tasks 后 DROP 该表，
    //   并从 svc/mobile/src/init.sql 中移除建表语句。Mobile 端质检应改为
    //   通过 QmsApi 调用 QMS 服务的质检创建端点。
    //
    // 跟踪: docs/roadmap/TODO.md "V62.x Mobile BFF 数据迁移" 章节
    let total = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.quality_tasks WHERE created_at >= CURRENT_DATE",
    )
    .fetch_one(&state.pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let passed = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.quality_tasks WHERE status = 'passed' AND created_at >= CURRENT_DATE",
    )
    .fetch_one(&state.pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pass_rate = if total == 0 {
        0.0
    } else {
        (passed as f64 / total as f64) * 100.0
    };

    Json(ApiResponse::success(
        serde_json::json!({ "pass_rate": pass_rate, "total": total, "passed": passed }),
        "获取今日质量合格率成功",
    ))
}

pub async fn get_dashboard_stats(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<DashboardStats>> {
    // Total inspections
    let total_inspections: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_inspections = total_inspections.unwrap_or(0);

    // Pending inspections
    let pending_inspections: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'pending' OR status = 'in_progress' OR status = 'pending_audit'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let pending_inspections = pending_inspections.unwrap_or(0);

    // Completed inspections
    let completed_inspections: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'completed'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let completed_inspections = completed_inspections.unwrap_or(0);

    // Qualification rate
    let qualified_rate: Option<BigDecimal> = sqlx::query_scalar::<_, _>(r#"SELECT COALESCE(AVG(qualification_rate), 0) FROM qa_quality_inspections WHERE status = 'completed'"#)
    .fetch_one(&state.pool)
    .await
    .ok();
    let qualified_rate: f64 = qualified_rate
        .map(|v| v.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);

    // Total issues
    let total_issues: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_issues")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_issues = total_issues.unwrap_or(0);

    // Open issues
    let open_issues: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_issues WHERE status = 'open'")
            .fetch_one(&state.pool)
            .await
            .ok();
    let open_issues = open_issues.unwrap_or(0);

    // Resolved issues
    let resolved_issues: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_issues WHERE status = 'resolved'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let resolved_issues = resolved_issues.unwrap_or(0);

    // Pending actions
    let pending_actions: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_corrective_actions WHERE status = 'pending' OR status = 'in_progress'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let pending_actions = pending_actions.unwrap_or(0);

    // Total audit plans
    let total_audit_plans: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_audit_plans")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_audit_plans = total_audit_plans.unwrap_or(0);

    // In progress audit plans
    let in_progress_plans: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_audit_plans WHERE status = 'in_progress'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let in_progress_plans = in_progress_plans.unwrap_or(0);

    let stats = DashboardStats {
        total_inspections,
        pending_inspections,
        completed_inspections,
        qualified_rate: (qualified_rate * 100.0).round() / 100.0,
        total_issues,
        open_issues,
        resolved_issues,
        pending_actions,
        total_audit_plans,
        in_progress_plans,
    };

    Json(ApiResponse::success(stats, "获取仪表盘统计成功"))
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/dashboard", get(get_dashboard_stats))
        .route(
            "/quality-tasks/today-pass-rate",
            get(get_today_quality_pass_rate),
        )
}
