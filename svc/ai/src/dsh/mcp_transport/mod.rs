//! DSH AI MCP 传输层完整支持模块
//!
//! 提供 stdio 传输、SSE 传输、HTTP 传输、传输层自动协商与降级等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::Instant;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// 传输类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TransportType {
    /// stdio 传输（本地 CLI 工具对接）
    Stdio,
    /// SSE 传输（Web 端实时通信）
    Sse,
    /// HTTP 传输（RESTful API 对接）
    Http,
    /// WebSocket 传输
    WebSocket,
    /// 内存传输（进程内通信，用于测试）
    InMemory,
}

impl TransportType {
    pub fn as_str(&self) -> &str {
        match self {
            TransportType::Stdio => "stdio",
            TransportType::Sse => "sse",
            TransportType::Http => "http",
            TransportType::WebSocket => "websocket",
            TransportType::InMemory => "in_memory",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "stdio" => TransportType::Stdio,
            "sse" => TransportType::Sse,
            "http" => TransportType::Http,
            "websocket" => TransportType::WebSocket,
            _ => TransportType::InMemory,
        }
    }

    /// 是否为流式传输
    pub fn is_streaming(&self) -> bool {
        matches!(self, TransportType::Sse | TransportType::WebSocket)
    }

    /// 是否为请求-响应模式
    pub fn is_request_response(&self) -> bool {
        matches!(self, TransportType::Http | TransportType::Stdio)
    }
}

/// 传输状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransportStatus {
    /// 未连接
    Disconnected,
    /// 连接中
    Connecting,
    /// 已连接
    Connected,
    /// 重连中
    Reconnecting,
    /// 已关闭
    Closed,
    /// 错误
    Error,
}

impl TransportStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TransportStatus::Disconnected => "disconnected",
            TransportStatus::Connecting => "connecting",
            TransportStatus::Connected => "connected",
            TransportStatus::Reconnecting => "reconnecting",
            TransportStatus::Closed => "closed",
            TransportStatus::Error => "error",
        }
    }
}

/// 传输消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportMessage {
    /// 消息 ID
    pub message_id: String,
    /// 消息类型
    pub message_type: MessageType,
    /// 消息内容
    pub content: serde_json::Value,
    /// 消息头
    pub headers: HashMap<String, String>,
    /// 发送时间
    pub sent_at: String,
    /// 接收时间
    pub received_at: Option<String>,
    /// 关联的请求 ID（用于响应消息）
    pub correlation_id: Option<String>,
    /// 传输类型
    pub transport_type: TransportType,
}

/// 消息类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageType {
    /// 请求
    Request,
    /// 响应
    Response,
    /// 通知
    Notification,
    /// 错误
    Error,
    /// 心跳
    Heartbeat,
    /// 连接建立
    Connected,
    /// 连接关闭
    Disconnected,
    /// 自定义
    Custom,
}

impl MessageType {
    pub fn as_str(&self) -> &str {
        match self {
            MessageType::Request => "request",
            MessageType::Response => "response",
            MessageType::Notification => "notification",
            MessageType::Error => "error",
            MessageType::Heartbeat => "heartbeat",
            MessageType::Connected => "connected",
            MessageType::Disconnected => "disconnected",
            MessageType::Custom => "custom",
        }
    }
}

/// 传输配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportConfig {
    /// 传输类型
    pub transport_type: TransportType,
    /// 端点地址（HTTP/SSE/WebSocket 的 URL，stdio 的命令路径）
    pub endpoint: String,
    /// 连接超时（毫秒）
    pub connect_timeout_ms: u64,
    /// 请求超时（毫秒）
    pub request_timeout_ms: u64,
    /// 心跳间隔（毫秒，0 表示禁用）
    pub heartbeat_interval_ms: u64,
    /// 最大重连次数
    pub max_reconnect_attempts: u32,
    /// 重连间隔（毫秒）
    pub reconnect_interval_ms: u64,
    /// 最大消息大小（字节）
    pub max_message_size: usize,
    /// 是否启用压缩
    pub enable_compression: bool,
    /// 是否启用 TLS
    pub enable_tls: bool,
    /// 认证令牌
    pub auth_token: Option<String>,
    /// 自定义头
    pub custom_headers: HashMap<String, String>,
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            transport_type: TransportType::Http,
            endpoint: "http://localhost:8080".to_string(),
            connect_timeout_ms: 5000,
            request_timeout_ms: 30000,
            heartbeat_interval_ms: 30000,
            max_reconnect_attempts: 5,
            reconnect_interval_ms: 1000,
            max_message_size: 10 * 1024 * 1024, // 10MB
            enable_compression: false,
            enable_tls: false,
            auth_token: None,
            custom_headers: HashMap::new(),
        }
    }
}

/// 传输统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportStats {
    /// 传输类型
    pub transport_type: TransportType,
    /// 传输状态
    pub status: TransportStatus,
    /// 总发送消息数
    pub total_sent: u64,
    /// 总接收消息数
    pub total_received: u64,
    /// 总发送字节数
    pub total_bytes_sent: u64,
    /// 总接收字节数
    pub total_bytes_received: u64,
    /// 成功请求数
    pub successful_requests: u64,
    /// 失败请求数
    pub failed_requests: u64,
    /// 平均响应时间（毫秒）
    pub average_response_ms: u64,
    /// 重连次数
    pub reconnect_count: u32,
    /// 连接时长（秒）
    pub connection_duration_seconds: u64,
    /// 最后活动时间
    pub last_activity_at: Option<String>,
}

/// 传输协商结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportNegotiationResult {
    /// 是否成功
    pub success: bool,
    /// 协商后的传输类型
    pub transport_type: Option<TransportType>,
    /// 协商后的端点
    pub endpoint: Option<String>,
    /// 支持的传输类型列表
    pub supported_transports: Vec<TransportType>,
    /// 协商过程
    pub negotiation_log: Vec<String>,
    /// 错误信息
    pub error_message: Option<String>,
}

/// 传输管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportManagerConfig {
    /// 是否启用
    pub enabled: bool,
    /// 是否启用自动协商
    pub enable_auto_negotiation: bool,
    /// 是否启用自动降级
    pub enable_auto_downgrade: bool,
    /// 优先传输类型顺序
    pub preferred_transports: Vec<TransportType>,
    /// 传输历史最大保留数
    pub max_transport_history: usize,
    /// 全局请求超时（毫秒）
    pub global_request_timeout_ms: u64,
}

impl Default for TransportManagerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            enable_auto_negotiation: true,
            enable_auto_downgrade: true,
            preferred_transports: vec![
                TransportType::Sse,
                TransportType::Http,
                TransportType::WebSocket,
                TransportType::Stdio,
                TransportType::InMemory,
            ],
            max_transport_history: 100,
            global_request_timeout_ms: 60000,
        }
    }
}

/// 传输管理器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportManagerStats {
    /// 活跃传输数
    pub active_transports: u64,
    /// 总传输数
    pub total_transports: u64,
    /// 协商次数
    pub total_negotiations: u64,
    /// 成功协商次数
    pub successful_negotiations: u64,
    /// 降级次数
    pub total_downgrades: u64,
    /// 总请求数
    pub total_requests: u64,
    /// 成功请求数
    pub successful_requests: u64,
    /// 失败请求数
    pub failed_requests: u64,
}

// ============================================================================
// 传输会话
// ============================================================================

/// 传输会话
#[derive(Debug, Clone)]
struct TransportSession {
    /// 会话 ID
    session_id: String,
    /// 传输类型
    transport_type: TransportType,
    /// 传输状态
    status: TransportStatus,
    /// 配置
    config: TransportConfig,
    /// 创建时间
    created_at: Instant,
    /// 最后活动时间
    last_activity: Instant,
    /// 发送消息队列
    send_queue: VecDeque<TransportMessage>,
    /// 接收消息队列
    receive_queue: VecDeque<TransportMessage>,
    /// 待处理请求（请求 ID -> 发送时间）
    pending_requests: HashMap<String, Instant>,
    /// 统计
    stats: TransportStats,
    /// 重连次数
    reconnect_attempts: u32,
}

impl TransportSession {
    fn new(session_id: String, config: TransportConfig) -> Self {
        let now = Instant::now();
        let transport_type = config.transport_type;
        Self {
            session_id,
            transport_type,
            status: TransportStatus::Disconnected,
            config,
            created_at: now,
            last_activity: now,
            send_queue: VecDeque::new(),
            receive_queue: VecDeque::new(),
            pending_requests: HashMap::new(),
            stats: TransportStats {
                transport_type,
                status: TransportStatus::Disconnected,
                total_sent: 0,
                total_received: 0,
                total_bytes_sent: 0,
                total_bytes_received: 0,
                successful_requests: 0,
                failed_requests: 0,
                average_response_ms: 0,
                reconnect_count: 0,
                connection_duration_seconds: 0,
                last_activity_at: None,
            },
            reconnect_attempts: 0,
        }
    }
}

// ============================================================================
// 传输管理器
// ============================================================================

/// MCP 传输层管理器
#[derive(Clone)]
pub struct TransportManager {
    /// 配置
    config: TransportManagerConfig,
    /// 传输会话（会话 ID -> 会话）
    sessions: Arc<Mutex<HashMap<String, TransportSession>>>,
    /// 传输历史
    transport_history: Arc<Mutex<VecDeque<String>>>,
}

impl TransportManager {
    /// 创建新的传输管理器
    pub fn new(config: TransportManagerConfig) -> Self {
        Self {
            config,
            sessions: Arc::new(Mutex::new(HashMap::new())),
            transport_history: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(TransportManagerConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &TransportManagerConfig {
        &self.config
    }

    /// 创建传输会话
    pub fn create_session(&self, config: TransportConfig) -> Result<String, String> {
        if !self.config.enabled {
            return Err("传输管理器未启用".to_string());
        }

        let transport_type = config.transport_type;
        let session_id = format!("trans_{}", uuid::Uuid::new_v4());
        let session = TransportSession::new(session_id.clone(), config);

        let mut sessions = self.sessions.lock();
        sessions.insert(session_id.clone(), session);
        drop(sessions);

        // 更新历史
        let mut history = self.transport_history.lock();
        history.push_back(session_id.clone());
        if history.len() > self.config.max_transport_history {
            if let Some(old_id) = history.pop_front() {
                self.sessions.lock().remove(&old_id);
            }
        }
        drop(history);

        info!(session_id = %session_id, transport_type = %transport_type.as_str(), "Transport session created");
        Ok(session_id)
    }

    /// 连接传输会话
    pub fn connect(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;

        if session.status == TransportStatus::Connected {
            return Err("传输会话已连接".to_string());
        }

        session.status = TransportStatus::Connecting;
        session.stats.status = TransportStatus::Connecting;

        // 模拟连接过程（实际实现中会建立真实连接）
        session.status = TransportStatus::Connected;
        session.stats.status = TransportStatus::Connected;
        session.last_activity = Instant::now();
        session.stats.last_activity_at = Some(chrono::Utc::now().to_rfc3339());

        info!(session_id = %session_id, "Transport session connected");
        Ok(())
    }

    /// 断开传输会话
    pub fn disconnect(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;

        session.status = TransportStatus::Closed;
        session.stats.status = TransportStatus::Closed;
        session.stats.connection_duration_seconds = session.created_at.elapsed().as_secs();

        info!(session_id = %session_id, "Transport session disconnected");
        Ok(())
    }

    /// 获取传输状态
    pub fn get_status(&self, session_id: &str) -> Result<TransportStatus, String> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;
        Ok(session.status)
    }

    /// 发送消息
    pub fn send_message(&self, session_id: &str, message: TransportMessage) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;

        if session.status != TransportStatus::Connected {
            return Err(format!(
                "传输会话状态为 {}，无法发送消息",
                session.status.as_str()
            ));
        }

        // 检查消息大小
        let message_size = serde_json::to_string(&message)
            .map(|s| s.len())
            .unwrap_or(0);
        if message_size > session.config.max_message_size {
            return Err(format!(
                "消息大小 {} 超过限制 {}",
                message_size, session.config.max_message_size
            ));
        }

        // 添加到发送队列（实际实现中会通过真实传输发送）
        session.send_queue.push_back(message.clone());
        session.stats.total_sent += 1;
        session.stats.total_bytes_sent += message_size as u64;
        session.last_activity = Instant::now();
        session.stats.last_activity_at = Some(chrono::Utc::now().to_rfc3339());

        // 如果是请求，添加到待处理请求
        if message.message_type == MessageType::Request {
            session
                .pending_requests
                .insert(message.message_id.clone(), Instant::now());
        }

        debug!(session_id = %session_id, message_id = %message.message_id, "Message sent");
        Ok(())
    }

    /// 接收消息
    pub fn receive_message(&self, session_id: &str) -> Option<TransportMessage> {
        let mut sessions = self.sessions.lock();
        let session = sessions.get_mut(session_id)?;

        let message = session.receive_queue.pop_front();
        if let Some(msg) = &message {
            session.stats.total_received += 1;
            session.last_activity = Instant::now();
            session.stats.last_activity_at = Some(chrono::Utc::now().to_rfc3339());

            // 如果是响应，更新请求统计
            if let Some(correlation_id) = &msg.correlation_id {
                if let Some(request_time) = session.pending_requests.remove(correlation_id) {
                    let response_ms = request_time.elapsed().as_millis() as u64;
                    session.stats.successful_requests += 1;
                    // 更新平均响应时间
                    let total = session.stats.successful_requests;
                    session.stats.average_response_ms =
                        (session.stats.average_response_ms * (total - 1) + response_ms) / total;
                }
            }
        }
        message
    }

    /// 模拟接收消息（用于测试和模拟）
    pub fn simulate_receive(
        &self,
        session_id: &str,
        message: TransportMessage,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;

        session.receive_queue.push_back(message);
        Ok(())
    }

    /// 获取传输统计
    pub fn get_stats(&self, session_id: &str) -> Result<TransportStats, String> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;
        Ok(session.stats.clone())
    }

    /// 列出所有会话
    pub fn list_sessions(&self, status_filter: Option<TransportStatus>) -> Vec<String> {
        let sessions = self.sessions.lock();
        sessions
            .values()
            .filter(|s| {
                if let Some(status) = status_filter {
                    s.status == status
                } else {
                    true
                }
            })
            .map(|s| s.session_id.clone())
            .collect()
    }

    /// 删除会话
    pub fn delete_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        if sessions.remove(session_id).is_some() {
            info!(session_id = %session_id, "Transport session deleted");
            Ok(())
        } else {
            Err(format!("传输会话 {} 不存在", session_id))
        }
    }

    /// 传输协商
    pub fn negotiate_transport(
        &self,
        endpoint: &str,
        preferred_transports: Option<Vec<TransportType>>,
    ) -> TransportNegotiationResult {
        let mut negotiation_log = Vec::new();
        let transports =
            preferred_transports.unwrap_or_else(|| self.config.preferred_transports.clone());

        negotiation_log.push(format!("开始传输协商，端点: {}", endpoint));
        negotiation_log.push(format!(
            "优先传输类型: {:?}",
            transports.iter().map(|t| t.as_str()).collect::<Vec<_>>()
        ));

        // 模拟协商过程（实际实现中会探测端点支持的传输类型）
        for transport in &transports {
            negotiation_log.push(format!("尝试 {} 传输...", transport.as_str()));

            // 模拟探测（实际实现中会发送探测请求）
            let supported = match transport {
                TransportType::Http => true,
                TransportType::Sse => endpoint.starts_with("http"),
                TransportType::WebSocket => endpoint.starts_with("ws"),
                TransportType::Stdio => endpoint.starts_with("/") || endpoint.starts_with("."),
                TransportType::InMemory => true,
            };

            if supported {
                negotiation_log.push(format!("{} 传输可用", transport.as_str()));
                negotiation_log.push("协商成功".to_string());

                return TransportNegotiationResult {
                    success: true,
                    transport_type: Some(*transport),
                    endpoint: Some(endpoint.to_string()),
                    supported_transports: transports,
                    negotiation_log,
                    error_message: None,
                };
            } else {
                negotiation_log.push(format!("{} 传输不可用，尝试下一个", transport.as_str()));
            }
        }

        negotiation_log.push("所有传输类型均不可用，协商失败".to_string());

        TransportNegotiationResult {
            success: false,
            transport_type: None,
            endpoint: None,
            supported_transports: transports,
            negotiation_log,
            error_message: Some("无法建立传输连接".to_string()),
        }
    }

    /// 自动降级
    pub fn auto_downgrade(&self, session_id: &str) -> Result<TransportType, String> {
        if !self.config.enable_auto_downgrade {
            return Err("自动降级未启用".to_string());
        }

        let sessions = self.sessions.lock();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("传输会话 {} 不存在", session_id))?;

        let current_type = session.transport_type;
        let preferred = &self.config.preferred_transports;

        // 找到当前传输类型的索引，降级到下一个
        if let Some(current_index) = preferred.iter().position(|t| *t == current_type) {
            if current_index + 1 < preferred.len() {
                let downgrade_type = preferred[current_index + 1];
                info!(
                    session_id = %session_id,
                    from = %current_type.as_str(),
                    to = %downgrade_type.as_str(),
                    "Transport auto-downgraded"
                );
                Ok(downgrade_type)
            } else {
                Err("已是最低优先级传输类型，无法继续降级".to_string())
            }
        } else {
            Err("当前传输类型不在优先列表中".to_string())
        }
    }

    /// 获取管理器统计
    pub fn get_manager_stats(&self) -> TransportManagerStats {
        let sessions = self.sessions.lock();

        let active = sessions
            .values()
            .filter(|s| s.status == TransportStatus::Connected)
            .count() as u64;
        let total_sent: u64 = sessions.values().map(|s| s.stats.total_sent).sum();
        let total_received: u64 = sessions.values().map(|s| s.stats.total_received).sum();
        let successful: u64 = sessions.values().map(|s| s.stats.successful_requests).sum();
        let failed: u64 = sessions.values().map(|s| s.stats.failed_requests).sum();

        TransportManagerStats {
            active_transports: active,
            total_transports: sessions.len() as u64,
            total_negotiations: 0,
            successful_negotiations: 0,
            total_downgrades: 0,
            total_requests: total_sent + total_received,
            successful_requests: successful,
            failed_requests: failed,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_manager() -> TransportManager {
        TransportManager::with_defaults()
    }

    fn create_test_config(transport_type: TransportType) -> TransportConfig {
        TransportConfig {
            transport_type,
            endpoint: match transport_type {
                TransportType::Http => "http://localhost:8080".to_string(),
                TransportType::Sse => "http://localhost:8080/sse".to_string(),
                TransportType::WebSocket => "ws://localhost:8080/ws".to_string(),
                TransportType::Stdio => "/usr/local/bin/mcp-server".to_string(),
                TransportType::InMemory => "memory://test".to_string(),
            },
            ..Default::default()
        }
    }

    fn create_test_message(message_type: MessageType) -> TransportMessage {
        TransportMessage {
            message_id: format!("msg_{}", uuid::Uuid::new_v4()),
            message_type,
            content: serde_json::json!({"test": "data"}),
            headers: HashMap::new(),
            sent_at: chrono::Utc::now().to_rfc3339(),
            received_at: None,
            correlation_id: None,
            transport_type: TransportType::Http,
        }
    }

    #[test]
    fn test_transport_type_as_str() {
        assert_eq!(TransportType::Stdio.as_str(), "stdio");
        assert_eq!(TransportType::Sse.as_str(), "sse");
        assert_eq!(TransportType::Http.as_str(), "http");
        assert_eq!(TransportType::WebSocket.as_str(), "websocket");
        assert_eq!(TransportType::InMemory.as_str(), "in_memory");
    }

    #[test]
    fn test_transport_type_from_str() {
        assert_eq!(TransportType::from_str("stdio"), TransportType::Stdio);
        assert_eq!(TransportType::from_str("http"), TransportType::Http);
        assert_eq!(TransportType::from_str("unknown"), TransportType::InMemory);
    }

    #[test]
    fn test_transport_type_is_streaming() {
        assert!(TransportType::Sse.is_streaming());
        assert!(TransportType::WebSocket.is_streaming());
        assert!(!TransportType::Http.is_streaming());
        assert!(!TransportType::Stdio.is_streaming());
    }

    #[test]
    fn test_transport_type_is_request_response() {
        assert!(TransportType::Http.is_request_response());
        assert!(TransportType::Stdio.is_request_response());
        assert!(!TransportType::Sse.is_request_response());
    }

    #[test]
    fn test_transport_status_as_str() {
        assert_eq!(TransportStatus::Disconnected.as_str(), "disconnected");
        assert_eq!(TransportStatus::Connected.as_str(), "connected");
        assert_eq!(TransportStatus::Error.as_str(), "error");
    }

    #[test]
    fn test_message_type_as_str() {
        assert_eq!(MessageType::Request.as_str(), "request");
        assert_eq!(MessageType::Response.as_str(), "response");
        assert_eq!(MessageType::Notification.as_str(), "notification");
    }

    #[test]
    fn test_transport_config_default() {
        let config = TransportConfig::default();
        assert_eq!(config.transport_type, TransportType::Http);
        assert_eq!(config.connect_timeout_ms, 5000);
        assert_eq!(config.request_timeout_ms, 30000);
    }

    #[test]
    fn test_transport_manager_config_default() {
        let config = TransportManagerConfig::default();
        assert!(config.enabled);
        assert!(config.enable_auto_negotiation);
        assert!(config.enable_auto_downgrade);
        assert!(!config.preferred_transports.is_empty());
    }

    #[test]
    fn test_manager_creation() {
        let manager = create_test_manager();
        assert!(manager.config().enabled);
    }

    #[test]
    fn test_create_session() {
        let manager = create_test_manager();
        let config = create_test_config(TransportType::Http);
        let result = manager.create_session(config);
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }

    #[test]
    fn test_connect_session() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();

        let result = manager.connect(&session_id);
        assert!(result.is_ok());

        let status = manager.get_status(&session_id).unwrap();
        assert_eq!(status, TransportStatus::Connected);
    }

    #[test]
    fn test_disconnect_session() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager.connect(&session_id).unwrap();

        let result = manager.disconnect(&session_id);
        assert!(result.is_ok());

        let status = manager.get_status(&session_id).unwrap();
        assert_eq!(status, TransportStatus::Closed);
    }

    #[test]
    fn test_send_message() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager.connect(&session_id).unwrap();

        let message = create_test_message(MessageType::Request);
        let result = manager.send_message(&session_id, message);
        assert!(result.is_ok());
    }

    #[test]
    fn test_send_message_not_connected() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();

        let message = create_test_message(MessageType::Request);
        let result = manager.send_message(&session_id, message);
        assert!(result.is_err());
    }

    #[test]
    fn test_receive_message() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager.connect(&session_id).unwrap();

        // 模拟接收消息
        let message = create_test_message(MessageType::Response);
        manager.simulate_receive(&session_id, message).unwrap();

        let received = manager.receive_message(&session_id);
        assert!(received.is_some());
        assert_eq!(received.unwrap().message_type, MessageType::Response);
    }

    #[test]
    fn test_get_stats() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager.connect(&session_id).unwrap();

        let message = create_test_message(MessageType::Request);
        manager.send_message(&session_id, message).unwrap();

        let stats = manager.get_stats(&session_id).unwrap();
        assert_eq!(stats.total_sent, 1);
        assert_eq!(stats.transport_type, TransportType::Http);
    }

    #[test]
    fn test_list_sessions() {
        let manager = create_test_manager();
        manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager
            .create_session(create_test_config(TransportType::Sse))
            .unwrap();

        let sessions = manager.list_sessions(None);
        assert_eq!(sessions.len(), 2);
    }

    #[test]
    fn test_delete_session() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();

        let result = manager.delete_session(&session_id);
        assert!(result.is_ok());
        assert!(manager.get_status(&session_id).is_err());
    }

    #[test]
    fn test_negotiate_transport_http() {
        let manager = create_test_manager();
        let result = manager.negotiate_transport("http://localhost:8080", None);
        assert!(result.success);
        assert!(result.transport_type.is_some());
        assert!(!result.negotiation_log.is_empty());
    }

    #[test]
    fn test_negotiate_transport_websocket() {
        let manager = create_test_manager();
        let result = manager.negotiate_transport("ws://localhost:8080", None);
        assert!(result.success);
    }

    #[test]
    fn test_negotiate_transport_stdio() {
        let manager = create_test_manager();
        let result = manager.negotiate_transport("/usr/local/bin/mcp-server", None);
        assert!(result.success);
    }

    #[test]
    fn test_auto_downgrade() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Sse))
            .unwrap();
        manager.connect(&session_id).unwrap();

        let result = manager.auto_downgrade(&session_id);
        assert!(result.is_ok());
        // SSE 应该降级到 HTTP（根据默认优先列表）
        assert_eq!(result.unwrap(), TransportType::Http);
    }

    #[test]
    fn test_get_manager_stats() {
        let manager = create_test_manager();
        let session_id = manager
            .create_session(create_test_config(TransportType::Http))
            .unwrap();
        manager.connect(&session_id).unwrap();

        let message = create_test_message(MessageType::Request);
        manager.send_message(&session_id, message).unwrap();

        let stats = manager.get_manager_stats();
        assert!(stats.active_transports >= 1);
        assert!(stats.total_transports >= 1);
        assert!(stats.total_requests >= 1);
    }

    #[test]
    fn test_multiple_transport_types() {
        let manager = create_test_manager();

        for transport_type in &[
            TransportType::Http,
            TransportType::Sse,
            TransportType::WebSocket,
            TransportType::Stdio,
            TransportType::InMemory,
        ] {
            let session_id = manager
                .create_session(create_test_config(*transport_type))
                .unwrap();
            manager.connect(&session_id).unwrap();

            let stats = manager.get_stats(&session_id).unwrap();
            assert_eq!(stats.transport_type, *transport_type);
        }

        assert_eq!(manager.list_sessions(None).len(), 5);
    }
}
