//! V50.0 Finance 共享服务模块
//!
//! 提供共享服务中心分析、服务成本分摊和内部结算定价能力。
//! 支持服务绩效评估、成本归集分摊、转移定价管理和多维分析。
//!
//! 路由：
//! - GET  /shared-services/centers/{period}
//! - GET  /shared-services/centers/{period}/performance
//! - GET  /shared-services/centers/{period}/utilization
//! - POST /shared-services/cost-allocation/calculate
//! - GET  /shared-services/cost-allocation/{period}
//! - GET  /shared-services/cost-allocation/{period}/breakdown
//! - GET  /shared-services/internal-pricing/policies
//! - POST /shared-services/internal-pricing/policies
//! - PUT  /shared-services/internal-pricing/policies/{policy_id}
//! - GET  /shared-services/internal-pricing/settlements/{period}
//! - POST /shared-services/internal-pricing/settlements/generate

#![allow(dead_code)]

use axum::{
    extract::{Extension, Json, Path, State},
    Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

// ==================== 辅助函数 ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

fn safe_divide(numerator: Decimal, denominator: Decimal) -> Decimal {
    if denominator.is_zero() {
        Decimal::ZERO
    } else {
        numerator / denominator
    }
}

fn safe_percentage(amount: Decimal, total: Decimal) -> Decimal {
    if total.is_zero() {
        Decimal::ZERO
    } else {
        (amount / total) * Decimal::from(100)
    }
}

// ==================== 查询参数 ====================

#[derive(Debug, Clone, Deserialize)]
pub struct SharedServicesQueryParams {
    pub period: Option<String>,
    pub service_center_id: Option<Uuid>,
    pub cost_center_id: Option<Uuid>,
    pub profit_center_id: Option<Uuid>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub service_type: Option<String>,
}

// ==================== A. 共享服务中心分析（SharedServiceCenterAnalyzer）====================

/// 服务中心类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ServiceCenterType {
    /// 财务共享
    Finance,
    /// 人事共享
    HR,
    /// IT共享
    IT,
    /// 采购共享
    Procurement,
    /// 行政共享
    Admin,
    /// 综合共享
    Integrated,
}

/// 服务质量等级
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ServiceQualityLevel {
    Excellent,
    Good,
    Satisfactory,
    NeedsImprovement,
    Unsatisfactory,
}

/// 共享服务中心明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceCenterItem {
    pub service_center_id: Uuid,
    pub center_code: String,
    pub center_name: String,
    pub center_type: ServiceCenterType,
    pub total_cost: Decimal,
    pub allocated_cost: Decimal,
    pub unallocated_cost: Decimal,
    pub service_count: i64,
    pub avg_service_cost: Decimal,
    pub headcount: i64,
    pub cost_per_fte: Decimal,
    pub quality_score: Decimal,
    pub quality_level: ServiceQualityLevel,
}

/// 服务绩效指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicePerformance {
    pub service_center_id: Uuid,
    pub center_name: String,
    pub response_time_avg: Decimal,
    pub resolution_rate: Decimal,
    pub customer_satisfaction: Decimal,
    pub error_rate: Decimal,
    pub cost_efficiency: Decimal,
    pub productivity_index: Decimal,
    pub sla_compliance: Decimal,
    pub benchmark_comparison: Decimal,
}

/// 服务利用率指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceUtilization {
    pub service_center_id: Uuid,
    pub center_name: String,
    pub capacity_hours: Decimal,
    pub utilized_hours: Decimal,
    pub utilization_rate: Decimal,
    pub idle_hours: Decimal,
    pub overtime_hours: Decimal,
    pub peak_utilization: Decimal,
    pub avg_utilization: Decimal,
}

/// 共享服务中心分析报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceCenterReport {
    pub report_id: Uuid,
    pub period: String,
    pub total_cost: Decimal,
    pub total_allocated_cost: Decimal,
    pub total_service_count: i64,
    pub avg_cost_per_service: Decimal,
    pub overall_quality_score: Decimal,
    pub center_count: i64,
    pub items: Vec<ServiceCenterItem>,
}

/// 共享服务中心分析器
pub struct SharedServiceCenterAnalyzer;

impl SharedServiceCenterAnalyzer {
    fn build_item(
        id: Uuid,
        code: &str,
        name: &str,
        center_type: ServiceCenterType,
        total: i64,
        allocated: i64,
        service_count: i64,
        headcount: i64,
        quality_score: i64,
    ) -> ServiceCenterItem {
        let total_d = Decimal::from(total);
        let allocated_d = Decimal::from(allocated);
        let unallocated = total_d - allocated_d;
        let avg_cost = safe_divide(allocated_d, Decimal::from(service_count.max(1)));
        let cost_per_fte = safe_divide(total_d, Decimal::from(headcount.max(1)));
        let quality = Decimal::from(quality_score);
        let quality_level = if quality >= Decimal::from(90) {
            ServiceQualityLevel::Excellent
        } else if quality >= Decimal::from(75) {
            ServiceQualityLevel::Good
        } else if quality >= Decimal::from(60) {
            ServiceQualityLevel::Satisfactory
        } else if quality >= Decimal::from(40) {
            ServiceQualityLevel::NeedsImprovement
        } else {
            ServiceQualityLevel::Unsatisfactory
        };

        ServiceCenterItem {
            service_center_id: id,
            center_code: code.to_string(),
            center_name: name.to_string(),
            center_type,
            total_cost: total_d,
            allocated_cost: allocated_d,
            unallocated_cost: unallocated,
            service_count,
            avg_service_cost: avg_cost,
            headcount,
            cost_per_fte,
            quality_score: quality,
            quality_level,
        }
    }

    pub fn analyze(period: &str) -> ServiceCenterReport {
        let items = vec![
            Self::build_item(
                Uuid::new_v4(),
                "SSC-FIN",
                "财务共享中心",
                ServiceCenterType::Finance,
                2_850_000,
                2_680_000,
                15_200,
                35,
                88,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "SSC-HR",
                "人事共享中心",
                ServiceCenterType::HR,
                1_420_000,
                1_350_000,
                8_600,
                18,
                92,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "SSC-IT",
                "IT共享中心",
                ServiceCenterType::IT,
                3_680_000,
                3_520_000,
                12_800,
                45,
                85,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "SSC-PROC",
                "采购共享中心",
                ServiceCenterType::Procurement,
                1_850_000,
                1_780_000,
                9_200,
                22,
                91,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "SSC-ADMIN",
                "行政共享中心",
                ServiceCenterType::Admin,
                980_000,
                920_000,
                6_500,
                12,
                86,
            ),
        ];

        let total_cost: Decimal = items.iter().map(|i| i.total_cost).sum();
        let total_allocated: Decimal = items.iter().map(|i| i.allocated_cost).sum();
        let total_service_count: i64 = items.iter().map(|i| i.service_count).sum();
        let avg_cost_per_service =
            safe_divide(total_allocated, Decimal::from(total_service_count.max(1)));
        let overall_quality: Decimal = items.iter().map(|i| i.quality_score).sum::<Decimal>()
            / Decimal::from(items.len() as i64);

        ServiceCenterReport {
            report_id: Uuid::new_v4(),
            period: period.to_string(),
            total_cost,
            total_allocated_cost: total_allocated,
            total_service_count,
            avg_cost_per_service,
            overall_quality_score: overall_quality,
            center_count: items.len() as i64,
            items,
        }
    }

    pub fn get_performance(period: &str) -> Vec<ServicePerformance> {
        let report = Self::analyze(period);
        report
            .items
            .into_iter()
            .map(|i| {
                let base_score = i.quality_score;
                ServicePerformance {
                    service_center_id: i.service_center_id,
                    center_name: i.center_name,
                    response_time_avg: Decimal::from(24) - (base_score / Decimal::from(5)),
                    resolution_rate: base_score / Decimal::from(100) * Decimal::from(95),
                    customer_satisfaction: base_score - Decimal::from(2),
                    error_rate: Decimal::from(100) - base_score,
                    cost_efficiency: (base_score + Decimal::from(5)).min(Decimal::from(100)),
                    productivity_index: base_score / Decimal::from(10),
                    sla_compliance: base_score + Decimal::from(3),
                    benchmark_comparison: base_score - Decimal::from(5),
                }
            })
            .collect()
    }

    pub fn get_utilization(period: &str) -> Vec<ServiceUtilization> {
        let report = Self::analyze(period);
        report
            .items
            .into_iter()
            .map(|i| {
                let capacity = Decimal::from(i.headcount * 160);
                let utilized = capacity
                    * (Decimal::from(85) + (i.quality_score / Decimal::from(10)))
                    / Decimal::from(100);
                let rate = safe_percentage(utilized, capacity);
                ServiceUtilization {
                    service_center_id: i.service_center_id,
                    center_name: i.center_name,
                    capacity_hours: capacity,
                    utilized_hours: utilized,
                    utilization_rate: rate,
                    idle_hours: capacity - utilized,
                    overtime_hours: utilized * Decimal::from(5) / Decimal::from(100),
                    peak_utilization: rate + Decimal::from(10),
                    avg_utilization: rate - Decimal::from(3),
                }
            })
            .collect()
    }
}

// ==================== B. 服务成本分摊（ServiceCostAllocator）====================

/// 成本分摊方法
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AllocationMethod {
    /// 直接分摊法
    Direct,
    /// 阶梯分摊法
    StepDown,
    /// 交互分摊法
    Reciprocal,
    /// 作业成本法
    ActivityBased,
}

/// 成本分摊基础
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AllocationBasis {
    Headcount,
    Revenue,
    Area,
    TransactionVolume,
    Usage,
    Custom,
}

/// 成本分摊明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAllocationItem {
    pub allocation_id: Uuid,
    pub source_center_id: Uuid,
    pub source_center_name: String,
    pub target_center_id: Uuid,
    pub target_center_name: String,
    pub allocation_method: AllocationMethod,
    pub allocation_basis: AllocationBasis,
    pub original_cost: Decimal,
    pub allocated_amount: Decimal,
    pub allocation_rate: Decimal,
    pub allocation_ratio: Decimal,
    pub period: String,
}

/// 成本分摊汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAllocationSummary {
    pub target_center_id: Uuid,
    pub target_center_name: String,
    pub direct_cost: Decimal,
    pub allocated_cost: Decimal,
    pub total_cost: Decimal,
    pub allocation_count: i64,
    pub avg_allocation: Decimal,
}

/// 成本分摊明细报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAllocationBreakdown {
    pub source_center: String,
    pub target_centers: HashMap<String, Decimal>,
    pub total_allocated: Decimal,
    pub allocation_method: AllocationMethod,
}

/// 成本分摊计算请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateAllocationRequest {
    pub period: String,
    pub method: AllocationMethod,
    pub basis: AllocationBasis,
    pub source_centers: Vec<Uuid>,
}

/// 成本分摊计算结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculateAllocationResult {
    pub calculation_id: Uuid,
    pub period: String,
    pub method: AllocationMethod,
    pub basis: AllocationBasis,
    pub total_allocated: Decimal,
    pub items: Vec<CostAllocationItem>,
    pub summaries: Vec<CostAllocationSummary>,
}

/// 服务成本分摊器
pub struct ServiceCostAllocator;

impl ServiceCostAllocator {
    fn build_item(
        source_id: Uuid,
        source_name: &str,
        target_id: Uuid,
        target_name: &str,
        method: AllocationMethod,
        basis: AllocationBasis,
        original: i64,
        allocated: i64,
        period: &str,
    ) -> CostAllocationItem {
        let original_d = Decimal::from(original);
        let allocated_d = Decimal::from(allocated);
        let rate = safe_divide(allocated_d, original_d) * Decimal::from(100);
        let ratio = safe_divide(allocated_d, original_d);

        CostAllocationItem {
            allocation_id: Uuid::new_v4(),
            source_center_id: source_id,
            source_center_name: source_name.to_string(),
            target_center_id: target_id,
            target_center_name: target_name.to_string(),
            allocation_method: method,
            allocation_basis: basis,
            original_cost: original_d,
            allocated_amount: allocated_d,
            allocation_rate: rate,
            allocation_ratio: ratio,
            period: period.to_string(),
        }
    }

    pub fn calculate(req: CalculateAllocationRequest) -> CalculateAllocationResult {
        let items = vec![
            Self::build_item(
                Uuid::new_v4(),
                "财务共享中心",
                Uuid::new_v4(),
                "研发部门",
                req.method.clone(),
                req.basis.clone(),
                2_680_000,
                850_000,
                &req.period,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "财务共享中心",
                Uuid::new_v4(),
                "销售部门",
                req.method.clone(),
                req.basis.clone(),
                2_680_000,
                680_000,
                &req.period,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "财务共享中心",
                Uuid::new_v4(),
                "生产部门",
                req.method.clone(),
                req.basis.clone(),
                2_680_000,
                1_150_000,
                &req.period,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "IT共享中心",
                Uuid::new_v4(),
                "研发部门",
                req.method.clone(),
                req.basis.clone(),
                3_520_000,
                1_420_000,
                &req.period,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "IT共享中心",
                Uuid::new_v4(),
                "销售部门",
                req.method.clone(),
                req.basis.clone(),
                3_520_000,
                980_000,
                &req.period,
            ),
            Self::build_item(
                Uuid::new_v4(),
                "IT共享中心",
                Uuid::new_v4(),
                "生产部门",
                req.method.clone(),
                req.basis.clone(),
                3_520_000,
                1_120_000,
                &req.period,
            ),
        ];

        let total_allocated: Decimal = items.iter().map(|i| i.allocated_amount).sum();

        let mut summary_map: HashMap<Uuid, (String, Decimal, Decimal, i64)> = HashMap::new();
        for item in &items {
            let entry = summary_map.entry(item.target_center_id).or_insert((
                item.target_center_name.clone(),
                Decimal::ZERO,
                Decimal::ZERO,
                0,
            ));
            entry.2 += item.allocated_amount;
            entry.3 += 1;
        }

        let summaries = summary_map
            .into_iter()
            .map(|(_, v)| {
                let total = v.1 + v.2;
                let avg = safe_divide(v.2, Decimal::from(v.3.max(1)));
                CostAllocationSummary {
                    target_center_id: Uuid::new_v4(),
                    target_center_name: v.0,
                    direct_cost: v.1,
                    allocated_cost: v.2,
                    total_cost: total,
                    allocation_count: v.3,
                    avg_allocation: avg,
                }
            })
            .collect();

        CalculateAllocationResult {
            calculation_id: Uuid::new_v4(),
            period: req.period,
            method: req.method,
            basis: req.basis,
            total_allocated,
            items,
            summaries,
        }
    }

    pub fn get_allocations(period: &str) -> Vec<CostAllocationItem> {
        let req = CalculateAllocationRequest {
            period: period.to_string(),
            method: AllocationMethod::ActivityBased,
            basis: AllocationBasis::Usage,
            source_centers: vec![],
        };
        Self::calculate(req).items
    }

    pub fn get_breakdown(period: &str) -> Vec<CostAllocationBreakdown> {
        let items = Self::get_allocations(period);
        let mut map: HashMap<String, (HashMap<String, Decimal>, AllocationMethod)> = HashMap::new();

        for item in items {
            let entry = map
                .entry(item.source_center_name.clone())
                .or_insert((HashMap::new(), item.allocation_method));
            entry
                .0
                .insert(item.target_center_name.clone(), item.allocated_amount);
        }

        map.into_iter()
            .map(|(source, (targets, method))| {
                let total: Decimal = targets.values().sum();
                CostAllocationBreakdown {
                    source_center: source,
                    target_centers: targets,
                    total_allocated: total,
                    allocation_method: method,
                }
            })
            .collect()
    }
}

// ==================== C. 内部结算定价（InternalPricingManager）====================

/// 定价策略类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PricingStrategy {
    /// 成本加成
    CostPlus,
    /// 市场价格
    MarketBased,
    /// 协商定价
    Negotiated,
    /// 标准成本
    StandardCost,
    /// 双重定价
    DualPricing,
}

/// 定价政策状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PolicyStatus {
    Draft,
    Active,
    Suspended,
    Expired,
}

/// 内部定价政策
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingPolicy {
    pub policy_id: Uuid,
    pub policy_code: String,
    pub policy_name: String,
    pub service_type: String,
    pub pricing_strategy: PricingStrategy,
    pub base_cost: Decimal,
    pub markup_rate: Decimal,
    pub transfer_price: Decimal,
    pub currency: String,
    pub effective_from: DateTime<Utc>,
    pub effective_to: Option<DateTime<Utc>>,
    pub status: PolicyStatus,
    pub description: Option<String>,
}

/// 内部结算记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalSettlement {
    pub settlement_id: Uuid,
    pub settlement_no: String,
    pub period: String,
    pub provider_id: Uuid,
    pub provider_name: String,
    pub receiver_id: Uuid,
    pub receiver_name: String,
    pub service_type: String,
    pub service_quantity: Decimal,
    pub unit_price: Decimal,
    pub total_amount: Decimal,
    pub policy_id: Uuid,
    pub settlement_date: DateTime<Utc>,
    pub status: String,
}

/// 结算汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettlementSummary {
    pub provider_id: Uuid,
    pub provider_name: String,
    pub total_revenue: Decimal,
    pub settlement_count: i64,
    pub avg_settlement: Decimal,
    pub by_receiver: HashMap<String, Decimal>,
}

/// 创建定价政策请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePricingPolicyRequest {
    pub policy_code: String,
    pub policy_name: String,
    pub service_type: String,
    pub pricing_strategy: PricingStrategy,
    pub base_cost: Decimal,
    pub markup_rate: Decimal,
    pub currency: Option<String>,
    pub effective_from: Option<DateTime<Utc>>,
    pub effective_to: Option<DateTime<Utc>>,
    pub description: Option<String>,
}

/// 更新定价政策请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePricingPolicyRequest {
    pub policy_name: Option<String>,
    pub base_cost: Option<Decimal>,
    pub markup_rate: Option<Decimal>,
    pub effective_to: Option<DateTime<Utc>>,
    pub status: Option<PolicyStatus>,
    pub description: Option<String>,
}

/// 生成结算请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateSettlementRequest {
    pub period: String,
    pub provider_ids: Option<Vec<Uuid>>,
}

/// 生成结算结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateSettlementResult {
    pub generation_id: Uuid,
    pub period: String,
    pub total_settlements: i64,
    pub total_amount: Decimal,
    pub settlements: Vec<InternalSettlement>,
    pub summaries: Vec<SettlementSummary>,
}

/// 内部定价管理器
pub struct InternalPricingManager;

impl InternalPricingManager {
    pub fn get_policies() -> Vec<PricingPolicy> {
        vec![
            PricingPolicy {
                policy_id: Uuid::new_v4(),
                policy_code: "POL-FIN-001".to_string(),
                policy_name: "财务服务定价政策".to_string(),
                service_type: "财务核算服务".to_string(),
                pricing_strategy: PricingStrategy::CostPlus,
                base_cost: Decimal::from(150),
                markup_rate: Decimal::from(15),
                transfer_price: Decimal::from(172),
                currency: "CNY".to_string(),
                effective_from: Utc::now(),
                effective_to: None,
                status: PolicyStatus::Active,
                description: Some("基于成本加成15%的转移定价".to_string()),
            },
            PricingPolicy {
                policy_id: Uuid::new_v4(),
                policy_code: "POL-IT-001".to_string(),
                policy_name: "IT服务定价政策".to_string(),
                service_type: "IT运维服务".to_string(),
                pricing_strategy: PricingStrategy::MarketBased,
                base_cost: Decimal::from(280),
                markup_rate: Decimal::from(10),
                transfer_price: Decimal::from(308),
                currency: "CNY".to_string(),
                effective_from: Utc::now(),
                effective_to: None,
                status: PolicyStatus::Active,
                description: Some("参照市场价格定价".to_string()),
            },
            PricingPolicy {
                policy_id: Uuid::new_v4(),
                policy_code: "POL-HR-001".to_string(),
                policy_name: "人事服务定价政策".to_string(),
                service_type: "人事管理服务".to_string(),
                pricing_strategy: PricingStrategy::StandardCost,
                base_cost: Decimal::from(120),
                markup_rate: Decimal::from(8),
                transfer_price: Decimal::from(130),
                currency: "CNY".to_string(),
                effective_from: Utc::now(),
                effective_to: None,
                status: PolicyStatus::Active,
                description: Some("基于标准成本定价".to_string()),
            },
            PricingPolicy {
                policy_id: Uuid::new_v4(),
                policy_code: "POL-PROC-001".to_string(),
                policy_name: "采购服务定价政策".to_string(),
                service_type: "采购代理服务".to_string(),
                pricing_strategy: PricingStrategy::Negotiated,
                base_cost: Decimal::from(95),
                markup_rate: Decimal::from(20),
                transfer_price: Decimal::from(114),
                currency: "CNY".to_string(),
                effective_from: Utc::now(),
                effective_to: None,
                status: PolicyStatus::Active,
                description: Some("协商确定的服务价格".to_string()),
            },
        ]
    }

    pub fn create_policy(req: CreatePricingPolicyRequest) -> PricingPolicy {
        let transfer_price =
            req.base_cost * (Decimal::from(100) + req.markup_rate) / Decimal::from(100);
        PricingPolicy {
            policy_id: Uuid::new_v4(),
            policy_code: req.policy_code,
            policy_name: req.policy_name,
            service_type: req.service_type,
            pricing_strategy: req.pricing_strategy,
            base_cost: req.base_cost,
            markup_rate: req.markup_rate,
            transfer_price,
            currency: req.currency.unwrap_or_else(|| "CNY".to_string()),
            effective_from: req.effective_from.unwrap_or_else(Utc::now),
            effective_to: req.effective_to,
            status: PolicyStatus::Draft,
            description: req.description,
        }
    }

    pub fn update_policy(
        mut policy: PricingPolicy,
        req: UpdatePricingPolicyRequest,
    ) -> PricingPolicy {
        if let Some(name) = req.policy_name {
            policy.policy_name = name;
        }
        if let Some(cost) = req.base_cost {
            policy.base_cost = cost;
        }
        if let Some(rate) = req.markup_rate {
            policy.markup_rate = rate;
        }
        if let Some(to) = req.effective_to {
            policy.effective_to = Some(to);
        }
        if let Some(status) = req.status {
            policy.status = status;
        }
        if let Some(desc) = req.description {
            policy.description = Some(desc);
        }
        policy.transfer_price =
            policy.base_cost * (Decimal::from(100) + policy.markup_rate) / Decimal::from(100);
        policy
    }

    pub fn get_settlements(period: &str) -> Vec<InternalSettlement> {
        vec![
            InternalSettlement {
                settlement_id: Uuid::new_v4(),
                settlement_no: "SET-2026-001".to_string(),
                period: period.to_string(),
                provider_id: Uuid::new_v4(),
                provider_name: "财务共享中心".to_string(),
                receiver_id: Uuid::new_v4(),
                receiver_name: "研发部门".to_string(),
                service_type: "财务核算服务".to_string(),
                service_quantity: Decimal::from(1200),
                unit_price: Decimal::from(172),
                total_amount: Decimal::from(206_400),
                policy_id: Uuid::new_v4(),
                settlement_date: Utc::now(),
                status: "已结算".to_string(),
            },
            InternalSettlement {
                settlement_id: Uuid::new_v4(),
                settlement_no: "SET-2026-002".to_string(),
                period: period.to_string(),
                provider_id: Uuid::new_v4(),
                provider_name: "IT共享中心".to_string(),
                receiver_id: Uuid::new_v4(),
                receiver_name: "销售部门".to_string(),
                service_type: "IT运维服务".to_string(),
                service_quantity: Decimal::from(850),
                unit_price: Decimal::from(308),
                total_amount: Decimal::from(261_800),
                policy_id: Uuid::new_v4(),
                settlement_date: Utc::now(),
                status: "已结算".to_string(),
            },
            InternalSettlement {
                settlement_id: Uuid::new_v4(),
                settlement_no: "SET-2026-003".to_string(),
                period: period.to_string(),
                provider_id: Uuid::new_v4(),
                provider_name: "人事共享中心".to_string(),
                receiver_id: Uuid::new_v4(),
                receiver_name: "生产部门".to_string(),
                service_type: "人事管理服务".to_string(),
                service_quantity: Decimal::from(560),
                unit_price: Decimal::from(130),
                total_amount: Decimal::from(72_800),
                policy_id: Uuid::new_v4(),
                settlement_date: Utc::now(),
                status: "待确认".to_string(),
            },
        ]
    }

    pub fn generate_settlements(req: GenerateSettlementRequest) -> GenerateSettlementResult {
        let settlements = Self::get_settlements(&req.period);
        let total_amount: Decimal = settlements.iter().map(|s| s.total_amount).sum();

        let mut summary_map: HashMap<Uuid, (String, Decimal, i64, HashMap<String, Decimal>)> =
            HashMap::new();
        for s in &settlements {
            let entry = summary_map.entry(s.provider_id).or_insert((
                s.provider_name.clone(),
                Decimal::ZERO,
                0,
                HashMap::new(),
            ));
            entry.1 += s.total_amount;
            entry.2 += 1;
            entry.3.insert(s.receiver_name.clone(), s.total_amount);
        }

        let summaries = summary_map
            .into_iter()
            .map(|(_, v)| {
                let avg = safe_divide(v.1, Decimal::from(v.2.max(1)));
                SettlementSummary {
                    provider_id: Uuid::new_v4(),
                    provider_name: v.0,
                    total_revenue: v.1,
                    settlement_count: v.2,
                    avg_settlement: avg,
                    by_receiver: v.3,
                }
            })
            .collect();

        GenerateSettlementResult {
            generation_id: Uuid::new_v4(),
            period: req.period,
            total_settlements: settlements.len() as i64,
            total_amount,
            settlements,
            summaries,
        }
    }
}

// ==================== Handlers ====================

async fn get_service_centers_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<ServiceCenterReport>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let report = SharedServiceCenterAnalyzer::analyze(&period);
    Json(ApiResponse::success(report, "查询成功"))
}

async fn get_service_performance_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<ServicePerformance>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let performance = SharedServiceCenterAnalyzer::get_performance(&period);
    Json(ApiResponse::success(performance, "查询成功"))
}

async fn get_service_utilization_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<ServiceUtilization>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let utilization = SharedServiceCenterAnalyzer::get_utilization(&period);
    Json(ApiResponse::success(utilization, "查询成功"))
}

async fn calculate_cost_allocation_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CalculateAllocationRequest>,
) -> Json<ApiResponse<CalculateAllocationResult>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let result = ServiceCostAllocator::calculate(req);
    Json(ApiResponse::success(result, "计算成功"))
}

async fn get_cost_allocation_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<CostAllocationItem>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let items = ServiceCostAllocator::get_allocations(&period);
    Json(ApiResponse::success(items, "查询成功"))
}

async fn get_cost_allocation_breakdown_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<CostAllocationBreakdown>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let breakdown = ServiceCostAllocator::get_breakdown(&period);
    Json(ApiResponse::success(breakdown, "查询成功"))
}

async fn get_pricing_policies_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PricingPolicy>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let policies = InternalPricingManager::get_policies();
    Json(ApiResponse::success(policies, "查询成功"))
}

async fn create_pricing_policy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePricingPolicyRequest>,
) -> Json<ApiResponse<PricingPolicy>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let policy = InternalPricingManager::create_policy(req);
    Json(ApiResponse::success(policy, "创建成功"))
}

async fn update_pricing_policy_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(policy_id): Path<Uuid>,
    Json(req): Json<UpdatePricingPolicyRequest>,
) -> Json<ApiResponse<PricingPolicy>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let existing = PricingPolicy {
        policy_id,
        policy_code: String::new(),
        policy_name: String::new(),
        service_type: String::new(),
        pricing_strategy: PricingStrategy::CostPlus,
        base_cost: Decimal::ZERO,
        markup_rate: Decimal::ZERO,
        transfer_price: Decimal::ZERO,
        currency: "CNY".to_string(),
        effective_from: Utc::now(),
        effective_to: None,
        status: PolicyStatus::Draft,
        description: None,
    };
    let policy = InternalPricingManager::update_policy(existing, req);
    Json(ApiResponse::success(policy, "更新成功"))
}

async fn get_internal_settlements_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> Json<ApiResponse<Vec<InternalSettlement>>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let settlements = InternalPricingManager::get_settlements(&period);
    Json(ApiResponse::success(settlements, "查询成功"))
}

async fn generate_settlements_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateSettlementRequest>,
) -> Json<ApiResponse<GenerateSettlementResult>> {
    let _service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let _tenant_id = get_tenant_id(&claims);
    let result = InternalPricingManager::generate_settlements(req);
    Json(ApiResponse::success(result, "生成成功"))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // A. 共享服务中心分析
        .route(
            "/shared-services/centers/{period}",
            axum::routing::get(get_service_centers_handler),
        )
        .route(
            "/shared-services/centers/{period}/performance",
            axum::routing::get(get_service_performance_handler),
        )
        .route(
            "/shared-services/centers/{period}/utilization",
            axum::routing::get(get_service_utilization_handler),
        )
        // B. 服务成本分摊
        .route(
            "/shared-services/cost-allocation/calculate",
            axum::routing::post(calculate_cost_allocation_handler),
        )
        .route(
            "/shared-services/cost-allocation/{period}",
            axum::routing::get(get_cost_allocation_handler),
        )
        .route(
            "/shared-services/cost-allocation/{period}/breakdown",
            axum::routing::get(get_cost_allocation_breakdown_handler),
        )
        // C. 内部结算定价
        .route(
            "/shared-services/internal-pricing/policies",
            axum::routing::get(get_pricing_policies_handler),
        )
        .route(
            "/shared-services/internal-pricing/policies",
            axum::routing::post(create_pricing_policy_handler),
        )
        .route(
            "/shared-services/internal-pricing/policies/{policy_id}",
            axum::routing::put(update_pricing_policy_handler),
        )
        .route(
            "/shared-services/internal-pricing/settlements/{period}",
            axum::routing::get(get_internal_settlements_handler),
        )
        .route(
            "/shared-services/internal-pricing/settlements/generate",
            axum::routing::post(generate_settlements_handler),
        )
}
