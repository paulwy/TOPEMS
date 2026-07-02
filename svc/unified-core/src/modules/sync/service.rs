use chrono::{DateTime, Utc};
use sqlx::{postgres::PgPool, Error, FromRow};
use uuid::Uuid;

use super::models::{SyncStatistics, SyncTask};

#[derive(Debug, FromRow)]
struct SyncTaskRow {
    id: Uuid,
    tenant_id: Uuid,
    sync_type: String,
    source_module: String,
    target_module: String,
    source_entity: String,
    source_id: Option<Uuid>,
    source_code: Option<String>,
    status: String,
    retry_count: i32,
    max_retries: i32,
    error_message: Option<String>,
    next_retry_at: Option<DateTime<Utc>>,
    executed_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<SyncTaskRow> for SyncTask {
    fn from(row: SyncTaskRow) -> Self {
        SyncTask {
            id: row.id,
            tenant_id: row.tenant_id,
            sync_type: row.sync_type,
            source_module: row.source_module,
            target_module: row.target_module,
            source_entity: row.source_entity,
            source_id: row.source_id,
            source_code: row.source_code,
            status: row.status,
            retry_count: row.retry_count,
            max_retries: row.max_retries,
            error_message: row.error_message,
            next_retry_at: row.next_retry_at,
            executed_at: row.executed_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

pub async fn create_sync_task(
    db: &PgPool,
    tenant_id: Uuid,
    sync_type: &str,
    source_module: &str,
    target_module: &str,
    source_entity: &str,
    source_id: Option<Uuid>,
    source_code: Option<String>,
) -> Result<SyncTask, Error> {
    let now = Utc::now();
    let task_id = Uuid::new_v4();

    let row = sqlx::query_as::<_, SyncTaskRow>(
        r#"
        INSERT INTO unified_core.inter_module_sync 
            (id, tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, status, retry_count, max_retries,
             created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0, 3, $9, $10)
        RETURNING *
        "#,
    )
    .bind(task_id)
    .bind(tenant_id)
    .bind(sync_type)
    .bind(source_module)
    .bind(target_module)
    .bind(source_entity)
    .bind(source_id)
    .bind(source_code)
    .bind(now)
    .bind(now)
    .fetch_one(db)
    .await?;

    Ok(row.into())
}

pub async fn update_sync_task_status(
    db: &PgPool,
    task_id: Uuid,
    status: &str,
    error_message: Option<String>,
) -> Result<SyncTask, Error> {
    let now = Utc::now();

    let row = sqlx::query_as::<_, SyncTaskRow>(
        r#"
        UPDATE unified_core.inter_module_sync 
        SET status = $2, 
            error_message = $3, 
            executed_at = $4,
            updated_at = $5
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(task_id)
    .bind(status)
    .bind(error_message)
    .bind(now)
    .bind(now)
    .fetch_one(db)
    .await?;

    Ok(row.into())
}

pub async fn increment_retry_count(
    db: &PgPool,
    task_id: Uuid,
    error_message: &str,
) -> Result<SyncTask, Error> {
    let now = Utc::now();
    let next_retry_at = now + chrono::Duration::seconds(60);

    let row = sqlx::query_as::<_, SyncTaskRow>(
        r#"
        UPDATE unified_core.inter_module_sync 
        SET retry_count = retry_count + 1,
            status = 'failed',
            error_message = $2,
            next_retry_at = $3,
            updated_at = $4
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(task_id)
    .bind(error_message)
    .bind(next_retry_at)
    .bind(now)
    .fetch_one(db)
    .await?;

    Ok(row.into())
}

pub async fn get_sync_task_by_id(db: &PgPool, task_id: Uuid) -> Result<Option<SyncTask>, Error> {
    let row = sqlx::query_as::<_, SyncTaskRow>(
        "SELECT * FROM unified_core.inter_module_sync WHERE id = $1",
    )
    .bind(task_id)
    .fetch_optional(db)
    .await?;

    Ok(row.map(|r| r.into()))
}

pub async fn get_pending_sync_tasks(db: &PgPool) -> Result<Vec<SyncTask>, Error> {
    let rows = sqlx::query_as::<_, SyncTaskRow>(
        r#"
        SELECT * FROM unified_core.inter_module_sync 
        WHERE status = 'pending' OR (status = 'failed' AND retry_count < max_retries AND next_retry_at <= NOW())
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(db)
    .await?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

pub async fn get_sync_statistics(db: &PgPool) -> Result<SyncStatistics, Error> {
    let total_tasks =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM unified_core.inter_module_sync")
            .fetch_one(db)
            .await?;

    let pending_tasks = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unified_core.inter_module_sync WHERE status = 'pending'",
    )
    .fetch_one(db)
    .await?;

    let success_tasks = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unified_core.inter_module_sync WHERE status = 'success'",
    )
    .fetch_one(db)
    .await?;

    let failed_tasks = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unified_core.inter_module_sync WHERE status = 'failed' AND retry_count >= max_retries",
    )
    .fetch_one(db)
    .await?;

    let in_progress_tasks = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM unified_core.inter_module_sync WHERE status = 'in_progress'",
    )
    .fetch_one(db)
    .await?;

    Ok(SyncStatistics {
        total_tasks,
        pending_tasks,
        success_tasks,
        failed_tasks,
        in_progress_tasks,
    })
}

pub async fn retry_failed_tasks(
    db: &PgPool,
    sync_type: Option<&str>,
    source_module: Option<&str>,
) -> Result<i64, Error> {
    let now = Utc::now();

    let result = if sync_type.is_some() && source_module.is_some() {
        sqlx::query(
            r#"
            UPDATE unified_core.inter_module_sync 
            SET status = 'pending',
                retry_count = 0,
                next_retry_at = NULL,
                updated_at = $1
            WHERE status = 'failed'
              AND sync_type = $2
              AND source_module = $3
            "#,
        )
        .bind(now)
        .bind(sync_type.unwrap())
        .bind(source_module.unwrap())
        .execute(db)
        .await?
    } else if sync_type.is_some() {
        sqlx::query(
            r#"
            UPDATE unified_core.inter_module_sync 
            SET status = 'pending',
                retry_count = 0,
                next_retry_at = NULL,
                updated_at = $1
            WHERE status = 'failed'
              AND sync_type = $2
            "#,
        )
        .bind(now)
        .bind(sync_type.unwrap())
        .execute(db)
        .await?
    } else if source_module.is_some() {
        sqlx::query(
            r#"
            UPDATE unified_core.inter_module_sync 
            SET status = 'pending',
                retry_count = 0,
                next_retry_at = NULL,
                updated_at = $1
            WHERE status = 'failed'
              AND source_module = $2
            "#,
        )
        .bind(now)
        .bind(source_module.unwrap())
        .execute(db)
        .await?
    } else {
        sqlx::query(
            r#"
            UPDATE unified_core.inter_module_sync 
            SET status = 'pending',
                retry_count = 0,
                next_retry_at = NULL,
                updated_at = $1
            WHERE status = 'failed'
            "#,
        )
        .bind(now)
        .execute(db)
        .await?
    };

    Ok(result.rows_affected() as i64)
}

pub async fn trigger_scm_to_wms_sync(
    db: &PgPool,
    purchase_order_id: Uuid,
) -> Result<SyncTask, Error> {
    create_sync_task(
        db,
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
        "purchase_order_sync",
        "scm",
        "wms",
        "purchase_order",
        Some(purchase_order_id),
        None,
    )
    .await
}

pub async fn trigger_wms_to_crm_sync(
    db: &PgPool,
    outbound_order_id: Uuid,
) -> Result<SyncTask, Error> {
    create_sync_task(
        db,
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
        "outbound_order_sync",
        "wms",
        "crm",
        "outbound_order",
        Some(outbound_order_id),
        None,
    )
    .await
}

pub async fn trigger_srm_to_scm_sync(db: &PgPool, supplier_id: Uuid) -> Result<SyncTask, Error> {
    create_sync_task(
        db,
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
        "supplier_sync",
        "srm",
        "scm",
        "supplier",
        Some(supplier_id),
        None,
    )
    .await
}
