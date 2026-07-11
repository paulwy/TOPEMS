//! 演示数据模块
//!
//! 本模块集中存放未实现功能的占位演示数据。
//! 这些数据仅用于 API 契约验证和前端联调，不应在生产环境中依赖。
//! 当对应功能实现真实数据库查询后，应删除相关数据。

use serde_json::{json, Value};

/// 应收账款账龄分析演示数据
///
/// TODO: 当 `get_receivable_aging` 实现真实数据库查询后删除此数据。
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
/// TODO: 当 `get_payable_aging` 实现真实数据库查询后删除此数据。
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
