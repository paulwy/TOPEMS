use sqlx::{PgPool, Result};
use uuid::Uuid;

use crate::models::{CreateTemplateRequest, Template, UpdateTemplateRequest};

pub struct TemplateService {
    pool: PgPool,
}

impl TemplateService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_templates(&self) -> Result<Vec<Template>> {
        sqlx::query_as!(Template, r#"SELECT * FROM doc.templates ORDER BY name"#)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_template(&self, template_id: Uuid) -> Result<Option<Template>> {
        sqlx::query_as!(
            Template,
            r#"SELECT * FROM doc.templates WHERE id = $1"#,
            template_id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_template(
        &self,
        req: CreateTemplateRequest,
        created_by: &str,
    ) -> Result<Template> {
        let fields = req.fields.unwrap_or(serde_json::json!([]));
        sqlx::query_as!(
            Template,
            r#"
            INSERT INTO doc.templates (name, category, description, content, content_type, fields, is_enabled, is_default, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
            req.name,
            req.category,
            req.description,
            req.content,
            req.content_type.unwrap_or_else(|| "html".to_string()),
            Some(fields),
            req.is_enabled.unwrap_or(true),
            req.is_default.unwrap_or(false),
            Some(created_by.to_string())
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_template(
        &self,
        template_id: Uuid,
        req: UpdateTemplateRequest,
    ) -> Result<Option<Template>> {
        sqlx::query_as!(
            Template,
            r#"
            UPDATE doc.templates
            SET name = COALESCE($2, name),
                category = COALESCE($3, category),
                description = COALESCE($4, description),
                content = COALESCE($5, content),
                content_type = COALESCE($6, content_type),
                fields = COALESCE($7, fields),
                is_enabled = COALESCE($8, is_enabled),
                is_default = COALESCE($9, is_default),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
            template_id,
            req.name,
            req.category,
            req.description,
            req.content,
            req.content_type,
            req.fields,
            req.is_enabled,
            req.is_default
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_template(&self, template_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(r#"DELETE FROM doc.templates WHERE id = $1"#, template_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS doc;"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS doc.templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            description TEXT,
            content TEXT NOT NULL,
            content_type VARCHAR(50) DEFAULT 'html',
            fields JSONB DEFAULT '[]',
            is_enabled BOOLEAN DEFAULT true,
            is_default BOOLEAN DEFAULT false,
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
