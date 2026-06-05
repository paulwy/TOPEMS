use sqlx::{PgPool, Row};
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
        
        let rows = if let Some(nt) = ntype {
            sqlx::query(
                "SELECT * FROM notifications WHERE user_id = $1 AND notification_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(user_id)
            .bind(nt.to_string())
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query(
                "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(user_id)
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?
        };
        
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

    pub async fn bulk_mark_as_read(
        pool: &PgPool,
        notification_ids: &[Uuid],
    ) -> sqlx::Result<usize> {
        let result = sqlx::query(
            "UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ANY($1)"
        )
        .bind(notification_ids)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn bulk_delete_notifications(
        pool: &PgPool,
        notification_ids: &[Uuid],
    ) -> sqlx::Result<usize> {
        let result = sqlx::query(
            "DELETE FROM notifications WHERE id = ANY($1)"
        )
        .bind(notification_ids)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() as usize)
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

    // ==================== 通知模板方法 ====================

    pub async fn create_template(
        pool: &PgPool,
        req: CreateTemplateRequest,
    ) -> sqlx::Result<NotificationTemplate> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let default_priority = req.default_priority.unwrap_or(2);

        let template = NotificationTemplate {
            id,
            name: req.name,
            description: req.description,
            notification_type: req.notification_type,
            title_template: req.title_template,
            content_template: req.content_template,
            data_schema: req.data_schema,
            default_priority,
            status: TemplateStatus::Active,
            is_archived: false,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            r#"INSERT INTO notification_templates 
               (id, name, description, notification_type, title_template, content_template, 
                data_schema, default_priority, status, is_archived, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#
        )
        .bind(id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(template.notification_type.to_string())
        .bind(&template.title_template)
        .bind(&template.content_template)
        .bind(&template.data_schema)
        .bind(template.default_priority)
        .bind(template.status.to_string())
        .bind(template.is_archived)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(template)
    }

    pub async fn get_template(
        pool: &PgPool,
        template_id: &Uuid,
    ) -> sqlx::Result<Option<NotificationTemplate>> {
        let row = sqlx::query(
            "SELECT * FROM notification_templates WHERE id = $1"
        )
        .bind(template_id)
        .fetch_optional(pool)
        .await?;

        if let Some(r) = row {
            Self::template_from_row(&r)
        } else {
            Ok(None)
        }
    }

    pub async fn list_templates(
        pool: &PgPool,
        page: usize,
        page_size: usize,
        status: Option<TemplateStatus>,
    ) -> sqlx::Result<Vec<NotificationTemplate>> {
        let offset = (page - 1) * page_size;
        
        let rows = if let Some(s) = status {
            sqlx::query(
                "SELECT * FROM notification_templates WHERE status = $1 AND is_archived = FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(s.to_string())
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query(
                "SELECT * FROM notification_templates WHERE is_archived = FALSE ORDER BY created_at DESC LIMIT $1 OFFSET $2"
            )
            .bind(page_size as i64)
            .bind(offset as i64)
            .fetch_all(pool)
            .await?
        };

        let mut templates = Vec::new();
        for row in rows {
            if let Ok(t) = Self::template_from_row(&row) {
                templates.extend(t);
            }
        }
        Ok(templates)
    }

    pub async fn count_templates(
        pool: &PgPool,
        status: Option<TemplateStatus>,
    ) -> sqlx::Result<usize> {
        let count: i64 = if let Some(s) = status {
            sqlx::query_scalar(
                "SELECT COUNT(*) FROM notification_templates WHERE status = $1 AND is_archived = FALSE"
            )
            .bind(s.to_string())
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_scalar(
                "SELECT COUNT(*) FROM notification_templates WHERE is_archived = FALSE"
            )
            .fetch_one(pool)
            .await?
        };
        Ok(count as usize)
    }

    pub async fn update_template(
        pool: &PgPool,
        template_id: &Uuid,
        req: UpdateTemplateRequest,
    ) -> sqlx::Result<Option<NotificationTemplate>> {
        let now = Utc::now();
        
        // 先获取现有模板
        let existing = match Self::get_template(pool, template_id).await? {
            Some(t) => t,
            None => return Ok(None),
        };
        
        // 合并更新
        let name = req.name.unwrap_or(existing.name);
        let description = req.description.or(existing.description);
        let notification_type = existing.notification_type;
        let title_template = req.title_template.unwrap_or(existing.title_template);
        let content_template = req.content_template.unwrap_or(existing.content_template);
        let data_schema = req.data_schema.or(existing.data_schema);
        let default_priority = req.default_priority.unwrap_or(existing.default_priority);
        let status = req.status.unwrap_or(existing.status);
        
        // 更新数据库
        let row = sqlx::query(
            "UPDATE notification_templates 
             SET name = $1, description = $2, notification_type = $3, 
                 title_template = $4, content_template = $5, data_schema = $6, 
                 default_priority = $7, status = $8, updated_at = $9 
             WHERE id = $10 
             RETURNING *"
        )
        .bind(&name)
        .bind(&description)
        .bind(notification_type.to_string())
        .bind(&title_template)
        .bind(&content_template)
        .bind(&data_schema)
        .bind(default_priority)
        .bind(status.to_string())
        .bind(now)
        .bind(template_id)
        .fetch_optional(pool)
        .await?;
        
        if let Some(r) = row {
            Self::template_from_row(&r)
        } else {
            Ok(None)
        }
    }

    pub async fn delete_template(
        pool: &PgPool,
        template_id: &Uuid,
    ) -> sqlx::Result<bool> {
        let result = sqlx::query(
            "UPDATE notification_templates SET is_archived = TRUE WHERE id = $1"
        )
        .bind(template_id)
        .execute(pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    fn template_from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Option<NotificationTemplate>> {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let description: Option<String> = row.get("description");
        let notification_type_str: String = row.get("notification_type");
        let title_template: String = row.get("title_template");
        let content_template: String = row.get("content_template");
        let data_schema: Option<serde_json::Value> = row.get("data_schema");
        let default_priority: i16 = row.get("default_priority");
        let status_str: String = row.get("status");
        let is_archived: bool = row.get("is_archived");
        let created_at: chrono::DateTime<Utc> = row.get("created_at");
        let updated_at: chrono::DateTime<Utc> = row.get("updated_at");

        let notification_type = match NotificationType::from_str(&notification_type_str) {
            Some(t) => t,
            None => return Ok(None),
        };
        let status = match TemplateStatus::from_str(&status_str) {
            Some(s) => s,
            None => return Ok(None),
        };

        Ok(Some(NotificationTemplate {
            id,
            name,
            description,
            notification_type,
            title_template,
            content_template,
            data_schema,
            default_priority,
            status,
            is_archived,
            created_at,
            updated_at,
        }))
    }

    // ==================== 模板渲染方法 ====================

    fn render_template(template: &str, variables: &serde_json::Value) -> String {
        let mut result = template.to_string();
        
        if let serde_json::Value::Object(map) = variables {
            for (key, value) in map {
                let placeholder = format!("{{{{{}}}}}", key);
                let replacement = match value {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    _ => value.to_string(),
                };
                result = result.replace(&placeholder, &replacement);
            }
        }
        
        result
    }

    pub async fn render_and_create_notification(
        pool: &PgPool,
        req: RenderTemplateRequest,
    ) -> sqlx::Result<Option<Notification>> {
        let template = match Self::get_template(pool, &req.template_id).await? {
            Some(t) => t,
            None => return Ok(None),
        };

        if template.status != TemplateStatus::Active {
            return Ok(None);
        }

        let title = Self::render_template(&template.title_template, &req.variables);
        let content = Self::render_template(&template.content_template, &req.variables);
        let priority = req.priority.unwrap_or(template.default_priority);

        let create_req = CreateNotificationRequest {
            user_id: req.user_id,
            notification_type: template.notification_type,
            title,
            content,
            data: Some(req.variables),
            priority: Some(priority),
        };

        Ok(Some(Self::create_notification(pool, create_req).await?))
    }

    // ==================== 归档方法 ====================

    pub async fn archive_notification(
        pool: &PgPool,
        notification_id: &Uuid,
    ) -> sqlx::Result<bool> {
        let notification = match Self::get_notification(pool, notification_id).await? {
            Some(n) => n,
            None => return Ok(false),
        };

        let archived_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO archived_notifications 
               (id, original_notification_id, user_id, notification_type, title, content, 
                data, priority, created_at, read_at, archived_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#
        )
        .bind(archived_id)
        .bind(&notification.id)
        .bind(&notification.user_id)
        .bind(notification.notification_type.to_string())
        .bind(&notification.title)
        .bind(&notification.content)
        .bind(&notification.data)
        .bind(notification.priority)
        .bind(&notification.created_at)
        .bind(&notification.read_at)
        .bind(now)
        .execute(pool)
        .await?;

        Self::delete_notification(pool, notification_id).await?;
        Ok(true)
    }

    pub async fn get_archive_config(
        pool: &PgPool,
    ) -> sqlx::Result<ArchiveConfig> {
        let row = sqlx::query(
            "SELECT * FROM archive_config ORDER BY id DESC LIMIT 1"
        )
        .fetch_one(pool)
        .await?;

        let auto_archive_days: i32 = row.get("auto_archive_days");
        let retention_days: i32 = row.get("retention_days");
        let enabled: bool = row.get("enabled");

        Ok(ArchiveConfig {
            auto_archive_days,
            retention_days,
            enabled,
        })
    }

    pub async fn update_archive_config(
        pool: &PgPool,
        config: ArchiveConfig,
    ) -> sqlx::Result<ArchiveConfig> {
        let now = Utc::now();
        
        sqlx::query(
            "UPDATE archive_config SET auto_archive_days = $1, retention_days = $2, enabled = $3, updated_at = $4"
        )
        .bind(config.auto_archive_days)
        .bind(config.retention_days)
        .bind(config.enabled)
        .bind(now)
        .execute(pool)
        .await?;

        Self::get_archive_config(pool).await
    }

    pub async fn auto_archive_old_notifications(
        pool: &PgPool,
    ) -> sqlx::Result<usize> {
        let config = Self::get_archive_config(pool).await?;
        if !config.enabled {
            return Ok(0);
        }

        let threshold = Utc::now() - chrono::Duration::days(config.auto_archive_days as i64);
        
        let notifications_to_archive = sqlx::query(
            "SELECT id FROM notifications WHERE created_at < $1"
        )
        .bind(threshold)
        .fetch_all(pool)
        .await?;

        let mut archived_count = 0;
        for row in notifications_to_archive {
            let id: Uuid = row.get("id");
            if Self::archive_notification(pool, &id).await? {
                archived_count += 1;
            }
        }

        Ok(archived_count)
    }

    pub async fn clean_old_archived_notifications(
        pool: &PgPool,
    ) -> sqlx::Result<usize> {
        let config = Self::get_archive_config(pool).await?;
        let threshold = Utc::now() - chrono::Duration::days(config.retention_days as i64);

        let result = sqlx::query(
            "DELETE FROM archived_notifications WHERE archived_at < $1"
        )
        .bind(threshold)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() as usize)
    }

    pub async fn list_archived_notifications(
        pool: &PgPool,
        user_id: &str,
        page: usize,
        page_size: usize,
    ) -> sqlx::Result<Vec<ArchivedNotification>> {
        let offset = (page - 1) * page_size;
        
        let rows = sqlx::query(
            "SELECT * FROM archived_notifications WHERE user_id = $1 ORDER BY archived_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(user_id)
        .bind(page_size as i64)
        .bind(offset as i64)
        .fetch_all(pool)
        .await?;

        let mut archived = Vec::new();
        for row in rows {
            if let Ok(n) = Self::archived_notification_from_row(&row) {
                archived.push(n);
            }
        }
        Ok(archived)
    }

    fn archived_notification_from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<ArchivedNotification> {
        let id: Uuid = row.get("id");
        let original_notification_id: Uuid = row.get("original_notification_id");
        let user_id: String = row.get("user_id");
        let notification_type_str: String = row.get("notification_type");
        let title: String = row.get("title");
        let content: String = row.get("content");
        let data: Option<serde_json::Value> = row.get("data");
        let priority: i16 = row.get("priority");
        let created_at: chrono::DateTime<Utc> = row.get("created_at");
        let read_at: Option<chrono::DateTime<Utc>> = row.get("read_at");
        let archived_at: chrono::DateTime<Utc> = row.get("archived_at");

        let notification_type = NotificationType::from_str(&notification_type_str)
            .unwrap_or(NotificationType::System);

        Ok(ArchivedNotification {
            id,
            original_notification_id,
            user_id,
            notification_type,
            title,
            content,
            data,
            priority,
            created_at,
            read_at,
            archived_at,
        })
    }

    // ==================== 统计方法 ====================

    pub async fn get_notification_stats(
        pool: &PgPool,
        user_id: Option<&str>,
    ) -> sqlx::Result<NotificationStats> {
        let (total, unread, read, archived) = if let Some(uid) = user_id {
            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1")
                .bind(uid)
                .fetch_one(pool)
                .await?;
            let unread: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE")
                .bind(uid)
                .fetch_one(pool)
                .await?;
            let read: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = TRUE")
                .bind(uid)
                .fetch_one(pool)
                .await?;
            let archived: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM archived_notifications WHERE user_id = $1")
                .bind(uid)
                .fetch_one(pool)
                .await?;
            (total, unread, read, archived)
        } else {
            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications")
                .fetch_one(pool)
                .await?;
            let unread: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE is_read = FALSE")
                .fetch_one(pool)
                .await?;
            let read: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE is_read = TRUE")
                .fetch_one(pool)
                .await?;
            let archived: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM archived_notifications")
                .fetch_one(pool)
                .await?;
            (total, unread, read, archived)
        };

        let mut notifications_by_type = serde_json::Map::new();
        for nt in &["system", "workflow", "reminder", "alert", "message"] {
            let count: i64 = if let Some(uid) = user_id {
                sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND notification_type = $2")
                    .bind(uid)
                    .bind(nt)
                    .fetch_one(pool)
                    .await?
            } else {
                sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = $1")
                    .bind(nt)
                    .fetch_one(pool)
                    .await?
            };
            notifications_by_type.insert(nt.to_string(), serde_json::json!(count));
        }

        let mut notifications_by_day = serde_json::Map::new();
        for day_offset in 0..7 {
            let date = Utc::now() - chrono::Duration::days(day_offset);
            let date_str = date.format("%Y-%m-%d").to_string();
            let next_date = date + chrono::Duration::days(1);
            
            let count: i64 = if let Some(uid) = user_id {
                sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND created_at >= $2 AND created_at < $3")
                    .bind(uid)
                    .bind(date)
                    .bind(next_date)
                    .fetch_one(pool)
                    .await?
            } else {
                sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE created_at >= $1 AND created_at < $2")
                    .bind(date)
                    .bind(next_date)
                    .fetch_one(pool)
                    .await?
            };
            notifications_by_day.insert(date_str, serde_json::json!(count));
        }

        Ok(NotificationStats {
            total_notifications: total,
            unread_notifications: unread,
            read_notifications: read,
            archived_notifications: archived,
            notifications_by_type: serde_json::Value::Object(notifications_by_type),
            notifications_by_day: serde_json::Value::Object(notifications_by_day),
            generated_at: Utc::now(),
        })
    }
}
