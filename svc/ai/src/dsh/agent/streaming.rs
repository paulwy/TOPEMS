//! Agent 流式响应模块。
//!
//! 提供 SSE 流式响应支持，包括：
//! - 流式事件类型定义
//! - 流式数据块
//! - 流式响应构建器
//! - 流式通道管理

use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tracing::info;

/// 流式事件类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StreamEventType {
    /// 会话开始
    SessionStart,
    /// 思考中
    Thinking,
    /// 工具调用开始
    ToolCallStart,
    /// 工具调用进行中
    ToolCallProgress,
    /// 工具调用完成
    ToolCallComplete,
    /// 内容生成中
    ContentDelta,
    /// 内容生成完成
    ContentComplete,
    /// 错误
    Error,
    /// 会话结束
    SessionEnd,
}

impl StreamEventType {
    /// 转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            StreamEventType::SessionStart => "session_start",
            StreamEventType::Thinking => "thinking",
            StreamEventType::ToolCallStart => "tool_call_start",
            StreamEventType::ToolCallProgress => "tool_call_progress",
            StreamEventType::ToolCallComplete => "tool_call_complete",
            StreamEventType::ContentDelta => "content_delta",
            StreamEventType::ContentComplete => "content_complete",
            StreamEventType::Error => "error",
            StreamEventType::SessionEnd => "session_end",
        }
    }
}

/// 流式数据块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    /// 事件类型
    pub event: StreamEventType,
    /// 数据内容
    pub data: serde_json::Value,
    /// 事件 ID
    pub event_id: String,
    /// 会话 ID
    pub session_id: String,
    /// 时间戳
    pub timestamp: String,
    /// 是否为最后一个事件
    #[serde(default)]
    pub is_final: bool,
}

impl StreamChunk {
    /// 创建新的流式数据块
    pub fn new(
        event: StreamEventType,
        session_id: impl Into<String>,
        data: serde_json::Value,
    ) -> Self {
        Self {
            event,
            data,
            event_id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.into(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            is_final: false,
        }
    }

    /// 创建会话开始事件
    pub fn session_start(session_id: impl Into<String>) -> Self {
        Self::new(
            StreamEventType::SessionStart,
            session_id,
            serde_json::json!({"status": "started"}),
        )
    }

    /// 创建思考中事件
    pub fn thinking(session_id: impl Into<String>, thought: impl Into<String>) -> Self {
        Self::new(
            StreamEventType::Thinking,
            session_id,
            serde_json::json!({"thought": thought.into()}),
        )
    }

    /// 创建工具调用开始事件
    pub fn tool_call_start(
        session_id: impl Into<String>,
        tool_name: impl Into<String>,
        arguments: serde_json::Value,
    ) -> Self {
        Self::new(
            StreamEventType::ToolCallStart,
            session_id,
            serde_json::json!({
                "tool_name": tool_name.into(),
                "arguments": arguments
            }),
        )
    }

    /// 创建工具调用进行中事件
    pub fn tool_call_progress(
        session_id: impl Into<String>,
        tool_name: impl Into<String>,
        progress: u8,
        message: impl Into<String>,
    ) -> Self {
        Self::new(
            StreamEventType::ToolCallProgress,
            session_id,
            serde_json::json!({
                "tool_name": tool_name.into(),
                "progress": progress,
                "message": message.into()
            }),
        )
    }

    /// 创建工具调用完成事件
    pub fn tool_call_complete(
        session_id: impl Into<String>,
        tool_name: impl Into<String>,
        result: serde_json::Value,
        success: bool,
    ) -> Self {
        Self::new(
            StreamEventType::ToolCallComplete,
            session_id,
            serde_json::json!({
                "tool_name": tool_name.into(),
                "result": result,
                "success": success
            }),
        )
    }

    /// 创建内容增量事件
    pub fn content_delta(session_id: impl Into<String>, delta: impl Into<String>) -> Self {
        Self::new(
            StreamEventType::ContentDelta,
            session_id,
            serde_json::json!({"delta": delta.into()}),
        )
    }

    /// 创建内容完成事件
    pub fn content_complete(
        session_id: impl Into<String>,
        full_content: impl Into<String>,
    ) -> Self {
        let mut chunk = Self::new(
            StreamEventType::ContentComplete,
            session_id,
            serde_json::json!({"content": full_content.into()}),
        );
        chunk.is_final = true;
        chunk
    }

    /// 创建错误事件
    pub fn error(session_id: impl Into<String>, error: impl Into<String>) -> Self {
        let mut chunk = Self::new(
            StreamEventType::Error,
            session_id,
            serde_json::json!({"error": error.into()}),
        );
        chunk.is_final = true;
        chunk
    }

    /// 创建会话结束事件
    pub fn session_end(session_id: impl Into<String>) -> Self {
        let mut chunk = Self::new(
            StreamEventType::SessionEnd,
            session_id,
            serde_json::json!({"status": "ended"}),
        );
        chunk.is_final = true;
        chunk
    }

    /// 转换为 SSE 格式字符串
    pub fn to_sse(&self) -> String {
        let data_json = serde_json::to_string(&self.data).unwrap_or_default();
        format!(
            "event: {}\ndata: {}\nid: {}\n\n",
            self.event.as_str(),
            data_json,
            self.event_id
        )
    }
}

/// 流式响应
///
/// 封装 SSE 流式响应，提供发送和接收功能。
pub struct StreamingResponse {
    /// 会话 ID
    pub session_id: String,
    /// 发送端
    sender: mpsc::UnboundedSender<StreamChunk>,
    /// 接收端流
    receiver_stream: UnboundedReceiverStream<StreamChunk>,
}

impl StreamingResponse {
    /// 创建新的流式响应
    pub fn new(session_id: impl Into<String>) -> Self {
        let (tx, rx) = mpsc::unbounded_channel::<StreamChunk>();
        let receiver_stream = UnboundedReceiverStream::new(rx);

        Self {
            session_id: session_id.into(),
            sender: tx,
            receiver_stream,
        }
    }

    /// 获取发送端
    pub fn sender(&self) -> mpsc::UnboundedSender<StreamChunk> {
        self.sender.clone()
    }

    /// 发送数据块
    pub fn send(&self, chunk: StreamChunk) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.sender.send(chunk)
    }

    /// 发送会话开始事件
    pub fn send_session_start(&self) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::session_start(&self.session_id))
    }

    /// 发送思考中事件
    pub fn send_thinking(
        &self,
        thought: impl Into<String>,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::thinking(&self.session_id, thought))
    }

    /// 发送工具调用开始事件
    pub fn send_tool_call_start(
        &self,
        tool_name: impl Into<String>,
        arguments: serde_json::Value,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::tool_call_start(
            &self.session_id,
            tool_name,
            arguments,
        ))
    }

    /// 发送工具调用完成事件
    pub fn send_tool_call_complete(
        &self,
        tool_name: impl Into<String>,
        result: serde_json::Value,
        success: bool,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::tool_call_complete(
            &self.session_id,
            tool_name,
            result,
            success,
        ))
    }

    /// 发送内容增量事件
    pub fn send_content_delta(
        &self,
        delta: impl Into<String>,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::content_delta(&self.session_id, delta))
    }

    /// 发送内容完成事件
    pub fn send_content_complete(
        &self,
        content: impl Into<String>,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::content_complete(&self.session_id, content))
    }

    /// 发送错误事件
    pub fn send_error(
        &self,
        error: impl Into<String>,
    ) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::error(&self.session_id, error))
    }

    /// 发送会话结束事件
    pub fn send_session_end(&self) -> Result<(), mpsc::error::SendError<StreamChunk>> {
        self.send(StreamChunk::session_end(&self.session_id))
    }

    /// 转换为 axum SSE 响应
    pub fn into_axum_sse(
        self,
    ) -> axum::response::sse::Sse<
        impl futures::Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>>,
    > {
        use axum::response::sse::Sse;
        use futures::stream::StreamExt;

        let stream = self.receiver_stream.map(|chunk| {
            Ok::<_, std::convert::Infallible>(
                axum::response::sse::Event::default()
                    .event(chunk.event.as_str())
                    .data(serde_json::to_string(&chunk.data).unwrap_or_default()),
            )
        });

        Sse::new(stream).keep_alive(
            axum::response::sse::KeepAlive::new()
                .interval(Duration::from_secs(15))
                .text("keep-alive"),
        )
    }

    /// 转换为装箱的 axum SSE 响应（用于统一类型）
    pub fn into_boxed_sse(
        self,
    ) -> axum::response::sse::Sse<
        std::pin::Pin<
            Box<
                dyn futures::Stream<
                        Item = Result<axum::response::sse::Event, std::convert::Infallible>,
                    > + Send,
            >,
        >,
    > {
        use axum::response::sse::Sse;
        use futures::stream::StreamExt;

        let stream = self.receiver_stream.map(|chunk| {
            Ok::<_, std::convert::Infallible>(
                axum::response::sse::Event::default()
                    .event(chunk.event.as_str())
                    .data(serde_json::to_string(&chunk.data).unwrap_or_default()),
            )
        });

        Sse::new(Box::pin(stream))
    }

    /// 转换为 Pin<Box> 的 axum SSE 响应（用于统一类型，满足 Unpin 要求）
    pub fn into_pinned_sse(
        self,
    ) -> axum::response::sse::Sse<
        std::pin::Pin<
            Box<
                dyn futures::Stream<
                        Item = Result<axum::response::sse::Event, std::convert::Infallible>,
                    > + Send,
            >,
        >,
    > {
        use axum::response::sse::Sse;
        use futures::stream::StreamExt;

        let stream = self.receiver_stream.map(|chunk| {
            Ok::<_, std::convert::Infallible>(
                axum::response::sse::Event::default()
                    .event(chunk.event.as_str())
                    .data(serde_json::to_string(&chunk.data).unwrap_or_default()),
            )
        });

        Sse::new(Box::pin(stream))
    }

    /// 完成流式响应（发送会话结束事件）
    pub fn finish(self) {
        let _ = self.send_session_end();
        info!(session_id = %self.session_id, "Streaming response finished");
    }
}

/// 流式响应管理器
///
/// 管理多个流式响应会话。
#[derive(Clone)]
pub struct StreamingManager {
    /// 活跃的流式响应会话
    sessions: Arc<tokio::sync::RwLock<HashMap<String, mpsc::UnboundedSender<StreamChunk>>>>,
}

impl Default for StreamingManager {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamingManager {
    /// 创建新的流式响应管理器
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// 创建新的流式响应会话
    pub async fn create_session(&self, session_id: impl Into<String>) -> StreamingResponse {
        let session_id = session_id.into();
        let response = StreamingResponse::new(&session_id);
        let sender = response.sender();

        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id, sender);

        response
    }

    /// 获取会话发送端
    pub async fn get_sender(&self, session_id: &str) -> Option<mpsc::UnboundedSender<StreamChunk>> {
        let sessions = self.sessions.read().await;
        sessions.get(session_id).cloned()
    }

    /// 关闭会话
    pub async fn close_session(&self, session_id: &str) -> bool {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id).is_some()
    }

    /// 获取活跃会话数
    pub async fn active_sessions(&self) -> usize {
        let sessions = self.sessions.read().await;
        sessions.len()
    }
}

use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_event_type_as_str() {
        assert_eq!(StreamEventType::SessionStart.as_str(), "session_start");
        assert_eq!(StreamEventType::Thinking.as_str(), "thinking");
        assert_eq!(StreamEventType::ContentDelta.as_str(), "content_delta");
        assert_eq!(StreamEventType::Error.as_str(), "error");
    }

    #[test]
    fn test_stream_chunk_creation() {
        let chunk = StreamChunk::new(
            StreamEventType::Thinking,
            "session1",
            serde_json::json!({"thought": "test"}),
        );
        assert_eq!(chunk.event, StreamEventType::Thinking);
        assert_eq!(chunk.session_id, "session1");
        assert!(!chunk.is_final);
    }

    #[test]
    fn test_stream_chunk_session_start() {
        let chunk = StreamChunk::session_start("session1");
        assert_eq!(chunk.event, StreamEventType::SessionStart);
        assert!(!chunk.is_final);
    }

    #[test]
    fn test_stream_chunk_content_complete() {
        let chunk = StreamChunk::content_complete("session1", "final answer");
        assert_eq!(chunk.event, StreamEventType::ContentComplete);
        assert!(chunk.is_final);
    }

    #[test]
    fn test_stream_chunk_error() {
        let chunk = StreamChunk::error("session1", "test error");
        assert_eq!(chunk.event, StreamEventType::Error);
        assert!(chunk.is_final);
    }

    #[test]
    fn test_stream_chunk_to_sse() {
        let chunk = StreamChunk::content_delta("session1", "hello");
        let sse = chunk.to_sse();
        assert!(sse.contains("event: content_delta"));
        assert!(sse.contains("data:"));
        assert!(sse.contains("id:"));
    }

    #[tokio::test]
    async fn test_streaming_response_send_and_receive() {
        let response = StreamingResponse::new("session1");
        let sender = response.sender();

        // 发送消息
        sender
            .send(StreamChunk::content_delta("session1", "hello"))
            .unwrap();
        sender
            .send(StreamChunk::content_complete("session1", "hello world"))
            .unwrap();

        // 接收消息（通过 drop sender 来结束流）
        drop(sender);

        // 这里我们只测试发送功能，接收测试需要在实际的流中进行
    }

    #[tokio::test]
    async fn test_streaming_manager_create_and_get() {
        let manager = StreamingManager::new();
        let response = manager.create_session("session1").await;

        assert_eq!(response.session_id, "session1");
        assert_eq!(manager.active_sessions().await, 1);

        let sender = manager.get_sender("session1").await;
        assert!(sender.is_some());
    }

    #[tokio::test]
    async fn test_streaming_manager_close() {
        let manager = StreamingManager::new();
        manager.create_session("session1").await;
        assert_eq!(manager.active_sessions().await, 1);

        let closed = manager.close_session("session1").await;
        assert!(closed);
        assert_eq!(manager.active_sessions().await, 0);
    }
}
