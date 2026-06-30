use sqlx::{PgPool, Result};
use uuid::Uuid;

use crate::models::{CreateTemplateRequest, Template, UpdateTemplateRequest};

pub struct TemplateService {
    pool: std::sync::Arc<PgPool>,
}

impl TemplateService {
    pub fn new(pool: std::sync::Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn list_templates(&self) -> Result<Vec<Template>> {
        sqlx::query_as!(
            Template,
            r#"SELECT * FROM core_doc_templates ORDER BY name"#
        )
        .fetch_all(&*self.pool)
        .await
    }

    pub async fn get_template(&self, template_id: Uuid) -> Result<Option<Template>> {
        sqlx::query_as!(
            Template,
            r#"SELECT * FROM core_doc_templates WHERE id = $1"#,
            template_id
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn create_template(
        &self,
        req: CreateTemplateRequest,
        created_by: Uuid,
    ) -> Result<Template> {
        let variables = req.variables.unwrap_or(serde_json::json!([]));
        sqlx::query_as!(
            Template,
            r#"
            INSERT INTO core_doc_templates (name, description, content, variables, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
            req.name,
            req.description,
            req.content,
            variables,
            created_by
        )
        .fetch_one(&*self.pool)
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
            UPDATE core_doc_templates
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                content = COALESCE($4, content),
                variables = COALESCE($5, variables),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
            template_id,
            req.name,
            req.description,
            req.content,
            req.variables
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn delete_template(&self, template_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(
            r#"DELETE FROM core_doc_templates WHERE id = $1"#,
            template_id
        )
        .execute(&*self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_doc_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            description TEXT,
            content TEXT NOT NULL,
            variables JSONB DEFAULT '[]',
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
