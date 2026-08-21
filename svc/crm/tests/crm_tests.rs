use rust_decimal::Decimal;
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
        code: "crm".to_string(),
        name: "客户关系管理".to_string(),
        version: "0.1.0".to_string(),
        description: "CRM 客户关系管理系统".to_string(),
        permissions: vec![PermissionDef {
            code: "crm:customer:read".to_string(),
            name: "查看客户".to_string(),
            resource_type: "customer".to_string(),
            action: "read".to_string(),
        }],
    };

    assert_eq!(info.code, "crm");
    assert_eq!(info.name, "客户关系管理");
    assert!(!info.version.is_empty());
    assert!(!info.description.is_empty());
    assert!(!info.permissions.is_empty());
}

#[test]
fn test_crm_permission_codes_format() {
    let permissions = vec![
        ("crm:customer:read", "customer", "read"),
        ("crm:customer:write", "customer", "write"),
        ("crm:customer:delete", "customer", "delete"),
        ("crm:contact:read", "contact", "read"),
        ("crm:contact:write", "contact", "write"),
        ("crm:opportunity:read", "opportunity", "read"),
        ("crm:opportunity:write", "opportunity", "write"),
        ("crm:billing:read", "billing", "read"),
        ("crm:billing:write", "billing", "write"),
        ("crm:interaction:read", "interaction", "read"),
        ("crm:interaction:write", "interaction", "write"),
        ("crm:tag:read", "tag", "read"),
        ("crm:tag:write", "tag", "write"),
    ];

    for (code, resource, action) in permissions {
        assert!(code.starts_with("crm:"), "{} should start with crm:", code);
        let parts: Vec<&str> = code.split(':').collect();
        assert_eq!(parts.len(), 3, "{} should have 3 parts", code);
        assert_eq!(parts[0], "crm");
        assert_eq!(parts[1], resource);
        assert_eq!(parts[2], action);
    }
}

#[test]
fn test_customer_statuses() {
    let statuses = vec!["active", "inactive", "potential", "churned"];

    for status in statuses {
        assert!(!status.is_empty());
    }
}

#[test]
fn test_customer_types() {
    let types = vec!["enterprise", "smb", "individual", "partner"];

    for customer_type in types {
        assert!(!customer_type.is_empty());
    }
}

#[test]
fn test_customer_sources() {
    let sources = vec![
        "website",
        "referral",
        "advertisement",
        "cold_call",
        "trade_show",
        "social_media",
    ];

    for source in sources {
        assert!(!source.is_empty());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Customer {
    id: Uuid,
    name: String,
    code: Option<String>,
    industry: Option<String>,
    status: String,
    customer_type: Option<String>,
    source: Option<String>,
    rating: Option<String>,
    revenue: Option<f64>,
    employee_count: Option<i32>,
}

#[test]
fn test_customer_creation() {
    let customer = Customer {
        id: Uuid::new_v4(),
        name: "测试客户有限公司".to_string(),
        code: Some("CUST-001".to_string()),
        industry: Some("科技".to_string()),
        status: "active".to_string(),
        customer_type: Some("enterprise".to_string()),
        source: Some("website".to_string()),
        rating: Some("A".to_string()),
        revenue: Some(1000000.0),
        employee_count: Some(100),
    };

    assert_eq!(customer.name, "测试客户有限公司");
    assert_eq!(customer.status, "active");
    assert!(customer.code.is_some());
    assert_eq!(customer.code.as_deref(), Some("CUST-001"));
}

#[test]
fn test_customer_minimal() {
    let customer = Customer {
        id: Uuid::new_v4(),
        name: "最小客户".to_string(),
        code: None,
        industry: None,
        status: "active".to_string(),
        customer_type: None,
        source: None,
        rating: None,
        revenue: None,
        employee_count: None,
    };

    assert_eq!(customer.name, "最小客户");
    assert!(customer.code.is_none());
    assert!(customer.revenue.is_none());
}

#[test]
fn test_customer_serialization() {
    let customer = Customer {
        id: Uuid::parse_str("12345678-1234-5678-1234-567812345678").unwrap(),
        name: "序列化测试".to_string(),
        code: Some("SER-001".to_string()),
        industry: Some("金融".to_string()),
        status: "active".to_string(),
        customer_type: Some("smb".to_string()),
        source: Some("referral".to_string()),
        rating: Some("B".to_string()),
        revenue: Some(500000.0),
        employee_count: Some(50),
    };

    let json = serde_json::to_string(&customer).unwrap();
    let deserialized: Customer = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.id, customer.id);
    assert_eq!(deserialized.name, customer.name);
    assert_eq!(deserialized.status, customer.status);
    assert_eq!(deserialized.revenue, customer.revenue);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Contact {
    id: Uuid,
    customer_id: Option<Uuid>,
    first_name: String,
    last_name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    position: Option<String>,
    status: String,
}

#[test]
fn test_contact_creation() {
    let customer_id = Uuid::new_v4();
    let contact = Contact {
        id: Uuid::new_v4(),
        customer_id: Some(customer_id),
        first_name: "三".to_string(),
        last_name: Some("张".to_string()),
        email: Some("zhangsan@example.com".to_string()),
        phone: Some("13800138000".to_string()),
        position: Some("销售经理".to_string()),
        status: "active".to_string(),
    };

    assert_eq!(contact.first_name, "三");
    assert_eq!(contact.last_name.as_deref(), Some("张"));
    assert!(contact.customer_id.is_some());
    assert_eq!(contact.status, "active");
}

#[test]
fn test_contact_no_customer() {
    let contact = Contact {
        id: Uuid::new_v4(),
        customer_id: None,
        first_name: "四".to_string(),
        last_name: Some("李".to_string()),
        email: None,
        phone: None,
        position: None,
        status: "inactive".to_string(),
    };

    assert!(contact.customer_id.is_none());
    assert!(contact.email.is_none());
}

#[test]
fn test_contact_statuses() {
    let statuses = vec!["active", "inactive", "former"];

    for status in statuses {
        let contact = Contact {
            id: Uuid::new_v4(),
            customer_id: None,
            first_name: "Test".to_string(),
            last_name: None,
            email: None,
            phone: None,
            position: None,
            status: status.to_string(),
        };
        assert_eq!(contact.status, status);
    }
}

#[test]
fn test_contact_serialization() {
    let contact = Contact {
        id: Uuid::new_v4(),
        customer_id: Some(Uuid::new_v4()),
        first_name: "五".to_string(),
        last_name: Some("王".to_string()),
        email: Some("wangwu@example.com".to_string()),
        phone: Some("13900139000".to_string()),
        position: Some("CTO".to_string()),
        status: "active".to_string(),
    };

    let json = serde_json::to_string(&contact).unwrap();
    let deserialized: Contact = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.first_name, contact.first_name);
    assert_eq!(deserialized.email, contact.email);
    assert_eq!(deserialized.status, contact.status);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Opportunity {
    id: Uuid,
    name: String,
    customer_id: Option<Uuid>,
    value: Option<Decimal>,
    stage: String,
    probability: Option<i32>,
    notes: Option<String>,
}

#[test]
fn test_opportunity_creation() {
    let opportunity = Opportunity {
        id: Uuid::new_v4(),
        name: "大订单机会".to_string(),
        customer_id: Some(Uuid::new_v4()),
        value: Some(Decimal::new(5000000, 2)),
        stage: "proposal".to_string(),
        probability: Some(60),
        notes: Some("重要客户".to_string()),
    };

    assert_eq!(opportunity.name, "大订单机会");
    assert_eq!(opportunity.stage, "proposal");
    assert!(opportunity.value.is_some());
    assert_eq!(opportunity.probability, Some(60));
}

#[test]
fn test_opportunity_stages() {
    let stages = vec![
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
    ];

    for stage in stages {
        let opp = Opportunity {
            id: Uuid::new_v4(),
            name: format!("测试-{}", stage),
            customer_id: None,
            value: None,
            stage: stage.to_string(),
            probability: None,
            notes: None,
        };
        assert_eq!(opp.stage, stage);
    }
}

#[test]
fn test_opportunity_probability_bounds() {
    let valid_probabilities = vec![0, 10, 50, 90, 100];

    for prob in valid_probabilities {
        let opp = Opportunity {
            id: Uuid::new_v4(),
            name: "测试机会".to_string(),
            customer_id: None,
            value: None,
            stage: "lead".to_string(),
            probability: Some(prob),
            notes: None,
        };
        assert!(opp.probability.unwrap() >= 0);
        assert!(opp.probability.unwrap() <= 100);
    }
}

#[test]
fn test_opportunity_serialization() {
    let opp = Opportunity {
        id: Uuid::new_v4(),
        name: "序列化测试机会".to_string(),
        customer_id: Some(Uuid::new_v4()),
        value: Some(Decimal::new(100000, 2)),
        stage: "qualified".to_string(),
        probability: Some(30),
        notes: Some("测试笔记".to_string()),
    };

    let json = serde_json::to_string(&opp).unwrap();
    let deserialized: Opportunity = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.name, opp.name);
    assert_eq!(deserialized.stage, opp.stage);
    assert_eq!(deserialized.probability, opp.probability);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BillingRecord {
    id: Uuid,
    customer_id: Uuid,
    customer_name: String,
    invoice_no: String,
    amount: f64,
    currency: String,
    status: String,
}

#[test]
fn test_billing_record_creation() {
    let billing = BillingRecord {
        id: Uuid::new_v4(),
        customer_id: Uuid::new_v4(),
        customer_name: "测试客户".to_string(),
        invoice_no: "INV-2024-0001".to_string(),
        amount: 9999.99,
        currency: "CNY".to_string(),
        status: "draft".to_string(),
    };

    assert_eq!(billing.invoice_no, "INV-2024-0001");
    assert_eq!(billing.amount, 9999.99);
    assert_eq!(billing.currency, "CNY");
    assert_eq!(billing.status, "draft");
}

#[test]
fn test_billing_statuses() {
    let statuses = vec![
        "draft",
        "issued",
        "paid",
        "overdue",
        "cancelled",
        "refunded",
    ];

    for status in statuses {
        let billing = BillingRecord {
            id: Uuid::new_v4(),
            customer_id: Uuid::new_v4(),
            customer_name: "测试".to_string(),
            invoice_no: "INV-TEST".to_string(),
            amount: 0.0,
            currency: "CNY".to_string(),
            status: status.to_string(),
        };
        assert_eq!(billing.status, status);
    }
}

#[test]
fn test_billing_currencies() {
    let currencies = vec!["CNY", "USD", "EUR", "JPY"];

    for currency in currencies {
        let billing = BillingRecord {
            id: Uuid::new_v4(),
            customer_id: Uuid::new_v4(),
            customer_name: "测试".to_string(),
            invoice_no: "INV-TEST".to_string(),
            amount: 100.0,
            currency: currency.to_string(),
            status: "draft".to_string(),
        };
        assert_eq!(billing.currency, currency);
    }
}

#[test]
fn test_billing_amount_positive() {
    let billing = BillingRecord {
        id: Uuid::new_v4(),
        customer_id: Uuid::new_v4(),
        customer_name: "测试".to_string(),
        invoice_no: "INV-POS".to_string(),
        amount: 1000.0,
        currency: "CNY".to_string(),
        status: "draft".to_string(),
    };

    assert!(billing.amount > 0.0);
}

#[test]
fn test_billing_serialization() {
    let billing = BillingRecord {
        id: Uuid::new_v4(),
        customer_id: Uuid::new_v4(),
        customer_name: "序列化测试".to_string(),
        invoice_no: "INV-SER-001".to_string(),
        amount: 5000.50,
        currency: "USD".to_string(),
        status: "paid".to_string(),
    };

    let json = serde_json::to_string(&billing).unwrap();
    let deserialized: BillingRecord = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.invoice_no, billing.invoice_no);
    assert_eq!(deserialized.amount, billing.amount);
    assert_eq!(deserialized.status, billing.status);
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
        service: "topems-crm".to_string(),
        uptime: 3600,
        database: "healthy".to_string(),
    };

    assert_eq!(health.status, "healthy");
    assert_eq!(health.service, "topems-crm");
    assert!(health.uptime > 0);
}

#[test]
fn test_health_response_degraded() {
    let health = HealthResponse {
        status: "degraded".to_string(),
        service: "topems-crm".to_string(),
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
            code: "crm".to_string(),
            name: "客户关系管理".to_string(),
            version: "0.1.0".to_string(),
            description: "CRM 客户关系管理系统".to_string(),
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

        assert_eq!(info.code, "crm");
        assert_eq!(info.name, "客户关系管理");
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

    #[test]
    fn test_customer_rating_levels() {
        let ratings = vec!["A", "B", "C", "D"];
        for rating in ratings {
            let customer = Customer {
                id: Uuid::new_v4(),
                name: format!("评级{}客户", rating),
                code: None,
                industry: None,
                status: "active".to_string(),
                customer_type: None,
                source: None,
                rating: Some(rating.to_string()),
                revenue: None,
                employee_count: None,
            };
            assert_eq!(customer.rating.as_deref(), Some(rating));
        }
    }

    #[test]
    fn test_opportunity_stage_transitions() {
        let stages = ["lead", "qualified", "proposal", "negotiation", "closed_won"];
        for window in stages.windows(2) {
            let from = window[0];
            let to = window[1];
            assert_ne!(from, to);
        }
    }

    #[test]
    fn test_customer_industries() {
        let industries = vec![
            "科技", "金融", "制造", "零售", "医疗", "教育", "能源", "物流",
        ];
        for industry in industries {
            assert!(!industry.is_empty());
        }
    }

    #[test]
    fn test_billing_invoice_number_format() {
        let invoice_no = "INV-2024-0001";
        assert!(invoice_no.starts_with("INV-"));
        let parts: Vec<&str> = invoice_no.split('-').collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "INV");
        assert_eq!(parts[1].len(), 4);
        assert_eq!(parts[2].len(), 4);
    }
}

#[cfg(test)]
mod scoring_logic_tests {
    use rust_decimal::Decimal;
    use topems_crm::modules::scoring_logic::{
        calculate_interaction_score, calculate_loyalty_score, calculate_opportunity_score,
        calculate_revenue_score, calculate_score_level, calculate_total_score, calculate_trend,
    };

    #[test]
    fn test_calculate_score_level_a() {
        assert_eq!(calculate_score_level(95), "A");
        assert_eq!(calculate_score_level(80), "A");
        assert_eq!(calculate_score_level(85), "A");
    }

    #[test]
    fn test_calculate_score_level_b() {
        assert_eq!(calculate_score_level(79), "B");
        assert_eq!(calculate_score_level(60), "B");
        assert_eq!(calculate_score_level(70), "B");
    }

    #[test]
    fn test_calculate_score_level_c() {
        assert_eq!(calculate_score_level(59), "C");
        assert_eq!(calculate_score_level(40), "C");
        assert_eq!(calculate_score_level(50), "C");
    }

    #[test]
    fn test_calculate_score_level_d() {
        assert_eq!(calculate_score_level(39), "D");
        assert_eq!(calculate_score_level(0), "D");
        assert_eq!(calculate_score_level(25), "D");
    }

    #[test]
    fn test_calculate_trend_up() {
        assert_eq!(calculate_trend(Some(70), 80), "up");
        assert_eq!(calculate_trend(Some(50), 60), "up");
        assert_eq!(calculate_trend(Some(0), 10), "up");
    }

    #[test]
    fn test_calculate_trend_down() {
        assert_eq!(calculate_trend(Some(80), 70), "down");
        assert_eq!(calculate_trend(Some(60), 50), "down");
        assert_eq!(calculate_trend(Some(10), 0), "down");
    }

    #[test]
    fn test_calculate_trend_stable() {
        assert_eq!(calculate_trend(Some(80), 80), "stable");
        assert_eq!(calculate_trend(None, 80), "stable");
        assert_eq!(calculate_trend(Some(50), 50), "stable");
    }

    #[test]
    fn test_calculate_revenue_score_high_value() {
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(1_000_000)), None),
            100
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(500_000)), Some(Decimal::from(100_000))),
            80
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(500_000)), Some(Decimal::from(600_000))),
            100
        );
    }

    #[test]
    fn test_calculate_revenue_score_medium_value() {
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(500_000)), None),
            80
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(100_000)), None),
            60
        );
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(50_000)), None),
            40
        );
    }

    #[test]
    fn test_calculate_revenue_score_low_value() {
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(10_000)), None),
            20
        );
        assert_eq!(calculate_revenue_score(None, None), 10);
        assert_eq!(
            calculate_revenue_score(Some(Decimal::from(5_000)), None),
            10
        );
    }

    #[test]
    fn test_calculate_opportunity_score_high_volume() {
        assert_eq!(calculate_opportunity_score(10, 7), 100);
        assert_eq!(calculate_opportunity_score(10, 5), 90);
        assert_eq!(calculate_opportunity_score(10, 3), 80);
    }

    #[test]
    fn test_calculate_opportunity_score_medium_volume() {
        assert_eq!(calculate_opportunity_score(5, 3), 75);
        assert_eq!(calculate_opportunity_score(3, 1), 50);
        assert_eq!(calculate_opportunity_score(1, 1), 55);
    }

    #[test]
    fn test_calculate_opportunity_score_low_volume() {
        assert_eq!(calculate_opportunity_score(0, 0), 10);
        assert_eq!(calculate_opportunity_score(1, 0), 25);
    }

    #[test]
    fn test_calculate_interaction_score() {
        assert_eq!(calculate_interaction_score(20), 100);
        assert_eq!(calculate_interaction_score(10), 80);
        assert_eq!(calculate_interaction_score(5), 60);
        assert_eq!(calculate_interaction_score(3), 40);
        assert_eq!(calculate_interaction_score(1), 20);
        assert_eq!(calculate_interaction_score(0), 10);
    }

    #[test]
    fn test_calculate_loyalty_score_active() {
        assert_eq!(calculate_loyalty_score(5, Some("active")), 100);
        assert_eq!(calculate_loyalty_score(3, Some("active")), 85);
        assert_eq!(calculate_loyalty_score(1, Some("active")), 70);
        assert_eq!(calculate_loyalty_score(0, Some("active")), 55);
    }

    #[test]
    fn test_calculate_loyalty_score_inactive() {
        assert_eq!(calculate_loyalty_score(5, Some("inactive")), 80);
        assert_eq!(calculate_loyalty_score(1, Some("inactive")), 50);
    }

    #[test]
    fn test_calculate_total_score() {
        assert_eq!(calculate_total_score(100, 100, 100, 100), 100);
        assert_eq!(calculate_total_score(0, 0, 0, 0), 10);
        assert_eq!(calculate_total_score(80, 80, 80, 80), 80);
        assert_eq!(calculate_total_score(100, 0, 0, 0), 35);
        assert_eq!(calculate_total_score(0, 100, 0, 0), 30);
        assert_eq!(calculate_total_score(0, 0, 100, 0), 20);
        assert_eq!(calculate_total_score(0, 0, 0, 100), 15);
    }
}

#[cfg(test)]
mod permission_logic_tests {

    #[derive(Debug, Clone, PartialEq)]
    enum ModulePermission {
        CustomerRead,
        CustomerWrite,
        ContactRead,
        ContactWrite,
        OpportunityRead,
        OpportunityWrite,
        InteractionRead,
        InteractionWrite,
        All,
    }

    impl std::fmt::Display for ModulePermission {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                ModulePermission::CustomerRead => write!(f, "crm:read"),
                ModulePermission::CustomerWrite => write!(f, "crm:write"),
                ModulePermission::ContactRead => write!(f, "crm:read"),
                ModulePermission::ContactWrite => write!(f, "crm:write"),
                ModulePermission::OpportunityRead => write!(f, "crm:read"),
                ModulePermission::OpportunityWrite => write!(f, "crm:write"),
                ModulePermission::InteractionRead => write!(f, "crm:read"),
                ModulePermission::InteractionWrite => write!(f, "crm:write"),
                ModulePermission::All => write!(f, "crm:admin"),
            }
        }
    }

    struct Claims {
        is_superuser: bool,
        permissions: Vec<String>,
    }

    impl Claims {
        fn has_permission(&self, permission: &str) -> bool {
            self.permissions.contains(&permission.to_string())
        }
    }

    fn check_permission(claims: &Claims, permission: &ModulePermission) -> Result<(), String> {
        if claims.is_superuser {
            return Ok(());
        }

        let permission_str = permission.to_string();

        if claims.has_permission(&permission_str) {
            return Ok(());
        }

        if claims.has_permission("crm:admin") {
            return Ok(());
        }

        if claims.has_permission("all") {
            return Ok(());
        }

        Err(format!("权限不足：需要 {} 权限", permission))
    }

    #[test]
    fn test_check_permission_superuser() {
        let claims = Claims {
            is_superuser: true,
            permissions: vec![],
        };

        let result = check_permission(&claims, &ModulePermission::CustomerRead);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_permission_has_required_permission() {
        let claims = Claims {
            is_superuser: false,
            permissions: vec!["crm:read".to_string()],
        };

        let result = check_permission(&claims, &ModulePermission::CustomerRead);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_permission_has_admin_permission() {
        let claims = Claims {
            is_superuser: false,
            permissions: vec!["crm:admin".to_string()],
        };

        let result = check_permission(&claims, &ModulePermission::CustomerWrite);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_permission_has_all_permission() {
        let claims = Claims {
            is_superuser: false,
            permissions: vec!["all".to_string()],
        };

        let result = check_permission(&claims, &ModulePermission::OpportunityRead);
        assert!(result.is_ok());
    }

    #[test]
    fn test_check_permission_lacks_permission() {
        let claims = Claims {
            is_superuser: false,
            permissions: vec!["hrm:read".to_string()],
        };

        let result = check_permission(&claims, &ModulePermission::CustomerRead);
        assert!(result.is_err());
    }

    #[test]
    fn test_module_permission_display() {
        assert_eq!(ModulePermission::CustomerRead.to_string(), "crm:read");
        assert_eq!(ModulePermission::CustomerWrite.to_string(), "crm:write");
        assert_eq!(ModulePermission::ContactRead.to_string(), "crm:read");
        assert_eq!(ModulePermission::ContactWrite.to_string(), "crm:write");
        assert_eq!(ModulePermission::OpportunityRead.to_string(), "crm:read");
        assert_eq!(ModulePermission::OpportunityWrite.to_string(), "crm:write");
        assert_eq!(ModulePermission::InteractionRead.to_string(), "crm:read");
        assert_eq!(ModulePermission::InteractionWrite.to_string(), "crm:write");
        assert_eq!(ModulePermission::All.to_string(), "crm:admin");
    }
}

#[cfg(test)]
mod mockall_examples {
    use mockall::mock;
    use rust_decimal::Decimal;

    mock! {
        pub ScoringDataProvider {
            pub async fn get_revenue(&self, customer_id: &str) -> Option<Decimal>;
            pub async fn get_opportunity_count(&self, customer_id: &str) -> i64;
            pub async fn get_won_count(&self, customer_id: &str) -> i64;
            pub async fn get_interaction_count(&self, customer_id: &str) -> i64;
            pub async fn get_years_since_created(&self, customer_id: &str) -> i64;
            pub async fn get_customer_status(&self, customer_id: &str) -> Option<String>;
        }
    }

    use topems_crm::modules::scoring_logic::{
        calculate_interaction_score, calculate_loyalty_score, calculate_opportunity_score,
        calculate_revenue_score, calculate_score_level, calculate_total_score, calculate_trend,
    };

    async fn calculate_customer_score_with_mock(provider: &MockScoringDataProvider) -> i32 {
        let customer_id = "test-customer-id";

        let revenue = provider.get_revenue(customer_id).await;
        let opportunity_count = provider.get_opportunity_count(customer_id).await;
        let won_count = provider.get_won_count(customer_id).await;
        let interaction_count = provider.get_interaction_count(customer_id).await;
        let years_since_created = provider.get_years_since_created(customer_id).await;
        let status_str = provider.get_customer_status(customer_id).await;
        let status = status_str.as_deref();

        let revenue_score = calculate_revenue_score(revenue, None);
        let opportunity_score = calculate_opportunity_score(opportunity_count, won_count);
        let interaction_score = calculate_interaction_score(interaction_count);
        let loyalty_score = calculate_loyalty_score(years_since_created, status);

        calculate_total_score(
            revenue_score,
            opportunity_score,
            interaction_score,
            loyalty_score,
        )
    }

    #[tokio::test]
    async fn test_mock_scoring_data_provider_high_value_customer() {
        let mut provider = MockScoringDataProvider::new();

        provider
            .expect_get_revenue()
            .returning(|_| Some(Decimal::from(1_000_000)));
        provider.expect_get_opportunity_count().returning(|_| 10);
        provider.expect_get_won_count().returning(|_| 7);
        provider.expect_get_interaction_count().returning(|_| 20);
        provider.expect_get_years_since_created().returning(|_| 5);
        provider
            .expect_get_customer_status()
            .returning(|_| Some("active".to_string()));

        let score = calculate_customer_score_with_mock(&provider).await;

        assert!(score >= 80);
        assert_eq!(calculate_score_level(score), "A");
    }

    #[tokio::test]
    async fn test_mock_scoring_data_provider_low_value_customer() {
        let mut provider = MockScoringDataProvider::new();

        provider
            .expect_get_revenue()
            .returning(|_| Some(Decimal::from(5_000)));
        provider.expect_get_opportunity_count().returning(|_| 1);
        provider.expect_get_won_count().returning(|_| 0);
        provider.expect_get_interaction_count().returning(|_| 0);
        provider.expect_get_years_since_created().returning(|_| 0);
        provider
            .expect_get_customer_status()
            .returning(|_| Some("inactive".to_string()));

        let score = calculate_customer_score_with_mock(&provider).await;

        assert!(score < 40);
        assert_eq!(calculate_score_level(score), "D");
    }

    #[tokio::test]
    async fn test_mock_scoring_data_provider_missing_data() {
        let mut provider = MockScoringDataProvider::new();

        provider.expect_get_revenue().returning(|_| None);
        provider.expect_get_opportunity_count().returning(|_| 0);
        provider.expect_get_won_count().returning(|_| 0);
        provider.expect_get_interaction_count().returning(|_| 0);
        provider.expect_get_years_since_created().returning(|_| 0);
        provider.expect_get_customer_status().returning(|_| None);

        let score = calculate_customer_score_with_mock(&provider).await;

        assert_eq!(score, 12);
        assert_eq!(calculate_score_level(score), "D");
    }

    #[tokio::test]
    async fn test_mock_trend_analysis() {
        let last_score = Some(60);
        let current_score = 80;

        let trend = calculate_trend(last_score, current_score);

        assert_eq!(trend, "up");
    }
}
