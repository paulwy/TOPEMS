use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{DateTime, Utc};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::utils::default_tenant_id;

pub async fn list_voucher_templates(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = default_tenant_id();

    let rows = match sqlx::query(
        r#"SELECT id, name, voucher_type, applicable_module, status, is_default, created_at
           FROM core_finance_voucher_templates WHERE tenant_id = $1"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证模板失败: {}", e);
            return Json(api_error(500, "查询凭证模板失败"));
        }
    };

    let templates: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "voucher_type": row.get::<String, _>("voucher_type"),
                "applicable_module": row.get::<Option<String>, _>("applicable_module"),
                "status": row.get::<String, _>("status"),
                "is_default": row.get::<bool, _>("is_default"),
                "created_at": row.get::<DateTime<Utc>, _>("created_at"),
            })
        })
        .collect();

    Json(api_success(templates))
}

pub async fn get_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();

    let row = match sqlx::query(
        r#"SELECT id, name, voucher_type, applicable_module, status, is_default, template_data, created_at
           FROM core_finance_voucher_templates WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证模板失败: {}", e);
            return Json(api_error(500, "查询凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "applicable_module": row.get::<Option<String>, _>("applicable_module"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "template_data": row.get::<serde_json::Value, _>("template_data"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn create_voucher_template(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let voucher_type = body
        .get("voucher_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let is_default = body
        .get("is_default")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let template_data = body
        .get("template_data")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    if name.is_empty() || voucher_type.is_empty() {
        return Json(api_error(400, "名称和类型不能为空"));
    }

    let row = match sqlx::query(
        r#"INSERT INTO core_finance_voucher_templates
           (tenant_id, name, voucher_type, status, is_default, template_data)
           VALUES ($1, $2, $3, 'active', $4, $5)
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(tenant_id)
    .bind(name)
    .bind(voucher_type)
    .bind(is_default)
    .bind(template_data)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建凭证模板失败: {}", e);
            return Json(api_error(500, "创建凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(500, "创建凭证模板失败")),
    };

    Json(api_success(template))
}

pub async fn update_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let name = body.get("name").and_then(|v| v.as_str());
    let voucher_type = body.get("voucher_type").and_then(|v| v.as_str());
    let is_default = body.get("is_default").and_then(|v| v.as_bool());

    let row = match sqlx::query(
        r#"UPDATE core_finance_voucher_templates
           SET name = COALESCE($1, name),
               voucher_type = COALESCE($2, voucher_type),
               is_default = COALESCE($3, is_default),
               updated_at = NOW()
           WHERE tenant_id = $4 AND id = $5
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(name)
    .bind(voucher_type)
    .bind(is_default)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新凭证模板失败: {}", e);
            return Json(api_error(500, "更新凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn delete_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query("DELETE FROM core_finance_voucher_templates WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::error!("删除凭证模板失败: {}", e);
            Json(api_error(500, "删除凭证模板失败"))
        }
    }
}

pub async fn copy_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let new_name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("复制模板");

    let row = match sqlx::query(
        r#"INSERT INTO core_finance_voucher_templates
           (tenant_id, name, voucher_type, applicable_module, status, is_default, template_data)
           SELECT $1, $2, voucher_type, applicable_module, status, false, template_data
           FROM core_finance_voucher_templates WHERE tenant_id = $3 AND id = $4
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(tenant_id)
    .bind(new_name)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("复制凭证模板失败: {}", e);
            return Json(api_error(500, "复制凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn set_default_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let _ = sqlx::query(
        r#"UPDATE core_finance_voucher_templates SET is_default = false WHERE tenant_id = $1"#,
    )
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    let result = sqlx::query(
        r#"UPDATE core_finance_voucher_templates SET is_default = true WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::error!("设置默认凭证模板失败: {}", e);
            Json(api_error(500, "设置默认凭证模板失败"))
        }
    }
}
