use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use chrono::DateTime;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

use super::{datetime_to_string, opt_big_decimal_to_f64};

#[derive(Debug, Clone, Deserialize)]
pub struct ListStandardsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    inspection_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StandardValueInput {
    pub item_name: String,
    pub lower_limit: Option<f64>,
    pub upper_limit: Option<f64>,
    pub unit: Option<String>,
    pub inspection_method: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateStandardRequest {
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: String,
    pub standard_values: Option<Vec<StandardValueInput>>,
    pub status: Option<String>,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateStandardRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: Option<String>,
    pub standard_values: Option<Vec<StandardValueInput>>,
    pub status: Option<String>,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StandardValueResponse {
    pub id: String,
    pub standard_id: String,
    pub item_name: String,
    pub lower_limit: Option<f64>,
    pub upper_limit: Option<f64>,
    pub unit: Option<String>,
    pub inspection_method: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StandardResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub inspection_type: String,
    pub standard_values: Vec<StandardValueResponse>,
    pub status: String,
    pub version: Option<String>,
    pub effective_date: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_standards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListStandardsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qs.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(inspection_type) = query.inspection_type {
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE qs.inspection_type = ${}", idx));
        } else {
            where_clause.push_str(&format!(" AND qs.inspection_type = ${}", idx));
        }
        params.push(serde_json::Value::String(inspection_type));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qs.code ILIKE ${} OR qs.name ILIKE ${} OR qs.product_code ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qs.code ILIKE ${} OR qs.name ILIKE ${} OR qs.product_code ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_standards qs{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qs.id, qs.code, qs.name, qs.product_code, qs.product_name,
            qs.inspection_type, qs.status, qs.version,
            qs.effective_date, qs.description,
            qs.created_at, qs.updated_at
        FROM quality_standards qs
        {}
        ORDER BY qs.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );
    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let standard_ids: Vec<Uuid> = rows
        .iter()
        .filter_map(|r| r.try_get::<Uuid, _>("id").ok())
        .collect();

    let mut values_map: std::collections::HashMap<Uuid, Vec<StandardValueResponse>> =
        std::collections::HashMap::new();

    if !standard_ids.is_empty() {
        let values_result = sqlx::query!(
            r#"
            SELECT
                qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
                qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
            FROM quality_standard_values qsv
            WHERE qsv.standard_id = ANY($1)
            "#,
            &standard_ids,
        )
        .fetch_all(&state.pool)
        .await;

        if let Ok(value_rows) = values_result {
            for v in value_rows {
                let sid = v.standard_id;
                values_map.entry(sid.unwrap_or_default()).or_default().push(
                    StandardValueResponse {
                        id: v.id.to_string(),
                        standard_id: sid.map(|d| d.to_string()).unwrap_or_default(),
                        item_name: v.item_name,
                        lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                        unit: v.unit,
                        inspection_method: v.inspection_method,
                        remark: v.remark,
                    },
                );
            }
        }
    }

    let standards: Vec<StandardResponse> = rows
        .into_iter()
        .map(|r| {
            let sid = r.try_get::<Uuid, _>("id").unwrap_or_default();
            let values = values_map.remove(&sid).unwrap_or_default();
            StandardResponse {
                id: sid.to_string(),
                code: r.try_get::<String, _>("code").unwrap_or_default(),
                name: r.try_get::<String, _>("name").unwrap_or_default(),
                product_code: r
                    .try_get::<Option<String>, _>("product_code")
                    .ok()
                    .flatten(),
                product_name: r
                    .try_get::<Option<String>, _>("product_name")
                    .ok()
                    .flatten(),
                inspection_type: r
                    .try_get::<String, _>("inspection_type")
                    .unwrap_or_default(),
                standard_values: values,
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "active".to_string()),
                version: r.try_get::<Option<String>, _>("version").ok().flatten(),
                effective_date: r
                    .try_get::<Option<String>, _>("effective_date")
                    .ok()
                    .flatten(),
                description: r.try_get::<Option<String>, _>("description").ok().flatten(),
                created_at: datetime_to_string(
                    r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                        .ok()
                        .flatten(),
                ),
                updated_at: datetime_to_string(
                    r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                        .ok()
                        .flatten(),
                ),
            }
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "standards": standards,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": pagesize,
        }),
        "获取质量标准列表成功",
    ))
}

pub async fn get_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let standard_result = sqlx::query!(
        r#"
        SELECT
            qs.id, qs.code, qs.name, qs.product_code, qs.product_name,
            qs.inspection_type, qs.status, qs.version,
            qs.effective_date, qs.description,
            qs.created_at, qs.updated_at
        FROM quality_standards qs
        WHERE qs.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(404, "质量标准不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to get quality standard: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准失败"));
        }
    };

    let values_result = sqlx::query!(
        r#"
        SELECT
            qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
            qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
        FROM quality_standard_values qsv
        WHERE qsv.standard_id = $1
        "#,
        uuid,
    )
    .fetch_all(&state.pool)
    .await;

    let standard_values: Vec<StandardValueResponse> = match values_result {
        Ok(rows) => rows
            .into_iter()
            .map(|v| StandardValueResponse {
                id: v.id.to_string(),
                standard_id: v.standard_id.map(|d| d.to_string()).unwrap_or_default(),
                item_name: v.item_name,
                lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                unit: v.unit,
                inspection_method: v.inspection_method,
                remark: v.remark,
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to get standard values: {}", e);
            Vec::new()
        }
    };

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type.unwrap_or_default(),
            standard_values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version.map(|v| v.to_string()),
            effective_date: standard.effective_date.map(|d| d.to_string()),
            description: standard.description,
            created_at: datetime_to_string(Some(standard.created_at)),
            updated_at: datetime_to_string(Some(standard.updated_at)),
        },
        "获取质量标准成功",
    ))
}

pub async fn create_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateStandardRequest>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建质量标准失败"));
        }
    };

    let effective_date = body.effective_date.as_ref().and_then(|s| {
        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
            .map(|dt| dt)
            .ok()
            .or_else(|| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.naive_utc())
            })
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .and_then(|d| d.and_hms_opt(0, 0, 0).map(|dt| dt))
            })
    });
    let standard_result = sqlx::query_unchecked!(
        r#"
        INSERT INTO quality_standards (
            code, name, product_code, product_name, inspection_type,
            status, version, effective_date, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
            id, code, name, product_code, product_name,
            inspection_type, status, version,
            effective_date, description,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.product_code,
        body.product_name,
        body.inspection_type,
        body.status.unwrap_or_else(|| "active".to_string()),
        body.version,
        effective_date,
        body.description,
    )
    .fetch_one(&mut *tx)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create quality standard: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建质量标准失败"));
        }
    };

    let mut values: Vec<StandardValueResponse> = Vec::new();

    if let Some(standard_values) = &body.standard_values {
        for v in standard_values {
            let lower_limit = v
                .lower_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());
            let upper_limit = v
                .upper_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());

            let value_result = sqlx::query!(
                r#"
                INSERT INTO quality_standard_values (
                    standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                "#,
                standard.id,
                v.item_name,
                lower_limit,
                upper_limit,
                v.unit,
                v.inspection_method,
                v.remark,
            )
            .fetch_one(&mut *tx)
            .await;

            match value_result {
                Ok(r) => {
                    values.push(StandardValueResponse {
                        id: r.id.to_string(),
                        standard_id: r.standard_id.map(|d| d.to_string()).unwrap_or_default(),
                        item_name: r.item_name,
                        lower_limit: opt_big_decimal_to_f64(r.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(r.upper_limit),
                        unit: r.unit,
                        inspection_method: r.inspection_method,
                        remark: r.remark,
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to insert standard value: {}", e);
                    let _ = tx.rollback().await;
                    return Json(ApiResponse::error(500, "创建质量标准值失败"));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建质量标准失败"));
    }

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type.unwrap_or_default(),
            standard_values: values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version.map(|v| v.to_string()),
            effective_date: standard.effective_date.map(|d| d.to_string()),
            description: standard.description,
            created_at: datetime_to_string(Some(standard.created_at)),
            updated_at: datetime_to_string(Some(standard.updated_at)),
        },
        "创建质量标准成功",
    ))
}

pub async fn update_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<StandardResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "更新质量标准失败"));
        }
    };

    let effective_date = body.effective_date.as_ref().and_then(|s| {
        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
            .map(|dt| dt)
            .ok()
            .or_else(|| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.naive_utc())
            })
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .and_then(|d| d.and_hms_opt(0, 0, 0).map(|dt| dt))
            })
    });
    let standard_result = sqlx::query_unchecked!(
        r#"
        UPDATE quality_standards
        SET
            code = COALESCE($1, code),
            name = COALESCE($2, name),
            product_code = COALESCE($3, product_code),
            product_name = COALESCE($4, product_name),
            inspection_type = COALESCE($5, inspection_type),
            status = COALESCE($6, status),
            version = COALESCE($7, version),
            effective_date = COALESCE($8, effective_date),
            description = COALESCE($9, description),
            updated_at = NOW()
        WHERE id = $10
        RETURNING
            id, code, name, product_code, product_name,
            inspection_type, status, version,
            effective_date, description,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.product_code,
        body.product_name,
        body.inspection_type,
        body.status,
        body.version,
        effective_date,
        body.description,
        uuid,
    )
    .fetch_one(&mut *tx)
    .await;

    let standard = match standard_result {
        Ok(r) => r,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(404, "质量标准不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to update quality standard: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "更新质量标准失败"));
        }
    };

    let mut values: Vec<StandardValueResponse> = Vec::new();

    if let Some(standard_values) = &body.standard_values {
        let delete_result = sqlx::query!(
            r#"
            UPDATE quality_standard_values SET deleted_at = NOW() WHERE standard_id = $1
            "#,
            uuid,
        )
        .execute(&mut *tx)
        .await;

        if let Err(e) = delete_result {
            tracing::error!("Failed to clear standard values: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "更新质量标准值失败"));
        }

        for v in standard_values {
            let lower_limit = v
                .lower_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());
            let upper_limit = v
                .upper_limit
                .and_then(|x| BigDecimal::from_str(&x.to_string()).ok());

            let value_result = sqlx::query!(
                r#"
                INSERT INTO quality_standard_values (
                    standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, standard_id, item_name, lower_limit, upper_limit,
                    unit, inspection_method, remark
                "#,
                uuid,
                v.item_name,
                lower_limit,
                upper_limit,
                v.unit,
                v.inspection_method,
                v.remark,
            )
            .fetch_one(&mut *tx)
            .await;

            match value_result {
                Ok(r) => {
                    values.push(StandardValueResponse {
                        id: r.id.to_string(),
                        standard_id: r.standard_id.map(|d| d.to_string()).unwrap_or_default(),
                        item_name: r.item_name,
                        lower_limit: opt_big_decimal_to_f64(r.lower_limit),
                        upper_limit: opt_big_decimal_to_f64(r.upper_limit),
                        unit: r.unit,
                        inspection_method: r.inspection_method,
                        remark: r.remark,
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to insert standard value: {}", e);
                    let _ = tx.rollback().await;
                    return Json(ApiResponse::error(500, "更新质量标准值失败"));
                }
            }
        }
    } else {
        let values_result = sqlx::query!(
            r#"
            SELECT
                qsv.id, qsv.standard_id, qsv.item_name, qsv.lower_limit,
                qsv.upper_limit, qsv.unit, qsv.inspection_method, qsv.remark
            FROM quality_standard_values qsv
            WHERE qsv.standard_id = $1
            "#,
            uuid,
        )
        .fetch_all(&mut *tx)
        .await;

        if let Ok(rows) = values_result {
            for v in rows {
                values.push(StandardValueResponse {
                    id: v.id.to_string(),
                    standard_id: v.standard_id.map(|d| d.to_string()).unwrap_or_default(),
                    item_name: v.item_name,
                    lower_limit: opt_big_decimal_to_f64(v.lower_limit),
                    upper_limit: opt_big_decimal_to_f64(v.upper_limit),
                    unit: v.unit,
                    inspection_method: v.inspection_method,
                    remark: v.remark,
                });
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "更新质量标准失败"));
    }

    Json(ApiResponse::success(
        StandardResponse {
            id: standard.id.to_string(),
            code: standard.code,
            name: standard.name,
            product_code: standard.product_code,
            product_name: standard.product_name,
            inspection_type: standard.inspection_type.unwrap_or_default(),
            standard_values: values,
            status: standard.status.unwrap_or_else(|| "active".to_string()),
            version: standard.version.map(|v| v.to_string()),
            effective_date: standard.effective_date.map(|d| d.to_string()),
            description: standard.description,
            created_at: datetime_to_string(Some(standard.created_at)),
            updated_at: datetime_to_string(Some(standard.updated_at)),
        },
        "更新质量标准成功",
    ))
}

pub async fn delete_standard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的质量标准ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_standards SET deleted_at = NOW() WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除质量标准成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality standard: {}", e);
            Json(ApiResponse::error(500, "删除质量标准失败"))
        }
    }
}
