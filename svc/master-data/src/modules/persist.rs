//! U4 master-data 落库：v51-v60 MDM 模块的通用集合快照持久化层。
//!
//! 背景：10 个 MDM 模块原本以 `LazyLock<Mutex<Vec<T>>>` 内存 Store 运行，进程重启即失。
//! 本模块提供一个与具体实体解耦的 JSONB 快照持久化能力：
//!
//! * [`init`] —— 服务启动时注入唯一 `PgPool`（幂等，仅首次生效），并确保表存在。
//! * [`save`] —— 把某模块某叶子集合整体 upsert 为一行 `master_data.mdm_collections`。
//! * [`load`] —— 按 (module, entity) 读回并反序列化为集合。
//!
//! 设计原则：
//! * **best-effort**：未注入连接池（如纯函数单测）或写库失败时只记 warn、不 panic、不
//!   改变既有内存行为——保证所有既有纯逻辑测试零改动通过。
//! * **无接口契约影响**：持久化完全旁路在内存 Store 之外，handler 响应结构不变。
//! * 落库语义：启动 load-on-boot 恢复快照；运行期由后台 flush 任务近实时回写。
//!   B10 起 HTTP 写经 `flush_on_write` 中间件同步落库（写请求 ack 前已落库）；
//!   本层为 best-effort 快照，非事务权威存储。

use serde::de::DeserializeOwned;
use serde::Serialize;
use sqlx::PgPool;
use std::sync::OnceLock;

static POOL: OnceLock<PgPool> = OnceLock::new();

/// 注入服务唯一连接池。重复调用会被忽略（OnceLock）。
/// 同时确保 `master_data.mdm_collections` 表存在（与迁移文件等价的幂等 bootstrap）。
pub async fn init(pool: PgPool) {
    if POOL.set(pool.clone()).is_err() {
        return;
    }
    // sqlx prepare 不支持一条语句多个命令，逐条执行（B10 修复 bootstrap 报错；
    // 迁移链 20261003000010_u4_master_data_collections.sql 为权威 DDL，此处为兜底）。
    for ddl in [
        "CREATE SCHEMA IF NOT EXISTS master_data",
        r#"CREATE TABLE IF NOT EXISTS master_data.mdm_collections (
            module      TEXT        NOT NULL,
            entity      TEXT        NOT NULL,
            data        JSONB       NOT NULL,
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (module, entity)
        )"#,
        "CREATE INDEX IF NOT EXISTS mdm_collections_module_idx
            ON master_data.mdm_collections (module)",
    ] {
        if let Err(e) = sqlx::query(ddl).execute(&pool).await {
            tracing::warn!("[master-data] persist 表 bootstrap 失败（将依赖迁移链）: {e}");
            break;
        }
    }
}

/// 是否已注入连接池（即是否启用持久化）。
pub fn enabled() -> bool {
    POOL.get().is_some()
}

/// 把一个集合整体快照写库（upsert）。best-effort：失败仅记 warn。
pub async fn save<T: Serialize>(module: &str, entity: &str, items: &T) {
    let Some(pool) = POOL.get() else {
        return;
    };
    let json = match serde_json::to_value(items) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("[master-data] persist save 序列化失败 {module}/{entity}: {e}");
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
    .execute(pool)
    .await;
    if let Err(e) = res {
        tracing::warn!("[master-data] persist save 写库失败 {module}/{entity}: {e}");
    }
}

/// 按 (module, entity) 读回集合并反序列化。无行或反序列化失败返回 None。
pub async fn load<T: DeserializeOwned>(module: &str, entity: &str) -> Option<T> {
    let pool = POOL.get()?;
    let row: Option<serde_json::Value> = sqlx::query_scalar(
        r#"SELECT data FROM master_data.mdm_collections WHERE module = $1 AND entity = $2"#,
    )
    .bind(module)
    .bind(entity)
    .fetch_optional(pool)
    .await
    .ok()?;
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
