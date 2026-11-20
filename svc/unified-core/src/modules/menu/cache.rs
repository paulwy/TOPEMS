//! 角色化菜单读取的短 TTL 缓存。
//!
//! 缓存粒度是「租户」：DB 中 active 菜单全集按租户缓存 60s，
//! 每次请求只在内存中按当前用户权限过滤，避免每次渲染都打库。
//! 菜单变更最迟 60s 后生效；Phase 2 双写时会在此处补主动失效。

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use serde_json::Value;
use uuid::Uuid;

pub const MENU_CACHE_TTL: Duration = Duration::from_secs(60);

/// core_menus 读取行（不含 tenant 过滤后的权限裁剪）。
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbMenuRow {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub parent_id: Option<Uuid>,
    pub permissions: Option<Value>,
    /// 所属分组元数据：随菜单一次返回，供前端按 DB 分组语义渲染。
    pub group_code: Option<String>,
    pub group_name: Option<String>,
    pub group_sort_order: Option<i32>,
}

struct CacheEntry {
    loaded_at: Instant,
    rows: Arc<Vec<DbMenuRow>>,
}

#[derive(Default)]
pub struct MenuCache {
    inner: RwLock<HashMap<String, CacheEntry>>,
}

impl MenuCache {
    pub fn new() -> Self {
        Self::default()
    }

    /// 读取未过期缓存；过期或不存在返回 None。
    pub fn get(&self, key: &str) -> Option<Arc<Vec<DbMenuRow>>> {
        let guard = self.inner.read().unwrap_or_else(|e| e.into_inner());
        let entry = guard.get(key)?;
        if entry.loaded_at.elapsed() < MENU_CACHE_TTL {
            Some(entry.rows.clone())
        } else {
            None
        }
    }

    pub fn put(&self, key: String, rows: Vec<DbMenuRow>) {
        let mut guard = self.inner.write().unwrap_or_else(|e| e.into_inner());
        guard.insert(
            key,
            CacheEntry {
                loaded_at: Instant::now(),
                rows: Arc::new(rows),
            },
        );
    }
}
