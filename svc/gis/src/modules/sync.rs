#![allow(dead_code)]

use crate::middleware::tenant::TenantRequest;
use crate::models::{DeviceLocation, EvidenceRecord, TrackPosition, TrackRecord};
use axum::{extract::State, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

// ==================== 请求结构 ====================

/// 批量位置上报
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchPositionUpload {
    pub device_id: Uuid,
    pub positions: Vec<PositionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionItem {
    pub position: serde_json::Value,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub heading: Option<f64>,
    pub accuracy: Option<f64>,
    pub battery_level: Option<i32>,
    pub timestamp: DateTime<Utc>,
}

/// 批量取证上传
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchEvidenceUpload {
    pub evidence_list: Vec<EvidenceUploadItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceUploadItem {
    pub local_id: String, // 客户端本地ID，用于关联
    pub title: String,
    pub evidence_type: String,
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i32>,
    pub file_size: Option<i64>,
    pub file_hash: Option<String>,
    pub recorded_by: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// 同步响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    pub synced_evidence: Vec<SyncedEvidenceResult>,
    pub synced_positions: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedEvidenceResult {
    pub local_id: String,
    pub server_id: Uuid,
    pub success: bool,
    pub error: Option<String>,
}

/// 离线数据下载请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineDataRequest {
    pub include_devices: bool,
    pub include_tracks: bool,
    pub include_evidence: bool,
    pub device_ids: Option<Vec<Uuid>>,
    pub track_date_from: Option<DateTime<Utc>>,
    pub track_date_to: Option<DateTime<Utc>>,
}

/// 离线数据响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineDataResponse {
    pub devices: Vec<DeviceLocation>,
    pub tracks: Vec<TrackRecord>,
    pub track_positions: Vec<TrackPosition>,
    pub evidence: Vec<EvidenceRecord>,
    pub synced_at: DateTime<Utc>,
}

// ==================== 批量位置上报 ====================

/// 批量上报设备位置（支持离线同步）- 优化版本
pub async fn batch_upload_positions(
    State(pool): State<PgPool>,
    TenantRequest { ctx }: TenantRequest,
    Json(payload): Json<BatchPositionUpload>,
) -> Json<ApiResponse<usize>> {
    if payload.positions.is_empty() {
        return Json(ApiResponse::success(0, "没有需要同步的位置数据"));
    }

    let positions = payload.positions;
    let tenant_id = ctx.tenant_id;
    let device_id = payload.device_id;

    // 使用批量插入优化性能
    let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
        sqlx::QueryBuilder::new(
            "INSERT INTO plugin_gis.device_location_records (device_id, organization_id, position, altitude, speed, direction, accuracy, battery_level, recorded_at)"
        );

    query_builder.push_values(positions.iter(), |mut b, pos| {
        b.push_bind(device_id)
            .push_bind(tenant_id)
            .push_bind(&pos.position)
            .push_bind(pos.altitude)
            .push_bind(pos.speed)
            .push_bind(pos.heading)
            .push_bind(pos.accuracy)
            .push_bind(pos.battery_level)
            .push_bind(pos.timestamp);
    });

    let query = query_builder.build();
    match query.execute(&pool).await {
        Ok(result) => {
            let synced_count = result.rows_affected() as usize;
            Json(ApiResponse::success(
                synced_count,
                &format!("成功同步 {} 个位置", synced_count),
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("位置同步失败: {}", e))),
    }
}

// ==================== 批量取证上传 ====================

/// 批量上传取证记录（支持离线同步）
pub async fn batch_upload_evidence(
    State(pool): State<PgPool>,
    TenantRequest { ctx }: TenantRequest,
    Json(payload): Json<BatchEvidenceUpload>,
) -> Json<ApiResponse<SyncResponse>> {
    if payload.evidence_list.is_empty() {
        return Json(ApiResponse::success(
            SyncResponse {
                synced_evidence: vec![],
                synced_positions: 0,
                errors: vec![],
            },
            "没有需要同步的取证数据",
        ));
    }

    let mut results = Vec::new();
    let mut errors = Vec::new();

    for evidence in &payload.evidence_list {
        match sqlx::query_as::<_, EvidenceRecord>(
            r#"
            INSERT INTO plugin_gis.evidence_records
            (tenant_id, title, evidence_type, position, file_url, thumbnail_url,
             duration, file_size, file_hash, recorded_by, recorded_at, tags, description, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            "#,
        )
        .bind(ctx.tenant_id)
        .bind(&evidence.title)
        .bind(&evidence.evidence_type)
        .bind(&evidence.position)
        .bind(&evidence.file_url)
        .bind(&evidence.thumbnail_url)
        .bind(evidence.duration)
        .bind(evidence.file_size)
        .bind(&evidence.file_hash)
        .bind(evidence.recorded_by)
        .bind(evidence.recorded_at)
        .bind(&evidence.tags)
        .bind(&evidence.description)
        .bind(&evidence.metadata)
        .fetch_one(&pool)
        .await
        {
            Ok(record) => {
                results.push(SyncedEvidenceResult {
                    local_id: evidence.local_id.clone(),
                    server_id: record.id,
                    success: true,
                    error: None,
                });
            }
            Err(e) => {
                let error_msg = format!("取证 {} 同步失败: {}", evidence.local_id, e);
                errors.push(error_msg.clone());
                results.push(SyncedEvidenceResult {
                    local_id: evidence.local_id.clone(),
                    server_id: Uuid::nil(),
                    success: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }

    let success_count = results.iter().filter(|r| r.success).count();
    let failure_count = results.len() - success_count;
    let response = SyncResponse {
        synced_evidence: results,
        synced_positions: success_count,
        errors,
    };
    Json(ApiResponse::success(
        response,
        &format!(
            "取证同步完成: {} 成功, {} 失败",
            success_count, failure_count
        ),
    ))
}

// ==================== 离线数据下载 ====================

/// 下载离线业务数据
pub async fn download_offline_data(
    State(pool): State<PgPool>,
    TenantRequest { ctx }: TenantRequest,
    Json(payload): Json<OfflineDataRequest>,
) -> Json<ApiResponse<OfflineDataResponse>> {
    let mut devices = Vec::new();
    let mut tracks = Vec::new();
    let mut track_positions = Vec::new();
    let mut evidence = Vec::new();

    // 下载设备数据
    if payload.include_devices {
        match sqlx::query_as::<_, DeviceLocation>(
            "SELECT * FROM plugin_gis.device_locations WHERE organization_id = $1 ORDER BY created_at DESC",
        )
        .bind(ctx.tenant_id)
        .fetch_all(&pool)
        .await
        {
            Ok(data) => devices = data,
            Err(e) => {
                return Json(ApiResponse::error(
                    500,
                    &format!("下载设备数据失败: {}", e),
                ))
            }
        }
    }

    // 下载轨迹数据
    if payload.include_tracks {
        let mut query = "SELECT * FROM plugin_gis.track_records WHERE tenant_id = $1".to_string();

        if payload.track_date_from.is_some() {
            query.push_str(" AND start_time >= $2");
        }
        if payload.track_date_to.is_some() {
            query.push_str(" AND end_time <= $3");
        }
        query.push_str(" ORDER BY start_time DESC");

        let mut q = sqlx::query_as::<_, TrackRecord>(&query).bind(ctx.tenant_id);
        if let Some(ref date_from) = payload.track_date_from {
            q = q.bind(date_from);
        }
        if let Some(ref date_to) = payload.track_date_to {
            q = q.bind(date_to);
        }

        match q.fetch_all(&pool).await {
            Ok(data) => tracks = data,
            Err(e) => return Json(ApiResponse::error(500, &format!("下载轨迹数据失败: {}", e))),
        }

        // 下载轨迹位置点
        if !tracks.is_empty() {
            let track_ids: Vec<Uuid> = tracks.iter().map(|t| t.id).collect();
            match sqlx::query_as::<_, TrackPosition>(
                "SELECT * FROM plugin_gis.track_positions WHERE track_id = ANY($1) ORDER BY timestamp ASC",
            )
            .bind(&track_ids)
            .fetch_all(&pool)
            .await
            {
                Ok(data) => track_positions = data,
                Err(e) => {
                    return Json(ApiResponse::error(
                        500,
                        &format!("下载轨迹位置数据失败: {}", e),
                    ))
                }
            }
        }
    }

    // 下载取证数据
    if payload.include_evidence {
        match sqlx::query_as::<_, EvidenceRecord>(
            "SELECT * FROM plugin_gis.evidence_records WHERE tenant_id = $1 ORDER BY recorded_at DESC",
        )
        .bind(ctx.tenant_id)
        .fetch_all(&pool)
        .await
        {
            Ok(data) => evidence = data,
            Err(e) => return Json(ApiResponse::error(500, &format!("下载取证数据失败: {}", e))),
        }
    }

    Json(ApiResponse::success(
        OfflineDataResponse {
            devices,
            tracks,
            track_positions,
            evidence,
            synced_at: Utc::now(),
        },
        "离线数据下载成功",
    ))
}

// ==================== 同步状态查询 ====================

/// 获取同步状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatusResponse {
    pub server_time: DateTime<Utc>,
    pub pending_count: i64,
}

pub async fn get_sync_status(
    State(pool): State<PgPool>,
    TenantRequest { ctx }: TenantRequest,
) -> Json<ApiResponse<SyncStatusResponse>> {
    // 统计待处理的数据量（最近24小时内的位置记录）
    let result = sqlx::query_as::<_, (i64,)>(
        r#"
        SELECT COUNT(*) FROM plugin_gis.device_location_records
        WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '24 hours'
        "#,
    )
    .bind(ctx.tenant_id)
    .fetch_one(&pool)
    .await;

    let pending_count = match result {
        Ok((count,)) => count,
        Err(_) => 0,
    };

    Json(ApiResponse::success(
        SyncStatusResponse {
            server_time: Utc::now(),
            pending_count,
        },
        "获取同步状态成功",
    ))
}
