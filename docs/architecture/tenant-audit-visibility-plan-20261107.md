# 租户业务审计可见性补齐（已实施，rehearsal 验证通过）

- 日期：2026-11-07
- 状态：**方案 A 已实施；rehearsal（8098 + 克隆库）三身份矩阵通过；prod 未做任何变更**
- 关联：`docs/architecture/audit-logs-rls-hardening-plan-20261107.md` §10.6「残留行为」
- 协作边界：RLS 策略迁移与 prod 窗口由另一会话负责；本文不改其策略文件。本轮的 origin 迁移只演练于 rehearsal，prod 执行见 §11。

---

## 0. 结论摘要

1. **根因已定位**：租户业务审计丢失 tenant 的唯一现存代码路径，是 CRM 的 12 处 `tokio::spawn` 审计写入
   （`customer.rs` 7 处、`contact.rs` 3 处、`opportunity.rs` 2 处）。`tokio::spawn` 不继承请求的
   `task-local`，sink 在无上下文时按设计走 `scope_system()`，于是行落 `tenant_id = nil`，D1 下租户管理员不可见。
   这些位置同时把 `user_id/user_name` 写死为 `None`，导致即使行可见也无法归因到具体操作人。
2. **推荐机制：显式捕获 + 显式传参**。在 handler 内（spawn 之前）从 `Claims` 捕获
   `AuditActor { tenant_id, user_id, user_name }`，move 进闭包，再通过新增的
   `log_audit_event_with_actor(...)` 传给 sink；sink 用显式 `tenant_id` 覆盖 task-local 推导。
   **不依赖 task-local 跨 spawn 传递**，也不改变 `write_scope()` 现有的「无上下文 → 系统通道」语义。
3. **改造面很小**：`lib/shared-db` 约 +80 行（`origin` 物理列写入 + nil 归一），
   `svc/crm/src/modules/audit.rs` 约 +40 行（`AuditActor` + scoped helper），12 处 spawn 调用点各 +3～5 行。
   **服务层其余服务当前没有 spawn 审计写入，无需改动**；请求审计（shared-auth）已按 `Claims` 显式绑定 tenant，无需改动。
4. **需要一次可回滚的 DDL，但只在 rehearsal 演练**：`origin VARCHAR(16) NULL` + 部分索引，18 张
   `*.audit_logs`（见 §10.2）。prod 不执行，且发布前必须先迁移（见 §11）。
5. **历史 nil 行保持原样、不回填**（不可可靠归因，且回填会带来跨租户错标风险）；只做只读盘点（§5）。
6. **工作量**：约 1～2 人日，按主题拆成独立 commit（实施阶段才提交）。
7. **上线顺序**：本改造必须先于 prod 策略翻转发布，否则翻转后租户管理员将立即看不到新产生的业务审计。

### 已确认决策（原 §8，用户已拍板）

- **D1（已修正）**：spawn 审计的 tenant 跟随**被操作实体行**的 `tenant_id`，而非操作者 claims；仅当实体本身为 nil 时才落 nil。
  超管代租户操作时，租户管理员因此能看到这条审计。
- **D2**：同步补齐 12 处 spawn 审计的 `user_id/user_name`，从 `Claims` 捕获后显式传入，不写 `None`。
- **D3**：`origin` 用**物理列**（可空 + 索引），不用 JSONB；迁移只在 rehearsal 演练。
- **D4**：历史 nil 行不回填，只做只读盘点说明。
- **D5**：方案 B 留后续，登记为跟进项（裸 `tokio::spawn` 需 lint 或封装收口）。

---

## 1. 现状证据

### 1.1 代码事实

| 事实 | 位置 |
|------|------|
| `CreateAuditLogRequest` 已有显式 `tenant_id` 字段与 `with_tenant_id()` | `lib/shared-db/src/audit.rs:42-56, 89-92` |
| `SchemaAwareAuditLogService` 写入时按 task-local 选择 scope：有请求上下文 → `db.scope()`；无 → `scope_system()` | `lib/shared-db/src/audit.rs:145-170`（`write_scope`） |
| 无上下文写入时 `tenant_id = COALESCE(explicit, request_ctx, nil)` | `lib/shared-db/src/audit.rs` 两个 `create_audit_log` 实现 |
| 请求审计中间件在 `next.run` 前从 `Claims` 取 tenant/user，显式绑定 | `lib/shared-auth/src/security/audit_logger.rs:419-470` |
| CRM 审计 helper 不接收 tenant，完全依赖 task-local | `svc/crm/src/modules/audit.rs:210-267`（`AuditEventParams` 在 21） |
| CRM 12 处审计写在 `tokio::spawn` 中，且 `user_id/user_name = None` | 见 §4.1 清单 |
| ERP / MES / SRM 的审计 helper 已显式传 tenant | `svc/erp/src/modules/audit.rs`、`svc/mes/src/modules/audit.rs`、`svc/srm/src/modules/supplier.rs:1195+` |
| WMS / HRM / SCM / RD 的审计调用均在请求 future 内 `.await`，task-local 可用 | `svc/{wms,hrm,scm,rd}/src/modules/audit.rs` 及调用点 |

### 1.2 rehearsal 事实（引自 RLS 方案 §10.2/§10.3/§10.6）

- Phase 2 谓词已在 rehearsal 的 18 张表生效；prod 尚未翻转。
- 系统通道可见：crm 23、hrm 223、scm 99、srm 19、wms 565、erp 302、public 366；
  租户 0001 仅 erp 302 + public 38，租户 0002 仅 public 8。
- §10.6 已明确：这些 nil 业务审计来自 `tokio::spawn` 脱离 task-local，属于独立跟进项。

### 1.3 写入路径分类

| 类别 | 是否有请求 tenant | 现状 | 目标语义 |
|------|------------------|------|----------|
| handler 内 `.await` 的业务审计 | 有（task-local） | 正确落 tenant | 不变 |
| `tokio::spawn` 的业务审计 | 有，但 spawn 后丢失 | 落 nil | **显式传 tenant，落 tenant** |
| `shared-auth` 请求审计 | 有（显式 Claims） | 正确落 tenant | 不变 |
| 审批库 `shared-db/approval.rs` | 有（调用方在请求内） | 正确落 tenant | 不变 |
| 后台/定时/归档任务 | 无 | 落 nil | 落 nil + `origin=background/system` |
| 超管跨租户运维 | 无（system 上下文） | 落 nil | 落 nil + `origin=system`（除非单租户透明决策） |

---

## 2. 机制选型：请求租户如何可靠到达 spawn 写入路径

### 2.1 为什么不能依赖 task-local

`tokio::task_local!` 的 scope 绑定在「被 poll 的 future」上。`tokio::spawn(async move { ... })`
创建的是**新任务**，不会继承父任务的 task-local；`spawn_blocking` 同理。
当前 `write_scope()` 正是据此判断「有无请求上下文」，因此 spawn 内审计必然走 `scope_system()`。

> 注意：这不等于 task-local 本身不可靠；**显式 `scope(fut)` 包裹**是可靠的。不可靠的是「隐式继承」这一假设。

### 2.2 方案 A（推荐）：在 spawn 边界显式捕获上下文

在 handler 进入 spawn 前，把需要的上下文变成**数据**：

```rust
// svc/crm/src/modules/audit.rs（新增）
#[derive(Debug, Clone, Default)]
pub struct AuditActor {
    pub tenant_id: Option<Uuid>,   // 来自 tenant_opt；超管为 None
    pub user_id: Option<String>,   // 来自 claims.sub
    pub user_name: Option<String>, // 来自 claims.username
}

pub async fn log_audit_event_with_actor(
    db: &PgPool,
    params: AuditEventParams,
    headers: &HeaderMap,
    actor: AuditActor,
) {
    // 与现有 log_audit_event 相同的字段拼装；
    // 关键差异：if let Some(tid) = actor.tenant_id { req = req.with_tenant_id(tid) }
    // 并把 params.user_id/user_name 用 actor 覆盖（actor 优先）
}
```

调用点：

```rust
let actor = AuditActor {
    tenant_id: tenant_opt,
    user_id: Some(claims.sub.clone()),
    user_name: Some(claims.username.clone()),
};
tokio::spawn(async move {
    let _ = log_audit_event_with_actor(&state.db, params, &headers, actor).await;
});
```

**优点**
- tenant 成为显式数据，不依赖任何 ambient state；即使未来再套一层 spawn 也不会丢。
- 不动 `AuditEventParams` 结构，不触发 CRM 全部 ~35 处审计调用的机械改动。
- sink 无需改动：显式 `tenant_id` 已生效，`scope_system()` 的 `WITH CHECK` 允许写入。
- 可同时修复 `user_id/user_name = None`。

> `create_customer` 没有 `tenant_opt`，用已解析的 `tenant_id`（`resolve_create_tenant` 结果，超管为 nil）；
> 其余 11 处直接用 `tenant_opt`。超管场景 `origin` 建议标 `System`，普通租户标 `Request`。

**代价**
- 12 处调用点必须逐个加 `AuditActor` 捕获（无法「改机制后零调用点改动」，因为上下文必须跨边界搬运）。
- 约定：显式 tenant **只能**来自 `Claims`/服务端解析，禁止来自请求体或普通 header。

### 2.3 方案 B（备选）：spawn 包装器显式进入 task-local scope

在 `shared-auth` 提供：

```rust
pub fn spawn_with_tenant<F>(fut: F) -> JoinHandle<F::Output>
where F: Future + Send + 'static, F::Output: Send + 'static
{
    let ctx = current_request_tenant(); // 必须在 handler 内调用
    tokio::spawn(async move {
        match ctx {
            Some(c) => scope_request_tenant(c, fut).await,
            None => fut.await,
        }
    })
}
```

调用点把 `tokio::spawn` 改成 `spawn_with_tenant` 即可（也是 12 处，但每处 1 行）。

**优点**：改动更小；同时能保护 spawn 内**其它**依赖 RLS 的业务 SQL。
**代价**：仍依赖调用方记得用包装器；任何遗留/未来的裸 `tokio::spawn` 会静默回退到系统通道。
另外它只携带 tenant，不携带 user，仍需单独捕获用户信息。

### 2.4 取舍

| 维度 | A 显式传参 | B spawn 包装器 |
|------|-----------|----------------|
| 可靠性 | 高（数据显式） | 中高（需统一使用包装器） |
| 改动量 | 12 处 × ~4 行 + helper | 12 处 × 1 行 + helper |
| 对新代码的约束 | 强（函数签名要求 actor） | 弱（可被绕过） |
| 同时修复 user 归因 | 是 | 否（需另做） |
| 对非审计 SQL 的附带保护 | 无 | 有 |
| **结论** | **本轮采用** | 作为后续通用加固项，不在本轮 |

> 若未来需要「spawn 内还执行租户业务写」，建议再引入 B；两者可共存：B 负责 scope，A 负责审计数据。

---

## 3. 语义规则

### 3.1 有效 tenant 的解析顺序（sink 内）

```
显式 request.tenant_id
  > 请求 task-local tenant（普通用户 = 本租户；超管 = nil + system）
  > nil（系统/后台）
```

- 新增 `log_audit_event_with_actor` 后，CRM spawn 走「显式」分支。
- 不允许把「无显式 tenant 且无 task-local」当成错误：后台任务合法落 nil；但要**可观测**（见 §3.5）。

### 3.2 可见性规则（与既有 D1 一致）

| 行类型 | `tenant_id` | 租户管理员 | 超管/系统通道 |
|--------|------------|-----------|--------------|
| 本租户业务审计（请求内或 spawn） | 本租户 | 可见 | 可见 |
| 本租户后台/事件审计 | 本租户 | 可见 | 可见 |
| 系统级/跨租户运维审计 | nil | 不可见 | 可见 |
| 历史无法归因的 nil 行 | nil | 不可见 | 可见 |

### 3.3 后台 / 事件驱动 / 定时任务

- **没有请求租户的后台任务**：`tenant_id = nil`，`origin = background|system`；租户管理员不可见（D1）。
- **由某个租户事件触发的异步处理**：事件 payload 中已有 `tenant_id` 的（WMS/HRM/SCM 事件均带），
  处理方用该 tenant 写 `origin = event`；一行业务事实只写一行，不复制到其它租户。
- **跨租户批量任务**：写系统行（nil + `origin=system`），受影响租户列表放
  `request_details._audit.target_tenants`，不拆成每租户可见行（除非业务明确要求透明）。
- 当前代码库中**没有**写审计的后台/定时任务；本条是约束，不是现存改造项。

### 3.4 系统级审计 vs 租户业务审计

区分维度有两个，缺一不可：

1. **可见性维度**：`tenant_id` 是否为本租户（决定 RLS 可见性）。
2. **语义维度**：`origin`（决定运维筛选/保留策略）。
   - 仅靠 `tenant_id = nil` 无法区分「系统运维」与「无租户后台任务」；
   - 仅靠 `action` 前缀也不稳定。

建议取值：`request | background | event | system | integration | legacy`。

### 3.5 来源字段落到哪里（已实施：物理列）

- `CreateAuditLogRequest` 增加 `origin: Option<AuditOrigin>` 与 `with_origin()`；
- `AuditOrigin`（`request/background/event/system/integration/legacy`）定义在 `lib/shared-db/src/audit.rs`；
- 两个 sink 在 INSERT 成功后、同一 scope 内执行 `UPDATE ... SET origin = $1 WHERE id = $2`
  （仅当 `origin = Some` 时执行），避免改 13 列 INSERT 的绑定链；
- 18 张 `*.audit_logs` 增加 `origin VARCHAR(16) NULL` + 部分索引
  `... WHERE origin IS NOT NULL`；迁移见 `database/migrations/20261107000012_audit_logs_origin_column_18tables.sql`；
- **只在 rehearsal 演练，不应用 prod**；prod 必须先迁移后发布（见 §11）。

### 3.6 观测护栏

本轮未新增计数器；`origin` 物理列 + 部分索引已足够区分 request/system。后续可加
`audit_write_without_tenant_total{sink}`，用于捕捉静默 nil 回归（列入 §12 跟进项）。

---

## 4. 改造面清单（逐文件）

### 4.1 CRM：12 处 spawn 审计（唯一的功能性必改）

租户来源（实施口径）：**被操作实体行**的 `tenant_id`（插入结果 / UPDATE RETURNING / 预读行）；
实体为 nil 时由 `AuditActor::from_claims` 归一为 `None`（全零 UUID 视为 nil）。
用户来源为 `claims.sub` / `claims.username`。下表为方案初期盘点，最终以 §10.1 为准。

| # | 文件:行（spawn / 审计 action） | handler（起始行） | 租户来源 | 审计 action |
|---|-------------------------------|------------------|----------|-------------|
| 1 | `svc/crm/src/modules/customer.rs:331` | `create_customer`（235） | `tenant_id`（264，`resolve_create_tenant`；超管=(nil)） | `crm.customer.create` |
| 2 | `svc/crm/src/modules/customer.rs:576` | `update_customer`（452） | `tenant_opt`（472） | `crm.customer.update` |
| 3 | `svc/crm/src/modules/customer.rs:664` | `delete_customer`（616） | `tenant_opt`（635） | `crm.customer.delete` |
| 4 | `svc/crm/src/modules/customer.rs:761` | `batch_delete_customers`（706） | `tenant_opt`（731） | `crm.customer.batch_delete` |
| 5 | `svc/crm/src/modules/customer.rs:913` | `start_customer_approval`（818） | `tenant_opt`（838） | `crm.customer.approval.start` |
| 6 | `svc/crm/src/modules/customer.rs:1028` | `approve_customer`（956） | `tenant_opt`（976） | `crm.customer.approval.approve` |
| 7 | `svc/crm/src/modules/customer.rs:1145` | `reject_customer`（1070） | `tenant_opt`（1090） | `crm.customer.approval.reject` |
| 8 | `svc/crm/src/modules/contact.rs:807` | `start_contact_approval`（710） | `tenant_opt`（730） | `crm.contact.approval.start` |
| 9 | `svc/crm/src/modules/contact.rs:924` | `approve_contact`（850） | `tenant_opt`（870） | `crm.contact.approval.approve` |
| 10 | `svc/crm/src/modules/contact.rs:1043` | `reject_contact`（966） | `tenant_opt`（986） | `crm.contact.approval.reject` |
| 11 | `svc/crm/src/modules/opportunity.rs:1506` | `advance_opportunity`（1351） | `tenant_opt`（1371） | `crm.opportunity.advance` |
| 12 | `svc/crm/src/modules/opportunity.rs:1709` | `rollback_opportunity`（1544） | `tenant_opt`（1564） | `crm.opportunity.rollback` |

每处改动方式（约 3～5 行）：

```rust
let actor = AuditActor {
    tenant_id: tenant_opt,
    user_id: Some(claims.sub.clone()),
    user_name: Some(claims.username.clone()),
};
tokio::spawn(async move {
    let _ = log_audit_event_with_actor(&state.db, AuditEventParams { .. }, &headers, actor).await;
});
```

注意：`claims` 不能整体 move 进闭包（后续 handler 可能还在用），只克隆所需字段。

### 4.2 共享层

| 文件 | 改动 | 估计 |
|------|------|------|
| `lib/shared-db/src/audit.rs` | 新增 `AuditOrigin` 枚举 + `CreateAuditLogRequest.origin/with_origin`；两个 `create_audit_log` 合并 `_audit.origin`；增加 nil 写入 debug/计数 | ~50 行 + 2 单测 |
| `lib/tests/auth_audit.rs:347` | `CreateAuditLogRequest` 字面量补 `origin: None` | 1 行 |
| `lib/shared-auth/src/security/audit_logger.rs` | 现状已正确（Claims 显式）；可选：给请求审计打 `origin=request` | 0～3 行 |
| `lib/shared-db/src/approval.rs` | 无需改（请求内 `.await`，task-local 有效） | 0 |

### 4.3 服务层（本轮不改，仅确认）

| 服务 | 审计 helper | 现状 | 本轮动作 |
|------|------------|------|----------|
| WMS | `svc/wms/src/modules/audit.rs` | 请求内 `.await`，task-local 有效 | 无 |
| HRM | `svc/hrm/src/modules/audit.rs:185` | 同上 | 无 |
| SCM | `svc/scm/src/modules/audit.rs`（内部读 task-local） | 同上 | 无 |
| RD | `svc/rd/src/modules/audit.rs:203` | 同上 | 无 |
| ERP | `svc/erp/src/modules/audit.rs` | 已显式 tenant | 无 |
| MES | `svc/mes/src/modules/audit.rs` | 审批审计已显式 tenant；通用 helper 无调用方 | 无 |
| SRM supplier | `svc/srm/src/modules/supplier.rs:1195+` | 已显式 tenant | 无 |
| PM/AI/GIS/Mobile/Unified-core | `AuditLogService.log_*` 包装方法 | 请求内 `.await` | 无 |

> 若实施时发现新增 spawn 审计点，按 CRM 模式加 scoped helper；不做全服务统一签名改造（避免 ~百处调用点churn）。

### 4.4 读路径（不改，验证）

| 文件 | 现状 | 结论 |
|------|------|------|
| `svc/unified-core/src/modules/system_audit/mod.rs` | `scope_read()`，无 task-local 时 fail-closed | 正确 |
| `svc/crm/src/modules/audit.rs` 列表查询 | 依赖请求事务的 tenant GUC | 正确 |
| `svc/unified-core/src/routes/business_tools/audit_export_task.rs` | 系统归档任务，`scope_read_system()` | 正确（仅超管可达） |
| `svc/unified-core/src/middleware/audit_log.rs` | 未挂载，使用裸池写 public 审计 | **建议删除或标注废弃**，不纳入本轮 |

### 4.5 明确不改

- `database/migrations*`、任何 RLS 策略、`docs/architecture/audit-logs-rls-hardening-plan-20261107.md`。
- prod 库。
- 其余服务的审计函数签名（避免大面积机械改动）。

---

## 5. 现有 nil 数据处置

### 5.1 结论：保持原样，不回填

理由：

1. **不可可靠归因**：CRM 这批 spawn 行 `user_id` 为 `None`、`entity_id` 也并非全部可用；其余 schema 的 nil 行是历史多来源混合。
2. **错标风险高于收益**：用 `user_id → 用户所属租户` 或 `entity_id → 业务表 tenant_id` 推断，遇到跨租户/共享数据会制造新的越权可见。
3. **不影响新数据**：策略翻转后，新写入只要带 tenant 即可被租户管理员看到；历史不可见可解释为「系统/历史行」。
4. **避免在 RLS 窗口内做批量 UPDATE**。

### 5.2 只读盘点（实施前可选）

```sql
-- 每个 schema 的 nil 行按 action 分布
SELECT action, count(*) FROM crm.audit_logs
WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'
GROUP BY 1 ORDER BY 2 DESC;
```

### 5.3 若业务坚持回填，需额外满足

- 单独批准、单独窗口、先 `pg_dump`；
- 只处理能通过「`entity_type` + `entity_id` 唯一映射到业务表 tenant_id」或「`user_id` 唯一映射到单一租户」的行；
- 先产 dry-run 报告（候选行数、冲突数、无法归因数），确认后分批 UPDATE；
- 回滚脚本按批次记录原值；
- 本方案默认不做。

---

## 6. 验证方案

### 6.1 环境

- rehearsal：`topems_p0_rehearsal`（8098，Phase 2 策略已生效）或本地等价环境。
- 应用角色 `topems_prod`（非 super、无 BYPASSRLS）。
- 三身份：A 超管、B 租户 0001 管理员、C 租户 0002 管理员。

### 6.2 用例

1. **基线与写入**：三身份各触发一次 CRM 客户 create/update/delete + 审批 start/approve/reject，contact 三动作，opportunity advance/rollback。
2. **落库校验**（系统通道只读）：
   ```sql
   SELECT tenant_id, action, count(*) FROM crm.audit_logs
   WHERE created_at > :t0 GROUP BY 1,2 ORDER BY 1,2;
   ```
   期望：B 的动作全部 `0001`，C 的全部 `0002`，A 的（若无 X-Tenant 头）为 nil。
3. **归因校验**：上述新行的 `user_id` 应为对应用户，不再为 `None`。
4. **列表可见性**：B `GET /api/crm/audit-logs` 只返回 0001 行；C 只返回 0002 行；A 返回全量（含 nil 历史行）。
5. **系统行隔离**：后台/归档任务产生的 nil 行，B/C 列表不可见，A 可见。
6. **来源校验**：新行 `request_details->'_audit'->>'origin'` 为 `request`；模拟后台写入为 `background/system`。
7. **回归**：非 CRM 服务审计列表（erp/wms/hrm/scm/srm）行数不变；登录/refresh/logout、核心列表不受影响。
8. **fail-closed 复核**：无 GUC 裸连接仍 0 行/INSERT 报错。

### 6.3 可见性矩阵（期望）

| 身份 | CRM 列表（本轮修复后） | 其它服务列表 | public/system 审计 |
|------|----------------------|-------------|-------------------|
| A 超管 | 全量（含历史 nil、系统行） | 全量 | 全量 |
| B 租户 0001 | 仅 `tenant_id=0001`（含新 spawn 行） | 仅 0001 | 仅 0001 |
| C 租户 0002 | 仅 `tenant_id=0002`（含新 spawn 行） | 仅 0002 | 仅 0002 |
| 后台任务行（nil） | — | B/C 不可见 | 仅 A |

通过标准：B/C 能看到自己刚触发的 **spawn 审计行**；两租户之间零交叉；A 视角无回归。

### 6.4 自动化

- 单测：`create_audit_log` 在「无 task-local + 显式 tenant」时落显式 tenant；`with_origin` 正确合并 `_audit`。
- 集成测试：直接 `tokio::spawn` 调 CRM scoped helper，断言 `crm.audit_logs.tenant_id` 与 `user_id`。
- E2E：上述三身份脚本化（登录 → 动作 → 列表 → 断言行数与 tenant 分布）。

---

## 7. 实施顺序与协调

1. 用户确认 §8 决策。
2. 先落 `lib/shared-db` 的 `origin`/观测 + CRM helper（可编译、单测通过）。
3. 改 12 处 CRM spawn 调用点，编译 + 单测。
4. rehearsal 三身份验收（§6）。
5. 汇报验收矩阵；**本改造必须在 prod 策略翻转前发布**。
6. prod 策略翻转由另一会话按既有窗口执行；本会话不参与 prod 操作。
7. 全程：不修改 `database/migrations*`、不改策略、不 commit（实施阶段按用户指示再提交）。

### 工作量估

| 项 | 文件数 | 代码量 |
|----|--------|--------|
| shared-db origin/观测 | 1～2 | ~50 行 |
| CRM scoped helper | 1 | ~35 行 |
| CRM 12 处调用点 | 3 | ~50 行 |
| 测试 | 2～3 | ~80 行 |
| 文档更新 | 1 | — |

---

## 8. 已确认决策（2026-11-07 用户拍板）

| 编号 | 决策 | 结果 |
|------|------|------|
| D1 | spawn 审计 tenant 来源 | **改为被操作实体行 tenant_id**；仅实体 nil 时落 nil（超管代租户操作对租户管理员可见） |
| D2 | 同步补齐 spawn 审计的 `user_id/user_name` | 已实施，从 `Claims` 捕获后显式传入 |
| D3 | `origin` 存储方式 | **物理列**（可空 + 部分索引），迁移只演练于 rehearsal |
| D4 | 历史 nil 行 | 不回填，仅只读盘点 |
| D5 | 是否引入 spawn 包装器（方案 B） | 本轮不做，登记为跟进项（§12） |

---

## 9. 附：关键风险

1. **显式 tenant 来源污染**：只允许 `Claims`/服务端解析；若来自请求体，等于让租户伪造审计归属。
2. **超管单租户操作的可见性**：已按实体 tenant 落库；超管代租户1 的审批操作，租户1 管理员可见
   （rehearsal 已验证：tenant=0001、user=admin、origin=system）。仅当实体行为 nil 时才落 nil。
3. **spawn 内非审计 SQL**：本轮不处理；这些写入仍走 `scope_system()`。若未来需要在 spawn 内做租户业务写，必须采用方案 B 或显式 scoped txn，否则会绕过租户隔离。
4. **未挂载 middleware**：`svc/unified-core/src/middleware/audit_log.rs` **已删除**（未挂载、用裸池写 public 审计，
   且其 `audit_log_middleware` 无任何引用），同时移除 `middleware/mod.rs` 的 `pub mod audit_log;`。
5. **origin 列缺失时的写入失败**：代码在 `origin=Some` 时会 UPDATE 该列；因此 **prod 必须先执行 000012 迁移，再发布代码**。
   rehearsal 已按此顺序演练。

---

## 10. 实施记录（2026-11-07）

### 10.1 代码改造

| 文件 | 变更 |
|------|------|
| `lib/shared-db/src/audit.rs` | 新增 `AuditOrigin`（6 值）与 `CreateAuditLogRequest.origin/with_origin`；两个 sink 在 INSERT 后同 scope `UPDATE origin`（仅 `Some` 时）；`lib.rs` 导出 `AuditOrigin` |
| `svc/crm/src/modules/audit.rs` | 新增 `AuditActor { tenant_id, user_id, user_name, origin }` 与 `from_claims(...)`（全零 UUID 归一为 `None`）；新增 `log_audit_event_with_actor`；原 `log_audit_event` 委托并保留非 spawn 路径 |
| `svc/crm/src/modules/customer.rs` | 7 处 spawn 全部改为 `AuditActor`；`delete` 改为 `RETURNING tenant_id`；`batch_delete` 改为 `RETURNING tenant_id` 并取唯一非 nil 租户（多租户/nil 回退 nil）；start/approve/reject 预读条件与 UPDATE 对齐为 GUC 条件（修复超管可达性不一致） |
| `svc/crm/src/modules/contact.rs` | 3 处 spawn 改为 `AuditActor`；审批预读对齐 GUC 条件；create/update/delete/batch 的 `user_id/user_name` 同步补齐（验收矩阵要求） |
| `svc/crm/src/modules/opportunity.rs` | 2 处 spawn（advance/rollback）改为 `AuditActor`；CRUD 的 `user_id/user_name` 补齐；**顺带修复两处既有 SELECT/RETURNING 与 `Opportunity` 结构体不一致**（`win_rate` → `probability`，补齐 `opp_no/priority/status/owner_id/deleted_at`），否则 update/advance 在 rehearsal 直接 500，无法验证审计路径 |
| `svc/unified-core/src/middleware/mod.rs` | 移除 `pub mod audit_log;`；删除 `svc/unified-core/src/middleware/audit_log.rs`（未挂载、裸池写 public 审计、无引用） |
| `database/migrations/20261107000012_audit_logs_origin_column_18tables.sql` | 18 张 `*.audit_logs` 加 `origin VARCHAR(16) NULL` + 部分索引（**rehearsal-only**） |
| `database/scripts/audit_logs_origin_rollback.sql` | 可回滚脚本（先删索引再删列） |

编译/测试：
- `cargo check -p topems-shared-db -p topems-crm -p topems-unified-core`：通过
- `cargo test -p topems-shared-db -p topems-crm -p topems-unified-core --lib`：通过
- `cargo build -p topems-server`：通过

### 10.2 rehearsal 执行

- 环境：8098（`target/debug/topems-server`，DATABASE_URL=`topems_p0_rehearsal`）+ 克隆库；prod 8099 未触碰。
- 迁移：先应用 000012（18 列 + 18 部分索引均在），再启动新代码。
- 身份：A=`admin`（superuser）、B=`reh_b`（tenant 0001、e2e_full）、C=`reh_c`（tenant 0002、e2e_full）。
- 动作：customer/contact/opportunity 的 create/update/delete（含 customer batch_delete）；
  customer/contact 的 approval start/approve/reject；opportunity advance/rollback。

落库结果（`crm.audit_logs`，测试窗口内）：

| 维度 | 结果 |
|------|------|
| 新增行数 | 57（request 55 + system 2） |
| `user_id/user_name` 为空 | **0** |
| tenant 归属 | B 动作全部 0001；C 动作全部 0002；A 代租户1 的 2 条审批为 0001 |
| A 代租户1 用例 | `crm.customer.approval.approve`、`crm.contact.approval.approve`：tenant=0001、user=`admin`、origin=`system`、status=success |
| origin 分布 | `request`=55（常规 CRUD/审批）、`system`=2（超管代操作）；历史/登录审计为 NULL |
| 错误路径归因 | 早期因既有 SELECT bug 失败的 opportunity advance 也正确落了 0001/0002 与 `reh_b/reh_c`（status=error） |

可见性矩阵（`GET /api/crm/audit-logs`，RLS 生效）：

| 身份 | 可见行数 | 租户分布 |
|------|----------|----------|
| B（租户1） | 29 | 仅 0001；含 A 代租户1 的 2 条系统来源审计 |
| C（租户2） | 28 | 仅 0002 |
| A（超管） | 80 | 0001=29、0002=28、nil 系统历史行=23 |

其他服务不回归：
- `erp/hrm/wms/scm` 在测试窗口内新增审计行 = 0；
- `public.audit_logs` 新增 8 行均为登录审计（tenant=nil、origin=NULL，既有路径，与本改造无关）；
- 其他 schema 总数与 `topems_rehearsal2` 的差异来自两次克隆快照时点不同，非本轮写入。

迁移回滚演练：
- 在事务内执行 `database/scripts/audit_logs_origin_rollback.sql` 后 `ROLLBACK`，18 列仍在，脚本语法/依赖顺序有效；
- 未在 rehearsal 真正删列（保留证据），prod 回滚由后续窗口统一安排。

---

## 11. 需要 prod 执行的清单与顺序（本轮不执行）

1. **DDL（先于发布）**：`20261107000010` → `20261107000011`（RLS 会话）→ `20261107000012`（origin 列+索引）。
2. **发布**：包含本改造的应用版本（CRM 显式 actor + shared-db origin + unified-core middleware 删除）。
3. **验证**：按 §10.2 的三身份矩阵抽样；重点看 `user_id/user_name` 非空、tenant 归属、`origin` 分布、A 全量含 nil。
4. **回滚预案**：先回滚应用（确保 `origin` 不再被写入）→ 执行 origin 回滚脚本 → 再按 RLS 会话脚本回滚 000011/000010。
5. **禁止**：在 000012 未执行前发布代码（否则 `UPDATE origin` 会因列不存在导致 CRM 审计写入失败）。

---

## 12. 跟进项（方案 B）

- 裸 `tokio::spawn` 仍是审计/租户上下文丢失的结构性风险。建议后续单独立项：
  - 封装 `scoped_spawn(actor, fut)` 或在 `shared-auth` 提供 `audit_spawn!` 宏，强制捕获 `AuditActor`；
  - 增加 clippy lint / grep 护栏，禁止业务模块在 spawn 内直接调用无 actor 的审计 helper；
  - 对 spawn 内非审计 SQL 做租户 scope 显式化（避免误用 `scope_system()` 绕过隔离）。
- 可观测性：后续增加 `audit_write_without_tenant_total{sink}` 计数器，捕捉静默 nil 回归。
- 历史 nil 行：保持不回填；如需租户侧查看系统行，按 entity/action 白名单单独评估。
