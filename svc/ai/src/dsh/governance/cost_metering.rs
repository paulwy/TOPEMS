//! AI 调用成本计量模块。
//!
//! 提供 AI 调用的成本计量、统计和限制功能，包括：
//! - Token 计数（输入/输出）
//! - 成本计算（基于模型定价）
//! - 成本统计（按用户/租户/时间）
//! - 成本限制（预算控制）

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{info, warn};

/// 模型定价配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPricing {
    /// 模型名称
    pub model_name: String,
    /// 输入 Token 单价（每 1K tokens，单位：美元）
    pub input_price_per_1k: f64,
    /// 输出 Token 单价（每 1K tokens，单位：美元）
    pub output_price_per_1k: f64,
    /// 每次调用的固定费用（单位：美元）
    pub fixed_fee_per_call: f64,
}

impl ModelPricing {
    /// 创建新的模型定价配置
    pub fn new(
        model_name: impl Into<String>,
        input_price_per_1k: f64,
        output_price_per_1k: f64,
    ) -> Self {
        Self {
            model_name: model_name.into(),
            input_price_per_1k,
            output_price_per_1k,
            fixed_fee_per_call: 0.0,
        }
    }

    /// 设置固定费用
    pub fn with_fixed_fee(mut self, fee: f64) -> Self {
        self.fixed_fee_per_call = fee;
        self
    }

    /// 计算单次调用成本
    pub fn calculate_cost(&self, input_tokens: u32, output_tokens: u32) -> f64 {
        let input_cost = (input_tokens as f64 / 1000.0) * self.input_price_per_1k;
        let output_cost = (output_tokens as f64 / 1000.0) * self.output_price_per_1k;
        input_cost + output_cost + self.fixed_fee_per_call
    }
}

/// 默认模型定价配置
pub fn default_model_pricing() -> HashMap<String, ModelPricing> {
    let mut pricing = HashMap::new();

    // DeepSeek 模型
    pricing.insert(
        "deepseek-chat".to_string(),
        ModelPricing::new("deepseek-chat", 0.0014, 0.0028),
    );
    pricing.insert(
        "deepseek-coder".to_string(),
        ModelPricing::new("deepseek-coder", 0.0014, 0.0028),
    );

    // Ollama 本地模型（免费）
    pricing.insert(
        "llama3".to_string(),
        ModelPricing::new("llama3", 0.0, 0.0),
    );
    pricing.insert(
        "qwen2".to_string(),
        ModelPricing::new("qwen2", 0.0, 0.0),
    );

    // Mock 模型（测试用）
    pricing.insert(
        "mock-model".to_string(),
        ModelPricing::new("mock-model", 0.001, 0.002),
    );

    pricing
}

/// AI 调用记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiCallRecord {
    /// 调用 ID
    pub call_id: String,
    /// 用户 ID
    pub user_id: String,
    /// 租户 ID
    pub tenant_id: String,
    /// 模型名称
    pub model_name: String,
    /// 输入 Token 数
    pub input_tokens: u32,
    /// 输出 Token 数
    pub output_tokens: u32,
    /// 调用成本（美元）
    pub cost: f64,
    /// 调用时间戳
    pub timestamp: String,
    /// 调用持续时间（毫秒）
    pub duration_ms: u64,
    /// 调用状态（success/error）
    pub status: String,
    /// 错误信息（如果有）
    pub error_message: Option<String>,
}

impl AiCallRecord {
    /// 创建新的调用记录
    pub fn new(
        user_id: impl Into<String>,
        tenant_id: impl Into<String>,
        model_name: impl Into<String>,
        input_tokens: u32,
        output_tokens: u32,
        cost: f64,
        duration_ms: u64,
    ) -> Self {
        Self {
            call_id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.into(),
            tenant_id: tenant_id.into(),
            model_name: model_name.into(),
            input_tokens,
            output_tokens,
            cost,
            timestamp: chrono::Utc::now().to_rfc3339(),
            duration_ms,
            status: "success".to_string(),
            error_message: None,
        }
    }

    /// 标记为失败
    pub fn with_error(mut self, error: impl Into<String>) -> Self {
        self.status = "error".to_string();
        self.error_message = Some(error.into());
        self
    }
}

/// 成本统计
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CostStatistics {
    /// 总调用次数
    pub total_calls: u64,
    /// 成功调用次数
    pub successful_calls: u64,
    /// 失败调用次数
    pub failed_calls: u64,
    /// 总输入 Token 数
    pub total_input_tokens: u64,
    /// 总输出 Token 数
    pub total_output_tokens: u64,
    /// 总成本（美元）
    pub total_cost: f64,
    /// 平均每次调用成本（美元）
    pub average_cost_per_call: f64,
    /// 平均响应时间（毫秒）
    pub average_duration_ms: f64,
}

impl CostStatistics {
    /// 计算平均值
    pub fn calculate_averages(&mut self) {
        if self.total_calls > 0 {
            self.average_cost_per_call = self.total_cost / self.total_calls as f64;
        }
    }
}

/// 用户预算配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserBudget {
    /// 用户 ID
    pub user_id: String,
    /// 每日预算（美元）
    pub daily_budget: f64,
    /// 每月预算（美元）
    pub monthly_budget: f64,
    /// 已使用的每日成本（美元）
    pub daily_used: f64,
    /// 已使用的每月成本（美元）
    pub monthly_used: f64,
    /// 最后重置日期
    pub last_daily_reset: String,
    /// 最后重置月份
    pub last_monthly_reset: String,
}

impl UserBudget {
    /// 创建新的用户预算
    pub fn new(user_id: impl Into<String>, daily_budget: f64, monthly_budget: f64) -> Self {
        let now = chrono::Utc::now();
        Self {
            user_id: user_id.into(),
            daily_budget,
            monthly_budget,
            daily_used: 0.0,
            monthly_used: 0.0,
            last_daily_reset: now.format("%Y-%m-%d").to_string(),
            last_monthly_reset: now.format("%Y-%m").to_string(),
        }
    }

    /// 检查是否超出预算
    pub fn check_budget(&self, estimated_cost: f64) -> BudgetCheckResult {
        if self.daily_used + estimated_cost > self.daily_budget {
            return BudgetCheckResult::DailyExceeded {
                daily_used: self.daily_used,
                daily_budget: self.daily_budget,
                estimated_cost,
            };
        }
        if self.monthly_used + estimated_cost > self.monthly_budget {
            return BudgetCheckResult::MonthlyExceeded {
                monthly_used: self.monthly_used,
                monthly_budget: self.monthly_budget,
                estimated_cost,
            };
        }
        BudgetCheckResult::Ok
    }

    /// 记录成本
    pub fn record_cost(&mut self, cost: f64) {
        self.daily_used += cost;
        self.monthly_used += cost;
    }

    /// 重置每日预算（如果需要）
    pub fn reset_daily_if_needed(&mut self) {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        if self.last_daily_reset != today {
            self.daily_used = 0.0;
            self.last_daily_reset = today;
        }
    }

    /// 重置每月预算（如果需要）
    pub fn reset_monthly_if_needed(&mut self) {
        let this_month = chrono::Utc::now().format("%Y-%m").to_string();
        if self.last_monthly_reset != this_month {
            self.monthly_used = 0.0;
            self.last_monthly_reset = this_month;
        }
    }
}

/// 预算检查结果
#[derive(Debug, Clone)]
pub enum BudgetCheckResult {
    /// 预算充足
    Ok,
    /// 超出每日预算
    DailyExceeded {
        daily_used: f64,
        daily_budget: f64,
        estimated_cost: f64,
    },
    /// 超出每月预算
    MonthlyExceeded {
        monthly_used: f64,
        monthly_budget: f64,
        estimated_cost: f64,
    },
}

impl BudgetCheckResult {
    /// 是否通过
    pub fn is_ok(&self) -> bool {
        matches!(self, BudgetCheckResult::Ok)
    }

    /// 获取错误信息
    pub fn error_message(&self) -> Option<String> {
        match self {
            BudgetCheckResult::Ok => None,
            BudgetCheckResult::DailyExceeded {
                daily_used,
                daily_budget,
                estimated_cost,
            } => Some(format!(
                "Daily budget exceeded: used ${:.4}, budget ${:.4}, estimated ${:.4}",
                daily_used, daily_budget, estimated_cost
            )),
            BudgetCheckResult::MonthlyExceeded {
                monthly_used,
                monthly_budget,
                estimated_cost,
            } => Some(format!(
                "Monthly budget exceeded: used ${:.4}, budget ${:.4}, estimated ${:.4}",
                monthly_used, monthly_budget, estimated_cost
            )),
        }
    }
}

/// 成本计量器
///
/// 提供 AI 调用的成本计量、统计和限制功能。
#[derive(Clone)]
pub struct CostMeter {
    /// 模型定价配置
    model_pricing: Arc<RwLock<HashMap<String, ModelPricing>>>,
    /// 调用记录（内存存储，生产环境应使用数据库）
    call_records: Arc<RwLock<Vec<AiCallRecord>>>,
    /// 用户预算配置
    user_budgets: Arc<RwLock<HashMap<String, UserBudget>>>,
    /// 最大记录数
    max_records: usize,
}

impl Default for CostMeter {
    fn default() -> Self {
        Self::new()
    }
}

impl CostMeter {
    /// 创建新的成本计量器
    pub fn new() -> Self {
        Self {
            model_pricing: Arc::new(RwLock::new(default_model_pricing())),
            call_records: Arc::new(RwLock::new(Vec::new())),
            user_budgets: Arc::new(RwLock::new(HashMap::new())),
            max_records: 10000,
        }
    }

    /// 注册模型定价
    pub async fn register_model_pricing(&self, pricing: ModelPricing) {
        let mut model_pricing = self.model_pricing.write().await;
        model_pricing.insert(pricing.model_name.clone(), pricing);
    }

    /// 获取模型定价
    pub async fn get_model_pricing(&self, model_name: &str) -> Option<ModelPricing> {
        let model_pricing = self.model_pricing.read().await;
        model_pricing.get(model_name).cloned()
    }

    /// 估算调用成本
    pub async fn estimate_cost(
        &self,
        model_name: &str,
        input_tokens: u32,
        output_tokens: u32,
    ) -> f64 {
        let model_pricing = self.model_pricing.read().await;
        if let Some(pricing) = model_pricing.get(model_name) {
            pricing.calculate_cost(input_tokens, output_tokens)
        } else {
            // 未知模型，使用默认定价
            warn!(model = model_name, "Unknown model pricing, using default");
            0.0
        }
    }

    /// 记录 AI 调用
    pub async fn record_call(&self, record: AiCallRecord) {
        let mut call_records = self.call_records.write().await;

        // 如果超过最大记录数，删除最旧的记录
        if call_records.len() >= self.max_records {
            let remove_count = self.max_records / 10;
            call_records.drain(0..remove_count);
        }

        call_records.push(record);
    }

    /// 设置用户预算
    pub async fn set_user_budget(&self, user_id: &str, daily_budget: f64, monthly_budget: f64) {
        let mut user_budgets = self.user_budgets.write().await;
        user_budgets.insert(
            user_id.to_string(),
            UserBudget::new(user_id, daily_budget, monthly_budget),
        );
        info!(user_id = user_id, "User budget set");
    }

    /// 检查用户预算
    pub async fn check_user_budget(&self, user_id: &str, estimated_cost: f64) -> BudgetCheckResult {
        let mut user_budgets = self.user_budgets.write().await;

        // 如果没有设置预算，默认允许
        let Some(budget) = user_budgets.get_mut(user_id) else {
            return BudgetCheckResult::Ok;
        };

        // 重置预算（如果需要）
        budget.reset_daily_if_needed();
        budget.reset_monthly_if_needed();

        // 检查预算
        budget.check_budget(estimated_cost)
    }

    /// 记录用户成本
    pub async fn record_user_cost(&self, user_id: &str, cost: f64) {
        let mut user_budgets = self.user_budgets.write().await;
        if let Some(budget) = user_budgets.get_mut(user_id) {
            budget.record_cost(cost);
        }
    }

    /// 获取用户预算状态
    pub async fn get_user_budget_status(&self, user_id: &str) -> Option<UserBudget> {
        let user_budgets = self.user_budgets.read().await;
        user_budgets.get(user_id).cloned()
    }

    /// 获取成本统计（全局）
    pub async fn get_global_statistics(&self) -> CostStatistics {
        let call_records = self.call_records.read().await;
        self.calculate_statistics(&call_records)
    }

    /// 获取用户成本统计
    pub async fn get_user_statistics(&self, user_id: &str) -> CostStatistics {
        let call_records = self.call_records.read().await;
        let user_records: Vec<AiCallRecord> =
            call_records.iter().filter(|r| r.user_id == user_id).cloned().collect();
        self.calculate_statistics(&user_records)
    }

    /// 获取租户成本统计
    pub async fn get_tenant_statistics(&self, tenant_id: &str) -> CostStatistics {
        let call_records = self.call_records.read().await;
        let tenant_records: Vec<AiCallRecord> =
            call_records.iter().filter(|r| r.tenant_id == tenant_id).cloned().collect();
        self.calculate_statistics(&tenant_records)
    }

    /// 获取模型成本统计
    pub async fn get_model_statistics(&self, model_name: &str) -> CostStatistics {
        let call_records = self.call_records.read().await;
        let model_records: Vec<AiCallRecord> =
            call_records.iter().filter(|r| r.model_name == model_name).cloned().collect();
        self.calculate_statistics(&model_records)
    }

    /// 计算统计数据
    fn calculate_statistics(&self, records: &[AiCallRecord]) -> CostStatistics {
        let mut stats = CostStatistics::default();

        for record in records {
            stats.total_calls += 1;
            if record.status == "success" {
                stats.successful_calls += 1;
            } else {
                stats.failed_calls += 1;
            }
            stats.total_input_tokens += record.input_tokens as u64;
            stats.total_output_tokens += record.output_tokens as u64;
            stats.total_cost += record.cost;
            stats.average_duration_ms += record.duration_ms as f64;
        }

        stats.calculate_averages();
        if stats.total_calls > 0 {
            stats.average_duration_ms /= stats.total_calls as f64;
        }

        stats
    }

    /// 获取最近的调用记录
    pub async fn get_recent_calls(&self, limit: usize) -> Vec<AiCallRecord> {
        let call_records = self.call_records.read().await;
        let mut records: Vec<AiCallRecord> = call_records.clone();
        records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        records.truncate(limit);
        records
    }

    /// 估算 Token 数（简单估算）
    pub fn estimate_tokens(text: &str) -> u32 {
        // 简单估算：英文约 4 字符/token，中文约 1.5 字符/token
        let char_count = text.chars().count();
        let ascii_count = text.chars().filter(|c| c.is_ascii()).count();
        let non_ascii_count = char_count - ascii_count;

        let estimated = (ascii_count as f64 / 4.0) + (non_ascii_count as f64 / 1.5);
        estimated.max(1.0) as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_pricing_calculate_cost() {
        let pricing = ModelPricing::new("test-model", 0.001, 0.002);
        let cost = pricing.calculate_cost(1000, 500);
        assert!((cost - 0.002).abs() < 0.0001); // 0.001 + 0.001 = 0.002
    }

    #[test]
    fn test_model_pricing_with_fixed_fee() {
        let pricing = ModelPricing::new("test-model", 0.001, 0.002).with_fixed_fee(0.01);
        let cost = pricing.calculate_cost(0, 0);
        assert!((cost - 0.01).abs() < 0.0001);
    }

    #[tokio::test]
    async fn test_cost_meter_estimate_cost() {
        let meter = CostMeter::new();
        let cost = meter.estimate_cost("deepseek-chat", 1000, 500).await;
        assert!(cost > 0.0);
    }

    #[tokio::test]
    async fn test_cost_meter_unknown_model() {
        let meter = CostMeter::new();
        let cost = meter.estimate_cost("unknown-model", 1000, 500).await;
        assert_eq!(cost, 0.0);
    }

    #[tokio::test]
    async fn test_cost_meter_record_and_statistics() {
        let meter = CostMeter::new();
        let record = AiCallRecord::new("user1", "tenant1", "deepseek-chat", 1000, 500, 0.002, 100);
        meter.record_call(record).await;

        let stats = meter.get_global_statistics().await;
        assert_eq!(stats.total_calls, 1);
        assert_eq!(stats.successful_calls, 1);
        assert_eq!(stats.total_input_tokens, 1000);
        assert_eq!(stats.total_output_tokens, 500);
        assert!((stats.total_cost - 0.002).abs() < 0.0001);
    }

    #[tokio::test]
    async fn test_user_budget_check() {
        let meter = CostMeter::new();
        meter.set_user_budget("user1", 1.0, 30.0).await;

        // 小额调用应该通过
        let result = meter.check_user_budget("user1", 0.1).await;
        assert!(result.is_ok());

        // 记录成本
        meter.record_user_cost("user1", 0.9).await;

        // 超出每日预算
        let result = meter.check_user_budget("user1", 0.2).await;
        assert!(!result.is_ok());
        assert!(result.error_message().is_some());
    }

    #[tokio::test]
    async fn test_user_budget_not_set() {
        let meter = CostMeter::new();
        // 没有设置预算的用户应该允许
        let result = meter.check_user_budget("unknown-user", 100.0).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_estimate_tokens() {
        let english = "Hello, world!";
        let chinese = "你好，世界！";

        let english_tokens = CostMeter::estimate_tokens(english);
        let chinese_tokens = CostMeter::estimate_tokens(chinese);

        assert!(english_tokens > 0);
        assert!(chinese_tokens > 0);
    }

    #[test]
    fn test_ai_call_record_with_error() {
        let record = AiCallRecord::new("user1", "tenant1", "test-model", 100, 50, 0.001, 100)
            .with_error("Test error");
        assert_eq!(record.status, "error");
        assert_eq!(record.error_message, Some("Test error".to_string()));
    }
}
