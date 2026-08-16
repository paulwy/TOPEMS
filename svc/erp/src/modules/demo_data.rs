//! 演示数据模块
//!
//! 本模块集中存放未实现功能的占位演示数据。
//! 这些数据仅用于 API 契约验证和前端联调，不应在生产环境中依赖。
//! 当对应功能实现真实数据库查询后，应删除相关数据。

use serde_json::{json, Value};

/// 应收账款账龄分析演示数据
///
/// 此数据仅用于 API 契约验证和前端联调，不应在生产环境中依赖。
/// 当对应功能实现真实数据库查询后，应删除此函数。
pub fn receivable_aging_demo() -> Value {
    json!({
        "items": [
            {
                "customer_id": "cust001",
                "customer_name": "北京科技有限公司",
                "total": 150000.0,
                "current": 80000.0,
                "over_30": 40000.0,
                "over_60": 20000.0,
                "over_90": 10000.0,
                "over_180": 0.0
            },
            {
                "customer_id": "cust002",
                "customer_name": "上海贸易公司",
                "total": 95000.0,
                "current": 50000.0,
                "over_30": 25000.0,
                "over_60": 15000.0,
                "over_90": 5000.0,
                "over_180": 0.0
            },
            {
                "customer_id": "cust003",
                "customer_name": "广州制造集团",
                "total": 200000.0,
                "current": 100000.0,
                "over_30": 50000.0,
                "over_60": 30000.0,
                "over_90": 15000.0,
                "over_180": 5000.0
            }
        ],
        "total": 445000.0
    })
}

/// 应付账款账龄分析演示数据
///
/// 此数据仅用于 API 契约验证和前端联调，不应在生产环境中依赖。
/// 当对应功能实现真实数据库查询后，应删除此函数。
pub fn payable_aging_demo() -> Value {
    json!({
        "items": [
            {
                "supplier_id": "supp001",
                "supplier_name": "深圳供应商有限公司",
                "total": 85000.0,
                "current": 50000.0,
                "over_30": 20000.0,
                "over_60": 10000.0,
                "over_90": 5000.0,
                "over_180": 0.0
            },
            {
                "supplier_id": "supp002",
                "supplier_name": "杭州原材料厂",
                "total": 62000.0,
                "current": 35000.0,
                "over_30": 15000.0,
                "over_60": 10000.0,
                "over_90": 2000.0,
                "over_180": 0.0
            }
        ],
        "total": 147000.0
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_receivable_aging_demo_returns_object() {
        let v = receivable_aging_demo();
        assert!(v.is_object());
    }

    #[test]
    fn test_receivable_aging_demo_has_items_array() {
        let v = receivable_aging_demo();
        let items = v.get("items").expect("items field should exist");
        assert!(items.is_array());
        assert_eq!(items.as_array().unwrap().len(), 3);
    }

    #[test]
    fn test_receivable_aging_demo_has_total() {
        let v = receivable_aging_demo();
        let total = v.get("total").expect("total field should exist");
        assert!(total.is_number());
        assert!((total.as_f64().unwrap() - 445000.0).abs() < 1e-6);
    }

    #[test]
    fn test_receivable_aging_demo_item_fields() {
        let v = receivable_aging_demo();
        let first = &v["items"][0];
        assert_eq!(first["customer_id"].as_str(), Some("cust001"));
        assert_eq!(first["customer_name"].as_str(), Some("北京科技有限公司"));
        assert!(first.get("total").unwrap().is_number());
        assert!(first.get("current").unwrap().is_number());
        assert!(first.get("over_30").unwrap().is_number());
        assert!(first.get("over_60").unwrap().is_number());
        assert!(first.get("over_90").unwrap().is_number());
        assert!(first.get("over_180").unwrap().is_number());
    }

    #[test]
    fn test_receivable_aging_demo_total_matches_sum() {
        // Each item's total should be sum of its buckets
        let v = receivable_aging_demo();
        for item in v["items"].as_array().unwrap() {
            let total = item["total"].as_f64().unwrap();
            let buckets = item["current"].as_f64().unwrap()
                + item["over_30"].as_f64().unwrap()
                + item["over_60"].as_f64().unwrap()
                + item["over_90"].as_f64().unwrap()
                + item["over_180"].as_f64().unwrap();
            assert!((total - buckets).abs() < 1e-6);
        }
    }

    #[test]
    fn test_receivable_aging_demo_consistent_across_calls() {
        let v1 = receivable_aging_demo();
        let v2 = receivable_aging_demo();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_payable_aging_demo_returns_object() {
        let v = payable_aging_demo();
        assert!(v.is_object());
    }

    #[test]
    fn test_payable_aging_demo_has_items_array() {
        let v = payable_aging_demo();
        let items = v.get("items").expect("items field should exist");
        assert!(items.is_array());
        assert_eq!(items.as_array().unwrap().len(), 2);
    }

    #[test]
    fn test_payable_aging_demo_has_total() {
        let v = payable_aging_demo();
        let total = v.get("total").expect("total field should exist");
        assert!(total.is_number());
        assert!((total.as_f64().unwrap() - 147000.0).abs() < 1e-6);
    }

    #[test]
    fn test_payable_aging_demo_item_fields() {
        let v = payable_aging_demo();
        let first = &v["items"][0];
        assert_eq!(first["supplier_id"].as_str(), Some("supp001"));
        assert_eq!(first["supplier_name"].as_str(), Some("深圳供应商有限公司"));
        assert!(first.get("total").unwrap().is_number());
        assert!(first.get("current").unwrap().is_number());
        assert!(first.get("over_30").unwrap().is_number());
        assert!(first.get("over_60").unwrap().is_number());
        assert!(first.get("over_90").unwrap().is_number());
        assert!(first.get("over_180").unwrap().is_number());
    }

    #[test]
    fn test_payable_aging_demo_total_matches_sum() {
        let v = payable_aging_demo();
        for item in v["items"].as_array().unwrap() {
            let total = item["total"].as_f64().unwrap();
            let buckets = item["current"].as_f64().unwrap()
                + item["over_30"].as_f64().unwrap()
                + item["over_60"].as_f64().unwrap()
                + item["over_90"].as_f64().unwrap()
                + item["over_180"].as_f64().unwrap();
            assert!((total - buckets).abs() < 1e-6);
        }
    }

    #[test]
    fn test_payable_aging_demo_consistent_across_calls() {
        let v1 = payable_aging_demo();
        let v2 = payable_aging_demo();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_receivable_and_payable_are_different() {
        let r = receivable_aging_demo();
        let p = payable_aging_demo();
        assert_ne!(r, p);
        assert_ne!(r["items"][0]["customer_id"], p["items"][0]["supplier_id"]);
    }
}
