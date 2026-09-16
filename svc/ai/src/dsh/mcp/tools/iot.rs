//! IoT MCP Tools — 物联网系统业务工具。
//!
//! 注册 4 个 IoT 业务工具到 MCP Server：
//! - iot.list_devices — 查询设备列表
//! - iot.get_device — 获取设备详情
//! - iot.list_device_data — 查询设备数据
//! - iot.send_command — 发送设备命令
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 IoT API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 IoT 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - iot.list_devices — 查询设备列表（支持分页、类型筛选、状态筛选）
/// - iot.get_device — 获取设备详情（按ID）
/// - iot.list_device_data — 查询设备数据（支持分页、设备筛选、时间范围）
/// - iot.send_command — 发送设备命令（设备ID、命令、参数）
pub async fn register_iot_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. iot.list_devices
    registry
        .register(
            "iot.list_devices",
            "查询IoT设备列表，支持分页、类型筛选和状态筛选。返回设备的基本信息列表，包括设备编号、名称、类型、状态、位置、最后在线时间、信号强度等。",
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
                    "device_type",
                    SchemaBuilder::string()
                        .description("设备类型筛选")
                        .enum_values(&["sensor", "actuator", "gateway", "camera", "controller", "meter"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("设备状态筛选")
                        .enum_values(&["online", "offline", "fault", "maintenance", "sleeping"]),
                )
                .property(
                    "location",
                    SchemaBuilder::string().description("位置筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配设备编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let device_type = params["device_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let location = params["location"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let devices = generate_mock_devices(device_type, status, location, keyword);
                let total = devices.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_devices = &devices[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "devices": page_devices,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. iot.get_device
    registry
        .register(
            "iot.get_device",
            "获取IoT设备详情，按设备ID查询。返回设备的完整信息，包括基本信息、配置、实时状态、传感器数据、通信信息、维护记录等。",
            SchemaBuilder::object()
                .property(
                    "device_id",
                    SchemaBuilder::string().description("设备ID"),
                )
                .required(&["device_id"])
                .build(),
            |params| {
                let device_id = params["device_id"].as_str().unwrap_or("");

                if device_id.is_empty() {
                    return Err(ToolExecutionError::Validation("device_id is required".to_string()));
                }

                let device = generate_mock_device_detail(device_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(device.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. iot.list_device_data
    registry
        .register(
            "iot.list_device_data",
            "查询IoT设备数据，支持分页、设备筛选和时间范围筛选。返回设备的历史数据列表，包括时间戳、数据类型、数值、单位、质量标记等。",
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
                        .maximum(500.0)
                        .default(json!(100)),
                )
                .property(
                    "device_id",
                    SchemaBuilder::string().description("设备ID筛选"),
                )
                .property(
                    "data_type",
                    SchemaBuilder::string().description("数据类型筛选（如temperature, humidity, pressure）"),
                )
                .property(
                    "start_time",
                    SchemaBuilder::string().description("开始时间（YYYY-MM-DD HH:mm:ss）"),
                )
                .property(
                    "end_time",
                    SchemaBuilder::string().description("结束时间（YYYY-MM-DD HH:mm:ss）"),
                )
                .required(&["page", "device_id"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(100);
                let device_id = params["device_id"].as_str().unwrap_or("");
                let data_type = params["data_type"].as_str().unwrap_or("");

                if device_id.is_empty() {
                    return Err(ToolExecutionError::Validation("device_id is required".to_string()));
                }

                let data = generate_mock_device_data(device_id, data_type);
                let total = data.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_data = &data[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "device_id": device_id,
                    "data": page_data,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. iot.send_command
    registry
        .register(
            "iot.send_command",
            "向IoT设备发送命令。需要提供设备ID、命令类型和参数，返回命令执行结果和命令ID。",
            SchemaBuilder::object()
                .property(
                    "device_id",
                    SchemaBuilder::string().description("设备ID"),
                )
                .property(
                    "command",
                    SchemaBuilder::string()
                        .description("命令类型")
                        .enum_values(&["on", "off", "restart", "reset", "calibrate", "update_firmware", "set_config", "read_status"]),
                )
                .property(
                    "parameters",
                    SchemaBuilder::object().description("命令参数（键值对）"),
                )
                .property(
                    "timeout",
                    SchemaBuilder::integer().description("超时时间（秒）").minimum(1.0).maximum(300.0),
                )
                .property(
                    "operator",
                    SchemaBuilder::string().description("操作人"),
                )
                .required(&["device_id", "command"])
                .build(),
            |params| {
                let device_id = params["device_id"].as_str().unwrap_or("");
                let command = params["command"].as_str().unwrap_or("");

                if device_id.is_empty() {
                    return Err(ToolExecutionError::Validation("device_id is required".to_string()));
                }
                if command.is_empty() {
                    return Err(ToolExecutionError::Validation("command is required".to_string()));
                }

                let command_id = format!("CMD-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));

                let result = json!({
                    "command_id": command_id,
                    "device_id": device_id,
                    "command": command,
                    "parameters": params["parameters"].as_object().unwrap_or(&serde_json::Map::new()),
                    "status": "sent",
                    "sent_at": chrono::Utc::now().to_rfc3339(),
                    "operator": params["operator"].as_str().unwrap_or(""),
                    "timeout": params["timeout"].as_i64().unwrap_or(30),
                    "message": format!("命令已发送到设备{}，等待设备响应", device_id),
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("IoT MCP Tools registered: 4 tools (iot.list_devices, iot.get_device, iot.list_device_data, iot.send_command)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 设备列表
fn generate_mock_devices(
    type_filter: &str,
    status_filter: &str,
    location_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let types = [
        "sensor",
        "actuator",
        "gateway",
        "camera",
        "controller",
        "meter",
    ];
    let statuses = [
        "online",
        "online",
        "online",
        "offline",
        "fault",
        "maintenance",
        "sleeping",
    ];
    let locations = ["一车间", "二车间", "三车间", "仓库", "办公楼", "室外"];

    (0..100)
        .map(|i| {
            let device_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let location = locations[i % locations.len()];

            json!({
                "device_id": format!("DEV-{:08}", i + 1),
                "device_code": format!("D{:08}", i + 1),
                "device_name": format!("设备{:03}", i + 1),
                "device_type": device_type,
                "status": status,
                "location": location,
                "model": format!("{}-{:03}", device_type.to_uppercase(), (i % 20) + 1),
                "manufacturer": format!("厂商{:02}", (i % 5) + 1),
                "firmware_version": format!("v{}.{}.{}", (i % 3) + 1, (i % 10), (i % 20)),
                "last_online": format!("2026-08-26 {:02}:{:02}:00", (i % 24), (i % 60)),
                "signal_strength": if status == "online" { 60 + (i % 40) } else { 0 },
                "battery_level": if device_type == "sensor" || device_type == "meter" { Some(20 + (i % 80)) } else { None },
                "ip_address": if status == "online" { Some(format!("192.168.{}.{}", (i % 10) + 1, (i % 254) + 1)) } else { None },
                "created_at": format!("202{}-{:02}-{:02}", (i % 5) + 1, (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|d| {
            (type_filter.is_empty() || d["device_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || d["status"].as_str() == Some(status_filter))
                && (location_filter.is_empty() || d["location"].as_str() == Some(location_filter))
                && (keyword_filter.is_empty()
                    || d["device_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || d["device_name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 设备详情
fn generate_mock_device_detail(device_id: &str) -> Value {
    json!({
        "device_id": device_id,
        "device_code": "D00000001",
        "device_name": "温度传感器001",
        "device_type": "sensor",
        "status": "online",
        "location": "一车间A区",
        "model": "SENSOR-001",
        "manufacturer": "厂商01",
        "serial_number": "SN202601001",
        "firmware_version": "v2.1.5",
        "hardware_version": "v1.0",
        "description": "一车间A区温度监测传感器，用于实时监测环境温度",
        "configuration": {
            "sampling_interval": 60,
            "data_type": "temperature",
            "unit": "°C",
            "min_value": -40,
            "max_value": 125,
            "alarm_threshold_high": 80,
            "alarm_threshold_low": 0,
            "report_interval": 300,
            "heartbeat_interval": 60,
        },
        "realtime_status": {
            "last_update": "2026-08-26T16:00:00Z",
            "current_value": 25.6,
            "unit": "°C",
            "signal_strength": 85,
            "battery_level": 78,
            "uptime": 864000,
            "memory_usage": 45,
            "cpu_usage": 12,
        },
        "communication": {
            "protocol": "MQTT",
            "broker": "mqtt://iot.example.com:1883",
            "topic": "devices/D00000001/data",
            "ip_address": "192.168.1.101",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "port": 1883,
            "last_heartbeat": "2026-08-26T16:00:00Z",
        },
        "recent_alarms": [
            {"id": "ALM-001", "type": "high_temperature", "level": "warning", "value": 82.5, "threshold": 80, "time": "2026-08-25T14:30:00Z", "acknowledged": true},
            {"id": "ALM-002", "type": "low_battery", "level": "info", "value": 20, "threshold": 20, "time": "2026-08-24T08:00:00Z", "acknowledged": true},
        ],
        "maintenance_records": [
            {"id": "MNT-001", "type": "routine", "description": "例行检查和清洁", "operator": "张三", "date": "2026-07-15", "result": "normal"},
            {"id": "MNT-002", "type": "calibration", "description": "温度校准", "operator": "李四", "date": "2026-06-01", "result": "calibrated"},
        ],
        "tags": ["温度", "一车间", "A区", "关键设备"],
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-08-26T16:00:00Z",
    })
}

/// 生成 Mock 设备数据
fn generate_mock_device_data(device_id: &str, type_filter: &str) -> Vec<Value> {
    let data_types = [
        "temperature",
        "humidity",
        "pressure",
        "voltage",
        "current",
        "power",
    ];
    let units = ["°C", "%", "kPa", "V", "A", "W"];
    let qualities = ["good", "good", "good", "good", "uncertain", "bad"];

    (0..500)
        .map(|i| {
            let data_type = if type_filter.is_empty() { data_types[i % data_types.len()] } else { type_filter };
            let unit = if type_filter.is_empty() { units[i % units.len()] } else { "value" };
            let quality = qualities[i % qualities.len()];
            let base_value = match data_type {
                "temperature" => 25.0,
                "humidity" => 60.0,
                "pressure" => 101.3,
                "voltage" => 220.0,
                "current" => 5.0,
                "power" => 1100.0,
                _ => 50.0,
            };
            let value = base_value + ((i as f64 * 0.13) % 10.0) - 5.0;

            json!({
                "id": format!("DATA-{:010}", i + 1),
                "device_id": device_id,
                "data_type": data_type,
                "value": (value * 100.0).round() / 100.0,
                "unit": unit,
                "quality": quality,
                "timestamp": format!("2026-08-26 {:02}:{:02}:{:02}", (i % 24), (i % 60), (i % 60)),
                "received_at": format!("2026-08-26 {:02}:{:02}:{:02}", (i % 24), (i % 60), ((i + 1) % 60)),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_iot_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("iot.list_devices").await);
        assert!(registry.has_tool("iot.get_device").await);
        assert!(registry.has_tool("iot.list_device_data").await);
        assert!(registry.has_tool("iot.send_command").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_devices() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("iot.list_devices", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["devices"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_device() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("iot.get_device", json!({"device_id": "DEV-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["device_id"], "DEV-00000001");
            assert!(parsed["configuration"].is_object());
            assert!(parsed["realtime_status"].is_object());
            assert!(parsed["communication"].is_object());
            assert!(parsed["recent_alarms"].is_array());
            assert!(parsed["maintenance_records"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_device_data() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "iot.list_device_data",
                json!({"page": 1, "page_size": 10, "device_id": "DEV-00000001"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["device_id"], "DEV-00000001");
            assert!(parsed["data"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_send_command() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "iot.send_command",
                json!({
                    "device_id": "DEV-00000001",
                    "command": "restart",
                    "parameters": {"delay": 5},
                    "timeout": 30,
                    "operator": "张三"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["device_id"], "DEV-00000001");
            assert_eq!(parsed["command"], "restart");
            assert_eq!(parsed["status"], "sent");
            assert!(parsed["command_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_send_command_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_iot_tools(&server, "test-secret").await;

        // 缺少 command
        let result = server
            .tool_registry()
            .call_tool(
                "iot.send_command",
                json!({
                    "device_id": "DEV-00000001"
                }),
            )
            .await;
        assert!(result.is_err());

        // 缺少 device_id
        let result = server
            .tool_registry()
            .call_tool(
                "iot.send_command",
                json!({
                    "command": "on"
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
