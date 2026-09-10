//! 增量同步定时调度器
//! 定期查询 erp_connections 表，执行增量同步
//!
//! 错误处理特性：
//! - 重试机制：同步失败时自动重试（最多 3 次，指数退避）
//! - 超时控制：单次同步超时 5 分钟
//! - 失败熔断：连续失败超过 5 次时，暂时跳过该连接（冷却 30 分钟）
//! - 同步状态跟踪：记录 last_sync_status、last_sync_error、consecutive_failures
//! - 并发控制：全局互斥锁，避免多个同步周期重叠

use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, timeout, MissedTickBehavior};
use uuid::Uuid;

use crate::erp_wms_sync::sync_incremental_all;

// ===== 配置 =====

/// 默认同步间隔检查周期（秒）
const DEFAULT_CHECK_INTERVAL_SECS: u64 = 300; // 5 分钟

/// 默认单次同步限制
const DEFAULT_SYNC_LIMIT: i64 = 100;

/// 单次同步超时（秒）
const SYNC_TIMEOUT_SECS: u64 = 300; // 5 分钟

/// 最大重试次数
const MAX_RETRIES: u32 = 3;

/// 重试基础延迟（秒），指数退避：base * 2^retry
const RETRY_BASE_DELAY_SECS: u64 = 10;

/// 连续失败熔断阈值
const FAILURE_CIRCUIT_BREAKER_THRESHOLD: i32 = 5;

/// 熔断冷却时间（分钟）
const CIRCUIT_BREAKER_COOLDOWN_MINUTES: i64 = 30;

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
    last_sync_status: Option<String>,
    last_sync_error: Option<String>,
    consecutive_failures: Option<i32>,
    last_failure_at: Option<DateTime<Utc>>,
}

// ===== 同步结果 =====

#[derive(Debug)]
struct SyncResult {
    success: bool,
    total_success: i64,
    total_failed: i64,
    error: Option<String>,
    retry_count: u32,
}

// ===== 调度器 =====

pub struct SyncScheduler {
    pool: PgPool,
    check_interval_secs: u64,
    /// 全局互斥锁，避免多个同步周期重叠
    sync_lock: Mutex<()>,
}

impl SyncScheduler {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            check_interval_secs: DEFAULT_CHECK_INTERVAL_SECS,
            sync_lock: Mutex::new(()),
        }
    }

    pub fn with_check_interval(mut self, secs: u64) -> Self {
        self.check_interval_secs = secs;
        self
    }

    /// 启动定时调度器
    pub async fn start(self: Arc<Self>) {
        tracing::info!(
            "[sync-scheduler] 启动增量同步定时调度器，检查间隔: {}s，超时: {}s，最大重试: {}，熔断阈值: {}",
            self.check_interval_secs,
            SYNC_TIMEOUT_SECS,
            MAX_RETRIES,
            FAILURE_CIRCUIT_BREAKER_THRESHOLD
        );

        let mut ticker = interval(std::time::Duration::from_secs(self.check_interval_secs));
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

        loop {
            ticker.tick().await;

            // 尝试获取全局锁，避免重叠
            let lock_guard = match self.sync_lock.try_lock() {
                Ok(guard) => guard,
                Err(_) => {
                    tracing::warn!("[sync-scheduler] 上一个同步周期仍在运行，跳过本次周期");
                    continue;
                }
            };

            if let Err(e) = self.run_sync_cycle().await {
                tracing::error!("[sync-scheduler] 同步周期执行失败: {}", e);
            }

            // 显式释放锁
            drop(lock_guard);
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
        let mut success_count = 0;
        let mut failed_count = 0;
        let mut skipped_count = 0;

        for conn in connections {
            // 检查熔断状态
            if self.is_circuit_broken(&conn, now) {
                tracing::warn!(
                    "[sync-scheduler] 连接 '{}' 触发熔断（连续失败 {} 次），跳过同步",
                    conn.name,
                    conn.consecutive_failures.unwrap_or(0)
                );
                skipped_count += 1;
                continue;
            }

            // 检查是否需要同步
            if !self.should_sync(&conn, now) {
                tracing::debug!(
                    "[sync-scheduler] 连接 '{}' 未到同步时间，跳过",
                    conn.name
                );
                skipped_count += 1;
                continue;
            }

            // 执行增量同步（带重试）
            match self.execute_sync_with_retry(&conn).await {
                Ok(result) => {
                    if result.success {
                        tracing::info!(
                            "[sync-scheduler] 连接 '{}' 增量同步成功（重试 {} 次）: 成功={}, 失败={}",
                            conn.name,
                            result.retry_count,
                            result.total_success,
                            result.total_failed
                        );
                        // 更新 last_sync_at 和成功状态
                        if let Err(e) = self.update_sync_success(conn.id).await {
                            tracing::warn!(
                                "[sync-scheduler] 更新连接 '{}' 同步状态失败: {}",
                                conn.name,
                                e
                            );
                        }
                        success_count += 1;
                    } else {
                        tracing::error!(
                            "[sync-scheduler] 连接 '{}' 增量同步失败（重试 {} 次后）: {}",
                            conn.name,
                            result.retry_count,
                            result.error.clone().unwrap_or_else(|| "未知错误".to_string())
                        );
                        // 更新失败状态
                        if let Err(e) = self.update_sync_failure(conn.id, result.error).await {
                            tracing::warn!(
                                "[sync-scheduler] 更新连接 '{}' 失败状态失败: {}",
                                conn.name,
                                e
                            );
                        }
                        failed_count += 1;
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "[sync-scheduler] 连接 '{}' 增量同步执行异常: {}",
                        conn.name,
                        e
                    );
                    // 更新失败状态
                    if let Err(update_err) = self.update_sync_failure(conn.id, Some(e.clone())).await {
                        tracing::warn!(
                            "[sync-scheduler] 更新连接 '{}' 失败状态失败: {}",
                            conn.name,
                            update_err
                        );
                    }
                    failed_count += 1;
                }
            }
        }

        tracing::info!(
            "[sync-scheduler] 同步周期完成: 成功={}, 失败={}, 跳过={}",
            success_count,
            failed_count,
            skipped_count
        );
        Ok(())
    }

    /// 检查是否触发熔断
    fn is_circuit_broken(&self, conn: &ErpConnection, now: DateTime<Utc>) -> bool {
        let failures = conn.consecutive_failures.unwrap_or(0);
        if failures < FAILURE_CIRCUIT_BREAKER_THRESHOLD {
            return false;
        }

        // 检查冷却时间是否已过
        match conn.last_failure_at {
            None => true, // 有失败次数但没有失败时间，视为熔断
            Some(last_failure) => {
                let elapsed = now - last_failure;
                elapsed < Duration::minutes(CIRCUIT_BREAKER_COOLDOWN_MINUTES)
            }
        }
    }

    /// 执行增量同步（带重试和超时）
    async fn execute_sync_with_retry(&self, conn: &ErpConnection) -> Result<SyncResult, String> {
        let mut last_error: Option<String> = None;
        let mut retry_count = 0;

        for attempt in 0..=MAX_RETRIES {
            if attempt > 0 {
                retry_count = attempt;
                // 指数退避延迟
                let delay_secs = RETRY_BASE_DELAY_SECS * (2u64.pow(attempt - 1));
                tracing::info!(
                    "[sync-scheduler] 连接 '{}' 第 {} 次重试，等待 {}s",
                    conn.name,
                    attempt,
                    delay_secs
                );
                tokio::time::sleep(std::time::Duration::from_secs(delay_secs)).await;
            }

            match self.execute_single_sync(conn).await {
                Ok((total_success, total_failed)) => {
                    return Ok(SyncResult {
                        success: true,
                        total_success,
                        total_failed,
                        error: None,
                        retry_count,
                    });
                }
                Err(e) => {
                    tracing::warn!(
                        "[sync-scheduler] 连接 '{}' 第 {} 次同步失败: {}",
                        conn.name,
                        attempt + 1,
                        e
                    );
                    last_error = Some(e);
                }
            }
        }

        // 所有重试都失败
        Ok(SyncResult {
            success: false,
            total_success: 0,
            total_failed: 0,
            error: last_error,
            retry_count: MAX_RETRIES,
        })
    }

    /// 执行单次同步（带超时）
    async fn execute_single_sync(&self, conn: &ErpConnection) -> Result<(i64, i64), String> {
        tracing::info!(
            "[sync-scheduler] 开始执行连接 '{}' 的增量同步",
            conn.name
        );

        // 解析 tenant_id
        let tenant_id = Uuid::parse_str(&conn.tenant_id)
            .map_err(|e| format!("解析 tenant_id 失败: {}", e))?;

        // WMS URL（从环境变量获取，或使用默认值）
        let wms_url = std::env::var("WMS_URL")
            .unwrap_or_else(|_| "http://localhost:8081".to_string());

        // 执行增量同步（带超时）
        let sync_future = sync_incremental_all(
            &self.pool,
            tenant_id,
            &conn.api_url,
            &wms_url,
            conn.last_sync_at,
            DEFAULT_SYNC_LIMIT,
            false, // dry_run = false
        );

        let results = timeout(
            std::time::Duration::from_secs(SYNC_TIMEOUT_SECS),
            sync_future,
        )
        .await
        .map_err(|_| format!("同步超时（超过 {}s）", SYNC_TIMEOUT_SECS))?
        .map_err(|e| format!("同步执行失败: {}", e))?;

        // 统计结果
        let total_success: i64 = results.iter().map(|r| r.total_success).sum();
        let total_failed: i64 = results.iter().map(|r| r.total_failed).sum();

        // 检查是否有部分失败
        if total_failed > 0 {
            let errors: Vec<String> = results
                .iter()
                .flat_map(|r| r.errors.clone())
                .collect();
            if !errors.is_empty() {
                tracing::warn!(
                    "[sync-scheduler] 连接 '{}' 同步部分失败，错误示例: {}",
                    conn.name,
                    errors.iter().take(3).cloned().collect::<Vec<_>>().join("; ")
                );
            }
            tracing::warn!(
                "[sync-scheduler] 连接 '{}' 同步部分失败: 成功={}, 失败={}",
                conn.name,
                total_success,
                total_failed
            );
            // 部分失败仍视为成功（记录已处理），但记录警告
            return Ok((total_success, total_failed));
        }

        tracing::info!(
            "[sync-scheduler] 连接 '{}' 增量同步结果: 成功={}, 失败={}",
            conn.name,
            total_success,
            total_failed
        );

        Ok((total_success, total_failed))
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
            Option<String>,
            Option<String>,
            Option<i32>,
            Option<DateTime<Utc>>,
        )> = sqlx::query_as(
            "SELECT id, tenant_id, name, api_url, sync_interval, isactive, last_sync_at,
                    last_sync_status, last_sync_error, consecutive_failures, last_failure_at
             FROM integration.erp_connections
             WHERE isactive = true AND status = 'active'
             ORDER BY name"
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("查询 ERP 连接失败: {}", e))?;

        let connections: Vec<ErpConnection> = rows
            .into_iter()
            .map(|(id, tenant_id, name, api_url, sync_interval, isactive, last_sync_at,
                   last_sync_status, last_sync_error, consecutive_failures, last_failure_at)| {
                ErpConnection {
                    id,
                    tenant_id,
                    name,
                    api_url,
                    sync_interval: sync_interval.unwrap_or(60), // 默认 60 分钟
                    isactive: isactive.unwrap_or(false),
                    last_sync_at,
                    last_sync_status,
                    last_sync_error,
                    consecutive_failures,
                    last_failure_at,
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

    /// 更新同步成功状态
    async fn update_sync_success(&self, conn_id: Uuid) -> Result<(), String> {
        sqlx::query(
            "UPDATE integration.erp_connections
             SET last_sync_at = NOW(),
                 updated_at = NOW(),
                 last_sync_status = 'success',
                 last_sync_error = NULL,
                 consecutive_failures = 0
             WHERE id = $1"
        )
        .bind(conn_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("更新同步成功状态失败: {}", e))?;

        Ok(())
    }

    /// 更新同步失败状态
    async fn update_sync_failure(&self, conn_id: Uuid, error: Option<String>) -> Result<(), String> {
        let error_msg = error.unwrap_or_else(|| "未知错误".to_string());
        // 截断错误信息，避免过长
        let truncated_error = if error_msg.len() > 500 {
            format!("{}...（已截断）", &error_msg[..500])
        } else {
            error_msg
        };

        sqlx::query(
            "UPDATE integration.erp_connections
             SET updated_at = NOW(),
                 last_sync_status = 'failed',
                 last_sync_error = $1,
                 consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
                 last_failure_at = NOW()
             WHERE id = $2"
        )
        .bind(truncated_error)
        .bind(conn_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("更新同步失败状态失败: {}", e))?;

        Ok(())
    }
}

/// 启动同步调度器（便捷函数）
pub async fn start_sync_scheduler(pool: PgPool) {
    let scheduler = Arc::new(SyncScheduler::new(pool));
    scheduler.start().await;
}
