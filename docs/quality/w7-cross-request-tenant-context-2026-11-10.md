# W7 · 跨请求生命周期租户上下文范式

- 日期：2026-11-10
- 状态：**设计定稿，待评审**（本文只定范式，未改任何代码）
- 上游：连接治理 B（`Db`/`ScopedTxn`）、B5 PDM 窗口（fail-closed 策略 + 非超户验证）
- 下游：LIMS 落地，随后 wms / scm / srm / ehs / mes 直接套
- 关联：
  - [scope.rs](../../lib/shared-db/src/scope.rs)（`Db::scope*`，已有能力）
  - [tenant.rs](../../lib/shared-auth/src/middleware/tenant.rs)（`tenant_middleware` / `current_request_tenant`）
  - [w7-rls-fail-closed-design-2026-11-09.md](w7-rls-fail-closed-design-2026-11-09.md)（策略形态）
  - [w7-b2-barepool-scope-inventory-2026-11-10.md](w7-b2-barepool-scope-inventory-2026-11-10.md)（裸池盘点）

---

## 0. 一句话结论

| 生命周期 | 租户来源 | 入口 | 允许的兜底 |
| --- | --- | --- | --- |
| HTTP 请求 | task-local（中间件写入） | `Db::scope` / `scope_read` / `scope_with` | **无**；缺上下文报 `Protocol` |
| 事件消费 | **仅 payload.tenant_id** | `require_event_tenant` → `Db::scope_for_tenant` | **无**；缺失/nil 报错 → 重试上限 → DLQ |
| 启动 / 指纹 | 无租户语义 | `Db::scope_system` / `scope_read_system` | 必须进第 6 节例外清单 |
| 定时 / 后台扫描 | 先枚举、逐租户 | `enumerate_tenants` → `Db::scope_for_tenant` | **枚举**走系统通道，**读写**不得走系统通道 |

唯一允许“看见全部租户”的动作是**枚举租户 ID 列表**。枚举结果只能用于开租户作用域，不得把系统通道的数据带回业务逻辑。

---

## 1. 现状与缺口（已核实的落点）

| 位置 | 现状 | 问题 |
| --- | --- | --- |
| [scope.rs](../../lib/shared-db/src/scope.rs) | `scope` / `scope_read`（task-local）、`scope_system` / `scope_read_system`（显式 nil + `app.rls_system='on'`）、`scope_for_tenant` / `scope_read_for_tenant`（nil 直接 `Protocol`） | 能力齐备，缺“租户从哪来”的统一取数层 |
| [tenant.rs](../../lib/shared-auth/src/middleware/tenant.rs) | 请求事务 + task-local `RequestTenant` | 无缺口 |
| `Event` 信封（[event_types.rs](../../lib/shared-event/src/event/event_types.rs#L215-L228)） | 只有 `event_id / event_type / source / payload / occurred_at / trace_id / saga_*`，**没有 tenant_id** | 租户只能进 payload |
| `QmsInspectionCompletedPayload`（[:500](../../lib/shared-event/src/event/event_types.rs#L500-L508)）、`EhsHazardReportedPayload`（[:533](../../lib/shared-event/src/event/event_types.rs#L533-L542)） | **无 tenant_id 字段**，生产端也不写 | LIMS 消费端只能猜（当前就是猜） |
| `svc/lims/src/event_handlers/mod.rs` | 直接用 `&state.pool`（裸池），写入时**硬编码全 0 UUID** 当 tenant_id | 事件写入进“假租户”，RLS 收紧后必然失败；且跨租户串写 |
| `svc/lims/src/main.rs` | 启动期用裸池读 `public.qa_lab_samples`，写全局缓存键 | 跨租户缓存串读；预热一次只能覆盖“全部”或“没有” |
| `svc/pdm/src/event_handlers/mod.rs`（[:80](../../svc/pdm/src/event_handlers/mod.rs#L80)） | 事件处理器用 `scope_read_system()` 读 `pdm_materials` / `pdm_configurations` | **已有债**：跨租户只读计数，违反本范式；PDM 窗口已收口，列为回补项，不在本轮改 |
| `*.schema_defense_ledger` | 24 个 schema 存在；无 `tenant_id` 列、RLS 关、0 策略 | 合法例外，见第 6 节 |

> 证据口径：prod `topems_prod` 只读查询（2026-11-10）。LIMS 共 45 张表、全部有 `tenant_id`；RLS 已开 45 张、FORCE 44 张（`qa_lims_analytes` 未 FORCE）；其中 12 张是 `USING (true)` 放行、33 张是旧 fail-open 谓词（含 `tenant_id IS NULL` 分支或列侧 cast）。

---

## 2. 三类边界：判据

### 2.1 事件驱动（事件消费者 / 消息处理器 / relay 重放）

必须同时满足：

1. 入口第一个业务动作是 `require_event_tenant(&event)?`，在 `parse_payload` **之前或同时**；
2. 所有读写都用 `Db::scope_for_tenant(t)` / `Db::scope_read_for_tenant(t)`；
3. 写库时 bound 的 `tenant_id` 就是 `t`，不得另算；
4. 幂等键必须含 `tenant_id`（见 4.1）。

**禁止的租户来源**（出现即视为缺陷）：

- 连接上的残留 GUC / 会话变量；
- task-local（事件循环没有请求上下文，就算碰巧有也是上一个请求的）；
- 全局静态、配置常量、`Uuid::nil()`、`Uuid::from_u128(1)` 之类的“默认租户”；
- `event.source` / `trace_id` / HTTP header / Redis key 反推；
- 从被引用实体（如 `product_id`）再查一次得到租户——这是二次猜测，不允许。

### 2.2 启动 / 指纹类（确实没有租户语义）

准入四条件（全满足才可进例外清单）：

1. 表里**没有** `tenant_id` 列，或该列从不参与任何业务读写；
2. 只在进程启动阶段/运维脚本中执行，不在请求或事件链路里；
3. 数据不回流给租户视图（不参与 join、不出现在 API 响应）；
4. 失败模式是“启动告警/降级”，不是“租户数据可见性变化”。

### 2.3 定时 / 后台扫描

- **枚举**：`enumerate_tenants` 内部只开 `scope_read_system()`，SQL 固定为
  `SELECT DISTINCT tenant_id ... WHERE tenant_id IS NOT NULL`；
- **执行**：每个租户单独 `Db::scope_for_tenant`，一个租户一个事务；
- **禁止**：一次全表扫描后在内存里 `group_by(tenant_id)` 再逐组写——那样读写都在系统通道，
  RLS 形同虚设，且单条语句会跨租户持有锁；
- **禁止**：用 `JOIN` 把多租户数据一次捞出来再在应用层切分。

---

## 3. API 形态

### 3.1 取租户 helper（新增 `lib/shared-event/src/event/tenant_context.rs`）

```rust
use serde_json::Value;
use uuid::Uuid;

use crate::event::{Event, EventType};
use topems_shared_core::error::TopemsError;

/// 事件链路中唯一合法的租户载体。只能由本模块构造。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EventTenant(Uuid);

impl EventTenant {
    pub fn get(self) -> Uuid { self.0 }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TenantContextCode {
    /// payload 里没有 tenant_id 字段
    Missing,
    /// 有字段但是 null / 空串 / 全 0 UUID
    Nil,
    /// 有值但不是合法 UUID
    Malformed,
}

#[derive(Debug, Clone)]
pub struct TenantContextError {
    pub code: TenantContextCode,
    pub event_id: Uuid,
    pub event_type: EventType,
    pub raw: Option<String>,
}

impl TenantContextError {
    /// 本类错误重试不会自愈（载荷是死数据）。
    pub fn is_permanent(&self) -> bool { true }

    /// 日志/告警固定标签：`[tenant_ctx:<missing|nil|malformed>]`
    pub fn log_tag(&self) -> &'static str {
        match self.code {
            TenantContextCode::Missing => "[tenant_ctx:missing]",
            TenantContextCode::Nil => "[tenant_ctx:nil]",
            TenantContextCode::Malformed => "[tenant_ctx:malformed]",
        }
    }
}

impl std::fmt::Display for TenantContextError { /* 固定格式，见 3.3 */ }
impl std::error::Error for TenantContextError {}

impl From<TenantContextError> for TopemsError {
    fn from(e: TenantContextError) -> Self {
        // 走既有 ValidationFailed，不新增错误变体（避免动全局 error 契约）
        TopemsError::ValidationFailed(format!("{} {}", e.log_tag(), e))
    }
}

/// 从 payload JSON 取租户。**不依赖具体 payload 结构体**，
/// 因此老事件类型不必为了接范式而改 serde 形状（但生产端必须写这个字段）。
pub fn require_event_tenant(event: &Event) -> Result<EventTenant, TenantContextError>;
```

`require_event_tenant` 的判定顺序（必须按此顺序，保证错误码稳定）：

| payload.tenant_id | 结果 |
| --- | --- |
| 字段不存在 | `Missing` |
| `null` / `""` | `Nil` |
| `"00000000-0000-0000-0000-000000000000"` 或全 0 | `Nil` |
| 合法 UUID 字符串 | `Ok` |
| 其他（数字、对象、非法串） | `Malformed` |

> 兼容：除字符串外只接受标准 `Uuid` serde 形式（字符串）。不接受数组/字节数组，避免隐式转换。

### 3.2 逐租户扫描 helper（新增 `lib/shared-db/src/tenant_sweep.rs`）

```rust
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
    pub fn is_ok(&self) -> bool { self.failed.is_empty() }
}

/// 只枚举，不开业务作用域。`sql` 必须是**静态字面量**（避免拼接注入），
/// 约定形如 `SELECT DISTINCT tenant_id FROM lims.qa_lab_samples WHERE tenant_id IS NOT NULL`。
pub async fn enumerate_tenants(db: &Db, sql: &'static str) -> sqlx::Result<Vec<Uuid>>;

/// 枚举 + 逐租户执行（推荐入口）。
/// - 枚举阶段：`scope_read_system()`；
/// - 执行阶段：回调内由调用方 `db.scope_for_tenant(t)`；
/// - 单租户 panic/Err 只记录，不中断其余租户。
pub async fn sweep_tenants<F, Fut>(
    db: &Db,
    sql: &'static str,
    mut f: F,
) -> sqlx::Result<TenantSweepReport>
where
    F: FnMut(Db, Uuid) -> Fut,
    Fut: Future<Output = sqlx::Result<()>>;
```

实现约束（写进代码注释，便于审阅）：

1. `enumerate_tenants` 结果去重、剔除 nil（剔除时 `tracing::warn!` 并计数，不静默）；
2. `sweep_tenants` 不接受“系统通道回调”参数，避免有人传入 `scope_system` 闭包；
3. 枚举 SQL 只读事务，`SET TRANSACTION READ ONLY`，避免枚举阶段被误写；
4. 单租户超时由调用方在闭包内控制（本轮不内置超时，避免和模块既有 timeout 打架）。

### 3.3 错误语义（与现有重试/DLQ 对齐）

`lib/shared-event/src/event/stream_subscriber.rs` 现行策略：处理器返回 `Err` 后重试，最多 3 次，仍失败进 DLQ。

| 错误码 | 语义 | 处理 |
| --- | --- | --- |
| `missing` | 生产端没写 `tenant_id` | 报错 → 3 次重试 → DLQ；日志 `[tenant_ctx:missing]` |
| `nil` | 生产端写了空/全 0 | 同上 |
| `malformed` | 值坏了 | 同上 |

- **为什么不在第 1 次就丢**：立即 DLQ 需要在 `settle_failed` 里识别“永久错误”，要动重试引擎。
  本轮不改引擎，代价是每条坏消息多 2 次重试（有界、可观测）。
- **告警口径**：凡出现 `[tenant_ctx:` 前缀，一律按“生产端契约缺陷”告警，不允许当成脏数据静默清掉。
- **重放**：DLQ 重放仍走同一 helper；修好生产端后原消息可直接重放成功（见 4.1）。

---

## 4. 三个必答问题

### 4.1 消息重放时租户是否稳定

稳定，前提是**租户进 payload 且 payload 不被改写**：

- 事件 `event_id` 与 `payload.tenant_id` 都是不可变载荷；DLQ 重放读的是同一份 JSON，取到的租户相同；
- 幂等键必须含租户：`UNIQUE (tenant_id, source_type, source_id)` 或等价组合。
  只按 `source_id` 唯一会在跨租户重放时冲突；
- 禁止“第一次成功时用了 A 租户，重放时因为 `current_request_tenant()` 恰好是 B 而写到 B”。
  这正是本范式要堵的：事件链路根本不读 task-local。

### 4.2 租户已删除怎么办

分三种，不猜：

| 情形 | 行为 |
| --- | --- |
| payload 带的是一个曾经合法、现已删租的 UUID | 正常开作用域；RLS 下读写 0 行（fail-closed），随后**主动**检查“0 行”并记 `warn!(tenant_deleted?)`，返回 `Ok`（幂等，不重试） |
| 写入触发外键（`core_tenants` 已删） | 视为**永久错误** → DLQ + 告警；不重试、不降级到系统通道 |
| 租户删除后又有残留子表数据 | 由租户删除流程（级联/归档）负责；事件侧不做“补偿性跨租户扫描” |

关键：**不要**为了判断“租户在不在”去 `scope_read_system()` 查 `core_tenants`——那会把系统通道带进事件链路。用业务结果（0 行 / FK 违例）表达状态。

### 4.3 遍历期间新租户出现怎么办

- `enumerate_tenants` 取的是**一次快照**（单条只读语句），不持有游标；
- 遍历期间新建的租户**本轮不处理**，下一轮自然纳入；不允许为了“不漏”改成边扫边加；
- 因为每个租户独立事务，新租户的行不会被“上一租户的过滤条件”漏掉或串到下一租户；
- 若必须准实时，缩短轮询周期，不要放宽作用域。

---

## 5. 改法示例（真实代码）

### 5.1 事件处理器：LIMS 现状 → 范式形态

现状（`svc/lims/src/event_handlers/mod.rs`，节选）：

```rust
// 现状：裸池 + 硬编码假租户
sqlx::query(
    r#"INSERT INTO lims.qa_lims_samples (tenant_id, sample_no, ...)
       VALUES ('00000000-0000-0000-0000-000000000000', $1, ...)"#,
)
.execute(&self.pool)
.await?;
```

改后：

```rust
use topems_shared_event::event::tenant_context::require_event_tenant;

async fn handle_inspection_completed(&self, event: Event) -> HandlerResult {
    // 1) 先取租户，失败即止；不 parse 任何业务字段
    let tenant = require_event_tenant(&event)?;

    // 2) 解析载荷（契约已保证带 tenant_id）
    let payload: QmsInspectionCompletedPayload = event.parse_payload()?;

    // 3) 只在租户作用域内读写
    let mut scope = self.db.scope_for_tenant(tenant.get()).await?;
    sqlx::query(
        r#"INSERT INTO lims.qa_lims_samples (tenant_id, sample_no, ...)
           VALUES ($1, $2, ...)"#,
    )
    .bind(tenant.get())
    .bind(&payload.inspection_no)
    .execute(&mut scope)
    .await?;
    scope.commit().await?;
    Ok(())
}
```

配套生产端（必须同批改，否则事件全部进 DLQ）：

```rust
// svc/qms/src/modules/quality_inspection.rs
let payload = QmsInspectionCompletedPayload {
    tenant_id,                       // 新增字段，复用本函数已有的 tenant_id
    inspection_id: eid_uuid,
    // ...
};

// svc/ehs/src/modules/hazard.rs
let payload = EhsHazardReportedPayload {
    tenant_id,                       // 新增字段
    hazard_id: hid,
    // ...
};
```

> 这两个 payload 结构体加字段时用 `pub tenant_id: Uuid`（必填，不加 `Option`）。
> 反序列化老消息（无该字段）会直接失败 → 正好落入 `tenant_ctx:missing` 的失败语义，符合预期。

### 5.2 定时/启动扫描：LIMS 缓存预热

现状（`svc/lims/src/main.rs`）：裸池读 `public.qa_lab_samples` 全量 → 写全局键 `lims:sample:list:warmup`。

改后：

```rust
use topems_shared_db::tenant_sweep::sweep_tenants;

let report = sweep_tenants(
    &db,
    "SELECT DISTINCT tenant_id FROM lims.qa_lab_samples WHERE tenant_id IS NOT NULL",
    |db, tenant| async move {
        let mut scope = db.scope_read_for_tenant(tenant).await?;
        let rows = sqlx::query("SELECT id, sample_no FROM qa_lab_samples ORDER BY created_at DESC LIMIT 200")
            .fetch_all(&mut scope)
            .await?;
        cache.set(&format!("lims:sample:list:{tenant}"), &rows, ttl).await;
        scope.commit().await
    },
)
.await?;

if !report.is_ok() {
    tracing::warn!("[lims] 缓存预热部分失败: {} 个租户", report.failed.len());
}
```

### 5.3 启动 DDL 自愈：保持系统通道，但登记例外

`svc/lims/src/models/schema_defense.rs` 只做 `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN`，
没有租户行、不参与业务查询 → 继续用启动期裸池/owner，**不改成 `scope_for_tenant`**。
要求：代码首行加登记注释，并与第 6 节清单一一对应。

```rust
// tenant-system: 启动期 DDL 自愈，无 tenant 语义；见
// docs/quality/w7-cross-request-tenant-context-2026-11-10.md 例外清单 #3
```

---

## 6. 例外清单（逐条登记，未登记不得使用 `scope_system`）

| # | 对象 | 代码位置 | 为什么没有租户语义 | 边界（允许做什么 / 禁止做什么） | 失败模式 |
| --- | --- | --- | --- | --- | --- |
| 1 | `*.schema_defense_ledger`（24 个 schema：ai/bi/communication/crm/ehs/erp/finance/flow/gis/hrm/integration/master_data/mes/mobile/pdm/pm/public/qms/rs/scm/srm/ticket/tms/wms） | `lib/shared-db/src/schema.rs` `ensure_ledger_table` / `upsert_ledger` | 主键是 `service_schema`，表结构里**没有** `tenant_id`；记录的是“本服务 DDL 指纹” | 只允许启动期 upsert / 查询指纹；禁止 join 业务表、禁止出现在 API 响应 | 失败仅 warn，退化为全量 ensure，不阻塞启动 |
| 2 | `public._sqlx_migrations` | sqlx 内建 | 迁移账本，全局唯一 | 只允许迁移执行器读写 | 失败即迁移失败（不降级） |
| 3 | LIMS 启动期 DDL 自愈 | `svc/lims/src/models/schema_defense.rs` | 只有 DDL/列补齐，无数据行 | 只允许进程启动阶段；禁止在请求/事件链路复用该通道 | 失败仅 warn（与 PDM 一致） |
| 4 | 健康探针 | `lib/shared-db/src/scope.rs` `check_health` | 只执行 `SELECT 1`，不碰业务表 | 只允许常量 SQL；禁止扩写成业务查询 | 探针失败即 `degraded` |
| 5 | 事件发布重试 relay（Redis ZSET） | `svc/*/src/main.rs` `commit_retry::run_relay` | 只读写 Redis，不访问 DB | 只允许重发已序列化的 payload | 失败继续留在 ZSET |
| 6 | 事件 schema/契约校验 | `lib/shared-event` | 纯内存/序列化 | 不访问 DB | 无 |

准入复查：每个模块做 RLS 时，**先审这张表**；新增例外必须在本文件追加一行并写理由，PR 里引用行号。

---

## 7. 门禁（防止范式退化）

| 层 | 规则 | 形态 |
| --- | --- | --- |
| 代码 | `svc/*/src/event_handlers/**` 不得出现 `scope_system(` / `scope_read_system(`，除非同一行有 `// tenant-system: <理由>` | `scripts/ci/check-tenant-context.cjs`（随 LIMS 改造落地） |
| 代码 | `svc/*/src/modules/**` 不得出现 `PgPool` 提取器 / `&state.pool` / `.pool.` | 同上门禁；白名单按模块逐步清零 |
| SQL | `SET LOCAL app.rls_system = 'on'` 只允许出现在启动/运维脚本 | `grep` 门禁 |
| 验证 | 所有 `w7_*_verify.sql` 开头硬拦 `rolsuper` / `rolbypassrls` | 第三件任务，逐脚本补 |
| 运维 | 窗口备份用超管；验收/验证一律非超户 | 写入窗口公共前置 |

门禁本身不放行任何例外：白名单只认注释 `// tenant-system:` 且必须能在第 6 节找到对应条目。

---

## 8. 迁移到其他模块的检查清单（wms/scm/srm/ehs/mes）

1. `Event` 相关的 payload 是否都带 `tenant_id`？生产端是否写入？
2. `event_handlers/**` 是否清零 `scope_read_system` / 裸池？
3. `main.rs` 里所有 `tokio::spawn` + `interval` 是否改成 `sweep_tenants`？
4. 缓存键是否统一 `<module>:<entity>:<tenant_id>:...`？
5. 是否存在 `Uuid::nil()` / 全 0 UUID / `000...001` 作为默认租户？
6. `schema_defense_ledger` 之外，是否有新表也被当成“无租户”？
7. 验证脚本是否有非超户硬拦？
8. 例外清单是否需要新增行？

---

## 9. 本轮落地边界

**本轮（LIMS）要做**：第 3.1 / 3.2 helper 实现、LIMS 事件处理器改造、缓存预热改造、裸池清零、迁移与验证。

**本轮不做**：

- PDM 事件处理器的 `scope_read_system` 回补（已记债，单独排期）；
- 其他模块（wms/scm/srm/ehs/mes）的改造；
- 事件重试引擎的“永久错误快速 DLQ”（只记录在 3.3）；
- 给 `Event` 信封加 `tenant_id`（保持只有 payload 一处来源，避免双来源歧义）。

---

## 10. by-id 读的租户回退语义（显式前提，2026-11-11）

**前提（用户批准的语义）**：服务身份在请求**未携带租户上下文**时，调用 by-id 读接口
（`GET /employees/{id}`、`GET /employees/{id}/details`、`GET /warehouses/{id}`）会先从
目标资源行解析 `tenant_id`，再以该租户构造服务层查询。其等价效果是：
**调用方只要知道资源 id，就能读取该 id 所属租户的那一行**，不需要显式声明租户。

这不是隐含行为，必须显式记录并留痕：

- 适用范围仅 by-id 读；列表/导出/所有写路径一律 `require_tenant` → 400，禁止回退。
- 回退只在严格解析失败（claims 与 `x-tenant-id` 均缺失）时触发；普通用户与超管不会走到该分支。
- 每次回退写一条 `tracing::info!`，字段固定为
  `event="tenant_by_id_fallback"`、`resource`、`resource_id`、`tenant_id`，便于审计检索。
- 若后续要收紧为"服务身份也必须显式声明租户"，只需移除回退分支并把错误改为 400，
  上述审计事件可直接用于评估影响面（按 resource 统计调用量）。
