use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/versions", get(list_versions).post(create_version))
        .route(
            "/versions/{id}",
            get(get_version).put(update_version).delete(delete_version),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Version {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub version_no: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub target_name: Option<String>,
    pub version_label: String,
    pub description: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVersionRequest {
    pub version_no: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub target_name: Option<String>,
    pub version_label: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVersionRequest {
    pub version_no: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
    pub target_name: Option<String>,
    pub version_label: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/versions",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<VersionQuery>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Version>(
        r#"
        SELECT id, tenant_id, version_no, target_type, target_id, target_name, version_label,
               description, status, created_by, created_at, updated_at
        FROM pdm_versions
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR version_no ILIKE $2 OR target_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR target_type = $4)
          AND ($5::uuid IS NULL OR target_id = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.target_type)
    .bind(query.target_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(versions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_versions
                WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR version_no ILIKE $2 OR target_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR target_type = $4)
                  AND ($5::uuid IS NULL OR target_id = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.target_type)
            .bind(query.target_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "versions": versions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取版本列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取版本列表失败: {}", e);
            Json(ApiResponse::error(500, "获取版本列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/versions",
    request_body = CreateVersionRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateVersionRequest>,
) -> Json<ApiResponse<Version>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.version_no.is_empty() {
        return Json(ApiResponse::error(400, "版本号不能为空"));
    }
    if req.version_label.is_empty() {
        return Json(ApiResponse::error(400, "版本标签不能为空"));
    }

    let result = sqlx::query_as::<_, Version>(
        r#"
        INSERT INTO pdm_versions (
            tenant_id, version_no, target_type, target_id, target_name, version_label,
            description, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, version_no, target_type, target_id, target_name, version_label,
                  description, status, created_by, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.version_no)
    .bind(&req.target_type)
    .bind(req.target_id)
    .bind(&req.target_name)
    .bind(&req.version_label)
    .bind(&req.description)
    .bind("draft")
    .bind(&req.created_by)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "版本创建成功")),
        Err(e) => {
            tracing::error!("创建版本失败: {}", e);
            Json(ApiResponse::error(500, "创建版本失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/versions/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Version>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let result = sqlx::query_as::<_, Version>(
        r#"
        SELECT id, tenant_id, version_no, target_type, target_id, target_name, version_label,
               description, status, created_by, created_at, updated_at
        FROM pdm_versions WHERE id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "获取版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("获取版本失败: {}", e);
            Json(ApiResponse::error(500, "获取版本失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/versions/{id}",
    request_body = UpdateVersionRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateVersionRequest>,
) -> Json<ApiResponse<Version>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = Utc::now();

    let result = sqlx::query_as::<_, Version>(
        r#"
        UPDATE pdm_versions SET
            version_no = COALESCE($2, version_no),
            target_type = COALESCE($3, target_type),
            target_id = COALESCE($4, target_id),
            target_name = COALESCE($5, target_name),
            version_label = COALESCE($6, version_label),
            description = COALESCE($7, description),
            status = COALESCE($8, status),
            created_by = COALESCE($9, created_by),
            updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, version_no, target_type, target_id, target_name, version_label,
                  description, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.version_no)
    .bind(req.target_type)
    .bind(req.target_id)
    .bind(req.target_name)
    .bind(req.version_label)
    .bind(req.description)
    .bind(req.status)
    .bind(req.created_by)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "版本更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("更新版本失败: {}", e);
            Json(ApiResponse::error(500, "更新版本失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/versions/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result =
        sqlx::query("UPDATE pdm_versions SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "版本删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("删除版本失败: {}", e);
            Json(ApiResponse::error(500, "删除版本失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "user-1".to_string(),
            username: "tester".to_string(),
            role: "admin".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let claims = make_claims(Some("550e8400-e29b-41d4-a716-446655440000"));
        let headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_from_header() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440040".parse().unwrap(),
        );
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440040").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_v4() {
        let claims = make_claims(None);
        let headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(tid.get_version(), Some(uuid::Version::Random));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        let _ = router.clone();
    }

    #[test]
    fn test_version_serde_roundtrip() {
        let now = Utc::now();
        let v = Version {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            version_no: "V-001".to_string(),
            target_type: "product".to_string(),
            target_id: Uuid::new_v4(),
            target_name: Some("产品A".to_string()),
            version_label: "1.0.0".to_string(),
            description: Some("初始版本".to_string()),
            status: "draft".to_string(),
            created_by: Some("u1".to_string()),
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&v).unwrap();
        let decoded: Version = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.version_no, "V-001");
        assert_eq!(decoded.target_type, "product");
        assert_eq!(decoded.version_label, "1.0.0");
        assert_eq!(decoded.status, "draft");
    }

    #[test]
    fn test_version_serde_none_optionals() {
        let now = Utc::now();
        let v = Version {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            version_no: "V-002".to_string(),
            target_type: "material".to_string(),
            target_id: Uuid::new_v4(),
            target_name: None,
            version_label: "0.1.0".to_string(),
            description: None,
            status: "draft".to_string(),
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&v).unwrap();
        assert!(json.contains("\"target_name\":null"));
        assert!(json.contains("\"created_by\":null"));
        let decoded: Version = serde_json::from_str(&json).unwrap();
        assert!(decoded.description.is_none());
    }

    #[test]
    fn test_create_version_request_deserialize() {
        let json = r#"{"version_no":"V1","target_type":"product","target_id":"550e8400-e29b-41d4-a716-446655440041","target_name":"n","version_label":"1.0","description":"d","created_by":"u"}"#;
        let req: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.version_no, "V1");
        assert_eq!(req.target_type, "product");
        assert_eq!(req.version_label, "1.0");
        assert_eq!(req.created_by, Some("u".to_string()));
    }

    #[test]
    fn test_create_version_request_minimal() {
        let json = r#"{"version_no":"V2","target_type":"t","target_id":"550e8400-e29b-41d4-a716-446655440042","version_label":"l"}"#;
        let req: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert!(req.target_name.is_none());
        assert!(req.description.is_none());
    }

    #[test]
    fn test_update_version_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateVersionRequest = serde_json::from_str(json).unwrap();
        assert!(req.version_no.is_none());
        assert!(req.status.is_none());
        assert!(req.target_id.is_none());
    }

    #[test]
    fn test_version_query_defaults() {
        let json = r#"{}"#;
        let q: VersionQuery = serde_json::from_str(json).unwrap();
        assert!(q.page.is_none());
        assert!(q.target_type.is_none());
        assert!(q.target_id.is_none());
    }

    #[test]
    fn test_version_query_with_filters() {
        let json = r#"{"page":3,"page_size":25,"search":"v","status":"draft","target_type":"product","target_id":"550e8400-e29b-41d4-a716-446655440043"}"#;
        let q: VersionQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(3));
        assert_eq!(q.target_type.as_deref(), Some("product"));
        assert!(q.target_id.is_some());
    }
}
