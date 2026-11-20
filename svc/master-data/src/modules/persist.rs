//! U4 master-data 落库：v51-v60 MDM 模块的通用集合快照持久化层。
//!
//! 背景：10 个 MDM 模块原本以 `LazyLock<Mutex<Vec<T>>>` 内存 Store 运行，进程重启即失。
//! 本模块提供一个与具体实体解耦的 JSONB 快照持久化能力：
//!
//! * [`init`] —— 服务启动时注入唯一 [`Db`]（幂等，仅首次生效）。
//! * [`save`] —— 把某模块某叶子集合整体 upsert 为一行 `master_data.mdm_collections`。
//! * [`load`] —— 按 (module, entity) 读回并反序列化为集合。
//!
//! 设计原则：
//! * **best-effort**：未注入 [`Db`]（如纯函数单测）或写库失败时只记 warn、不 panic、不
//!   改变既有内存行为——保证所有既有纯逻辑测试零改动通过。
//! * **无接口契约影响**：持久化完全旁路在内存 Store 之外，handler 响应结构不变。
//! * 落库语义：启动 load-on-boot 恢复快照；运行期由后台 flush 任务近实时回写。
//!   B10 起 HTTP 写经 `flush_on_write` 中间件同步落库（写请求 ack 前已落库）；
//!   本层为 best-effort 快照，非事务权威存储。
//! * **无租户上下文**：本层是模块级全局快照（`mdm_collections` 无 tenant_id），
//!   不属于任何请求链路，必须走显式系统通道（`scope_system` / `scope_read_system`），
//!   不得用池直连——池连接没有 `app.rls_system`，严格 RLS 下会被策略 fail-closed。

use serde::de::DeserializeOwned;
use serde::Serialize;
use std::sync::OnceLock;
use topems_shared_db::Db;

static DB: OnceLock<Db> = OnceLock::new();

/// 注入服务唯一 DB 句柄。重复调用会被忽略（OnceLock）。
/// schema 与索引均由迁移链维护，此处不再执行任何 DDL。
pub fn init(db: Db) {
    let _ = DB.set(db);
}

/// 是否已注入 DB 句柄（即是否启用持久化）。
pub fn enabled() -> bool {
    DB.get().is_some()
}

/// 把一个集合整体快照写库（upsert）。best-effort：失败仅记 warn。
pub async fn save<T: Serialize>(module: &str, entity: &str, items: &T) {
    let Some(db) = DB.get() else {
        return;
    };
    let json = match serde_json::to_value(items) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("[master-data] persist save 序列化失败 {module}/{entity}: {e}");
            return;
        }
    };
    let mut scope = match db.scope_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("[master-data] persist save 无法开启系统写通道 {module}/{entity}: {e}");
            return;
        }
    };
    let res = sqlx::query(
        r#"INSERT INTO master_data.mdm_collections (module, entity, data, updated_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (module, entity)
           DO UPDATE SET data = EXCLUDED.data, updated_at = now()"#,
    )
    .bind(module)
    .bind(entity)
    .bind(json)
    .execute(&mut scope)
    .await;
    match res {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::warn!("[master-data] persist save 提交失败 {module}/{entity}: {e}");
            }
        }
        Err(e) => {
            tracing::warn!("[master-data] persist save 写库失败 {module}/{entity}: {e}");
            let _ = scope.rollback().await;
        }
    }
}

/// 按 (module, entity) 读回集合并反序列化。无行或反序列化失败返回 None。
pub async fn load<T: DeserializeOwned>(module: &str, entity: &str) -> Option<T> {
    let db = DB.get()?;
    let mut scope = match db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("[master-data] persist load 无法开启系统读通道 {module}/{entity}: {e}");
            return None;
        }
    };
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT data FROM master_data.mdm_collections WHERE module = $1 AND entity = $2"#,
    )
    .bind(module)
    .bind(entity)
    .fetch_optional(&mut scope)
    .await
    .ok()?;
    let _ = scope.commit().await;
    let val = row?;
    serde_json::from_value::<T>(val).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct Row {
        id: String,
        count: i64,
        tags: Vec<String>,
    }

    #[test]
    fn roundtrip_serialization_shape() {
        // 无连接池时 save/load 为 no-op/None，验证序列化/反序列化形状自洽（不依赖 DB）。
        let items = vec![
            Row {
                id: "a".into(),
                count: 1,
                tags: vec!["x".into()],
            },
            Row {
                id: "b".into(),
                count: 2,
                tags: vec!["y".into(), "z".into()],
            },
        ];
        let json = serde_json::to_value(&items).unwrap();
        let back: Vec<Row> = serde_json::from_value(json).unwrap();
        assert_eq!(items, back);
    }

    #[tokio::test]
    async fn save_is_noop_without_pool() {
        // 未 init 连接池：enabled()==false，save 不 panic。
        assert!(!enabled());
        save("unit", "sample", &vec![1, 2, 3]).await;
        assert!(load::<Vec<i32>>("unit", "sample").await.is_none());
    }
}
