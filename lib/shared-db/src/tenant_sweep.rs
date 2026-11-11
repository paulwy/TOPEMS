//! 逐租户后台扫描：先枚举、再逐租户开作用域。
//!
//! 设计见 `docs/quality/w7-cross-request-tenant-context-2026-11-10.md` §2.3。
//!
//! 规则：
//! - 枚举走系统通道（只读事务）——这是唯一允许「看见全部租户」的动作；
//! - 执行必须逐租户 `Db::scope_for_tenant`，一个租户一个事务；
//! - 禁止「一次全表扫描后在内存里按 tenant_id 分组再写回」。

use std::collections::HashSet;
use std::future::Future;

use uuid::Uuid;

use crate::scope::Db;

#[derive(Debug, Default)]
pub struct TenantSweepReport {
    pub enumerated: usize,
    pub succeeded: usize,
    /// (tenant_id, error) —— 单租户失败不中断整轮
    pub failed: Vec<(Uuid, String)>,
}

impl TenantSweepReport {
    pub fn is_ok(&self) -> bool {
        self.failed.is_empty()
    }
}

/// 枚举租户 ID。
///
/// `sql` 必须是**静态字面量**，约定形如：
/// `SELECT DISTINCT tenant_id FROM lims.qa_lab_samples WHERE tenant_id IS NOT NULL`。
/// 结果去重并剔除 nil（剔除时告警，不静默）。
pub async fn enumerate_tenants(db: &Db, sql: &'static str) -> sqlx::Result<Vec<Uuid>> {
    let mut scope = db.scope_read_system().await?;
    let rows: Vec<(Uuid,)> = sqlx::query_as(sql).fetch_all(&mut scope).await?;
    scope.commit().await?;

    let mut seen = HashSet::with_capacity(rows.len());
    let mut out = Vec::with_capacity(rows.len());
    for (id,) in rows {
        if id.is_nil() {
            tracing::warn!("[tenant_sweep] 枚举结果含 nil 租户，已剔除: sql={sql}");
            continue;
        }
        if seen.insert(id) {
            out.push(id);
        }
    }
    Ok(out)
}

/// 枚举 + 逐租户执行。
///
/// 回调内由调用方自行开作用域（`db.scope_for_tenant(t)` / `scope_read_for_tenant(t)`）；
/// 单租户返回 `Err` 只记录，继续其余租户。
pub async fn sweep_tenants<F, Fut>(
    db: &Db,
    sql: &'static str,
    mut f: F,
) -> sqlx::Result<TenantSweepReport>
where
    F: FnMut(Db, Uuid) -> Fut,
    Fut: Future<Output = sqlx::Result<()>>,
{
    let tenants = enumerate_tenants(db, sql).await?;
    let mut report = TenantSweepReport {
        enumerated: tenants.len(),
        ..Default::default()
    };
    for tenant in tenants {
        match f(db.clone(), tenant).await {
            Ok(()) => report.succeeded += 1,
            Err(e) => {
                tracing::warn!("[tenant_sweep] 租户 {} 处理失败: {}", tenant, e);
                report.failed.push((tenant, e.to_string()));
            }
        }
    }
    Ok(report)
}
