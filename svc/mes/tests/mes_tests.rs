use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PluginInfo {
    code: String,
    name: String,
    version: String,
    description: String,
    permissions: Vec<PermissionDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PermissionDef {
    code: String,
    name: String,
    resource_type: String,
    action: String,
}

#[test]
fn test_plugin_info_structure() {
    let info = PluginInfo {
        code: "mes".to_string(),
        name: "生产执行系统".to_string(),
        version: "0.1.0".to_string(),
        description: "MES 生产执行系统".to_string(),
        permissions: vec![PermissionDef {
            code: "mes:production_order:read".to_string(),
            name: "查看生产订单".to_string(),
            resource_type: "production_order".to_string(),
            action: "read".to_string(),
        }],
    };

    assert_eq!(info.code, "mes");
    assert_eq!(info.name, "生产执行系统");
    assert!(!info.version.is_empty());
    assert!(!info.description.is_empty());
    assert!(!info.permissions.is_empty());
}

#[test]
fn test_mes_permission_codes_format() {
    let permissions = vec![
        ("mes:production_order:read", "production_order", "read"),
        ("mes:production_order:write", "production_order", "write"),
        ("mes:production_process:read", "production_process", "read"),
        (
            "mes:production_process:write",
            "production_process",
            "write",
        ),
        ("mes:production_record:read", "production_record", "read"),
        ("mes:production_record:write", "production_record", "write"),
        ("mes:equipment:read", "equipment", "read"),
        ("mes:equipment:write", "equipment", "write"),
        ("mes:work_station:read", "work_station", "read"),
        ("mes:work_station:write", "work_station", "write"),
        (
            "mes:quality_traceability:read",
            "quality_traceability",
            "read",
        ),
        (
            "mes:production_scheduling:read",
            "production_scheduling",
            "read",
        ),
        (
            "mes:production_scheduling:write",
            "production_scheduling",
            "write",
        ),
    ];

    for (code, resource, action) in permissions {
        assert!(code.starts_with("mes:"), "{} should start with mes:", code);
        let parts: Vec<&str> = code.split(':').collect();
        assert_eq!(parts.len(), 3, "{} should have 3 parts", code);
        assert_eq!(parts[0], "mes");
        assert_eq!(parts[1], resource);
        assert_eq!(parts[2], action);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductionOrder {
    id: Uuid,
    order_no: String,
    product_id: Option<Uuid>,
    product_name: String,
    product_code: String,
    quantity: f64,
    completed_quantity: f64,
    status: String,
    source: String,
    workshop_id: Option<Uuid>,
    notes: Option<String>,
}

#[test]
fn test_production_order_creation() {
    let order = ProductionOrder {
        id: Uuid::new_v4(),
        order_no: "PO-2024-0001".to_string(),
        product_id: Some(Uuid::new_v4()),
        product_name: "产品A".to_string(),
        product_code: "PROD-A-001".to_string(),
        quantity: 1000.0,
        completed_quantity: 0.0,
        status: "pending".to_string(),
        source: "manual".to_string(),
        workshop_id: Some(Uuid::new_v4()),
        notes: Some("紧急订单".to_string()),
    };

    assert_eq!(order.order_no, "PO-2024-0001");
    assert_eq!(order.product_name, "产品A");
    assert_eq!(order.status, "pending");
    assert_eq!(order.quantity, 1000.0);
    assert_eq!(order.completed_quantity, 0.0);
}

#[test]
fn test_production_order_statuses() {
    let statuses = vec![
        "pending",
        "released",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
        "closed",
    ];

    for status in statuses {
        let order = ProductionOrder {
            id: Uuid::new_v4(),
            order_no: format!("PO-TEST-{}", status),
            product_id: None,
            product_name: "测试产品".to_string(),
            product_code: "TEST-001".to_string(),
            quantity: 100.0,
            completed_quantity: 0.0,
            status: status.to_string(),
            source: "manual".to_string(),
            workshop_id: None,
            notes: None,
        };
        assert_eq!(order.status, status);
    }
}

#[test]
fn test_production_order_sources() {
    let sources = vec!["manual", "erp_sales_order", "mrp"];

    for source in sources {
        let order = ProductionOrder {
            id: Uuid::new_v4(),
            order_no: format!("PO-SRC-{}", source),
            product_id: None,
            product_name: "测试产品".to_string(),
            product_code: "TEST-001".to_string(),
            quantity: 100.0,
            completed_quantity: 0.0,
            status: "pending".to_string(),
            source: source.to_string(),
            workshop_id: None,
            notes: None,
        };
        assert_eq!(order.source, source);
    }
}

#[test]
fn test_production_order_progress() {
    let mut order = ProductionOrder {
        id: Uuid::new_v4(),
        order_no: "PO-PROGRESS-001".to_string(),
        product_id: None,
        product_name: "进度测试产品".to_string(),
        product_code: "TEST-PROG-001".to_string(),
        quantity: 1000.0,
        completed_quantity: 300.0,
        status: "in_progress".to_string(),
        source: "manual".to_string(),
        workshop_id: None,
        notes: None,
    };

    let progress = (order.completed_quantity / order.quantity) * 100.0;
    assert_eq!(progress, 30.0);

    order.completed_quantity = 1000.0;
    let full_progress = (order.completed_quantity / order.quantity) * 100.0;
    assert_eq!(full_progress, 100.0);
}

#[test]
fn test_production_order_serialization() {
    let order = ProductionOrder {
        id: Uuid::parse_str("12345678-1234-5678-1234-567812345678").unwrap(),
        order_no: "PO-SER-001".to_string(),
        product_id: Some(Uuid::new_v4()),
        product_name: "序列化测试产品".to_string(),
        product_code: "SER-001".to_string(),
        quantity: 500.0,
        completed_quantity: 100.0,
        status: "in_progress".to_string(),
        source: "erp_sales_order".to_string(),
        workshop_id: Some(Uuid::new_v4()),
        notes: Some("测试序列化".to_string()),
    };

    let json = serde_json::to_string(&order).unwrap();
    let deserialized: ProductionOrder = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.id, order.id);
    assert_eq!(deserialized.order_no, order.order_no);
    assert_eq!(deserialized.status, order.status);
    assert_eq!(deserialized.quantity, order.quantity);
    assert_eq!(deserialized.completed_quantity, order.completed_quantity);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Equipment {
    id: Uuid,
    equipment_no: String,
    name: String,
    model: Option<String>,
    manufacturer: Option<String>,
    status: String,
    location: Option<String>,
    maintenance_cycle: i32,
}

#[test]
fn test_equipment_creation() {
    let equipment = Equipment {
        id: Uuid::new_v4(),
        equipment_no: "EQ-001".to_string(),
        name: "数控机床".to_string(),
        model: Some("CNC-5000".to_string()),
        manufacturer: Some("沈阳机床".to_string()),
        status: "normal".to_string(),
        location: Some("一号车间".to_string()),
        maintenance_cycle: 30,
    };

    assert_eq!(equipment.equipment_no, "EQ-001");
    assert_eq!(equipment.name, "数控机床");
    assert_eq!(equipment.status, "normal");
    assert_eq!(equipment.maintenance_cycle, 30);
}

#[test]
fn test_equipment_statuses() {
    let statuses = vec![
        "normal",
        "running",
        "idle",
        "maintenance",
        "fault",
        "scrapped",
    ];

    for status in statuses {
        let eq = Equipment {
            id: Uuid::new_v4(),
            equipment_no: format!("EQ-TEST-{}", status),
            name: format!("测试设备-{}", status),
            model: None,
            manufacturer: None,
            status: status.to_string(),
            location: None,
            maintenance_cycle: 30,
        };
        assert_eq!(eq.status, status);
    }
}

#[test]
fn test_equipment_maintenance_cycle_positive() {
    let cycles = vec![7, 15, 30, 60, 90, 180, 365];

    for cycle in cycles {
        let eq = Equipment {
            id: Uuid::new_v4(),
            equipment_no: "EQ-CYCLE-TEST".to_string(),
            name: "周期测试设备".to_string(),
            model: None,
            manufacturer: None,
            status: "normal".to_string(),
            location: None,
            maintenance_cycle: cycle,
        };
        assert!(eq.maintenance_cycle > 0);
    }
}

#[test]
fn test_equipment_serialization() {
    let equipment = Equipment {
        id: Uuid::new_v4(),
        equipment_no: "EQ-SER-001".to_string(),
        name: "序列化测试设备".to_string(),
        model: Some("Model-X".to_string()),
        manufacturer: Some("Manufacturer-Y".to_string()),
        status: "running".to_string(),
        location: Some("二号车间".to_string()),
        maintenance_cycle: 60,
    };

    let json = serde_json::to_string(&equipment).unwrap();
    let deserialized: Equipment = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.equipment_no, equipment.equipment_no);
    assert_eq!(deserialized.name, equipment.name);
    assert_eq!(deserialized.status, equipment.status);
    assert_eq!(deserialized.maintenance_cycle, equipment.maintenance_cycle);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkStation {
    id: Uuid,
    station_no: String,
    name: String,
    workshop_id: Option<Uuid>,
    location: Option<String>,
    status: String,
    capacity: i32,
}

#[test]
fn test_work_station_creation() {
    let ws = WorkStation {
        id: Uuid::new_v4(),
        station_no: "WS-001".to_string(),
        name: "焊接工位".to_string(),
        workshop_id: Some(Uuid::new_v4()),
        location: Some("A区-1号".to_string()),
        status: "active".to_string(),
        capacity: 2,
    };

    assert_eq!(ws.station_no, "WS-001");
    assert_eq!(ws.name, "焊接工位");
    assert_eq!(ws.status, "active");
    assert_eq!(ws.capacity, 2);
}

#[test]
fn test_work_station_statuses() {
    let statuses = vec!["active", "inactive", "maintenance", "disabled"];

    for status in statuses {
        let ws = WorkStation {
            id: Uuid::new_v4(),
            station_no: format!("WS-TEST-{}", status),
            name: format!("测试工位-{}", status),
            workshop_id: None,
            location: None,
            status: status.to_string(),
            capacity: 1,
        };
        assert_eq!(ws.status, status);
    }
}

#[test]
fn test_work_station_capacity() {
    let capacities = vec![1, 2, 5, 10, 20];

    for cap in capacities {
        let ws = WorkStation {
            id: Uuid::new_v4(),
            station_no: format!("WS-CAP-{}", cap),
            name: format!("容量{}工位", cap),
            workshop_id: None,
            location: None,
            status: "active".to_string(),
            capacity: cap,
        };
        assert!(ws.capacity >= 1);
    }
}

#[test]
fn test_work_station_serialization() {
    let ws = WorkStation {
        id: Uuid::new_v4(),
        station_no: "WS-SER-001".to_string(),
        name: "序列化测试工位".to_string(),
        workshop_id: Some(Uuid::new_v4()),
        location: Some("B区-2号".to_string()),
        status: "active".to_string(),
        capacity: 3,
    };

    let json = serde_json::to_string(&ws).unwrap();
    let deserialized: WorkStation = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.station_no, ws.station_no);
    assert_eq!(deserialized.name, ws.name);
    assert_eq!(deserialized.status, ws.status);
    assert_eq!(deserialized.capacity, ws.capacity);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductionProcess {
    id: Uuid,
    process_no: String,
    name: String,
    version: String,
    status: String,
    sequence: i32,
    estimated_duration: i32,
}

#[test]
fn test_production_process_creation() {
    let process = ProductionProcess {
        id: Uuid::new_v4(),
        process_no: "PROC-001".to_string(),
        name: "装配工序".to_string(),
        version: "1.0".to_string(),
        status: "active".to_string(),
        sequence: 1,
        estimated_duration: 60,
    };

    assert_eq!(process.process_no, "PROC-001");
    assert_eq!(process.name, "装配工序");
    assert_eq!(process.status, "active");
    assert!(process.estimated_duration > 0);
}

#[test]
fn test_production_process_versions() {
    let versions = vec!["1.0", "1.1", "2.0", "2.1-beta"];

    for version in versions {
        let process = ProductionProcess {
            id: Uuid::new_v4(),
            process_no: format!("PROC-VER-{}", version),
            name: "版本测试工序".to_string(),
            version: version.to_string(),
            status: "active".to_string(),
            sequence: 1,
            estimated_duration: 30,
        };
        assert_eq!(process.version, version);
    }
}

#[test]
fn test_production_process_sequence() {
    let processes: Vec<ProductionProcess> = (1..=5)
        .map(|i| ProductionProcess {
            id: Uuid::new_v4(),
            process_no: format!("PROC-SEQ-{}", i),
            name: format!("工序{}", i),
            version: "1.0".to_string(),
            status: "active".to_string(),
            sequence: i,
            estimated_duration: 30 * i,
        })
        .collect();

    for (i, process) in processes.iter().enumerate() {
        assert_eq!(process.sequence, (i + 1) as i32);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    service: String,
    uptime: u64,
    database: String,
}

#[test]
fn test_health_response_healthy() {
    let health = HealthResponse {
        status: "healthy".to_string(),
        service: "topems-mes".to_string(),
        uptime: 3600,
        database: "healthy".to_string(),
    };

    assert_eq!(health.status, "healthy");
    assert_eq!(health.service, "topems-mes");
    assert!(health.uptime > 0);
}

#[test]
fn test_health_response_degraded() {
    let health = HealthResponse {
        status: "degraded".to_string(),
        service: "topems-mes".to_string(),
        uptime: 100,
        database: "unhealthy: connection error".to_string(),
    };

    assert_eq!(health.status, "degraded");
    assert_ne!(health.database, "healthy");
}

#[cfg(test)]
#[cfg(feature = "http_endpoint_tests")]
mod http_endpoint_tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::get,
        Router,
    };
    #[allow(unused_imports)]
    use tower::util::ServiceExt;

    async fn health_handler() -> &'static str {
        "OK"
    }

    async fn plugin_info_handler() -> String {
        let info = PluginInfo {
            code: "mes".to_string(),
            name: "生产执行系统".to_string(),
            version: "0.1.0".to_string(),
            description: "MES 生产执行系统".to_string(),
            permissions: vec![],
        };
        serde_json::to_string(&info).unwrap()
    }

    #[tokio::test]
    async fn test_health_endpoint() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_plugin_info_endpoint() {
        let app = Router::new().route("/api/plugins/info", get(plugin_info_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/plugins/info")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let info: PluginInfo = serde_json::from_slice(&body).unwrap();

        assert_eq!(info.code, "mes");
        assert_eq!(info.name, "生产执行系统");
    }

    #[tokio::test]
    async fn test_404_endpoint() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/nonexistent")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_method_not_allowed() {
        let app = Router::new().route("/health", get(health_handler));

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
    }
}

#[cfg(test)]
mod business_logic_tests {
    use super::*;
    use topems_mes::modules::oee_logic::{
        calculate_availability, calculate_efficiency_trend, calculate_oee, calculate_performance,
        calculate_quality, determine_oee_level, validate_oee_inputs,
    };

    #[test]
    fn test_oee_calculation() {
        let availability = 0.90;
        let performance = 0.85;
        let quality = 0.95;
        let oee = availability * performance * quality;

        assert!((oee - 0.72675_f64).abs() < 0.001);
        assert!(oee >= 0.0 && oee <= 1.0);
    }

    #[test]
    fn test_production_yield() {
        let total_input = 1000.0;
        let defective = 50.0;
        let good_output = total_input - defective;
        let yield_rate = good_output / total_input;

        assert_eq!(good_output, 950.0);
        assert_eq!(yield_rate, 0.95);
    }

    #[test]
    fn test_equipment_utilization() {
        let total_time = 8.0 * 60.0;
        let run_time = 6.5 * 60.0;
        let utilization = run_time / total_time;

        assert!(utilization > 0.0);
        assert!(utilization <= 1.0);
        assert!((utilization - 0.8125_f64).abs() < 0.001);
    }

    #[test]
    fn test_production_scheduling_priority() {
        let priorities = vec![("low", 1), ("medium", 5), ("high", 10), ("urgent", 100)];

        for (level, value) in priorities {
            assert!(!level.is_empty());
            assert!(value > 0);
        }
    }

    #[test]
    fn test_quality_statuses() {
        let statuses = vec![
            "pending",
            "inspecting",
            "passed",
            "failed",
            "rework",
            "scrapped",
        ];

        for status in statuses {
            assert!(!status.is_empty());
        }
    }

    #[test]
    fn test_calculate_oee_full_efficiency() {
        let (availability, performance, quality, oee) =
            calculate_oee(480.0, 480.0, 1.0, 480.0, 480.0);
        assert_eq!(availability, 100.0);
        assert_eq!(performance, 100.0);
        assert_eq!(quality, 100.0);
        assert_eq!(oee, 100.0);
    }

    #[test]
    fn test_calculate_oee_components() {
        assert_eq!(calculate_availability(480.0, 480.0), 100.0);
        assert_eq!(calculate_availability(480.0, 240.0), 50.0);
        assert_eq!(calculate_performance(480.0, 1.0, 480.0), 100.0);
        assert_eq!(calculate_performance(480.0, 1.0, 240.0), 50.0);
        assert_eq!(calculate_quality(100.0, 100.0), 100.0);
        assert_eq!(calculate_quality(100.0, 90.0), 90.0);
    }

    #[test]
    fn test_determine_oee_level() {
        assert_eq!(determine_oee_level(90.0), "world_class");
        assert_eq!(determine_oee_level(80.0), "good");
        assert_eq!(determine_oee_level(70.0), "average");
        assert_eq!(determine_oee_level(55.0), "needs_improvement");
    }

    #[test]
    fn test_calculate_efficiency_trend() {
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 75.0),
            "significantly_improved"
        );
        assert_eq!(calculate_efficiency_trend(Some(70.0), 72.0), "improved");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 70.0), "stable");
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 65.0),
            "significantly_decreased"
        );
    }

    #[test]
    fn test_validate_oee_inputs() {
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_ok());
        assert!(validate_oee_inputs(-10.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 400.0).is_err());
    }

    #[test]
    fn test_calculate_oee_edge_cases() {
        let (avail, perf, qual, oee) = calculate_oee(0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(avail, 0.0);
        assert_eq!(perf, 0.0);
        assert_eq!(qual, 0.0);
        assert_eq!(oee, 0.0);

        let (avail, perf, qual, oee) = calculate_oee(480.0, 0.0, 1.0, 0.0, 0.0);
        assert_eq!(avail, 0.0);
        assert_eq!(perf, 0.0);
        assert_eq!(qual, 0.0);
        assert_eq!(oee, 0.0);
    }

    #[test]
    fn test_calculate_oee_realistic_scenario() {
        let planned_time = 480.0;
        let run_time = 420.0;
        let ideal_cycle_time = 1.0;
        let actual_output = 380.0;
        let good_output = 361.0;

        let (availability, performance, quality, oee) = calculate_oee(
            planned_time,
            run_time,
            ideal_cycle_time,
            actual_output,
            good_output,
        );

        assert!((availability - 87.5).abs() < 0.01);
        assert!((performance - 90.48).abs() < 0.01);
        assert!((quality - 95.0).abs() < 0.01);
        assert!((oee - 74.9).abs() < 0.5);
    }

    #[test]
    fn test_determine_oee_level_boundaries() {
        assert_eq!(determine_oee_level(85.0), "world_class");
        assert_eq!(determine_oee_level(84.99), "good");
        assert_eq!(determine_oee_level(75.0), "good");
        assert_eq!(determine_oee_level(74.99), "average");
        assert_eq!(determine_oee_level(60.0), "average");
        assert_eq!(determine_oee_level(59.99), "needs_improvement");
        assert_eq!(determine_oee_level(0.0), "needs_improvement");
        assert_eq!(determine_oee_level(100.0), "world_class");
    }

    #[test]
    fn test_calculate_availability_edge_cases() {
        assert_eq!(calculate_availability(0.0, 100.0), 0.0);
        assert_eq!(calculate_availability(100.0, 0.0), 0.0);
        assert_eq!(calculate_availability(100.0, 50.0), 50.0);
        assert_eq!(calculate_availability(200.0, 200.0), 100.0);
        assert_eq!(calculate_availability(480.0, 360.0), 75.0);
    }

    #[test]
    fn test_calculate_performance_edge_cases() {
        assert_eq!(calculate_performance(0.0, 1.0, 100.0), 0.0);
        assert_eq!(calculate_performance(100.0, 0.0, 100.0), 0.0);
        assert_eq!(calculate_performance(100.0, 1.0, 0.0), 0.0);
        assert_eq!(calculate_performance(100.0, 1.0, 100.0), 100.0);
        assert_eq!(calculate_performance(100.0, 1.0, 150.0), 100.0);
        let perf = calculate_performance(480.0, 2.0, 200.0);
        assert!((perf - 83.33).abs() < 0.01);
    }

    #[test]
    fn test_calculate_quality_edge_cases() {
        assert_eq!(calculate_quality(0.0, 0.0), 0.0);
        assert_eq!(calculate_quality(100.0, 0.0), 0.0);
        assert_eq!(calculate_quality(100.0, 100.0), 100.0);
        assert_eq!(calculate_quality(200.0, 180.0), 90.0);
        assert_eq!(calculate_quality(50.0, 45.0), 90.0);
    }

    #[test]
    fn test_calculate_efficiency_trend_complete() {
        assert_eq!(calculate_efficiency_trend(None, 70.0), "stable");
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 73.01),
            "significantly_improved"
        );
        assert_eq!(calculate_efficiency_trend(Some(70.0), 73.0), "improved");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 72.99), "improved");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 70.0), "stable");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 67.01), "decreased");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 67.0), "decreased");
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 66.99),
            "significantly_decreased"
        );
        assert_eq!(
            calculate_efficiency_trend(Some(50.0), 85.0),
            "significantly_improved"
        );
        assert_eq!(
            calculate_efficiency_trend(Some(85.0), 50.0),
            "significantly_decreased"
        );
    }

    #[test]
    fn test_validate_oee_inputs_comprehensive() {
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_ok());

        assert!(validate_oee_inputs(-10.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, -10.0, 80.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, -10.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, -1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, -10.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, -10.0).is_err());

        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 400.0).is_err());
        assert!(validate_oee_inputs(480.0, 600.0, 80.0, 1.0, 350.0, 340.0).is_err());
    }

    #[test]
    fn test_oee_calculation_inverse() {
        let (availability, performance, quality, oee) =
            calculate_oee(480.0, 400.0, 1.0, 380.0, 361.0);
        let expected_oee =
            (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0;
        assert!((oee - expected_oee).abs() < 0.001);
    }

    #[test]
    fn test_performance_capped_at_100() {
        let performance = calculate_performance(100.0, 1.0, 200.0);
        assert_eq!(performance, 100.0);

        let performance = calculate_performance(100.0, 0.5, 300.0);
        assert_eq!(performance, 100.0);

        let performance = calculate_performance(100.0, 1.0, 100.0);
        assert_eq!(performance, 100.0);
    }
}
