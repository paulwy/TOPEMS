//! B1/F-37：search 实体投影（CQRS 本地读模型）
//!
//! 终态（一步到位、性能最优）：erp 发布 SearchableEntityChanged 事件 → 本服务订阅，
//! 把 customers / sales_orders / purchase_orders 的可搜索快照 UPSERT 到本地投影表
//! `public.search_entity_projections`。聚合检索查询只读本地投影，不再 query-time 跨服务
//! fan-out（erp HTTP），也不直读 erp schema。
//!
//! 幂等键 = (tenant_id, entity_type, entity_id)：UPSERT 天然幂等，重复投递/乱序收敛；
//! op=delete 时删除投影行。handler 返回 Err 直传 Stream 层走重试/DLQ（对齐 R-6/R-7b）。
//!
//! 投影表 DDL 已版本化：`database/migrations/20261015000071_k1_b1_search_projection_table.sql`
//! （建表 + 检索索引 + GRANT topems_app）。运行时不再自举建表/索引——自举曾导致
//! owner 随连接角色漂移：topems_app 非 owner 时订阅写投影 permission denied（事件
//! 重试 3 次进 DLQ）、CREATE INDEX 报 must be owner。现仅探测表存在性：缺失即告警
//! （migration 未应用），不阻塞订阅（待事件追平或 backfill 时由 migration 补齐后恢复）。

use std::time::Duration;
use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{EventSubscriber, EventType, SearchableEntityChangedPayload};
use uuid::Uuid;

/// 零租户占位 UUID（erp 未设置 app.tenant_id 时投影行归属）
const ZERO_TENANT: &str = "00000000-0000-0000-0000-000000000000";

/// v2 双写最大重试次数（超出后放弃，交由回填/对账脚本补偿）。
const V2_MAX_ATTEMPTS: u32 = 5;
/// v2 重试退避基数：第 n 次重试等待 n * 5s（5/10/15/20s）。
const V2_RETRY_BACKOFF_SECS: u64 = 5;

/// v2 投影写入失败的重试任务（进程内队列；search 无 EventPublisher，不入 ZSET）。
#[derive(Debug, Clone)]
struct V2RetryJob {
    payload: SearchableEntityChangedPayload,
    attempt: u32,
}

/// 进程内 v2 重试队列（进程重启丢失，由回填/对账脚本兜底）。
static V2_RETRY_TX: std::sync::OnceLock<tokio::sync::mpsc::UnboundedSender<V2RetryJob>> =
    std::sync::OnceLock::new();

/// 启动 v2 重试 worker（幂等：重复调用只生效一次）。
fn init_v2_retry_worker(db: Db) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<V2RetryJob>();
    if V2_RETRY_TX.set(tx).is_err() {
        return;
    }
    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            let attempt = job.attempt + 1;
            let db = db.clone();
            tokio::spawn(async move {
                tokio::time::sleep(Duration::from_secs(
                    V2_RETRY_BACKOFF_SECS * u64::from(attempt),
                ))
                .await;
                match apply_v2(&db, &job.payload).await {
                    Ok(()) => {
                        tracing::info!("[search] v2 投影重试成功 attempt={}", attempt);
                    }
                    Err(e) if attempt >= V2_MAX_ATTEMPTS => {
                        tracing::error!(
                            "[search] v2 投影重试 {} 次仍失败，放弃（待回填/对账补偿）: {}",
                            attempt,
                            e
                        );
                    }
                    Err(e) => {
                        tracing::warn!("[search] v2 投影重试第 {} 次失败: {}", attempt, e);
                        enqueue_v2_retry(job.payload, attempt);
                    }
                }
            });
        }
    });
}

/// 入队 v2 重试；队列未初始化（单测/未启动订阅）时只告警，不阻断主链路。
fn enqueue_v2_retry(payload: SearchableEntityChangedPayload, attempt: u32) {
    match V2_RETRY_TX.get() {
        Some(tx) => {
            if let Err(e) = tx.send(V2RetryJob { payload, attempt }) {
                tracing::warn!("[search] v2 重试入队失败（队列已关闭）: {}", e);
            }
        }
        None => {
            tracing::warn!("[search] v2 投影写失败且重试队列未初始化，跳过重试（由回填/对账补偿）");
        }
    }
}

/// 启动时探测投影表（migration 版本化后不再自举建表）。表缺失返回 Err，由
/// 调用方告警（migration 未应用）；投影未就绪时搜索为空结果，待事件/backfill 追平。
pub async fn init_projection_table(db: &Db) -> Result<(), sqlx::Error> {
    // 启动期无请求上下文：必须走系统读作用域，否则 RLS fail-closed 会误报缺表。
    let mut scope = db.scope_read_system().await?;
    let exists: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public.search_entity_projections')::text")
            .fetch_optional(&mut scope)
            .await?;
    match exists {
        Some(_) => {}
        None => {
            return Err(sqlx::Error::Protocol(
                "投影表 public.search_entity_projections 缺失：请确认迁移 \
                 database/migrations/20261015000071_k1_b1_search_projection_table.sql 已应用"
                    .to_string(),
            ))
        }
    }

    // v2 双写目标表：缺失不阻塞启动（v1 仍可用），只告警；事件双写会失败并入重试队列。
    let v2_exists: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public.search_entity_projections_v2')::text")
            .fetch_optional(&mut scope)
            .await?;
    if v2_exists.is_none() {
        tracing::warn!(
            "[search] 投影表 public.search_entity_projections_v2 缺失：v2 双写将失败并入重试队列；\
             请确认迁移 database/migrations/20261123132000_search_projection_v2_company_scope.sql 已应用"
        );
    }
    Ok(())
}

/// 把事件快照双写：v1 必须成功（失败走事件重试/DLQ）；v2 失败只告警并入
/// 进程内重试队列，绝不影响 v1 结果或主链路（W13 双写，不切查询/不切流）。
pub async fn apply_event(
    db: &Db,
    payload: SearchableEntityChangedPayload,
) -> Result<(), TopemsError> {
    apply_v1(db, &payload).await?;
    if let Err(e) = apply_v2(db, &payload).await {
        tracing::warn!(
            "[search] v2 投影写入失败（v1 已成功，不影响主链路）{} id={}: {}，入重试队列",
            payload.entity_type,
            payload.entity_id,
            e
        );
        enqueue_v2_retry(payload, 0);
    }
    Ok(())
}

/// v1 投影（`public.search_entity_projections`）UPSERT / DELETE（幂等）。
async fn apply_v1(db: &Db, payload: &SearchableEntityChangedPayload) -> Result<(), TopemsError> {
    let tenant = payload
        .tenant_id
        .unwrap_or_else(|| Uuid::parse_str(ZERO_TENANT).unwrap_or_default());

    let mut scope = db
        .scope_for_tenant(tenant)
        .await
        .map_err(|e| TopemsError::Internal(format!("search 投影 scope begin 失败: {}", e)))?;

    if payload.op == "delete" {
        sqlx::query(
            "DELETE FROM public.search_entity_projections
             WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3",
        )
        .bind(tenant)
        .bind(&payload.entity_type)
        .bind(payload.entity_id)
        .execute(&mut scope)
        .await
        .map_err(|e| TopemsError::Internal(format!("search 投影 delete 失败: {}", e)))?;
        scope
            .commit()
            .await
            .map_err(|e| TopemsError::Internal(format!("search 投影 commit 失败: {}", e)))?;
        return Ok(());
    }

    // upsert（op != delete 一律按 upsert 处理，容忍未知 op）
    sqlx::query(
        r#"
        INSERT INTO public.search_entity_projections
            (tenant_id, entity_type, entity_id, name, contact_person, contact_phone,
             email, address, status, remark, source_updated_at, projected_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
            name = EXCLUDED.name,
            contact_person = EXCLUDED.contact_person,
            contact_phone = EXCLUDED.contact_phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            source_updated_at = EXCLUDED.source_updated_at,
            projected_at = NOW()
        "#,
    )
    .bind(tenant)
    .bind(&payload.entity_type)
    .bind(payload.entity_id)
    .bind(&payload.name)
    .bind(&payload.contact_person)
    .bind(&payload.contact_phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(&payload.status)
    .bind(&payload.remark)
    .bind(payload.source_updated_at)
    .execute(&mut scope)
    .await
    .map_err(|e| TopemsError::Internal(format!("search 投影 upsert 失败: {}", e)))?;

    scope
        .commit()
        .await
        .map_err(|e| TopemsError::Internal(format!("search 投影 commit 失败: {}", e)))?;
    Ok(())
}

/// v2 投影（`public.search_entity_projections_v2`，含 company_id）。
///
/// 事件消费无请求公司上下文，且 company_read 策略对公司行 fail-closed，
/// 因此走系统写通道（`app.rls_system='on'`）写入任意公司行。
async fn apply_v2(db: &Db, payload: &SearchableEntityChangedPayload) -> Result<(), TopemsError> {
    let tenant = payload
        .tenant_id
        .unwrap_or_else(|| Uuid::parse_str(ZERO_TENANT).unwrap_or_default());

    let mut scope = db
        .scope_system()
        .await
        .map_err(|e| TopemsError::Internal(format!("search v2 投影 scope begin 失败: {}", e)))?;

    if payload.op == "delete" {
        sqlx::query(
            "DELETE FROM public.search_entity_projections_v2
             WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3",
        )
        .bind(tenant)
        .bind(&payload.entity_type)
        .bind(payload.entity_id)
        .execute(&mut scope)
        .await
        .map_err(|e| TopemsError::Internal(format!("search v2 投影 delete 失败: {}", e)))?;
        scope
            .commit()
            .await
            .map_err(|e| TopemsError::Internal(format!("search v2 投影 commit 失败: {}", e)))?;
        return Ok(());
    }

    sqlx::query(
        r#"
        INSERT INTO public.search_entity_projections_v2
            (tenant_id, company_id, entity_type, entity_id, name, contact_person, contact_phone,
             email, address, status, remark, source_updated_at, projected_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            name = EXCLUDED.name,
            contact_person = EXCLUDED.contact_person,
            contact_phone = EXCLUDED.contact_phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            remark = EXCLUDED.remark,
            source_updated_at = EXCLUDED.source_updated_at,
            projected_at = NOW()
        "#,
    )
    .bind(tenant)
    .bind(payload.company_id)
    .bind(&payload.entity_type)
    .bind(payload.entity_id)
    .bind(&payload.name)
    .bind(&payload.contact_person)
    .bind(&payload.contact_phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(&payload.status)
    .bind(&payload.remark)
    .bind(payload.source_updated_at)
    .execute(&mut scope)
    .await
    .map_err(|e| TopemsError::Internal(format!("search v2 投影 upsert 失败: {}", e)))?;

    scope
        .commit()
        .await
        .map_err(|e| TopemsError::Internal(format!("search v2 投影 commit 失败: {}", e)))?;
    Ok(())
}

/// 启动实体事件订阅者（失败不阻塞 search 启动；对齐 erp start_event_subscribers）。
pub async fn start_projection_subscriber(db: Db) -> Result<(), TopemsError> {
    // v2 双写失败重试 worker（幂等；未初始化时 apply_event 仅告警跳过）。
    init_v2_retry_worker(db.clone());

    let subscriber = EventSubscriber::new("search")
        .map_err(|e| TopemsError::internal("构建事件订阅者失败", e))?;

    let sub =
        subscriber.subscribe_handler(vec![EventType::SearchableEntityChanged], move |event| {
            let db = db.clone();
            Box::pin(async move {
                match event.parse_payload::<SearchableEntityChangedPayload>() {
                    Ok(payload) => apply_event(&db, payload).await,
                    Err(e) => {
                        tracing::error!("[search] 解析 SearchableEntityChanged 失败: {}", e);
                        // 载荷不可恢复错误不应无限重试进 DLQ 风暴；返回 Ok 让其 ACK。
                        Ok(())
                    }
                }
            })
        });

    tokio::spawn(async move {
        // 订阅者长驻；断线重连由 start_listening 内部策略处理，这里仅记录异常退出。
        let h = tokio::spawn(async move {
            if let Err(e) = sub.start_listening().await {
                tracing::error!("[search] 投影事件订阅者异常退出: {}", e);
            }
            tracing::warn!("[search] 投影事件订阅者返回（不应发生）");
        });
        // 心跳监视：每 30s 报告订阅者 task 存活（低频诊断，避免日志噪音）。
        let mut tick = tokio::time::interval(Duration::from_secs(30));
        loop {
            tick.tick().await;
            if h.is_finished() {
                break;
            }
            tracing::info!("[search] 订阅者心跳 alive");
        }
        let _ = h.await;
    });

    // 给 Redis/Stream 一点就绪时间（非严格要求，仅避免启动日志噪音）
    tokio::time::sleep(Duration::from_millis(50)).await;
    tracing::info!("[search] 实体投影订阅者已启动（SearchableEntityChanged）");
    Ok(())
}

/// 回填配置：erp 快照端点地址 + 访问令牌。
///
/// 显式传入而不在库内部读取环境变量/写死端口，方便独立进程（读 env）与
/// 模块化单体（同进程回环 + 自签令牌）复用同一实现。
#[derive(Debug, Clone)]
pub struct BackfillEndpoint {
    /// erp 服务基础地址，如 `http://erp:8010` 或单体回环 `http://127.0.0.1:8099`
    pub erp_base: String,
    /// 访问 `/api/erp/internal/searchable-snapshot` 的 JWT（必须含 exp）
    pub token: String,
}

impl BackfillEndpoint {
    /// 独立部署形态：从环境变量读取。缺任一配置时明确报错并返回 None（跳过回填），
    /// 不再回退 `localhost:8010` 造成"请求打到不存在端口、只打 warn"的静默失败。
    pub fn from_env() -> Option<Self> {
        let erp_base = match std::env::var("ERP_URL") {
            Ok(v) if !v.trim().is_empty() => v,
            _ => {
                tracing::error!(
                    "[search] 未配置 ERP_URL：跳过投影回填。历史数据不会被补全，\
                     搜索投影只能依赖后续事件增量。请显式设置 ERP_URL（如 http://erp:8010）"
                );
                return None;
            }
        };
        let token = match std::env::var("BACKFILL_TOKEN") {
            Ok(v) if !v.trim().is_empty() => v,
            _ => {
                tracing::error!(
                    "[search] 未配置 BACKFILL_TOKEN：erp 快照端点受全局认证保护，\
                     跳过投影回填（历史数据不会被补全）。请用与 JWT_SECRET 同签发的远期服务令牌填充"
                );
                return None;
            }
        };
        Some(Self { erp_base, token })
    }
}

/// 启动时差距对账（独立部署形态）：从环境读取 `ERP_URL`/`BACKFILL_TOKEN` 后回填。
pub async fn backfill_projections(db: &Db) -> bool {
    match BackfillEndpoint::from_env() {
        Some(ep) => backfill_projections_with(db, &ep.erp_base, &ep.token).await,
        None => false,
    }
}

/// 启动时差距对账：从 erp 快照端点拉取全量可搜索实体，逐行 UPSERT 进投影。
///
/// 用途：补齐"停消费期间/历史未发事件"造成的投影缺口。读模型重建走 erp HTTP
/// 快照（不直读 erp schema，守住 schema 边界）；不阻塞 search 启动——失败时
/// 明确 error 并返回 false，由调用方决定是否重试/告警，后续增量仍由事件流收敛。
///
/// 返回 true 表示快照拉取与投影补写成功；false 表示失败（调用方可重试）。
pub async fn backfill_projections_with(db: &Db, erp_base: &str, token: &str) -> bool {
    let url = format!(
        "{}/api/erp/internal/searchable-snapshot",
        erp_base.trim_end_matches('/')
    );

    // backfill 前差距：投影已有行数（全量计数走系统读作用域）
    let before: i64 = match db.scope_read_system().await {
        Ok(mut scope) => {
            sqlx::query_scalar("SELECT count(*) FROM public.search_entity_projections")
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten()
                .unwrap_or(0)
        }
        Err(_) => 0,
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("[search] backfill 构建 HTTP 客户端失败: {}", e);
            return false;
        }
    };

    let resp = match client.get(&url).bearer_auth(token).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!(
                "[search] backfill 拉取 erp 快照失败（endpoint={}）: {}",
                url,
                e
            );
            return false;
        }
    };

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        tracing::error!(
            "[search] backfill 快照端点返回非 2xx（endpoint={}, status={}）: {}",
            url,
            status,
            body.chars().take(300).collect::<String>()
        );
        return false;
    }

    let body = match resp.json::<serde_json::Value>().await {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("[search] backfill 解析快照响应失败: {}", e);
            return false;
        }
    };
    let items = body
        .get("data")
        .and_then(|d| d.as_array())
        .cloned()
        .unwrap_or_default();
    let source_count = items.len();
    let mut upserted = 0;
    let mut failed = 0;
    for item in items {
        let payload = match serde_json::from_value::<SearchableEntityChangedPayload>(item) {
            Ok(p) => p,
            Err(e) => {
                failed += 1;
                tracing::error!("[search] backfill 快照条目反序列化失败: {}", e);
                continue;
            }
        };
        match apply_event(db, payload).await {
            Ok(()) => upserted += 1,
            Err(e) => {
                failed += 1;
                tracing::error!("[search] backfill 投影写入失败: {}", e);
            }
        }
    }
    let after: i64 = match db.scope_read_system().await {
        Ok(mut scope) => {
            sqlx::query_scalar("SELECT count(*) FROM public.search_entity_projections")
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten()
                .unwrap_or(0)
        }
        Err(_) => 0,
    };
    tracing::info!(
        "[search] backfill 对账完成: 源快照 {} 条, 投影补写 {} 行, 失败 {} 行, 投影行数 {} -> {}",
        source_count,
        upserted,
        failed,
        before,
        after
    );
    failed == 0
}
