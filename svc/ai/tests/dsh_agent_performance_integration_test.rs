//! DSH Agent 性能监控集成测试
//!
//! 验证 Agent 编排器与性能监控器的集成，包括：
//! - 执行指标自动记录
//! - 工具调用指标自动记录
//! - 延迟统计
//! - 成功率统计

#![allow(dead_code)]
#![allow(unused_imports)]

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use topems_ai::dsh::agent::{
    AgentOrchestrator, AgentPerformanceMonitor, PerformanceMonitorConfig,
};
use topems_ai::dsh::agent::orchestrator::AgentExecuteRequest;
use topems_ai::dsh::mcp::ToolRegistry;
use topems_shared_mcp::protocol::{McpContent, McpToolResult};

use serde_json::json;

// ========================================================================
// 测试工具
// ========================================================================

/// 创建带有测试工具的 ToolRegistry
async fn create_test_registry() -> ToolRegistry {
    let registry = ToolRegistry::new();

    // 注册 echo 工具
    registry
        .register(
            "echo",
            "Echo test tool",
            json!({"type": "object", "properties": {}}),
            |_args| {
                let result = json!({"echo": "hello"});
                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 注册 failing 工具
    registry
        .register(
            "failing",
            "Failing test tool",
            json!({"type": "object", "properties": {}}),
            |_args| {
                Err(topems_ai::dsh::mcp::ToolExecutionError::Execution(
                    "Simulated tool failure".to_string(),
                ))
            },
        )
        .await;

    registry
}

/// 创建测试请求
fn create_test_request(query: &str, session_id: &str) -> AgentExecuteRequest {
    AgentExecuteRequest {
        query: query.to_string(),
        session_id: Some(session_id.to_string()),
        available_tools: None,
        max_iterations: Some(3),
        stream: Some(false),
        context_variables: None,
    }
}

// ========================================================================
// 测试用例
// ========================================================================

#[tokio::test]
async fn test_performance_monitor_integration_basic_execution() {
    // 创建性能监控器
    let config = PerformanceMonitorConfig::default();
    let monitor = AgentPerformanceMonitor::new(config);

    // 创建 Agent 编排器并设置性能监控器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行 Agent
    let request = create_test_request("test query", "test-session-1");
    let response = orchestrator.execute(request).await;

    // 验证响应
    assert!(response.success);

    // 验证性能指标已记录
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.total_executions, 1);
    assert_eq!(metrics.successful_executions, 1);
    assert_eq!(metrics.failed_executions, 0);
    assert_eq!(metrics.success_rate, 1.0);
    assert!(metrics.total_duration_ms >= 0);
    assert!(metrics.avg_duration_ms >= 0.0);
}

#[tokio::test]
async fn test_performance_monitor_multiple_executions() {
    // 创建性能监控器
    let monitor = AgentPerformanceMonitor::with_defaults();

    // 创建 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行多次
    for i in 0..5 {
        let request = create_test_request(&format!("test query {}", i), &format!("session-{}", i));
        orchestrator.execute(request).await;
    }

    // 验证性能指标
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.total_executions, 5);
    assert_eq!(metrics.successful_executions, 5);
    assert_eq!(metrics.success_rate, 1.0);
    assert!(metrics.avg_duration_ms >= 0.0);
    assert!(metrics.min_duration_ms >= 0);
    assert!(metrics.max_duration_ms >= metrics.min_duration_ms);
}

#[tokio::test]
async fn test_performance_monitor_tool_calls() {
    // 创建性能监控器
    let monitor = AgentPerformanceMonitor::with_defaults();

    // 直接记录工具调用（不依赖 Agent 编排器的工具选择）
    monitor.record_tool_call("echo", 100, true);
    monitor.record_tool_call("echo", 200, true);
    monitor.record_tool_call("echo", 150, false);
    monitor.record_tool_call("search", 300, true);

    // 验证工具指标
    let echo_metrics = monitor.get_tool_metric("echo");
    assert!(echo_metrics.is_some(), "Echo tool metrics should be recorded");

    let echo = echo_metrics.unwrap();
    assert_eq!(echo.tool_name, "echo");
    assert_eq!(echo.call_count, 3);
    assert_eq!(echo.success_count, 2);
    assert_eq!(echo.failure_count, 1);
    assert!((echo.avg_duration_ms - 150.0).abs() < 1.0);
    assert!((echo.success_rate - 2.0 / 3.0).abs() < 0.01);

    // 验证所有工具指标
    let all_tools = monitor.get_tool_metrics();
    assert_eq!(all_tools.len(), 2);
}

#[tokio::test]
async fn test_performance_monitor_history_size() {
    // 创建性能监控器，限制历史记录大小
    let config = PerformanceMonitorConfig {
        max_history_size: 3,
        ..Default::default()
    };
    let monitor = AgentPerformanceMonitor::new(config);

    // 创建 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行 5 次（超过历史记录限制）
    for i in 0..5 {
        let request = create_test_request(&format!("query {}", i), &format!("session-{}", i));
        orchestrator.execute(request).await;
    }

    // 验证历史记录被限制
    assert_eq!(monitor.history_size(), 3);

    // 验证累计指标仍然正确
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.total_executions, 5);
}

#[tokio::test]
async fn test_performance_monitor_reset() {
    // 创建性能监控器
    let monitor = AgentPerformanceMonitor::with_defaults();

    // 创建 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行几次
    for i in 0..3 {
        let request = create_test_request(&format!("query {}", i), &format!("session-{}", i));
        orchestrator.execute(request).await;
    }

    // 验证有指标
    assert_eq!(monitor.get_metrics().total_executions, 3);

    // 重置
    monitor.reset();

    // 验证指标已重置
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.total_executions, 0);
    assert_eq!(metrics.successful_executions, 0);
    assert_eq!(monitor.history_size(), 0);
    assert!(monitor.get_tool_metrics().is_empty());
}

#[tokio::test]
async fn test_performance_monitor_prometheus_export() {
    // 创建性能监控器
    let monitor = AgentPerformanceMonitor::with_defaults();

    // 创建 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行几次
    for i in 0..2 {
        let request = create_test_request(&format!("query {}", i), &format!("session-{}", i));
        orchestrator.execute(request).await;
    }

    // 导出 Prometheus 指标
    let prometheus = monitor.export_prometheus_metrics();

    // 验证包含关键指标
    assert!(prometheus.contains("topems_agent_executions_total"));
    assert!(prometheus.contains("topems_agent_execution_duration_ms"));
    assert!(prometheus.contains("topems_agent_tool_calls_total"));
    assert!(prometheus.contains("2")); // 执行次数
}

#[tokio::test]
async fn test_performance_monitor_without_monitor() {
    // 创建没有性能监控器的 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry);

    // 验证性能监控器为 None
    assert!(orchestrator.performance_monitor().is_none());

    // 执行 Agent（应该正常工作，不记录性能指标）
    let request = create_test_request("test query", "no-monitor-session");
    let response = orchestrator.execute(request).await;
    assert!(response.success);
}

#[tokio::test]
async fn test_performance_monitor_iteration_count() {
    // 创建性能监控器
    let monitor = AgentPerformanceMonitor::with_defaults();

    // 创建 Agent 编排器
    let registry = create_test_registry().await;
    let orchestrator = AgentOrchestrator::new(registry)
        .with_performance_monitor(monitor.clone());

    // 执行 Agent，限制最大迭代次数
    let request = AgentExecuteRequest {
        query: "test query".to_string(),
        session_id: Some("iteration-test".to_string()),
        available_tools: None,
        max_iterations: Some(3),
        stream: Some(false),
        context_variables: None,
    };

    orchestrator.execute(request).await;

    // 验证平均迭代次数
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.total_executions, 1);
    assert!(metrics.avg_iterations >= 1.0);
    assert!(metrics.avg_iterations <= 3.0);
}
