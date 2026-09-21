//! SMTP configuration handlers (P36-5)
//!
//! Endpoints:
//! - `GET /system/settings/smtp` — return current SMTP config (password masked)
//! - `PUT /system/settings/smtp` — upsert SMTP config
//! - `POST /system/settings/smtp/test` — send a test email using provided/saved config

use crate::modules::settings::{decrypt_secret, encrypt_secret, tenant_uuid};
use crate::AppState;
use axum::extract::State;
use axum::{Extension, Json};
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::transport::smtp::SmtpTransport;
use lettre::{Message, Transport};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

const SMTP_CONFIG_KEY: &str = "smtp_config";
const PASSWORD_MASK: &str = "********";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub user: String,
    #[serde(default)]
    pub password: String,
    #[serde(default = "default_tls")]
    pub tls: String,
    pub from_email: String,
    pub from_name: String,
}

fn default_tls() -> String {
    "starttls".to_string()
}

impl Default for SmtpConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            host: String::new(),
            port: 587,
            user: String::new(),
            password: String::new(),
            tls: default_tls(),
            from_email: String::new(),
            from_name: String::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct TestEmailRequest {
    pub to: String,
    /// Optional inline config to test before saving. If omitted, the saved
    /// config is used.
    #[serde(default)]
    pub config: Option<SmtpConfig>,
}

/// `GET /system/settings/smtp`
pub async fn get_smtp_config(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SmtpConfig>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_uuid(&claims))
    };

    let result = sqlx::query(
        "SELECT setting_value FROM core_tenant_settings WHERE ($1::uuid IS NULL OR tenant_id = $1) AND setting_key = $2",
    )
    .bind(tenant_id)
    .bind(SMTP_CONFIG_KEY)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let raw: String = row.get("setting_value");
            match serde_json::from_str::<SmtpConfig>(&raw) {
                Ok(mut cfg) => {
                    // Decrypt the stored password (no-op for legacy plain text)
                    // before applying the response mask.
                    cfg.password = decrypt_secret(&state, &cfg.password);
                    cfg.password = if cfg.password.is_empty() {
                        String::new()
                    } else {
                        PASSWORD_MASK.to_string()
                    };
                    Json(ApiResponse::success(cfg, "获取 SMTP 配置成功"))
                }
                Err(e) => {
                    tracing::error!("Failed to parse SMTP config: {}", e);
                    Json(ApiResponse::success(
                        SmtpConfig::default(),
                        "SMTP 配置为空或解析失败，已返回默认配置",
                    ))
                }
            }
        }
        Ok(None) => Json(ApiResponse::success(
            SmtpConfig::default(),
            "SMTP 配置尚未配置，已返回默认配置",
        )),
        Err(e) => {
            tracing::error!("Failed to load SMTP config: {}", e);
            Json(ApiResponse::from(TopemsError::internal(
                "获取 SMTP 配置失败",
                e,
            )))
        }
    }
}

/// `PUT /system/settings/smtp`
pub async fn update_smtp_config(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SmtpConfig>,
) -> Json<ApiResponse<SmtpConfig>> {
    let tenant_id = tenant_uuid(&claims);

    // If the caller submitted the masked placeholder or an empty password,
    // preserve the previously stored password so the secret is not clobbered.
    let mut to_store = payload.clone();
    if to_store.password.is_empty() || to_store.password == PASSWORD_MASK {
        let existing = sqlx::query(
            "SELECT setting_value FROM core_tenant_settings WHERE ($1::uuid IS NULL OR tenant_id = $1) AND setting_key = $2",
        )
        .bind(tenant_id)
        .bind(SMTP_CONFIG_KEY)
        .fetch_optional(&state.pool)
        .await;
        if let Ok(Some(row)) = existing {
            let raw: String = row.get("setting_value");
            if let Ok(prev) = serde_json::from_str::<SmtpConfig>(&raw) {
                // `prev.password` may already be an encrypted blob (pass-through)
                // or legacy plain text; `encrypt_secret` below handles both.
                to_store.password = prev.password;
            }
        }
    }

    // Encrypt the password for at-rest storage. Already-encrypted values
    // preserved from the previous row and empty values are left unchanged.
    to_store.password = encrypt_secret(&state, &to_store.password);

    let serialized = match serde_json::to_string(&to_store) {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::from(TopemsError::internal(
                "序列化 SMTP 配置失败",
                e,
            )));
        }
    };

    let result = sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        "#,
    )
    .bind(tenant_id)
    .bind(SMTP_CONFIG_KEY)
    .bind(&serialized)
    .execute(&state.pool)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to save SMTP config: {}", e);
        return Json(ApiResponse::from(TopemsError::internal(
            "保存 SMTP 配置失败",
            e,
        )));
    }

    // Return the config with a masked password.
    let mut response = to_store;
    response.password = if response.password.is_empty() {
        String::new()
    } else {
        PASSWORD_MASK.to_string()
    };
    Json(ApiResponse::success(response, "保存 SMTP 配置成功"))
}

/// `POST /system/settings/smtp/test`
pub async fn test_smtp_config(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<TestEmailRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if payload.to.is_empty() {
        return Json(ApiResponse::error(400, "收件人邮箱不能为空"));
    }

    // Use inline config if provided, otherwise fall back to the saved config.
    let config = if let Some(cfg) = payload.config {
        cfg
    } else {
        let tenant_id = tenant_uuid(&claims);
        let row = sqlx::query(
            "SELECT setting_value FROM core_tenant_settings WHERE ($1::uuid IS NULL OR tenant_id = $1) AND setting_key = $2",
        )
        .bind(tenant_id)
        .bind(SMTP_CONFIG_KEY)
        .fetch_optional(&state.pool)
        .await;
        match row {
            Ok(Some(r)) => {
                let raw: String = r.get("setting_value");
                match serde_json::from_str::<SmtpConfig>(&raw) {
                    Ok(mut cfg) => {
                        // Decrypt the stored password so SMTP auth uses the real
                        // credential (no-op for legacy plain text).
                        cfg.password = decrypt_secret(&state, &cfg.password);
                        cfg
                    }
                    Err(_) => {
                        return Json(ApiResponse::error(
                            404,
                            "未找到已保存的 SMTP 配置，请先保存或提供内联配置",
                        ));
                    }
                }
            }
            _ => {
                return Json(ApiResponse::error(
                    404,
                    "未找到已保存的 SMTP 配置，请先保存或提供内联配置",
                ));
            }
        }
    };

    if config.host.is_empty() || config.from_email.is_empty() {
        return Json(ApiResponse::error(400, "SMTP 主机和发件人邮箱不能为空"));
    }

    let to = payload.to.clone();
    let to_for_response = to.clone();
    let subject = "TOPEMS 测试邮件";
    let body = format!(
        "这是一封来自 TOPEMS 系统的测试邮件。\n\nSMTP 配置:\n- 主机: {}\n- 端口: {}\n- 发件人: {}\n\n如果您收到此邮件，说明 SMTP 配置正确。",
        config.host, config.port, config.from_email
    );

    // lettre's transport is blocking; run it on a blocking thread to avoid
    // stalling the async runtime.
    let result =
        tokio::task::spawn_blocking(move || send_test_email(&config, &to, subject, &body)).await;

    match result {
        Ok(Ok(())) => Json(ApiResponse::success(
            serde_json::json!({ "sent": true, "to": to_for_response }),
            "测试邮件发送成功",
        )),
        Ok(Err(e)) => {
            tracing::error!("Test email failed: {}", e);
            Json(ApiResponse::from(TopemsError::internal(
                "测试邮件发送失败",
                e,
            )))
        }
        Err(e) => {
            tracing::error!("Test email task failed: {}", e);
            Json(ApiResponse::from(TopemsError::internal(
                "测试邮件任务异常",
                e,
            )))
        }
    }
}

fn build_transport(config: &SmtpConfig) -> Result<SmtpTransport, String> {
    let tls = match config.tls.as_str() {
        "none" => Tls::None,
        "tls" => TlsParameters::new(config.host.clone())
            .map(Tls::Wrapper)
            .unwrap_or(Tls::None),
        _ => TlsParameters::new(config.host.clone())
            .map(Tls::Opportunistic)
            .unwrap_or(Tls::None),
    };

    Ok(SmtpTransport::builder_dangerous(config.host.clone())
        .port(config.port)
        .tls(tls)
        .credentials(Credentials::new(
            config.user.clone(),
            config.password.clone(),
        ))
        .build())
}

fn send_test_email(config: &SmtpConfig, to: &str, subject: &str, body: &str) -> Result<(), String> {
    let from = Mailbox::new(
        Some(config.from_name.clone()),
        config
            .from_email
            .parse()
            .map_err(|e| format!("无效的发件人邮箱: {}", e))?,
    );
    let to_addr = Mailbox::new(
        Some(to.to_string()),
        to.parse().map_err(|e| format!("无效的收件人邮箱: {}", e))?,
    );

    let message = Message::builder()
        .from(from)
        .to(to_addr)
        .subject(subject)
        .body(body.to_string())
        .map_err(|e| format!("构建邮件失败: {}", e))?;

    let transport = build_transport(config)?;
    transport
        .send(&message)
        .map_err(|e| format!("发送邮件失败: {}", e))?;
    Ok(())
}
