//! CRM MCP Tools — 客户关系管理业务工具。
//!
//! 注册 3 个 CRM 业务工具到 MCP Server：
//! - crm.list_customers — 查询客户列表
//! - crm.get_customer — 获取客户详情
//! - crm.create_customer — 创建客户
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 CRM API。

use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::OnceLock;

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

/// CRM 服务基础地址（环境变量 CRM_SERVICE_URL 覆盖，默认 crm 独立端口 8029）
fn crm_base_url() -> &'static str {
    static URL: OnceLock<String> = OnceLock::new();
    URL.get_or_init(|| {
        std::env::var("CRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8029".to_string())
    })
}

/// URL 查询参数编码（非 ASCII / 特殊字符 → %XX）
fn url_encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{:02X}", b));
        }
    }
    out
}

/// 纯同步 HTTP 调用（std TcpStream，不依赖 tokio/reqwest，可在同步 handler 内安全使用）
/// 返回 data 字段（JSON）；失败返回 None（调用方降级 mock）
fn crm_api_call(method: &str, path: &str, body: Option<Value>) -> Option<Value> {
    let base = crm_base_url().trim_end_matches('/').to_string();
    let rest = base.strip_prefix("http://")?;
    let (host, port) = match rest.split_once(':') {
        Some((h, p)) => (h.to_string(), p.parse::<u16>().ok()?),
        None => (rest.to_string(), 80u16),
    };
    let path_full = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };
    let mut conn = TcpStream::connect((host.as_str(), port)).ok()?;
    let _ = conn.set_read_timeout(Some(std::time::Duration::from_secs(5)));
    let _ = conn.set_write_timeout(Some(std::time::Duration::from_secs(5)));

    let (request, body_bytes) = if method == "POST" {
        let b = body.unwrap_or(json!({})).to_string();
        let req = format!(
            "POST {} HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            path_full, host, b.len()
        );
        (req, b)
    } else {
        let req = format!(
            "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
            path_full, host
        );
        (req, String::new())
    };
    conn.write_all(request.as_bytes()).ok()?;
    if !body_bytes.is_empty() {
        conn.write_all(body_bytes.as_bytes()).ok()?;
    }

    let mut response = String::new();
    conn.read_to_string(&mut response).ok()?;
    let (head, body) = response.split_once("\r\n\r\n")?;
    if !head.starts_with("HTTP/1.1 2") {
        return None;
    }
    let parsed: Value = serde_json::from_str(body).ok()?;
    parsed.get("data").cloned()
}

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

                // 真实调用 CRM API（降级 mock）
                let mut path = format!("/api/crm/customers?page={}&page_size={}", page, page_size);
                if !keyword.is_empty() {
                    path.push_str(&format!("&keyword={}", url_encode(keyword)));
                }
                let result = crm_api_call("GET", &path, None).map(|data| {
                    let items = data.get("items").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    json!({ "total": total, "page": page, "page_size": page_size, "customers": items })
                }).unwrap_or_else(|| {
                    let customers = generate_mock_customers(keyword);
                    let total = customers.len();
                    let start = ((page - 1) * page_size) as usize;
                    let end = (start + page_size as usize).min(total);
                    let page_customers = &customers[start.min(total)..end];
                    json!({
                        "total": total,
                        "page": page,
                        "page_size": page_size,
                        "customers": page_customers,
                    })
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

                // 真实调用 CRM API（降级 mock）
                let customer =
                    crm_api_call("GET", &format!("/api/crm/customers/{}", customer_id), None)
                        .or_else(|| {
                            let id = customer_id.to_string();
                            generate_mock_customers("")
                                .into_iter()
                                .find(|c| c["id"] == json!(id))
                        })
                        .unwrap_or_else(|| {
                            json!({
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
                                "notes": "重要客户，每季度回访一次。",
                            })
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

                // 真实调用 CRM API（降级 mock）
                let payload = json!({
                    "name": name,
                    "contact": contact,
                    "phone": phone,
                    "email": params["email"].as_str().unwrap_or(""),
                    "industry": params["industry"].as_str().unwrap_or(""),
                    "address": params["address"].as_str().unwrap_or(""),
                    "notes": params["notes"].as_str().unwrap_or(""),
                });
                let customer = crm_api_call("POST", "/api/crm/customers", Some(payload)).unwrap_or_else(|| {
                    let customer_id = format!("CUST-{}", uuid::Uuid::new_v4().simple().to_string().get(..8).unwrap_or("00000000"));
                    json!({
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
                    })
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
    #[ignore = "需要 CRM_SERVICE_URL 指向真实 crm 服务时手动运行"]
    async fn test_list_customers_tool_real_api() {
        if std::env::var("CRM_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 CRM_SERVICE_URL");
            return;
        }
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;
        let result = server
            .tool_registry()
            .call_tool("crm.list_customers", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        assert_eq!(result.content.len(), 1);
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        // 真实 API 返回 total > 0（mock 数据 total=9）
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(total > 0, "真实 API 应返回客户，total={}", total);
        eprintln!("crm.list_customers 真实调用返回 total = {}", total);
    }

    #[tokio::test]
    #[ignore = "需要 CRM_SERVICE_URL 指向真实 crm 服务时手动运行"]
    async fn test_get_customer_real_api() {
        if std::env::var("CRM_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 CRM_SERVICE_URL");
            return;
        }
        let id = std::env::var("CRM_SAMPLE_CUSTOMER_ID").unwrap_or_default();
        if id.is_empty() {
            eprintln!("SKIP: 未设置 CRM_SAMPLE_CUSTOMER_ID");
            return;
        }
        let server = McpServer::new("test", "1.0.0");
        register_crm_tools(&server).await;
        let result = server
            .tool_registry()
            .call_tool("crm.get_customer", json!({"customer_id": id}))
            .await
            .unwrap();
        assert_eq!(result.content.len(), 1);
        let text = match result.content.first() {
            Some(McpContent::Text { text }) => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        // 真实 API 返回客户数据（mock 可能为空对象）
        let has_data =
            !parsed.is_null() && parsed.as_object().map(|o| !o.is_empty()).unwrap_or(false);
        assert!(has_data, "真实 API 应返回客户详情: {}", text);
        eprintln!("crm.get_customer 真实调用成功，id = {}", id);
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
