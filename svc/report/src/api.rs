use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::*;
use crate::services::*;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub report_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TemplateQuery {
    pub report_type: Option<String>,
}

/// GET /api/v1/report-types - 获取所有报表类型
pub async fn list_report_types() -> Json<ApiResponse<Vec<ReportTypeInfo>>> {
    let report_types = vec![
        ReportTypeInfo {
            type_: "rs_project_progress".to_string(),
            name: "研发项目进度报表".to_string(),
            module: "rs".to_string(),
        },
        ReportTypeInfo {
            type_: "rs_experiment_record".to_string(),
            name: "实验记录报表".to_string(),
            module: "rs".to_string(),
        },
        ReportTypeInfo {
            type_: "lims_inspection_stats".to_string(),
            name: "检验统计报表".to_string(),
            module: "lims".to_string(),
        },
        ReportTypeInfo {
            type_: "lims_sample_summary".to_string(),
            name: "样品汇总报表".to_string(),
            module: "lims".to_string(),
        },
        ReportTypeInfo {
            type_: "qms_quality_analysis".to_string(),
            name: "质量分析报表".to_string(),
            module: "qms".to_string(),
        },
        ReportTypeInfo {
            type_: "qms_defect_stats".to_string(),
            name: "缺陷统计报表".to_string(),
            module: "qms".to_string(),
        },
        ReportTypeInfo {
            type_: "ehs_safety_check".to_string(),
            name: "安全检查报表".to_string(),
            module: "ehs".to_string(),
        },
        ReportTypeInfo {
            type_: "ehs_risk_assessment".to_string(),
            name: "风险评估报表".to_string(),
            module: "ehs".to_string(),
        },
        ReportTypeInfo {
            type_: "srm_supplier_eval".to_string(),
            name: "供应商评估报表".to_string(),
            module: "srm".to_string(),
        },
        ReportTypeInfo {
            type_: "srm_purchase_stats".to_string(),
            name: "采购统计报表".to_string(),
            module: "srm".to_string(),
        },
        ReportTypeInfo {
            type_: "pdm_production_stats".to_string(),
            name: "生产统计报表".to_string(),
            module: "pdm".to_string(),
        },
        ReportTypeInfo {
            type_: "pdm_process_summary".to_string(),
            name: "工艺汇总报表".to_string(),
            module: "pdm".to_string(),
        },
    ];

    Json(ApiResponse::success(report_types, "获取报表类型列表成功"))
}

/// GET /api/v1/reports - 获取报表列表
pub async fn list_reports(
    State(pool): State<PgPool>,
    Query(query): Query<PaginationQuery>,
) -> Json<ApiResponse<Vec<Report>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let reports = match query.report_type {
        Some(ref report_type) => {
            sqlx::query_as::<_, Report>(
                r#"
                SELECT id, config, template_id, data, row_count, created_at, updated_at
                FROM report.reports
                WHERE config->>'report_type' = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(report_type)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&pool)
            .await
        }
        None => {
            sqlx::query_as::<_, Report>(
                r#"
                SELECT id, config, template_id, data, row_count, created_at, updated_at
                FROM report.reports
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&pool)
            .await
        }
    };

    match reports {
        Ok(reports) => Json(ApiResponse::success(reports, "获取报表列表成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取报表列表失败: {}", e))),
    }
}

/// POST /api/v1/reports - 创建报表
pub async fn create_report(
    State(pool): State<PgPool>,
    Json(req): Json<CreateReportRequest>,
) -> Json<ApiResponse<Report>> {
    let id = Uuid::new_v4();
    let config_json = serde_json::to_value(&req.config).unwrap_or_default();
    let template_id = req.use_template;

    // 如果指定了模板，获取模板的列定义
    let columns: Option<serde_json::Value> = if let Some(tid) = template_id {
        sqlx::query_scalar("SELECT columns FROM report.templates WHERE id = $1")
            .bind(tid)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten()
    } else {
        None
    };

    // 更新配置中的列定义
    let final_config = if let Some(cols) = columns {
        let mut config = req.config.clone();
        let cols_vec: Vec<String> = serde_json::from_value(cols).unwrap_or_default();
        config.columns = cols_vec;
        serde_json::to_value(config).unwrap_or_default()
    } else {
        config_json
    };

    let result = sqlx::query_as::<_, Report>(
        r#"
        INSERT INTO report.reports (id, config, template_id, data, row_count)
        VALUES ($1, $2, $3, '[]'::jsonb, 0)
        RETURNING id, config, template_id, data, row_count, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&final_config)
    .bind(template_id)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(report) => Json(ApiResponse::success(report, "创建报表成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建报表失败: {}", e))),
    }
}

/// GET /api/v1/reports/{id} - 获取报表详情
pub async fn get_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Report>> {
    let result = sqlx::query_as::<_, Report>(
        "SELECT id, config, template_id, data, row_count, created_at, updated_at FROM report.reports WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(report)) => Json(ApiResponse::success(report, "获取报表详情成功")),
        Ok(None) => Json(ApiResponse::error(404, "报表不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取报表详情失败: {}", e))),
    }
}

/// DELETE /api/v1/reports/{id} - 删除报表
pub async fn delete_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM report.reports WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Json(ApiResponse::success((), "删除报表成功")),
        Ok(_) => Json(ApiResponse::error(404, "报表不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除报表失败: {}", e))),
    }
}

/// POST /api/v1/reports/{id}/export - 导出报表
pub async fn export_report(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<ExportReportRequest>,
) -> Json<ApiResponse<ExportResult>> {
    // 获取报表信息
    let report = sqlx::query_as::<_, Report>(
        "SELECT id, config, template_id, data, row_count, created_at, updated_at FROM report.reports WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match report {
        Ok(Some(report)) => {
            let config: ReportConfig =
                serde_json::from_value(report.config.clone()).unwrap_or(ReportConfig {
                    report_type: "unknown".to_string(),
                    format: "excel".to_string(),
                    title: "报表".to_string(),
                    description: None,
                    columns: vec![],
                    date_range: None,
                    filters: None,
                });

            let filename = req.custom_filename.unwrap_or_else(|| {
                format!(
                    "{}_{}_{}.{}",
                    config.report_type,
                    Utc::now().format("%Y%m%d%H%M%S"),
                    id,
                    req.format
                )
            });

            let download_url = format!("/api/v1/downloads/{}", filename);

            let result = ExportResult {
                filename,
                format: req.format,
                content_type: "application/octet-stream".to_string(),
                row_count: report.row_count,
                report_type: config.report_type,
                download_url,
            };

            Json(ApiResponse::success(result, "导出报表成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "报表不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("导出报表失败: {}", e))),
    }
}

/// GET /api/v1/templates - 获取模板列表
pub async fn list_templates(
    State(pool): State<PgPool>,
    Query(query): Query<TemplateQuery>,
) -> Json<ApiResponse<Vec<ReportTemplate>>> {
    let templates = match query.report_type {
        Some(ref report_type) => {
            sqlx::query_as::<_, ReportTemplate>(
                "SELECT id, name, report_type, columns, description, created_at, updated_at FROM report.templates WHERE report_type = $1 ORDER BY created_at DESC",
            )
            .bind(report_type)
            .fetch_all(&pool)
            .await
        }
        None => {
            sqlx::query_as::<_, ReportTemplate>(
                "SELECT id, name, report_type, columns, description, created_at, updated_at FROM report.templates ORDER BY created_at DESC",
            )
            .fetch_all(&pool)
            .await
        }
    };

    match templates {
        Ok(templates) => Json(ApiResponse::success(templates, "获取模板列表成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取模板列表失败: {}", e))),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub report_type: String,
    pub columns: Vec<String>,
    pub description: Option<String>,
}

/// POST /api/v1/templates - 创建模板
pub async fn create_template(
    State(pool): State<PgPool>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<ReportTemplate>> {
    let id = Uuid::new_v4();
    let columns_json = serde_json::to_value(&req.columns).unwrap_or_default();

    let result = sqlx::query_as::<_, ReportTemplate>(
        r#"
        INSERT INTO report.templates (id, name, report_type, columns, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, report_type, columns, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.report_type)
    .bind(&columns_json)
    .bind(&req.description)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "创建模板成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建模板失败: {}", e))),
    }
}

/// GET /api/v1/templates/{id} - 获取模板详情
pub async fn get_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ReportTemplate>> {
    let result = sqlx::query_as::<_, ReportTemplate>(
        "SELECT id, name, report_type, columns, description, created_at, updated_at FROM report.templates WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(template)) => Json(ApiResponse::success(template, "获取模板详情成功")),
        Ok(None) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取模板详情失败: {}", e))),
    }
}

/// DELETE /api/v1/templates/{id} - 删除模板
pub async fn delete_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM report.templates WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Json(ApiResponse::success((), "删除模板成功")),
        Ok(_) => Json(ApiResponse::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除模板失败: {}", e))),
    }
}

/// GET /api/v1/reports-center/stats - 获取报表中心统计
pub async fn get_reports_center_stats(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<ReportsCenterStats>> {
    let stats = match fetch_reports_center_stats(&pool).await {
        Ok(stats) => stats,
        Err(_) => ReportsCenterStats {
            dashboard: DashboardStats {
                total_users: 0,
                active_users: 0,
                total_roles: 0,
                total_permissions: 0,
                total_companies: 0,
                total_departments: 0,
                total_employees: 0,
                recent_activities: 0,
            },
            user_growth: vec![],
            role_distribution: vec![],
            activity_types: vec![],
        },
    };

    Json(ApiResponse::success(stats, "获取报表中心统计成功"))
}

#[derive(Debug, Deserialize)]
pub struct ExportStatsRequest {
    pub format: Option<String>,
    pub date_range: Option<DateRange>,
}

/// POST /api/v1/reports-center/export/{report_type} - 导出统计报表
pub async fn export_stats_report(
    State(_pool): State<PgPool>,
    Path(report_type): Path<String>,
    Json(req): Json<ExportStatsRequest>,
) -> Json<ApiResponse<ExportResult>> {
    let format = req.format.unwrap_or_else(|| "excel".to_string());
    let filename = format!(
        "{}_{}.{}",
        report_type,
        Utc::now().format("%Y%m%d%H%M%S"),
        format
    );
    let download_url = format!("/api/v1/downloads/{}", filename);

    let result = ExportResult {
        filename,
        format,
        content_type: "application/octet-stream".to_string(),
        row_count: 0,
        report_type,
        download_url,
    };

    Json(ApiResponse::success(result, "导出统计报表成功"))
}
