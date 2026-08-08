use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{HeaderName, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiVersion {
    pub version: String,
    pub status: VersionStatus,
    pub deprecated_since: Option<String>,
    pub sunset_date: Option<String>,
    pub message: Option<String>,
    pub migration_guide: Option<String>,
    pub changes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum VersionStatus {
    Active,
    Deprecated,
    Sunset,
}

impl ToString for VersionStatus {
    fn to_string(&self) -> String {
        match self {
            VersionStatus::Active => "active".to_string(),
            VersionStatus::Deprecated => "deprecated".to_string(),
            VersionStatus::Sunset => "sunset".to_string(),
        }
    }
}

impl From<String> for VersionStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "deprecated" => VersionStatus::Deprecated,
            "sunset" => VersionStatus::Sunset,
            _ => VersionStatus::Active,
        }
    }
}

#[derive(Debug, Clone)]
pub struct VersionConfig {
    pub current_version: String,
    pub default_version: String,
    pub versions: HashMap<String, ApiVersion>,
    pub enabled: bool,
}

impl Default for VersionConfig {
    fn default() -> Self {
        let mut versions = HashMap::new();
        versions.insert(
            "v1".to_string(),
            ApiVersion {
                version: "v1".to_string(),
                status: VersionStatus::Active,
                deprecated_since: None,
                sunset_date: None,
                message: None,
                migration_guide: None,
                changes: None,
            },
        );

        Self {
            current_version: "v1".to_string(),
            default_version: "v1".to_string(),
            versions,
            enabled: true,
        }
    }
}

impl VersionConfig {
    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    pub fn with_current_version(mut self, version: &str) -> Self {
        self.current_version = version.to_string();
        self
    }

    pub fn with_default_version(mut self, version: &str) -> Self {
        self.default_version = version.to_string();
        self
    }

    pub fn add_version(mut self, version: &str, api_version: ApiVersion) -> Self {
        self.versions.insert(version.to_string(), api_version);
        self
    }

    pub fn add_deprecated_version(
        mut self,
        version: &str,
        deprecated_since: &str,
        sunset_date: &str,
        message: &str,
        migration_guide: Option<&str>,
        changes: Option<&str>,
    ) -> Self {
        self.versions.insert(
            version.to_string(),
            ApiVersion {
                version: version.to_string(),
                status: VersionStatus::Deprecated,
                deprecated_since: Some(deprecated_since.to_string()),
                sunset_date: Some(sunset_date.to_string()),
                message: Some(message.to_string()),
                migration_guide: migration_guide.map(|s| s.to_string()),
                changes: changes.map(|s| s.to_string()),
            },
        );
        self
    }

    pub fn get_version(&self, version: &str) -> Option<&ApiVersion> {
        self.versions.get(version)
    }

    pub fn is_version_supported(&self, version: &str) -> bool {
        self.versions.contains_key(version)
    }

    pub fn is_version_deprecated(&self, version: &str) -> bool {
        self.versions
            .get(version)
            .map(|v| v.status == VersionStatus::Deprecated)
            .unwrap_or(false)
    }

    pub fn is_version_sunset(&self, version: &str) -> bool {
        self.versions
            .get(version)
            .map(|v| v.status == VersionStatus::Sunset)
            .unwrap_or(false)
    }

    pub async fn load_from_db(&mut self, pool: &PgPool) -> Result<(), sqlx::Error> {
        let configs: Vec<ApiVersionConfigRecord> =
            sqlx::query_as("SELECT * FROM core_api_version_configs WHERE deleted_at IS NULL")
                .fetch_all(pool)
                .await?;

        self.versions.clear();
        for config in configs {
            self.versions.insert(
                config.version.clone(),
                ApiVersion {
                    version: config.version,
                    status: config.status.into(),
                    deprecated_since: config.deprecated_since,
                    sunset_date: config.sunset_date,
                    message: config.message,
                    migration_guide: config.migration_guide,
                    changes: config.changes,
                },
            );
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct VersionMiddleware {
    config: Arc<RwLock<VersionConfig>>,
}

impl VersionMiddleware {
    pub fn new(config: VersionConfig) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
        }
    }

    pub fn config(&self) -> Option<std::sync::RwLockReadGuard<'_, VersionConfig>> {
        match self.config.read() {
            Ok(guard) => Some(guard),
            Err(e) => {
                tracing::error!("Version config RwLock poisoned: {}", e);
                None
            }
        }
    }

    pub fn update_config(&self, config: VersionConfig) {
        if let Ok(mut guard) = self.config.write() {
            *guard = config;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApiVersionConfigRecord {
    pub id: uuid::Uuid,
    pub version: String,
    pub status: String,
    pub deprecated_since: Option<String>,
    pub sunset_date: Option<String>,
    pub message: Option<String>,
    pub migration_guide: Option<String>,
    pub changes: Option<String>,
    pub is_current: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVersionRequest {
    pub version: String,
    pub status: VersionStatus,
    pub deprecated_since: Option<String>,
    pub sunset_date: Option<String>,
    pub message: Option<String>,
    pub migration_guide: Option<String>,
    pub changes: Option<String>,
    pub is_current: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVersionStatusRequest {
    pub status: VersionStatus,
    pub deprecated_since: Option<String>,
    pub sunset_date: Option<String>,
    pub message: Option<String>,
    pub migration_guide: Option<String>,
    pub changes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionStatistics {
    pub total_versions: i64,
    pub active_versions: i64,
    pub deprecated_versions: i64,
    pub sunset_versions: i64,
    pub current_version: String,
    pub default_version: String,
    pub oldest_version: Option<String>,
    pub newest_version: Option<String>,
}

pub async fn init_version_config_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_api_version_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version VARCHAR(50) NOT NULL UNIQUE,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            deprecated_since DATE,
            sunset_date DATE,
            message TEXT,
            migration_guide TEXT,
            changes TEXT,
            is_current BOOLEAN NOT NULL DEFAULT false,
            is_default BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_status ON core_api_version_configs(status);")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_api_version_configs_version ON core_api_version_configs(version);")
        .execute(pool)
        .await?;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_api_version_configs WHERE deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await?;

    if count == 0 {
        sqlx::query(
            r#"
            INSERT INTO core_api_version_configs (version, status, is_current, is_default)
            VALUES ('v1', 'active', true, true);
            "#,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

const ACCEPT_VERSION_HEADER: &str = "accept-version";
const API_VERSION_HEADER: &str = "api-version";
const DEPRECATION_HEADER: &str = "deprecation";
const SUNSET_HEADER: &str = "sunset";
const LINK_HEADER: &str = "link";
const WARNING_HEADER: &str = "warning";

fn extract_version_from_header(req: &Request) -> Option<String> {
    req.headers()
        .get(ACCEPT_VERSION_HEADER)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.trim().to_string())
}

fn extract_version_from_query(req: &Request) -> Option<String> {
    req.uri().query().and_then(|query| {
        url::form_urlencoded::parse(query.as_bytes())
            .find(|(k, _)| k == "version")
            .map(|(_, v)| v.to_string())
    })
}

fn extract_version(req: &Request, config: &VersionConfig) -> String {
    extract_version_from_header(req)
        .or_else(|| extract_version_from_query(req))
        .unwrap_or_else(|| config.default_version.clone())
}

fn add_version_headers(response: &mut Response, version: &str, api_version: &ApiVersion) {
    let headers = response.headers_mut();

    if let Ok(value) = HeaderValue::from_str(version) {
        headers.insert(HeaderName::from_static(API_VERSION_HEADER), value);
    }

    if let Ok(value) = HeaderValue::from_str(&api_version.status.to_string()) {
        headers.insert(HeaderName::from_static("api-version-status"), value);
    }

    match api_version.status {
        VersionStatus::Deprecated => {
            if let Some(deprecated_since) = &api_version.deprecated_since {
                if let Ok(value) = HeaderValue::from_str(deprecated_since) {
                    headers.insert(HeaderName::from_static(DEPRECATION_HEADER), value);
                }
            }

            if let Some(sunset_date) = &api_version.sunset_date {
                if let Ok(value) = HeaderValue::from_str(sunset_date) {
                    headers.insert(HeaderName::from_static(SUNSET_HEADER), value);
                }
            }

            let mut warning_parts = vec![
                format!("299 - \"Deprecated API version {}\"", version),
                "Please upgrade to the latest version".to_string(),
            ];

            if let Some(sunset_date) = &api_version.sunset_date {
                warning_parts.push(format!("Sunset date: {}", sunset_date));
            }

            let warning = warning_parts.join(". ");
            if let Ok(value) = HeaderValue::from_str(&warning) {
                headers.insert(HeaderName::from_static(WARNING_HEADER), value);
            }

            if let Some(migration_guide) = &api_version.migration_guide {
                let link_header = format!(
                    "<{}>; rel=\"deprecation\"; type=\"text/html\"; title=\"Migration Guide\"",
                    migration_guide
                );
                if let Ok(value) = HeaderValue::from_str(&link_header) {
                    headers.insert(HeaderName::from_static(LINK_HEADER), value);
                }
            }

            if let Some(message) = &api_version.message {
                if let Ok(value) = HeaderValue::from_str(message) {
                    headers.insert(HeaderName::from_static("api-deprecation-message"), value);
                }
            }

            if let Some(changes) = &api_version.changes {
                if let Ok(value) = HeaderValue::from_str(changes) {
                    headers.insert(HeaderName::from_static("api-changes"), value);
                }
            }
        }
        VersionStatus::Sunset => {
            let warning = format!(
                "410 - \"API version {} has been sunset\". Please upgrade to the latest version.",
                version
            );
            if let Ok(value) = HeaderValue::from_str(&warning) {
                headers.insert(HeaderName::from_static(WARNING_HEADER), value);
            }
        }
        VersionStatus::Active => {}
    }
}

pub async fn versioning_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let config = match state.versioning_middleware.config() {
        Some(guard) => guard.clone(),
        None => {
            tracing::error!("Version config unavailable, skipping version check");
            return next.run(req).await;
        }
    };

    if !config.enabled {
        return next.run(req).await;
    }

    let requested_version = extract_version(&req, &config);

    if config.is_version_sunset(&requested_version) {
        tracing::warn!(
            "Sunset API version requested: version={}, path={}",
            requested_version,
            req.uri().path()
        );

        let api_version = match config.get_version(&requested_version) {
            Some(v) => v,
            None => {
                tracing::error!(
                    "Version marked as sunset but not found in config: {}",
                    requested_version
                );
                return next.run(req).await;
            }
        };
        let body = serde_json::json!({
            "success": false,
            "message": format!("API版本 {} 已停用，请升级到最新版本 {}", requested_version, config.current_version),
            "code": 410,
            "data": null,
            "deprecated_since": api_version.deprecated_since.as_deref().unwrap_or(""),
            "sunset_date": api_version.sunset_date.as_deref().unwrap_or(""),
            "migration_guide": api_version.migration_guide.as_deref().unwrap_or(""),
            "changes": api_version.changes.as_deref().unwrap_or(""),
            "suggested_version": config.current_version
        });

        let mut response = (
            StatusCode::GONE,
            [(axum::http::header::CONTENT_TYPE, "application/json")],
            match serde_json::to_string(&body) {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("Failed to serialize sunset response: {}", e);
                    r#"{"success":false,"message":"Internal error","code":500}"#.to_string()
                }
            },
        )
            .into_response();

        add_version_headers(&mut response, &requested_version, api_version);
        return response;
    }

    if !config.is_version_supported(&requested_version) {
        tracing::warn!(
            "Unsupported API version requested: version={}, path={}",
            requested_version,
            req.uri().path()
        );

        let body = serde_json::json!({
            "success": false,
            "message": format!("不支持的API版本 {}", requested_version),
            "code": 400,
            "data": null,
            "supported_versions": config.versions.keys().cloned().collect::<Vec<_>>(),
            "current_version": config.current_version,
            "default_version": config.default_version
        });

        let response = (
            StatusCode::BAD_REQUEST,
            [(axum::http::header::CONTENT_TYPE, "application/json")],
            match serde_json::to_string(&body) {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("Failed to serialize error response: {}", e);
                    r#"{"success":false,"message":"Internal error","code":500}"#.to_string()
                }
            },
        )
            .into_response();

        return response;
    }

    if config.is_version_deprecated(&requested_version) {
        tracing::warn!(
            "Deprecated API version requested: version={}, path={}",
            requested_version,
            req.uri().path()
        );
    }

    let api_version = match config.get_version(&requested_version) {
        Some(v) => v,
        None => {
            tracing::error!(
                "Version marked as supported but not found in config: {}",
                requested_version
            );
            return next.run(req).await;
        }
    };

    let mut response = next.run(req).await;
    add_version_headers(&mut response, &requested_version, api_version);
    response
}

pub async fn list_versions(
    State(state): State<AppState>,
) -> Json<crate::CoreResponse<Vec<ApiVersionConfigRecord>>> {
    tracing::info!("[Versioning] Listing all API versions");

    let result = sqlx::query_as("SELECT * FROM core_api_version_configs ORDER BY version")
        .fetch_all(&state.pool)
        .await;

    match result {
        Ok(versions) => Json(crate::CoreResponse::success(versions, "Versions retrieved")),
        Err(e) => {
            tracing::error!("[Versioning] Failed to list versions: {}", e);
            Json(crate::CoreResponse::error(&format!(
                "Failed to list versions: {}",
                e
            )))
        }
    }
}

pub async fn get_version(
    State(state): State<AppState>,
    Path(version): Path<String>,
) -> Json<crate::CoreResponse<Option<ApiVersionConfigRecord>>> {
    tracing::info!("[Versioning] Getting API version: {}", version);

    let result = sqlx::query_as(
        "SELECT * FROM core_api_version_configs WHERE deleted_at IS NULL AND version = $1",
    )
    .bind(&version)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(version)) => Json(crate::CoreResponse::success(Some(version), "Version found")),
        Ok(None) => Json(crate::CoreResponse::success(None, "Version not found")),
        Err(e) => {
            tracing::error!("[Versioning] Failed to get version: {}", e);
            Json(crate::CoreResponse::error(&format!(
                "Failed to get version: {}",
                e
            )))
        }
    }
}

pub async fn create_version(
    State(state): State<AppState>,
    Json(req): Json<CreateVersionRequest>,
) -> Json<crate::CoreResponse<ApiVersionConfigRecord>> {
    tracing::info!("[Versioning] Creating API version: {}", req.version);

    let is_current = req.is_current.unwrap_or(false);
    let is_default = req.is_default.unwrap_or(false);

    if is_current {
        if let Err(e) = sqlx::query("UPDATE core_api_version_configs SET is_current = false")
            .execute(&state.pool)
            .await
        {
            tracing::error!("[Versioning] Failed to update current version: {}", e);
            return Json(crate::CoreResponse::error(&format!(
                "Failed to update current version: {}",
                e
            )));
        }
    }

    if is_default {
        if let Err(e) = sqlx::query("UPDATE core_api_version_configs SET is_default = false")
            .execute(&state.pool)
            .await
        {
            tracing::error!("[Versioning] Failed to update default version: {}", e);
            return Json(crate::CoreResponse::error(&format!(
                "Failed to update default version: {}",
                e
            )));
        }
    }

    let result = sqlx::query_as(
        r#"
        INSERT INTO core_api_version_configs (version, status, deprecated_since, sunset_date, message, migration_guide, changes, is_current, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
        "#,
    )
    .bind(&req.version)
    .bind(&req.status.to_string())
    .bind(&req.deprecated_since)
    .bind(&req.sunset_date)
    .bind(&req.message)
    .bind(&req.migration_guide)
    .bind(&req.changes)
    .bind(is_current)
    .bind(is_default)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => {
            reload_version_config(&state).await;
            Json(crate::CoreResponse::success(version, "Version created"))
        }
        Err(e) => {
            tracing::error!("[Versioning] Failed to create version: {}", e);
            Json(crate::CoreResponse::error(&format!(
                "Failed to create version: {}",
                e
            )))
        }
    }
}

pub async fn update_version_status(
    State(state): State<AppState>,
    Path(version): Path<String>,
    Json(req): Json<UpdateVersionStatusRequest>,
) -> Json<crate::CoreResponse<ApiVersionConfigRecord>> {
    tracing::info!("[Versioning] Updating API version status: {}", version);

    let result = sqlx::query_as(
        r#"
        UPDATE core_api_version_configs
        SET status = $1, deprecated_since = $2, sunset_date = $3, message = $4, migration_guide = $5, changes = $6, updated_at = CURRENT_TIMESTAMP
        WHERE version = $7
        RETURNING *;
        "#,
    )
    .bind(&req.status.to_string())
    .bind(&req.deprecated_since)
    .bind(&req.sunset_date)
    .bind(&req.message)
    .bind(&req.migration_guide)
    .bind(&req.changes)
    .bind(&version)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => {
            reload_version_config(&state).await;
            Json(crate::CoreResponse::success(version, "Version updated"))
        }
        Err(e) => {
            tracing::error!("[Versioning] Failed to update version: {}", e);
            Json(crate::CoreResponse::error(&format!(
                "Failed to update version: {}",
                e
            )))
        }
    }
}

pub async fn delete_version(
    State(state): State<AppState>,
    Path(version): Path<String>,
) -> Json<crate::CoreResponse<bool>> {
    tracing::info!("[Versioning] Deleting API version: {}", version);

    let result =
        sqlx::query("UPDATE core_api_version_configs SET deleted_at = NOW() WHERE version = $1")
            .bind(&version)
            .execute(&state.pool)
            .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                reload_version_config(&state).await;
                Json(crate::CoreResponse::success(true, "Version deleted"))
            } else {
                Json(crate::CoreResponse::success(false, "Version not found"))
            }
        }
        Err(e) => {
            tracing::error!("[Versioning] Failed to delete version: {}", e);
            Json(crate::CoreResponse::error(&format!(
                "Failed to delete version: {}",
                e
            )))
        }
    }
}

pub async fn get_version_statistics(
    State(state): State<AppState>,
) -> Json<crate::CoreResponse<VersionStatistics>> {
    tracing::info!("[Versioning] Getting version statistics");

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_api_version_configs")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let active: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_api_version_configs WHERE deleted_at IS NULL AND status = 'active'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let deprecated: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_api_version_configs WHERE deleted_at IS NULL AND status = 'deprecated'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let sunset: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_api_version_configs WHERE deleted_at IS NULL AND status = 'sunset'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let current_version: String =
        sqlx::query_scalar("SELECT version FROM core_api_version_configs WHERE deleted_at IS NULL AND is_current = true")
            .fetch_one(&state.pool)
            .await
            .unwrap_or_else(|_| "v1".to_string());

    let default_version: String =
        sqlx::query_scalar("SELECT version FROM core_api_version_configs WHERE deleted_at IS NULL AND is_default = true")
            .fetch_one(&state.pool)
            .await
            .unwrap_or_else(|_| "v1".to_string());

    let oldest_version: Option<String> = sqlx::query_scalar(
        "SELECT version FROM core_api_version_configs ORDER BY version ASC LIMIT 1",
    )
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let newest_version: Option<String> = sqlx::query_scalar(
        "SELECT version FROM core_api_version_configs ORDER BY version DESC LIMIT 1",
    )
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let stats = VersionStatistics {
        total_versions: total,
        active_versions: active,
        deprecated_versions: deprecated,
        sunset_versions: sunset,
        current_version,
        default_version,
        oldest_version,
        newest_version,
    };

    Json(crate::CoreResponse::success(stats, "Statistics retrieved"))
}

async fn reload_version_config(state: &AppState) {
    let mut config = VersionConfig::default();
    if let Err(e) = config.load_from_db(&state.pool).await {
        tracing::error!("[Versioning] Failed to reload version config: {}", e);
        return;
    }

    let current: Option<String> =
        sqlx::query_scalar("SELECT version FROM core_api_version_configs WHERE deleted_at IS NULL AND is_current = true")
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    let default: Option<String> =
        sqlx::query_scalar("SELECT version FROM core_api_version_configs WHERE deleted_at IS NULL AND is_default = true")
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if let Some(v) = current {
        config.current_version = v;
    }
    if let Some(v) = default {
        config.default_version = v;
    }

    state.versioning_middleware.update_config(config);
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, Uri};

    fn create_test_request(
        path: &str,
        version_header: Option<&str>,
        version_query: Option<&str>,
    ) -> Request<Body> {
        let uri = if let Some(query) = version_query {
            format!("{}?version={}", path, query)
        } else {
            path.to_string()
        };

        let mut req = Request::builder()
            .uri(Uri::try_from(uri).unwrap())
            .body(Body::empty())
            .unwrap();

        if let Some(version) = version_header {
            req.headers_mut().insert(
                ACCEPT_VERSION_HEADER,
                HeaderValue::from_str(version).unwrap(),
            );
        }

        req
    }

    #[test]
    fn test_version_config_default() {
        let config = VersionConfig::default();
        assert!(config.enabled);
        assert_eq!(config.current_version, "v1");
        assert_eq!(config.default_version, "v1");
        assert!(config.is_version_supported("v1"));
        assert!(!config.is_version_supported("v2"));
    }

    #[test]
    fn test_version_config_add_deprecated() {
        let config = VersionConfig::default().add_deprecated_version(
            "v0",
            "2024-01-01",
            "2024-06-01",
            "Deprecated",
            Some("https://docs.example.com/migration"),
            Some("Removed endpoints"),
        );

        assert!(config.is_version_supported("v0"));
        assert!(config.is_version_deprecated("v0"));
        assert!(!config.is_version_sunset("v0"));
    }

    #[test]
    fn test_extract_version_from_header() {
        let req = create_test_request("/api/test", Some("v2"), None);
        let version = extract_version_from_header(&req);
        assert_eq!(version, Some("v2".to_string()));
    }

    #[test]
    fn test_extract_version_from_query() {
        let req = create_test_request("/api/test", None, Some("v2"));
        let version = extract_version_from_query(&req);
        assert_eq!(version, Some("v2".to_string()));
    }

    #[test]
    fn test_extract_version_header_precedence() {
        let config = VersionConfig::default();
        let req = create_test_request("/api/test", Some("v2"), Some("v1"));
        let version = extract_version(&req, &config);
        assert_eq!(version, "v2");
    }

    #[test]
    fn test_extract_version_default() {
        let config = VersionConfig::default();
        let req = create_test_request("/api/test", None, None);
        let version = extract_version(&req, &config);
        assert_eq!(version, "v1");
    }

    #[test]
    fn test_is_version_supported() {
        let config = VersionConfig::default();
        assert!(config.is_version_supported("v1"));
        assert!(!config.is_version_supported("v2"));
    }

    #[test]
    fn test_is_version_deprecated() {
        let config = VersionConfig::default().add_deprecated_version(
            "v0",
            "2024-01-01",
            "2024-06-01",
            "",
            None,
            None,
        );

        assert!(config.is_version_deprecated("v0"));
        assert!(!config.is_version_deprecated("v1"));
    }

    #[test]
    fn test_version_status_from_string() {
        assert_eq!(
            VersionStatus::from("active".to_string()),
            VersionStatus::Active
        );
        assert_eq!(
            VersionStatus::from("deprecated".to_string()),
            VersionStatus::Deprecated
        );
        assert_eq!(
            VersionStatus::from("sunset".to_string()),
            VersionStatus::Sunset
        );
        assert_eq!(
            VersionStatus::from("unknown".to_string()),
            VersionStatus::Active
        );
    }
}
