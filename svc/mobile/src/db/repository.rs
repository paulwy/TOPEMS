#![allow(dead_code)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]

use crate::models::*;
use chrono::Utc;
use sqlx::{Pool, Postgres};
use uuid::Uuid;

pub async fn db_get_dashboard_stats(pool: &Pool<Postgres>) -> sqlx::Result<(i64, i64, i64, i64)> {
    let patrol_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM patrol_records")
        .fetch_one(pool)
        .await?;

    let scan_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM scan_records")
        .fetch_one(pool)
        .await?;

    let photo_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM photo_evidence")
        .fetch_one(pool)
        .await?;

    let task_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM mobile_tasks")
        .fetch_one(pool)
        .await?;

    Ok((patrol_count, scan_count, photo_count, task_count))
}

pub async fn db_get_patrol_records(pool: &Pool<Postgres>) -> sqlx::Result<Vec<PatrolRecord>> {
    let rows = sqlx::query("SELECT * FROM patrol_records ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter().map(|row| PatrolRecord::from_row(row)).collect()
}

pub async fn db_create_patrol_record(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreatePatrolRecord,
) -> sqlx::Result<PatrolRecord> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = data.status.unwrap_or_else(|| "pending".to_string());

    sqlx::query(
        "INSERT INTO patrol_records (id, tenant_id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(&data.address)
    .bind(&data.patrol_type)
    .bind(&status)
    .bind(&data.checked_by)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PatrolRecord {
        id,
        tenant_id,
        title: data.title,
        description: data.description,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        address: data.address,
        patrol_type: data.patrol_type,
        status,
        checked_by: data.checked_by,
        checked_at: now,
        created_at: now,
    })
}

pub async fn db_get_scan_records(pool: &Pool<Postgres>) -> sqlx::Result<Vec<ScanRecord>> {
    let rows = sqlx::query("SELECT * FROM scan_records ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter().map(|row| ScanRecord::from_row(row)).collect()
}

pub async fn db_create_scan_record(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreateScanRecord,
) -> sqlx::Result<ScanRecord> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO scan_records (id, tenant_id, barcode, location_lat, location_lng, item_type, quantity, operator, scanned_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.barcode)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(&data.item_type)
    .bind(data.quantity)
    .bind(&data.operator)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(ScanRecord {
        id,
        tenant_id,
        barcode: data.barcode,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        item_type: data.item_type,
        quantity: data.quantity,
        operator: data.operator,
        scanned_at: now,
        created_at: now,
    })
}

pub async fn db_get_photo_evidence(pool: &Pool<Postgres>) -> sqlx::Result<Vec<PhotoEvidence>> {
    let rows = sqlx::query("SELECT * FROM photo_evidence ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter()
        .map(|row| PhotoEvidence::from_row(row))
        .collect()
}

pub async fn db_create_photo_evidence(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreatePhotoEvidence,
) -> sqlx::Result<PhotoEvidence> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO photo_evidence (id, tenant_id, title, description, location_lat, location_lng, address, file_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(&data.address)
    .bind(&data.file_url)
    .bind(&data.recorded_by)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PhotoEvidence {
        id,
        tenant_id,
        title: data.title,
        description: data.description,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        address: data.address,
        file_url: data.file_url,
        recorded_by: data.recorded_by,
        recorded_at: now,
        created_at: now,
    })
}

pub async fn db_get_audio_recordings(pool: &Pool<Postgres>) -> sqlx::Result<Vec<AudioRecording>> {
    let rows = sqlx::query("SELECT * FROM audio_recordings ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter()
        .map(|row| AudioRecording::from_row(row))
        .collect()
}

pub async fn db_create_audio_recording(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreateAudioRecording,
) -> sqlx::Result<AudioRecording> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO audio_recordings (id, tenant_id, title, description, location_lat, location_lng, address, duration_seconds, file_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(&data.address)
    .bind(data.duration_seconds)
    .bind(&data.file_url)
    .bind(&data.recorded_by)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(AudioRecording {
        id,
        tenant_id,
        title: data.title,
        description: data.description,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        address: data.address,
        duration_seconds: data.duration_seconds,
        file_url: data.file_url,
        recorded_by: data.recorded_by,
        recorded_at: now,
        created_at: now,
    })
}

pub async fn db_get_video_recordings(pool: &Pool<Postgres>) -> sqlx::Result<Vec<VideoRecording>> {
    let rows = sqlx::query("SELECT * FROM video_recordings ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter()
        .map(|row| VideoRecording::from_row(row))
        .collect()
}

pub async fn db_create_video_recording(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreateVideoRecording,
) -> sqlx::Result<VideoRecording> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO video_recordings (id, tenant_id, title, description, start_location_lat, start_location_lng, location_track, duration_seconds, file_url, thumbnail_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(data.start_location_lat)
    .bind(data.start_location_lng)
    .bind(&data.location_track)
    .bind(data.duration_seconds)
    .bind(&data.file_url)
    .bind(&data.thumbnail_url)
    .bind(&data.recorded_by)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(VideoRecording {
        id,
        tenant_id,
        title: data.title,
        description: data.description,
        start_location_lat: data.start_location_lat,
        start_location_lng: data.start_location_lng,
        location_track: data.location_track,
        duration_seconds: data.duration_seconds,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url,
        recorded_by: data.recorded_by,
        recorded_at: now,
        created_at: now,
    })
}

pub async fn db_get_mobile_tasks(pool: &Pool<Postgres>) -> sqlx::Result<Vec<MobileTask>> {
    let rows = sqlx::query("SELECT * FROM mobile_tasks ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;

    rows.iter().map(|row| MobileTask::from_row(row)).collect()
}

pub async fn db_create_mobile_task(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreateMobileTask,
) -> sqlx::Result<MobileTask> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let priority = data.priority.unwrap_or_else(|| "medium".to_string());
    let due_date = data
        .due_date
        .and_then(|s| chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    sqlx::query(
        "INSERT INTO mobile_tasks (id, tenant_id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(&data.task_type)
    .bind(&priority)
    .bind("pending")
    .bind(&data.assignee)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(&due_date)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(MobileTask {
        id,
        tenant_id,
        title: data.title,
        description: data.description,
        task_type: data.task_type,
        priority,
        status: "pending".to_string(),
        assignee: data.assignee,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        due_date,
        completed_at: None,
        created_at: now,
        updated_at: now,
    })
}

pub async fn db_update_task_status(
    pool: &Pool<Postgres>,
    task_id: Uuid,
    status: &str,
) -> sqlx::Result<Option<MobileTask>> {
    let now = Utc::now();
    let completed_at = if status == "completed" {
        Some(now)
    } else {
        None
    };

    let result = sqlx::query(
        "UPDATE mobile_tasks SET status = $1, completed_at = $2, updated_at = $3 WHERE id = $4",
    )
    .bind(status)
    .bind(completed_at)
    .bind(now)
    .bind(task_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(None);
    }

    let row = sqlx::query("SELECT * FROM mobile_tasks WHERE id = $1")
        .bind(task_id)
        .fetch_one(pool)
        .await?;

    Some(MobileTask::from_row(&row)).transpose()
}

pub async fn db_get_offline_operations(
    pool: &Pool<Postgres>,
    user_id: Uuid,
    status: Option<&str>,
) -> sqlx::Result<Vec<OfflineOperation>> {
    let query = if let Some(s) = status {
        sqlx::query(
            "SELECT * FROM offline_operations WHERE user_id = $1 AND sync_status = $2 ORDER BY created_at ASC",
        )
        .bind(user_id)
        .bind(s)
    } else {
        sqlx::query("SELECT * FROM offline_operations WHERE user_id = $1 ORDER BY created_at ASC")
            .bind(user_id)
    };

    let rows = query.fetch_all(pool).await?;
    rows.iter()
        .map(|row| OfflineOperation::from_row(row))
        .collect()
}

pub async fn db_create_offline_operation(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    user_id: Uuid,
    data: CreateOfflineOperation,
) -> sqlx::Result<OfflineOperation> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO offline_operations (id, tenant_id, user_id, operation_type, entity_type, entity_id, operation_data, sync_status, sync_attempts, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&data.operation_type)
    .bind(&data.entity_type)
    .bind(&data.entity_id)
    .bind(&data.operation_data)
    .bind("pending")
    .bind(0)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(OfflineOperation {
        id,
        tenant_id,
        user_id,
        operation_type: data.operation_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        operation_data: data.operation_data,
        sync_status: "pending".to_string(),
        sync_attempts: 0,
        last_sync_error: None,
        created_at: now,
        synced_at: None,
    })
}

pub async fn db_update_offline_operation_status(
    pool: &Pool<Postgres>,
    operation_id: Uuid,
    status: &str,
    error: Option<&str>,
) -> sqlx::Result<()> {
    let now = Utc::now();
    let attempts = if status == "failed" {
        sqlx::query_scalar("SELECT sync_attempts + 1 FROM offline_operations WHERE id = $1")
            .bind(operation_id)
            .fetch_one(pool)
            .await?
    } else {
        0
    };

    sqlx::query(
        "UPDATE offline_operations SET sync_status = $1, sync_attempts = $2, last_sync_error = $3, synced_at = $4 WHERE id = $5",
    )
    .bind(status)
    .bind(attempts)
    .bind(error)
    .bind(if status == "synced" { Some(now) } else { None })
    .bind(operation_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn db_get_sync_policy(
    pool: &Pool<Postgres>,
    user_id: Uuid,
) -> sqlx::Result<Option<SyncPolicy>> {
    let row = sqlx::query("SELECT * FROM sync_policies WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

    row.map(|r| SyncPolicy::from_row(&r)).transpose()
}

pub async fn db_create_or_update_sync_policy(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    user_id: Uuid,
    data: UpdateSyncPolicy,
) -> sqlx::Result<SyncPolicy> {
    let now = Utc::now();

    let existing = db_get_sync_policy(pool, user_id).await?;

    if let Some(mut policy) = existing {
        if let Some(v) = data.auto_sync_enabled {
            policy.auto_sync_enabled = v;
        }
        if let Some(v) = data.sync_interval_minutes {
            policy.sync_interval_minutes = v;
        }
        if let Some(v) = data.sync_on_network_change {
            policy.sync_on_network_change = v;
        }
        if let Some(v) = data.conflict_strategy {
            policy.conflict_strategy = v;
        }
        policy.updated_at = now;

        sqlx::query(
            "UPDATE sync_policies SET auto_sync_enabled = $1, sync_interval_minutes = $2, sync_on_network_change = $3, conflict_strategy = $4, updated_at = $5 WHERE user_id = $6",
        )
        .bind(policy.auto_sync_enabled)
        .bind(policy.sync_interval_minutes)
        .bind(policy.sync_on_network_change)
        .bind(&policy.conflict_strategy)
        .bind(policy.updated_at)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(policy)
    } else {
        let id = Uuid::new_v4();
        let policy = SyncPolicy {
            id,
            tenant_id,
            user_id,
            auto_sync_enabled: data.auto_sync_enabled.unwrap_or(true),
            sync_interval_minutes: data.sync_interval_minutes.unwrap_or(5),
            sync_on_network_change: data.sync_on_network_change.unwrap_or(true),
            conflict_strategy: data
                .conflict_strategy
                .unwrap_or_else(|| "server优先".to_string()),
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO sync_policies (id, tenant_id, user_id, auto_sync_enabled, sync_interval_minutes, sync_on_network_change, conflict_strategy, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(policy.id)
        .bind(policy.tenant_id)
        .bind(policy.user_id)
        .bind(policy.auto_sync_enabled)
        .bind(policy.sync_interval_minutes)
        .bind(policy.sync_on_network_change)
        .bind(&policy.conflict_strategy)
        .bind(policy.created_at)
        .bind(policy.updated_at)
        .execute(pool)
        .await?;

        Ok(policy)
    }
}

pub async fn db_register_push_device(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    user_id: Uuid,
    data: CreatePushDevice,
) -> sqlx::Result<PushDevice> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO push_devices (id, tenant_id, user_id, device_token, platform, device_model, app_version, os_version, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (device_token) DO UPDATE SET tenant_id = $2, user_id = $3, is_active = $9, updated_at = $11",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&data.device_token)
    .bind(&data.platform)
    .bind(&data.device_model)
    .bind(&data.app_version)
    .bind(&data.os_version)
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PushDevice {
        id,
        tenant_id,
        user_id,
        device_token: data.device_token,
        platform: data.platform,
        device_model: data.device_model,
        app_version: data.app_version,
        os_version: data.os_version,
        is_active: true,
        created_at: now,
        updated_at: now,
    })
}

pub async fn db_get_push_devices(
    pool: &Pool<Postgres>,
    user_id: Option<Uuid>,
) -> sqlx::Result<Vec<PushDevice>> {
    let query = if let Some(uid) = user_id {
        sqlx::query("SELECT * FROM push_devices WHERE user_id = $1 AND is_active = true").bind(uid)
    } else {
        sqlx::query("SELECT * FROM push_devices WHERE is_active = true")
    };

    let rows = query.fetch_all(pool).await?;
    rows.iter().map(|row| PushDevice::from_row(row)).collect()
}

pub async fn db_create_push_notification(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreatePushNotification,
) -> sqlx::Result<PushNotification> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO push_notifications (id, tenant_id, title, body, notification_type, data, target_type, target_ids, status, sent_count, delivered_count, clicked_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&data.title)
    .bind(&data.body)
    .bind(&data.notification_type)
    .bind(&data.data)
    .bind(&data.target_type)
    .bind(&data.target_ids)
    .bind("pending")
    .bind(0)
    .bind(0)
    .bind(0)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PushNotification {
        id,
        tenant_id,
        title: data.title,
        body: data.body,
        notification_type: data.notification_type,
        data: data.data,
        target_type: data.target_type,
        target_ids: data.target_ids,
        status: "pending".to_string(),
        sent_count: 0,
        delivered_count: 0,
        clicked_count: 0,
        created_at: now,
        sent_at: None,
    })
}

pub async fn db_update_push_notification_stats(
    pool: &Pool<Postgres>,
    notification_id: Uuid,
    sent_count: i32,
    delivered_count: i32,
    clicked_count: i32,
) -> sqlx::Result<()> {
    let now = Utc::now();

    sqlx::query(
        "UPDATE push_notifications SET status = $1, sent_count = $2, delivered_count = $3, clicked_count = $4, sent_at = $5 WHERE id = $6",
    )
    .bind("sent")
    .bind(sent_count)
    .bind(delivered_count)
    .bind(clicked_count)
    .bind(now)
    .bind(notification_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn db_get_push_templates(pool: &Pool<Postgres>) -> sqlx::Result<Vec<PushTemplate>> {
    let rows = sqlx::query("SELECT * FROM push_templates WHERE is_active = true ORDER BY name")
        .fetch_all(pool)
        .await?;

    rows.iter().map(|row| PushTemplate::from_row(row)).collect()
}

pub async fn db_create_push_template(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    name: &str,
    title_template: &str,
    body_template: &str,
    notification_type: &str,
    description: Option<&str>,
) -> sqlx::Result<PushTemplate> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO push_templates (id, tenant_id, name, title_template, body_template, notification_type, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(name)
    .bind(title_template)
    .bind(body_template)
    .bind(notification_type)
    .bind(description)
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PushTemplate {
        id,
        tenant_id,
        name: name.to_string(),
        title_template: title_template.to_string(),
        body_template: body_template.to_string(),
        notification_type: notification_type.to_string(),
        description: description.map(|s| s.to_string()),
        is_active: true,
        created_at: now,
        updated_at: now,
    })
}

pub async fn db_get_barcode_scans(
    pool: &Pool<Postgres>,
    user_id: Uuid,
    barcode_type: Option<&str>,
) -> sqlx::Result<Vec<BarcodeScan>> {
    let query = if let Some(bt) = barcode_type {
        sqlx::query(
            "SELECT * FROM barcode_scans WHERE user_id = $1 AND barcode_type = $2 ORDER BY scanned_at DESC",
        )
        .bind(user_id)
        .bind(bt)
    } else {
        sqlx::query("SELECT * FROM barcode_scans WHERE user_id = $1 ORDER BY scanned_at DESC")
            .bind(user_id)
    };

    let rows = query.fetch_all(pool).await?;
    rows.iter().map(|row| BarcodeScan::from_row(row)).collect()
}

pub async fn db_create_barcode_scan(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    user_id: Uuid,
    data: CreateBarcodeScan,
) -> sqlx::Result<BarcodeScan> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO barcode_scans (id, tenant_id, user_id, barcode, barcode_type, decoded_data, location_lat, location_lng, scanned_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&data.barcode)
    .bind(&data.barcode_type)
    .bind(&data.decoded_data)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(BarcodeScan {
        id,
        tenant_id,
        user_id,
        barcode: data.barcode,
        barcode_type: data.barcode_type,
        decoded_data: data.decoded_data,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        result_action: None,
        result_data: None,
        scanned_at: now,
        created_at: now,
    })
}

pub async fn db_get_photo_uploads(
    pool: &Pool<Postgres>,
    user_id: Uuid,
    status: Option<&str>,
) -> sqlx::Result<Vec<PhotoUpload>> {
    let query = if let Some(s) = status {
        sqlx::query(
            "SELECT * FROM photo_uploads WHERE user_id = $1 AND upload_status = $2 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .bind(s)
    } else {
        sqlx::query("SELECT * FROM photo_uploads WHERE user_id = $1 ORDER BY created_at DESC")
            .bind(user_id)
    };

    let rows = query.fetch_all(pool).await?;
    rows.iter().map(|row| PhotoUpload::from_row(row)).collect()
}

pub async fn db_create_photo_upload(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    user_id: Uuid,
    data: CreatePhotoUpload,
) -> sqlx::Result<PhotoUpload> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let file_path = format!("/api/mobile/photos/{}", id);

    sqlx::query(
        "INSERT INTO photo_uploads (id, tenant_id, user_id, file_name, file_path, file_size, mime_type, width, height, compression_ratio, has_watermark, watermark_text, upload_status, upload_progress, location_lat, location_lng, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&data.file_name)
    .bind(&file_path)
    .bind(data.file_size)
    .bind(&data.mime_type)
    .bind(data.width)
    .bind(data.height)
    .bind(data.compression_ratio)
    .bind(data.has_watermark)
    .bind(&data.watermark_text)
    .bind("uploading")
    .bind(0)
    .bind(data.location_lat)
    .bind(data.location_lng)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(PhotoUpload {
        id,
        tenant_id,
        user_id,
        file_name: data.file_name,
        file_path,
        file_size: data.file_size,
        mime_type: data.mime_type,
        width: data.width,
        height: data.height,
        compression_ratio: data.compression_ratio,
        has_watermark: data.has_watermark,
        watermark_text: data.watermark_text,
        upload_status: "uploading".to_string(),
        upload_progress: 0,
        thumbnail_url: None,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        created_at: now,
        uploaded_at: None,
    })
}

pub async fn db_update_photo_upload_status(
    pool: &Pool<Postgres>,
    upload_id: Uuid,
    status: &str,
    progress: i32,
    thumbnail_url: Option<&str>,
) -> sqlx::Result<()> {
    let now = Utc::now();

    sqlx::query(
        "UPDATE photo_uploads SET upload_status = $1, upload_progress = $2, thumbnail_url = $3, uploaded_at = $4 WHERE id = $5",
    )
    .bind(status)
    .bind(progress)
    .bind(thumbnail_url)
    .bind(if status == "completed" { Some(now) } else { None })
    .bind(upload_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn db_get_mobile_approvals(
    pool: &Pool<Postgres>,
    assignee_id: Uuid,
    status: Option<&str>,
) -> sqlx::Result<Vec<MobileApproval>> {
    let query = if let Some(s) = status {
        sqlx::query(
            "SELECT * FROM mobile_approvals WHERE assignee_id = $1 AND status = $2 ORDER BY created_at DESC",
        )
        .bind(assignee_id)
        .bind(s)
    } else {
        sqlx::query(
            "SELECT * FROM mobile_approvals WHERE assignee_id = $1 ORDER BY created_at DESC",
        )
        .bind(assignee_id)
    };

    let rows = query.fetch_all(pool).await?;
    rows.iter()
        .map(|row| MobileApproval::from_row(row))
        .collect()
}

pub async fn db_create_mobile_approval(
    pool: &Pool<Postgres>,
    tenant_id: Uuid,
    data: CreateMobileApproval,
) -> sqlx::Result<MobileApproval> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::new_v4();
    let due_date = data
        .due_date
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|d| d.with_timezone(&chrono::Utc));

    sqlx::query(
        "INSERT INTO mobile_approvals (id, tenant_id, user_id, approval_type, status, title, description, data, task_name, task_id, process_name, process_instance_id, process_definition_id, priority, due_date, comment, business_title, business_key, assignee_name, assignee_id, applicant_name, applicant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&data.approval_type)
    .bind("pending")
    .bind(&data.title)
    .bind(&data.description)
    .bind(&data.data)
    .bind(&data.task_name)
    .bind(&data.task_id)
    .bind(&data.process_name)
    .bind(&data.process_instance_id)
    .bind(&data.process_definition_id)
    .bind(&data.priority)
    .bind(due_date)
    .bind(&data.comment)
    .bind(&data.business_title)
    .bind(&data.business_key)
    .bind(&data.assignee_name)
    .bind(&data.assignee_id)
    .bind(&data.applicant_name)
    .bind(&data.applicant_id)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(MobileApproval {
        id,
        tenant_id,
        user_id,
        approval_type: data.approval_type,
        status: "pending".to_string(),
        title: data.title,
        description: data.description,
        data: data.data,
        task_name: data.task_name,
        task_id: data.task_id,
        process_name: data.process_name,
        process_instance_id: data.process_instance_id,
        process_definition_id: data.process_definition_id,
        priority: data.priority,
        due_date,
        comment: data.comment,
        business_title: data.business_title,
        business_key: data.business_key,
        assignee_name: data.assignee_name,
        assignee_id: data.assignee_id,
        applicant_name: data.applicant_name,
        applicant_id: data.applicant_id,
        created_at: now,
        updated_at: now,
    })
}

pub async fn db_update_mobile_approval(
    pool: &Pool<Postgres>,
    approval_id: Uuid,
    action: &str,
    comment: Option<&str>,
) -> sqlx::Result<Option<MobileApproval>> {
    let now = Utc::now();
    let status = match action {
        "approve" => "approved",
        "reject" => "rejected",
        "transfer" => "transferred",
        _ => "pending",
    };

    let result = sqlx::query(
        "UPDATE mobile_approvals SET status = $1, comment = $2, updated_at = $3 WHERE id = $4",
    )
    .bind(status)
    .bind(comment)
    .bind(now)
    .bind(approval_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(None);
    }

    let row = sqlx::query("SELECT * FROM mobile_approvals WHERE id = $1")
        .bind(approval_id)
        .fetch_one(pool)
        .await?;

    Some(MobileApproval::from_row(&row)).transpose()
}
