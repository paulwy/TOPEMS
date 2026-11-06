// ==================== graphql_query_impls：根类型字段实现（批次5 委托式拆分） ====================
// 拆分自 graphql_schema.rs：字段函数体搬移至此（pub async fn impl_*），主文件保留委托壳。

#![allow(ambiguous_glob_reexports, unused_imports)]
#![allow(
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    clippy::indexing_slicing,
    clippy::cast_lossless
)]
use async_graphql::dataloader::DataLoader;
use async_graphql::Context;
use futures_util::future::join_all;

use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_types::*;
use crate::shared::AppState;

pub async fn impl_business_stats(ctx: &Context<'_>) -> async_graphql::Result<BusinessStatsGql> {
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

pub async fn impl_unified_todos(ctx: &Context<'_>) -> async_graphql::Result<Vec<UnifiedTodoGql>> {
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
                created_at: task.created_at,
            });
        }
    }

    // V34.0: 修复 portal_todos 查询（使用正确的 schema 和 completed 列）
    if let Ok(mut scope) = state.db.scope_read().await {
        let rows = sqlx::query(
            r#"SELECT id, title, created_at FROM portal.portal_todos
               WHERE deleted_at IS NULL AND completed = FALSE
               ORDER BY created_at DESC LIMIT 10"#,
        )
        .fetch_all(&mut scope)
        .await;
        if let Err(e) = scope.commit().await {
            tracing::warn!("提交待办只读作用域失败: {}", e);
        }
        if let Ok(rows) = rows {
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
                        created_at,
                    });
                }
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
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|t| t.with_timezone(&chrono::Utc))
                    .unwrap_or_else(chrono::Utc::now),
            });
        }
    }

    Ok(todos)
}

pub async fn impl_service_health(
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

pub async fn impl_dashboard(ctx: &Context<'_>) -> async_graphql::Result<DashboardGql> {
    let (stats, todos, services) = tokio::join!(
        impl_business_stats(ctx),
        impl_unified_todos(ctx),
        impl_service_health(ctx),
    );

    Ok(DashboardGql {
        stats: stats?,
        todos: todos?,
        services: services?,
    })
}

pub async fn impl_service_health_by_name(
    ctx: &Context<'_>,
    service: String,
) -> async_graphql::Result<Option<ServiceHealthGql>> {
    let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
    Ok(loader.load_one(service).await?)
}

pub async fn impl_service_health_batch(
    ctx: &Context<'_>,
    services: Vec<String>,
) -> async_graphql::Result<Vec<ServiceHealthGql>> {
    let loader = ctx.data::<DataLoader<ServiceHealthLoader>>()?;
    let map = loader.load_many(services).await?;
    Ok(map.into_values().collect())
}

pub async fn impl_todo_by_id(
    ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<Option<UnifiedTodoGql>> {
    let uuid = uuid::Uuid::parse_str(&id)
        .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;
    let loader = ctx.data::<DataLoader<TodoLoader>>()?;
    Ok(loader.load_one(uuid).await?)
}
