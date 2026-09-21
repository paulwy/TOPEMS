//! 跨服务业务数据聚合模块 - Portal BFF Phase 2
//!
//! 并行聚合多个业务服务的关键指标：
//! - ERP → 销售订单数、采购订单数、物料数、库存汇总
//! - CRM → 客户数、商机数
//! - HRM → 员工数、部门数
//! - Finance → 凭证数、财务汇总
//! - Workflow → 待审批数
//! - MES → 生产订单数、在制品数
//!
//! 每个数据源独立降级，单一服务故障不影响整体聚合。

use axum::{
    extract::{Extension, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::{shared::AppState, utils::user_context::extract_bearer_token};

/// 跨服务业务统计聚合
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessStatsAggregation {
    pub generated_at: String,
    pub erp: ErpStats,
    pub crm: CrmStats,
    pub hrm: HrmStats,
    pub finance: FinanceStats,
    pub mes: MesStats,
    pub workflow: WorkflowStats,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ErpStats {
    pub sales_orders: u64,
    pub purchase_orders: u64,
    pub materials: u64,
    pub customers: u64,
    pub suppliers: u64,
    pub available: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CrmStats {
    pub customers: u64,
    pub leads: u64,
    pub opportunities: u64,
    pub available: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HrmStats {
    pub employees: u64,
    pub departments: u64,
    pub available: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FinanceStats {
    pub vouchers: u64,
    pub pending_approvals: u64,
    pub available: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MesStats {
    pub production_orders: u64,
    pub wip_count: u64,
    pub available: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkflowStats {
    pub pending_tasks: u64,
    pub todo_count: u64,
    pub available: bool,
}

/// 统一待办项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedTodoItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub source: String,
    pub source_url: String,
    pub priority: String,
    pub created_at: Option<String>,
    pub due_date: Option<String>,
}

/// 统一待办聚合结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedTodosAggregation {
    pub total: usize,
    pub by_source: std::collections::HashMap<String, usize>,
    pub items: Vec<UnifiedTodoItem>,
}

/// 业务统计聚合 API
pub async fn get_business_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<BusinessStatsAggregation>> {
    let token = extract_bearer_token(&headers);
    let user_id = &claims.sub;

    let (erp_stats, crm_stats, hrm_stats, finance_stats, mes_stats, workflow_stats) = tokio::join!(
        fetch_erp_stats(&state),
        fetch_crm_stats(&state),
        fetch_hrm_stats(&state),
        fetch_finance_stats(&state, user_id, token.as_deref()),
        fetch_mes_stats(&state),
        fetch_workflow_stats(&state, user_id, token.as_deref()),
    );

    let result = BusinessStatsAggregation {
        generated_at: chrono::Utc::now().to_rfc3339(),
        erp: erp_stats,
        crm: crm_stats,
        hrm: hrm_stats,
        finance: finance_stats,
        mes: mes_stats,
        workflow: workflow_stats,
    };

    Json(ApiResponse::success(result, "业务统计聚合成功"))
}

/// 统一待办列表 API
pub async fn get_unified_todos(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<UnifiedTodosAggregation>> {
    let token = extract_bearer_token(&headers);
    let user_id = &claims.sub;

    let (workflow_todos, local_todos, notification_todos) = tokio::join!(
        fetch_workflow_todos(&state, token.as_deref()),
        fetch_local_todos(&state, user_id),
        fetch_notification_todos(&state, token.as_deref()),
    );

    let mut items = Vec::new();
    let mut by_source: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

    for todo in workflow_todos {
        let source = "workflow".to_string();
        *by_source.entry(source.clone()).or_insert(0) += 1;
        items.push(todo);
    }
    for todo in local_todos {
        let source = "portal".to_string();
        *by_source.entry(source.clone()).or_insert(0) += 1;
        items.push(todo);
    }
    for todo in notification_todos {
        let source = "notification".to_string();
        *by_source.entry(source.clone()).or_insert(0) += 1;
        items.push(todo);
    }

    let total = items.len();
    Json(ApiResponse::success(
        UnifiedTodosAggregation {
            total,
            by_source,
            items,
        },
        "统一待办聚合成功",
    ))
}

async fn fetch_erp_stats(state: &AppState) -> ErpStats {
    let client = state.erp_client.clone();

    let (sales, purchase, materials, customers, suppliers) = tokio::join!(
        async {
            client
                .list_sales_orders(1, 1)
                .await
                .ok()
                .map(|r| r.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_purchase_orders(1, 1)
                .await
                .ok()
                .map(|r| r.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_materials(1, 1)
                .await
                .ok()
                .map(|r| r.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_customers(1, 1)
                .await
                .ok()
                .map(|r| r.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_suppliers(1, 1)
                .await
                .ok()
                .map(|r| r.len() as u64)
                .unwrap_or(0)
        },
    );

    let available = sales + purchase + materials > 0 || customers + suppliers > 0;
    ErpStats {
        sales_orders: sales,
        purchase_orders: purchase,
        materials,
        customers,
        suppliers,
        available,
    }
}

async fn fetch_crm_stats(state: &AppState) -> CrmStats {
    let client = state.crm_client.clone();

    let (customers, leads, opportunities) = tokio::join!(
        async {
            client
                .list_customers(1, 1)
                .await
                .ok()
                .map(|d| d.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_leads(1, 1)
                .await
                .ok()
                .map(|d| d.len() as u64)
                .unwrap_or(0)
        },
        async {
            client
                .list_opportunities(1, 1)
                .await
                .ok()
                .map(|d| d.len() as u64)
                .unwrap_or(0)
        },
    );

    CrmStats {
        customers,
        leads,
        opportunities,
        available: customers + leads + opportunities > 0,
    }
}

async fn fetch_hrm_stats(state: &AppState) -> HrmStats {
    let client = state.hrm_client.clone();

    let employees = match client.list_employees().await {
        Ok(emps) => emps.len() as u64,
        Err(e) => {
            tracing::error!("aggregation hrm list_employees failed: {:?}", e);
            0
        }
    };

    let departments = match client.list_departments().await {
        Ok(deps) => deps.len() as u64,
        Err(e) => {
            tracing::error!("aggregation hrm list_departments failed: {:?}", e);
            0
        }
    };

    HrmStats {
        employees,
        departments,
        available: employees + departments > 0,
    }
}

async fn fetch_finance_stats(state: &AppState, user_id: &str, token: Option<&str>) -> FinanceStats {
    let client = state.finance_client.clone();

    let vouchers = match client.list_vouchers("", "").await {
        Ok(r) => r.len() as u64,
        Err(e) => {
            tracing::error!("aggregation finance list_vouchers failed: {:?}", e);
            0
        }
    };

    let pending_approvals = if let Some(t) = token {
        state
            .cached_my_task_stats(user_id, t)
            .await
            .map(|stats| stats.my_pending as u64)
            .unwrap_or(0)
    } else {
        0
    };

    FinanceStats {
        vouchers,
        pending_approvals,
        available: vouchers > 0,
    }
}

async fn fetch_mes_stats(state: &AppState) -> MesStats {
    let client = state.mes_client.clone();

    let orders = match client.list_production_orders(1, 1000).await {
        Ok(items) => items.len() as u64,
        Err(_) => 0,
    };

    let wip = match client.get_wip_summary().await {
        Ok(data) => data
            .get("total_wip")
            .or_else(|| data.get("total_count"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as u64,
        Err(_) => 0,
    };

    MesStats {
        production_orders: orders,
        wip_count: wip,
        available: orders + wip > 0,
    }
}

async fn fetch_workflow_stats(
    state: &AppState,
    user_id: &str,
    token: Option<&str>,
) -> WorkflowStats {
    if let Some(t) = token {
        match state.cached_my_task_stats(user_id, t).await {
            Some(stats) => WorkflowStats {
                pending_tasks: stats.my_pending as u64,
                todo_count: stats.todo as u64,
                available: true,
            },
            None => WorkflowStats::default(),
        }
    } else {
        WorkflowStats::default()
    }
}

async fn fetch_workflow_todos(state: &AppState, token: Option<&str>) -> Vec<UnifiedTodoItem> {
    if let Some(t) = token {
        let mut client = state.workflow_client.clone();
        client.set_auth_token(t);
        match client.get_my_pending_tasks(1, 20).await {
            Ok(resp) => resp
                .items
                .into_iter()
                .map(|task| UnifiedTodoItem {
                    id: task.id.to_string(),
                    title: format!("任务 #{}", task.id),
                    description: task.comment.unwrap_or_default(),
                    source: "workflow".to_string(),
                    source_url: "/workflow/tasks".to_string(),
                    priority: task.priority.unwrap_or_else(|| "normal".to_string()),
                    created_at: Some(task.created_at.to_rfc3339()),
                    due_date: task.due_time.map(|dt| dt.to_rfc3339()),
                })
                .collect(),
            Err(_) => Vec::new(),
        }
    } else {
        Vec::new()
    }
}

async fn fetch_local_todos(state: &AppState, user_id: &str) -> Vec<UnifiedTodoItem> {
    match sqlx::query("SELECT id, title, description, priority, created_at, due_date FROM portal.portal_todos WHERE user_id = $1 AND completed = false ORDER BY created_at DESC LIMIT 20")
        .bind(user_id)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => rows
            .iter()
            .map(|row| UnifiedTodoItem {
                id: row.get::<uuid::Uuid, _>("id").to_string(),
                title: row.get("title"),
                description: row.get::<Option<String>, _>("description").unwrap_or_default(),
                source: "portal".to_string(),
                source_url: "/portal/todos".to_string(),
                priority: row.get::<Option<String>, _>("priority").unwrap_or_else(|| "normal".to_string()),
                created_at: row
                    .get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")
                    .map(|dt| dt.to_rfc3339()),
                due_date: row
                    .get::<Option<chrono::DateTime<chrono::Utc>>, _>("due_date")
                    .map(|dt| dt.to_rfc3339()),
            })
            .collect(),
        Err(_) => Vec::new(),
    }
}

async fn fetch_notification_todos(state: &AppState, token: Option<&str>) -> Vec<UnifiedTodoItem> {
    if let Some(t) = token {
        let mut client = state.notification_client.clone();
        client.set_auth_token(t);
        match client.get_unread().await {
            Ok(notifications) => notifications
                .into_iter()
                .filter_map(|n| {
                    Some(UnifiedTodoItem {
                        id: n.get("id")?.as_str()?.to_string(),
                        title: n.get("title")?.as_str()?.to_string(),
                        description: n.get("content")?.as_str()?.to_string(),
                        source: "notification".to_string(),
                        source_url: n
                            .get("link_url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| "/notifications".to_string()),
                        priority: match n.get("priority")?.as_i64()? {
                            0..=3 => "high".to_string(),
                            4..=6 => "normal".to_string(),
                            _ => "low".to_string(),
                        },
                        created_at: n
                            .get("created_at")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        due_date: None,
                    })
                })
                .collect(),
            Err(_) => Vec::new(),
        }
    } else {
        Vec::new()
    }
}

/// 聚合模块路由
#[allow(dead_code)]
pub fn aggregation_routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route(
            "/api/portal/dashboard/business-stats",
            get(get_business_stats),
        )
        .route(
            "/api/portal/dashboard/unified-todos",
            get(get_unified_todos),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use serde_json::{from_value, to_value, Value};

    fn roundtrip<T>(s: &T) -> Value
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let v1 = to_value(s).expect("serialize first");
        let s2: T = from_value(v1.clone()).expect("deserialize");
        let v2 = to_value(&s2).expect("serialize second");
        assert_eq!(v1, v2, "roundtrip value mismatch");
        v1
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    fn now() -> String {
        chrono::Utc::now().to_rfc3339()
    }

    #[test]
    fn erp_stats_roundtrip() {
        let s = ErpStats::default();
        roundtrip(&s);
    }

    #[test]
    fn crm_stats_roundtrip() {
        let s = CrmStats::default();
        roundtrip(&s);
    }

    #[test]
    fn hrm_stats_roundtrip() {
        let s = HrmStats::default();
        roundtrip(&s);
    }

    #[test]
    fn finance_stats_roundtrip() {
        let s = FinanceStats::default();
        roundtrip(&s);
    }

    #[test]
    fn mes_stats_roundtrip() {
        let s = MesStats::default();
        roundtrip(&s);
    }

    #[test]
    fn workflow_stats_roundtrip() {
        let s = WorkflowStats::default();
        roundtrip(&s);
    }

    #[test]
    fn business_stats_aggregation_roundtrip() {
        let s = BusinessStatsAggregation {
            generated_at: now(),
            erp: ErpStats::default(),
            crm: CrmStats::default(),
            hrm: HrmStats::default(),
            finance: FinanceStats::default(),
            mes: MesStats::default(),
            workflow: WorkflowStats::default(),
        };
        roundtrip(&s);
    }

    #[test]
    fn unified_todo_item_roundtrip() {
        let s = UnifiedTodoItem {
            id: uid(),
            title: "审批采购单".to_string(),
            description: "请审批 PO-2024-001".to_string(),
            source: "workflow".to_string(),
            source_url: "/workflow/tasks".to_string(),
            priority: "high".to_string(),
            created_at: Some(now()),
            due_date: None,
        };
        roundtrip(&s);
    }

    #[test]
    fn unified_todos_aggregation_roundtrip() {
        let item = UnifiedTodoItem {
            id: uid(),
            title: "t".to_string(),
            description: "d".to_string(),
            source: "portal".to_string(),
            source_url: "/todos".to_string(),
            priority: "normal".to_string(),
            created_at: Some(now()),
            due_date: Some(now()),
        };
        let mut by_source = std::collections::HashMap::new();
        by_source.insert("portal".to_string(), 1);
        let s = UnifiedTodosAggregation {
            total: 1,
            by_source,
            items: vec![item],
        };
        roundtrip(&s);
    }
}
