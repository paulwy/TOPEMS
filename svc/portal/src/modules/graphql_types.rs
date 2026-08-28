//! GraphQL 基础类型定义
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含 GraphQL 聚合层使用的基础数据类型定义。

use async_graphql::SimpleObject;

// ==================== GraphQL 类型定义 ====================

#[derive(SimpleObject)]
pub struct ServiceStatsGql {
    pub service: String,
    pub total: u64,
    pub active: u64,
    pub available: bool,
}

#[derive(SimpleObject)]
pub struct BusinessStatsGql {
    pub erp: ServiceStatsGql,
    pub crm: ServiceStatsGql,
    pub hrm: ServiceStatsGql,
    pub finance: ServiceStatsGql,
    pub mes: ServiceStatsGql,
    pub workflow: ServiceStatsGql,
}

#[derive(SimpleObject, Clone)]
pub struct UnifiedTodoGql {
    pub id: String,
    pub title: String,
    pub source: String,
    pub priority: i32,
    pub status: String,
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct ServiceHealthGql {
    pub service: String,
    pub healthy: bool,
    pub url: String,
}

#[derive(SimpleObject)]
pub struct DashboardGql {
    pub stats: BusinessStatsGql,
    pub todos: Vec<UnifiedTodoGql>,
    pub services: Vec<ServiceHealthGql>,
}

// V36.0 Phase 4: 扩展模块统计（qms/srm/lims/rd/ehs）
#[derive(SimpleObject)]
pub struct ModuleStatGql {
    pub service: String,
    pub total: u64,
    pub available: bool,
}

// V36.0 Phase 6: GraphQL Federation 联邦网关
#[derive(SimpleObject)]
pub struct FederatedServiceGql {
    pub service: String,
    pub url: String,
    pub available: bool,
    pub entities: Vec<String>,
}

#[derive(SimpleObject)]
pub struct FederatedEntityGql {
    pub service: String,
    pub entity_type: String,
    pub id: String,
    pub data: serde_json::Value,
}
