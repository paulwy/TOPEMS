//! 增量同步定时调度器
//! 定期查询 erp_connections 表，执行增量同步

use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::time::{interval, MissedTickBehavior};
use uuid::Uuid;

use crate::erp_wms_sync::sync_incremental_all;

// ===== 配置 =====

/// 默认同步间隔检查周期（秒）
const DEFAULT_CHECK_INTERVAL_SECS: u64 = 300; // 5 分钟

/// 默认单次同步限制
const DEFAULT_SYNC_LIMIT: i64 = 100;

// ===== ERP 连接结构 =====

#[derive(Debug, Clone)]
struct ErpConnection {
    id: Uuid,
    tenant_id: String,
    name: String,
    api_url: String,
    sync_interval: i32,
    isactive: bool,
    last_sync_at: Option<DateTime<Utc>>,
}

// ===== 调度器 =====

pub struct SyncScheduler {
    pool: PgPool,
    check_interval_secs: u64,
}

impl SyncScheduler {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            check_interval_secs: DEFAULT_CHECK_INTERVAL_SECS,
        }
    }

    pub fn with_check_interval(mut self, secs: u64) -> Self {
        self.check_interval_secs = secs;
        self
    }

    /// 启动定时调度器
    pub async fn start(self: Arc<Self>) {
        tracing::info!(
            "[sync-scheduler] 启动增量同步定时调度器，检查间隔: {}s",
            self.check_interval_secs
        );

        let mut ticker = interval(std::time::Duration::from_secs(self.check_interval_secs));
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

        loop {
            ticker.tick().await;
            if let Err(e) = self.run_sync_cycle().await {
                tracing::error!("[sync-scheduler] 同步周期执行失败: {}", e);
            }
        }
    }

    /// 执行一次同步周期
    async fn run_sync_cycle(&self) -> Result<(), String> {
        tracing::debug!("[sync-scheduler] 开始同步周期");

        // 查询所有激活的 ERP 连接
        let connections = self.get_active_connections().await?;

        if connections.is_empty() {
            tracing::debug!("[sync-scheduler] 没有激活的 ERP 连接，跳过");
            return Ok(());
        }

        tracing::info!("[sync-scheduler] 发现 {} 个激活的 ERP 连接", connections.len());

        let now = Utc::now();

        for conn in connections {
            // 检查是否需要同步
            if !self.should_sync(&conn, now) {
                tracing::debug!(
                    "[sync-scheduler] 连接 '{}' 未到同步时间，跳过",
                    conn.name
                );
                continue;
            }

            // 执行增量同步
            match self.execute_sync(&conn).await {
                Ok(_) => {
                    tracing::info!("[sync-scheduler] 连接 '{}' 增量同步完成", conn.name);
                    // 更新 last_sync_at
                    if let Err(e) = self.update_last_sync_at(conn.id).await {
                        tracing::warn!(
                            "[sync-scheduler] 更新连接 '{}' last_sync_at 失败: {}",
                            conn.name,
                            e
                        );
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "[sync-scheduler] 连接 '{}' 增量同步失败: {}",
                        conn.name,
                        e
                    );
                }
            }
        }

        tracing::debug!("[sync-scheduler] 同步周期完成");
        Ok(())
    }

    /// 查询所有激活的 ERP 连接
    async fn get_active_connections(&self) -> Result<Vec<ErpConnection>, String> {
        let rows: Vec<(
            Uuid,
            String,
            String,
            String,
            Option<i32>,
            Option<bool>,
            Option<DateTime<Utc>>,
        )> = sqlx::query_as(
            "SELECT id, tenant_id, name, api_url, sync_interval, isactive, last_sync_at
             FROM integration.erp_connections
             WHERE isactive = true AND status = 'active'
             ORDER BY name"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("查询 ERP 连接失败: {}", e))?;

        let connections: Vec<ErpConnection> = rows
            .into_iter()
            .map(|(id, tenant_id, name, api_url, sync_interval, isactive, last_sync_at)| {
                ErpConnection {
                    id,
                    tenant_id,
                    name,
                    api_url,
                    sync_interval: sync_interval.unwrap_or(60), // 默认 60 分钟
                    isactive: isactive.unwrap_or(false),
                    last_sync_at,
                }
            })
            .collect();

        Ok(connections)
    }

    /// 检查是否需要同步
    fn should_sync(&self, conn: &ErpConnection, now: DateTime<Utc>) -> bool {
        if !conn.isactive {
            return false;
        }

        match conn.last_sync_at {
            None => true, // 从未同步过，立即同步
            Some(last) => {
                let elapsed = now - last;
                let interval_minutes = Duration::minutes(conn.sync_interval as i64);
                elapsed >= interval_minutes
            }
        }
    }

    /// 执行增量同步
    async fn execute_sync(&self, conn: &ErpConnection) -> Result<(), String> {
        tracing::info!(
            "[sync-scheduler] 开始执行连接 '{}' 的增量同步",
            conn.name
        );

        // 解析 tenant_id
        let tenant_id = Uuid::parse_str(&conn.tenant_id)
            .map_err(|e| format!("解析 tenant_id 失败: {}", e))?;

        // WMS URL（从环境变量获取，或使用默认值）
        let wms_url = std::env::var("WMS_URL").unwrap_or_else(|_| "http://localhost:8081".to_string());

        // 执行增量同步
        let results = sync_incremental_all(
            &self.pool,
            tenant_id,
            &conn.api_url,
            &wms_url,
            conn.last_sync_at,
            DEFAULT_SYNC_LIMIT,
            false, // dry_run = false
        )
        .await?;

        // 统计结果
        let total_success: i64 = results.iter().map(|r| r.total_success).sum();
        let total_failed: i64 = results.iter().map(|r| r.total_failed).sum();

        tracing::info!(
            "[sync-scheduler] 连接 '{}' 增量同步结果: 成功={}, 失败={}",
            conn.name,
            total_success,
            total_failed
        );

        Ok(())
    }

    /// 更新 last_sync_at
    async fn update_last_sync_at(&self, conn_id: Uuid) -> Result<(), String> {
        sqlx::query(
            "UPDATE integration.erp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1"
        )
        .bind(conn_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("更新 last_sync_at 失败: {}", e))?;

        Ok(())
    }
}

/// 启动同步调度器（便捷函数）
pub async fn start_sync_scheduler(pool: PgPool) {
    let scheduler = Arc::new(SyncScheduler::new(pool));
    scheduler.start().await;
}
