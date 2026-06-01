use sqlx::PgPool;
use crate::models::*;
use chrono::Utc;
use uuid::Uuid;

pub struct Repository;

impl Repository {
    pub async fn get_user_notifications(
        pool: &PgPool,
        user_id: &str,
        ntype: Option<&NotificationType>,
        page: usize,
        page_size: usize,
    ) -> sqlx::Result<Vec<Notification>> {
        let offset = (page - 1) * page_size;
        
        let mut query = sqlx::query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        );
        query = query.bind(user_id).bind(page_size as i64).bind(offset as i64);
        
        if let Some(nt) = ntype {
            query = sqlx::query(
                "SELECT * FROM notifications WHERE user_id = $1 AND notification_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            ).bind(user_id).bind(nt.to_string()).bind(page_size as i64).bind(offset as i64);
        }
        
        let rows = query.fetch_all(pool).await?;
        rows.iter().map(|row| Notification::from_row(row)).collect()
    }

    pub async fn get_user_notifications_count(
        pool: &PgPool,
        user_id: &str,
        ntype: Option<&NotificationType>,
    ) -> sqlx::Result<usize> {
        if let Some(nt) = ntype {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND notification_type = $2"
            )
            .bind(user_id)
            .bind(nt.to_string())
            .fetch_one(pool)
            .await?;
            Ok(count.0 as usize)
        } else {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1"
            )
            .bind(user_id)
            .fetch_one(pool)
            .await?;
            Ok(count.0 as usize)
        }
    }

    pub async fn get_unread_notifications(
        pool: &PgPool,
        user_id: &str,
    ) -> sqlx::Result<Vec<Notification>> {
        let rows = sqlx::query(
            "SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC"
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;
        rows.iter().map(|row| Notification::from_row(row)).collect()
    }

    pub async fn get_unread_count(
        pool: &PgPool,
        user_id: &str,
    ) -> sqlx::Result<usize> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE"
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;
        Ok(count.0 as usize)
    }

    pub async fn create_notification(
        pool: &PgPool,
        req: CreateNotificationRequest,
    ) -> sqlx::Result<Notification> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let notification = Notification {
            id,
            user_id: req.user_id.clone(),
            notification_type: req.notification_type,
            title: req.title,
            content: req.content,
            data: req.data,
            is_read: false,
            priority: req.priority.unwrap_or(2),
            created_at: now,
            read_at: None,
        };

        sqlx::query(
            "INSERT INTO notifications (id, user_id, notification_type, title, content, data, is_read, priority, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
        )
        .bind(id)
        .bind(&notification.user_id)
        .bind(notification.notification_type.to_string())
        .bind(&notification.title)
        .bind(&notification.content)
        .bind(&notification.data)
        .bind(notification.is_read)
        .bind(notification.priority as i16)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(notification)
    }

    pub async fn mark_as_read(
        pool: &PgPool,
        notification_id: &Uuid,
    ) -> sqlx::Result<Option<Notification>> {
        let now = Utc::now();
        let result = sqlx::query(
            "UPDATE notifications SET is_read = TRUE, read_at = $1 WHERE id = $2 RETURNING *"
        )
        .bind(now)
        .bind(notification_id)
        .fetch_optional(pool)
        .await?;
        
        if let Some(row) = result {
            Ok(Some(Notification::from_row(&row)?))
        } else {
            Ok(None)
        }
    }

    pub async fn mark_all_as_read(
        pool: &PgPool,
        user_id: &str,
    ) -> sqlx::Result<usize> {
        let result = sqlx::query(
            "UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = FALSE"
        )
        .bind(user_id)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn delete_notification(
        pool: &PgPool,
        notification_id: &Uuid,
    ) -> sqlx::Result<bool> {
        let result = sqlx::query(
            "DELETE FROM notifications WHERE id = $1"
        )
        .bind(notification_id)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn get_notification(
        pool: &PgPool,
        notification_id: &Uuid,
    ) -> sqlx::Result<Option<Notification>> {
        let row = sqlx::query(
            "SELECT * FROM notifications WHERE id = $1"
        )
        .bind(notification_id)
        .fetch_optional(pool)
        .await?;
        if let Some(r) = row {
            Ok(Some(Notification::from_row(&r)?))
        } else {
            Ok(None)
        }
    }
}
