use anyhow::Result;
use chrono::{DateTime, Utc};
use lettre::{
    message::{Mailbox, Message, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    SmtpTransport, Transport,
};
use serde_json::Value;
use sqlx::postgres::PgPool;
use std::env;
use uuid::Uuid;

use crate::models::{Email, EmailTemplate, SendEmailRequest};

pub struct EmailService {
    pool: PgPool,
    smtp_host: String,
    smtp_port: u16,
    smtp_username: String,
    smtp_password: String,
    from_address: String,
}

impl EmailService {
    pub fn new(pool: PgPool) -> Self {
        EmailService {
            pool,
            smtp_host: env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string()),
            smtp_port: env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_username: env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: env::var("SMTP_PASSWORD").unwrap_or_default(),
            from_address: env::var("SMTP_FROM_ADDRESS")
                .unwrap_or_else(|_| "noreply@topems.local".to_string()),
        }
    }

    pub async fn send_email(&self, request: SendEmailRequest) -> Result<Email> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let priority = request.priority.unwrap_or_else(|| "normal".to_string());

        let cc_addresses = request.cc_addresses.as_ref()
            .map(|v| serde_json::to_value(v))
            .transpose()?;
        let bcc_addresses = request.bcc_addresses.as_ref()
            .map(|v| serde_json::to_value(v))
            .transpose()?;

        let email = Email {
            id,
            subject: request.subject.clone(),
            from_address: self.from_address.clone(),
            to_addresses: serde_json::to_value(&request.to_addresses)?,
            cc_addresses,
            bcc_addresses,
            body: request.body.clone(),
            body_html: request.body_html.clone(),
            status: "pending".to_string(),
            priority,
            sent_at: None,
            error_message: None,
            template_id: request.template_id,
            created_at: now,
            updated_at: now,
        };

        self.save_email(&email).await?;

        let result = self.deliver_email(&email).await;

        let (status, sent_at, error_message) = match result {
            Ok(_) => ("sent".to_string(), Some(Utc::now()), None),
            Err(e) => ("failed".to_string(), None, Some(e.to_string())),
        };

        self.update_email_status(id, status, sent_at, error_message)
            .await?;

        self.get_email(id).await.ok_or_else(|| anyhow::anyhow!("邮件保存失败"))
    }

    async fn deliver_email(&self, email: &Email) -> Result<()> {
        let from_email = self.from_address.parse::<Mailbox>()?;
        
        let mut to_mailboxes = Vec::new();
        if let Ok(to_addrs) = serde_json::from_value::<Vec<String>>(email.to_addresses.clone()) {
            for addr in to_addrs {
                to_mailboxes.push(addr.parse::<Mailbox>()?);
            }
        }

        let mut cc_mailboxes = Vec::new();
        if let Some(cc_addrs) = &email.cc_addresses {
            if let Ok(addrs) = serde_json::from_value::<Vec<String>>(cc_addrs.clone()) {
                for addr in addrs {
                    cc_mailboxes.push(addr.parse::<Mailbox>()?);
                }
            }
        }

        let mut bcc_mailboxes = Vec::new();
        if let Some(bcc_addrs) = &email.bcc_addresses {
            if let Ok(addrs) = serde_json::from_value::<Vec<String>>(bcc_addrs.clone()) {
                for addr in addrs {
                    bcc_mailboxes.push(addr.parse::<Mailbox>()?);
                }
            }
        }

        let mut message_builder = Message::builder()
            .from(from_email)
            .subject(email.subject.clone());

        for to_addr in to_mailboxes {
            message_builder = message_builder.to(to_addr);
        }
        for cc_addr in cc_mailboxes {
            message_builder = message_builder.cc(cc_addr);
        }
        for bcc_addr in bcc_mailboxes {
            message_builder = message_builder.bcc(bcc_addr);
        }

        let message = if let Some(html_body) = &email.body_html {
            message_builder.multipart(
                MultiPart::alternative()
                    .singlepart(SinglePart::plain(email.body.clone()))
                    .singlepart(SinglePart::html(html_body.clone())),
            )?
        } else {
            message_builder.body(email.body.clone())?
        };

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer = SmtpTransport::relay(&self.smtp_host)?
            .port(self.smtp_port)
            .credentials(creds)
            .build();

        mailer.send(&message)?;

        Ok(())
    }

    pub async fn save_email(&self, email: &Email) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO mail.emails (
                id, subject, from_address, to_addresses, cc_addresses, bcc_addresses,
                body, body_html, status, priority, template_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
            email.id,
            email.subject,
            email.from_address,
            email.to_addresses,
            email.cc_addresses,
            email.bcc_addresses,
            email.body,
            email.body_html,
            email.status,
            email.priority,
            email.template_id,
            email.created_at,
            email.updated_at,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn update_email_status(
        &self,
        id: Uuid,
        status: String,
        sent_at: Option<DateTime<Utc>>,
        error_message: Option<String>,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE mail.emails
            SET status = $1, sent_at = $2, error_message = $3, updated_at = $4
            WHERE id = $5
            "#,
            status,
            sent_at,
            error_message,
            Utc::now(),
            id,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_email(&self, id: Uuid) -> Option<Email> {
        let result = sqlx::query!(
            r#"
            SELECT id, subject, from_address, to_addresses, cc_addresses, bcc_addresses,
                   body, body_html, status, priority, sent_at, error_message,
                   template_id, created_at, updated_at
            FROM mail.emails WHERE id = $1
            "#,
            id,
        )
        .fetch_optional(&self.pool)
        .await
        .ok()?;

        result.map(|r| Email {
            id: r.id,
            subject: r.subject,
            from_address: r.from_address,
            to_addresses: r.to_addresses,
            cc_addresses: r.cc_addresses,
            bcc_addresses: r.bcc_addresses,
            body: r.body,
            body_html: r.body_html,
            status: r.status,
            priority: r.priority,
            sent_at: r.sent_at,
            error_message: r.error_message,
            template_id: r.template_id,
            created_at: r.created_at.unwrap_or_else(|| Utc::now()),
            updated_at: r.updated_at.unwrap_or_else(|| Utc::now()),
        })
    }

    pub async fn list_emails(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        priority: Option<String>,
    ) -> Result<(Vec<Email>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let emails: Vec<Email> = sqlx::query!(
            r#"
            SELECT id, subject, from_address, to_addresses, cc_addresses, bcc_addresses,
                   body, body_html, status, priority, sent_at, error_message,
                   template_id, created_at, updated_at
            FROM mail.emails
            WHERE ($1::text IS NULL OR subject ILIKE $1 OR from_address ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR priority = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
            search_pattern,
            status,
            priority,
            page_size,
            offset,
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|r| Email {
            id: r.id,
            subject: r.subject,
            from_address: r.from_address,
            to_addresses: r.to_addresses,
            cc_addresses: r.cc_addresses,
            bcc_addresses: r.bcc_addresses,
            body: r.body,
            body_html: r.body_html,
            status: r.status,
            priority: r.priority,
            sent_at: r.sent_at,
            error_message: r.error_message,
            template_id: r.template_id,
            created_at: r.created_at.unwrap_or_else(|| Utc::now()),
            updated_at: r.updated_at.unwrap_or_else(|| Utc::now()),
        })
        .collect();

        let total = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) FROM mail.emails
            WHERE ($1::text IS NULL OR subject ILIKE $1 OR from_address ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR priority = $3)
            "#,
            search_pattern,
            status,
            priority,
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        Ok((emails, total))
    }

    pub async fn delete_email(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query!(
            "DELETE FROM mail.emails WHERE id = $1",
            id,
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct TemplateService {
    pool: PgPool,
}

impl TemplateService {
    pub fn new(pool: PgPool) -> Self {
        TemplateService { pool }
    }

    pub async fn create_template(
        &self,
        code: String,
        name: String,
        description: Option<String>,
        subject_template: String,
        body_template: String,
        body_html_template: Option<String>,
        category: Option<String>,
        tags: Option<Vec<String>>,
    ) -> Result<EmailTemplate> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let category = category.unwrap_or_else(|| "general".to_string());
        let tags_json = tags.map(|t| serde_json::to_value(t)).transpose()?;

        let result = sqlx::query!(
            r#"
            INSERT INTO mail.templates (
                id, code, name, description, subject_template, body_template,
                body_html_template, category, tags, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
            RETURNING id, code, name, description, subject_template, body_template,
                      body_html_template, category, tags, status, created_at, updated_at
            "#,
            id,
            code,
            name,
            description,
            subject_template,
            body_template,
            body_html_template,
            category,
            tags_json,
            now,
            now,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(EmailTemplate {
            id: result.id,
            code: result.code,
            name: result.name,
            description: result.description,
            subject_template: result.subject_template,
            body_template: result.body_template,
            body_html_template: result.body_html_template,
            category: result.category,
            tags: result.tags,
            status: result.status,
            created_at: result.created_at.unwrap_or(now),
            updated_at: result.updated_at.unwrap_or(now),
        })
    }

    pub async fn get_template(&self, id: Uuid) -> Option<EmailTemplate> {
        let result = sqlx::query!(
            r#"
            SELECT id, code, name, description, subject_template, body_template,
                   body_html_template, category, tags, status, created_at, updated_at
            FROM mail.templates WHERE id = $1
            "#,
            id,
        )
        .fetch_optional(&self.pool)
        .await
        .ok()?;

        result.map(|r| EmailTemplate {
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            subject_template: r.subject_template,
            body_template: r.body_template,
            body_html_template: r.body_html_template,
            category: r.category,
            tags: r.tags,
            status: r.status,
            created_at: r.created_at.unwrap_or_else(|| Utc::now()),
            updated_at: r.updated_at.unwrap_or_else(|| Utc::now()),
        })
    }

    pub async fn get_template_by_code(&self, code: &str) -> Option<EmailTemplate> {
        let result = sqlx::query!(
            r#"
            SELECT id, code, name, description, subject_template, body_template,
                   body_html_template, category, tags, status, created_at, updated_at
            FROM mail.templates WHERE code = $1 AND status = 'active'
            "#,
            code,
        )
        .fetch_optional(&self.pool)
        .await
        .ok()?;

        result.map(|r| EmailTemplate {
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            subject_template: r.subject_template,
            body_template: r.body_template,
            body_html_template: r.body_html_template,
            category: r.category,
            tags: r.tags,
            status: r.status,
            created_at: r.created_at.unwrap_or_else(|| Utc::now()),
            updated_at: r.updated_at.unwrap_or_else(|| Utc::now()),
        })
    }

    pub async fn list_templates(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        category: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<EmailTemplate>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let templates: Vec<EmailTemplate> = sqlx::query!(
            r#"
            SELECT id, code, name, description, subject_template, body_template,
                   body_html_template, category, tags, status, created_at, updated_at
            FROM mail.templates
            WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR category = $2)
              AND ($3::text IS NULL OR status = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
            search_pattern,
            category,
            status,
            page_size,
            offset,
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|r| EmailTemplate {
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            subject_template: r.subject_template,
            body_template: r.body_template,
            body_html_template: r.body_html_template,
            category: r.category,
            tags: r.tags,
            status: r.status,
            created_at: r.created_at.unwrap_or_else(|| Utc::now()),
            updated_at: r.updated_at.unwrap_or_else(|| Utc::now()),
        })
        .collect();

        let total = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) FROM mail.templates
            WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR category = $2)
              AND ($3::text IS NULL OR status = $3)
            "#,
            search_pattern,
            category,
            status,
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(0);

        Ok((templates, total))
    }

    pub async fn update_template(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        subject_template: Option<String>,
        body_template: Option<String>,
        body_html_template: Option<String>,
        category: Option<String>,
        tags: Option<Vec<String>>,
        status: Option<String>,
    ) -> Result<EmailTemplate> {
        let existing = self.get_template(id).await;
        let existing = existing.ok_or_else(|| anyhow::anyhow!("模板不存在"))?;

        let name = name.unwrap_or(existing.name);
        let description = description.or(existing.description);
        let subject_template = subject_template.unwrap_or(existing.subject_template);
        let body_template = body_template.unwrap_or(existing.body_template);
        let body_html_template = body_html_template.or(existing.body_html_template);
        let category = category.unwrap_or(existing.category);
        let tags_json = tags.map(|t| serde_json::to_value(t)).transpose()?.or(existing.tags);
        let status = status.unwrap_or(existing.status);
        let now = Utc::now();

        let result = sqlx::query!(
            r#"
            UPDATE mail.templates
            SET name = $2, description = $3, subject_template = $4, body_template = $5,
                body_html_template = $6, category = $7, tags = $8, status = $9, updated_at = $10
            WHERE id = $1
            RETURNING id, code, name, description, subject_template, body_template,
                      body_html_template, category, tags, status, created_at, updated_at
            "#,
            id,
            name,
            description,
            subject_template,
            body_template,
            body_html_template,
            category,
            tags_json,
            status,
            now,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(EmailTemplate {
            id: result.id,
            code: result.code,
            name: result.name,
            description: result.description,
            subject_template: result.subject_template,
            body_template: result.body_template,
            body_html_template: result.body_html_template,
            category: result.category,
            tags: result.tags,
            status: result.status,
            created_at: result.created_at.unwrap_or(now),
            updated_at: result.updated_at.unwrap_or(now),
        })
    }

    pub async fn delete_template(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query!(
            "DELETE FROM mail.templates WHERE id = $1",
            id,
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub fn render_template(template: &EmailTemplate, data: &Value) -> (String, String, Option<String>) {
        let subject = Self::render_string(&template.subject_template, data);
        let body = Self::render_string(&template.body_template, data);
        let body_html = template.body_html_template.as_ref().map(|t| Self::render_string(t, data));

        (subject, body, body_html)
    }

    fn render_string(template: &str, data: &Value) -> String {
        let mut result = template.to_string();
        
        for (key, value) in data.as_object().unwrap_or(&serde_json::Map::new()) {
            let placeholder = format!("{{{{{}}}}}", key);
            let value_str = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => "".to_string(),
                Value::Array(_) => value.to_string(),
                Value::Object(_) => value.to_string(),
            };
            result = result.replace(&placeholder, &value_str);
        }
        
        result
    }
}
