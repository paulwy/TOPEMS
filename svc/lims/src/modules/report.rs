use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

#[derive(Debug, Serialize)]
pub struct InspectionReport {
    pub id: String,
    pub tenant_id: String,
    pub report_no: String,
    pub sample_id: String,
    pub sample_no: String,
    pub sample_name: String,
    pub inspection_date: String,
    pub inspector: String,
    pub inspection_items: Vec<InspectionItem>,
    pub conclusion: String,
    pub remark: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct InspectionItem {
    pub item_name: String,
    pub method: String,
    pub unit: Option<String>,
    pub standard: String,
    pub result: String,
    pub is_conforming: bool,
}

#[derive(Debug, Deserialize)]
pub struct GenerateReportRequest {
    pub sample_id: String,
    pub inspector: String,
    pub inspection_results: Vec<InspectionResultItem>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InspectionResultItem {
    pub item_name: String,
    pub method: String,
    pub unit: Option<String>,
    pub standard: String,
    pub result: String,
}

#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub sample_name: Option<String>,
    pub status: Option<String>,
}

pub async fn list_reports(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<ReportQuery>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let base_sql = r#"
        SELECT id, report_no, sample_id, sample_no, sample_name, inspection_date,
               inspector, inspection_items, conclusion, remark, status, created_at
        FROM qa_lab_inspection_reports
        WHERE ($1::text IS NULL OR sample_name LIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;

    let search_pattern = query.sample_name.as_ref().map(|n| format!("%{}%", n));

    let rows = sqlx::query(base_sql)
        .bind(&search_pattern)
        .bind(&query.status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await;

    match rows {
        Ok(rows) => {
            let reports: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<String, _>("id"),
                        "report_no": row.get::<String, _>("report_no"),
                        "sample_id": row.get::<String, _>("sample_id"),
                        "sample_no": row.get::<String, _>("sample_no"),
                        "sample_name": row.get::<String, _>("sample_name"),
                        "inspection_date": row.get::<Option<String>, _>("inspection_date"),
                        "inspector": row.get::<Option<String>, _>("inspector"),
                        "inspection_items": row.get::<Option<serde_json::Value>, _>("inspection_items"),
                        "conclusion": row.get::<Option<String>, _>("conclusion"),
                        "remark": row.get::<Option<String>, _>("remark"),
                        "status": row.get::<Option<String>, _>("status"),
                        "created_at": row.get::<Option<String>, _>("created_at"),
                    })
                })
                .collect();
            Json(ApiResponse::success(reports, "获取检测报告列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch reports: {}", e);
            Json(ApiResponse::error(500, "获取检测报告列表失败"))
        }
    }
}

pub async fn get_report(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的报告ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT id, report_no, sample_id, sample_no, sample_name, inspection_date,
               inspector, inspection_items, conclusion, remark, status, created_at
        FROM qa_lab_inspection_reports
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => {
            let report = serde_json::json!({
                "id": r.get::<String, _>("id"),
                "report_no": r.get::<String, _>("report_no"),
                "sample_id": r.get::<String, _>("sample_id"),
                "sample_no": r.get::<String, _>("sample_no"),
                "sample_name": r.get::<String, _>("sample_name"),
                "inspection_date": r.get::<Option<String>, _>("inspection_date"),
                "inspector": r.get::<Option<String>, _>("inspector"),
                "inspection_items": r.get::<Option<serde_json::Value>, _>("inspection_items"),
                "conclusion": r.get::<Option<String>, _>("conclusion"),
                "remark": r.get::<Option<String>, _>("remark"),
                "status": r.get::<Option<String>, _>("status"),
                "created_at": r.get::<Option<String>, _>("created_at"),
            });
            Json(ApiResponse::success(report, "获取检测报告成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "报告不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch report: {}", e);
            Json(ApiResponse::error(500, "获取检测报告失败"))
        }
    }
}

pub async fn generate_report(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let sample_id = match Uuid::parse_str(&req.sample_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的样品ID")),
    };

    // Get sample info
    let sample_row = sqlx::query(
        r#"
        SELECT sample_no, sample_name, sample_type, source, quantity, unit
        FROM qa_lab_samples WHERE id = $1
        "#,
    )
    .bind(sample_id)
    .fetch_optional(&state.pool)
    .await;

    let (sample_no, sample_name, _sample_type, _source) = match sample_row {
        Ok(Some(row)) => (
            row.get::<String, _>("sample_no"),
            row.get::<String, _>("sample_name"),
            row.get::<Option<String>, _>("sample_type"),
            row.get::<Option<String>, _>("source"),
        ),
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    // Determine conclusion based on inspection results
    let all_conforming = req
        .inspection_results
        .iter()
        .all(|item| is_result_conforming(&item.result, &item.standard));

    let conclusion = if all_conforming {
        "合格".to_string()
    } else {
        "不合格".to_string()
    };

    // Convert inspection items to JSON
    let inspection_items: Vec<serde_json::Value> = req
        .inspection_results
        .iter()
        .map(|item| {
            serde_json::json!({
                "item_name": item.item_name,
                "method": item.method,
                "unit": item.unit,
                "standard": item.standard,
                "result": item.result,
                "is_conforming": is_result_conforming(&item.result, &item.standard),
            })
        })
        .collect();

    let report_no = format!("RPT-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let report_id = Uuid::new_v4();
    let inspection_date = chrono::Utc::now().to_rfc3339();

    let row = sqlx::query(
        r#"
        INSERT INTO qa_lab_inspection_reports (
            id, report_no, sample_id, sample_no, sample_name, inspection_date,
            inspector, inspection_items, conclusion, remark, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW())
        RETURNING id, report_no, sample_id, sample_no, sample_name, inspection_date,
                  inspector, inspection_items, conclusion, remark, status, created_at
        "#,
    )
    .bind(report_id)
    .bind(&report_no)
    .bind(sample_id)
    .bind(&sample_no)
    .bind(&sample_name)
    .bind(&inspection_date)
    .bind(&req.inspector)
    .bind(&inspection_items)
    .bind(&conclusion)
    .bind(&req.remark)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            // Update sample status
            let _ = sqlx::query(
                "UPDATE qa_lab_samples SET status = 'completed', updated_at = NOW() WHERE id = $1",
            )
            .bind(sample_id)
            .execute(&state.pool)
            .await;

            let report = serde_json::json!({
                "id": r.get::<String, _>("id"),
                "report_no": r.get::<String, _>("report_no"),
                "sample_id": r.get::<String, _>("sample_id"),
                "sample_no": r.get::<String, _>("sample_no"),
                "sample_name": r.get::<String, _>("sample_name"),
                "inspection_date": r.get::<Option<String>, _>("inspection_date"),
                "inspector": r.get::<Option<String>, _>("inspector"),
                "inspection_items": r.get::<Option<serde_json::Value>, _>("inspection_items"),
                "conclusion": r.get::<Option<String>, _>("conclusion"),
                "remark": r.get::<Option<String>, _>("remark"),
                "status": r.get::<Option<String>, _>("status"),
                "created_at": r.get::<Option<String>, _>("created_at"),
            });
            Json(ApiResponse::success(report, "检测报告生成成功"))
        }
        Err(e) => {
            tracing::error!("Failed to generate report: {}", e);
            Json(ApiResponse::error(500, "生成检测报告失败"))
        }
    }
}

fn is_result_conforming(result: &str, standard: &str) -> bool {
    // Parse standard format like ">10" "<100" "5-10" "pass" etc.
    let result_val: f64 = result.trim().parse().unwrap_or(0.0);

    let standard = standard.trim();

    if standard.eq_ignore_ascii_case("pass") || standard.eq_ignore_ascii_case("合格") {
        return result.eq_ignore_ascii_case("pass") || result.eq_ignore_ascii_case("合格");
    }

    if standard.contains('-') {
        let parts: Vec<&str> = standard.split('-').collect();
        if parts.len() == 2 {
            if let (Ok(min), Ok(max)) = (
                parts[0].trim().parse::<f64>(),
                parts[1].trim().parse::<f64>(),
            ) {
                return result_val >= min && result_val <= max;
            }
        }
    }

    if standard.starts_with('>') {
        if let Ok(threshold) = standard[1..].trim().parse::<f64>() {
            return result_val > threshold;
        }
    }

    if standard.starts_with(">=") {
        if let Ok(threshold) = standard[2..].trim().parse::<f64>() {
            return result_val >= threshold;
        }
    }

    if standard.starts_with('<') {
        if let Ok(threshold) = standard[1..].trim().parse::<f64>() {
            return result_val < threshold;
        }
    }

    if standard.starts_with("<=") {
        if let Ok(threshold) = standard[2..].trim().parse::<f64>() {
            return result_val <= threshold;
        }
    }

    // Default: compare as string
    result.eq_ignore_ascii_case(standard)
}

pub async fn approve_report(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的报告ID")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lab_inspection_reports
        SET status = 'approved', updated_at = NOW()
        WHERE id = $1 AND status = 'draft'
        RETURNING id, report_no, sample_id, sample_no, sample_name, inspection_date,
                  inspector, inspection_items, conclusion, remark, status, created_at
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => {
            let report = serde_json::json!({
                "id": r.get::<String, _>("id"),
                "report_no": r.get::<String, _>("report_no"),
                "sample_id": r.get::<String, _>("sample_id"),
                "sample_no": r.get::<String, _>("sample_no"),
                "sample_name": r.get::<String, _>("sample_name"),
                "inspection_date": r.get::<Option<String>, _>("inspection_date"),
                "inspector": r.get::<Option<String>, _>("inspector"),
                "inspection_items": r.get::<Option<serde_json::Value>, _>("inspection_items"),
                "conclusion": r.get::<Option<String>, _>("conclusion"),
                "remark": r.get::<Option<String>, _>("remark"),
                "status": r.get::<Option<String>, _>("status"),
                "created_at": r.get::<Option<String>, _>("created_at"),
            });
            Json(ApiResponse::success(report, "报告审核通过"))
        }
        Ok(None) => Json(ApiResponse::error(404, "报告不存在或状态不允许审核")),
        Err(e) => {
            tracing::error!("Failed to approve report: {}", e);
            Json(ApiResponse::error(500, "审核报告失败"))
        }
    }
}

pub async fn export_report_pdf(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的报告ID")),
    };

    let row = sqlx::query(
        r#"
        SELECT id, report_no, sample_id, sample_no, sample_name, inspection_date,
               inspector, inspection_items, conclusion, remark, status
        FROM qa_lab_inspection_reports
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => {
            // Generate PDF placeholder (in real implementation, use a PDF library)
            let report_data = serde_json::json!({
                "report_no": r.get::<String, _>("report_no"),
                "sample_no": r.get::<String, _>("sample_no"),
                "sample_name": r.get::<String, _>("sample_name"),
                "inspection_date": r.get::<Option<String>, _>("inspection_date"),
                "inspector": r.get::<Option<String>, _>("inspector"),
                "inspection_items": r.get::<Option<serde_json::Value>, _>("inspection_items"),
                "conclusion": r.get::<Option<String>, _>("conclusion"),
            });

            let pdf_url = format!("/api/lims/reports/{}/pdf", id);

            Json(ApiResponse::success(
                serde_json::json!({
                    "pdf_url": pdf_url,
                    "report_data": report_data,
                }),
                "PDF 导出准备完成",
            ))
        }
        Ok(None) => Json(ApiResponse::error(404, "报告不存在")),
        Err(e) => {
            tracing::error!("Failed to export report: {}", e);
            Json(ApiResponse::error(500, "导出报告失败"))
        }
    }
}
