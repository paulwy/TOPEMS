use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use lopdf::{Dictionary, Document, Object, Stream};
use sqlx::types::Uuid;
use tracing::{info, warn};

use crate::shared::AppState;

use super::models::ExportFormatQuery;

#[utoipa::path(
    get,
    path = "/dashboard/{id}/export",
    tag = "Dashboard",
    operation_id = "export_dashboard",
    responses((status = 200, description = "OK")),
)]
pub async fn export_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<ExportFormatQuery>,
) -> Json<serde_json::Value> {
    info!("Exporting dashboard: {} format: {:?}", id, query.format);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get dashboard: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let export_data = serde_json::json!({
                "version": "1.0",
                "dashboard": {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "layout": row.layout,
                    "owner_id": row.owner_id,
                    "is_public": row.is_public.unwrap_or(false),
                    "created_at": row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                    "updated_at": row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
                },
                "export_time": Utc::now().to_string(),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Export dashboard",
                "data": export_data,
                "format": query.format.unwrap_or_else(|| "json".to_string()),
            }))
        }
        None => Json(topems_shared_core::response::error_value(
            500,
            "Dashboard not found",
        )),
    }
}

#[utoipa::path(
    get,
    path = "/dashboard/{id}/export/pdf",
    tag = "Dashboard",
    operation_id = "export_dashboard_pdf",
    responses((status = 200, description = "OK")),
)]
pub async fn export_dashboard_pdf(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, StatusCode> {
    info!("Exporting dashboard as PDF: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            warn!("Failed to get dashboard for PDF export: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let dashboard = match row {
        Some(row) => row,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to get widgets for PDF export: {}", e);
            vec![]
        }
    };

    let mut doc = Document::with_version("1.4");
    let pages_id = doc.new_object_id();
    let catalog_id = doc.new_object_id();

    let mut page_content = format!(
        "BT /F1 24 Tf 100 750 Td (Dashboard: {}) Tj ET\n",
        escape_pdf_string(&dashboard.name)
    );
    page_content.push_str(&format!(
        "BT /F1 12 Tf 100 720 Td (ID: {}) Tj ET\n",
        dashboard.id
    ));
    if let Some(desc) = &dashboard.description {
        page_content.push_str(&format!(
            "BT /F1 12 Tf 100 700 Td (Description: {}) Tj ET\n",
            escape_pdf_string(desc)
        ));
    }
    page_content.push_str(&format!(
        "BT /F1 12 Tf 100 680 Td (Exported: {}) Tj ET\n",
        Utc::now().to_rfc3339()
    ));

    let mut y = 640.0;
    page_content.push_str("BT /F1 14 Tf 100 640 Td (Widgets:) Tj ET\n");
    y -= 20.0;

    for widget in &widgets {
        page_content.push_str(&format!(
            "BT /F1 10 Tf 120 {} Td (- {} [{}]) Tj ET\n",
            y,
            escape_pdf_string(&widget.name),
            escape_pdf_string(&widget.widget_type)
        ));
        y -= 15.0;
    }

    let content_id = doc.new_object_id();
    let content = Stream::new(Dictionary::new(), page_content.into_bytes());

    let page_id = doc.new_object_id();
    let mut page = Dictionary::new();
    page.set("Type", Object::Name(b"Page".to_vec()));
    page.set("Parent", Object::Reference(pages_id));
    page.set(
        "MediaBox",
        Object::Array(vec![
            Object::Integer(0),
            Object::Integer(0),
            Object::Integer(612),
            Object::Integer(792),
        ]),
    );
    page.set("Contents", Object::Reference(content_id));

    let mut font_dict = Dictionary::new();
    font_dict.set("Type", Object::Name(b"Font".to_vec()));
    font_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
    font_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));

    let mut font_map = Dictionary::new();
    font_map.set("F1", Object::Dictionary(font_dict));

    let mut resources = Dictionary::new();
    resources.set("Font", Object::Dictionary(font_map));
    page.set("Resources", Object::Dictionary(resources));

    doc.objects.insert(page_id, Object::Dictionary(page));
    doc.objects.insert(content_id, Object::Stream(content));

    let mut pages = Dictionary::new();
    pages.set("Type", Object::Name(b"Pages".to_vec()));
    pages.set("Kids", Object::Array(vec![Object::Reference(page_id)]));
    pages.set("Count", Object::Integer(1));
    doc.objects.insert(pages_id, Object::Dictionary(pages));

    let mut catalog = Dictionary::new();
    catalog.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog.set("Pages", Object::Reference(pages_id));
    doc.objects.insert(catalog_id, Object::Dictionary(catalog));
    doc.trailer.set("Root", Object::Reference(catalog_id));

    let mut pdf_bytes = Vec::new();
    if let Err(e) = doc.save_to(&mut pdf_bytes) {
        warn!("Failed to save PDF: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok((
        [
            (
                header::CONTENT_TYPE,
                header::HeaderValue::from_static("application/pdf"),
            ),
            (
                header::CONTENT_DISPOSITION,
                header::HeaderValue::from_str(&format!(
                    "attachment; filename=\"dashboard_{}.pdf\"",
                    id
                ))
                .unwrap_or_else(|_| header::HeaderValue::from_static("attachment")),
            ),
        ],
        pdf_bytes,
    ))
}

fn escape_pdf_string(s: &str) -> String {
    s.replace('(', "\\(")
        .replace(')', "\\)")
        .replace('\\', "\\\\")
}

#[utoipa::path(
    get,
    path = "/dashboard/{id}/export/excel",
    tag = "Dashboard",
    operation_id = "export_dashboard_excel",
    responses((status = 200, description = "OK")),
)]
pub async fn export_dashboard_excel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, StatusCode> {
    info!("Exporting dashboard as Excel/CSV: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            warn!("Failed to get dashboard for Excel export: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let dashboard = match row {
        Some(row) => row,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to get widgets for Excel export: {}", e);
            vec![]
        }
    };

    let mut csv_writer = csv::Writer::from_writer(Vec::new());

    let _ = csv_writer.write_record(["Dashboard Export"]);
    let _ = csv_writer.write_record(["ID", &dashboard.id.to_string()]);
    let _ = csv_writer.write_record(["Name", &dashboard.name]);
    let _ = csv_writer.write_record(["Description", &dashboard.description.unwrap_or_default()]);
    let _ = csv_writer.write_record(["Owner", &dashboard.owner_id]);
    let _ = csv_writer.write_record(["Public", &dashboard.is_public.unwrap_or(false).to_string()]);
    let _ = csv_writer.write_record([""; 0]);

    let _ = csv_writer.write_record(["Widgets"]);
    let _ = csv_writer.write_record(["Widget ID", "Name", "Type", "Config"]);
    for widget in &widgets {
        let config_str = widget
            .config
            .as_ref()
            .map(|c| c.to_string())
            .unwrap_or_default();
        let _ = csv_writer.write_record([
            &widget.id.to_string(),
            &widget.name,
            &widget.widget_type,
            &config_str,
        ]);
    }

    let csv_data = match csv_writer.into_inner() {
        Ok(data) => data,
        Err(e) => {
            warn!("Failed to generate CSV: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    Ok((
        [
            (
                header::CONTENT_TYPE,
                header::HeaderValue::from_static("text/csv; charset=utf-8"),
            ),
            (
                header::CONTENT_DISPOSITION,
                header::HeaderValue::from_str(&format!(
                    "attachment; filename=\"dashboard_{}.csv\"",
                    id
                ))
                .unwrap_or_else(|_| header::HeaderValue::from_static("attachment")),
            ),
        ],
        csv_data,
    ))
}
