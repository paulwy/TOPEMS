# W7 · P0：unified-core WebSocket 租户分区设计（2026-11-10）

> 状态：**设计待确认，未改代码**。
> 上游：`w7-cross-request-tenant-context-2026-11-10.md`（事件链路租户唯一来源 = `payload.tenant_id`）。
> 触发：EHS 事件首次产生前，WS 桥接已把"任意走到桥接的事件"广播给全部租户连接。

---

## 0. 结论先行

| 项 | 结论 |
|---|---|
| 是否正在泄漏 | **是**，且不依赖 EHS 是否开闸：`Portal*` / `Permission*` 事件今天就在向所有租户连接广播 |
| 根因 | 连接身份只有 `user_id`；频道表是全局 `HashMap<channel, HashSet<user_id>>`；广播函数没有租户参数 |
| 修法 | 租户在**握手**锚定（JWT `claims.tenant_id`），连接与频道都改为 `(tenant, ...)` 复合键，广播 API 强制带租户并做二次比对 |
| 前端影响 | 协议不变（订阅仍写裸频道名 `alerts`），仅超管连接新增 `?tenant_id=` 参数 |
| 不做 | 不做"全租户连接"；不做系统频道；不引入新依赖 |

---

## 1. 现状取证（泄漏路径）

### 1.1 四条路径

| # | 路径 | 证据 |
|---|---|---|
| L1 | 桥接把事件广播到全局 `alerts` / `notifications` / `permissions` / `events` 频道，不区分租户 | `ws_event_bridge.rs:258-284`、`:285-300`、`:301-318` |
| L2 | 任何已认证连接都可 `subscribe` 任意频道名，无白名单、无租户校验 | `ws.rs:587-627` |
| L3 | 连接/频道索引只有 `user_id`，两个租户的同名用户（如 `admin`）会共享连接槽与配额 | `ws.rs:23-32`、`:82-85`、`:133-161` |
| L4 | `broadcast_to_all` / `broadcast` 对全部连接群发（当前无调用方，但 API 仍公开） | `ws.rs:263-279`、`:305-315`、`:855-873` |

### 1.2 今天就在泄漏的内容

`PortalNotificationPublished` 与 `PermissionChanged/MetadataChanged` 已接入桥接（`ws_event_bridge.rs:53-67`），事件本身与租户无关地广播。EHS 只是把泄露面从"通知/权限"扩大到"隐患标题、位置、等级"。

另外，`EHS alert` 的 `data` 整包透传事件 payload（`ws_event_bridge.rs:268`），包含 `reported_by`、`location` 等业务字段。

### 1.3 多实例现状（顺带发现的投递缺陷）

`StreamEventSubscriber::new` 的 group / consumer 名对同服务所有实例相同（`stream_subscriber.rs:131-137`）。
同一 consumer group 内多个实例是**竞争消费**：每条事件只投给一个实例。后果：

- 不会跨实例重复推送（无横向泄漏）；
- 但**其余实例上的 WS 客户端收不到该事件**——一旦 unified-core 扩到多副本，实时推送会随机静默丢失。

这条必须和租户分区一起修，否则验收只能单实例通过。

---

## 2. 目标与非目标

**目标**

1. 一条事件只能到达"事件 `payload.tenant_id` 所属租户"的连接。
2. 一个连接只能订阅自己租户的频道，客户端无法指定或切换租户。
3. 即使频道 key 拼错、桥接传入租户错误，广播前仍有第二次比对兜底（不只依赖 key 命名）。
4. 无租户 / 非法租户 / service 身份的连接：拒绝握手，不默认放行。
5. 多实例部署下，任一实例上的客户端都能收到本租户事件，且不收到别的租户。

**非目标**

- 不改变 WS 帧协议（JSON-RPC 2.0、`subscribe/unsubscribe` 方法名、裸频道名）。
- 不改变 `verify_message_signature` 的签名机制。
- 不做"平台级全租户监控连接"、不做系统频道（如未来需要，按 §9 单独立项）。
- 不重构 SSE 链路（`/api/sse/*` 不在本设计范围，另记待办）。

---

## 3. 设计决策

### D1 租户来源：握手期从 JWT `claims.tenant_id` 锚定

- 唯一合法来源：`verify_jwt_token(token)` 返回的 `Claims.tenant_id`（`shared-auth/src/auth.rs:44`）。**不读 `x-tenant-id` 头**（浏览器 WebSocket 无法设置自定义头；且头可伪造）。
- 解析规则与 `resolve_create_tenant` 对齐（`shared-auth/src/middleware/tenant.rs:176-186`）：
  - 普通用户：`claims.tenant_id` 缺失 / 空串 / 非法 / 全 0 → **拒绝握手**（HTTP 403 或 WS close 4403 `tenant_required`），不落 nil。
  - `claims.is_superuser == true`：必须显式 `?tenant_id=<uuid>`；缺失或非法 → 拒绝。**不提供"全部租户"选项**。
  - `is_service_claims(claims)` → 拒绝（`service_not_allowed`）。service token 不应建立面向人的实时连接。
- 普通用户若显式传了 `?tenant_id=` 且与 claims 不一致 → 拒绝（`tenant_mismatch`），不静默忽略，避免前端"以为切换了"。

> 选择理由：租户在连接生命周期内不可变，锚定在握手比每条消息解析更省、更难绕过；超管走显式参数，与 HTTP 侧 `x-tenant-id` 的语义一致但载体改为 query（浏览器限制）。

### D2 连接身份：`(tenant, user_id)` 复合键

```text
ConnectionMap: HashMap<String /* "{tenant}:{user_id}" */, Vec<Arc<WsConnection>>>
WsConnection { tenant: Uuid, user_id, conn_id, ... }
```

- 每租户每用户仍限 6 并发连接（`MAX_CONNECTIONS_PER_USER`）。
- `remove_connection`、`connection_count`、配额预检（`websocket_handler` / `websocket_handler_path`）全部改用复合键。
- `send_to_user` → `send_to_tenant_user(tenant, user_id, msg)`：Portal 通知的 `target_users` 只在该事件租户的连接集合里找。

### D3 频道 key：服务端前缀，客户端只写裸频道名

```text
客户端 subscribe params.channel = "alerts"
服务端内部 key            = "{tenant_uuid}:alerts"
```

订阅校验（缺一不可）：

1. **白名单**：仅允许 `alerts` / `notifications` / `events` / `permissions`。
2. **字符约束**：频道名不得包含 `:`，长度 ≤ 32，禁止 `user:` 前缀（该前缀是服务端定向通道）。
3. **租户来源只能是连接自带的 `tenant`**：请求里出现 `channel` 以外的租户字段一律忽略并拒绝。

> 拒绝理由：若改为让客户端传完整 key，等于把命名权交给客户端，任何拼接错误都是泄漏；服务端前缀让"写错租户"在协议上不可能表达。

### D4 广播 API 收敛：租户是必填参数

| 现状 | 目标 |
|---|---|
| `broadcast_to_channel(channel, msg)` | `broadcast_to_tenant_channel(tenant, channel, msg)`；旧函数 `pub` 降为私有或删除 |
| `send_to_user(user_id, msg)` | `send_to_tenant_user(tenant, user_id, msg)` |
| `broadcast_to_all` / `broadcast` | 删除（无调用方；`broadcast_event` 测试同步改） |

`broadcast_to_tenant_channel` 内部：

```text
subscribers = channels.read()["{tenant}:{channel}"]           // 一级：key 命中
for conn in connections[subscriber]:
    if conn.tenant != tenant { warn + drop + counter }        // 二级：连接租户比对
    send
```

- 二级比对是**兜底**：即使未来有人误把频道 key 写成别的租户，也发不到错的人。
- 若消息帧里出现 `params.tenant_id`，与入参 `tenant` 不一致 → 丢弃并记 `ws_broadcast_dropped{reason=tenant_mismatch}`（防御性，正常路径不带该字段，见 D5）。

### D5 消息体：不携带 `tenant_id`

- `auth_success` 增加 `payload.tenant_id`（连接自己的租户），供前端展示/诊断与排障。
- 事件帧 **剥离** `data.tenant_id`，且不新增顶层 `tenant_id`。前端不需要租户，展示与过滤全部在服务端完成；把租户带出去只会诱导前端做"过滤式隔离"，那是假隔离。
- EHS / 事故 alert 的 `data` 从"整包 payload"改为**白名单字段**：`{hazard_id|accident_id, level|severity, category, location, status}`；`reported_by` 等不进 WS。
- `PortalNotificationPublished` 转发时同样剥离 `data.tenant_id` 与 `data.target_users`（用户名单属内部数据）。

### D6 桥接侧：先取租户，取不到就不广播、进 DLQ

`ws_event_bridge.rs` 的 Stream handler 改为：

```text
let tenant = require_event_tenant(&event)?;   // missing/nil/malformed → Err
... broadcast_to_tenant_channel(tenant, "alerts", msg)
```

- handler 返回 `Err` 后走既有 3 次重试 → DLQ，`last_error` 复用上一轮已修的 `[tenant_context] ... (retries=3)` 透传（`stream_subscriber.rs:324-379`）。
- 不再"解析失败也广播"：当前分支只看 `event_type`，`tenant_id` 缺失时会照常广播。
- 桥接不做兜底租户、不查库反推租户。

### D7 多实例：每实例独立 consumer group

- consumer group 名由 `format!("{base}-{instance_id}")` 派生，`base` 取 `EVENT_CONSUMER_GROUP`（缺省 `unified-core-ws-bridge-group`），`instance_id` 取新增环境变量 `WS_INSTANCE_ID`，缺省回退 `HOSTNAME`，本地缺省 `local`。
- 效果：每个实例都收到全量桥接事件，再按本实例连接表分发 → 真正扇出。
- 代价：N 倍消费（桥接只订 Portal/EHS/Permission，属低频事件，可接受）；每实例一个 PEL，实例缩容后其 PEL 需 `XAUTOCLAIM` 或运维清理，记入风险（§8）。
- 不选方案 "Redis Pub/Sub 二次扇出"：会引入 Stream + Pub/Sub 双通道与第二套丢消息语义，收益不足以抵复杂度。

### D8 断线重连 / token 过期

- 重连 = 重新握手：租户重新由新 token 解析；**频道订阅不持久化**，前端需重新 `subscribe`（与现状一致）。
- 同用户切换到另一租户 = 另一个 token = 另一条连接；不存在"连接内改租户"的路径。
- token 过期：当前实现不在每条广播时校验 `exp`，租户锚定在握手因此不会漂移；已知限制是"过期 token 可继续收事件直到断线"。本轮不改，登记为已知限制（如需收紧，在心跳 30s tick 中校验 `exp` 并 close 4401）。

---

## 4. 数据结构变更一览

| 对象 | 现状 | 目标 |
|---|---|---|
| `WsConnection` | `user_id, sender, channels, conn_id` | 增 `tenant: Uuid` |
| `ConnectionMap` | `user_id -> Vec<conn>` | `"{tenant}:{user_id}" -> Vec<conn>` |
| `ChannelMap` | `channel -> HashSet<user_id>` | `"{tenant}:{channel}" -> HashSet<"{tenant}:{user_id}">` |
| `WsQueryParams` | `token` | 增 `tenant_id: Option<String>`（仅超管生效） |
| `auth_success` | user_id / username / role | 增 `tenant_id` |
| `broadcast_to_channel` | 无租户 | 删除，替换为 `broadcast_to_tenant_channel` |
| `send_to_user` | 无租户 | 删除，替换为 `send_to_tenant_user` |
| `broadcast_to_all` | 无租户群发 | 删除 |
| `/ws/healthz` | 输出 `channels: {名称: 人数}` | 只输出 `clients` / `channels_total` / `tenant_count`，**不输出频道名与租户 ID**（该端点无鉴权） |

---

## 5. 数据流

### 5.1 握手

```text
GET /ws/{module}/{feature}?token=<JWT>[&tenant_id=<uuid>]
  → origin_allowed()
  → verify_jwt_token()
  → resolve_ws_identity(claims, params) -> WsIdentity{tenant, user_id} | Reject(code)
       reject: 403 + {"code": 4403, "message": "tenant_required|tenant_mismatch|service_not_allowed"}
  → 配额预检（复合键）
  → handle_socket():
       再解析一次（权威），失败则 close 4403
       add_connection("{tenant}:{user}", conn)
       发 auth_success（含 tenant_id）
```

### 5.2 订阅

```text
subscribe("alerts")
  → 白名单校验 → 字符校验
  → channel_key = "{conn.tenant}:alerts"
  → 32 上限按连接计
  → ChannelMap[channel_key].insert("{tenant}:{user}")
  → ack {status: subscribed, channel: "alerts"}   // 回给客户端的仍是裸名
```

### 5.3 广播

```text
Stream 事件
  → require_event_tenant(&event)          // 取不到 → Err → 重试 → DLQ
  → 组装帧（剥离 tenant_id / target_users；alert.data 白名单）
  → broadcast_to_tenant_channel(tenant, "alerts", msg)
       → ChannelMap["{tenant}:alerts"]
       → 逐连接：conn.tenant == tenant ？发送 : 丢弃+日志+计数
```

---

## 6. 兼容性与前端影响

| 项 | 影响 |
|---|---|
| 订阅/退订帧 | 无变化（仍传裸频道名） |
| `auth_success` | 多一个 `tenant_id` 字段（前端忽略即可） |
| 普通用户连接 | 无变化（token 里本身带租户） |
| **超管连接** | **新增必填 `?tenant_id=`**；不传将被 403 拒绝。需要前端/运维侧确认调用方清单 |
| `healthz` 响应 | 字段收敛（不再返回频道名映射），如有看板依赖需同步 |
| alert 帧 | `data` 收窄为白名单字段，前端若读 `data.reported_by` 会拿到 undefined（需前端确认无依赖） |

**待确认**：仓库外的前端/移动端是否依赖 (a) `healthz.channels` 明细、(b) `alert.data` 全量 payload、(c) 超管 WS 连接。

---

## 7. 验收清单（两租户本地实测）

| # | 场景 | 断言 |
|---|---|---|
| A1 | A 用户连接 + 订阅 `alerts` | `auth_success.tenant_id = A` |
| A2 | B 用户连接 + 订阅 `alerts` | 同上为 B |
| A3 | A 租户造一条隐患（EHS 事件） | A 的连接收到 1 条 alert，`data` 无 `tenant_id` |
| A4 | 同上 | **B 的连接收到 0 条** |
| A5 | B 用户尝试订阅 `{A}:alerts` / `A:alerts` / `user:x` / 非白名单频道 | 全部拒绝（错误码明确，频道表无新增） |
| A6 | 无 token / token 无 tenant / token 为 nil 租户 | 握手 403 或 close 4403，不进连接表 |
| A7 | 超管无 `?tenant_id=` | 拒绝 |
| A8 | 超管带 `?tenant_id=B` | 只收到 B 的事件；A 的事件一条不少地进 A 的连接 |
| A9 | service token 连接 | 拒绝 `service_not_allowed` |
| A10 | 人为把事件 `tenant_id` 置 nil 投递（模拟旧消息） | 不广播；桥接重试 3 次后 DLQ 中可见 `[tenant_context:nil] ... (retries=3)` |
| A11 | 双实例（同机两端口）各连一个 A 用户 | A 的事件两条连接都收到（验证 D7） |
| A12 | `/ws/healthz` | 响应不含频道名、不含租户 UUID |

---

## 8. 风险与回滚

| 风险 | 处置 |
|---|---|
| 超管前端未带 `?tenant_id=` 导致连不上 | 上线前 grep 前端连接串 + 预发验证；错误码 4403 可定位 |
| 每实例独立 group 造成 N 倍消费 | 仅桥接订阅的 10 类事件；若后续放量，改回单 group + Pub/Sub 扇出（记待办） |
| 实例缩容后 PEL 残留 | 现有 `lims-group` 同类问题已处理过一次；本次上线同时给出 `XAUTOCLAIM` 清理命令 |
| `alert.data` 收窄导致前端字段缺失 | 前端确认后上线；或先保留全量、仅剥离 `tenant_id`，二选一由你定 |
| 回滚 | 代码回滚即可恢复旧行为（无 DB 迁移、无新依赖）；但回滚即恢复跨租户广播，需与"EHS 是否已开闸"联动判断 |

---

## 9. 实施切分（确认后执行，预计 1 个提交）

1. `ws.rs`：`WsIdentity` 解析、连接/频道复合键、订阅白名单、`broadcast_to_tenant_channel` / `send_to_tenant_user`、删除全局广播、healthz 收敛、单测（A5/A6/A12 的纯函数部分）。
2. `ws_event_bridge.rs`：`require_event_tenant`、帧白名单化、调用新广播 API。
3. `main.rs`：桥接 consumer group 派生（D7）。
4. 本地两租户端到端：A1–A11 全量跑一遍，日志与 DLQ 取证。
5. 文档：本文件补"实测结果"一节。

**未来可选（不在本轮）**：平台级只读系统频道（需独立鉴权与审计）、SSE 链路同口径收口、token 过期即时断开。

---

## 10. 需要你拍板的三个点

1. **超管连接**：按本设计"必须显式 `?tenant_id=`，否则拒绝"（推荐），还是"允许建立但只能订阅系统频道"？
2. **alert 帧 `data`**：收窄为白名单（推荐，去 `reported_by` 等）还是先只剥离 `tenant_id`、保留其余字段？
3. **多实例**：本轮就落 D7（每实例独立 group），还是先按单实例上线、多副本时再补（风险：扩容即静默丢推送）？

---

## 11. 定稿补充（2026-11-10 v2，已按此实现）

### 11.1 三点定稿

| # | 决策 |
|---|---|
| ① | **超管必须带 `?tenant_id=`，否则拒绝连接**。不提供"能连但只订阅系统频道"的后路（那种连接迟早被当普通连接用）。 |
| ② | **alert/notification 的 `data` 用白名单**，不是"只剥 tenant_id"。整包透传等于未来新增字段自动泄漏；新增字段必须显式加白。 |
| ③ | **本轮不改消费语义**：只把 group 名改为可配置 `WS_BRIDGE_GROUP`（默认 `unified-core-ws-bridge`）+ 启动日志打印 `WS_INSTANCE_ID`/`HOSTNAME`。扩容扇出方案改为 **Redis Pub/Sub**（每实例订阅同一 pubsub 频道 → 推本地连接），仅写入设计，不实施。 |
| ④ | 先做前端依赖清单，再改协议（结果见 11.2）。 |
| ⑤ | A1–A12 保留，新增 A13 / A14（见 11.4）。 |

### 11.2 前端依赖清单（`apps/web`、`apps/mobile`、`packages/*`）

| 检查项 | 结论 |
|---|---|
| `/ws/healthz` 返回字段 | **无任何引用**（grep `healthz` 零命中）。healthz 已收敛为 `clients/tenants/channels` 计数，不返回频道名与租户 ID。 |
| `alert.data` 字段 | **无消费方**。前端从未订阅 `alerts` 频道，也没有 `alert.data.*` 读取；`reported_by` 仅出现在 HTTP DTO/页面，不在 WS 路径。故白名单按下表定义。 |
| 超管直连 WS | **有**：`useWebSocket` 统一构造 `/ws/core*`、`/ws/mes/*`、`/ws/gis/*`、`/ws/bi/*`；此前**不会**自动带 `tenant_id`。已改：`getWsUrl()` 在 `is_superuser === true` 时追加 `tenant_id`（取 `localStorage.current_tenant_id`），普通用户不带、也不能覆盖 token 租户。 |
| 前端订阅频道 | 仅 `notifications`（`useNotificationWebSocket`）；消息类型消费 `auth_success` / `auth_failed` / `notification` / `unread_count`。白名单已覆盖。 |

### 11.3 已实施的帧白名单

| 帧 | 白名单字段（`data`） |
|---|---|
| `alert`（EHS 5 类） | `hazard_id, hazard_no, accident_id, accident_no, category, level, severity, location, status` |
| `notification`（Portal） | `notification_id, link_url`（**不含** `target_users`、`tenant_id`） |
| `permission_changed` | `permissions_added, permissions_removed, changed_at` |
| 系统事件（权限元数据/菜单/页面） | `change_type, permission_codes, menu_id, menu_name, page_id, page_name, page_path, changed_at, updated_at, created_at` |

规则：`pick()` 只拷贝白名单键；payload 新增字段默认不出网。桥接未登记的事件类型直接丢弃（不再有 `_ => 广播到 events` 的兜底）。

### 11.4 新增验收项

| # | 场景 | 断言 |
|---|---|---|
| A13 | 超管无 `?tenant_id=` | HTTP 403（升级前拒绝），浏览器 `onerror/onclose`，前端表现为"连不上"，**不会**出现 auth_success 后静默 |
| A14 | 任意 alert / notification 帧 | 帧内 JSON 断言不含 `tenant_id`、`reported_by`、`target_users` |

### 11.5 实现落点

- `svc/unified-core/src/modules/communication/ws.rs`：`WsIdentity`/`resolve_ws_identity`、复合键、频道白名单、`broadcast_to_tenant_channel`、`send_to_tenant_user`、`send_to_unique_user`、删除全局广播与频控合并队列、healthz 收敛。
- `svc/unified-core/src/modules/communication/ws_event_bridge.rs`：租户提取失败 → `Err`（重试→DLQ，`[tenant_ctx:nil]`）、帧白名单、系统事件单独通道、`WS_BRIDGE_GROUP` + 实例日志。
- `apps/web/src/hooks/useWebSocket.ts`：超管连接追加 `tenant_id`。

### 11.6 遗留（不阻塞 P0，登记待办）

1. `PortalNotificationPublishedPayload` 无 `tenant_id`：当前按"目标用户 ID 全局唯一"定向发送；无目标用户则丢弃（禁止广播）。需 Portal 生产端补租户后改走 `send_to_tenant_user`。
2. 多实例扇出（Redis Pub/Sub）未实施；当前同组多副本仍会丢推送（不泄漏）。
3. `PortalNotification` 落库仍写 nil 租户（独立于本设计，属 B2 收口）。


## 12. 实施与验收记录（2026-11-10）

### 12.1 门禁

| 命令 | 结果 |
|---|---|
| `cargo fmt --all` | 通过 |
| `cargo clippy -p topems-unified-core --all-targets -- -D warnings` | `EXIT=0`，0 warning |
| `cargo test -p topems-unified-core --lib communication::ws::tests` | 5 passed |

### 12.2 两租户本地实测（16/16 通过）

环境：本机 `topems-unified-core`（`:8000`）+ 本地 Redis Stream；租户 A/B 用 HS256 手签 JWT；事件经 `XADD topems:stream:events:EhsHazardReported <id> payload <Event JSON>` 注入。

| # | 断言 | 结果 |
|---|---|---|
| A1/A2 | A、B 连接 `auth_success.payload.tenant_id` 分别为 A、B | PASS |
| A1b/A2b | 两端订阅 `alerts` 成功 | PASS |
| A5 | 订阅 `global`（非白名单）→ `4003`；订阅 `{A}:alerts`（前缀注入）→ `4003` | PASS |
| A3 | A 造隐患后 A 收到 `alert` 帧 | PASS |
| A4 | 同一事件 B 连接 2s 内未收到任何帧 | PASS |
| A13 | 超管不带 `?tenant_id=` → 升级前 HTTP 403（客户端 `InvalidStatus`，即"连不上"） | PASS |
| A8 | 超管带 `tenant_id=B` → `auth_success.tenant_id=B`，且收到 B 的 alert | PASS |
| A12 | `GET /ws/healthz` 仅 `clients/tenants/channels` 计数，帧体内无 A/B 租户 UUID | PASS |
| A14 | 帧 JSON 断言不含 `tenant_id`、`reported_by`；`data` 键集合 ⊆ 白名单 | PASS |

实测帧样例（A 租户订阅 `alerts` 收到）：

```json
{"type":"alert","payload":{"id":"aaaaaaaa-1111-4111-8111-000000000098","type":"warning","title":"E2E 隐患","message":"E2E 描述","severity":"medium","timestamp":1794327328,"data":{"hazard_id":"aaaaaaaa-1111-4111-8111-000000000098","hazard_no":"HZ-E2E-1","category":"fire","level":"high","location":"车间 A"}}}
```

说明：`title`/`message` 是对前端展示的映射字段（来自事件 `title`/`description`），非原样透传；`data` 仅含白名单键，未出现 `reported_by`/`tenant_id`。

### 12.3 探针脚本

`/tmp/ws_e2e.py`（临时文件，不进仓库）：手签 JWT、订阅签名、XADD 注入、上述 16 条断言。
