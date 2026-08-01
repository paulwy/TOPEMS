#![allow(dead_code)]
use axum::extract::{Json, Path};
use axum::http::StatusCode;
use serde_json::Value;
use sqlx::PgPool;

use super::breaking::*;
use super::evolution::*;
use super::negotiation::*;
use super::types::*;

// ==================== Schema Version Handlers ====================

pub async fn publish_schema_version_handler(
    Json(req): Json<PublishSchemaVersionRequest>,
) -> Result<Json<SchemaVersion>, (StatusCode, Json<Value>)> {
    let version = publish_schema_version(
        req.version,
        req.schema_definition,
        req.change_type,
        req.change_description,
        req.approved_by,
    );
    Ok(Json(version))
}

pub async fn list_schema_versions_handler(
) -> Result<Json<Vec<SchemaVersion>>, (StatusCode, Json<Value>)> {
    let versions = list_schema_versions();
    Ok(Json(versions))
}

pub async fn get_schema_version_handler(
    Path(version): Path<String>,
) -> Result<Json<SchemaVersion>, (StatusCode, Json<Value>)> {
    get_schema_version(&version).map(Json).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": format!("Schema version '{}' not found", version)
            })),
        )
    })
}

pub async fn rollback_schema_handler(
    Path(version): Path<String>,
    Json(req): Json<RollbackSchemaRequest>,
) -> Result<Json<SchemaVersion>, (StatusCode, Json<Value>)> {
    rollback_schema(&version, req.rolled_back_by, req.notes)
        .map(Json)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": format!("Cannot rollback to version '{}'", version)
                })),
            )
        })
}

// ==================== Breaking Change Detection Handlers ====================

pub async fn compare_schemas_handler(
    Json(req): Json<CompareSchemasRequest>,
) -> Result<Json<SchemaCompareResult>, (StatusCode, Json<Value>)> {
    let result = compare_schemas(&req.old_schema, &req.new_schema);
    Ok(Json(result))
}

pub async fn detect_breaking_changes_handler(
    Json(req): Json<DetectBreakingChangesRequest>,
) -> Result<Json<BreakingChangeReport>, (StatusCode, Json<Value>)> {
    let report = get_breaking_change_report(&req.old_schema, &req.new_schema);
    Ok(Json(report))
}

// ==================== Version Negotiation Handlers ====================

pub async fn negotiate_version_handler(
    Json(req): Json<NegotiateVersionRequest>,
) -> Result<Json<NegotiatedVersion>, (StatusCode, Json<Value>)> {
    let result = negotiate_version(&req.requested_version, req.strategy);
    Ok(Json(result))
}

pub async fn get_supported_versions_handler(
) -> Result<Json<Vec<SupportedVersion>>, (StatusCode, Json<Value>)> {
    let versions = get_supported_versions();
    Ok(Json(versions))
}

pub async fn deprecate_version_handler(
    Path(version): Path<String>,
    Json(req): Json<DeprecateVersionRequest>,
) -> Result<Json<SupportedVersion>, (StatusCode, Json<Value>)> {
    deprecate_version(&version, req.sunset_at)
        .map(Json)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": format!("Version '{}' not found", version)
                })),
            )
        })
}

pub async fn get_current_schema_handler() -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let current = get_current_schema();
    match current {
        Some(schema) => Ok(Json(serde_json::json!({
            "current": schema,
        }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "No current schema version set",
            })),
        )),
    }
}

// ==================== 数据库初始化 ====================

pub async fn ensure_tables_exist(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(CREATE_GRAPHL_SCHEMA_VERSIONS_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHL_BREAKING_CHANGES_TABLE)
        .execute(pool)
        .await?;
    sqlx::query(CREATE_GRAPHL_VERSION_NEGOTIATIONS_TABLE)
        .execute(pool)
        .await?;
    Ok(())
}

// ==================== 初始化入口 ====================

pub fn init_schema_versioning() {
    init_schema_evolution();
    init_version_negotiation();
}
