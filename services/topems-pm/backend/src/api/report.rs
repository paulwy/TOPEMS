use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json,
    Router,
};
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::report::{
    ProjectReport,
    ReportTemplate,
    CreateReportRequest,
    CreateReportTemplateRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/reports", get(get_project_reports).post(create_report))
        .route("/api/v1/reports/{id}", get(get_report))
        .route("/api/v1/projects/{project_id}/reports/generate", post(generate_report))
        .route("/api/v1/report-templates", get(list_templates).post(create_template))
        .route("/api/v1/report-templates/{id}", get(get_template).put(update_template).delete(delete_template))
        .with_state(pool)
}

async fn get_project_reports(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectReport>>> {
    let reports = sqlx::query_as::<_, ProjectReport>("SELECT * FROM pm.project_reports WHERE project_id = $1 ORDER BY generated_at DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match reports {
        Ok(r) => Json(ApiResponse::success(r, "获取报告列表成功")),
        Err(e) => {
            tracing::error!("获取报告失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取报告失败"))
        }
    }
}

async fn get_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectReport>> {
    let report = sqlx::query_as::<_, ProjectReport>("SELECT * FROM pm.project_reports WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match report {
        Ok(r) => Json(ApiResponse::success(r, "获取报告详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "报告不存在")),
        Err(e) => {
            tracing::error!("获取报告失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取报告失败"))
        }
    }
}

async fn create_report(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateReportRequest>,
) -> Json<ApiResponse<ProjectReport>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let report = sqlx::query_as::<_, ProjectReport>(
        "INSERT INTO pm.project_reports (id, project_id, report_code, report_name, report_type, report_period, status, generated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.report_code)
    .bind(&req.report_name)
    .bind(&req.report_type)
    .bind(req.report_period)
    .bind(req.generated_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match report {
        Ok(r) => Json(ApiResponse::success(r, "创建报告成功")),
        Err(e) => {
            tracing::error!("创建报告失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建报告失败"))
        }
    }
}

async fn generate_report(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateReportRequest>,
) -> Json<ApiResponse<ProjectReport>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let project_data = sqlx::query("SELECT name, code, project_type, status, progress, budget, start_date, end_date FROM pm.projects WHERE id = $1")
        .bind(project_id)
        .fetch_one(&pool)
        .await;

    let project_info = match project_data {
        Ok(p) => serde_json::json!({
            "name": p.get::<String, _>("name"),
            "code": p.get::<Option<String>, _>("code"),
            "project_type": p.get::<String, _>("project_type"),
            "status": p.get::<String, _>("status"),
            "progress": p.get::<i32, _>("progress"),
            "budget": p.get::<Option<f64>, _>("budget"),
            "start_date": p.get::<Option<DateTime<Utc>>, _>("start_date"),
            "end_date": p.get::<Option<DateTime<Utc>>, _>("end_date")
        }),
        Err(_) => serde_json::json!({}),
    };

    let phases_data = sqlx::query("SELECT name, sequence_number, progress, status FROM pm.project_phases WHERE project_id = $1 ORDER BY sequence_number")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    let phases_info = match phases_data {
        Ok(phases) => phases.into_iter().map(|p| serde_json::json!({
            "name": p.get::<String, _>("name"),
            "sequence_number": p.get::<i32, _>("sequence_number"),
            "progress": p.get::<i32, _>("progress"),
            "status": p.get::<String, _>("status")
        })).collect::<Vec<_>>(),
        Err(_) => Vec::new(),
    };

    let milestones_data = sqlx::query("SELECT name, date, status FROM pm.project_milestones WHERE project_id = $1 ORDER BY date")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    let milestones_info = match milestones_data {
        Ok(ms) => ms.into_iter().map(|m| serde_json::json!({
            "name": m.get::<String, _>("name"),
            "date": m.get::<DateTime<Utc>, _>("date"),
            "status": m.get::<String, _>("status")
        })).collect::<Vec<_>>(),
        Err(_) => Vec::new(),
    };

    let budget_data = sqlx::query("SELECT total_amount, allocated_amount, spent_amount FROM pm.budgets WHERE project_id = $1")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    let budget_info = match budget_data {
        Ok(bs) => serde_json::json!({
            "budgets": bs.into_iter().map(|b| serde_json::json!({
                "total_amount": b.get::<f64, _>("total_amount"),
                "allocated_amount": b.get::<f64, _>("allocated_amount"),
                "spent_amount": b.get::<f64, _>("spent_amount")
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
        "INSERT INTO pm.project_reports (id, project_id, report_code, report_name, report_type, report_period, status, generated_at, data, summary, generated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'generated', $7, $8, $9, $10, $11, $12) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.report_code)
    .bind(&req.report_name)
    .bind(&req.report_type)
    .bind(req.report_period)
    .bind(now)
    .bind(report_data)
    .bind(summary)
    .bind(req.generated_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match report {
        Ok(r) => Json(ApiResponse::success(r, "生成报告成功")),
        Err(e) => {
            tracing::error!("生成报告失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "生成报告失败"))
        }
    }
}

fn generate_summary(data: &serde_json::Value) -> Option<String> {
    let project_name = data["project_info"]["name"].as_str().unwrap_or("项目");
    let progress = data["project_info"]["progress"].as_i64().unwrap_or(0);
    let empty_vec = Vec::new();
    let milestones = data["milestones"].as_array().unwrap_or(&empty_vec);
    let completed_ms = milestones.iter().filter(|m| m["status"].as_str() == Some("completed")).count();
    
    Some(format!(
        "项目「{}」当前进度 {}%，共 {} 个里程碑，已完成 {} 个。",
        project_name, progress, milestones.len(), completed_ms
    ))
}

async fn list_templates(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<Vec<ReportTemplate>>> {
    let templates = sqlx::query_as::<_, ReportTemplate>("SELECT * FROM pm.report_templates WHERE is_active = true ORDER BY template_name")
        .fetch_all(&pool)
        .await;

    match templates {
        Ok(t) => Json(ApiResponse::success(t, "获取报告模板列表成功")),
        Err(e) => {
            tracing::error!("获取报告模板失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取报告模板失败"))
        }
    }
}

async fn get_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ReportTemplate>> {
    let template = sqlx::query_as::<_, ReportTemplate>("SELECT * FROM pm.report_templates WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "获取报告模板详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "报告模板不存在")),
        Err(e) => {
            tracing::error!("获取报告模板失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取报告模板失败"))
        }
    }
}

async fn create_template(
    State(pool): State<PgPool>,
    Json(req): Json<CreateReportTemplateRequest>,
) -> Json<ApiResponse<ReportTemplate>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let template = sqlx::query_as::<_, ReportTemplate>(
        "INSERT INTO pm.report_templates (id, template_code, template_name, report_type, content, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8) RETURNING *"
    )
    .bind(id)
    .bind(&req.template_code)
    .bind(&req.template_name)
    .bind(&req.report_type)
    .bind(req.content)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "创建报告模板成功")),
        Err(e) => {
            tracing::error!("创建报告模板失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建报告模板失败"))
        }
    }
}

async fn update_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateReportTemplateRequest>,
) -> Json<ApiResponse<ReportTemplate>> {
    let template = sqlx::query_as::<_, ReportTemplate>(
        "UPDATE pm.report_templates SET
            template_name = COALESCE($1, template_name),
            content = COALESCE($2, content),
            updated_at = $3
        WHERE id = $4 RETURNING *"
    )
    .bind(req.template_name)
    .bind(req.content)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "更新报告模板成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "报告模板不存在")),
        Err(e) => {
            tracing::error!("更新报告模板失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新报告模板失败"))
        }
    }
}

async fn delete_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("UPDATE pm.report_templates SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除报告模板成功")),
        Ok(_) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "报告模板不存在")),
        Err(e) => {
            tracing::error!("删除报告模板失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "删除报告模板失败"))
        }
    }
}