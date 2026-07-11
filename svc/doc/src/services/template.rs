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

    pub async fn list_templates(&self, tenant_id: Uuid) -> Result<Vec<Template>> {
        sqlx::query_as::<_, Template>(
            r#"SELECT * FROM doc.templates WHERE tenant_id = $1 ORDER BY name"#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
    ) -> Result<Option<Template>> {
        sqlx::query_as::<_, Template>(
            r#"SELECT * FROM doc.templates WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(template_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_template(
        &self,
        tenant_id: Uuid,
        req: CreateTemplateRequest,
        created_by: &str,
    ) -> Result<Template> {
        let fields = req.fields.unwrap_or(serde_json::json!([]));
        sqlx::query_as::<_, Template>(
            r#"
            INSERT INTO doc.templates (tenant_id, name, category, description, content, content_type, fields, is_enabled, is_default, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.content)
        .bind(req.content_type.unwrap_or_else(|| "html".to_string()))
        .bind(Some(fields))
        .bind(req.is_enabled.unwrap_or(true))
        .bind(req.is_default.unwrap_or(false))
        .bind(Some(created_by.to_string()))
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
        req: UpdateTemplateRequest,
    ) -> Result<Option<Template>> {
        sqlx::query_as::<_, Template>(
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
            WHERE tenant_id = $10 AND id = $1
            RETURNING *
            "#,
        )
        .bind(template_id)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.content)
        .bind(req.content_type)
        .bind(req.fields)
        .bind(req.is_enabled)
        .bind(req.is_default)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_template(&self, tenant_id: Uuid, template_id: Uuid) -> Result<bool> {
        let result = sqlx::query(r#"DELETE FROM doc.templates WHERE tenant_id = $1 AND id = $2"#)
            .bind(tenant_id)
            .bind(template_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS doc.templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
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
