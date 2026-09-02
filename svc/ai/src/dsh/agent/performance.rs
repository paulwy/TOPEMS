//! Agent 性能监控模块
//!
//! 提供 Agent 执行指标收集、延迟监控、成功率统计等功能，
//! 支持 Prometheus 指标导出和日志记录。

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 执行指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionMetrics {
    /// 总执行次数
    pub total_executions: u64,
    /// 成功次数
    pub successful_executions: u64,
    /// 失败次数
    pub failed_executions: u64,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 平均耗时（毫秒）
    pub avg_duration_ms: f64,
    /// 最小耗时（毫秒）
    pub min_duration_ms: u64,
    /// 最大耗时（毫秒）
    pub max_duration_ms: u64,
    /// P50 延迟（毫秒）
    pub p50_duration_ms: f64,
    /// P95 延迟（毫秒）
    pub p95_duration_ms: f64,
    /// P99 延迟（毫秒）
    pub p99_duration_ms: f64,
    /// 工具调用总次数
    pub total_tool_calls: u64,
    /// 平均工具调用次数
    pub avg_tool_calls: f64,
    /// 平均迭代次数
    pub avg_iterations: f64,
    /// 成功率（0-1）
    pub success_rate: f64,
}

impl Default for ExecutionMetrics {
    fn default() -> Self {
        Self {
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            total_duration_ms: 0,
            avg_duration_ms: 0.0,
            min_duration_ms: u64::MAX,
            max_duration_ms: 0,
            p50_duration_ms: 0.0,
            p95_duration_ms: 0.0,
            p99_duration_ms: 0.0,
            total_tool_calls: 0,
            avg_tool_calls: 0.0,
            avg_iterations: 0.0,
            success_rate: 0.0,
        }
    }
}

/// 单次执行记录
#[derive(Debug, Clone)]
struct ExecutionRecord {
    /// 会话 ID
    session_id: String,
    /// 是否成功
    success: bool,
    /// 耗时（毫秒）
    duration_ms: u64,
    /// 工具调用次数
    tool_calls: u32,
    /// 迭代次数
    iterations: u32,
    /// 时间戳
    timestamp: Instant,
}

/// 工具调用指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolMetrics {
    /// 工具名称
    pub tool_name: String,
    /// 调用次数
    pub call_count: u64,
    /// 成功次数
    pub success_count: u64,
    /// 失败次数
    pub failure_count: u64,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 平均耗时（毫秒）
    pub avg_duration_ms: f64,
    /// 成功率（0-1）
    pub success_rate: f64,
}

/// 性能监控配置
#[derive(Debug, Clone)]
pub struct PerformanceMonitorConfig {
    /// 是否启用性能监控
    pub enabled: bool,
    /// 历史记录最大数量
    pub max_history_size: usize,
    /// 是否记录详细日志
    pub log_detailed: bool,
    /// 慢查询阈值（毫秒）
    pub slow_query_threshold_ms: u64,
    /// 高错误率阈值（0-1）
    pub high_error_rate_threshold: f64,
}

impl Default for PerformanceMonitorConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_history_size: 10000,
            log_detailed: false,
            slow_query_threshold_ms: 5000,
            high_error_rate_threshold: 0.1,
        }
    }
}

// ============================================================================
// 性能监控器
// ============================================================================

/// Agent 性能监控器
#[derive(Clone)]
pub struct AgentPerformanceMonitor {
    /// 配置
    config: PerformanceMonitorConfig,
    /// 执行记录历史
    history: Arc<Mutex<Vec<ExecutionRecord>>>,
    /// 工具指标
    tool_metrics: Arc<Mutex<HashMap<String, ToolMetrics>>>,
    /// 累计指标
    cumulative: Arc<Mutex<ExecutionMetrics>>,
}

impl AgentPerformanceMonitor {
    /// 创建新的性能监控器
    pub fn new(config: PerformanceMonitorConfig) -> Self {
        Self {
            config,
            history: Arc::new(Mutex::new(Vec::new())),
            tool_metrics: Arc::new(Mutex::new(HashMap::new())),
            cumulative: Arc::new(Mutex::new(ExecutionMetrics::default())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(PerformanceMonitorConfig::default())
    }

    /// 记录执行开始
    pub fn record_start(&self, session_id: &str) -> ExecutionTimer {
        debug!(session_id = %session_id, "Agent execution started");
        ExecutionTimer {
            monitor: self.clone(),
            session_id: session_id.to_string(),
            start_time: Instant::now(),
            tool_calls: 0,
            iterations: 0,
        }
    }

    /// 记录工具调用
    pub fn record_tool_call(&self, tool_name: &str, duration_ms: u64, success: bool) {
        if !self.config.enabled {
            return;
        }

        let mut metrics = self.tool_metrics.lock();
        let tool_metric = metrics.entry(tool_name.to_string()).or_insert(ToolMetrics {
            tool_name: tool_name.to_string(),
            call_count: 0,
            success_count: 0,
            failure_count: 0,
            total_duration_ms: 0,
            avg_duration_ms: 0.0,
            success_rate: 0.0,
        });

        tool_metric.call_count += 1;
        if success {
            tool_metric.success_count += 1;
        } else {
            tool_metric.failure_count += 1;
        }
        tool_metric.total_duration_ms += duration_ms;
        tool_metric.avg_duration_ms =
            tool_metric.total_duration_ms as f64 / tool_metric.call_count as f64;
        tool_metric.success_rate = tool_metric.success_count as f64 / tool_metric.call_count as f64;

        if self.config.log_detailed {
            debug!(
                tool = %tool_name,
                duration_ms = duration_ms,
                success = success,
                "Tool call recorded"
            );
        }
    }

    /// 记录执行完成
    fn record_execution(
        &self,
        session_id: &str,
        duration_ms: u64,
        success: bool,
        tool_calls: u32,
        iterations: u32,
    ) {
        if !self.config.enabled {
            return;
        }

        // 慢查询警告
        if duration_ms > self.config.slow_query_threshold_ms {
            warn!(
                session_id = %session_id,
                duration_ms = duration_ms,
                threshold_ms = self.config.slow_query_threshold_ms,
                "Slow agent execution detected"
            );
        }

        // 记录执行历史
        let record = ExecutionRecord {
            session_id: session_id.to_string(),
            success,
            duration_ms,
            tool_calls,
            iterations,
            timestamp: Instant::now(),
        };

        let mut history = self.history.lock();
        history.push(record);

        // 限制历史记录大小
        if history.len() > self.config.max_history_size {
            let remove_count = history.len() - self.config.max_history_size;
            history.drain(0..remove_count);
        }

        // 更新累计指标
        let mut cumulative = self.cumulative.lock();
        cumulative.total_executions += 1;
        if success {
            cumulative.successful_executions += 1;
        } else {
            cumulative.failed_executions += 1;
        }
        cumulative.total_duration_ms += duration_ms;
        cumulative.total_tool_calls += tool_calls as u64;

        // 重新计算平均值
        cumulative.avg_duration_ms =
            cumulative.total_duration_ms as f64 / cumulative.total_executions as f64;
        cumulative.avg_tool_calls =
            cumulative.total_tool_calls as f64 / cumulative.total_executions as f64;
        cumulative.avg_iterations = if cumulative.avg_iterations == 0.0 {
            iterations as f64
        } else {
            (cumulative.avg_iterations + iterations as f64) / 2.0
        };
        cumulative.success_rate =
            cumulative.successful_executions as f64 / cumulative.total_executions as f64;

        // 更新最小/最大耗时
        cumulative.min_duration_ms = cumulative.min_duration_ms.min(duration_ms);
        cumulative.max_duration_ms = cumulative.max_duration_ms.max(duration_ms);

        // 高错误率警告
        if cumulative.total_executions > 10
            && cumulative.success_rate < 1.0 - self.config.high_error_rate_threshold
        {
            warn!(
                success_rate = cumulative.success_rate,
                threshold = 1.0 - self.config.high_error_rate_threshold,
                "High agent error rate detected"
            );
        }

        info!(
            session_id = %session_id,
            duration_ms = duration_ms,
            success = success,
            tool_calls = tool_calls,
            iterations = iterations,
            "Agent execution completed"
        );
    }

    /// 获取累计指标
    pub fn get_metrics(&self) -> ExecutionMetrics {
        let cumulative = self.cumulative.lock();
        let mut metrics = cumulative.clone();

        // 计算百分位数
        let history = self.history.lock();
        if !history.is_empty() {
            let mut durations: Vec<u64> = history.iter().map(|r| r.duration_ms).collect();
            durations.sort();

            metrics.p50_duration_ms = percentile(&durations, 50.0);
            metrics.p95_duration_ms = percentile(&durations, 95.0);
            metrics.p99_duration_ms = percentile(&durations, 99.0);
        }

        // 修复 min_duration_ms 如果没有记录
        if metrics.min_duration_ms == u64::MAX {
            metrics.min_duration_ms = 0;
        }

        metrics
    }

    /// 获取工具指标
    pub fn get_tool_metrics(&self) -> Vec<ToolMetrics> {
        let metrics = self.tool_metrics.lock();
        metrics.values().cloned().collect()
    }

    /// 获取指定工具的指标
    pub fn get_tool_metric(&self, tool_name: &str) -> Option<ToolMetrics> {
        let metrics = self.tool_metrics.lock();
        metrics.get(tool_name).cloned()
    }

    /// 重置所有指标
    pub fn reset(&self) {
        let mut history = self.history.lock();
        history.clear();

        let mut tool_metrics = self.tool_metrics.lock();
        tool_metrics.clear();

        let mut cumulative = self.cumulative.lock();
        *cumulative = ExecutionMetrics::default();

        info!("Performance metrics reset");
    }

    /// 获取历史记录数量
    pub fn history_size(&self) -> usize {
        self.history.lock().len()
    }

    /// 导出 Prometheus 格式的指标
    pub fn export_prometheus_metrics(&self) -> String {
        let metrics = self.get_metrics();
        let tool_metrics = self.get_tool_metrics();

        let mut output = String::new();

        // Agent 执行指标
        output.push_str("# HELP topems_agent_executions_total Total agent executions\n");
        output.push_str("# TYPE topems_agent_executions_total counter\n");
        output.push_str(&format!(
            "topems_agent_executions_total {}\n",
            metrics.total_executions
        ));

        output
            .push_str("# HELP topems_agent_executions_success Total successful agent executions\n");
        output.push_str("# TYPE topems_agent_executions_success counter\n");
        output.push_str(&format!(
            "topems_agent_executions_success {}\n",
            metrics.successful_executions
        ));

        output.push_str("# HELP topems_agent_executions_failed Total failed agent executions\n");
        output.push_str("# TYPE topems_agent_executions_failed counter\n");
        output.push_str(&format!(
            "topems_agent_executions_failed {}\n",
            metrics.failed_executions
        ));

        output.push_str(
            "# HELP topems_agent_execution_duration_ms Agent execution duration in milliseconds\n",
        );
        output.push_str("# TYPE topems_agent_execution_duration_ms summary\n");
        output.push_str(&format!(
            "topems_agent_execution_duration_ms{{quantile=\"0.5\"}} {}\n",
            metrics.p50_duration_ms
        ));
        output.push_str(&format!(
            "topems_agent_execution_duration_ms{{quantile=\"0.95\"}} {}\n",
            metrics.p95_duration_ms
        ));
        output.push_str(&format!(
            "topems_agent_execution_duration_ms{{quantile=\"0.99\"}} {}\n",
            metrics.p99_duration_ms
        ));
        output.push_str(&format!(
            "topems_agent_execution_duration_ms_sum {}\n",
            metrics.total_duration_ms
        ));
        output.push_str(&format!(
            "topems_agent_execution_duration_ms_count {}\n",
            metrics.total_executions
        ));

        output.push_str("# HELP topems_agent_tool_calls_total Total tool calls\n");
        output.push_str("# TYPE topems_agent_tool_calls_total counter\n");
        output.push_str(&format!(
            "topems_agent_tool_calls_total {}\n",
            metrics.total_tool_calls
        ));

        // 工具指标
        for tool in &tool_metrics {
            output.push_str(&format!(
                "# HELP topems_agent_tool_calls{{tool=\"{}\"}} Tool call count\n",
                tool.tool_name
            ));
            output.push_str("# TYPE topems_agent_tool_calls counter\n");
            output.push_str(&format!(
                "topems_agent_tool_calls{{tool=\"{}\"}} {}\n",
                tool.tool_name, tool.call_count
            ));

            output.push_str(&format!(
                "# HELP topems_agent_tool_duration_ms{{tool=\"{}\"}} Tool execution duration\n",
                tool.tool_name
            ));
            output.push_str("# TYPE topems_agent_tool_duration_ms gauge\n");
            output.push_str(&format!(
                "topems_agent_tool_duration_ms{{tool=\"{}\"}} {}\n",
                tool.tool_name, tool.avg_duration_ms
            ));
        }

        output
    }
}

// ============================================================================
// 执行计时器
// ============================================================================

/// 执行计时器（RAII 模式）
pub struct ExecutionTimer {
    /// 性能监控器引用
    monitor: AgentPerformanceMonitor,
    /// 会话 ID
    session_id: String,
    /// 开始时间
    start_time: Instant,
    /// 工具调用次数
    tool_calls: u32,
    /// 迭代次数
    iterations: u32,
}

impl ExecutionTimer {
    /// 增加工具调用次数
    pub fn increment_tool_calls(&mut self) {
        self.tool_calls += 1;
    }

    /// 增加迭代次数
    pub fn increment_iterations(&mut self) {
        self.iterations += 1;
    }

    /// 设置工具调用次数
    pub fn set_tool_calls(&mut self, count: u32) {
        self.tool_calls = count;
    }

    /// 设置迭代次数
    pub fn set_iterations(&mut self, count: u32) {
        self.iterations = count;
    }

    /// 完成执行（成功）
    pub fn finish_success(self) -> Duration {
        let duration = self.start_time.elapsed();
        self.monitor.record_execution(
            &self.session_id,
            duration.as_millis() as u64,
            true,
            self.tool_calls,
            self.iterations,
        );
        duration
    }

    /// 完成执行（失败）
    pub fn finish_failure(self) -> Duration {
        let duration = self.start_time.elapsed();
        self.monitor.record_execution(
            &self.session_id,
            duration.as_millis() as u64,
            false,
            self.tool_calls,
            self.iterations,
        );
        duration
    }

    /// 获取已用时间
    pub fn elapsed(&self) -> Duration {
        self.start_time.elapsed()
    }
}

// ============================================================================
// 工具函数
// ============================================================================

/// 计算百分位数（最近秩法）
fn percentile(sorted_data: &[u64], percentile: f64) -> f64 {
    if sorted_data.is_empty() {
        return 0.0;
    }

    // 使用最近秩法：index = ceil(percentile/100 * N) - 1
    let n = sorted_data.len() as f64;
    let rank = (percentile / 100.0 * n).ceil() as usize;
    let index = rank.saturating_sub(1).min(sorted_data.len() - 1);
    sorted_data[index] as f64
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_monitor_creation() {
        let monitor = AgentPerformanceMonitor::with_defaults();
        let metrics = monitor.get_metrics();
        assert_eq!(metrics.total_executions, 0);
    }

    #[test]
    fn test_execution_recording() {
        let monitor = AgentPerformanceMonitor::with_defaults();

        // 记录成功执行
        let timer = monitor.record_start("session-1");
        timer.finish_success();

        // 记录失败执行
        let timer = monitor.record_start("session-2");
        timer.finish_failure();

        let metrics = monitor.get_metrics();
        assert_eq!(metrics.total_executions, 2);
        assert_eq!(metrics.successful_executions, 1);
        assert_eq!(metrics.failed_executions, 1);
        assert_eq!(metrics.success_rate, 0.5);
    }

    #[test]
    fn test_tool_metrics() {
        let monitor = AgentPerformanceMonitor::with_defaults();

        monitor.record_tool_call("test_tool", 100, true);
        monitor.record_tool_call("test_tool", 200, true);
        monitor.record_tool_call("test_tool", 150, false);

        let metrics = monitor.get_tool_metric("test_tool").unwrap();
        assert_eq!(metrics.call_count, 3);
        assert_eq!(metrics.success_count, 2);
        assert_eq!(metrics.failure_count, 1);
        assert!((metrics.avg_duration_ms - 150.0).abs() < 1.0);
    }

    #[test]
    fn test_percentile_calculation() {
        let data = vec![10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        assert_eq!(percentile(&data, 50.0), 50.0);
        assert_eq!(percentile(&data, 90.0), 90.0);
        assert_eq!(percentile(&data, 99.0), 100.0);
    }

    #[test]
    fn test_reset() {
        let monitor = AgentPerformanceMonitor::with_defaults();

        let timer = monitor.record_start("session-1");
        timer.finish_success();

        assert_eq!(monitor.get_metrics().total_executions, 1);

        monitor.reset();
        assert_eq!(monitor.get_metrics().total_executions, 0);
    }

    #[test]
    fn test_prometheus_export() {
        let monitor = AgentPerformanceMonitor::with_defaults();

        let timer = monitor.record_start("session-1");
        timer.finish_success();

        let metrics = monitor.export_prometheus_metrics();
        assert!(metrics.contains("topems_agent_executions_total"));
        assert!(metrics.contains("topems_agent_execution_duration_ms"));
    }
}
