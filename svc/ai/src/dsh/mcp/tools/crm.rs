//! CRM MCP Tools — 客户关系管理业务工具。
//!
//! 注册 3 个 CRM 业务工具到 MCP Server：
//! - crm.list_customers — 查询客户列表
//! - crm.get_customer — 获取客户详情
//! - crm.create_customer — 创建客户
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 CRM API。

use serde_json::{json, Value};
use std::sync::Arc;

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 CRM 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - crm.list_customers — 查询客户列表（支持分页、搜索）
/// - crm.get_customer — 获取客户详情（按 ID）
/// - crm.create_customer — 创建客户（名称、联系人、电话、邮箱）
pub async fn register_crm_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. crm.list_customers
    registry
        .register(
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
                        .description("每页数量")
                        .minimum(1.0)
                        .maximum(100.0)
                        .default(json!(20)),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配客户名称、联系人、电话）"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("客户状态筛选")
                        .enum_values(&["active", "inactive", "potential", "churned"]),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let keyword = params["keyword"].as_str().unwrap_or("");

                // Mock 数据
                let customers = generate_mock_customers(keyword);
                let total = customers.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_customers = &customers[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "customers": page_customers,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. crm.get_customer
    registry
        .register(
            "crm.get_customer",
            "根据客户ID获取客户详细信息，包括基本信息、联系人信息、地址、备注、创建时间等。",
            SchemaBuilder::object()
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID，格式为 CUST-XXXX"),
                )
                .required(&["customer_id"])
                .build(),
            |params| {
                let customer_id = params["customer_id"].as_str().unwrap_or("");

                if customer_id.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "customer_id is required".to_string(),
                    ));
                }

                // Mock 数据
                let customer = json!({
                    "id": customer_id,
                    "name": "示例客户有限公司",
                    "contact": "张三",
                    "phone": "13800138000",
                    "email": "zhangsan@example.com",
                    "status": "active",
                    "industry": "制造业",
                    "address": "河北省石家庄市示例区示例路123号",
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-06-20T14:45:00Z",
                    "total_orders": 15,
                    "total_amount": 285000.00,
                    "last_contact_at": "2024-08-10T09:00:00Z",
                    "notes": "重要客户，每季度回访一次。对价格敏感，关注产品质量和交付周期。",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(customer.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. crm.create_customer
    registry
        .register(
            "crm.create_customer",
            "创建新客户。需要提供客户名称、联系人、电话等基本信息。创建成功后返回新客户的ID和完整信息。",
            SchemaBuilder::object()
                .property(
                    "name",
                    SchemaBuilder::string()
                        .description("客户名称（公司或个人姓名）")
                        .min_length(1)
                        .max_length(200),
                )
                .property(
                    "contact",
                    SchemaBuilder::string().description("联系人姓名"),
                )
                .property(
                    "phone",
                    SchemaBuilder::string().description("联系电话"),
                )
                .property(
                    "email",
                    SchemaBuilder::string().description("电子邮箱"),
                )
                .property(
                    "industry",
                    SchemaBuilder::string().description("所属行业"),
                )
                .property(
                    "address",
                    SchemaBuilder::string().description("详细地址"),
                )
                .property(
                    "notes",
                    SchemaBuilder::string().description("备注信息"),
                )
                .required(&["name", "contact", "phone"])
                .build(),
            |params| {
                let name = params["name"].as_str().unwrap_or("");
                let contact = params["contact"].as_str().unwrap_or("");
                let phone = params["phone"].as_str().unwrap_or("");

                if name.is_empty() || contact.is_empty() || phone.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "name, contact, phone are required".to_string(),
                    ));
                }

                // Mock 创建
                let customer_id = format!("CUST-{}", uuid::Uuid::new_v4().simple().to_string().get(..8).unwrap_or("00000000"));

                let customer = json!({
                    "id": customer_id,
                    "name": name,
                    "contact": contact,
                    "phone": phone,
                    "email": params["email"].as_str().unwrap_or(""),
                    "status": "potential",
                    "industry": params["industry"].as_str().unwrap_or(""),
                    "address": params["address"].as_str().unwrap_or(""),
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                    "notes": params["notes"].as_str().unwrap_or(""),
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(customer.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("CRM MCP Tools registered: 3 tools (crm.list_customers, crm.get_customer, crm.create_customer)");
}

/// 生成 mock 客户数据
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
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;

        let tools = server.tool_registry().list_tools().await;
        assert_eq!(tools.len(), 3);
        assert!(tools.iter().any(|t| t.name == "crm.list_customers"));
        assert!(tools.iter().any(|t| t.name == "crm.get_customer"));
        assert!(tools.iter().any(|t| t.name == "crm.create_customer"));
    }

    #[tokio::test]
    async fn test_list_customers_tool() {
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("crm.list_customers", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
    }

    #[tokio::test]
    async fn test_get_customer_tool() {
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("crm.get_customer", json!({"customer_id": "CUST-0001"}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
    }

    #[tokio::test]
    async fn test_create_customer_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;

        // Missing required fields should fail
        let result = server
            .tool_registry()
            .call_tool("crm.create_customer", json!({"name": "Test"}))
            .await;

        assert!(result.is_err());
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
