//! 外部 ERP 集成（缺口#13 扩展版）
//! 覆盖 /external-erp/* 全部路径，基于 erp_connections / erp_mappings / external_erp_sync_logs 真实表实现

use axum::extract::{Extension, Path, State};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{AppState, ErpConnection, ErpConnectionResponse, ErpMapping};

const TENANT_ID: &str = "default";

/// 写入路径租户：claims 无租户（超管）时回落 nil UUID（tenant_id 列 NOT NULL，
/// 直接绑 NULL 会触发非空约束 → 500）
fn tenant_uuid(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

// ===== SSRF 防护（默认封锁私网段 + env 白名单显式放行 + DNS 重绑定加固） =====
//
// 范围：「回环/链路本地/未指定/私网段封锁 + 错误回传脱敏 + 域名目标 DNS 解析校验」。
// 封锁集合（blocked_ip）：
//   - 回环 127.0.0.0/8、::1；
//   - 链路本地 169.254.0.0/16、fe80::/10（含云元数据 169.254.169.254）；
//   - 未指定 0.0.0.0、::；
//   - IPv4 私网段 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16（std is_private，RFC1918）；
//   - IPv6 唯一本地地址 fc00::/7（ULA，私网对应段）。
// 白名单放行：环境变量 EXTERNAL_ERP_ALLOWED_HOSTS（逗号分隔），单项支持
// 精确域名、精确 IP、CIDR 前缀（IPv4/IPv6）。命中即跳过封锁，优先级最高
// （先于代理跳过逻辑）；env 未设置/为空 → 全部按默认封锁。每次判定前实时读取
// env，运行时变更无需重启（与 has_egress_proxy 读取时机一致）。
//
// 若进程配置了出口代理（HTTP_PROXY / HTTPS_PROXY / ALL_PROXY 环境变量），
// 请求实际发往代理而非直连目标，本地封锁无意义 → 跳过封锁并依赖代理出口策略，
// 同时打 warn 日志便于审计（白名单命中时直接放行，不打该 warn）。

/// 进程是否已配置出口代理（大小写不敏感）
fn has_egress_proxy() -> bool {
    for (key, _) in std::env::vars() {
        let k = key.to_ascii_uppercase();
        if matches!(k.as_str(), "HTTP_PROXY" | "HTTPS_PROXY" | "ALL_PROXY") {
            return true;
        }
    }
    false
}

/// 纯函数：单个 IP 是否命中 SSRF 封锁段。
/// 封锁集合：回环 127.0.0.0/8、::1；链路本地 169.254.0.0/16、fe80::/10；
/// 未指定地址 0.0.0.0、::；IPv4 私网段 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16
/// （std `Ipv4Addr::is_private`，RFC1918）；IPv6 唯一本地地址 fc00::/7（ULA）。
/// IP 直连判定与域名解析结果（DNS 重绑定防护）共用本函数。
/// 例外：EXTERNAL_ERP_ALLOWED_HOSTS 白名单命中的目标不经过本函数封锁
/// （见 host_whitelisted / ip_whitelisted，判定优先级高于本函数）。
fn blocked_ip(ip: std::net::IpAddr) -> bool {
    match ip {
        std::net::IpAddr::V4(v4) => {
            // is_loopback: 127.0.0.0/8；is_link_local: 169.254.0.0/16；
            // is_unspecified: 0.0.0.0；is_private: RFC1918 私网段
            v4.is_loopback() || v4.is_link_local() || v4.is_unspecified() || v4.is_private()
        }
        std::net::IpAddr::V6(v6) => {
            // ::1 回环；:: 未指定；fe80::/10 链路本地（std 未提供 is_link_local，手动判定）；
            // fc00::/7 唯一本地地址 ULA（私网对应段）
            v6.is_loopback()
                || v6.is_unspecified()
                || (v6.segments()[0] & 0xffc0 == 0xfe80)
                || v6_unique_local(v6)
        }
    }
}

/// IPv6 唯一本地地址（ULA，fc00::/7）：首字节高 7 位恒为 1111110，
/// 即首字节 ∈ 0xFC..=0xFD（fc00:: 与 fd00::/8 两段合并为 /7）。
fn v6_unique_local(v6: std::net::Ipv6Addr) -> bool {
    v6.octets()[0] & 0xfe == 0xfc
}

// ===== EXTERNAL_ERP_ALLOWED_HOSTS 白名单（显式放行内网/私网目标） =====

/// 白名单条目：EXTERNAL_ERP_ALLOWED_HOSTS 逗号分隔列表中的单项（小写化后存储）。
#[derive(Debug, Clone, PartialEq)]
enum AllowEntry {
    /// 精确域名：与 URL host 整串相等（小写比较，不含端口），如 `erp.corp.local`。
    Domain(String),
    /// 精确 IP，如 `10.0.0.5`。
    Ip(std::net::IpAddr),
    /// IPv4 CIDR 前缀，如 `10.0.0.0/8`、`172.16.0.0/12`（网络号已按 mask 归一）。
    CidrV4 { net: u32, mask: u32 },
    /// IPv6 CIDR 前缀，如 `fd00::/8`、`fc00::/7`（网络号已按 mask 归一）。
    CidrV6 { net: u128, mask: u128 },
}

/// 纯函数：解析 EXTERNAL_ERP_ALLOWED_HOSTS 原始串为白名单条目列表。
/// 逗号分隔；空项与无法识别的单项跳过（不使整个白名单失效）。单项格式：
/// 精确域名 / 精确 IP / `IP/前缀` CIDR（IPv4 前缀 0..=32，IPv6 前缀 0..=128）。
/// 未新增第三方依赖：CIDR 归一与包含判定均用 std（u32/u128 位运算）。
fn parse_allowed_hosts(raw: &str) -> Vec<AllowEntry> {
    raw.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .filter_map(|s| parse_allowed_entry(&s.to_lowercase()))
        .collect()
}

/// 解析单个白名单条目；非法单项返回 None（跳过）。
fn parse_allowed_entry(lower: &str) -> Option<AllowEntry> {
    if let Some((net_str, prefix_str)) = lower.split_once('/') {
        // CIDR 形式。IPv6 文本含 ':' 不含 '/'，split_once('/') 不会误切。
        let prefix: u32 = prefix_str.parse().ok()?;
        return match net_str.parse::<std::net::IpAddr>().ok()? {
            std::net::IpAddr::V4(v4) => {
                if prefix > 32 {
                    return None;
                }
                let mask = if prefix == 0 {
                    0u32
                } else {
                    u32::MAX << (32 - prefix)
                };
                Some(AllowEntry::CidrV4 {
                    net: u32::from(v4) & mask,
                    mask,
                })
            }
            std::net::IpAddr::V6(v6) => {
                if prefix > 128 {
                    return None;
                }
                let mask = if prefix == 0 {
                    0u128
                } else {
                    u128::MAX << (128 - prefix)
                };
                Some(AllowEntry::CidrV6 {
                    net: u128::from(v6) & mask,
                    mask,
                })
            }
        };
    }
    // 精确 IP
    if let Ok(ip) = lower.parse::<std::net::IpAddr>() {
        return Some(AllowEntry::Ip(ip));
    }
    // 精确域名：拒绝含端口（':'）或空白的项（URL host 比对不含端口）。
    // 此处不做严格域名语法校验——作为整串精确匹配，误配只会导致该条目永不命中。
    if lower.chars().any(|c| c == ':' || c.is_whitespace()) {
        return None;
    }
    Some(AllowEntry::Domain(lower.to_string()))
}

/// 白名单实时读取：每次 SSRF 判定前调用（与 has_egress_proxy 读取时机一致），
/// 运行时变更 env 即可生效、无需重启；env::var 开销可忽略（判定点仅在外部 ERP
/// 调用/探测前，非热路径）。env 未设置或为空 → 返回空列表（全部按默认封锁）。
fn allowed_host_entries() -> Vec<AllowEntry> {
    match std::env::var("EXTERNAL_ERP_ALLOWED_HOSTS") {
        Ok(raw) => parse_allowed_hosts(&raw),
        Err(_) => Vec::new(),
    }
}

/// 纯函数：URL host 字符串是否命中白名单（精确域名 / 精确 IP / CIDR）。
/// 入参为 URL 解析出的 host（可能带方括号 IPv6），内部归一化（去括号、小写）后比对。
fn host_whitelisted(host: &str, entries: &[AllowEntry]) -> bool {
    let h = host
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_lowercase();
    if h.is_empty() {
        return false;
    }
    entries.iter().any(|e| match e {
        AllowEntry::Domain(d) => h == *d,
        AllowEntry::Ip(allowed) => h
            .parse::<std::net::IpAddr>()
            .map(|parsed| &parsed == allowed)
            .unwrap_or(false),
        AllowEntry::CidrV4 { net, mask } => match h.parse::<std::net::IpAddr>() {
            Ok(std::net::IpAddr::V4(v4)) => (u32::from(v4) & *mask) == *net,
            _ => false,
        },
        AllowEntry::CidrV6 { net, mask } => match h.parse::<std::net::IpAddr>() {
            Ok(std::net::IpAddr::V6(v6)) => (u128::from(v6) & *mask) == *net,
            _ => false,
        },
    })
}

/// 纯函数：解析后的 IP 是否命中白名单（精确 IP / CIDR；域名条目不参与 IP 匹配）。
fn ip_whitelisted(ip: std::net::IpAddr, entries: &[AllowEntry]) -> bool {
    entries.iter().any(|e| match e {
        AllowEntry::Domain(_) => false,
        AllowEntry::Ip(allowed) => allowed == &ip,
        AllowEntry::CidrV4 { net, mask } => match ip {
            std::net::IpAddr::V4(v4) => (u32::from(v4) & *mask) == *net,
            _ => false,
        },
        AllowEntry::CidrV6 { net, mask } => match ip {
            std::net::IpAddr::V6(v6) => (u128::from(v6) & *mask) == *net,
            _ => false,
        },
    })
}

/// 判断目标 URL 是否命中 SSRF 封锁规则（回环 127.0.0.0/8、::1；
/// 链路本地 169.254.0.0/16；未指定地址 0.0.0.0；私网段 10/8、172.16/12、192.168/16；
/// 主机名 localhost；host 为 IP 直连时按 blocked_ip 判定）。
/// 白名单：EXTERNAL_ERP_ALLOWED_HOSTS 命中（精确域名/精确 IP/CIDR）时直接放行，
/// 优先级最高（先于代理跳过判定）。
/// 域名形式 host 不在本同步函数内解析——DNS 校验由 ssrf_target_blocked_async
/// 在异步调用点补齐（DNS 重绑定防护）。走代理时返回 false（跳过封锁，依赖代理策略）。
fn ssrf_target_blocked(url: &str) -> bool {
    let host = match url::Url::parse(url) {
        Ok(u) => u.host().map(|h| h.to_string()).unwrap_or_default(),
        Err(_) => return true, // 无法解析的 URL 一律拒绝
    };
    // 白名单最高优先：命中即放行（先于代理跳过判定）
    if host_whitelisted(&host, &allowed_host_entries()) {
        return false;
    }
    if has_egress_proxy() {
        tracing::warn!(
            "external_erp SSRF: 检测到出口代理环境变量，跳过本地目标封锁，依赖代理出口策略 (url={})",
            url
        );
        return false;
    }
    ssrf_host_blocked(&host)
}

/// 纯函数：给定 URL host（可能带方括号 IPv6）判断是否命中封锁段。
/// 域名形式返回 false（交由 ssrf_target_blocked_async 做 DNS 解析校验）。
fn ssrf_host_blocked(host: &str) -> bool {
    let host = host
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_lowercase();
    if host == "localhost" || host.ends_with(".localhost") {
        return true;
    }
    match host.parse::<std::net::IpAddr>() {
        Ok(ip) => blocked_ip(ip),
        Err(_) => false, // 域名：异步侧做 DNS 解析校验（见 ssrf_target_blocked_async）
    }
}

/// DNS 重绑定加固（异步）：对域名形式的目标 host 做 DNS 解析，
/// 解析出的全部 IP 中任一命中 blocked_ip（回环/链路本地/未指定/私网段）即拒绝。
/// 白名单：EXTERNAL_ERP_ALLOWED_HOSTS 命中即放行——host 字符串命中（精确域名/
/// 精确 IP/CIDR）直接放行，不做后续解析；解析后任一 IP 命中精确 IP/CIDR 条目亦放行。
/// 解析策略：
/// - IP 直连 host：返回 false（已由 ssrf_host_blocked / blocked_ip 判定）；
/// - 域名 host：`tokio::net::lookup_host` 解析，任一解析 IP 被封锁 → blocked；
/// - 解析失败（NXDOMAIN / 解析器错误）且非 IP 直连 → 保守拒绝并 warn：
///   无法证明目标安全即不放行（此时该域名本就无法建立 HTTP 连接，
///   拒绝不损失真实可用性，仅堵死「解析器投毒/分裂 DNS」绕过路径）。
/// 走代理时与 ssrf_target_blocked 一致：跳过本地校验（warn 已在同步侧打）。
async fn ssrf_target_blocked_async(url: &str) -> bool {
    let host = match url::Url::parse(url) {
        Ok(u) => u.host().map(|h| h.to_string()).unwrap_or_default(),
        Err(_) => return true, // 无法解析 URL：同步侧已拒绝，此处保持一致
    };
    let host = host
        .trim_start_matches('[')
        .trim_end_matches(']')
        .to_lowercase();
    let entries = allowed_host_entries();
    // 白名单最高优先：host 字符串命中（精确域名/精确 IP/CIDR）即放行，
    // 先于代理跳过与 DNS 解析判定；operator 显式信任的目标不再做解析校验。
    if host_whitelisted(&host, &entries) {
        return false;
    }
    if has_egress_proxy() {
        return false;
    }
    if host.is_empty() || host.parse::<std::net::IpAddr>().is_ok() {
        return false; // IP 直连 / localhost 已在同步侧判定
    }
    let resolved = tokio::net::lookup_host((host.as_str(), 0)).await;
    match resolved {
        Ok(addrs) => {
            let addrs: Vec<_> = addrs.collect();
            // 白名单（精确 IP/CIDR）：任一解析 IP 命中 → 放行（operator 显式 opt-in）。
            // 注意：此放行以 operator 配置为准；默认（白名单为空）仍保持
            // 「任一解析 IP 命中封锁段即拒绝」的 DNS 重绑定防护。
            if addrs.iter().any(|sa| ip_whitelisted(sa.ip(), &entries)) {
                return false;
            }
            addrs.iter().any(|sa| blocked_ip(sa.ip()))
        }
        Err(e) => {
            tracing::warn!(
                "external_erp SSRF: 目标域名 DNS 解析失败，保守拒绝 (host={}, err={})",
                host,
                e
            );
            true
        }
    }
}

/// 钉 IP 构建 HTTP client：域名目标在 SSRF 校验通过后立即解析，并把解析出的
/// 第一个 IP 钉入 reqwest 解析表（`ClientBuilder::resolve`）——reqwest 建立连接时
/// 不再做第二次 DNS 解析（连接/SNI/证书仍按原域名），消除「校验用解析 A、连接用
/// 解析 B」的 TOCTOU / DNS 重绑定窗口。
///
/// - IP 直连 host（含 localhost）：无二次解析，直接构建，无需钉。
/// - 域名解析失败：保持默认行为返回 client（前置 SSRF 校验已保守拒绝解析失败
///   目标；此处失败仅导致连接报错，无安全损失）。
async fn build_pinned_client(
    url: &str,
    timeout: std::time::Duration,
) -> Result<reqwest::Client, reqwest::Error> {
    let mut builder = reqwest::Client::builder().timeout(timeout);
    if let Ok(u) = url::Url::parse(url) {
        if let Some(host) = u.host_str() {
            let host = host
                .trim_start_matches('[')
                .trim_end_matches(']')
                .to_lowercase();
            if !host.is_empty() && host.parse::<std::net::IpAddr>().is_err() {
                let port = u.port_or_known_default().unwrap_or(80);
                // 解析加短超时：钉 IP 属纵深加固，不得因解析器卡顿拖死请求线程
                let resolved: Result<Vec<std::net::SocketAddr>, std::io::Error> =
                    match tokio::time::timeout(
                        std::time::Duration::from_secs(2),
                        tokio::net::lookup_host((host.as_str(), port)),
                    )
                    .await
                    {
                        Ok(r) => r.map(|it| it.collect()),
                        Err(_) => Ok(Vec::new()),
                    };
                if let Some(addr) = resolved.ok().and_then(|v| v.into_iter().next()) {
                    builder = builder.resolve(&host, addr);
                }
            }
        }
    }
    builder.build()
}

/// reqwest 错误原文可能携带内网地址/端口/完整 URL 细节，
/// 回传客户端前脱敏；原始错误仅落服务端日志。
fn sanitize_reqwest_error(e: &reqwest::Error) -> String {
    tracing::warn!("external_erp raw HTTP error (已脱敏，仅服务端可见): {}", e);
    "HTTP 请求失败（详情已记录服务端日志）".to_string()
}

// ===== 同步日志模型 =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExternalErpSyncLog {
    id: Uuid,
    tenant_id: Uuid,
    connection_id: Option<Uuid>,
    entity: String,
    direction: String,
    status: String,
    total_records: i32,
    success_count: i32,
    failed_count: i32,
    error_message: Option<String>,
    started_at: Option<chrono::DateTime<chrono::Utc>>,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatistics {
    total_syncs: i64,
    successful: i64,
    failed: i64,
    last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    by_entity: serde_json::Value,
}

// ===== connections =====

pub async fn list_connections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ErpConnectionResponse>>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            rows.into_iter().map(ErpConnectionResponse::from).collect::<Vec<_>>(),
            "连接列表获取成功",
        )),
        Err(e) => {
            tracing::error!("external_erp list_connections: {}", e);
            Json(ApiResponse::from(TopemsError::internal("查询失败", e)))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnectionResponse>> {
    let id = Uuid::new_v4();
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名连接")
        .to_string();
    let r#type = body
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("custom")
        .to_string();
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let api_version = body
        .get("api_version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let app_key = body
        .get("app_key")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let app_secret = body
        .get("app_secret")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sync_direction = body
        .get("sync_direction")
        .and_then(|v| v.as_str())
        .unwrap_or("bidirectional")
        .to_string();
    let sync_mode = body
        .get("sync_mode")
        .and_then(|v| v.as_str())
        .unwrap_or("manual")
        .to_string();
    let sync_interval = body
        .get("sync_interval")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_connections \
         (id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
          sync_direction, sync_mode, sync_interval, status, isactive, created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'inactive',TRUE,NOW(),NOW()) \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(id)
    .bind(tenant_uuid(&claims))
    .bind(&name)
    .bind(&r#type)
    .bind(&api_url)
    .bind(api_version)
    .bind(app_key)
    .bind(app_secret)
    .bind(&sync_direction)
    .bind(&sync_mode)
    .bind(sync_interval)
    .fetch_one(&state.pool)
    .await
    {
        Ok(conn) => Json(ApiResponse::success(conn.into(), "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

/// 真实 HTTP 连通性探测结果
#[derive(Debug, Clone)]
pub(crate) struct ProbeResult {
    pub success: bool,
    pub response_time_ms: u64,
    /// 收到 HTTP 响应时的状态码；连接失败/超时时为 None
    pub http_status: Option<u16>,
    pub error_message: Option<String>,
}

/// 真实 HTTP 连通性探测：对目标 URL 发起 GET 请求，带整体超时。
/// 成功判定：HTTP 2xx/3xx；连接拒绝 / DNS 失败 / 超时均返回失败（success=false），
/// 不再出现"仅校验 URL 前缀即报成功"的假探测。
/// SSRF 防护：封锁回环/链路本地/未指定/私网段目标；EXTERNAL_ERP_ALLOWED_HOSTS
/// 白名单命中者放行；错误原文脱敏后回传，不暴露内网地址/端口细节（见模块头注释）。
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub(crate) async fn probe_http_url(api_url: &str, timeout_ms: u64) -> ProbeResult {
    // SSRF 目标封锁：回环/链路本地/私网段 + 域名 DNS 解析校验（防 DNS 重绑定）
    if ssrf_target_blocked(api_url) || ssrf_target_blocked_async(api_url).await {
        return ProbeResult {
            success: false,
            response_time_ms: 0,
            http_status: None,
            error_message: Some(
                "目标地址被安全策略拒绝（回环/链路本地/私网段禁止访问；内网目标请配置 EXTERNAL_ERP_ALLOWED_HOSTS 显式放行）"
                    .to_string(),
            ),
        };
    }

    let start = std::time::Instant::now();
    // 钉 IP：校验后的解析结果直接钉入 reqwest，连接不再二次 DNS 解析（防 TOCTOU）
    let client =
        match build_pinned_client(api_url, std::time::Duration::from_millis(timeout_ms)).await {
            Ok(c) => c,
            Err(e) => {
                return ProbeResult {
                    success: false,
                    response_time_ms: start.elapsed().as_millis() as u64,
                    http_status: None,
                    error_message: Some(sanitize_reqwest_error(&e)),
                };
            }
        };

    match client.get(api_url).send().await {
        Ok(resp) => {
            let status = resp.status();
            let success = status.is_success() || status.is_redirection();
            ProbeResult {
                success,
                response_time_ms: start.elapsed().as_millis() as u64,
                http_status: Some(status.as_u16()),
                error_message: if success {
                    None
                } else {
                    Some(format!("HTTP {}", status.as_u16()))
                },
            }
        }
        Err(e) => ProbeResult {
            success: false,
            response_time_ms: start.elapsed().as_millis() as u64,
            http_status: None,
            error_message: Some(sanitize_reqwest_error(&e)),
        },
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
async fn test_connection(
    State(_state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let timeout_ms = body.get("timeout").and_then(|v| v.as_i64()).unwrap_or(5000) as u64;

    // URL 格式校验
    if !api_url.starts_with("http://") && !api_url.starts_with("https://") {
        return Json(ApiResponse::success(
            serde_json::json!({"success": false, "response_time_ms": 0, "error_message": "URL 必须以 http:// 或 https:// 开头"}),
            "测试完成",
        ));
    }

    // 真实 HTTP 探测（带超时）：与 /erp/connections/test 复用同一实现
    let probe = probe_http_url(&api_url, timeout_ms).await;
    let mut body = serde_json::json!({
        "success": probe.success,
        "response_time_ms": probe.response_time_ms,
        "error_message": probe.error_message,
    });
    if let Some(code) = probe.http_status {
        body["http_status"] = serde_json::Value::from(code);
    }
    Json(ApiResponse::success(body, "测试完成"))
}

async fn get_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ErpConnectionResponse>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE id = $1 AND ($2::text IS NULL OR tenant_id::text = $2)"
    ))
    .bind(uuid)
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn.into(), "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
pub async fn update_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnectionResponse>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let isactive = body.get("isactive").and_then(|v| v.as_bool());
    let status = body
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET \
         name = COALESCE($1, name), \
         api_url = COALESCE($2, api_url), \
         isactive = COALESCE($3, isactive), \
         status = COALESCE($4, status), \
         updated_at = NOW() \
         WHERE id = $5 AND tenant_id::text = $6 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(name)
    .bind(api_url)
    .bind(isactive)
    .bind(status)
    .bind(uuid)
    .bind(&claims.tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn.into(), "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
pub async fn delete_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_connections WHERE id = $1 AND tenant_id::text = $2"
    ))
    .bind(uuid)
    .bind(&claims.tenant_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

// ===== connections/{id}/{entity}-mappings =====

pub async fn list_entity_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings \
         WHERE connection_id = $1 AND mapping_type = $2 AND ($3::text IS NULL OR tenant_id::text = $3) ORDER BY created_at DESC"
    ))
    .bind(uuid)
    .bind(&entity)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "映射列表获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

async fn create_entity_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mapping_id = Uuid::new_v4();
    let local_code = body
        .get("local_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let local_name = body
        .get("local_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_code = body
        .get("external_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_name = body
        .get("external_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,'bidirectional',TRUE,0,NULL,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(mapping_id)
    .bind(tenant_uuid(&claims))
    .bind(uuid)
    .bind(&entity)
    .bind(mapping_id.to_string())
    .bind(&local_code)
    .bind(&local_name)
    .bind(&external_code)
    .bind(&external_name)
    .fetch_one(&state.pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn batch_entity_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let items = body
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut processed = 0i64;
    let mut failed = 0i64;

    for item in &items {
        let mapping_id = Uuid::new_v4();
        let local_code = item
            .get("local_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let local_name = item
            .get("local_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let external_code = item
            .get("external_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let external_name = item
            .get("external_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        match sqlx::query(only_own_schema_query!(
            "integration",
            "INSERT INTO erp_mappings \
             (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
              external_code, external_name, direction, isactive, priority, created_at, updated_at) \
             VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,'bidirectional',TRUE,0,NOW(),NOW())"
        ))
        .bind(mapping_id)
        .bind(tenant_uuid(&claims))
        .bind(uuid)
        .bind(&entity)
        .bind(mapping_id.to_string())
        .bind(&local_code)
        .bind(&local_name)
        .bind(&external_code)
        .bind(&external_name)
        .execute(&state.pool)
        .await
        {
            Ok(_) => processed += 1,
            Err(e) => {
                tracing::error!("batch_entity_mappings item error: {}", e);
                failed += 1;
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({"processed": processed, "failed": failed, "total": items.len()}),
        "批量处理完成",
    ))
}

// ===== connections/{id}/preview/{entity} =====

pub async fn preview_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings \
         WHERE connection_id = $1 AND mapping_type = $2 AND ($3::text IS NULL OR tenant_id::text = $3) \
         ORDER BY created_at DESC LIMIT 20"
    ))
    .bind(uuid)
    .bind(&entity)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "预览数据获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== 真实同步执行引擎 =====

/// 获取 ERP 连接信息
async fn get_connection_by_id(
    pool: &sqlx::PgPool,
    connection_id: Uuid,
    tenant: Option<&str>,
) -> Option<ErpConnection> {
    sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE id = $1 AND tenant_id::text = $2"
    ))
    .bind(connection_id)
    .bind(tenant)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

/// 调用 ERP API（支持认证头）
/// SSRF 防护：请求前封锁回环/链路本地/未指定/私网段目标（EXTERNAL_ERP_ALLOWED_HOSTS
/// 白名单命中者放行）；错误信息脱敏，不向调用方回传含内网地址/端口/完整 URL 的
/// reqwest 原文（原文仅落服务端日志）。
async fn call_erp_api(
    connection: &ErpConnection,
    method: &str,
    path: &str,
    body: Option<&serde_json::Value>,
) -> Result<serde_json::Value, TopemsError> {
    let url = format!("{}{}", connection.api_url.trim_end_matches('/'), path);

    if ssrf_target_blocked(&url) || ssrf_target_blocked_async(&url).await {
        tracing::warn!("external_erp SSRF blocked: {}", url);
        return Err(TopemsError::BusinessLogic(
            "目标地址被安全策略拒绝（回环/链路本地/私网段禁止访问）".to_string(),
        ));
    }

    // 钉 IP：校验后的解析结果直接钉入 reqwest，连接不再二次 DNS 解析（防 TOCTOU）
    let client = build_pinned_client(&url, std::time::Duration::from_secs(30))
        .await
        .map_err(|e| {
            tracing::warn!("external_erp client build raw error: {}", e);
            TopemsError::NetworkRequest("HTTP client build failed".to_string())
        })?;

    let mut request = match method {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };

    // 添加认证头
    if let Some(ref key) = connection.app_key {
        if !key.is_empty() {
            request = request.header("X-API-Key", key);
        }
    }
    if let Some(ref secret) = connection.app_secret {
        if !secret.is_empty() {
            request = request.header("X-API-Secret", secret);
        }
    }
    request = request.header("Content-Type", "application/json");

    if let Some(b) = body {
        request = request.json(b);
    }

    let resp = request
        .send()
        .await
        .map_err(|e| TopemsError::NetworkRequest(sanitize_reqwest_error(&e)))?;
    let status = resp.status();

    if !status.is_success() {
        // 上游响应体可能含内部地址/路由细节，仅落服务端日志，不回传调用方
        let upstream_body = resp.text().await.unwrap_or_default();
        tracing::warn!(
            "external_erp upstream non-2xx status={} body={}",
            status.as_u16(),
            upstream_body
        );
        return Err(TopemsError::BusinessLogic(format!(
            "ERP API returned status {}",
            status.as_u16()
        )));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| {
        tracing::warn!("external_erp parse response raw error: {}", e);
        TopemsError::ValidationFailed("Failed to parse ERP response".to_string())
    })?;
    Ok(data)
}

/// 更新同步日志状态
async fn update_sync_log_status(
    pool: &sqlx::PgPool,
    task_id: Uuid,
    status: &str,
    total_records: i32,
    success_count: i32,
    failed_count: i32,
    error_message: Option<&str>,
) {
    let _ = sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE external_erp_sync_logs \
         SET status = $1, total_records = $2, success_count = $3, failed_count = $4, \
             error_message = $5, completed_at = NOW() \
         WHERE id = $6"
    ))
    .bind(status)
    .bind(total_records)
    .bind(success_count)
    .bind(failed_count)
    .bind(error_message)
    .bind(task_id)
    .execute(pool)
    .await;
}

/// 将从 ERP 导入的数据写入 staging 表
/// 支持去重（基于 connection_id + entity + external_id）
async fn write_to_staging(
    pool: &sqlx::PgPool,
    connection_id: Uuid,
    entity: &str,
    items: &[serde_json::Value],
) -> Result<(i32, i32), TopemsError> {
    let mut inserted = 0;
    let mut skipped = 0;

    for item in items {
        // 尝试提取 external_id（常见字段名：id、ID、external_id、code）
        let external_id = item
            .get("id")
            .and_then(|v| v.as_str())
            .or_else(|| item.get("ID").and_then(|v| v.as_str()))
            .or_else(|| item.get("external_id").and_then(|v| v.as_str()))
            .or_else(|| item.get("code").and_then(|v| v.as_str()))
            .map(|s| s.to_string());

        // 如果有 external_id，检查是否已存在（去重）
        if let Some(ref eid) = external_id {
            let exists: Option<(i64,)> = sqlx::query_as(
                "SELECT COUNT(*) FROM integration.external_erp_staging \
                 WHERE connection_id = $1 AND entity = $2 AND external_id = $3",
            )
            .bind(connection_id)
            .bind(entity)
            .bind(eid)
            .fetch_optional(pool)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("检查重复记录失败: {}", e)))?;

            if exists.map(|(c,)| c > 0).unwrap_or(false) {
                skipped += 1;
                continue;
            }
        }

        // 插入 staging 表
        let tenant_id = Uuid::parse_str(TENANT_ID).unwrap_or_else(|_| Uuid::nil());

        match sqlx::query(
            "INSERT INTO integration.external_erp_staging \
             (tenant_id, connection_id, entity, direction, source_system, external_id, raw_data, processed, process_status) \
             VALUES ($1, $2, $3, 'import', 'external_erp', $4, $5, false, 'pending')"
        )
        .bind(tenant_id)
        .bind(connection_id)
        .bind(entity)
        .bind(&external_id)
        .bind(item)
        .execute(pool)
        .await
        {
            Ok(_) => inserted += 1,
            Err(e) => {
                tracing::warn!("写入 staging 表失败（entity={}, external_id={:?}）: {}", entity, external_id, e);
                // 单条失败不影响整体，继续处理下一条
            }
        }
    }

    Ok((inserted, skipped))
}

// ===== sync/{entity} =====

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn sync_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(entity): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = Uuid::new_v4();
    let connection_id = body
        .get("connection_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let direction = body
        .get("direction")
        .and_then(|v| v.as_str())
        .unwrap_or("import")
        .to_string();
    let page_size = body
        .get("page_size")
        .and_then(|v| v.as_i64())
        .unwrap_or(100) as i32;

    // 创建同步日志记录
    if let Err(e) = sqlx::query(only_own_schema_query!(
        "integration",
        "INSERT INTO external_erp_sync_logs \
         (id, tenant_id, connection_id, entity, direction, status, started_at, created_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,'running',NOW(),NOW())"
    ))
    .bind(task_id)
    .bind(tenant_uuid(&claims))
    .bind(connection_id)
    .bind(&entity)
    .bind(&direction)
    .execute(&state.pool)
    .await
    {
        tracing::error!("sync_entity insert log: {}", e);
        return Json(ApiResponse::from(TopemsError::internal(
            "创建同步任务失败",
            e,
        )));
    }

    // 验证连接
    let cid = match connection_id {
        Some(c) => c,
        None => {
            update_sync_log_status(
                &state.pool,
                task_id,
                "failed",
                0,
                0,
                0,
                Some("缺少 connection_id"),
            )
            .await;
            return Json(ApiResponse::error(400, "缺少 connection_id"));
        }
    };

    let connection = match get_connection_by_id(&state.pool, cid, claims.tenant_id.as_deref()).await
    {
        Some(c) => c,
        None => {
            update_sync_log_status(
                &state.pool,
                task_id,
                "failed",
                0,
                0,
                0,
                Some("连接不存在或已删除"),
            )
            .await;
            return Json(ApiResponse::error(404, "ERP 连接不存在"));
        }
    };

    if !connection.isactive {
        update_sync_log_status(&state.pool, task_id, "failed", 0, 0, 0, Some("连接已禁用")).await;
        return Json(ApiResponse::error(400, "ERP 连接已禁用"));
    }

    // 执行真实同步
    let sync_result =
        match direction.as_str() {
            "import" => {
                // 从 ERP 导入数据：调用 GET /api/{entity}?page_size=N
                let path = format!("/api/{}?page_size={}", entity, page_size);
                match call_erp_api(&connection, "GET", &path, None).await {
                    Ok(data) => {
                        let items = data
                            .get("items")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();
                        let records = items.len() as i32;
                        let total = data
                            .get("total")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(records as i64) as i32;

                        // 将数据写入 staging 表（支持去重）
                        let (inserted, skipped) =
                            match write_to_staging(&state.pool, cid, &entity, &items).await {
                                Ok((i, s)) => (i, s),
                                Err(e) => {
                                    tracing::warn!("写入 staging 表失败: {}", e);
                                    (0, 0)
                                }
                            };

                        tracing::info!(
                        "ERP 导入完成: entity={}, total={}, records={}, inserted={}, skipped={}",
                        entity, total, records, inserted, skipped
                    );

                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "success",
                            total,
                            inserted,
                            skipped,
                            None,
                        )
                        .await;
                        Ok((total, inserted, skipped))
                    }
                    Err(e) => {
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "failed",
                            0,
                            0,
                            0,
                            Some(&e.to_string()),
                        )
                        .await;
                        Err(e)
                    }
                }
            }
            "export" => {
                // 导出数据到 ERP：调用 POST /api/{entity}
                let payload = body.get("data").cloned().unwrap_or(serde_json::json!({}));
                match call_erp_api(
                    &connection,
                    "POST",
                    &format!("/api/{}", entity),
                    Some(&payload),
                )
                .await
                {
                    Ok(data) => {
                        let created = data
                            .get("created_count")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(1) as i32;
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "success",
                            created,
                            created,
                            0,
                            None,
                        )
                        .await;
                        Ok((created, created, 0))
                    }
                    Err(e) => {
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "failed",
                            0,
                            0,
                            0,
                            Some(&e.to_string()),
                        )
                        .await;
                        Err(e)
                    }
                }
            }
            _ => {
                let msg = format!("不支持的同步方向: {}", direction);
                update_sync_log_status(&state.pool, task_id, "failed", 0, 0, 0, Some(&msg)).await;
                Err(TopemsError::ValidationFailed(msg))
            }
        };

    // 更新连接的最后同步时间
    let _ = sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1"
    ))
    .bind(cid)
    .execute(&state.pool)
    .await;

    match sync_result {
        Ok((total, success, failed)) => Json(ApiResponse::success(
            serde_json::json!({
                "task_id": task_id.to_string(),
                "entity": entity,
                "direction": direction,
                "status": "success",
                "total_records": total,
                "success_count": success,
                "failed_count": failed,
                "message": "同步完成"
            }),
            "同步完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("同步失败", e))),
    }
}

// ===== sync-logs =====

pub async fn sync_logs(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ExternalErpSyncLog>>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC LIMIT 100"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "同步日志获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== sync-statistics =====

pub async fn sync_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SyncStatistics>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    // 总量统计
    let total: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1)"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let successful: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) AND status = 'success'"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let failed: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) AND status = 'failed'"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let last_sync: Option<(Option<chrono::DateTime<chrono::Utc>>,)> =
        sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT MAX(completed_at) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1)"
        ))
        .bind(tid)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    // 按 entity 分组统计
    let by_entity_rows: Vec<(String, i64)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT entity, COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) GROUP BY entity ORDER BY COUNT(*) DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut by_entity = serde_json::Map::new();
    for (entity, count) in by_entity_rows {
        by_entity.insert(entity, serde_json::json!(count));
    }

    Json(ApiResponse::success(
        SyncStatistics {
            total_syncs: total.map(|t| t.0).unwrap_or(0),
            successful: successful.map(|t| t.0).unwrap_or(0),
            failed: failed.map(|t| t.0).unwrap_or(0),
            last_sync_at: last_sync.and_then(|t| t.0),
            by_entity: serde_json::Value::Object(by_entity),
        },
        "统计获取成功",
    ))
}

// ===== export =====

pub async fn export_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            serde_json::json!({
                "format": "json",
                "count": rows.len(),
                "data": rows
            }),
            "导出完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("导出失败", e))),
    }
}

pub async fn export_sync_logs(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            serde_json::json!({
                "format": "json",
                "count": rows.len(),
                "data": rows
            }),
            "导出完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("导出失败", e))),
    }
}

// ===== connections/{id}/toggle =====

pub async fn toggle_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnectionResponse>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let enabled = body
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET isactive = $2, updated_at = NOW() \
         WHERE id = $1 AND tenant_id::text = $3 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(uuid)
    .bind(enabled)
    .bind(&claims.tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn.into(), "切换成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("切换失败", e))),
    }
}

// ===== connections/{id}/sync-status =====

pub async fn sync_connection_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    // 待上游支持：此处仅回显连接当前状态，真实 ERP 连通性探测后续接入
    match get_connection_by_id(&state.pool, uuid, claims.tenant_id.as_deref()).await {
        Some(c) => Json(ApiResponse::success(
            serde_json::json!({"status": c.status, "isactive": c.isactive, "last_sync_at": c.last_sync_at}),
            "连接状态已刷新",
        )),
        None => Json(ApiResponse::error(404, "连接不存在")),
    }
}

// ===== connections/{id}/company-mappings =====

pub async fn list_company_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at \
         FROM erp_mappings WHERE connection_id = $1 AND mapping_type = 'company' AND ($2::text IS NULL OR tenant_id::text = $2) ORDER BY created_at DESC"
    ))
    .bind(uuid)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "公司映射列表获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

pub async fn create_company_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mapping_id = Uuid::new_v4();
    let local_code = body
        .get("local_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let local_name = body
        .get("local_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_code = body
        .get("external_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_name = body
        .get("external_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,'company',$4,$5,$6,$7,$8,'bidirectional',TRUE,0,NULL,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(mapping_id)
    .bind(tenant_uuid(&claims))
    .bind(conn_uuid)
    .bind(mapping_id.to_string())
    .bind(&local_code)
    .bind(&local_name)
    .bind(&external_code)
    .bind(&external_name)
    .fetch_one(&state.pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn update_company_mapping(
    State(state): State<AppState>,
    Path((id, mapping_id)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    let local_code = body.get("local_code").and_then(|v| v.as_str());
    let local_name = body.get("local_name").and_then(|v| v.as_str());
    let external_code = body.get("external_code").and_then(|v| v.as_str());
    let external_name = body.get("external_name").and_then(|v| v.as_str());
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE erp_mappings SET \
         local_code = COALESCE($1, local_code), \
         local_name = COALESCE($2, local_name), \
         external_code = COALESCE($3, external_code), \
         external_name = COALESCE($4, external_name), \
         updated_at = NOW() \
         WHERE id = $5 AND connection_id = $6 AND mapping_type = 'company' \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(local_code)
    .bind(local_name)
    .bind(external_code)
    .bind(external_name)
    .bind(mid)
    .bind(conn_uuid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_company_mapping(
    State(state): State<AppState>,
    Path((id, mapping_id)): Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_mappings WHERE id = $1 AND connection_id = $2 AND mapping_type = 'company' AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id::text = COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(mid)
    .bind(conn_uuid)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

// ===== connections/{id}/mappings/{entity}/{mapping_id} =====

pub async fn update_entity_mapping(
    State(state): State<AppState>,
    Path((conn_id, entity, mapping_id)): Path<(String, String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    let local_code = body.get("local_code").and_then(|v| v.as_str());
    let local_name = body.get("local_name").and_then(|v| v.as_str());
    let external_code = body.get("external_code").and_then(|v| v.as_str());
    let external_name = body.get("external_name").and_then(|v| v.as_str());
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE erp_mappings SET \
         local_code = COALESCE($1, local_code), \
         local_name = COALESCE($2, local_name), \
         external_code = COALESCE($3, external_code), \
         external_name = COALESCE($4, external_name), \
         updated_at = NOW() \
         WHERE id = $5 AND connection_id = $6 AND mapping_type = $7 \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(local_code)
    .bind(local_name)
    .bind(external_code)
    .bind(external_name)
    .bind(mid)
    .bind(conn_uuid)
    .bind(&entity)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_entity_mapping(
    State(state): State<AppState>,
    Path((conn_id, entity, mapping_id)): Path<(String, String, String)>,
) -> Json<ApiResponse<()>> {
    let conn_uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_mappings WHERE id = $1 AND connection_id = $2 AND mapping_type = $3 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id::text = COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(mid)
    .bind(conn_uuid)
    .bind(&entity)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

/// 自动匹配映射（待上游支持：依赖主数据服务，当前返回空匹配）
pub async fn auto_match_mappings() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"matched": 0, "total": 0}),
        "自动匹配完成",
    ))
}

// ===== sync/{log_id}/cancel =====

/// 取消同步（待上游支持：此处校验日志存在性后返回成功，真实中断后续接入）
pub async fn cancel_sync(
    State(state): State<AppState>,
    Path(log_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&log_id).unwrap_or(Uuid::nil());
    let exists: Option<(Uuid,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT id FROM external_erp_sync_logs WHERE id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    match exists {
        Some(_) => Json(ApiResponse::success(
            serde_json::json!({"status": "cancelled"}),
            "同步已取消",
        )),
        None => Json(ApiResponse::error(404, "同步日志不存在")),
    }
}

// ===== sync-logs/{log_id} =====

pub async fn get_sync_log(
    State(state): State<AppState>,
    Path(log_id): Path<String>,
) -> Json<ApiResponse<ExternalErpSyncLog>> {
    let uuid = Uuid::parse_str(&log_id).unwrap_or(Uuid::nil());
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(log)) => Json(ApiResponse::success(log, "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "同步日志不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== connections/{id}/sync-statistics =====

pub async fn connection_sync_statistics(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Json<ApiResponse<SyncStatistics>> {
    let uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let total: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let successful: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1 AND status = 'success'"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let failed: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1 AND status = 'failed'"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let last_sync: Option<(Option<chrono::DateTime<chrono::Utc>>,)> =
        sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT MAX(completed_at) FROM external_erp_sync_logs WHERE connection_id = $1"
        ))
        .bind(uuid)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);
    Json(ApiResponse::success(
        SyncStatistics {
            total_syncs: total.map(|t| t.0).unwrap_or(0),
            successful: successful.map(|t| t.0).unwrap_or(0),
            failed: failed.map(|t| t.0).unwrap_or(0),
            last_sync_at: last_sync.and_then(|t| t.0),
            by_entity: serde_json::Value::Object(serde_json::Map::new()),
        },
        "统计获取成功",
    ))
}

// ===== /health =====

pub async fn integration_health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"status": "up", "service": "integration"}),
        "integration healthy",
    ))
}

/// 构建 external-erp 路由（挂载到 /external-erp 前缀）
pub fn create_routes() -> Router<AppState> {
    let entity_mappings = Router::new()
        .route("/", get(list_entity_mappings).post(create_entity_mapping))
        .route("/batch", post(batch_entity_mappings))
        .route("/auto-match", post(auto_match_mappings))
        .route(
            "/{mapping_id}",
            put(update_entity_mapping).delete(delete_entity_mapping),
        );

    let preview = Router::new().route("/{entity}", get(preview_entity));

    let company_mappings = Router::new()
        .route("/", get(list_company_mappings).post(create_company_mapping))
        .route(
            "/{mapping_id}",
            put(update_company_mapping).delete(delete_company_mapping),
        );

    let connection_detail = Router::new()
        .route(
            "/",
            get(get_connection)
                .put(update_connection)
                .delete(delete_connection),
        )
        .route("/toggle", put(toggle_connection))
        .route("/sync-status", post(sync_connection_status))
        .route("/sync-statistics", get(connection_sync_statistics))
        .nest("/company-mappings", company_mappings)
        .nest("/mappings/{entity}", entity_mappings)
        .nest("/preview", preview);

    let sync = Router::new()
        .route("/{entity}", post(sync_entity))
        .route("/{log_id}/cancel", post(cancel_sync));

    Router::new()
        .route(
            "/connections",
            get(list_connections).post(create_connection),
        )
        .route("/connections/test", post(test_connection))
        .nest("/connections/{id}", connection_detail)
        .nest("/sync", sync)
        .route("/sync-logs", get(sync_logs))
        .route("/sync-logs/{log_id}", get(get_sync_log))
        .route("/sync-statistics", get(sync_statistics))
        .route("/export/mappings", get(export_mappings))
        .route("/export/sync-logs", get(export_sync_logs))
}

// ===== SSRF 防护单元测试（纯函数，不触网） =====

#[cfg(test)]
mod ssrf_tests {
    use super::*;

    /// env 全局状态互斥锁：EXTERNAL_ERP_ALLOWED_HOSTS 是进程级环境变量，
    /// 「默认封锁」语义的断言测试与 env 注入测试共用本锁串行执行，
    /// 避免并行测试互相污染。
    static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    fn env_lock_guard() -> std::sync::MutexGuard<'static, ()> {
        ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner())
    }

    #[test]
    fn blocks_loopback_ipv4() {
        assert!(ssrf_host_blocked("127.0.0.1"));
        assert!(ssrf_host_blocked("127.5.5.5"));
        assert!(ssrf_target_blocked("http://127.0.0.1:8080/api"));
        assert!(ssrf_target_blocked("http://127.255.255.1:9000/"));
    }

    #[test]
    fn blocks_link_local_and_unspecified() {
        assert!(ssrf_host_blocked("169.254.169.254")); // 云元数据
        assert!(ssrf_host_blocked("169.254.1.5"));
        assert!(ssrf_host_blocked("0.0.0.0"));
        assert!(ssrf_target_blocked("http://[::1]/admin"));
    }

    #[test]
    fn blocks_localhost_hostname() {
        assert!(ssrf_host_blocked("localhost"));
        assert!(ssrf_host_blocked("LOCALHOST"));
        assert!(!ssrf_host_blocked("localhost.internal.example"));
        assert!(ssrf_target_blocked("http://localhost:3000/erp"));
    }

    #[test]
    fn allows_public_targets() {
        let _guard = env_lock_guard(); // 断言「白名单为空」语义，需与 env 注入测试互斥
        assert!(!ssrf_target_blocked(
            "https://erp.customer.example.com/api/v1"
        ));
        assert!(!ssrf_target_blocked("http://8.8.8.8:8080/"));
        // 私网段已并入默认封锁（EXTERNAL_ERP_ALLOWED_HOSTS 可显式放行）
        assert!(ssrf_target_blocked("http://10.0.0.5:8080/"));
    }

    #[test]
    fn rejects_unparseable_url() {
        assert!(ssrf_target_blocked("not-a-url"));
    }

    #[test]
    fn blocked_ip_covers_loopback_link_local_unspecified() {
        use std::net::IpAddr;
        let parse = |s: &str| s.parse::<IpAddr>().unwrap();
        // 回环（IPv4 整段 /8，不限 127.0.0.1）
        assert!(blocked_ip(parse("127.0.0.1")));
        assert!(blocked_ip(parse("127.255.255.255")));
        assert!(blocked_ip(parse("::1")));
        // 链路本地（含云元数据 169.254.169.254；IPv6 fe80::/10）
        assert!(blocked_ip(parse("169.254.169.254")));
        assert!(blocked_ip(parse("169.254.1.5")));
        assert!(blocked_ip(parse("fe80::1")));
        // 未指定地址
        assert!(blocked_ip(parse("0.0.0.0")));
        assert!(blocked_ip(parse("::")));
        // IPv4 私网段（RFC1918）本轮并入默认封锁
        assert!(blocked_ip(parse("10.0.0.5")));
        assert!(blocked_ip(parse("172.16.3.4")));
        assert!(blocked_ip(parse("192.168.1.1")));
        // IPv6 唯一本地地址 fc00::/7 封锁
        assert!(blocked_ip(parse("fc00::1")));
        assert!(blocked_ip(parse("fd12:3456:7890::abcd")));
        // 公网不封锁
        assert!(!blocked_ip(parse("8.8.8.8")));
        assert!(!blocked_ip(parse("1.1.1.1")));
        // 其他公网 IPv6（非链路本地前缀）不封锁
        assert!(!blocked_ip(parse("2606:4700:4700::1111")));
    }

    #[test]
    fn blocks_private_network_segments() {
        let _guard = env_lock_guard(); // 断言「白名单为空」语义，需与 env 注入测试互斥
                                       // IPv4 私网段（RFC1918）并入默认封锁：同步侧 IP 直连路径
        assert!(ssrf_host_blocked("10.0.0.1"));
        assert!(ssrf_target_blocked("http://10.0.0.1:8080/api"));
        assert!(ssrf_host_blocked("172.16.0.1"));
        assert!(ssrf_host_blocked("172.31.255.254"));
        assert!(ssrf_target_blocked("http://172.20.4.9/"));
        assert!(ssrf_host_blocked("192.168.1.1"));
        assert!(ssrf_target_blocked("http://192.168.0.10:9000/"));
        // 私网段边界外不封锁
        assert!(!ssrf_host_blocked("11.0.0.1"));
        assert!(!ssrf_host_blocked("172.15.0.1"));
        assert!(!ssrf_host_blocked("172.32.0.1"));
        assert!(!ssrf_host_blocked("192.169.0.1"));
    }

    #[test]
    fn parse_allowed_hosts_domains_ips_cidrs() {
        let entries =
            parse_allowed_hosts("erp.corp.local, 10.0.0.5, 10.0.0.0/8, 172.16.0.0/12, fd00::/8, ,");
        // 精确域名（整串、大小写不敏感）
        assert!(host_whitelisted("erp.corp.local", &entries));
        assert!(host_whitelisted("ERP.CORP.LOCAL", &entries));
        assert!(!host_whitelisted("corp.local", &entries)); // 非整串子串不命中
        assert!(!host_whitelisted("evil.com", &entries));
        // 精确 IP / CIDR：10.0.0.5 同时被精确条目与 10.0.0.0/8 CIDR 命中；
        // 10.0.0.6 虽不是精确条目，但落在 CIDR 内
        assert!(host_whitelisted("10.0.0.5", &entries));
        assert!(host_whitelisted("10.0.0.6", &entries));
        // 纯精确 IP 条目不扩展到同段其他地址
        let exact_only = parse_allowed_hosts("10.0.0.5");
        assert!(host_whitelisted("10.0.0.5", &exact_only));
        assert!(!host_whitelisted("10.0.0.6", &exact_only));
        // IPv4 CIDR 命中与边界
        assert!(host_whitelisted("10.9.9.9", &entries));
        assert!(host_whitelisted("172.16.0.1", &entries));
        assert!(host_whitelisted("172.31.255.254", &entries));
        assert!(!host_whitelisted("172.15.0.1", &entries));
        assert!(!host_whitelisted("172.32.0.1", &entries));
        assert!(!host_whitelisted("8.8.8.8", &entries));
        // IPv6 CIDR
        assert!(host_whitelisted("fd00::1", &entries));
        assert!(!host_whitelisted("fc00::1", &entries)); // fd00::/8 不含 fc00::
                                                         // 解析后 IP 匹配（异步侧 DNS 校验路径）
        use std::net::IpAddr;
        let parse = |s: &str| s.parse::<IpAddr>().unwrap();
        assert!(ip_whitelisted(parse("10.20.30.40"), &entries));
        assert!(ip_whitelisted(parse("fd12::1"), &entries));
        assert!(!ip_whitelisted(parse("8.8.8.8"), &entries));
        assert!(!ip_whitelisted(parse("169.254.169.254"), &entries));
        // 非法单项跳过（端口项/空白项/超长前缀）
        let bad = parse_allowed_hosts("erp.local:8080, not a domain, 10.0.0.0/33, 2001:db8::/129");
        assert!(bad.is_empty());
    }

    /// env 注入集成测试：set_var/remove_var 为进程全局状态，用模块级互斥锁
    /// 与「默认封锁」断言测试串行化；结束后恢复原值。
    #[test]
    fn whitelist_env_allows_private_target() {
        let _guard = env_lock_guard();

        let original = std::env::var("EXTERNAL_ERP_ALLOWED_HOSTS").ok();
        std::env::set_var("EXTERNAL_ERP_ALLOWED_HOSTS", "erp.corp.local, 10.0.0.0/8");

        // 私网段目标原本封锁，白名单 CIDR 命中后放行
        assert!(!ssrf_target_blocked("http://10.0.5.6:8080/"));
        // 精确域名命中放行
        assert!(!ssrf_target_blocked("http://erp.corp.local/api"));
        // 白名单外的私网段仍封锁
        assert!(ssrf_target_blocked("http://192.168.1.1/"));

        match original {
            Some(v) => std::env::set_var("EXTERNAL_ERP_ALLOWED_HOSTS", v),
            None => std::env::remove_var("EXTERNAL_ERP_ALLOWED_HOSTS"),
        }
    }

    #[test]
    fn ssrf_host_blocked_uses_blocked_ip_for_direct_ips() {
        // IP 直连路径与 blocked_ip 判定一致；域名不做同步解析（交由异步 DNS 校验）
        assert!(ssrf_host_blocked("169.254.169.254"));
        assert!(ssrf_host_blocked("[fe80::dead:beef]"));
        assert!(!ssrf_host_blocked("example.internal.erp"));
        assert!(!ssrf_host_blocked("8.8.8.8"));
    }

    /// 钉 IP：IP 直连 host 无需钉（无二次解析），client 正常构建。
    #[tokio::test]
    async fn pinned_client_ip_direct_builds() {
        let client = build_pinned_client(
            "http://10.1.2.3:8080/api",
            std::time::Duration::from_secs(5),
        )
        .await;
        assert!(client.is_ok(), "IP 直连目标应正常构建 client");
    }

    /// 钉 IP：域名 host 在构建时被 resolve 钉到目标 IP——请求命中本地 server
    /// 而非依赖系统 DNS 的地址选择（macOS 下 localhost 系统解析可能优先 ::1，
    /// resolve 钉 127.0.0.1 后必走 IPv4 本地连接）。
    #[tokio::test]
    async fn pinned_client_connects_to_pinned_local_server() {
        // 双栈监听：lookup 对 localhost 可能返回 ::1 优先，resolve 钉任意回环均可达
        let listener = tokio::net::TcpListener::bind("[::]:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            loop {
                let Ok((mut sock, _)) = listener.accept().await else {
                    break;
                };
                let (mut r, mut w) = sock.split();
                let mut reader = tokio::io::BufReader::new(&mut r);
                let mut line = String::new();
                let _ = tokio::io::AsyncBufReadExt::read_line(&mut reader, &mut line).await;
                let resp = "HTTP/1.1 200 OK\r\ncontent-length: 0\r\nconnection: close\r\n\r\n";
                let _ = tokio::io::AsyncWriteExt::write_all(&mut w, resp.as_bytes()).await;
            }
        });

        let url = format!("http://localhost:{}/health", addr.port());
        let client = build_pinned_client(&url, std::time::Duration::from_secs(5))
            .await
            .unwrap();
        let resp = client.get(&url).send().await;
        server.abort();
        let resp = resp.expect("钉 IP 生效：应连接本地 server");
        assert_eq!(resp.status(), 200, "resolve 钉住后应命中本地 server");
    }

    /// 钉 IP：域名不可解析时保持默认行为返回 client（连接时才报错），不 panic。
    #[tokio::test]
    async fn pinned_client_unresolvable_domain_builds() {
        // .invalid 为保留 TLD，解析必然失败（或超时），此处仅验证构建不 panic
        let client = build_pinned_client(
            "http://definitely-not-real-9f3c2a.invalid/",
            std::time::Duration::from_secs(1),
        )
        .await;
        assert!(client.is_ok(), "解析失败应回退默认 client 而非报错");
    }
}
