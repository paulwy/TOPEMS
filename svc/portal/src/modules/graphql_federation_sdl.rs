// ==================== V37.0 Phase 7: Apollo Federation v2 辅助函数 ====================
// 拆分自 graphql_schema.rs：联邦 Schema SDL 组合 + 实体解析辅助。

use crate::modules::graphql_helpers::{service_auth_get, FEDERATION_READ_PERMS};

// ==================== V37.0 Phase 7: Apollo Federation v2 辅助函数 ====================

/// 组合联邦 Schema SDL
/// 返回 Portal BFF 作为联邦网关组合后的完整 SDL，
/// 包含所有 @key 实体类型定义。
pub fn compose_federation_sdl() -> String {
    let mut sdl = String::new();
    sdl.push_str("# Federation v2 Composed Schema (Portal BFF Gateway)\n\n");

    // 联邦指令声明（Apollo Federation v2）
    sdl.push_str("schema @link(url: \"https://specs.apollo.dev/federation/v2.0\", import: [\"@key\", \"@external\", \"@extends\"])\n");
    sdl.push_str("{ query: Query mutation: Mutation subscription: Subscription }\n\n");

    // 实体类型定义（带 @key 指令）
    sdl.push_str("type CustomerEntity @key(fields: \"id\") { id: String! name: String! code: String! status: String! phone: String industry: String contact_person: String orders: [OrderEntity!]! contacts: [ContactEntity!]! }\n");
    sdl.push_str("type SupplierEntity @key(fields: \"id\") { id: String! name: String! code: String! status: String! contact_person: String phone: String address: String }\n");
    sdl.push_str("type MaterialEntity @key(fields: \"id\") { id: String! name: String! code: String! category: String! unit: String spec: String price: Float }\n");
    sdl.push_str("type EmployeeEntity @key(fields: \"id\") { id: String! name: String! department: String! position: String! email: String phone: String status: String departmentInfo: DepartmentEntity }\n");
    sdl.push_str("type VoucherEntity @key(fields: \"id\") { id: String! voucher_number: String! total_debit: Float! total_credit: Float! status: String! voucher_date: String created_by: String accountSubject: AccountSubjectEntity }\n");
    sdl.push_str("type ContactEntity @key(fields: \"id\") { id: String! name: String! customer_id: String email: String }\n");
    sdl.push_str("type OrderEntity @key(fields: \"id\") { id: String! order_number: String! customer_id: String! total_amount: Float! status: String! order_date: String }\n");
    sdl.push_str("type AccountSubjectEntity @key(fields: \"id\") { id: String! code: String! name: String! category: String! balance: Float }\n");
    sdl.push_str("type DepartmentEntity @key(fields: \"id\") { id: String! name: String! code: String! manager_id: String parent_id: String }\n\n");

    // 联邦查询类型
    sdl.push_str("type Query {\n");
    sdl.push_str("  businessStats: BusinessStats!\n");
    sdl.push_str("  unifiedTodos: [UnifiedTodo!]!\n");
    sdl.push_str("  serviceHealth: [ServiceHealth!]!\n");
    sdl.push_str("  dashboard: Dashboard!\n");
    sdl.push_str("  moduleStats: [ModuleStat!]!\n");
    sdl.push_str("  federatedServices: [FederatedService!]!\n");
    sdl.push_str(
        "  federatedEntity(service: String!, entityType: String!, id: String!): FederatedEntity!\n",
    );
    sdl.push_str("  federationSdl: String!\n");
    sdl.push_str("  federationServiceSdls: [FederationServiceSdl!]!\n");
    sdl.push_str("  federationEntities(representations: [JSON!]!): [FederationRepresentation!]!\n");
    sdl.push_str("  federationEntityList(service: String!, entityType: String!, ids: [String!]!): [FederatedEntity!]!\n");
    sdl.push_str("  federationEntityListCached(service: String!, entityType: String!, ids: [String!]!): [FederatedEntity!]!\n");
    sdl.push_str("  subscriptionCount: Int!\n");
    sdl.push_str("  customerEntity(id: String!): CustomerEntity\n");
    sdl.push_str("  employeeEntity(id: String!): EmployeeEntity\n");
    sdl.push_str("  voucherEntity(id: String!): VoucherEntity\n");
    sdl.push_str("  entityRelationshipGraph: EntityRelationshipGraph!\n");
    sdl.push_str("  federationStats: FederationStats!\n");
    sdl.push_str("  cacheStats: CacheStats!\n");
    sdl.push_str("  cacheOptimizationSuggestions: [CacheOptimizationSuggestion!]!\n");
    sdl.push_str("  prefetchRules: [QueryPrefetchRule!]!\n");
    sdl.push_str("  cacheInvalidationRules: [CacheInvalidationRule!]!\n");
    sdl.push_str("  federationV2Plan(query: String!, variables: String): FederationQueryPlan!\n");
    sdl.push_str("  federationV2Execute(query: String!, variables: String): JSON!\n");
    sdl.push_str("  federationV2Stats: FederationV2Stats!\n");
    sdl.push_str("  registeredServices: [ServiceMetadata!]!\n");
    sdl.push_str("  entityMetadata(entityName: String!): EntityMetadata\n");
    sdl.push_str("  federationV2Sdl: String!\n");
    sdl.push_str("}\n\n");
    sdl.push_str("type FederationQueryPlan { queryHash: String! steps: [PlanStep!]! parallelGroups: [ParallelGroup!]! estimatedCost: Float! estimatedDurationMs: Int! }\n");
    sdl.push_str("type PlanStep { stepId: String! stepType: String! entity: String service: String dependsOn: [String!]! fields: [String!]! args: JSON! }\n");
    sdl.push_str(
        "type ParallelGroup { groupId: String! steps: [String!]! executionMode: String! }\n",
    );
    sdl.push_str("type FederationV2Stats { totalQueries: Int! totalSteps: Int! parallelSteps: Int! batchResolutions: Int! cacheHits: Int! cacheMisses: Int! avgPlanTimeMs: Float! avgExecuteTimeMs: Float! avgTotalTimeMs: Float! planCacheHits: Int! autoResolversUsed: Int! servicesRegistered: Int! entitiesRegistered: Int! }\n");
    sdl.push_str("type ServiceMetadata { name: String! baseUrl: String! entities: [EntityMetadata!]! healthCheckUrl: String version: String! }\n");
    sdl.push_str("type EntityMetadata { name: String! service: String! keyField: String! fields: [FieldMetadata!]! relations: [RelationMetadata!]! restEndpoint: String! listEndpoint: String! batchEndpoint: String }\n");
    sdl.push_str("type FieldMetadata { name: String! fieldType: String! nullable: Boolean! isList: Boolean! }\n");
    sdl.push_str("type RelationMetadata { fieldName: String! targetEntity: String! targetService: String! relationType: String! resolverType: String! }\n\n");

    sdl.push_str("type Mutation { createTodo(title: String!, userId: String): UnifiedTodo! completeTodo(id: String!): Boolean! deleteTodo(id: String!): Boolean! createEntity(service: String!, entityType: String!, data: JSON!): JSON! updateEntity(service: String!, entityType: String!, id: String!, data: JSON!): JSON! deleteEntity(service: String!, entityType: String!, id: String!): Boolean! publishMasterDataEvent(domain: String!, action: String!, masterDataId: String!, sourceService: String!): MasterDataEvent! publishNotification(userId: String!, title: String!, content: String!, notificationType: String!): NotificationEvent! publishWorkflowTask(taskId: String!, assigneeId: String!, instanceTitle: String!, priority: String!, status: String!): WorkflowTaskEvent! publishOrderStatus(orderId: String!, orderType: String!, oldStatus: String!, newStatus: String!): OrderStatusEvent! cacheInvalidate(pattern: String!): Boolean! cacheClear: Boolean! prefetchTrigger(queryName: String!): Boolean! }\n\n");
    sdl.push_str("type MasterDataEvent { domain: String! action: String! master_data_id: String! source_service: String! timestamp: String! }\n");
    sdl.push_str("type NotificationEvent { id: String! user_id: String! title: String! content: String! notification_type: String! timestamp: String! }\n");
    sdl.push_str("type WorkflowTaskEvent { task_id: String! assignee_id: String! instance_title: String! priority: String! status: String! timestamp: String! }\n");
    sdl.push_str("type OrderStatusEvent { order_id: String! order_type: String! old_status: String! new_status: String! timestamp: String! }\n");
    sdl.push_str("type CacheStats { l1Size: Int! l2Size: Int! l1Hits: Int! l2Hits: Int! totalRequests: Int! hitRate: Float! evictions: Int! avgTtlSeconds: Float! topHotQueries: [HotQuery!]! }\n");
    sdl.push_str("type HotQuery { queryName: String! hitCount: Int! avgLatencyMs: Float! }\n");
    sdl.push_str("type CacheOptimizationSuggestion { suggestion: String! impact: String! currentMetric: String! expectedImprovement: String! }\n");
    sdl.push_str("type QueryPrefetchRule { triggerQuery: String! prefetchQueries: [PrefetchTarget!]! confidence: Float! }\n");
    sdl.push_str("type PrefetchTarget { queryName: String! queryHash: String! variablesTemplate: JSON! priority: Int! }\n");
    sdl.push_str("type CacheInvalidationRule { mutationName: String! invalidationPatterns: [String!]! entityType: String! }\n");
    sdl.push_str("type OptimisticUpdateHint { entityType: String! entityId: String! operation: String! affectedQueries: [String!]! }\n\n");
    sdl.push_str("type Subscription { serviceHealthChanged: ServiceHealth! masterDataChanged(domain: String): MasterDataEvent! notificationReceived(userId: String!): NotificationEvent! workflowTaskAssigned(assigneeId: String!): WorkflowTaskEvent! orderStatusChanged(orderType: String): OrderStatusEvent! }\n");

    sdl
}

/// 返回单个服务贡献给联邦的 SDL 片段
/// 模拟下游服务通过 _service { sdl } 暴露的实体定义。
pub fn service_sdl_fragment(service: &str) -> String {
    match service {
        "erp" => r#"# ERP Service Federation SDL
type CustomerEntity @key(fields: "id") { id: String! name: String! code: String! status: String! phone: String industry: String contact_person: String orders: [OrderEntity!]! contacts: [ContactEntity!]! }
type SupplierEntity @key(fields: "id") { id: String! name: String! code: String! status: String! contact_person: String phone: String address: String }
type MaterialEntity @key(fields: "id") { id: String! name: String! code: String! category: String! unit: String spec: String price: Float }
type OrderEntity @key(fields: "id") { id: String! order_number: String! customer_id: String! total_amount: Float! status: String! order_date: String }
"#.to_string(),
        "crm" => r#"# CRM Service Federation SDL
type ContactEntity @key(fields: "id") { id: String! name: String! customer_id: String email: String }
"#.to_string(),
        "hrm" => r#"# HRM Service Federation SDL
type EmployeeEntity @key(fields: "id") { id: String! name: String! department: String! position: String! email: String phone: String status: String departmentInfo: DepartmentEntity }
type DepartmentEntity @key(fields: "id") { id: String! name: String! code: String! manager_id: String parent_id: String }
"#.to_string(),
        "finance" => r#"# Finance Service Federation SDL
type VoucherEntity @key(fields: "id") { id: String! voucher_number: String! total_debit: Float! total_credit: Float! status: String! voucher_date: String created_by: String accountSubject: AccountSubjectEntity }
type AccountSubjectEntity @key(fields: "id") { id: String! code: String! name: String! category: String! balance: Float }
"#.to_string(),
        "mes" => r#"# MES Service Federation SDL
# MES 实体待后续迁移
"#.to_string(),
        _ => format!("# {} Service: no federated entities yet\n", service),
    }
}

/// 根据实体类型名获取对应的服务名
pub fn service_for_typename(typename: &str) -> &'static str {
    match typename {
        "CustomerEntity" | "SupplierEntity" | "MaterialEntity" | "OrderEntity" => "erp",
        "ContactEntity" => "crm",
        "EmployeeEntity" | "DepartmentEntity" => "hrm",
        "VoucherEntity" | "AccountSubjectEntity" => "finance",
        _ => "unknown",
    }
}

/// 解析联邦实体（__resolveReference 实现）
/// 根据 __typename 和 id 从对应的下游 REST 服务获取实体数据。
pub async fn resolve_federated_entity(typename: &str, id: &str) -> serde_json::Value {
    let (base_url, path) = match typename {
        "CustomerEntity" => (
            "http://localhost:8010",
            format!("/api/erp/customers/{}", id),
        ),
        "SupplierEntity" => (
            "http://localhost:8010",
            format!("/api/erp/suppliers/{}", id),
        ),
        "MaterialEntity" => (
            "http://localhost:8010",
            format!("/api/erp/materials/{}", id),
        ),
        "OrderEntity" => ("http://localhost:8010", format!("/api/erp/orders/{}", id)),
        "EmployeeEntity" => (
            "http://localhost:8020",
            format!("/api/hrm/employees/{}", id),
        ),
        "DepartmentEntity" => (
            "http://localhost:8020",
            format!("/api/hrm/departments/{}", id),
        ),
        "VoucherEntity" => (
            "http://localhost:8011",
            format!("/api/finance/vouchers/{}", id),
        ),
        "AccountSubjectEntity" => (
            "http://localhost:8011",
            format!("/api/finance/accounts/{}", id),
        ),
        "ContactEntity" => ("http://localhost:8029", format!("/api/crm/contacts/{}", id)),
        _ => return serde_json::json!({"error": "unknown entity type", "__typename": typename}),
    };

    let url = format!("{}{}", base_url, path);
    match service_auth_get(&url, FEDERATION_READ_PERMS).await {
        Ok(resp) if resp.status().is_success() => {
            resp.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({"error": "failed to parse response", "__typename": typename, "id": id})
            })
        }
        _ => serde_json::json!({"error": "entity not found", "__typename": typename, "id": id}),
    }
}

