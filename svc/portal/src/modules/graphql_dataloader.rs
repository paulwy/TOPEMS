//! GraphQL DataLoader 实现
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 提供批量加载器，解决 N+1 查询问题。

use async_graphql::dataloader::Loader;
use futures_util::future::join_all;
use std::collections::HashMap;

use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_db::scope::Db;

use crate::modules::graphql_helpers::{probe_service_health, service_url};
use crate::modules::graphql_types::{ServiceHealthGql, UnifiedTodoGql};

// ==================== DataLoader 实现 ====================

/// 服务健康状态批量加载器
/// 解决 N+1 问题：当多个查询同时请求不同服务的健康状态时，
/// DataLoader 会自动合并为一次批量请求。
pub struct ServiceHealthLoader;

impl Loader<String> for ServiceHealthLoader {
    type Value = ServiceHealthGql;
    type Error = std::convert::Infallible;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        // 并行批量检查所有请求的服务健康状态
        let futures = keys.iter().map(|service_name| async move {
            let url = service_url(service_name);
            let healthy = probe_service_health(service_name, &url).await;
            (
                service_name.clone(),
                ServiceHealthGql {
                    service: service_name.clone(),
                    healthy,
                    url: url.to_string(),
                },
            )
        });
        let results = join_all(futures).await;
        Ok(results.into_iter().collect())
    }
}

/// 待办事项批量加载器
/// 解决 N+1 问题：当多个查询同时请求不同 todo 的详情时，
/// DataLoader 会自动合并为一次数据库查询。
pub struct TodoLoader {
    db: Db,
    /// 请求级事务；由 GraphQL 执行闭包按请求注入，schema 级实例为 None
    txn_arc: Option<RlsTxnCell>,
}

impl TodoLoader {
    pub fn new(db: Db) -> Self {
        Self { db, txn_arc: None }
    }

    /// 按请求构造：绑定当前请求事务，与同一请求内的其他读写共用快照
    pub fn with_request_txn(db: Db, txn_arc: RlsTxnCell) -> Self {
        Self {
            db,
            txn_arc: Some(txn_arc),
        }
    }
}

impl Loader<uuid::Uuid> for TodoLoader {
    type Value = UnifiedTodoGql;
    type Error = std::convert::Infallible;

    async fn load(
        &self,
        keys: &[uuid::Uuid],
    ) -> Result<HashMap<uuid::Uuid, Self::Value>, Self::Error> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        // 批量查询：一次 SQL 获取所有请求的 todo（只读作用域：search_path = "public, portal"）
        // 没有请求事务时不读取数据库（保持原有「无请求上下文返回空结果」的行为）
        let Some(txn_arc) = &self.txn_arc else {
            tracing::warn!("TodoLoader 缺少请求事务上下文，返回空结果");
            return Ok(HashMap::new());
        };
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            tracing::warn!("数据库事务上下文缺失：请求事务未注入，TodoLoader 返回空结果");
            return Ok(HashMap::new());
        };
        let mut scope = match self.db.scope_with(txn).await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::warn!("TodoLoader 打开只读作用域失败: {}", e);
                return Ok(HashMap::new());
            }
        };
        let rows = sqlx::query(
            r#"SELECT id, title, created_at FROM portal.portal_todos
               WHERE id = ANY($1) AND deleted_at IS NULL"#,
        )
        .bind(keys)
        .fetch_all(&mut scope)
        .await;
        if let Err(e) = scope.commit().await {
            tracing::warn!("TodoLoader 提交只读作用域失败: {}", e);
        }

        let mut result = HashMap::new();
        if let Ok(rows) = rows {
            use sqlx::Row;
            for row in rows {
                let id: uuid::Uuid = row.try_get("id").unwrap_or_default();
                let title: String = row.try_get("title").unwrap_or_default();
                let created_at: chrono::DateTime<chrono::Utc> = row
                    .try_get("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now());
                result.insert(
                    id,
                    UnifiedTodoGql {
                        id: id.to_string(),
                        title,
                        source: "portal".into(),
                        priority: 0,
                        status: "pending".into(),
                        created_at,
                    },
                );
            }
        }

        // 对未找到的 key 填充默认值
        for key in keys {
            result.entry(*key).or_insert_with(|| UnifiedTodoGql {
                id: key.to_string(),
                title: String::new(),
                source: "portal".into(),
                priority: 0,
                status: "not_found".into(),
                created_at: chrono::Utc::now(),
            });
        }

        Ok(result)
    }
}
