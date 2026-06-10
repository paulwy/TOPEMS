use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// 推送服务配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushConfig {
    /// APNs (Apple Push Notification Service) 配置
    pub apns: Option<ApnsConfig>,
    /// FCM (Firebase Cloud Messaging) 配置
    pub fcm: Option<FcmConfig>,
}

/// APNs 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApnsConfig {
    /// 团队 ID
    pub team_id: String,
    /// Key ID
    pub key_id: String,
    /// 私钥路径
    pub key_path: String,
    /// 应用 Bundle ID
    pub bundle_id: String,
    /// 开发环境还是生产环境
    pub sandbox: bool,
}

/// FCM 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FcmConfig {
    /// 服务账号 JSON 密钥文件路径
    pub service_account_path: String,
}

/// 推送消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushMessage {
    /// 标题
    pub title: String,
    /// 内容
    pub body: String,
    /// 用户 ID
    pub user_id: String,
    /// 设备类型: "ios", "android"
    pub device_type: String,
    /// 设备 Token
    pub device_token: String,
    /// 附加数据
    pub data: Option<serde_json::Value>,
    /// 优先级
    pub priority: Option<i16>,
}

/// 推送服务 Trait
pub trait PushService: Send + Sync {
    /// 发送推送消息
    async fn send(&self, message: PushMessage) -> Result<(), PushError>;
}

/// 推送错误
#[derive(Debug, thiserror::Error)]
pub enum PushError {
    #[error("配置错误: {0}")]
    Config(String),
    #[error("发送错误: {0}")]
    Send(String),
    #[error("不支持的设备类型")]
    UnsupportedDeviceType,
}

/// 默认推送服务实现（框架结构）
#[derive(Clone)]
pub struct DefaultPushService {
    config: Arc<PushConfig>,
}

impl DefaultPushService {
    pub fn new(config: PushConfig) -> Self {
        Self {
            config: Arc::new(config),
        }
    }
}

impl PushService for DefaultPushService {
    async fn send(&self, message: PushMessage) -> Result<(), PushError> {
        match message.device_type.to_lowercase().as_str() {
            "ios" => self.send_apns(message).await,
            "android" => self.send_fcm(message).await,
            _ => Err(PushError::UnsupportedDeviceType),
        }
    }
}

impl DefaultPushService {
    /// 发送 APNs 推送
    async fn send_apns(&self, _message: PushMessage) -> Result<(), PushError> {
        // 这里是框架结构，实际集成需要添加 APNs 相关库和实现
        // 例如可以使用 `a2` 库来发送 APNs 通知
        tracing::info!("APNs 推送功能待实现");
        Ok(())
    }

    /// 发送 FCM 推送
    async fn send_fcm(&self, _message: PushMessage) -> Result<(), PushError> {
        // 这里是框架结构，实际集成需要添加 FCM 相关库和实现
        // 例如可以使用 `fcm` 库来发送 FCM 通知
        tracing::info!("FCM 推送功能待实现");
        Ok(())
    }
}

/// 无操作推送服务（用于开发环境）
#[derive(Clone, Default)]
pub struct NoopPushService;

impl PushService for NoopPushService {
    async fn send(&self, message: PushMessage) -> Result<(), PushError> {
        tracing::info!(
            "NoopPushService 收到推送请求: user_id={}, title={}",
            message.user_id,
            message.title
        );
        Ok(())
    }
}

/// 设备注册记录
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DeviceRegistration {
    pub id: uuid::Uuid,
    pub user_id: String,
    pub device_type: String,
    pub device_token: String,
    pub device_name: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}
