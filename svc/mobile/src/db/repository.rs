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
    data: CreatePatrolRecord,
) -> sqlx::Result<PatrolRecord> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = data.status.unwrap_or_else(|| "pending".to_string());

    sqlx::query(
        "INSERT INTO patrol_records (id, title, description, location_lat, location_lng, address, patrol_type, status, checked_by, checked_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
    )
    .bind(id)
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
    data: CreateScanRecord,
) -> sqlx::Result<ScanRecord> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO scan_records (id, barcode, location_lat, location_lng, item_type, quantity, operator, scanned_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    )
    .bind(id)
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
    data: CreatePhotoEvidence,
) -> sqlx::Result<PhotoEvidence> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO photo_evidence (id, title, description, location_lat, location_lng, address, file_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(id)
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
    data: CreateAudioRecording,
) -> sqlx::Result<AudioRecording> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO audio_recordings (id, title, description, location_lat, location_lng, address, duration_seconds, file_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
    )
    .bind(id)
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
    data: CreateVideoRecording,
) -> sqlx::Result<VideoRecording> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO video_recordings (id, title, description, start_location_lat, start_location_lng, location_track, duration_seconds, file_url, thumbnail_url, recorded_by, recorded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(id)
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
    data: CreateMobileTask,
) -> sqlx::Result<MobileTask> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let priority = data.priority.unwrap_or_else(|| "medium".to_string());
    let due_date = data
        .due_date
        .and_then(|s| chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());

    sqlx::query(
        "INSERT INTO mobile_tasks (id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(id)
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
