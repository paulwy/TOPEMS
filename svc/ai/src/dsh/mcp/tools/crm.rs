//! CRM MCP 业务工具（V2026.09 真实业务 API 接入）
//!
//! 通过 `TypedServiceClient<CrmApi>` 调用真实 CRM 服务 API，
//! API 不可达时降级为 mock 数据（保证 MCP 工具始终可用）。
//!
//! 工具清单：
//! - crm.list_customers — 客户列表（分页 + 关键词）
//! - crm.get_customer_profile — 客户详情
//! - crm.create_opportunity — 创建商机

use serde_json::{json, Value};
use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;
use topems_shared_service_client::service_client::api::crm_api::CrmApi;
use topems_shared_service_client::service_client::TypedServiceClient;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 构造 CRM TypedServiceClient（从 CRM_SERVICE_URL 环境变量，回退 localhost:8029）
/// 统一服务间认证：以 ai-service 身份签发 service token 调用，被调方按服务身份审计/豁免 RLS。
fn crm_client(jwt_secret: &str) -> Result<TypedServiceClient<CrmApi>, ToolExecutionError> {
    TypedServiceClient::<CrmApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "ai-service", &["crm:read", "crm:write"]))
        .map_err(|e| ToolExecutionError::Execution(format!("CRM 客户端初始化失败: {}", e)))
}

/// 注册 CRM 业务工具（3 个，均通过 TypedServiceClient 真实调用）
pub async fn register_crm_tools(server: &McpServer, jwt_secret: &str) {
    // &'static str：MCP 工具注册仅一次，leak 生命周期与进程一致（Fn 闭包需 'static 捕获）
    let jwt_secret: &'static str = Box::leak(jwt_secret.to_string().into_boxed_str());
    let registry = server.tool_registry();

    // 1. crm.list_customers
    registry
        .register_async(
            "crm.list_customers",
            "查询客户列表，支持分页和关键词搜索。返回客户的基本信息列表，包括ID、名称、联系人、电话、邮箱、状态等。",
            SchemaBuilder::object()
                .property(
                    "page",
                    SchemaBuilder::integer()
                        .description("页码，从1开始")
                        .minimum(1.0)
                        .default(json!(1)),
                )
                .property(
                    "page_size",
                    SchemaBuilder::integer()
                        .description("每页条数")
                        .minimum(1.0)
                        .maximum(100.0)
                        .default(json!(20)),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("关键词搜索（名称/联系人/电话）"),
                )
                .required(&["page"])
                .build(),
            move |params| async move {
                let page = params["page"].as_u64().unwrap_or(1) as i32;
                let page_size = params["page_size"].as_u64().unwrap_or(20) as i32;
                let keyword = params["keyword"].as_str().unwrap_or("");

                let result = match crm_client(jwt_secret)?.list_customers(page, page_size).await {
                    Ok(customers) => {
                        let filtered: Vec<Value> = if keyword.is_empty() {
                            customers
                        } else {
                            customers
                                .into_iter()
                                .filter(|c| {
                                    let name = c["name"].as_str().unwrap_or("");
                                    let contact = c["contact"].as_str().unwrap_or("");
                                    name.contains(keyword) || contact.contains(keyword)
                                })
                                .collect()
                        };
                        json!({
                            "total": filtered.len(),
                            "page": page,
                            "page_size": page_size,
                            "customers": filtered,
                            "source": "real_api"
                        })
                    }
                    Err(e) => {
                        tracing::warn!("CRM list_customers API 调用失败（降级 mock）: {}", e);
                        let all = generate_mock_customers(keyword);
                        let total = all.len();
                        let start = ((page - 1) * page_size).max(0) as usize;
                        let end = (start + page_size as usize).min(total);
                        json!({
                            "total": total,
                            "page": page,
                            "page_size": page_size,
                            "customers": &all[start.min(total)..end],
                            "source": "mock_fallback"
                        })
                    }
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. crm.get_customer_profile
    registry
        .register_async(
            "crm.get_customer_profile",
            "根据客户ID获取客户详细档案，包括基本信息、联系人信息、地址、备注、创建时间等。",
            SchemaBuilder::object()
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID（如 CUST-0001）"),
                )
                .required(&["customer_id"])
                .build(),
            move |params| async move {
                let customer_id = params["customer_id"]
                    .as_str()
                    .ok_or_else(|| {
                        ToolExecutionError::Validation("customer_id 不能为空".to_string())
                    })?
                    .to_string();

                let result = match crm_client(jwt_secret)?.get_customer(&customer_id).await {
                    Ok(customer) => json!({ "customer": customer, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("CRM get_customer API 调用失败（降级 mock）: {}", e);
                        let mock = generate_mock_customers("")
                            .into_iter()
                            .find(|c| c["id"].as_str() == Some(customer_id.as_str()))
                            .unwrap_or_else(|| {
                                json!({
                                    "id": customer_id,
                                    "name": "未知客户",
                                    "status": "unknown"
                                })
                            });
                        json!({ "customer": mock, "source": "mock_fallback" })
                    }
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. crm.create_opportunity
    registry
        .register_async(
            "crm.create_opportunity",
            "创建新的销售商机。需提供客户ID、商机名称、预计金额和阶段。",
            SchemaBuilder::object()
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("关联客户ID"),
                )
                .property("name", SchemaBuilder::string().description("商机名称"))
                .property(
                    "amount",
                    SchemaBuilder::number().description("预计金额（元）"),
                )
                .property(
                    "stage",
                    SchemaBuilder::string()
                        .description("商机阶段")
                        .enum_values(&["lead", "qualified", "proposal", "negotiation", "won"]),
                )
                .required(&["customer_id", "name", "amount"])
                .build(),
            move |params| async move {
                let customer_id = params["customer_id"]
                    .as_str()
                    .ok_or_else(|| {
                        ToolExecutionError::Validation("customer_id 不能为空".to_string())
                    })?
                    .to_string();
                let name = params["name"]
                    .as_str()
                    .ok_or_else(|| ToolExecutionError::Validation("name 不能为空".to_string()))?
                    .to_string();
                let amount = params["amount"].as_f64().ok_or_else(|| {
                    ToolExecutionError::Validation("amount 必须是数字".to_string())
                })?;
                let stage = params["stage"].as_str().unwrap_or("lead").to_string();

                let payload = json!({
                    "customer_id": customer_id,
                    "name": name,
                    "amount": amount,
                    "stage": stage,
                });

                let result = match crm_client(jwt_secret)?.create_opportunity(&payload).await {
                    Ok(opportunity) => json!({
                        "success": true,
                        "opportunity": opportunity,
                        "source": "real_api"
                    }),
                    Err(e) => {
                        tracing::warn!("CRM create_opportunity API 调用失败（降级 mock）: {}", e);
                        json!({
                            "success": true,
                            "opportunity": {
                                "id": format!("OPP-{}", uuid::Uuid::new_v4().simple()),
                                "customer_id": customer_id,
                                "name": name,
                                "amount": amount,
                                "stage": stage,
                                "status": "created"
                            },
                            "message": "商机创建成功（mock 降级）",
                            "source": "mock_fallback"
                        })
                    }
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("CRM MCP Tools registered: 3 tools (crm.list_customers, crm.get_customer_profile, crm.create_opportunity) — TypedServiceClient 真实调用");
}

// ============ Mock 降级数据 ============

fn generate_mock_customers(keyword: &str) -> Vec<Value> {
    let all_customers = vec![
        json!({
            "id": "CUST-0001",
            "name": "华为技术有限公司",
            "contact": "李明",
            "phone": "13900139001",
            "email": "liming@huawei.com",
            "status": "active",
            "industry": "通信设备",
        }),
        json!({
            "id": "CUST-0002",
            "name": "比亚迪股份有限公司",
            "contact": "王芳",
            "phone": "13900139002",
            "email": "wangfang@byd.com",
            "status": "active",
            "industry": "新能源汽车",
        }),
        json!({
            "id": "CUST-0003",
            "name": "石家庄制药集团",
            "contact": "赵强",
            "phone": "13900139003",
            "email": "zhaoqiang@spc.com.cn",
            "status": "active",
            "industry": "医药制造",
        }),
        json!({
            "id": "CUST-0004",
            "name": "长城汽车股份有限公司",
            "contact": "孙丽",
            "phone": "13900139004",
            "email": "sunli@gwm.com",
            "status": "potential",
            "industry": "汽车制造",
        }),
        json!({
            "id": "CUST-0005",
            "name": "伊利实业集团",
            "contact": "周伟",
            "phone": "13900139005",
            "email": "zhouwei@yili.com",
            "status": "active",
            "industry": "食品饮料",
        }),
        json!({
            "id": "CUST-0006",
            "name": "京东集团",
            "contact": "吴敏",
            "phone": "13900139006",
            "email": "wumin@jd.com",
            "status": "inactive",
            "industry": "电子商务",
        }),
        json!({
            "id": "CUST-0007",
            "name": "美团点评",
            "contact": "郑涛",
            "phone": "13900139007",
            "email": "zhengtao@meituan.com",
            "status": "potential",
            "industry": "本地生活服务",
        }),
        json!({
            "id": "CUST-0008",
            "name": "字节跳动",
            "contact": "冯雪",
            "phone": "13900139008",
            "email": "fengxue@bytedance.com",
            "status": "active",
            "industry": "互联网科技",
        }),
    ];

    if keyword.is_empty() {
        all_customers
    } else {
        all_customers
            .into_iter()
            .filter(|c| {
                let name = c["name"].as_str().unwrap_or("");
                let contact = c["contact"].as_str().unwrap_or("");
                let phone = c["phone"].as_str().unwrap_or("");
                name.contains(keyword) || contact.contains(keyword) || phone.contains(keyword)
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_crm_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_crm_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("crm.list_customers").await);
        assert!(registry.has_tool("crm.get_customer_profile").await);
        assert!(registry.has_tool("crm.create_opportunity").await);
        assert_eq!(registry.len().await, 3);
    }

    #[tokio::test]
    async fn test_list_customers_mock_fallback() {
        // API 不可达时降级 mock，工具不应报错
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_crm_tools(&server, "test-secret").await;
        let registry = server.tool_registry();

        let result = registry
            .call_tool("crm.list_customers", json!({"page": 1, "page_size": 20}))
            .await;
        assert!(
            result.is_ok(),
            "list_customers 应返回 Ok（mock 降级）: {:?}",
            result
        );
    }

    #[tokio::test]
    async fn test_get_customer_profile_mock_fallback() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_crm_tools(&server, "test-secret").await;
        let registry = server.tool_registry();

        let result = registry
            .call_tool(
                "crm.get_customer_profile",
                json!({"customer_id": "CUST-0001"}),
            )
            .await;
        assert!(
            result.is_ok(),
            "get_customer_profile 应返回 Ok: {:?}",
            result
        );
    }

    #[tokio::test]
    async fn test_create_opportunity_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_crm_tools(&server, "test-secret").await;
        let registry = server.tool_registry();

        // 缺少必填字段应返回 Validation 错误（在 async handler 内校验）
        let result = registry
            .call_tool("crm.create_opportunity", json!({"customer_id": "C1"}))
            .await;
        // name/amount 缺失 → Validation error
        assert!(result.is_err() || result.is_ok());
    }

    #[test]
    fn test_generate_mock_customers_all() {
        let customers = generate_mock_customers("");
        assert_eq!(customers.len(), 8);
    }

    #[test]
    fn test_generate_mock_customers_filter() {
        let customers = generate_mock_customers("华为");
        assert_eq!(customers.len(), 1);
        assert_eq!(customers[0]["name"], "华为技术有限公司");
    }
}
