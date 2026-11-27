use axum::{
    extract::{Extension, Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_auth::middleware::{BindTenantScope, TenantScope};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::report::{
    CreateReportRequest, CreateReportTemplateRequest, ProjectReport, ReportTemplate,
};
use crate::modules::effective_tenant_id;
use crate::modules::project_report_status::ProjectReportStatus;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/reports",
            get(get_project_reports).post(create_report),
        )
        .route("/reports/{id}", get(get_report))
        .route(
            "/projects/{project_id}/reports/generate",
            post(generate_report),
        )
        .route(
            "/report-templates",
            get(list_templates).post(create_template),
        )
        .route(
            "/report-templates/{id}",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/reports",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "report"
)]
async fn get_project_reports(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<ProjectReport>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let reports = sqlx::query_as::<_, ProjectReport>(
        only_own_schema_query!("pm", "SELECT id, project_id, report_code, report_name, report_type, report_period, status, generated_at, data, summary, created_by, created_at, updated_at FROM pm.project_reports WHERE project_id = $1 ORDER BY generated_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match reports {
        Ok(r) => ApiResponse::success(r, "获取报告列表成功"),
        Err(e) => {
            tracing::error!("获取报告失败: {}", e);
            ApiResponse::server_error("获取报告失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/reports/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "report"
)]
async fn get_report(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProjectReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let report =
        sqlx::query_as::<_, ProjectReport>(only_own_schema_query!("pm", "SELECT id, project_id, report_code, report_name, report_type, report_period, status, generated_at, data, summary, created_by, created_at, updated_at FROM pm.project_reports WHERE id = $1"))
            .bind(id)
            .fetch_one(&mut scope)
            .await;

    match report {
        Ok(r) => ApiResponse::success(r, "获取报告详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("报告不存在"),
        Err(e) => {
            tracing::error!("获取报告失败: {}", e);
            ApiResponse::server_error("获取报告失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/projects/{project_id}/reports",
    tag = "report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_report(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReportRequest>,
) -> ApiResponse<ProjectReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let report = sqlx::query_as::<_, ProjectReport>(
        only_own_schema_query!("pm", "INSERT INTO pm.project_reports (id, project_id, report_code, report_name, report_type, report_period, status, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.report_code)
    .bind(&req.report_name)
    .bind(&req.report_type)
    .bind(req.report_period)
    .bind(ProjectReportStatus::DEFAULT.as_db_str())
    .bind(req.generated_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match report {
        Ok(r) => ApiResponse::success(r, "创建报告成功"),
        Err(e) => {
            tracing::error!("创建报告失败: {}", e);
            ApiResponse::server_error("创建报告失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/reports/generate",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "report"
)]
async fn generate_report(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReportRequest>,
) -> ApiResponse<ProjectReport> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    // C 类：报告生成只服务租户内用户，缺租户即 400。
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return ApiResponse::from(TopemsError::ValidationFailed(message));
        }
    };

    let project_data = sqlx::query(only_own_schema_query!("pm", "SELECT name, code, project_type, status, progress, budget, start_date, end_date FROM pm.projects WHERE id = $1 AND tenant_id = $2::uuid"))
        .bind(project_id)
        .bind_tenant_scope(&tenant_scope)
        .fetch_one(&mut scope)
        .await;

    let project_info = match project_data {
        Ok(p) => serde_json::json!({
            "name": p.get::<String, _>("name"),
            "code": p.get::<Option<String>, _>("code"),
            "project_type": p.get::<String, _>("project_type"),
            "status": p.get::<String, _>("status"),
            "progress": p.get::<i32, _>("progress"),
            "budget": p.get::<Option<Decimal>, _>("budget"),
            "start_date": p.get::<Option<DateTime<Utc>>, _>("start_date"),
            "end_date": p.get::<Option<DateTime<Utc>>, _>("end_date")
        }),
        Err(_) => serde_json::json!({}),
    };

    let phases_data = sqlx::query(only_own_schema_query!("pm", "SELECT name, sequence_number, progress, status FROM pm.project_phases WHERE project_id = $1 AND tenant_id = $2::uuid ORDER BY sequence_number"))
        .bind(project_id)
        .bind_tenant_scope(&tenant_scope)
        .fetch_all(&mut scope)
        .await;

    let phases_info = match phases_data {
        Ok(phases) => phases
            .into_iter()
            .map(|p| {
                serde_json::json!({
                    "name": p.get::<String, _>("name"),
                    "sequence_number": p.get::<i32, _>("sequence_number"),
                    "progress": p.get::<i32, _>("progress"),
                    "status": p.get::<String, _>("status")
                })
            })
            .collect::<Vec<_>>(),
        Err(_) => Vec::new(),
    };

    let milestones_data = sqlx::query(only_own_schema_query!(
        "pm",
        "SELECT name, date, status FROM pm.project_milestones WHERE project_id = $1 ORDER BY date"
    ))
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    let milestones_info = match milestones_data {
        Ok(ms) => ms
            .into_iter()
            .map(|m| {
                serde_json::json!({
                    "name": m.get::<String, _>("name"),
                    "date": m.get::<DateTime<Utc>, _>("date"),
                    "status": m.get::<String, _>("status")
                })
            })
            .collect::<Vec<_>>(),
        Err(_) => Vec::new(),
    };

    let budget_data = sqlx::query(only_own_schema_query!(
        "pm",
        "SELECT total_amount::numeric, spent_amount::numeric, remaining_amount FROM pm.budgets WHERE project_id = $1"
    ))
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    let budget_info = match budget_data {
        Ok(bs) => serde_json::json!({
            "budgets": bs.into_iter().map(|b| serde_json::json!({
                "total_amount": b.get::<Decimal, _>("total_amount"),
                "spent_amount": b.get::<Decimal, _>("spent_amount"),
                "remaining_amount": b.get::<Decimal, _>("remaining_amount")
            })).collect::<Vec<_>>()
        }),
        Err(_) => serde_json::json!({"budgets": []}),
    };

    let report_data = serde_json::json!({
        "project_info": project_info,
        "phases": phases_info,
        "milestones": milestones_info,
        "budget": budget_info,
        "generated_at": now,
        "report_type": req.report_type,
        "report_period": req.report_period
    });

    let summary = generate_summary(&report_data);

    let report = sqlx::query_as::<_, ProjectReport>(
        only_own_schema_query!("pm", "INSERT INTO pm.project_reports (id, project_id, report_code, report_name, report_type, report_period, status, generated_at, data, summary, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.report_code)
    .bind(&req.report_name)
    .bind(&req.report_type)
    .bind(req.report_period)
    .bind(ProjectReportStatus::Generated.as_db_str())
    .bind(now)
    .bind(report_data)
    .bind(summary)
    .bind(req.generated_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match report {
        Ok(r) => ApiResponse::success(r, "生成报告成功"),
        Err(e) => {
            tracing::error!("生成报告失败: {}", e);
            ApiResponse::server_error("生成报告失败")
        }
    }
}

fn generate_summary(data: &serde_json::Value) -> Option<String> {
    let project_name = data["project_info"]["name"].as_str().unwrap_or("项目");
    let progress = data["project_info"]["progress"].as_i64().unwrap_or(0);
    let empty_vec = Vec::new();
    let milestones = data["milestones"].as_array().unwrap_or(&empty_vec);
    let completed_ms = milestones
        .iter()
        .filter(|m| m["status"].as_str() == Some("completed"))
        .count();

    Some(format!(
        "项目「{}」当前进度 {}%，共 {} 个里程碑，已完成 {} 个。",
        project_name,
        progress,
        milestones.len(),
        completed_ms
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/report-templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "report"
)]
async fn list_templates(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ReportTemplate>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let templates = sqlx::query_as::<_, ReportTemplate>(
        only_own_schema_query!("pm", "SELECT id, template_code, template_name, report_type, content, is_active, created_by, created_at, updated_at FROM pm.report_templates WHERE is_active = true ORDER BY template_name"),
    )
    .fetch_all(&mut scope)
    .await;

    match templates {
        Ok(t) => ApiResponse::success(t, "获取报告模板列表成功"),
        Err(e) => {
            tracing::error!("获取报告模板失败: {}", e);
            ApiResponse::server_error("获取报告模板失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/report-templates/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "report"
)]
async fn get_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ReportTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let template = sqlx::query_as::<_, ReportTemplate>(
        only_own_schema_query!("pm", "SELECT id, template_code, template_name, report_type, content, is_active, created_by, created_at, updated_at FROM pm.report_templates WHERE id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match template {
        Ok(t) => ApiResponse::success(t, "获取报告模板详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("报告模板不存在"),
        Err(e) => {
            tracing::error!("获取报告模板失败: {}", e);
            ApiResponse::server_error("获取报告模板失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/report-templates",
    tag = "report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReportTemplateRequest>,
) -> ApiResponse<ReportTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let template = sqlx::query_as::<_, ReportTemplate>(
        only_own_schema_query!("pm", "INSERT INTO pm.report_templates (id, template_code, template_name, report_type, content, is_active, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9) RETURNING *")
    )
    .bind(id)
    .bind(&req.template_code)
    .bind(&req.template_name)
    .bind(&req.report_type)
    .bind(req.content)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match template {
        Ok(t) => ApiResponse::success(t, "创建报告模板成功"),
        Err(e) => {
            tracing::error!("创建报告模板失败: {}", e);
            ApiResponse::server_error("创建报告模板失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    put,
    path = "/api/pm/report-templates/{id}",
    tag = "report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateReportTemplateRequest>,
) -> ApiResponse<ReportTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let template = sqlx::query_as::<_, ReportTemplate>(only_own_schema_query!(
        "pm",
        "UPDATE pm.report_templates SET
            template_name = COALESCE($1, template_name),
            content = COALESCE($2, content),
            updated_at = $3
        WHERE id = $4  RETURNING *"
    ))
    .bind(req.template_name)
    .bind(req.content)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match template {
        Ok(t) => ApiResponse::success(t, "更新报告模板成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("报告模板不存在"),
        Err(e) => {
            tracing::error!("更新报告模板失败: {}", e);
            ApiResponse::server_error("更新报告模板失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    delete,
    path = "/api/pm/report-templates/{id}",
    tag = "report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.report_templates SET is_active = false WHERE id = $1 "
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除报告模板成功"),
        Ok(_) => ApiResponse::not_found("报告模板不存在"),
        Err(e) => {
            tracing::error!("删除报告模板失败: {}", e);
            ApiResponse::server_error("删除报告模板失败")
        }
    }
}
