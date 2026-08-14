//! AI 客户端数据模型

use serde::{Deserialize, Serialize};

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// 角色：system, user, assistant, tool
    pub role: String,
    /// 消息内容
    pub content: String,
    /// 工具调用（仅 assistant 角色）
    pub tool_call: Option<FunctionCall>,
    /// 工具调用结果（仅 tool 角色）
    pub tool_result: Option<ToolResult>,
}

impl ChatMessage {
    /// 创建系统消息
    pub fn system(content: &str) -> Self {
        Self {
            role: "system".to_string(),
            content: content.to_string(),
            tool_call: None,
            tool_result: None,
        }
    }

    /// 创建用户消息
    pub fn user(content: &str) -> Self {
        Self {
            role: "user".to_string(),
            content: content.to_string(),
            tool_call: None,
            tool_result: None,
        }
    }

    /// 创建助手消息
    pub fn assistant(content: &str) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.to_string(),
            tool_call: None,
            tool_result: None,
        }
    }

    /// 创建工具调用消息
    pub fn tool(_content: &str, tool_call: FunctionCall) -> Self {
        Self {
            role: "assistant".to_string(),
            content: "".to_string(),
            tool_call: Some(tool_call),
            tool_result: None,
        }
    }

    /// 创建工具结果消息
    pub fn tool_result(content: &str, tool_name: &str) -> Self {
        Self {
            role: "tool".to_string(),
            content: content.to_string(),
            tool_call: None,
            tool_result: Some(ToolResult {
                tool_name: tool_name.to_string(),
                content: content.to_string(),
            }),
        }
    }
}

/// 工具调用
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    /// 函数名称
    pub name: String,
    /// 函数参数
    pub arguments: serde_json::Value,
}

impl FunctionCall {
    pub fn new(name: &str, arguments: serde_json::Value) -> Self {
        Self {
            name: name.to_string(),
            arguments,
        }
    }
}

/// 工具调用结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// 工具名称
    pub tool_name: String,
    /// 工具返回内容
    pub content: String,
}

/// 函数定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDefinition {
    /// 函数名称
    pub name: String,
    /// 函数描述
    pub description: String,
    /// 参数定义（JSON Schema）
    pub parameters: serde_json::Value,
    /// 是否需要返回结果
    pub required: Option<Vec<String>>,
}

impl FunctionDefinition {
    pub fn new(name: &str, description: &str, parameters: serde_json::Value) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            parameters,
            required: None,
        }
    }
}

/// 聊天完成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    /// 模型名称
    pub model: String,
    /// 消息列表
    pub messages: Vec<ChatMessage>,
    /// 温度参数
    pub temperature: Option<f64>,
    /// 最大令牌数
    pub max_tokens: Option<usize>,
    /// 是否流式响应
    pub stream: Option<bool>,
    /// 工具列表
    pub tools: Option<Vec<FunctionDefinition>>,
    /// 工具选择策略
    pub tool_choice: Option<ToolChoice>,
    /// 频率惩罚
    pub frequency_penalty: Option<f64>,
    /// 存在惩罚
    pub presence_penalty: Option<f64>,
    /// 停止序列
    pub stop: Option<Vec<String>>,
    /// 响应格式
    pub response_format: Option<ResponseFormat>,
}

impl Default for ChatCompletionRequest {
    fn default() -> Self {
        Self {
            model: "qwen2.5:7b-instruct".to_string(),
            messages: Vec::new(),
            temperature: Some(0.7),
            max_tokens: Some(4096),
            stream: Some(false),
            tools: None,
            tool_choice: None,
            frequency_penalty: None,
            presence_penalty: None,
            stop: None,
            response_format: None,
        }
    }
}

/// 工具选择策略
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ToolChoice {
    /// 自动选择
    Auto,
    /// 强制使用工具
    Required,
    /// 不使用工具
    None,
    /// 指定工具
    Function(String),
}

/// 响应格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseFormat {
    pub r#type: String,
}

impl ResponseFormat {
    pub fn json() -> Self {
        Self {
            r#type: "json_object".to_string(),
        }
    }

    pub fn text() -> Self {
        Self {
            r#type: "text".to_string(),
        }
    }
}

/// 聊天完成响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    /// 响应 ID
    pub id: String,
    /// 对象类型
    pub object: String,
    /// 创建时间
    pub created: u64,
    /// 模型名称
    pub model: String,
    /// 选择列表
    pub choices: Vec<Choice>,
    /// 使用统计
    pub usage: Option<Usage>,
}

/// 响应选择
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    /// 索引
    pub index: usize,
    /// 消息
    pub message: ChatMessage,
    /// 结束原因
    pub finish_reason: Option<String>,
}

/// 使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    /// 提示词令牌数
    pub prompt_tokens: usize,
    /// 完成令牌数
    pub completion_tokens: usize,
    /// 总令牌数
    pub total_tokens: usize,
}

/// 流式响应块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingChunk {
    /// 响应 ID
    pub id: String,
    /// 对象类型
    pub object: String,
    /// 创建时间
    pub created: u64,
    /// 模型名称
    pub model: String,
    /// 选择列表
    pub choices: Vec<StreamingChoice>,
}

/// 流式响应选择
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingChoice {
    /// 索引
    pub index: usize,
    /// 消息增量
    pub delta: StreamingDelta,
    /// 结束原因
    pub finish_reason: Option<String>,
}

/// 消息增量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamingDelta {
    /// 角色
    pub role: Option<String>,
    /// 内容增量
    pub content: Option<String>,
    /// 工具调用增量
    pub tool_call: Option<FunctionCall>,
}

/// 嵌入请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    /// 模型名称
    pub model: String,
    /// 输入文本
    pub input: Vec<String>,
    /// 编码格式
    pub encoding_format: Option<String>,
}

impl Default for EmbeddingRequest {
    fn default() -> Self {
        Self {
            model: "text-embedding-3-small".to_string(),
            input: Vec::new(),
            encoding_format: Some("float".to_string()),
        }
    }
}

/// 嵌入响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    /// 对象类型
    pub object: String,
    /// 数据列表
    pub data: Vec<EmbeddingData>,
    /// 模型名称
    pub model: String,
    /// 使用统计
    pub usage: Usage,
}

/// 嵌入数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingData {
    /// 索引
    pub index: usize,
    /// 嵌入向量
    pub embedding: Vec<f32>,
    /// 对象类型
    pub object: String,
}

/// 模型列表响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelListResponse {
    /// 对象类型
    pub object: String,
    /// 模型列表
    pub data: Vec<ModelInfo>,
}

/// 模型信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// 模型 ID
    pub id: String,
    /// 对象类型
    pub object: String,
    /// 创建时间
    pub created: u64,
    /// 所有者
    pub owned_by: String,
    /// 模型权限
    pub permission: Vec<serde_json::Value>,
}

/// 错误响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetails,
}

/// 错误详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub r#type: String,
    pub message: String,
    pub param: Option<String>,
    pub code: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_creation() {
        let system_msg = ChatMessage::system("你是一个助手");
        assert_eq!(system_msg.role, "system");
        assert_eq!(system_msg.content, "你是一个助手");

        let user_msg = ChatMessage::user("你好");
        assert_eq!(user_msg.role, "user");
        assert_eq!(user_msg.content, "你好");
    }

    #[test]
    fn test_function_call() {
        let call = FunctionCall::new("search", serde_json::json!({"query": "test"}));
        assert_eq!(call.name, "search");
        assert_eq!(call.arguments["query"], "test");
    }

    #[test]
    fn test_response_format() {
        let json_format = ResponseFormat::json();
        assert_eq!(json_format.r#type, "json_object");

        let text_format = ResponseFormat::text();
        assert_eq!(text_format.r#type, "text");
    }

    #[test]
    fn test_chat_message_variants() {
        let asst = ChatMessage::assistant("Sure!");
        assert_eq!(asst.role, "assistant");
        assert_eq!(asst.content, "Sure!");

        let fc = FunctionCall::new("calc", serde_json::json!({"a":1}));
        let tool_msg = ChatMessage::tool("done", fc);
        assert_eq!(tool_msg.role, "assistant"); // tool call 由 assistant 发出

        let tr = ChatMessage::tool_result("result body", "calc");
        assert_eq!(tr.role, "tool");
        assert_eq!(tr.content, "result body");
    }

    #[test]
    fn test_function_definition() {
        let params = serde_json::json!({
            "type": "object",
            "properties": {"query": {"type": "string"}}
        });
        let fd = FunctionDefinition::new("search", "Search engine", params);
        assert_eq!(fd.name, "search");
        assert_eq!(fd.description, "Search engine");
    }

    #[test]
    fn test_chat_completion_response_serde() {
        let json = r#"{
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1700000000,
            "model": "qwen2.5:7b",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "Hello!"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
        }"#;
        let resp: ChatCompletionResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.id, "chatcmpl-123");
        assert_eq!(resp.choices.len(), 1);
        assert_eq!(resp.choices[0].message.content, String::from("Hello!"));
        assert_eq!(resp.usage.as_ref().unwrap().total_tokens, 15);
    }

    #[test]
    fn test_embedding_response_serde() {
        let json = r#"{
            "object": "list",
            "data": [{"object": "embedding", "embedding": [0.1, 0.2, 0.3], "index": 0}],
            "model": "text-embedding-3-small",
            "usage": {"prompt_tokens": 8, "completion_tokens": 0, "total_tokens": 8}
        }"#;
        let resp: EmbeddingResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.data.len(), 1);
        assert_eq!(resp.data[0].embedding.len(), 3);
    }

    #[test]
    fn test_chat_completion_request_serde_roundtrip() {
        let request = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![
                ChatMessage::system("You are helpful."),
                ChatMessage::user("Hello"),
            ],
            temperature: Some(0.5),
            max_tokens: Some(1024),
            stream: Some(false),
            tools: None,
            tool_choice: None,
            frequency_penalty: Some(0.0),
            presence_penalty: Some(0.0),
            stop: Some(vec!["\n".to_string()]),
            response_format: Some(ResponseFormat::json()),
        };
        let json = serde_json::to_string(&request).unwrap();
        let deserialized: ChatCompletionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.model, request.model);
        assert_eq!(deserialized.messages.len(), 2);
        assert_eq!(deserialized.messages[0].role, "system");
        assert_eq!(deserialized.messages[0].content, "You are helpful.");
        assert_eq!(deserialized.messages[1].role, "user");
        assert_eq!(deserialized.messages[1].content, "Hello");
        assert_eq!(deserialized.temperature, Some(0.5));
        assert_eq!(deserialized.max_tokens, Some(1024));
        assert_eq!(deserialized.stream, Some(false));
        assert_eq!(deserialized.frequency_penalty, Some(0.0));
        assert_eq!(deserialized.presence_penalty, Some(0.0));
        assert_eq!(deserialized.stop, Some(vec!["\n".to_string()]));
        assert_eq!(
            deserialized.response_format.as_ref().unwrap().r#type,
            "json_object"
        );
    }

    #[test]
    fn test_chat_message_serde_roundtrip() {
        let msg = ChatMessage {
            role: "user".to_string(),
            content: "Hello, world!".to_string(),
            tool_call: None,
            tool_result: None,
        };
        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: ChatMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.role, "user");
        assert_eq!(deserialized.content, "Hello, world!");
        assert!(deserialized.tool_call.is_none());
        assert!(deserialized.tool_result.is_none());
    }

    #[test]
    fn test_chat_completion_response_serde_roundtrip() {
        let response = ChatCompletionResponse {
            id: "chatcmpl-abc".to_string(),
            object: "chat.completion".to_string(),
            created: 1700000000,
            model: "gpt-4".to_string(),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage::assistant("Hi there"),
                finish_reason: Some("stop".to_string()),
            }],
            usage: Some(Usage {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
            }),
        };
        let json = serde_json::to_string(&response).unwrap();
        let deserialized: ChatCompletionResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "chatcmpl-abc");
        assert_eq!(deserialized.object, "chat.completion");
        assert_eq!(deserialized.created, 1700000000);
        assert_eq!(deserialized.model, "gpt-4");
        assert_eq!(deserialized.choices.len(), 1);
        assert_eq!(deserialized.choices[0].index, 0);
        assert_eq!(deserialized.choices[0].message.role, "assistant");
        assert_eq!(deserialized.choices[0].message.content, "Hi there");
        assert_eq!(deserialized.choices[0].finish_reason.as_deref(), Some("stop"));
        let usage = deserialized.usage.unwrap();
        assert_eq!(usage.prompt_tokens, 10);
        assert_eq!(usage.completion_tokens, 5);
        assert_eq!(usage.total_tokens, 15);
    }

    #[test]
    fn test_chat_choice_serde_roundtrip() {
        let choice = Choice {
            index: 2,
            message: ChatMessage::user("question"),
            finish_reason: Some("length".to_string()),
        };
        let json = serde_json::to_string(&choice).unwrap();
        let deserialized: Choice = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.index, 2);
        assert_eq!(deserialized.message.role, "user");
        assert_eq!(deserialized.message.content, "question");
        assert_eq!(deserialized.finish_reason.as_deref(), Some("length"));
    }

    #[test]
    fn test_usage_serde_roundtrip() {
        let usage = Usage {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
        };
        let json = serde_json::to_string(&usage).unwrap();
        let deserialized: Usage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.prompt_tokens, 100);
        assert_eq!(deserialized.completion_tokens, 50);
        assert_eq!(deserialized.total_tokens, 150);
    }

    #[test]
    fn test_function_call_serde_roundtrip() {
        let fc = FunctionCall::new("search", serde_json::json!({"query": "rust"}));
        let json = serde_json::to_string(&fc).unwrap();
        let deserialized: FunctionCall = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "search");
        assert_eq!(deserialized.arguments["query"], "rust");
    }

    #[test]
    fn test_tool_result_serde_roundtrip() {
        let tr = ToolResult {
            tool_name: "calc".to_string(),
            content: "42".to_string(),
        };
        let json = serde_json::to_string(&tr).unwrap();
        let deserialized: ToolResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.tool_name, "calc");
        assert_eq!(deserialized.content, "42");
    }

    #[test]
    fn test_function_definition_serde_roundtrip() {
        let params = serde_json::json!({"type": "object"});
        let fd = FunctionDefinition {
            name: "search".to_string(),
            description: "Search the web".to_string(),
            parameters: params,
            required: Some(vec!["query".to_string()]),
        };
        let json = serde_json::to_string(&fd).unwrap();
        let deserialized: FunctionDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "search");
        assert_eq!(deserialized.description, "Search the web");
        assert_eq!(deserialized.parameters["type"], "object");
        assert_eq!(deserialized.required, Some(vec!["query".to_string()]));
    }

    #[test]
    fn test_response_format_serde_roundtrip() {
        let fmt = ResponseFormat::json();
        let json = serde_json::to_string(&fmt).unwrap();
        let deserialized: ResponseFormat = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.r#type, "json_object");

        let fmt = ResponseFormat::text();
        let json = serde_json::to_string(&fmt).unwrap();
        let deserialized: ResponseFormat = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.r#type, "text");
    }

    #[test]
    fn test_tool_choice_function_serde() {
        let choice = ToolChoice::Function("search".to_string());
        let json = serde_json::to_string(&choice).unwrap();
        // untagged: Function(String) 序列化为 JSON 字符串
        let deserialized: ToolChoice = serde_json::from_str(&json).unwrap();
        match deserialized {
            ToolChoice::Function(name) => assert_eq!(name, "search"),
            other => panic!("expected Function, got {:?}", other),
        }
    }

    #[test]
    fn test_streaming_chunk_serde_roundtrip() {
        let chunk = StreamingChunk {
            id: "chatcmpl-1".to_string(),
            object: "chat.completion.chunk".to_string(),
            created: 1700000001,
            model: "gpt-4".to_string(),
            choices: vec![StreamingChoice {
                index: 0,
                delta: StreamingDelta {
                    role: Some("assistant".to_string()),
                    content: Some("Hello".to_string()),
                    tool_call: None,
                },
                finish_reason: None,
            }],
        };
        let json = serde_json::to_string(&chunk).unwrap();
        let deserialized: StreamingChunk = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "chatcmpl-1");
        assert_eq!(deserialized.object, "chat.completion.chunk");
        assert_eq!(deserialized.created, 1700000001);
        assert_eq!(deserialized.choices.len(), 1);
        assert_eq!(deserialized.choices[0].delta.role.as_deref(), Some("assistant"));
        assert_eq!(deserialized.choices[0].delta.content.as_deref(), Some("Hello"));
        assert!(deserialized.choices[0].finish_reason.is_none());
    }

    #[test]
    fn test_embedding_request_serde_roundtrip() {
        let req = EmbeddingRequest {
            model: "text-embedding-3-small".to_string(),
            input: vec!["hello".to_string(), "world".to_string()],
            encoding_format: Some("float".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: EmbeddingRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.model, "text-embedding-3-small");
        assert_eq!(deserialized.input.len(), 2);
        assert_eq!(deserialized.input[0], "hello");
        assert_eq!(deserialized.encoding_format.as_deref(), Some("float"));
    }

    #[test]
    fn test_embedding_response_serde_roundtrip() {
        let resp = EmbeddingResponse {
            object: "list".to_string(),
            data: vec![EmbeddingData {
                index: 0,
                embedding: vec![0.1, 0.2, 0.3],
                object: "embedding".to_string(),
            }],
            model: "text-embedding-3-small".to_string(),
            usage: Usage {
                prompt_tokens: 8,
                completion_tokens: 0,
                total_tokens: 8,
            },
        };
        let json = serde_json::to_string(&resp).unwrap();
        let deserialized: EmbeddingResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.object, "list");
        assert_eq!(deserialized.data.len(), 1);
        assert_eq!(deserialized.data[0].index, 0);
        assert_eq!(deserialized.data[0].embedding, vec![0.1, 0.2, 0.3]);
        assert_eq!(deserialized.data[0].object, "embedding");
        assert_eq!(deserialized.model, "text-embedding-3-small");
        assert_eq!(deserialized.usage.total_tokens, 8);
    }

    #[test]
    fn test_model_list_response_serde_roundtrip() {
        let resp = ModelListResponse {
            object: "list".to_string(),
            data: vec![ModelInfo {
                id: "gpt-4".to_string(),
                object: "model".to_string(),
                created: 1700000000,
                owned_by: "openai".to_string(),
                permission: vec![],
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let deserialized: ModelListResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.object, "list");
        assert_eq!(deserialized.data.len(), 1);
        assert_eq!(deserialized.data[0].id, "gpt-4");
        assert_eq!(deserialized.data[0].owned_by, "openai");
        assert!(deserialized.data[0].permission.is_empty());
    }

    #[test]
    fn test_error_response_serde_roundtrip() {
        let resp = ErrorResponse {
            error: ErrorDetails {
                r#type: "invalid_request_error".to_string(),
                message: "Bad request".to_string(),
                param: Some("model".to_string()),
                code: Some("invalid_model".to_string()),
            },
        };
        let json = serde_json::to_string(&resp).unwrap();
        let deserialized: ErrorResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.error.r#type, "invalid_request_error");
        assert_eq!(deserialized.error.message, "Bad request");
        assert_eq!(deserialized.error.param.as_deref(), Some("model"));
        assert_eq!(deserialized.error.code.as_deref(), Some("invalid_model"));
    }

    #[test]
    fn test_chat_completion_request_default() {
        let req = ChatCompletionRequest::default();
        assert_eq!(req.model, "qwen2.5:7b-instruct");
        assert!(req.messages.is_empty());
        assert_eq!(req.temperature, Some(0.7));
        assert_eq!(req.max_tokens, Some(4096));
        assert_eq!(req.stream, Some(false));
        assert!(req.tools.is_none());
    }

    #[test]
    fn test_embedding_request_default() {
        let req = EmbeddingRequest::default();
        assert_eq!(req.model, "text-embedding-3-small");
        assert!(req.input.is_empty());
        assert_eq!(req.encoding_format.as_deref(), Some("float"));
    }
}
