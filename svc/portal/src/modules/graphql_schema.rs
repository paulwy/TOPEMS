#![allow(dead_code)] // Reserved: GraphQL 聚合层模块，待业务接入后启用
#![allow(ambiguous_glob_reexports, hidden_glob_reexports)] // portal 模块级 glob re-export 设计模式
//! V33.0 Portal BFF Phase 3: GraphQL 聚合层
//! V34.0 Portal BFF Phase 4: GraphQL Mutation + Subscription 支持
//! V35.0 Portal BFF Phase 5: DataLoader 批量加载 + 查询复杂度限制
//! V37.0 Portal BFF Phase 7: 完整 Apollo Federation v2（每服务实体 + 联邦网关）
//!
//! 提供单一端点让前端按需查询跨服务聚合数据，
//! 避免 N+1 REST 请求，支持字段级别的数据获取。
//! Phase 4 新增：
//! - Mutation：createTodo / completeTodo
//! - Subscription：serviceHealthChanged（WebSocket 实时推送）
//! Phase 5 新增：
//! - DataLoader：ServiceHealthLoader / TodoLoader 批量加载，解决 N+1 问题
//! - 查询复杂度限制：limit_complexity(1000) + limit_depth(10)
//! Phase 7 新增：
//! - Apollo Federation v2：每服务实体类型 + @key 指令 + Entity trait
//! - federation_sdl 查询：返回组合后的联邦 Schema SDL
//! - federation_entities 查询：批量解析跨服务联邦实体
//! - federation_service_sdls 查询：返回各服务的 SDL 片段
//!
//! ===== 审计登记（2026-10-03, P2-7）=====
//! 本文件 6537 行（portal 模块级 GraphQL 聚合层，含 Federation v2 / DataLoader /
//! Mutation / Subscription）。审计建议评估拆分；拆分风险高（Schema 注册顺序、
//! Object/Subscription 派生宏依赖同一模块作用域，拆分会触发大量 use 调整），
//! 且当前文件结构完整、编译通过、无功能缺陷，故本次不拆分，仅登记：
//! 若后续引入新的 GraphQL 域（如新增业务实体聚合），按域拆分为
//! `graphql/<domain>.rs` 子模块并在此汇总注册；届时必须保证
//! `cargo check --workspace` + `cargo test -p topems-portal --lib` 全绿。

use async_graphql::dataloader::DataLoader;
use async_graphql::{Context, Object, Schema, Subscription};
use futures_util::future::join_all;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

pub use crate::modules::graphql_ai_assist::*;
pub use crate::modules::graphql_cache::*;
pub use crate::modules::graphql_dataloader::*;
pub use crate::modules::graphql_edge_computing::*;
pub use crate::modules::graphql_edge_v2::*;
pub use crate::modules::graphql_enterprise_security::*;
pub use crate::modules::graphql_entities::*;
pub use crate::modules::graphql_event_bus::*;
pub use crate::modules::graphql_federation::*;
pub use crate::modules::graphql_federation_runtime::*;
pub use crate::modules::graphql_federation_sdl::*;
pub use crate::modules::graphql_federation_v4::*;
pub use crate::modules::graphql_gateway_security::*;
pub use crate::modules::graphql_governance::*;
pub use crate::modules::graphql_helpers::*;
pub use crate::modules::graphql_monitoring::*;
pub use crate::modules::graphql_persisted_queries::*;
pub use crate::modules::graphql_realtime_stream::*;
pub use crate::modules::graphql_redis_pubsub::*;
pub use crate::modules::graphql_security::*;
pub use crate::modules::graphql_semantic_cache::*;
pub use crate::modules::graphql_subscription_enhanced::*;
pub use crate::modules::graphql_types::*;
pub use crate::modules::query_governance::*;
pub use crate::modules::rate_limiting::*;
pub use crate::modules::schema_versioning::*;
// V44.0 拆分后：显式导入消歧（graphql_federation 与 rate_limiting 均定义 reset_circuit_breaker，
// 原 schema 本地副本为 `-> bool` 版本，与 graphql_federation 一致，故显式指向该版本）
use crate::modules::graphql_federation::reset_circuit_breaker;
use crate::shared::AppState;

// ==================== Query 根类型 ====================

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// 获取跨服务业务统计数据
    async fn business_stats(&self, ctx: &Context<'_>) -> async_graphql::Result<BusinessStatsGql> {
        let state = ctx.data::<AppState>()?;

        let (erp, crm, hrm, finance, mes, workflow) = tokio::join!(
            fetch_erp_stats(state),
            fetch_crm_stats(state),
            fetch_hrm_stats(state),
            fetch_finance_stats(state),
            fetch_mes_stats(state),
            fetch_workflow_stats(state),
        );

        Ok(BusinessStatsGql {
            erp: erp.unwrap_or(ServiceStatsGql {
                service: "erp".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            crm: crm.unwrap_or(ServiceStatsGql {
                service: "crm".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            hrm: hrm.unwrap_or(ServiceStatsGql {
                service: "hrm".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            finance: finance.unwrap_or(ServiceStatsGql {
                service: "finance".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            mes: mes.unwrap_or(ServiceStatsGql {
                service: "mes".into(),
                total: 0,
                active: 0,
                available: false,
            }),
            workflow: workflow.unwrap_or(ServiceStatsGql {
                service: "workflow".into(),
                total: 0,
                active: 0,
                available: false,
            }),
        })
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// 获取统一待办列表（聚合 workflow + portal + notification）
    async fn unified_todos(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<UnifiedTodoGql>> {
        let state = ctx.data::<AppState>()?;
        let mut todos = Vec::new();

        // 从 workflow 服务获取待办任务
        if let Ok(resp) = state.workflow_client.get_my_pending_tasks(1, 20).await {
            for task in resp.items {
                todos.push(UnifiedTodoGql {
                    id: task.id.to_string(),
                    title: task.instance_title.unwrap_or_default(),
                    source: "workflow".into(),
                    priority: task
                        .priority
                        .as_deref()
                        .and_then(|p| p.parse::<i32>().ok())
                        .unwrap_or(0),
                    status: task.status,
                    created_at: task.created_at.to_rfc3339(),
                });
            }
        }

        // V34.0: 修复 portal_todos 查询（使用正确的 schema 和 completed 列）
        if let Ok(rows) = sqlx::query(
            r#"SELECT id, title, created_at FROM portal.portal_todos
               WHERE deleted_at IS NULL AND completed = FALSE
               ORDER BY created_at DESC LIMIT 10"#,
        )
        .fetch_all(&state.pool)
        .await
        {
            use sqlx::Row;
            for row in rows {
                let id: uuid::Uuid = row.try_get("id").unwrap_or_default();
                let title: String = row.try_get("title").unwrap_or_default();
                let created_at: chrono::DateTime<chrono::Utc> = row
                    .try_get("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now());
                if !title.is_empty() {
                    todos.push(UnifiedTodoGql {
                        id: id.to_string(),
                        title,
                        source: "portal".into(),
                        priority: 0,
                        status: "pending".into(),
                        created_at: created_at.to_rfc3339(),
                    });
                }
            }
        }

        // 从 notification 服务获取未读通知
        if let Ok(notifications) = state.notification_client.get_unread().await {
            for n in notifications {
                todos.push(UnifiedTodoGql {
                    id: n
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    title: n
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    source: "notification".into(),
                    priority: n.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                    status: "unread".into(),
                    created_at: n
                        .get("created_at")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                });
            }
        }

        Ok(todos)
    }

    /// 获取所有服务健康状态（V34.0: 并行检查所有服务）
    async fn service_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        let services = [
            ("erp", "http://localhost:8010"),
            ("crm", "http://localhost:8029"),
            ("hrm", "http://localhost:8020"),
            ("finance", "http://localhost:8011"),
            ("mes", "http://localhost:8030"),
            ("workflow", "http://localhost:8000"),
            ("iam", "http://localhost:8000"),
            ("notification", "http://localhost:8084"),
        ];

        // 模块化单体模式（MONOLITH_SERVICE_URL）：所有服务进程内嵌于 topems-server，
        // 统一探测 server 聚合 /health（200 = 服务所在进程存活）；
        // 独立部署模式：逐服务独立端口探测。
        let futures = services.iter().map(|(name, url)| async move {
            let healthy = probe_service_health(name, url).await;
            ServiceHealthGql {
                service: (*name).to_string(),
                healthy,
                url: (*url).to_string(),
            }
        });
        let results = join_all(futures).await;

        Ok(results)
    }

    /// 获取复合仪表盘视图（V34.0: 并行获取 stats + todos + services）
    async fn dashboard(&self, ctx: &Context<'_>) -> async_graphql::Result<DashboardGql> {
        let (stats, todos, services) = tokio::join!(
            self.business_stats(ctx),
            self.unified_todos(ctx),
            self.service_health(ctx),
        );

        Ok(DashboardGql {
            stats: stats?,
            todos: todos?,
            services: services?,
        })
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个服务健康状态
    /// 使用 DataLoader 自动批量合并多个请求，避免 N+1 问题
    async fn service_health_by_name(
        &self,
        ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Option<ServiceHealthGql>> {
        let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
        Ok(loader.load_one(service).await?)
    }

    /// V35.0 Phase 5: 通过 DataLoader 批量获取多个服务健康状态
    async fn service_health_batch(
        &self,
        ctx: &Context<'_>,
        services: Vec<String>,
    ) -> async_graphql::Result<Vec<ServiceHealthGql>> {
        let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
        let map = loader.load_many(services).await?;
        Ok(map.into_values().collect())
    }

    /// V35.0 Phase 5: 通过 DataLoader 获取单个待办事项
    async fn todo_by_id(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<UnifiedTodoGql>> {
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;
        let loader = ctx.data::<DataLoader<TodoLoader>>()?;
        Ok(loader.load_one(uuid).await?)
    }

    /// V36.0 Phase 4: 获取扩展模块统计（qms/srm/lims/rd/ehs）
    /// 通过 BFF 并行调用各服务列表端点，聚合 total count
    async fn module_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<ModuleStatGql>> {
        let modules = [
            (
                "qms",
                "http://localhost:8050",
                "/api/qms/standards?page=1&page_size=1",
            ),
            (
                "srm",
                "http://localhost:8042",
                "/api/srm/suppliers?page=1&page_size=1",
            ),
            (
                "lims",
                "http://localhost:8051",
                "/api/lims/samples?page=1&page_size=1",
            ),
            (
                "rd",
                "http://localhost:8053",
                "/api/rd/projects?page=1&page_size=1",
            ),
            (
                "ehs",
                "http://localhost:8052",
                "/api/ehs/hazards?page=1&page_size=1",
            ),
        ];

        let futures = modules.iter().map(|(name, base, path)| async move {
            let url = format!("{}{}", base, path);
            match service_auth_get(&url, FEDERATION_READ_PERMS).await {
                Ok(resp) if resp.status().is_success() => {
                    let json: serde_json::Value = match resp.json().await {
                        Ok(j) => j,
                        Err(e) => {
                            tracing::warn!("Failed to parse {} stats response JSON: {}", name, e);
                            serde_json::Value::Null
                        }
                    };
                    let total = json
                        .get("data")
                        .and_then(|d| d.get("total"))
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    ModuleStatGql {
                        service: (*name).to_string(),
                        total,
                        available: true,
                    }
                }
                _ => ModuleStatGql {
                    service: (*name).to_string(),
                    total: 0,
                    available: false,
                },
            }
        });
        let results = join_all(futures).await;
        Ok(results)
    }

    /// V36.0 Phase 6: 获取联邦服务注册表
    /// 返回所有已注册的联邦服务及其支持的实体类型
    async fn federated_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederatedServiceGql>> {
        let registry = [
            (
                "erp",
                "http://localhost:8010",
                vec!["customers", "suppliers", "materials", "orders"],
            ),
            (
                "crm",
                "http://localhost:8029",
                vec!["contacts", "leads", "opportunities"],
            ),
            (
                "hrm",
                "http://localhost:8020",
                vec!["employees", "departments", "positions"],
            ),
            (
                "finance",
                "http://localhost:8011",
                vec!["accounts", "vouchers", "expenses"],
            ),
            (
                "mes",
                "http://localhost:8030",
                vec!["work_orders", "production_lines"],
            ),
        ];

        let futures = registry.iter().map(|(name, url, entities)| async move {
            let healthy = probe_service_health(name, url).await;
            FederatedServiceGql {
                service: (*name).to_string(),
                url: (*url).to_string(),
                available: healthy,
                entities: entities.iter().map(|e| (*e).to_string()).collect(),
            }
        });
        let results = join_all(futures).await;
        Ok(results)
    }

    /// V36.0 Phase 6: 联邦实体查询
    /// 通过 service + entity_type + id 跨服务查询实体
    async fn federated_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<FederatedEntityGql> {
        let base_url = service_url(&service);
        let path = match entity_type.as_str() {
            "customers" => format!("/api/erp/customers/{}", id),
            "suppliers" => format!("/api/erp/suppliers/{}", id),
            "materials" => format!("/api/erp/materials/{}", id),
            "contacts" => format!("/api/crm/contacts/{}", id),
            "leads" => format!("/api/crm/leads/{}", id),
            "employees" => format!("/api/hrm/employees/{}", id),
            "departments" => format!("/api/hrm/departments/{}", id),
            "accounts" => format!("/api/finance/accounts/{}", id),
            "vouchers" => format!("/api/finance/vouchers/{}", id),
            "expenses" => format!("/api/finance/expenses/{}", id),
            "work_orders" => format!("/api/mes/work-orders/{}", id),
            _ => format!("/api/{}/{}/{}", service, entity_type, id),
        };

        let url = format!("{}{}", base_url, path);
        let data = match service_auth_get(&url, FEDERATION_READ_PERMS).await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!(
                            "Failed to parse federation entity JSON for {}/{}: {}",
                            service,
                            id,
                            e
                        );
                        serde_json::Value::Null
                    }
                }
            }
            _ => {
                serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id})
            }
        };

        Ok(FederatedEntityGql {
            service,
            entity_type,
            id,
            data,
        })
    }

    /// V37.0 Phase 7: 获取组合后的联邦 Schema SDL
    /// 返回 Portal BFF 作为联邦网关组合后的完整 GraphQL Schema，
    /// 包含所有 @key 实体、查询、变更和订阅定义。
    async fn federation_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        Ok(compose_federation_sdl())
    }

    /// V37.0 Phase 7: 获取各服务的 SDL 片段
    /// 模拟 Apollo Federation v2 中每个服务暴露的 _service { sdl } 端点，
    /// 返回每个服务贡献给联邦的实体和字段定义。
    async fn federation_service_sdls(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FederationServiceSdlGql>> {
        let services = [
            ("erp", "http://localhost:8010"),
            ("crm", "http://localhost:8029"),
            ("hrm", "http://localhost:8020"),
            ("finance", "http://localhost:8011"),
            ("mes", "http://localhost:8030"),
        ];

        let futures = services.iter().map(|(name, url)| async move {
            let sdl = service_sdl_fragment(name);
            let healthy = probe_service_health(name, url).await;
            FederationServiceSdlGql {
                service: (*name).to_string(),
                sdl,
                available: healthy,
            }
        });
        Ok(join_all(futures).await)
    }

    /// V37.0 Phase 7: 批量解析联邦实体（_entities）
    /// V38.0: 优化 - 按服务分组、错误处理、超时控制
    /// 接受一组实体表示（__typename + id），按服务分组后从各服务解析实体详情。
    #[allow(clippy::indexing_slicing)]
    async fn federation_entities(
        &self,
        _ctx: &Context<'_>,
        representations: Vec<serde_json::Value>,
    ) -> async_graphql::Result<Vec<FederationRepresentationGql>> {
        use std::collections::HashMap;

        let mut by_service: HashMap<String, Vec<(String, String, usize)>> = HashMap::new();
        let mut results: Vec<Option<FederationRepresentationGql>> =
            vec![None; representations.len()];

        for (idx, rep) in representations.iter().enumerate() {
            let typename = rep
                .get("__typename")
                .and_then(|t| t.as_str())
                .unwrap_or("Unknown");
            let id = rep.get("id").and_then(|i| i.as_str()).unwrap_or("");
            let service = service_for_typename(typename);
            by_service.entry(service.to_string()).or_default().push((
                typename.to_string(),
                id.to_string(),
                idx,
            ));
        }

        let futures = by_service.into_values().map(|items| async move {
            let mut local_results = Vec::new();
            for (typename, id, idx) in items {
                let entity = tokio::time::timeout(
                    std::time::Duration::from_secs(5),
                    resolve_federated_entity(&typename, &id),
                )
                .await
                .unwrap_or_else(|_| {
                    serde_json::json!({
                        "error": "timeout",
                        "__typename": typename,
                        "id": id,
                        "message": "Entity resolution timed out after 5 seconds"
                    })
                });
                local_results.push((
                    idx,
                    FederationRepresentationGql {
                        __typename: typename,
                        entity,
                    },
                ));
            }
            local_results
        });

        let all_results = join_all(futures).await;
        for batch in all_results {
            for (idx, rep) in batch {
                results[idx] = Some(rep);
            }
        }

        Ok(results.into_iter().flatten().collect())
    }

    /// V38.0: 批量获取同类型实体列表
    /// 接受 service + entity_type + ids 数组参数，批量获取多个同类型实体
    async fn federation_entity_list(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => "/api/erp/customers/batch",
            ("erp", "suppliers") => "/api/erp/suppliers/batch",
            ("erp", "materials") => "/api/erp/materials/batch",
            ("crm", "contacts") => "/api/crm/contacts/batch",
            ("crm", "leads") => "/api/crm/leads/batch",
            ("hrm", "employees") => "/api/hrm/employees/batch",
            ("hrm", "departments") => "/api/hrm/departments/batch",
            ("finance", "accounts") => "/api/finance/accounts/batch",
            ("finance", "vouchers") => "/api/finance/vouchers/batch",
            ("finance", "expenses") => "/api/finance/expenses/batch",
            ("mes", "work-orders") => "/api/mes/work-orders/batch",
            _ => {
                let mut results = Vec::new();
                for id in &ids {
                    results.push(FederatedEntityGql {
                        service: service.clone(),
                        entity_type: entity_type.clone(),
                        id: id.clone(),
                        data: serde_json::json!({"error": "unsupported entity type", "service": service, "entity_type": entity_type}),
                    });
                }
                return Ok(results);
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = service_request(reqwest::Method::POST, &url, FEDERATION_READ_PERMS);

        match tokio::time::timeout(
            std::time::Duration::from_secs(5),
            client.json(&serde_json::json!({ "ids": ids })).send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => {
                        let data_list = json
                            .get("data")
                            .and_then(|d| d.as_array())
                            .unwrap_or(&Vec::new())
                            .clone();
                        let mut results = Vec::new();
                        for item in data_list {
                            let id = item
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            results.push(FederatedEntityGql {
                                service: service.clone(),
                                entity_type: entity_type.clone(),
                                id,
                                data: item,
                            });
                        }
                        if results.is_empty() {
                            for id in &ids {
                                results.push(FederatedEntityGql {
                                    service: service.clone(),
                                    entity_type: entity_type.clone(),
                                    id: id.clone(),
                                    data: serde_json::json!({"error": "entity not found", "id": id}),
                                });
                            }
                        }
                        Ok(results)
                    }
                    Err(_) => {
                        let mut results = Vec::new();
                        for id in &ids {
                            results.push(FederatedEntityGql {
                                service: service.clone(),
                                entity_type: entity_type.clone(),
                                id: id.clone(),
                                data: serde_json::json!({"error": "failed to parse response"}),
                            });
                        }
                        Ok(results)
                    }
                }
            }
            _ => {
                let service_clone = service.clone();
                let entity_type_clone = entity_type.clone();
                let base_url_clone = base_url.to_string();
                let futures = ids.iter().map(move |id| {
                    let service = service_clone.clone();
                    let entity_type = entity_type_clone.clone();
                    let base_url = base_url_clone.clone();
                    let id = id.clone();
                    async move {
                        let single_path = match entity_type.as_str() {
                            "customers" => format!("/api/erp/customers/{}", id),
                            "suppliers" => format!("/api/erp/suppliers/{}", id),
                            "materials" => format!("/api/erp/materials/{}", id),
                            "contacts" => format!("/api/crm/contacts/{}", id),
                            "leads" => format!("/api/crm/leads/{}", id),
                            "employees" => format!("/api/hrm/employees/{}", id),
                            "departments" => format!("/api/hrm/departments/{}", id),
                            "accounts" => format!("/api/finance/accounts/{}", id),
                            "vouchers" => format!("/api/finance/vouchers/{}", id),
                            "expenses" => format!("/api/finance/expenses/{}", id),
                            "work-orders" => format!("/api/mes/work-orders/{}", id),
                            _ => format!("/api/{}/{}/{}", service, entity_type, id),
                        };
                        let single_url = format!("{}{}", base_url, single_path);
                        let data = match service_auth_get(&single_url, FEDERATION_READ_PERMS).await {
                            Ok(resp) if resp.status().is_success() => {
                                resp.json::<serde_json::Value>().await.unwrap_or(serde_json::json!({"error": "parse error"}))
                            }
                            _ => serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id}),
                        };
                        FederatedEntityGql {
                            service: service.clone(),
                            entity_type: entity_type.clone(),
                            id,
                            data,
                        }
                    }
                });
                Ok(join_all(futures).await)
            }
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Customer 联邦实体
    async fn customer_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<CustomerEntityGql>> {
        let url = format!("http://localhost:8010/api/erp/customers/{}", id);
        match service_auth_get(&url, FEDERATION_READ_PERMS).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse customer_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(CustomerEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    name: data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    code: data
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("active")
                        .to_string(),
                    phone: data
                        .get("phone")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    industry: data
                        .get("industry")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    contact_person: data
                        .get("contact_person")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Employee 联邦实体
    async fn employee_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<EmployeeEntityGql>> {
        let url = format!("http://localhost:8020/api/hrm/employees/{}", id);
        match service_auth_get(&url, FEDERATION_READ_PERMS).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse employee_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(EmployeeEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    name: data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    department: data
                        .get("department_name")
                        .and_then(|v| v.as_str())
                        .or_else(|| data.get("department").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    position: data
                        .get("position_name")
                        .and_then(|v| v.as_str())
                        .or_else(|| data.get("position").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    email: data
                        .get("email")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    phone: data
                        .get("phone")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// V37.0 Phase 7: 按 ID 获取 Voucher 联邦实体
    async fn voucher_entity(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<Option<VoucherEntityGql>> {
        let url = format!("http://localhost:8011/api/finance/vouchers/{}", id);
        match service_auth_get(&url, FEDERATION_READ_PERMS).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse voucher_entity {} JSON: {}", id, e);
                        serde_json::Value::Null
                    }
                };
                let data = json.get("data").unwrap_or(&json);
                Ok(Some(VoucherEntityGql {
                    id: data
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&id)
                        .to_string(),
                    voucher_number: data
                        .get("voucher_number")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    total_debit: data
                        .get("total_debit")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    total_credit: data
                        .get("total_credit")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    status: data
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("draft")
                        .to_string(),
                    voucher_date: data
                        .get("voucher_date")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    created_by: data
                        .get("created_by")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap
    )]
    /// V38.0: 查询当前活跃订阅数
    async fn subscription_count(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        Ok(get_active_subscriptions() as i32)
    }

    /// V40.0: 获取实体关系图
    /// 返回所有联邦实体及其关系的可视化数据
    async fn entity_relationship_graph(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EntityRelationshipGraphGql> {
        let entities = vec![
            "CustomerEntity".to_string(),
            "SupplierEntity".to_string(),
            "MaterialEntity".to_string(),
            "EmployeeEntity".to_string(),
            "VoucherEntity".to_string(),
            "ContactEntity".to_string(),
            "OrderEntity".to_string(),
            "AccountSubjectEntity".to_string(),
            "DepartmentEntity".to_string(),
        ];

        let relations = vec![
            EntityRelationGql {
                from_type: "CustomerEntity".to_string(),
                to_type: "OrderEntity".to_string(),
                relation_type: "one-to-many".to_string(),
                from_field: "orders".to_string(),
                to_field: "customer_id".to_string(),
                service: "erp".to_string(),
            },
            EntityRelationGql {
                from_type: "CustomerEntity".to_string(),
                to_type: "ContactEntity".to_string(),
                relation_type: "one-to-many".to_string(),
                from_field: "contacts".to_string(),
                to_field: "customer_id".to_string(),
                service: "crm".to_string(),
            },
            EntityRelationGql {
                from_type: "VoucherEntity".to_string(),
                to_type: "AccountSubjectEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "account_subject".to_string(),
                to_field: "id".to_string(),
                service: "finance".to_string(),
            },
            EntityRelationGql {
                from_type: "EmployeeEntity".to_string(),
                to_type: "DepartmentEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "department_info".to_string(),
                to_field: "name".to_string(),
                service: "hrm".to_string(),
            },
            EntityRelationGql {
                from_type: "ContactEntity".to_string(),
                to_type: "CustomerEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "customer_id".to_string(),
                to_field: "id".to_string(),
                service: "crm".to_string(),
            },
            EntityRelationGql {
                from_type: "OrderEntity".to_string(),
                to_type: "CustomerEntity".to_string(),
                relation_type: "many-to-one".to_string(),
                from_field: "customer_id".to_string(),
                to_field: "id".to_string(),
                service: "erp".to_string(),
            },
        ];

        Ok(EntityRelationshipGraphGql {
            entities,
            relations,
        })
    }

    /// V40.0: 获取联邦网关性能统计
    async fn federation_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationStatsGql> {
        Ok(get_federation_stats())
    }

    /// V40.0: 优化后的批量实体列表查询（带缓存层）
    async fn federation_entity_list_cached(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        ids: Vec<String>,
    ) -> async_graphql::Result<Vec<FederatedEntityGql>> {
        record_federation_request();
        let results = batch_resolve_entities(&service, &entity_type, &ids).await;
        Ok(results
            .into_iter()
            .map(|(id, data)| FederatedEntityGql {
                service: service.clone(),
                entity_type: entity_type.clone(),
                id,
                data,
            })
            .collect())
    }

    /// V41.0: 获取缓存统计信息
    async fn cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CacheStatsV41Gql> {
        Ok(get_cache_stats())
    }

    /// V41.0: 获取缓存优化建议
    async fn cache_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheOptimizationSuggestionGql>> {
        Ok(get_cache_optimization_suggestions())
    }

    /// V41.0: 获取查询预取规则
    async fn prefetch_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<QueryPrefetchRuleGql>> {
        Ok(prefetch_rules().clone())
    }

    /// V41.0: 获取缓存失效规则
    async fn cache_invalidation_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CacheInvalidationRuleGql>> {
        Ok(cache_invalidation_rules().clone())
    }

    /// V41.0 Track E: 获取发现的查询列表
    async fn discovered_queries(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
    ) -> async_graphql::Result<Vec<DiscoveredQueryGql>> {
        let status_enum = status.as_deref().and_then(|s| match s {
            "new" => Some(DiscoveryStatus::New),
            "under_review" => Some(DiscoveryStatus::UnderReview),
            "approved" => Some(DiscoveryStatus::Approved),
            "rejected" => Some(DiscoveryStatus::Rejected),
            _ => None,
        });
        Ok(get_discovered_queries(status_enum))
    }

    /// V41.0 Track E: 获取自动审批策略
    async fn auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AutoApprovalPolicyGql> {
        Ok(get_auto_approval_policy())
    }

    /// V41.0 Track E: 获取安全审计报表
    async fn security_audit_report(
        &self,
        _ctx: &Context<'_>,
        period: String,
    ) -> async_graphql::Result<SecurityAuditReportGql> {
        Ok(generate_security_report(&period))
    }

    /// V41.0 Track E: 获取性能调优建议
    async fn performance_tuning_suggestions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<PerformanceTuningSuggestionGql>> {
        Ok(get_performance_tuning_suggestions())
    }

    /// V41.0 Track E: 获取完整性能分析
    async fn performance_analysis(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<PerformanceAnalysisGql> {
        Ok(get_performance_analysis())
    }

    /// V41.0 Track E: 获取白名单健康度
    async fn white_list_health(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<WhitelistHealthGql> {
        Ok(get_whitelist_health())
    }

    /// V42.0 Track E: 获取字段权限规则（可按 entity_type 过滤）
    async fn field_permissions(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldPermission>> {
        Ok(get_field_permissions(entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取掩码规则（可按 entity_type 过滤）
    async fn masking_rules(
        &self,
        _ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<MaskingRule>> {
        Ok(get_masking_rules(entity_type.as_deref()))
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V42.0 Track E: 获取字段访问审计（按时间倒序，可按 entity_type 过滤）
    async fn field_access_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<FieldAccessAudit>> {
        let limit = limit.unwrap_or(100).max(0) as usize;
        Ok(get_field_access_audits(limit, entity_type.as_deref()))
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V42.0 Track E: 获取数据变更审计（按时间倒序，可按 entity_type 过滤）
    async fn data_change_audits(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
        entity_type: Option<String>,
    ) -> async_graphql::Result<Vec<DataChangeAudit>> {
        let limit = limit.unwrap_or(100).max(0) as usize;
        Ok(get_data_change_audits(limit, entity_type.as_deref()))
    }

    /// V42.0 Track E: 获取安全配置
    async fn security_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<SecurityConfig> {
        Ok(get_security_config())
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V42.0 Track B: 获取联邦查询计划（不执行）
    /// 解析查询字符串，生成执行计划（步骤 + 并行组 + 估算成本）
    async fn federation_v2_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<FederationQueryPlanGql> {
        record_federation_v2_request();
        let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
        let plan_start = std::time::Instant::now();
        let plan = plan_federation_query(&query, &vars);
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        record_federation_v2_plan_time(plan_duration);
        cache_federation_v2_plan(&plan.query_hash, &plan);
        Ok(plan.to_gql())
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V42.0 Track B: 执行联邦查询（计划 → 并发执行 → 合并结果）
    async fn federation_v2_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
        variables: String,
    ) -> async_graphql::Result<serde_json::Value> {
        record_federation_v2_request();
        let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
        let query_hash = federation_v2_query_hash(&query);
        let plan_start = std::time::Instant::now();
        let plan = match get_cached_federation_v2_plan(&query_hash) {
            Some(p) => {
                record_federation_v2_plan_cache_hit();
                p
            }
            None => {
                let p = plan_federation_query(&query, &vars);
                cache_federation_v2_plan(&query_hash, &p);
                record_federation_v2_plan_cache_miss();
                p
            }
        };
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        record_federation_v2_plan_time(plan_duration);
        let exec_start = std::time::Instant::now();
        let result = execute_federation_plan(&plan).await;
        let exec_duration = exec_start.elapsed().as_millis() as u64;
        record_federation_v2_execute_time(exec_duration);
        Ok(result.unwrap_or_else(|e| serde_json::json!({"error": e})))
    }

    /// V42.0 Track B: 联邦 V2 统计
    async fn federation_v2_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV2StatsGql> {
        Ok(get_federation_v2_stats())
    }

    /// V42.0 Track B: 已注册的服务列表
    async fn registered_services(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceMetadata>> {
        Ok(list_services())
    }

    /// V42.0 Track B: 实体元数据
    async fn entity_metadata(
        &self,
        _ctx: &Context<'_>,
        entity_name: String,
    ) -> async_graphql::Result<Option<EntityMetadata>> {
        Ok(get_entity_metadata(&entity_name))
    }

    /// V42.0 Track B: 自动组合的联邦 SDL
    async fn federation_v2_sdl(&self, _ctx: &Context<'_>) -> async_graphql::Result<String> {
        Ok(compose_federation_sdl_v2())
    }

    /// V43.0 Track B: 获取所有订阅会话
    async fn subscription_sessions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionSessionGql>> {
        let sessions = list_sessions();
        Ok(sessions.into_iter().map(|s| s.into()).collect())
    }

    /// V43.0 Track B: 获取订阅统计信息
    async fn subscription_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SubscriptionStatsGql> {
        Ok(get_subscription_stats().into())
    }

    /// V43.0 Track B: 获取所有活跃订阅
    async fn active_subscriptions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubscriptionInfoGql>> {
        let sessions = list_sessions();
        let mut subs = Vec::new();
        for session in sessions {
            for sub in session.subscriptions.values() {
                subs.push(sub.clone().into());
            }
        }
        Ok(subs)
    }

    /// V43.0 Track E: 获取查询优化建议
    async fn query_optimization_suggestions(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<QueryOptimizationSuggestionGql>> {
        if let Some(hash) = query_hash {
            Ok(get_query_optimization_suggestions(&hash))
        } else {
            Ok(get_all_optimization_suggestions())
        }
    }

    /// V43.0 Track E: 获取查询健康度评分
    async fn query_health_score(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<QueryHealthScoreGql>> {
        Ok(get_query_health_score(&query_hash))
    }

    /// V43.0 Track E: 获取优化路线图
    async fn optimization_roadmap(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<OptimizationRoadmapGql> {
        Ok(generate_optimization_roadmap())
    }

    /// V43.0 Track E: 自然语言转 GraphQL（中英文）
    async fn nl2graphql(
        &self,
        _ctx: &Context<'_>,
        natural_language: String,
    ) -> async_graphql::Result<Nl2GraphqlResultGql> {
        let result = Nl2GraphqlParser::parse(&natural_language);
        record_nl2graphql_query(result.confidence);
        Ok(result)
    }

    /// V43.0 Track E: 获取智能缓存推荐
    async fn cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<CacheRecommendationReportGql> {
        Ok(get_cache_recommendations())
    }

    /// V43.0 Track E: 获取 AI 优化统计总览
    async fn ai_optimization_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AiOptimizationStatsGql> {
        Ok(get_ai_optimization_stats())
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V44.0 Track B: 生成 V3 联邦查询计划
    async fn federation_v3_plan(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<FederationV3PlanGql> {
        let vars = serde_json::Value::Null;
        let plan_start = std::time::Instant::now();
        let plan = FederationV3Planner::build_plan_v3(&query, &vars);
        let plan_duration = plan_start.elapsed().as_millis() as u64;
        let mut stats = federation_v3_stats_internal()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        stats.plan_count += 1;
        stats.total_plan_time_ms += plan_duration;
        let mut plan_cache = federation_v3_plan_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        plan_cache.put(plan.query_hash.clone(), plan.clone());
        Ok(plan_to_gql(&plan))
    }

    /// V44.0 Track B: 执行 V3 联邦查询
    async fn federation_v3_execute(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<serde_json::Value> {
        let vars = serde_json::Value::Null;
        let vars_hash = v3_variables_hash(&vars);
        let query_hash = {
            let mut hasher = Sha256::new();
            hasher.update(query.as_bytes());
            format!("{:x}", hasher.finalize())
        };

        if let Some(cached) = FederatedCacheManager::get_query_cache(&query_hash, &vars_hash) {
            return Ok(cached);
        }

        let plan = {
            let mut plan_cache = federation_v3_plan_cache()
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            match plan_cache.get(&query_hash) {
                Some(p) => p.clone(),
                None => {
                    let plan = FederationV3Planner::build_plan_v3(&query, &vars);
                    plan_cache.put(query_hash.clone(), plan.clone());
                    plan
                }
            }
        };

        let result = FederationV3Executor::execute_plan_v3(&plan)
            .await
            .unwrap_or_else(|e| serde_json::json!({"error": e}));

        let services: Vec<String> = plan
            .nodes
            .iter()
            .filter_map(|n| n.service.clone())
            .collect();
        FederatedCacheManager::set_query_cache(
            &query_hash,
            &vars_hash,
            result.clone(),
            services,
            60000,
        );

        Ok(result)
    }

    /// V44.0 Track B: V3 网关统计
    async fn federation_v3_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationV3StatsGql> {
        Ok(get_federation_v3_stats())
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V44.0 Track B: 执行轨迹列表
    async fn federation_v3_traces(
        &self,
        _ctx: &Context<'_>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<PlanExecutionTraceGql>> {
        Ok(get_v3_traces(limit.unwrap_or(20) as usize))
    }

    /// V44.0 Track B: 熔断器状态
    async fn federation_circuit_breakers(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<CircuitBreakerStateGqlSimple>> {
        Ok(get_all_circuit_breakers())
    }

    /// V44.0 Track B: 缓存统计
    async fn federation_cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<FederationCacheStatsGql> {
        Ok(get_v3_cache_stats())
    }

    /// V44.0 Track E: 查询追踪列表
    async fn graphql_traces(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
        operation_name: Option<String>,
        status: Option<String>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<QueryTraceGql>> {
        Ok(list_traces(query_hash, operation_name, status, limit))
    }

    /// V44.0 Track E: 追踪详情
    async fn graphql_trace(
        &self,
        _ctx: &Context<'_>,
        trace_id: String,
    ) -> async_graphql::Result<Option<QueryTraceGql>> {
        Ok(get_trace(&trace_id))
    }

    /// V44.0 Track E: 实时指标
    async fn graphql_metrics(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<GraphqlMetricsGql> {
        Ok(get_metrics(window.unwrap_or(MetricsWindow::FiveMinutes)))
    }

    /// V44.0 Track E: 告警列表
    async fn graphql_alerts(
        &self,
        _ctx: &Context<'_>,
        status: Option<String>,
        level: Option<AlertLevel>,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<GraphqlAlertGql>> {
        Ok(get_alerts(status, level, limit))
    }

    /// V44.0 Track E: 告警规则列表
    async fn graphql_alert_rules(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<AlertRuleGql>> {
        Ok(get_alert_rules())
    }

    /// V44.0 Track E: 监控仪表盘总览
    async fn monitoring_dashboard(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<MonitoringDashboardStatsGql> {
        Ok(get_monitoring_dashboard())
    }

    /// V44.0 Track E: 慢查询 Top N
    async fn top_slow_queries(
        &self,
        _ctx: &Context<'_>,
        limit: Option<usize>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<Vec<TopSlowQueryGql>> {
        Ok(get_top_slow_queries(
            limit,
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    /// V44.0 Track E: 错误率趋势
    async fn error_rate_trend(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
        interval: Option<i64>,
    ) -> async_graphql::Result<ErrorRateTrendGql> {
        Ok(get_error_rate_trend(
            window.unwrap_or(MetricsWindow::OneHour),
            interval,
        ))
    }

    /// V44.0 Track E: 查询延迟分布
    async fn query_latency_distribution(
        &self,
        _ctx: &Context<'_>,
        window: Option<MetricsWindow>,
    ) -> async_graphql::Result<QueryLatencyDistributionGql> {
        Ok(get_query_latency_distribution(
            window.unwrap_or(MetricsWindow::FifteenMinutes),
        ))
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 边缘节点列表
    async fn edge_nodes(&self, _ctx: &Context<'_>) -> async_graphql::Result<Vec<EdgeNodeGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .nodes
            .iter()
            .map(|n| EdgeNodeGql {
                id: n.id.clone(),
                region: n.region.clone(),
                location: n.location.clone(),
                latency_ms: n.latency_ms,
                health: n.health,
                capacity: n.capacity,
                current_load: n.current_load,
                functions_deployed: n.functions_deployed,
            })
            .collect())
    }

    /// V45.0: 边缘函数列表
    async fn edge_functions(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<EdgeFunctionGql>> {
        let state = edge_compute_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(state
            .functions
            .iter()
            .map(|f| EdgeFunctionGql {
                id: f.id.clone(),
                name: f.name.clone(),
                handler: f.handler.clone(),
                route_pattern: f.route_pattern.clone(),
                cache_ttl_ms: f.cache_ttl_ms,
                deployed_to_regions: f.deployed_to_regions.clone(),
                version: f.version.clone(),
                enabled: f.enabled,
            })
            .collect())
    }

    /// V45.0: 边缘计算统计
    async fn edge_compute_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<EdgeComputeStatsGql> {
        Ok(EdgeComputeManager::get_stats())
    }

    /// V45.0: CDN 缓存统计
    async fn cdn_cache_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<CdnStatsGql> {
        Ok(CdnCacheManager::get_stats())
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    /// V45.0: CDN 缓存条目列表（可按标签过滤）
    async fn cdn_cache_entries(
        &self,
        _ctx: &Context<'_>,
        tags: Option<Vec<String>>,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<CdnCacheEntryGql>> {
        let tags_ref = tags.as_deref();
        Ok(CdnCacheManager::get_entries(
            tags_ref,
            limit.unwrap_or(50) as usize,
        ))
    }

    /// V45.0: 流式响应统计
    async fn stream_stats(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamStatsGql> {
        Ok(StreamingResponseManager::get_stats())
    }

    /// V45.0: 流式配置
    async fn stream_config(&self, _ctx: &Context<'_>) -> async_graphql::Result<StreamConfigGql> {
        Ok(StreamingResponseManager::get_config())
    }

    /// V45.0: 延迟字段列表（可按 query_hash 过滤）
    async fn deferred_fields(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<Vec<DeferredFieldGql>> {
        Ok(StreamingResponseManager::get_deferred_fields(
            query_hash.as_deref(),
        ))
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: Schema 注册表（返回指定服务的所有已注册版本）
    async fn schema_registry(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaRegistryEntryGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.list_versions(&service))
    }

    /// V45.0: 版本列表（Schema 版本管理器中的版本列表）
    async fn schema_versions(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.list_versions(&service))
    }

    /// V45.0: 版本详情
    async fn schema_version_detail(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<Option<SchemaVersionGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.get_version(&service, &version))
    }

    /// V45.0: 版本差异
    async fn schema_diff(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Option<VersionDiffGql>> {
        let manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.diff(&service, &from_version, &to_version))
    }

    /// V45.0: 契约测试列表（service 为空时返回全部）
    async fn contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<Vec<ContractTestGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner
            .tests
            .values()
            .filter(|t| service.is_empty() || t.service == service)
            .cloned()
            .collect())
    }

    /// V45.0: 测试结果（按 test_id 查询历史结果，limit 控制条数）
    async fn contract_test_results(
        &self,
        _ctx: &Context<'_>,
        test_id: String,
        limit: Option<usize>,
    ) -> async_graphql::Result<Vec<ContractTestResultGql>> {
        let runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.get_results(&test_id, limit.unwrap_or(50)))
    }

    /// V45.0: Breaking Change 检测（对比两个版本之间的 Breaking Change）
    async fn breaking_changes(
        &self,
        _ctx: &Context<'_>,
        service: String,
        from_version: String,
        to_version: String,
    ) -> async_graphql::Result<Vec<SchemaChangeGql>> {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        if let Some(diff) = registry.diff_versions(&service, &from_version, &to_version) {
            Ok(diff.breaking_changes)
        } else {
            Ok(vec![])
        }
    }

    /// V45.0: 治理统计
    async fn schema_governance_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<SchemaGovernanceStatsGql> {
        Ok(get_schema_governance_stats())
    }

    /// V45.0: 各服务治理信息
    async fn service_governance_info(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceGovernanceInfoGql>> {
        Ok(get_service_governance_info())
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 获取所有服务的限流器状态
    async fn rate_limiter_status(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterStatusGql>> {
        Ok(get_rate_limiter_statuses())
    }

    /// V49.0: 获取所有服务的限流器配置
    async fn rate_limiter_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<RateLimiterConfigGql>> {
        Ok(get_rate_limiter_configs())
    }

    /// V49.0: 获取所有服务的熔断器状态
    async fn circuit_breaker_states(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CircuitBreakerStateGql>> {
        Ok(get_circuit_breaker_states())
    }

    /// V49.0: 获取所有服务的降级配置
    async fn degradation_configs(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<ServiceDegradationConfigGql>> {
        Ok(get_degradation_configs())
    }

    /// V49.0: 获取服务负载指标（可按服务过滤）
    async fn load_metrics(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<LoadMetricsGql>> {
        if let Some(svc) = service {
            Ok(get_load_metrics(&svc))
        } else {
            Ok(get_all_load_metrics())
        }
    }

    /// V49.0: 获取实例健康状态（可按服务过滤）
    async fn instance_health(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<InstanceHealthGql>> {
        if let Some(svc) = service {
            Ok(get_instance_healths(&svc))
        } else {
            Ok(get_all_instance_healths())
        }
    }

    /// V49.0: 对指定服务做出路由决策
    async fn routing_decision(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<RoutingDecisionGql> {
        Ok(make_routing_decision(&service))
    }

    /// V49.0: 获取路由统计
    async fn routing_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<AdaptiveRoutingStatsGql> {
        Ok(get_routing_stats())
    }

    /// V49.0: 获取路由规则（可按服务过滤）
    async fn routing_rules(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<Vec<RoutingRuleGql>> {
        Ok(get_routing_rules(service.as_deref()))
    }

    /// V49.0: 获取服务流量策略
    async fn traffic_policy(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<TrafficPolicyGql> {
        Ok(get_traffic_policy(&service))
    }
}

// ==================== Mutation 根类型（V34.0 Phase 4） ====================

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// 创建待办事项
    async fn create_todo(
        &self,
        ctx: &Context<'_>,
        title: String,
        user_id: Option<String>,
    ) -> async_graphql::Result<UnifiedTodoGql> {
        let state = ctx.data::<AppState>()?;
        let uid = user_id.unwrap_or_else(|| "system".to_string());

        let row = sqlx::query(
            r#"INSERT INTO portal.portal_todos
               (user_id, title, service_code, service_name, priority, todo_type)
               VALUES ($1, $2, 'portal', '门户中心', 'medium', 'personal')
               RETURNING id, title, created_at"#,
        )
        .bind(&uid)
        .bind(&title)
        .fetch_one(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("创建待办失败: {}", e)))?;

        use sqlx::Row;
        let id: uuid::Uuid = row.try_get("id")?;
        let title: String = row.try_get("title")?;
        let created_at: chrono::DateTime<chrono::Utc> = row
            .try_get("created_at")
            .unwrap_or_else(|_| chrono::Utc::now());

        Ok(UnifiedTodoGql {
            id: id.to_string(),
            title,
            source: "portal".into(),
            priority: 0,
            status: "pending".into(),
            created_at: created_at.to_rfc3339(),
        })
    }

    /// 完成待办事项
    async fn complete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        let state = ctx.data::<AppState>()?;
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

        let result = sqlx::query(
            r#"UPDATE portal.portal_todos
               SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(uuid)
        .execute(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("更新待办失败: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// 删除待办事项（软删除）
    async fn delete_todo(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        let state = ctx.data::<AppState>()?;
        let uuid = uuid::Uuid::parse_str(&id)
            .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

        let result = sqlx::query(
            r#"UPDATE portal.portal_todos
               SET deleted_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(uuid)
        .execute(&state.pool)
        .await
        .map_err(|e| async_graphql::Error::new(format!("删除待办失败: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    /// V38.0: 创建实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST POST 端点
    async fn create_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => "/api/erp/customers",
            ("erp", "suppliers") => "/api/erp/suppliers",
            ("erp", "materials") => "/api/erp/materials",
            ("crm", "contacts") => "/api/crm/contacts",
            ("crm", "leads") => "/api/crm/leads",
            ("hrm", "employees") => "/api/hrm/employees",
            ("hrm", "departments") => "/api/hrm/departments",
            ("finance", "accounts") => "/api/finance/accounts",
            ("finance", "vouchers") => "/api/finance/vouchers",
            ("finance", "expenses") => "/api/finance/expenses",
            ("mes", "work-orders") => "/api/mes/work-orders",
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = service_request(reqwest::Method::POST, &url, FEDERATION_WRITE_PERMS);

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            client.json(&data).send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                let result: serde_json::Value = resp
                    .json()
                    .await
                    .unwrap_or(serde_json::json!({"success": true}));
                Ok(result)
            }
            Ok(Ok(resp)) => {
                let status = resp.status();
                let error_body = resp.text().await.unwrap_or_default();
                Err(async_graphql::Error::new(format!(
                    "创建实体失败 ({}): {}",
                    status, error_body
                )))
            }
            Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
            Err(_) => Err(async_graphql::Error::new("创建实体超时")),
        }
    }

    /// V38.0: 更新实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST PUT 端点
    async fn update_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
        data: serde_json::Value,
    ) -> async_graphql::Result<serde_json::Value> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => format!("/api/erp/customers/{}", id),
            ("erp", "suppliers") => format!("/api/erp/suppliers/{}", id),
            ("erp", "materials") => format!("/api/erp/materials/{}", id),
            ("crm", "contacts") => format!("/api/crm/contacts/{}", id),
            ("crm", "leads") => format!("/api/crm/leads/{}", id),
            ("hrm", "employees") => format!("/api/hrm/employees/{}", id),
            ("hrm", "departments") => format!("/api/hrm/departments/{}", id),
            ("finance", "accounts") => format!("/api/finance/accounts/{}", id),
            ("finance", "vouchers") => format!("/api/finance/vouchers/{}", id),
            ("finance", "expenses") => format!("/api/finance/expenses/{}", id),
            ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = service_request(reqwest::Method::PUT, &url, FEDERATION_WRITE_PERMS);

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            client.json(&data).send(),
        )
        .await
        {
            Ok(Ok(resp)) if resp.status().is_success() => {
                let result: serde_json::Value = resp
                    .json()
                    .await
                    .unwrap_or(serde_json::json!({"success": true}));
                Ok(result)
            }
            Ok(Ok(resp)) => {
                let status = resp.status();
                let error_body = resp.text().await.unwrap_or_default();
                Err(async_graphql::Error::new(format!(
                    "更新实体失败 ({}): {}",
                    status, error_body
                )))
            }
            Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
            Err(_) => Err(async_graphql::Error::new("更新实体超时")),
        }
    }

    /// V38.0: 删除实体（通用 CRUD）
    /// 根据 service + entity_type 映射到对应的 REST DELETE 端点
    async fn delete_entity(
        &self,
        _ctx: &Context<'_>,
        service: String,
        entity_type: String,
        id: String,
    ) -> async_graphql::Result<bool> {
        let base_url = service_url(&service);
        let path = match (service.as_str(), entity_type.as_str()) {
            ("erp", "customers") => format!("/api/erp/customers/{}", id),
            ("erp", "suppliers") => format!("/api/erp/suppliers/{}", id),
            ("erp", "materials") => format!("/api/erp/materials/{}", id),
            ("crm", "contacts") => format!("/api/crm/contacts/{}", id),
            ("crm", "leads") => format!("/api/crm/leads/{}", id),
            ("hrm", "employees") => format!("/api/hrm/employees/{}", id),
            ("hrm", "departments") => format!("/api/hrm/departments/{}", id),
            ("finance", "accounts") => format!("/api/finance/accounts/{}", id),
            ("finance", "vouchers") => format!("/api/finance/vouchers/{}", id),
            ("finance", "expenses") => format!("/api/finance/expenses/{}", id),
            ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
            _ => {
                return Err(async_graphql::Error::new(format!(
                    "不支持的服务或实体类型: {}/{}",
                    service, entity_type
                )))
            }
        };

        let url = format!("{}{}", base_url, path);
        let client = service_request(reqwest::Method::DELETE, &url, FEDERATION_WRITE_PERMS);

        match tokio::time::timeout(std::time::Duration::from_secs(10), client.send()).await {
            Ok(Ok(resp)) if resp.status().is_success() => Ok(true),
            Ok(Ok(_)) => Ok(false),
            Ok(Err(_)) => Ok(false),
            Err(_) => Err(async_graphql::Error::new("删除实体超时")),
        }
    }

    // ==================== V39.0 Phase 9: 事件发布 Mutations ====================

    /// 发布主数据变更事件
    /// 其他服务通过此 mutation 发布主数据变更事件到事件总线。
    async fn publish_master_data_event(
        &self,
        ctx: &Context<'_>,
        domain: String,
        action: String,
        master_data_id: String,
        source_service: String,
    ) -> async_graphql::Result<MasterDataEventGql> {
        let event = MasterDataEventGql {
            domain: domain.clone(),
            action: action.clone(),
            master_data_id: master_data_id.clone(),
            source_service: source_service.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        // 发布到本地 EventBus
        global_event_bus().publish(
            SubscriptionChannel::MasterDataChanged,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        // 如果 Redis 可用，同时发布到 Redis（多实例广播）
        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::HealthCheck,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布通知事件
    async fn publish_notification(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        title: String,
        content: String,
        notification_type: String,
    ) -> async_graphql::Result<NotificationEventGql> {
        let event = NotificationEventGql {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user_id.clone(),
            title: title.clone(),
            content: content.clone(),
            notification_type: notification_type.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::NotificationReceived,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::PortalNotificationPublished,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布工作流任务事件
    async fn publish_workflow_task(
        &self,
        ctx: &Context<'_>,
        task_id: String,
        assignee_id: String,
        instance_title: String,
        priority: String,
        status: String,
    ) -> async_graphql::Result<WorkflowTaskEventGql> {
        let event = WorkflowTaskEventGql {
            task_id: task_id.clone(),
            assignee_id: assignee_id.clone(),
            instance_title: instance_title.clone(),
            priority: priority.clone(),
            status: status.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::WorkflowTaskAssigned,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::WorkflowStarted,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// 发布订单状态变更事件
    async fn publish_order_status(
        &self,
        ctx: &Context<'_>,
        order_id: String,
        order_type: String,
        old_status: String,
        new_status: String,
    ) -> async_graphql::Result<OrderStatusEventGql> {
        let event = OrderStatusEventGql {
            order_id: order_id.clone(),
            order_type: order_type.clone(),
            old_status: old_status.clone(),
            new_status: new_status.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        global_event_bus().publish(
            SubscriptionChannel::OrderStatusChanged,
            serde_json::to_value(&event).unwrap_or_default(),
        );

        let state = ctx.data::<AppState>()?;
        if let Some(publisher) = &state.event_publisher {
            let _ = publisher
                .publish_event(
                    topems_shared_event::event::EventType::SalesOrderApproved,
                    serde_json::to_value(&event).unwrap_or_default(),
                )
                .await;
        }

        invalidate_cache();
        Ok(event)
    }

    /// V41.0: 手动失效缓存（按模式匹配）
    async fn cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
    ) -> async_graphql::Result<bool> {
        let count = cache_invalidate_pattern(&pattern);
        tracing::debug!("[cache] 手动失效模式 '{}'，共 {} 条", pattern, count);
        Ok(true)
    }

    /// V41.0: 清空所有缓存
    async fn cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        cache_clear_all();
        tracing::debug!("[cache] 所有缓存已清空");
        Ok(true)
    }

    /// V41.0: 触发查询预取
    async fn prefetch_trigger(
        &self,
        _ctx: &Context<'_>,
        query_name: String,
    ) -> async_graphql::Result<bool> {
        let triggered = trigger_prefetch(&query_name);
        Ok(triggered)
    }

    /// V41.0 Track E: 审批通过发现的查询
    async fn approve_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(approve_discovered_query(&hash, Some("admin")))
    }

    /// V41.0 Track E: 拒绝发现的查询
    async fn reject_discovered_query(
        &self,
        _ctx: &Context<'_>,
        hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(reject_discovered_query(&hash, Some("admin")))
    }

    /// V41.0 Track E: 更新自动审批策略
    async fn update_auto_approval_policy(
        &self,
        _ctx: &Context<'_>,
        policy: AutoApprovalPolicyInput,
    ) -> async_graphql::Result<bool> {
        Ok(update_auto_approval_policy(policy))
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// V41.0 Track E: 手动触发自动审批扫描
    async fn run_auto_approval_scan(&self, _ctx: &Context<'_>) -> async_graphql::Result<i32> {
        Ok(run_auto_approval_scan() as i32)
    }

    /// V42.0 Track E: 设置字段权限（覆盖同 entity_type + field_name 的规则）
    async fn set_field_permission(
        &self,
        _ctx: &Context<'_>,
        permission: FieldPermissionInput,
    ) -> async_graphql::Result<FieldPermission> {
        let perm: FieldPermission = permission.into();
        set_field_permission(perm.clone());
        Ok(perm)
    }

    /// V42.0 Track E: 移除字段权限
    async fn remove_field_permission(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        Ok(remove_field_permission(&entity_type, &field_name))
    }

    /// V42.0 Track E: 设置掩码规则（覆盖同 entity_type + field_name 的规则）
    async fn set_masking_rule(
        &self,
        _ctx: &Context<'_>,
        rule: MaskingRuleInput,
    ) -> async_graphql::Result<MaskingRule> {
        let r: MaskingRule = rule.into();
        set_masking_rule(r.clone());
        Ok(r)
    }

    /// V42.0 Track E: 移除掩码规则
    async fn remove_masking_rule(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        field_name: String,
    ) -> async_graphql::Result<bool> {
        Ok(remove_masking_rule(&entity_type, &field_name))
    }

    /// V42.0 Track E: 更新安全配置
    async fn update_security_config(
        &self,
        _ctx: &Context<'_>,
        config: SecurityConfigInput,
    ) -> async_graphql::Result<SecurityConfig> {
        let current = get_security_config();
        let new_config = SecurityConfig {
            field_permissions_enabled: config
                .field_permissions_enabled
                .unwrap_or(current.field_permissions_enabled),
            data_masking_enabled: config
                .data_masking_enabled
                .unwrap_or(current.data_masking_enabled),
            field_audit_enabled: config
                .field_audit_enabled
                .unwrap_or(current.field_audit_enabled),
            data_change_audit_enabled: config
                .data_change_audit_enabled
                .unwrap_or(current.data_change_audit_enabled),
            default_deny: config.default_deny.unwrap_or(current.default_deny),
            audit_sensitive_fields_only: config
                .audit_sensitive_fields_only
                .unwrap_or(current.audit_sensitive_fields_only),
        };
        Ok(update_security_config(new_config))
    }

    /// V43.0 Track B: 取消指定订阅
    async fn cancel_subscription(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(cancel_subscription_by_id(&id))
    }

    /// V43.0 Track B: 取消指定连接的所有订阅
    async fn cancel_all_subscriptions(
        &self,
        _ctx: &Context<'_>,
        connection_id: String,
    ) -> async_graphql::Result<u64> {
        Ok(cancel_all_subscriptions_by_connection(&connection_id))
    }

    /// V43.0 Track E: 应用查询优化建议
    async fn apply_optimization(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        suggestion_id: String,
    ) -> async_graphql::Result<bool> {
        Ok(apply_optimization_suggestion(&query_hash, &suggestion_id))
    }

    /// V43.0 Track E: 生成缓存推荐（返回推荐变更数）
    async fn generate_cache_recommendations(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<u32> {
        Ok(generate_cache_recommendations())
    }

    /// V43.0 Track E: 接受缓存推荐
    async fn accept_cache_recommendation(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(accept_cache_recommendation(&query_hash))
    }

    /// V44.0 Track B: 重置熔断器
    async fn federation_reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        Ok(reset_circuit_breaker(&service))
    }

    /// V44.0 Track B: 失效查询缓存
    async fn federation_cache_invalidate(
        &self,
        _ctx: &Context<'_>,
        query_hash: Option<String>,
    ) -> async_graphql::Result<bool> {
        if let Some(hash) = query_hash {
            Ok(FederatedCacheManager::invalidate_query_cache(&hash))
        } else {
            Ok(FederatedCacheManager::clear_all_cache())
        }
    }

    /// V44.0 Track B: 清除所有缓存
    async fn federation_cache_clear(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        Ok(FederatedCacheManager::clear_all_cache())
    }

    /// V44.0 Track B: 设置熔断器配置
    async fn federation_set_circuit_breaker_config(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: CircuitBreakerConfigInputGql,
    ) -> async_graphql::Result<bool> {
        Ok(set_circuit_breaker_config(&service, config))
    }

    /// V44.0 Track E: 添加告警规则
    async fn add_alert_rule(
        &self,
        _ctx: &Context<'_>,
        input: AlertRuleInput,
    ) -> async_graphql::Result<String> {
        Ok(add_alert_rule(input))
    }

    /// V44.0 Track E: 更新告警规则
    async fn update_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: AlertRuleInput,
    ) -> async_graphql::Result<bool> {
        Ok(update_alert_rule(&id, input))
    }

    /// V44.0 Track E: 删除告警规则
    async fn delete_alert_rule(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(delete_alert_rule(&id))
    }

    /// V44.0 Track E: 确认告警
    async fn acknowledge_alert(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        Ok(acknowledge_alert(&id))
    }

    /// V44.0 Track E: 解决告警
    async fn resolve_alert(&self, _ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
        Ok(resolve_alert(&id))
    }

    /// V44.0 Track E: 测试告警
    async fn test_alert(
        &self,
        _ctx: &Context<'_>,
        alert_type: AlertType,
        level: AlertLevel,
    ) -> async_graphql::Result<String> {
        Ok(test_alert(alert_type, level))
    }

    /// V44.0 Track E: 重置指标
    async fn reset_graphql_metrics(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        reset_metrics();
        Ok(true)
    }

    // ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

    /// V45.0: 部署边缘函数
    async fn deploy_edge_function(
        &self,
        _ctx: &Context<'_>,
        name: String,
        handler: String,
        route_pattern: String,
        cache_ttl_ms: i64,
    ) -> async_graphql::Result<String> {
        Ok(EdgeComputeManager::deploy_function(
            &name,
            &handler,
            &route_pattern,
            cache_ttl_ms,
        ))
    }

    /// V45.0: 在边缘节点执行函数
    async fn execute_at_edge(
        &self,
        _ctx: &Context<'_>,
        function_name: String,
        input: serde_json::Value,
        region: Option<String>,
    ) -> async_graphql::Result<serde_json::Value> {
        Ok(EdgeComputeManager::execute_at_edge(
            &function_name,
            &input,
            region.as_deref(),
        ))
    }

    /// V45.0: CDN 缓存预热
    async fn cdn_cache_warm(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::warm_cache(&query_hashes))
    }

    /// V45.0: CDN 缓存预取
    async fn cdn_cache_prefetch(
        &self,
        _ctx: &Context<'_>,
        query_hashes: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::prefetch(&query_hashes))
    }

    /// V45.0: 按标签失效 CDN 缓存
    async fn cdn_cache_invalidate_by_tag(
        &self,
        _ctx: &Context<'_>,
        tags: Vec<String>,
    ) -> async_graphql::Result<u32> {
        Ok(CdnCacheManager::invalidate_by_tag(&tags))
    }

    /// V45.0: 清空所有 CDN 缓存
    async fn cdn_cache_purge_all(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        Ok(CdnCacheManager::purge_all())
    }

    /// V45.0: 更新流式配置
    async fn update_stream_config(
        &self,
        _ctx: &Context<'_>,
        config: StreamConfigInput,
    ) -> async_graphql::Result<bool> {
        Ok(StreamingResponseManager::update_config(config))
    }

    // ==================== V45.0 Track E: GraphQL 企业级治理 ====================

    /// V45.0: 注册 Schema（同时发布到版本管理器）
    async fn register_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        sdl: String,
    ) -> async_graphql::Result<String> {
        let entry = {
            let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
            registry.register(&service, &version, &sdl, "user")
        };
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        manager.publish(&service, &version, "", &sdl);
        Ok(entry.version)
    }

    /// V45.0: 废弃 Schema 版本
    async fn deprecate_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.deprecate(&service, &version))
    }

    /// V45.0: 退役 Schema 版本
    async fn retire_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        Ok(registry.retire(&service, &version))
    }

    /// V45.0: 添加契约测试
    async fn add_contract_test(
        &self,
        _ctx: &Context<'_>,
        input: ContractTestInput,
    ) -> async_graphql::Result<String> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.add_test(input))
    }

    /// V45.0: 更新契约测试
    async fn update_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
        input: ContractTestInput,
    ) -> async_graphql::Result<bool> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.update_test(&id, input))
    }

    /// V45.0: 删除契约测试
    async fn delete_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<bool> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.remove_test(&id))
    }

    /// V45.0: 运行契约测试
    async fn run_contract_test(
        &self,
        _ctx: &Context<'_>,
        id: String,
    ) -> async_graphql::Result<ContractTestResultGql> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        runner
            .run_test(&id)
            .ok_or_else(|| async_graphql::Error::new(format!("Contract test '{}' not found", id)))
    }

    /// V45.0: 运行所有契约测试（可按 service 过滤，返回运行数量）
    async fn run_all_contract_tests(
        &self,
        _ctx: &Context<'_>,
        service: Option<String>,
    ) -> async_graphql::Result<u32> {
        let mut runner = contract_test_runner()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(runner.run_all(service.as_deref()))
    }

    /// V45.0: 发布 Schema 版本（从注册表获取 SDL 并发布到版本管理器）
    async fn publish_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
        changelog: String,
    ) -> async_graphql::Result<String> {
        let sdl = {
            let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
            registry
                .get_version(&service, &version)
                .map(|v| v.sdl)
                .unwrap_or_default()
        };
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.publish(&service, &version, &changelog, &sdl))
    }

    /// V45.0: 提升 Schema 版本为 Active
    async fn promote_schema_version(
        &self,
        _ctx: &Context<'_>,
        service: String,
        version: String,
    ) -> async_graphql::Result<bool> {
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.promote(&service, &version))
    }

    /// V45.0: 回滚 Schema 到指定版本
    async fn rollback_schema(
        &self,
        _ctx: &Context<'_>,
        service: String,
        to_version: String,
    ) -> async_graphql::Result<bool> {
        let mut manager = schema_version_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        Ok(manager.rollback(&service, &to_version))
    }

    // ==================== V49.0: 自适应限流 + 熔断降级 + 负载感知路由 ====================

    /// V49.0: 配置服务限流器
    async fn configure_rate_limiter(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: RateLimiterConfigInput,
    ) -> async_graphql::Result<RateLimiterConfigGql> {
        configure_rate_limiter(
            &service,
            config.max_requests_per_second,
            config.burst_capacity,
            config.adaptive.unwrap_or(true),
        );
        let limiter = crate::modules::rate_limiting::rate_limiter()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        limiter
            .get_configs()
            .into_iter()
            .find(|c| c.service == service)
            .ok_or_else(|| async_graphql::Error::new("Rate limiter config not found"))
    }

    /// V49.0: 配置服务熔断器
    async fn configure_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: crate::modules::rate_limiting::CircuitBreakerConfigInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CircuitBreakerStateGql> {
        configure_circuit_breaker(
            &service,
            config.failure_threshold,
            config.recovery_timeout_sec,
            config.half_open_max_requests,
        );
        let mut mgr = circuit_breaker_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        mgr.get_state(&service)
            .ok_or_else(|| async_graphql::Error::new("Circuit breaker state not found"))
    }

    /// V49.0: 重置服务熔断器
    async fn reset_circuit_breaker(
        &self,
        _ctx: &Context<'_>,
        service: String,
    ) -> async_graphql::Result<bool> {
        reset_circuit_breaker(&service);
        Ok(true)
    }

    /// V49.0: 配置服务降级策略
    async fn configure_degradation(
        &self,
        _ctx: &Context<'_>,
        service: String,
        config: DegradationConfigInput,
    ) -> async_graphql::Result<ServiceDegradationConfigGql> {
        configure_degradation(
            &service,
            config.enabled,
            &config.strategy,
            config.fallback_ttl_sec,
            config.max_degradation_duration_sec,
        );
        let mgr = circuit_breaker_manager()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        mgr.get_degradation_config(&service)
            .ok_or_else(|| async_graphql::Error::new("Degradation config not found"))
    }

    /// V49.0: 注册服务实例
    async fn register_instance(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        url: String,
    ) -> async_graphql::Result<InstanceHealthGql> {
        register_service_instance(&service, &instance_id, &url);
        mark_instance_healthy(&service, &instance_id);
        let router = load_aware_router()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let healths = router.get_instance_healths(&service);
        healths
            .into_iter()
            .find(|h| h.instance_id == instance_id)
            .ok_or_else(|| async_graphql::Error::new("Instance not found after registration"))
    }

    /// V49.0: 更新实例负载指标
    async fn update_instance_metrics(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
        cpu_usage: f64,
        memory_usage: f64,
        active_requests: u64,
        queue_length: u64,
        latency_ms: f64,
        error_rate: f64,
    ) -> async_graphql::Result<LoadMetricsGql> {
        update_instance_metrics(
            &service,
            &instance_id,
            cpu_usage,
            memory_usage,
            active_requests,
            queue_length,
            latency_ms,
            error_rate,
        );
        let metrics = get_load_metrics(&service);
        metrics
            .into_iter()
            .find(|m| m.instance_id == instance_id)
            .ok_or_else(|| async_graphql::Error::new("Metrics not found after update"))
    }

    /// V49.0: 标记实例为健康
    async fn mark_instance_healthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        mark_instance_healthy(&service, &instance_id);
        Ok(true)
    }

    /// V49.0: 标记实例为不健康（同时记录熔断失败）
    async fn mark_instance_unhealthy(
        &self,
        _ctx: &Context<'_>,
        service: String,
        instance_id: String,
    ) -> async_graphql::Result<bool> {
        mark_instance_unhealthy(&service, &instance_id);
        circuit_record_failure(&service);
        Ok(true)
    }

    /// V49.0: 创建路由规则
    async fn set_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule: RoutingRuleInput,
    ) -> async_graphql::Result<RoutingRuleGql> {
        Ok(set_routing_rule(
            &rule.service,
            &rule.condition,
            &rule.target_instance,
            rule.priority.unwrap_or(100),
        ))
    }

    /// V49.0: 删除路由规则
    async fn delete_routing_rule(
        &self,
        _ctx: &Context<'_>,
        rule_id: String,
    ) -> async_graphql::Result<bool> {
        Ok(delete_routing_rule(&rule_id))
    }

    // ==================== V49.0 Phase 19: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// AI 查询路由分析
    async fn ai_route_query(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiRoutingDecisionGql> {
        Ok(crate::modules::rate_limiting::ai_route_query(&query))
    }

    /// AI 查询意图识别
    async fn ai_detect_intent(
        &self,
        _ctx: &Context<'_>,
        query: String,
    ) -> async_graphql::Result<AiQueryIntent> {
        Ok(crate::modules::rate_limiting::ai_detect_intent(&query))
    }

    /// 获取指定名称的 Stitched Schema
    async fn stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<StitchedSchemaGql> {
        Ok(crate::modules::rate_limiting::stitch_schema(&name))
    }

    /// 获取所有已注册的子 Schema 列表
    async fn stitched_sub_schemas(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<SubSchemaEntryGql>> {
        Ok(crate::modules::rate_limiting::stitch_list_sub_schemas())
    }

    /// 获取字段映射规则列表
    async fn stitched_field_mappings(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<FieldMappingRuleGql>> {
        Ok(crate::modules::rate_limiting::stitch_list_field_mappings())
    }

    /// 智能缓存整体统计
    async fn cache_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::rate_limiting::CacheStatsGql> {
        Ok(crate::modules::rate_limiting::cache_stats())
    }

    /// 查询单个缓存条目
    async fn cache_get_entry(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_get_entry(&key))
    }

    /// 按模式列出缓存条目
    async fn cache_list_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_list_entries(
            pattern.as_deref(),
        ))
    }

    /// 列出所有缓存策略
    async fn cache_list_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::rate_limiting::CachePolicyGql>> {
        Ok(crate::modules::rate_limiting::cache_list_policies())
    }

    // ==================== V50.0 Phase 20: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 获取持久化查询
    async fn persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::get_persisted_query(
            &query_hash,
        ))
    }

    /// 列出持久化查询
    async fn persisted_queries(
        &self,
        _ctx: &Context<'_>,
        page: Option<u32>,
        page_size: Option<u32>,
        status: Option<crate::modules::query_governance::QueryStatus>,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryListGql> {
        Ok(crate::modules::query_governance::list_persisted_queries(
            page.unwrap_or(1),
            page_size.unwrap_or(20),
            status,
        ))
    }

    /// 按标签搜索持久化查询
    async fn persisted_queries_by_tag(
        &self,
        _ctx: &Context<'_>,
        tag: String,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::search_persisted_queries_by_tag(&tag))
    }

    /// 获取审计统计
    async fn audit_stats(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<crate::modules::query_governance::AuditStatsGql> {
        Ok(crate::modules::query_governance::get_audit_stats())
    }

    /// 查询审计日志
    async fn audit_entries(
        &self,
        _ctx: &Context<'_>,
        filter: crate::modules::query_governance::QueryAuditFilterInput,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryAuditEntryGql>> {
        Ok(crate::modules::query_governance::query_audit_entries(
            filter,
            page.unwrap_or(1),
            page_size.unwrap_or(20),
        ))
    }

    /// 获取查询配额
    async fn query_quota(
        &self,
        _ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryQuotaGql>> {
        Ok(crate::modules::query_governance::get_query_quota(
            &entity_type,
            &entity_id,
        ))
    }

    /// 获取审批请求
    async fn approval_request(
        &self,
        _ctx: &Context<'_>,
        request_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        Ok(crate::modules::query_governance::get_approval_request(
            &request_id,
        ))
    }

    /// 列出待审批请求
    async fn pending_approval_requests(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::QueryApprovalRequestGql>> {
        Ok(crate::modules::query_governance::list_pending_approval_requests())
    }

    /// 获取治理策略
    async fn governance_policy(
        &self,
        _ctx: &Context<'_>,
        policy_id: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::GovernancePolicyGql>> {
        Ok(crate::modules::query_governance::get_governance_policy(
            &policy_id,
        ))
    }

    /// 列出治理策略
    async fn governance_policies(
        &self,
        _ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<crate::modules::query_governance::GovernancePolicyGql>> {
        Ok(crate::modules::query_governance::list_governance_policies())
    }

    /// 获取字段访问控制
    async fn field_access_control(
        &self,
        _ctx: &Context<'_>,
        field_path: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::FieldAccessControlGql>>
    {
        Ok(crate::modules::query_governance::get_field_access_control(
            &field_path,
        ))
    }

    /// 检查查询治理
    async fn check_governance(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        user_id: String,
        user_roles: Vec<String>,
        query_fields: Vec<String>,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernanceCheckResultGql> {
        Ok(crate::modules::query_governance::check_query_governance(
            &query_hash,
            &user_id,
            &user_roles,
            &query_fields,
        ))
    }

    // ==================== V49.0 Phase 19 Mutation: AI 查询路由 + Schema Stitching + 智能缓存 ====================

    /// 注册/更新子 Schema
    async fn register_sub_schema(
        &self,
        _ctx: &Context<'_>,
        entry: crate::modules::rate_limiting::SubSchemaEntryInput,
    ) -> async_graphql::Result<crate::modules::rate_limiting::SubSchemaEntryGql> {
        crate::modules::rate_limiting::register_sub_schema(entry)
    }

    /// 移除子 Schema
    async fn remove_sub_schema(
        &self,
        _ctx: &Context<'_>,
        service_name: String,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::remove_sub_schema(&service_name)
    }

    /// 设置类型合并策略
    async fn set_merge_strategy(
        &self,
        _ctx: &Context<'_>,
        strategy: crate::modules::rate_limiting::TypeMergeStrategy,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::set_merge_strategy(strategy)
    }

    /// 添加字段映射规则
    async fn add_field_mapping(
        &self,
        _ctx: &Context<'_>,
        rule: crate::modules::rate_limiting::FieldMappingRuleInput,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::add_field_mapping(rule)
    }

    /// 移除字段映射规则
    async fn remove_field_mapping(
        &self,
        _ctx: &Context<'_>,
        source_field: String,
        target_field: String,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::remove_field_mapping(&source_field, &target_field)
    }

    /// 刷新 Stitched Schema
    async fn refresh_stitched_schema(
        &self,
        _ctx: &Context<'_>,
        name: String,
    ) -> async_graphql::Result<crate::modules::rate_limiting::StitchedSchemaGql> {
        crate::modules::rate_limiting::refresh_stitched_schema(&name)
    }

    /// 设置缓存条目
    async fn cache_set(
        &self,
        _ctx: &Context<'_>,
        key: String,
        value: String,
        policy: Option<crate::modules::rate_limiting::CachePolicyInput>,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        crate::modules::rate_limiting::cache_set(&key, value, policy)
    }

    /// 获取缓存条目
    async fn cache_get(
        &self,
        _ctx: &Context<'_>,
        key: String,
    ) -> async_graphql::Result<Option<crate::modules::rate_limiting::CacheEntryGql>> {
        Ok(crate::modules::rate_limiting::cache_get_entry(&key))
    }

    /// 删除缓存条目
    async fn cache_delete(&self, _ctx: &Context<'_>, key: String) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_delete(&key)
    }

    /// 按模式清空智能缓存条目
    async fn cache_clear_entries(
        &self,
        _ctx: &Context<'_>,
        pattern: Option<String>,
    ) -> async_graphql::Result<u64> {
        crate::modules::rate_limiting::cache_clear(pattern.as_deref())
    }

    /// 设置缓存策略
    async fn cache_set_policy(
        &self,
        _ctx: &Context<'_>,
        pattern: String,
        policy: crate::modules::rate_limiting::CachePolicyInput,
    ) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_set_policy(&pattern, policy)
    }

    /// 清空缓存策略
    async fn cache_clear_policies(&self, _ctx: &Context<'_>) -> async_graphql::Result<bool> {
        crate::modules::rate_limiting::cache_clear_policies()
    }

    // ==================== V50.0 Phase 20 Mutation: 持久化查询管理 + 查询审计 + 企业级治理 ====================

    /// 注册持久化查询
    async fn register_persisted_query(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::PersistedQueryInput,
    ) -> async_graphql::Result<crate::modules::query_governance::PersistedQueryGql> {
        Ok(crate::modules::query_governance::register_persisted_query(
            input,
        ))
    }

    /// 更新持久化查询状态
    async fn update_persisted_query_status(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        status: crate::modules::query_governance::QueryStatus,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::update_persisted_query_status(&query_hash, status))
    }

    /// 删除持久化查询
    async fn delete_persisted_query(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
    ) -> async_graphql::Result<bool> {
        Ok(crate::modules::query_governance::delete_persisted_query(
            &query_hash,
        ))
    }

    /// 添加持久化查询标签
    async fn add_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::add_persisted_query_tag(
            &query_hash,
            &tag,
        ))
    }

    /// 移除持久化查询标签
    async fn remove_persisted_query_tag(
        &self,
        _ctx: &Context<'_>,
        query_hash: String,
        tag: String,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::PersistedQueryGql>> {
        Ok(crate::modules::query_governance::remove_persisted_query_tag(&query_hash, &tag))
    }

    /// 设置查询配额
    async fn set_query_quota(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::QueryQuotaInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryQuotaGql> {
        Ok(crate::modules::query_governance::set_query_quota(input))
    }

    /// 创建审批请求
    async fn create_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalRequestInput,
    ) -> async_graphql::Result<crate::modules::query_governance::QueryApprovalRequestGql> {
        Ok(crate::modules::query_governance::create_approval_request(
            input,
        ))
    }

    /// 审批请求
    async fn review_approval_request(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::ApprovalReviewInput,
    ) -> async_graphql::Result<Option<crate::modules::query_governance::QueryApprovalRequestGql>>
    {
        Ok(crate::modules::query_governance::review_approval_request(
            input,
        ))
    }

    /// 创建治理策略
    async fn create_governance_policy(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::GovernancePolicyInput,
    ) -> async_graphql::Result<crate::modules::query_governance::GovernancePolicyGql> {
        Ok(crate::modules::query_governance::create_governance_policy(
            input,
        ))
    }

    /// 设置字段访问控制
    async fn set_field_access_control(
        &self,
        _ctx: &Context<'_>,
        input: crate::modules::query_governance::FieldAccessControlInput,
    ) -> async_graphql::Result<crate::modules::query_governance::FieldAccessControlGql> {
        Ok(crate::modules::query_governance::set_field_access_control(
            input,
        ))
    }
}

// ==================== Subscription 根类型（V34.0 Phase 4） ====================

pub struct SubscriptionRoot;

/// 服务健康监控的目标服务列表
const SUBSCRIPTION_SERVICES: &[(&str, &str)] = &[
    ("erp", "http://localhost:8010"),
    ("crm", "http://localhost:8029"),
    ("hrm", "http://localhost:8020"),
    ("finance", "http://localhost:8011"),
    ("mes", "http://localhost:8030"),
    ("workflow", "http://localhost:8000"),
    ("iam", "http://localhost:8000"),
    ("notification", "http://localhost:8084"),
];

#[Subscription]
impl SubscriptionRoot {
    /// 订阅服务健康状态变化（每 30 秒推送所有服务状态）
    /// V37.0: 每次推送事件时递增 CDN 缓存版本号，使 GET GraphQL 缓存失效
    /// V38.0: 添加订阅计数，开始时递增，结束时递减
    async fn service_health_changed(&self) -> ReceiverStream<ServiceHealthGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                invalidate_cache();
                let mut all_ok = true;
                for (name, url) in SUBSCRIPTION_SERVICES {
                    let healthy = probe_service_health(name, url).await;
                    if tx
                        .send(ServiceHealthGql {
                            service: (*name).to_string(),
                            healthy,
                            url: (*url).to_string(),
                        })
                        .await
                        .is_err()
                    {
                        all_ok = false;
                        break;
                    }
                }
                if !all_ok {
                    return;
                }
            }
        });
        ReceiverStream::new(rx)
    }

    // ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

    /// 订阅主数据变更事件（可按 domain 过滤）
    ///
    /// 当主数据（客户/供应商/物料/员工等）发生变更时推送事件。
    /// 客户端可通过 domain 参数过滤特定域的变更。
    async fn master_data_changed(
        &self,
        ctx: &Context<'_>,
        domain: Option<String>,
    ) -> ReceiverStream<MasterDataEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::MasterDataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<MasterDataEventGql>(value) {
                            // 按 domain 过滤
                            if let Some(ref d) = domain {
                                if !event.domain.eq_ignore_ascii_case(d) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅通知接收事件（按 user_id 过滤）
    ///
    /// 当用户收到新通知时推送事件。客户端必须指定 user_id 进行过滤。
    async fn notification_received(
        &self,
        ctx: &Context<'_>,
        user_id: String,
    ) -> ReceiverStream<NotificationEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::NotificationReceived);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<NotificationEventGql>(value) {
                            if event.user_id != user_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅工作流任务分配事件（按 assignee_id 过滤）
    ///
    /// 当有新工作流任务分配给用户时推送事件。客户端必须指定 assignee_id 进行过滤。
    async fn workflow_task_assigned(
        &self,
        ctx: &Context<'_>,
        assignee_id: String,
    ) -> ReceiverStream<WorkflowTaskEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::WorkflowTaskAssigned);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<WorkflowTaskEventGql>(value) {
                            if event.assignee_id != assignee_id {
                                continue;
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅订单状态变更事件（可按 order_type 过滤）
    ///
    /// 当订单状态发生变更时推送事件。客户端可通过 order_type 参数过滤特定类型。
    async fn order_status_changed(
        &self,
        ctx: &Context<'_>,
        order_type: Option<String>,
    ) -> ReceiverStream<OrderStatusEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::OrderStatusChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<OrderStatusEventGql>(value) {
                            if let Some(ref ot) = order_type {
                                if !event.order_type.eq_ignore_ascii_case(ot) {
                                    continue;
                                }
                            }
                            if tx.send(event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// V43.0: 订阅数据变更事件（通用实体级实时推送）
    ///
    /// 当任何实体数据发生变更时推送事件，支持按 entity_type 和 update_type 过滤。
    /// 相比主数据变更事件，此频道提供更细粒度的实体级数据，包含完整 data 和 delta。
    async fn data_changed(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<DataChangeEventGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let event_bus = ctx
            .data::<Arc<EventBus>>()
            .cloned()
            .unwrap_or_else(|_| global_event_bus().clone());

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut recv = event_bus.subscribe(SubscriptionChannel::DataChanged);
            loop {
                match recv.recv().await {
                    Ok(value) => {
                        if let Ok(event) = serde_json::from_value::<DataChangeEvent>(value) {
                            if let Some(ref et) = entity_type {
                                if !event.entity_type.eq_ignore_ascii_case(et) {
                                    continue;
                                }
                            }
                            if let Some(ref ut) = update_type {
                                let event_ut = match event.update_type {
                                    UpdateType::Created => "created",
                                    UpdateType::Updated => "updated",
                                    UpdateType::Deleted => "deleted",
                                    UpdateType::Delta => "delta",
                                    UpdateType::Full => "full",
                                };
                                if !event_ut.eq_ignore_ascii_case(ut) {
                                    continue;
                                }
                            }
                            let gql_event = DataChangeEventGql {
                                entity_type: event.entity_type,
                                entity_id: event.entity_id,
                                update_type: event.update_type.into(),
                                data: event.data,
                                delta: event.delta,
                                version: event.version,
                                timestamp: event.timestamp,
                                source: event.source,
                            };
                            if tx.send(gql_event).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        ReceiverStream::new(rx)
    }

    // ==================== V47.0 Phase 17: 实时数据流 + 增量更新 + 状态同步订阅 ====================

    /// 订阅实时数据流（可按 entity_type / update_type 过滤）
    ///
    /// V47.0: 客户端订阅特定实体类型的实时数据流，当数据发生
    /// Insert/Update/Delete/Sync/Snapshot 时推送增量更新事件。
    async fn realtime_data_stream(
        &self,
        entity_type: Option<String>,
        update_type: Option<String>,
    ) -> ReceiverStream<RealtimeStreamUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let ut = update_type.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut last_seq: i64 = 0;
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let updates =
                    RealtimeStreamManager::get_stream_updates(&target_et, last_seq, Some(50));
                for u in updates {
                    last_seq = last_seq.max(u.sequence_number);
                    if let Some(ref ut) = ut {
                        let type_str = match u.stream_type {
                            StreamUpdateTypeGql::Insert => "insert",
                            StreamUpdateTypeGql::Update => "update",
                            StreamUpdateTypeGql::Delete => "delete",
                            StreamUpdateTypeGql::Sync => "sync",
                            StreamUpdateTypeGql::Snapshot => "snapshot",
                        };
                        if !type_str.eq_ignore_ascii_case(ut) {
                            continue;
                        }
                    }
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅增量更新（可按 entity_type / entity_id 过滤）
    ///
    /// V47.0: 推送待应用的增量更新（Delta），客户端可基于 base_version 做差异合并。
    async fn incremental_updates(
        &self,
        entity_type: Option<String>,
        entity_id: Option<String>,
    ) -> ReceiverStream<IncrementalUpdateGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let et = entity_type.clone();
        let eid = entity_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(500));
            let mut seen: HashSet<String> = HashSet::new();
            loop {
                interval.tick().await;
                let target_et = et.clone().unwrap_or_else(|| "order".to_string());
                let target_eid = eid.clone().unwrap_or_default();
                let updates =
                    IncrementalUpdateEngine::get_pending_updates(&target_et, &target_eid, 0);
                for u in updates {
                    if seen.contains(&u.update_id) {
                        continue;
                    }
                    seen.insert(u.update_id.clone());
                    if tx.send(u).await.is_err() {
                        return;
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }

    /// 订阅同步状态变更（可按 client_id 过滤）
    ///
    /// V47.0: 当同步会话状态发生变更（InSync/Syncing/Conflict/Error/Offline）时推送事件。
    async fn sync_state_changed(
        &self,
        client_id: Option<String>,
    ) -> ReceiverStream<SyncSessionGql> {
        increment_subscriptions();
        let (tx, rx) = mpsc::channel(32);
        let cid = client_id.clone();

        tokio::spawn(async move {
            let _defer = DeferSubscriptionCount;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
            let mut last_count: usize = 0;
            loop {
                interval.tick().await;
                let history = StateSyncManager::get_sync_history(cid.as_deref(), Some(10));
                if history.len() != last_count {
                    last_count = history.len();
                    if let Some(latest) = history.first() {
                        if tx.send(latest.clone()).await.is_err() {
                            return;
                        }
                    }
                }
            }
        });

        ReceiverStream::new(rx)
    }
}

struct DeferSubscriptionCount;

impl Drop for DeferSubscriptionCount {
    fn drop(&mut self) {
        decrement_subscriptions();
    }
}

// ==================== V37.0 Phase 7: GraphQL 订阅 CDN 缓存失效 ====================

/// 全局缓存版本号
/// 每次订阅事件推送时递增，用于 CDN 缓存失效。
/// GET GraphQL 响应包含 ETag 头，客户端可据此判断缓存是否过期。
static CACHE_VERSION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// 获取当前缓存版本号
pub fn get_cache_version() -> u64 {
    CACHE_VERSION.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增缓存版本号（订阅事件推送时调用）
/// 这会使所有基于旧版本号的 CDN 缓存失效。
pub fn invalidate_cache() {
    CACHE_VERSION.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] CDN 缓存版本递增至 {}", get_cache_version());
}

// ==================== V38.0: 活跃订阅计数器 ====================

/// 全局活跃订阅数计数器
/// 每个订阅开始时递增，结束时递减。
static ACTIVE_SUBSCRIPTIONS: std::sync::atomic::AtomicUsize =
    std::sync::atomic::AtomicUsize::new(0);

/// 获取当前活跃订阅数
pub fn get_active_subscriptions() -> usize {
    ACTIVE_SUBSCRIPTIONS.load(std::sync::atomic::Ordering::Relaxed)
}

/// 递增活跃订阅数
pub fn increment_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递增至 {}", get_active_subscriptions());
}

/// 递减活跃订阅数
pub fn decrement_subscriptions() {
    ACTIVE_SUBSCRIPTIONS.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    tracing::debug!("[graphql] 活跃订阅数递减至 {}", get_active_subscriptions());
}

// ==================== Schema 构建 ====================

pub type PortalSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

/// V35.0 Phase 5: 查询复杂度限制
pub const MAX_QUERY_COMPLEXITY: usize = 1000;
/// V35.0 Phase 5: 查询深度限制
pub const MAX_QUERY_DEPTH: usize = 10;
/// V35.0 Phase 6: APQ 缓存容量
const APQ_CACHE_CAPACITY: usize = 256;
/// V40.0: 全局安全事件存储（内存环形缓冲）
pub fn build_schema(state: AppState) -> PortalSchema {
    let pool = state.pool.clone();

    // V42.0 Track E: 初始化企业级安全规则（字段权限 + 掩码规则）
    init_enterprise_security();
    // V42.0 Track B: 初始化联邦网关 V2 服务注册表（5 个服务元数据）
    init_service_registry();
    // V43.0 Track E: 初始化 AI 辅助功能（示例数据 + 缓存推荐）
    init_ai_assistance();
    // V45.0 Track E: 初始化 Schema 治理（5 个服务预置 Schema + 默认契约测试）
    init_schema_governance();
    // V49.0: 初始化自适应限流 + 熔断降级 + 负载感知路由
    init_rate_limiting();
    // V50.0: 初始化持久化查询管理 + 查询审计 + 企业级治理
    init_query_governance();
    // V51.0: 初始化 Schema 演进 + 破坏性变更检测 + 版本协商
    init_schema_versioning();

    Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)
        .data(state)
        // V39.0 Phase 9: 注入 EventBus（多频道事件总线）
        .data(global_event_bus().clone())
        // V35.0 Phase 5: 注册 DataLoader
        .data(DataLoader::new(ServiceHealthLoader, tokio::spawn))
        .data(DataLoader::new(TodoLoader::new(pool), tokio::spawn))
        // V35.0 Phase 5: 查询复杂度限制（防止恶意复杂查询）
        .limit_complexity(MAX_QUERY_COMPLEXITY)
        // V35.0 Phase 5: 查询深度限制（防止过深嵌套查询）
        .limit_depth(MAX_QUERY_DEPTH)
        // V35.0 Phase 6: Apollo 持久化查询（APQ）— 查询白名单 + CDN 缓存基础
        // 前端发送查询哈希，后端从 LRU 缓存查找查询字符串，减少请求体积
        .extension(
            async_graphql::extensions::apollo_persisted_queries::ApolloPersistedQueries::new(
                async_graphql::extensions::apollo_persisted_queries::LruCacheStorage::new(
                    APQ_CACHE_CAPACITY,
                ),
            ),
        )
        .finish()
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    include!("graphql_schema_tests.rs");
}
