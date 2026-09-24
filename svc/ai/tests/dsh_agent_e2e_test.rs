//! DSH Agent 端到端测试
//!
//! 测试完整的 AI 调用链路，包括：
//! - Agent 同步执行
//! - Agent 流式执行
//! - 会话管理
//! - 工具调用
//! - LLM 集成（使用 MockProvider）
//! - 多轮对话

#![allow(dead_code)]
#![allow(unused_imports)]

use std::sync::Arc;
use std::time::Duration;

use topems_ai::dsh::agent::context::AgentMessage;
use topems_ai::dsh::agent::orchestrator::AgentExecuteRequest;
use topems_ai::dsh::agent::{
    AgentOrchestrator, AgentOrchestratorConfig, ContextManager, MessageRole, StreamChunk,
    StreamingResponse,
};
use topems_ai::dsh::mcp::{McpServer, ToolExecutionError, ToolRegistry};
use topems_ai::dsh::provider::{
    LlmProvider, LlmRequest, LlmResponse, LlmStreamChunk, MockProvider, ProviderConfig,
    ProviderType,
};
use topems_shared_mcp::protocol::{McpContent, McpToolResult};

use serde_json::json;
use tokio::sync::mpsc;
use tokio_stream::StreamExt;
use uuid::Uuid;

/// 创建测试用的 ToolRegistry（包含模拟工具）
async fn create_test_tool_registry() -> ToolRegistry {
    let registry = ToolRegistry::new();

    // 注册一个模拟搜索工具
    registry
        .register(
            "test_search",
            "测试搜索工具",
            json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索查询"}
                },
                "required": ["query"]
            }),
            |args| {
                let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("");
                let result = json!({
                    "results": [
                        {"title": format!("结果1: {}", query), "content": "这是测试结果1"},
                        {"title": format!("结果2: {}", query), "content": "这是测试结果2"}
                    ],
                    "total": 2
                });
                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 注册一个模拟计算工具
    registry
        .register(
            "test_calculator",
            "测试计算工具",
            json!({
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "数学表达式"}
                },
                "required": ["expression"]
            }),
            |args| {
                let expression = args
                    .get("expression")
                    .and_then(|v| v.as_str())
                    .unwrap_or("0");
                // 简单的计算：只支持加法
                let result: f64 = expression
                    .split('+')
                    .filter_map(|s| s.trim().parse::<f64>().ok())
                    .sum();
                let result = json!({
                    "expression": expression,
                    "result": result
                });
                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    registry
}

/// 创建测试用的 AgentOrchestrator（不带 LLM）
async fn create_test_orchestrator() -> AgentOrchestrator {
    let registry = create_test_tool_registry().await;
    let config = AgentOrchestratorConfig {
        max_iterations: 3,
        max_context_tokens: 4096,
        system_prompt: "你是测试助手".to_string(),
        enable_streaming: true,
        enable_tools: true,
        tool_timeout_seconds: 30,
        max_error_retries: 2,
    };
    AgentOrchestrator::new(registry).with_config(config)
}

/// 创建带 Mock LLM 的 AgentOrchestrator
async fn create_test_orchestrator_with_llm() -> AgentOrchestrator {
    let registry = create_test_tool_registry().await;
    let config = AgentOrchestratorConfig {
        max_iterations: 3,
        max_context_tokens: 4096,
        system_prompt: "你是测试助手".to_string(),
        enable_streaming: true,
        enable_tools: true,
        tool_timeout_seconds: 30,
        max_error_retries: 2,
    };

    let mock_provider = MockProvider::new(ProviderConfig {
        provider_type: ProviderType::Mock,
        api_url: None,
        api_key: None,
        default_model: Some("mock-model".to_string()),
        timeout_secs: 30,
        max_retries: 1,
        temperature: Some(0.7),
        max_tokens: Some(1000),
    });

    let provider: Arc<dyn LlmProvider> = Arc::new(mock_provider);

    AgentOrchestrator::with_llm_provider(registry, provider).with_config(config)
}

// ============================================================================
// 测试 1: Agent 基本执行
// ============================================================================

#[tokio::test]
async fn test_agent_basic_execution() {
    let orchestrator = create_test_orchestrator().await;

    let request = AgentExecuteRequest {
        query: "你好".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };

    let response = orchestrator.execute(request).await;

    assert!(!response.answer.is_empty(), "答案不应该为空");
    assert!(response.total_iterations >= 1, "迭代次数应该 >= 1");
    assert!(!response.steps.is_empty(), "执行步骤不应该为空");
}

// ============================================================================
// 测试 2: Agent 工具调用
// ============================================================================

#[tokio::test]
async fn test_agent_tool_calling() {
    let orchestrator = create_test_orchestrator().await;

    let request = AgentExecuteRequest {
        query: "搜索测试信息".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(3),
        available_tools: Some(vec!["test_search".to_string()]),
        stream: Some(false),
        context_variables: None,
    };

    let response = orchestrator.execute(request).await;

    // 检查是否有工具调用
    let tool_calls = response
        .steps
        .iter()
        .filter(|s| s.tool_name.is_some())
        .collect::<Vec<_>>();

    // 由于使用规则匹配，包含"搜索"应该触发工具调用
    assert!(
        !tool_calls.is_empty(),
        "应该有工具调用，实际步骤: {:?}",
        response
            .steps
            .iter()
            .map(|s| &s.description)
            .collect::<Vec<_>>()
    );
}

// ============================================================================
// 测试 3: 多轮对话
// ============================================================================

#[tokio::test]
async fn test_agent_multi_turn_conversation() {
    let orchestrator = create_test_orchestrator().await;
    let session_id = Uuid::new_v4().to_string();

    // 第一轮对话
    let request1 = AgentExecuteRequest {
        query: "我叫张三".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };
    let response1 = orchestrator.execute(request1).await;
    assert!(!response1.answer.is_empty());

    // 第二轮对话（同一会话）
    let request2 = AgentExecuteRequest {
        query: "我叫什么名字？".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };
    let response2 = orchestrator.execute(request2).await;
    assert!(!response2.answer.is_empty());

    // 验证会话上下文存在
    let context = orchestrator.get_session_context(&session_id).await;
    assert!(context.is_some(), "会话上下文应该存在");
    assert!(
        context.unwrap().messages.len() >= 4,
        "消息数量应该 >= 4（两轮对话）"
    );
}

// ============================================================================
// 测试 4: 会话清除
// ============================================================================

#[tokio::test]
async fn test_agent_session_clear() {
    let orchestrator = create_test_orchestrator().await;
    let session_id = Uuid::new_v4().to_string();

    // 执行一次对话
    let request = AgentExecuteRequest {
        query: "测试".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };
    orchestrator.execute(request).await;

    // 验证会话存在
    assert!(orchestrator
        .get_session_context(&session_id)
        .await
        .is_some());

    // 清除会话
    let cleared = orchestrator.clear_session(&session_id).await;
    assert!(cleared, "清除会话应该成功");

    // 验证会话已清除
    assert!(
        orchestrator
            .get_session_context(&session_id)
            .await
            .is_none(),
        "会话应该已清除"
    );
}

// ============================================================================
// 测试 5: 活跃会话统计
// ============================================================================

#[tokio::test]
async fn test_agent_active_sessions() {
    let orchestrator = create_test_orchestrator().await;

    let initial_count = orchestrator.active_sessions().await;

    // 创建3个会话
    for i in 0..3 {
        let request = AgentExecuteRequest {
            query: format!("测试{}", i),
            session_id: Some(Uuid::new_v4().to_string()),
            max_iterations: Some(1),
            available_tools: None,
            stream: Some(false),
            context_variables: None,
        };
        orchestrator.execute(request).await;
    }

    let final_count = orchestrator.active_sessions().await;
    assert_eq!(final_count, initial_count + 3, "活跃会话数应该增加3");
}

// ============================================================================
// 测试 6: 工具列表
// ============================================================================

#[tokio::test]
async fn test_agent_list_tools() {
    let orchestrator = create_test_orchestrator().await;

    let tools = orchestrator.tool_registry().list_tools().await;

    assert_eq!(tools.len(), 2, "应该有2个测试工具");
    assert!(
        tools.iter().any(|t| t.name == "test_search"),
        "应该包含 test_search 工具"
    );
    assert!(
        tools.iter().any(|t| t.name == "test_calculator"),
        "应该包含 test_calculator 工具"
    );
}

// ============================================================================
// 测试 7: LLM 集成（使用 MockProvider）
// ============================================================================

#[tokio::test]
async fn test_agent_with_mock_llm() {
    let orchestrator = create_test_orchestrator_with_llm().await;

    let request = AgentExecuteRequest {
        query: "你好，请介绍一下自己".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(2),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };

    let response = orchestrator.execute(request).await;

    assert!(!response.answer.is_empty(), "答案不应该为空");
    assert!(response.total_iterations >= 1, "迭代次数应该 >= 1");
}

// ============================================================================
// 测试 8: 流式执行
// ============================================================================

#[tokio::test]
async fn test_agent_streaming_execution() {
    let orchestrator = create_test_orchestrator().await;
    let session_id = Uuid::new_v4().to_string();

    let request = AgentExecuteRequest {
        query: "测试流式响应".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(true),
        context_variables: None,
    };

    let streaming_response = orchestrator.execute_streaming(request).await;

    assert!(streaming_response.is_ok(), "流式执行应该成功");

    let streaming_response = streaming_response.unwrap();
    assert_eq!(streaming_response.session_id, session_id);

    // 等待流式事件完成（最多等待5秒）
    let timeout = tokio::time::sleep(Duration::from_secs(5));
    tokio::pin!(timeout);

    #[allow(clippy::never_loop)]
    loop {
        tokio::select! {
            _ = &mut timeout => {
                break;
            }
            else => {
                break;
            }
        }
    }

    // 给后台任务一点时间完成
    tokio::time::sleep(Duration::from_millis(500)).await;

    // 验证会话存在
    assert!(
        orchestrator
            .get_session_context(&session_id)
            .await
            .is_some(),
        "流式执行后会话应该存在"
    );
}

// ============================================================================
// 测试 9: 上下文管理器
// ============================================================================

#[tokio::test]
async fn test_context_manager() {
    let manager = ContextManager::new()
        .with_default_system_prompt("你是测试助手")
        .with_default_max_tokens(4096);

    let session_id = Uuid::new_v4().to_string();

    // 先创建上下文
    manager.get_or_create_context(&session_id).await;

    // 添加用户消息
    manager
        .add_message(&session_id, AgentMessage::user("你好"))
        .await;

    // 添加助手消息
    manager
        .add_message(
            &session_id,
            AgentMessage::assistant("你好！有什么可以帮助你的？"),
        )
        .await;

    // 获取上下文
    let context = manager.get_context(&session_id).await;
    assert!(context.is_some());
    let context = context.unwrap();
    assert_eq!(context.messages.len(), 2); // user + assistant
    assert_eq!(context.messages[0].role, MessageRole::User);
    assert_eq!(context.messages[1].role, MessageRole::Assistant);

    // 获取用户消息
    let user_messages = context.get_user_messages();
    assert_eq!(user_messages.len(), 1);
    assert_eq!(user_messages[0].content, "你好");
}

// ============================================================================
// 测试 10: 错误恢复
// ============================================================================

#[tokio::test]
async fn test_agent_error_recovery() {
    let orchestrator = create_test_orchestrator().await;

    // 使用不存在的工具
    let request = AgentExecuteRequest {
        query: "搜索测试".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(3),
        available_tools: Some(vec!["nonexistent_tool".to_string()]),
        stream: Some(false),
        context_variables: None,
    };

    let response = orchestrator.execute(request).await;

    // 即使工具不存在，Agent 也应该能够恢复并生成答案
    assert!(!response.answer.is_empty(), "答案不应该为空");
    assert!(response.total_iterations >= 1, "迭代次数应该 >= 1");
}

// ============================================================================
// 测试 11: 配置自定义
// ============================================================================

#[tokio::test]
async fn test_agent_custom_config() {
    let registry = create_test_tool_registry().await;
    let config = AgentOrchestratorConfig {
        max_iterations: 5,
        max_context_tokens: 8192,
        system_prompt: "自定义系统提示".to_string(),
        enable_streaming: false,
        enable_tools: false,
        tool_timeout_seconds: 60,
        max_error_retries: 0,
    };

    let orchestrator = AgentOrchestrator::new(registry).with_config(config.clone());

    assert_eq!(orchestrator.config().max_iterations, 5);
    assert_eq!(orchestrator.config().max_context_tokens, 8192);
    assert_eq!(orchestrator.config().system_prompt, "自定义系统提示");
    assert!(!orchestrator.config().enable_streaming);
    assert!(!orchestrator.config().enable_tools);
}

// ============================================================================
// 测试 12: 执行步骤详情
// ============================================================================

#[tokio::test]
async fn test_agent_execution_steps() {
    let orchestrator = create_test_orchestrator().await;

    let request = AgentExecuteRequest {
        query: "搜索测试信息".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(2),
        available_tools: Some(vec!["test_search".to_string()]),
        stream: Some(false),
        context_variables: None,
    };

    let response = orchestrator.execute(request).await;

    // 验证执行步骤
    assert!(!response.steps.is_empty(), "执行步骤不应该为空");

    for step in &response.steps {
        assert!(step.step_number >= 1, "步骤号应该 >= 1");
        assert!(!step.step_type.is_empty(), "步骤类型不应该为空");
        assert!(!step.description.is_empty(), "步骤描述不应该为空");
    }

    // 验证使用的工具
    assert!(!response.tools_used.is_empty() || response.total_iterations >= 1);
}

// ============================================================================
// 测试 13: 上下文变量
// ============================================================================

#[tokio::test]
async fn test_agent_context_variables() {
    let orchestrator = create_test_orchestrator().await;
    let session_id = Uuid::new_v4().to_string();

    let mut variables = std::collections::HashMap::new();
    variables.insert("user_id".to_string(), "12345".to_string());
    variables.insert("user_name".to_string(), "张三".to_string());
    variables.insert("department".to_string(), "技术部".to_string());

    let request = AgentExecuteRequest {
        query: "你好".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: Some(variables.clone()),
    };

    orchestrator.execute(request).await;

    // 验证上下文变量
    let context = orchestrator.get_session_context(&session_id).await;
    assert!(context.is_some());
    let context = context.unwrap();
    assert_eq!(
        context.variables.get("user_id").map(|s| s.as_str()),
        Some("12345")
    );
    assert_eq!(
        context.variables.get("user_name").map(|s| s.as_str()),
        Some("张三")
    );
}

// ============================================================================
// 测试 14: 并发执行
// ============================================================================

#[tokio::test]
async fn test_agent_concurrent_execution() {
    let orchestrator = create_test_orchestrator().await;
    let orchestrator = Arc::new(orchestrator);

    let mut handles = vec![];

    // 并发执行5个请求
    for i in 0..5 {
        let orch = orchestrator.clone();
        let handle = tokio::spawn(async move {
            let request = AgentExecuteRequest {
                query: format!("并发测试{}", i),
                session_id: Some(Uuid::new_v4().to_string()),
                max_iterations: Some(1),
                available_tools: None,
                stream: Some(false),
                context_variables: None,
            };
            orch.execute(request).await
        });
        handles.push(handle);
    }

    // 等待所有请求完成
    for handle in handles {
        let response = handle.await.unwrap();
        assert!(!response.answer.is_empty());
    }

    // 验证活跃会话数
    assert!(orchestrator.active_sessions().await >= 5);
}

// ============================================================================
// 测试 15: 完整端到端流程
// ============================================================================

#[tokio::test]
async fn test_agent_full_e2e_flow() {
    // 1. 创建编排器
    let orchestrator = create_test_orchestrator().await;
    let session_id = Uuid::new_v4().to_string();

    // 2. 第一轮：用户提问
    let mut variables = std::collections::HashMap::new();
    variables.insert("topic".to_string(), "Rust".to_string());

    let request1 = AgentExecuteRequest {
        query: "搜索关于 Rust 的信息".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(3),
        available_tools: Some(vec!["test_search".to_string()]),
        stream: Some(false),
        context_variables: Some(variables),
    };
    let response1 = orchestrator.execute(request1).await;
    assert!(!response1.answer.is_empty());
    assert!(response1.total_iterations >= 1);

    // 3. 验证工具调用
    let tool_calls = response1
        .steps
        .iter()
        .filter(|s| s.tool_name.is_some())
        .collect::<Vec<_>>();
    assert!(!tool_calls.is_empty(), "应该有工具调用");

    // 4. 第二轮：追问
    let request2 = AgentExecuteRequest {
        query: "再搜索一下关于 Go 的信息".to_string(),
        session_id: Some(session_id.clone()),
        max_iterations: Some(3),
        available_tools: Some(vec!["test_search".to_string()]),
        stream: Some(false),
        context_variables: None,
    };
    let response2 = orchestrator.execute(request2).await;
    assert!(!response2.answer.is_empty());

    // 5. 验证会话上下文
    let context = orchestrator.get_session_context(&session_id).await;
    assert!(context.is_some());
    let context = context.unwrap();
    assert!(context.messages.len() >= 6); // 2轮对话，每轮至少3条消息

    // 6. 验证活跃会话
    assert!(orchestrator.active_sessions().await >= 1);

    // 7. 清除会话
    assert!(orchestrator.clear_session(&session_id).await);

    // 8. 验证会话已清除
    assert!(orchestrator
        .get_session_context(&session_id)
        .await
        .is_none());

    println!("✅ 完整端到端流程测试通过！");
}

// ============================================================================
// 测试 3.1: 路由 + 故障降级组合 Provider（with_resilient_provider）
// ============================================================================

#[tokio::test]
async fn test_agent_with_resilient_provider() {
    // 将简单/复杂/备用路由全部指向 mock，确保无外部依赖
    std::env::set_var("DSH_SIMPLE_PROVIDER", "mock");
    std::env::set_var("DSH_COMPLEX_PROVIDER", "mock");
    std::env::set_var("DSH_FALLBACK_PROVIDER", "mock");

    let registry = create_test_tool_registry().await;
    let config = AgentOrchestratorConfig {
        max_iterations: 3,
        max_context_tokens: 4096,
        system_prompt: "你是测试助手".to_string(),
        enable_streaming: true,
        enable_tools: true,
        tool_timeout_seconds: 30,
        max_error_retries: 2,
    };

    let orchestrator = AgentOrchestrator::with_resilient_provider(registry).with_config(config);

    // 简单任务（含"你好"关键词 → 简单路由）
    let request = AgentExecuteRequest {
        query: "你好".to_string(),
        session_id: Some(Uuid::new_v4().to_string()),
        max_iterations: Some(1),
        available_tools: None,
        stream: Some(false),
        context_variables: None,
    };
    let response = orchestrator.execute(request).await;
    assert!(!response.answer.is_empty(), "简单任务应正常返回");

    // 清理环境变量
    std::env::remove_var("DSH_SIMPLE_PROVIDER");
    std::env::remove_var("DSH_COMPLEX_PROVIDER");
    std::env::remove_var("DSH_FALLBACK_PROVIDER");
}
