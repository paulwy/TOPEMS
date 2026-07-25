# TOPEMS 项目短板逐一分析与优化报告

> **版本**: v1.0 | **日期**: 2026-07-24 | **范围**: 全栈架构、安全、工程效能、产品完整度、增值运营
> **配套文档**: [CODE_WIKI.md §11](file:///Users/xingzhai/TOPEMS/docs/CODE_WIKI.md) 项目评估与优化方案

---

## 目录

1. [报告概述与分析框架](#1-报告概述与分析框架)
2. [短板总览与优先级矩阵](#2-短板总览与优先级矩阵)
3. [安全类短板（P0/P1，立即处置）](#3-安全类短板p0p1立即处置)
   - 3.1 [BI 模块 SQL 注入漏洞](#31-bi-模块-sql-注入漏洞p0)
   - 3.2 [JWT 对称密钥与默认密钥风险](#32-jwt-对称密钥与默认密钥风险p1)
   - 3.3 [插件注册令牌默认放行](#33-插件注册令牌默认放行p1)
4. [架构类短板（P2，阶段治理）](#4-架构类短板p2阶段治理)
   - 4.1 [路由与 API 路径遗留债务](#41-路由与-api-路径遗留债务)
   - 4.2 [unified-core 职责边界过宽](#42-unified-core-职责边界过宽)
   - 4.3 [微服务粒度与运维成本](#43-微服务粒度与运维成本)
   - 4.4 [共享库 topems_shared 膨胀](#44-共享库-topems_shared-膨胀)
5. [工程效能类短板（P2/P3，持续改进）](#5-工程效能类短板p2p3持续改进)
   - 5.1 [前后端类型不同步](#51-前后端类型不同步)
   - 5.2 [Vite Proxy 配置仍偏手动](#52-vite-proxy-配置仍偏手动)
6. [产品完整度类短板（P3，规划补齐）](#6-产品完整度类短板p3规划补齐)
   - 6.1 [模块实现深度不均衡](#61-模块实现深度不均衡)
   - 6.2 [桌面端与移动端薄弱](#62-桌面端与移动端薄弱)
7. [已闭环短板（V51.0 修复验证）](#7-已闭环短板v510-修复验证)
   - 7.1 [工单 SLA 前后端断点](#71-工单-sla-前后端断点已修复)
8. [分阶段部署路线图](#8-分阶段部署路线图)
9. [增值运营与商业化建议](#9-增值运营与商业化建议)
10. [未来扩展架构演进](#10-未来扩展架构演进)

---

## 1. 报告概述与分析框架

### 1.1 报告目的

本报告对 TOPEMS 平台进行全面短板诊断，**逐一**给出问题本质、解决思路、技术依据、可行性评估、遵循原则、实施步骤，并结合**增值运营、阶段部署、未来扩展**三个维度提出可落地的优化路径。报告不追求面面俱到，而是聚焦影响平台健康度与商业化进程的关键短板。

### 1.2 分析框架

每项短板统一采用以下七要素分析结构：

| 要素 | 含义 | 回答的核心问题 |
|------|------|---------------|
| **问题** | 现象、根因、影响面 | 出了什么问题？影响多大？ |
| **思路** | 解决方向与方案选型 | 怎么解决？为什么这么选？ |
| **依据** | 技术标准、行业实践、代码证据 | 凭什么这么做？有据可依吗？ |
| **可行性** | 技术风险、改造成本、兼容性 | 能做吗？代价多大？ |
| **原则** | 遵循的设计与工程原则 | 守住什么底线？ |
| **步骤** | 分阶段落地动作 | 先做什么后做什么？ |
| **增值/部署/扩展** | 运营价值、阶段安排、未来空间 | 带来什么收益？如何演进？ |

### 1.3 评分体系

- **优先级**: P0（阻断性，立即修复）→ P1（高危，本周修复）→ P2（中危，本季度治理）→ P3（低危，规划补齐）
- **风险等级**: 🔴 严重 / 🟠 高 / 🟡 中 / 🟢 低
- **改造规模**: S（<1 人天）/ M（1-5 人天）/ L（5-20 人天）/ XL（>20 人天）

---

## 2. 短板总览与优先级矩阵

| # | 短板 | 类别 | 风险 | 优先级 | 改造规模 | 状态 |
|---|------|------|------|--------|---------|------|
| 3.1 | BI 模块 SQL 注入 | 安全 | 🔴 | P0 | M | 待修复 |
| 3.2 | JWT 对称密钥+默认密钥 | 安全 | 🟠 | P1 | L | 待修复 |
| 3.3 | 插件注册令牌默认放行 | 安全 | 🟡 | P1 | S | 待修复 |
| 4.1 | 路由与 API 路径遗留债务 | 架构 | 🟡 | P2 | M | 治理中 |
| 4.2 | unified-core 职责边界过宽 | 架构 | 🟠 | P2 | XL | 规划中 |
| 4.3 | 微服务粒度与运维成本 | 架构 | 🟡 | P2 | XL | 规划中 |
| 4.4 | 共享库 topems_shared 膨胀 | 架构 | 🟡 | P2 | L | 规划中 |
| 5.1 | 前后端类型不同步 | 工程 | 🟡 | P2 | M | 规划中 |
| 5.2 | Vite Proxy 配置偏手动 | 工程 | 🟢 | P3 | S | 规划中 |
| 6.1 | 模块实现深度不均衡 | 产品 | 🟡 | P3 | XL | 持续推进 |
| 6.2 | 桌面端与移动端薄弱 | 产品 | 🟡 | P3 | L | 规划中 |
| 7.1 | 工单 SLA 前后端断点 | 功能 | 🟢 | - | - | ✅ 已修复 |

**优先级矩阵**:

```
影响面 ↑
高 │  3.1 SQL注入        3.2 JWT密钥
   │  (P0/严重)          (P1/高危)
中 │  4.2 核心边界       4.1 路由债务    6.1 模块深度
   │  (P2)              (P2)            (P3)
低 │  3.3 插件token      5.2 Proxy      6.2 四端
   │  (P1)              (P3)            (P3)
   └─────────────────────────────────────→ 紧急度
     立即        本季度        中长期
```

---

## 3. 安全类短板（P0/P1，立即处置）

### 3.1 BI 模块 SQL 注入漏洞（P0）

#### 问题

[svc/analytics/src/modules/bi/chart_service.rs#L103](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/chart_service.rs#L103) 与 [multidimensional_analysis.rs#L332](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/multidimensional_analysis.rs#L332) 直接将用户可控参数拼入 SQL：

```rust
query: format!("SELECT {} FROM {}", x_column, data_source),  // chart_service.rs:103
let query = format!("SELECT {} FROM analytics_data LIMIT 100", select_clause); // multidimensional_analysis.rs:332
```

- `data_source`（表名）、`x_column`/`label_column`（列名）均来自 API 入参，无白名单校验。
- 攻击路径：`POST /api/bi/charts` → `generate_line_chart(data_source="users; DROP TABLE users--", ...)` 可执行任意 SQL，导致数据泄露或破坏。
- 影响面：BI 服务直接连接主 PostgreSQL，可访问所有 Schema 数据，属**全租户数据泄露**级别风险。

#### 思路

采用**"白名单 + 参数化"双层防御**：

1. **标识符白名单**：表名/列名只能取自预注册的"数据集元数据"（`bi_datasets` 表），运行时校验 `data_source` 与 `x_column` 是否在白名单内。
2. **参数化查询**：值参数统一走 `sqlx::query_with` 绑定，标识符使用 `quote_identifier`（PG 标准双引号转义）后拼接，杜绝注入。
3. **SQL 解析层**：对用户自定义查询（`ChartQuery.query`）引入 `sqlparser` 解析 AST，拒绝非 SELECT 语句与危险函数（`pg_read_file`、`pg_sleep` 等）。

#### 依据

- **OWASP A03:2021 Injection** 仍为 Top 10 安全风险，SQL 注入是经典表现。
- PostgreSQL 标识符转义规范：双引号包裹 + 内部双引号双写（`"` → `""`）。
- `sqlx` 原生支持 `query_as_with!` 宏，类型安全且防注入。
- Rust 生态 `sqlparser-rs`（Apache-2.0）可解析 SQL AST，已在 datafusion/diesel 等项目验证。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 低。白名单 + 参数化是成熟模式，`sqlx` 原生支持 |
| 改造成本 | M（2-3 人天）。需新增 `bi_datasets` 元数据表、重构 3 个 chart 生成函数、补充单测 |
| 兼容性 | 中。现有 API 入参不变，但 `data_source` 需预先注册到白名单，存量看板需迁移 |
| 回滚风险 | 低。可灰度：先校验拒绝非法、再切参数化 |

#### 原则

- **最小权限**：BI 服务 DB 账号仅授予白名单表的 SELECT 权限，即使注入也无法越权。
- **纵深防御**：白名单 + 参数化 + DB 权限三层独立，任一层失效仍有保护。
- **失败安全**：白名单校验失败时返回 400，绝不降级为"原样执行"。

#### 步骤

1. **【0.5 天】元数据建表**：新建 `bi_datasets(id, tenant_id, table_name, allowed_columns JSONB, created_at)`，迁移存量看板数据源。
2. **【1 天】标识符校验中间件**：在 `ChartService` 入口增加 `validate_dataset(data_source, columns)`，查白名单命中才放行。
3. **【1 天】参数化重构**：`generate_line_chart`/`generate_bar_chart`/`generate_pie_chart` 改用 `sqlx::query_as_with`，标识符走 `quote_identifier`。
4. **【0.5 天】测试**：注入攻击 payload 单测（`'; DROP TABLE`、`UNION SELECT`、`pg_read_file`），确保全部拒绝。
5. **【0.5 天】CI 卡点**：在 `.github/workflows/ci.yml` 增加 `cargo-audit` 与 `grep -rn "format!(\"SELECT"` 静态扫描，禁止新增裸拼接。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：白名单元数据可演化为"数据集市场"，租户自助注册数据源并配置列级权限，支撑 BI 自助分析 SaaS 化。
- **阶段部署**：第一阶段（本周）白名单校验上线；第二阶段（下月）开放租户自助注册数据集；第三阶段引入行列级权限（RLS 复用）。
- **未来扩展**：接入 `sqlparser` AST 审计后，可支持自然语言转 SQL（NL2SQL）的安全执行层，为 AI BI 场景铺路。

---

### 3.2 JWT 对称密钥与默认密钥风险（P1）

#### 问题

[lib/src/auth.rs#L69-L96](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs#L69-L96) 存在两重风险：

1. **HS256 对称密钥**：所有 20+ 服务共享同一 `JWT_SECRET`，任一服务泄露密钥即可伪造任意租户/用户 token，跨服务横向移动无障碍。
2. **默认密钥回退**：未设置 `JWT_SECRET` 环境变量时回退到硬编码 `topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256`，生产环境漏配即等于无认证。

```rust
&Header::new(Algorithm::HS256),
&EncodingKey::from_secret(secret.as_ref()),
// ...
let default_jwt_secret = "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256";
```

#### 思路

**分两步走：先止血，后治本。**

1. **止血（1 天）**：移除默认密钥回退，生产环境（`PROFILE=prod`）未配置 `JWT_SECRET` 或长度 <32 时直接 panic 退出。
2. **治本（中期）**：迁移至 **RS256 非对称加密**：
   - IAM 服务作为唯一签发方，持有私钥（`JWT_PRIVATE_KEY`）。
   - 其他服务仅持有公钥（`JWT_PUBLIC_KEY`），只能验签不能签发。
   - 引入 `kid`（key ID）header 支持密钥轮换。

#### 依据

- **RFC 7519** JWT 规范明确推荐生产环境使用非对称签名。
- **OAuth 2.0 安全 BCP**（RFC 6749bis）建议授权服务器使用非对称密钥。
- `jsonwebtoken` crate 原生支持 `Algorithm::RS256` + `EncodingKey::from_rsa_pem` / `DecodingKey::from_rsa_pem`。
- 行业实践：Auth0、Keycloak、Okta 均默认 RS256，仅开发态用 HS256。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 中。RS256 迁移涉及所有服务验签逻辑，需统一发布 |
| 改造成本 | L（5-8 人天）。止血 1 天；RS256 迁移 4 天；密钥管理 2 天；测试 1 天 |
| 兼容性 | 中。需支持 HS256/RS256 双算法过渡期（`Validation.algorithms = [RS256, HS256]`），旧 token 自然过期后移除 HS256 |
| 回滚风险 | 低。双算法过渡期可随时回退 |

#### 原则

- **最小知识**：非签发服务不应知道密钥，公钥可公开但私钥不可泄露。
- **前向安全**：密钥轮换机制确保旧密钥泄露不影响新 token。
- **生产强约束**：宁可启动失败，不可弱配置上线。

#### 步骤

1. **【1 天 止血】** 修改 [auth.rs](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs)：`PROFILE=prod` 时移除默认密钥，校验 `JWT_SECRET` 长度≥32，否则 `panic!`。
2. **【1 天 密钥生成】** 生成 RSA 密钥对（2048 位），私钥存入 K8s Secret / Vault，公钥分发至所有服务环境变量。
3. **【2 天 签发改造】** IAM 服务 `encode` 切换 `Algorithm::RS256` + `EncodingKey::from_rsa_pem`，header 增加 `kid`。
4. **【1 天 验签改造】** `lib/src/auth.rs` 的 `decode` 支持 `Validation { algorithms: [RS256, HS256], .. }` 过渡期双验。
5. **【1 天 密钥轮换】** 实现 `JWKS` 端点（`/.well-known/jwks.json`），`kid` 映射公钥，支持热轮换。
6. **【1 天 测试】** 全服务集成测试：旧 HS256 token 过期前可用、新 RS256 token 正常、轮换后旧 kid 拒绝。
7. **【过渡期 30 天】** 监控 HS256 token 使用率降至 0 后，移除 HS256 支持。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：RS256 + JWKS 是 SaaS 多租户对接第三方 IdP（企业微信、钉钉、Azure AD）的前置条件，可开放"企业身份联邦"增值包。
- **阶段部署**：第一阶段止血（本周）；第二阶段 RS256 迁移（本月）；第三阶段 JWKS + 密钥轮换自动化（下季度）。
- **未来扩展**：接入 OAuth 2.1 / OIDC 标准化身份层，支持跨域 SSO、设备码流程、FIDO2 无密码认证。

---

### 3.3 插件注册令牌默认放行（P1）

#### 问题

[svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23)：

```rust
let expected_token = match std::env::var("PLUGIN_REGISTRATION_TOKEN") {
    Ok(token) if !token.is_empty() => token,
    _ => {
        // 开发模式：未配置注册令牌，允许所有注册
        return true;
    }
};
```

生产环境若漏配 `PLUGIN_REGISTRATION_TOKEN`，任意服务可注册为插件，获取租户上下文与导航入口，构成权限提升路径。

#### 思路

**环境感知强制校验**：

1. `PROFILE=prod` 时，未配置 `PLUGIN_REGISTRATION_TOKEN` 则启动失败（`panic!`）。
2. 注册接口增加**租户级白名单**：插件需在 `tenant_plugins` 表预授权才能注册。
3. 插件二进制增加**签名校验**（可选，长期）：插件包附带签名，unified-core 验签后才允许注册。

#### 依据

- **零信任架构**：默认拒绝，显式授权。
- K8s 生态：Sidecar 注册需 mTLS，插件注册同理应有强身份校验。
- 已有 `tenant_plugins` 表（[svc/unified-core/src/modules/plugin/tenant_plugins.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/tenant_plugins.rs)）可复用为白名单存储。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 低。仅增加环境变量校验与一次 DB 查询 |
| 改造成本 | S（0.5-1 人天） |
| 兼容性 | 高。开发环境不配 `PROFILE=prod` 不受影响 |
| 回滚风险 | 极低 |

#### 原则

- **默认安全**：生产环境宁可拒绝合法注册，不可默认放行。
- **最小授权**：插件只能注册到预授权的租户。

#### 步骤

1. **【0.5 天】环境校验**：`verify_registration_token` 中 `PROFILE=prod` 且 token 未配置时返回 `false` 并记录 `error!`。
2. **【0.5 天】租户白名单**：`register_plugin` 查询 `tenant_plugins` 表，校验 `plugin_code` 是否在租户白名单内。
3. **【测试】** 覆盖：prod 未配 token → 拒绝；prod 配 token + 白名单外插件 → 拒绝；dev 未配 token → 放行。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：租户级插件白名单可演化为"插件商店"审核流程，租户管理员审批后自动写入白名单。
- **阶段部署**：第一阶段强制 token；第二阶段租户白名单；第三阶段插件签名校验。
- **未来扩展**：插件签名 + 沙箱执行（WASM），实现第三方插件安全托管。

---

## 4. 架构类短板（P2，阶段治理）

### 4.1 路由与 API 路径遗留债务

#### 问题

项目经历多次路由规范演进（`/api/v1/core/*` → `/api/core/*`、`/api/analytics/*` → `/api/bi/*`），当前通过 `register_routes_with_legacy_alias` 保留旧路径兼容，导致：

- Vite proxy 规则膨胀（新旧路径各一条）。
- Nginx/K8s Ingress 规则翻倍。
- 新开发者易混淆，文档需标注"废弃但仍可用"。
- 前端 `runtime.ts` 仍存在 `@deprecated` 别名。

#### 思路

**"标注 → 迁移 → 下线"三步走**：

1. **标注**：所有旧路径响应头增加 `Deprecation: true` + `Sunset: <date>`（RFC 8594），并在 OpenAPI 中标记 `deprecated: true`。
2. **迁移**：前端全面切新路径，监控旧路径流量。
3. **下线**：旧路径流量归零后，移除 `register_routes_with_legacy_alias` 与对应 Vite proxy 规则。

#### 依据

- **RFC 8594 Sunset Header**：标准化废弃资源通知机制。
- HTTP `Deprecation` header（IETF 草案）已被 Chrome DevTools、Postman 支持。
- 行业实践：GitHub API、Stripe API 均采用 12 个月废弃周期。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 低。纯路由层调整 |
| 改造成本 | M（3-5 人天）。主要为前端路径替换 + proxy 清理 |
| 兼容性 | 需协调第三方集成方迁移，建议 6 个月过渡期 |
| 回滚风险 | 极低 |

#### 原则

- **单一真理源**：每个资源只有一个规范路径。
- **向后兼容有期限**：废弃不是永久支持。

#### 步骤

1. **【1 天】盘点**：grep 全部 `legacy_alias` / `@deprecated` 路径，建立废弃清单（路径、替代路径、最后下线日期）。
2. **【1 天】响应头**：中间件为旧路径注入 `Deprecation` + `Sunset` header。
3. **【1 天】前端迁移**：`runtime.ts` 删除 `@deprecated` 别名，全部切新路径。
4. **【0.5 天】Proxy 清理**：`vite.config.ts` 移除旧路径代理规则。
5. **【0.5 天】CI 卡点**：增加 lint 规则禁止新增 `register_routes_with_legacy_alias` 调用。
6. **【过渡期 6 月】** 监控旧路径流量，归零后移除后端别名。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：路径收敛后 API 文档更清晰，降低客户集成成本，提升 API 治理成熟度评级。
- **阶段部署**：先核心服务（iam/flow），再业务服务，最后 BI 别名。
- **未来扩展**：引入 API Gateway（如 Kong/APISIX）统一路由管理，路径规则配置化。

---

### 4.2 unified-core 职责边界过宽

#### 问题

[svc/unified-core/src/main.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/main.rs) 承载 IAM、Flow、File、Communication、Notification、Mail、IM、Tenant、Plugin、Master、Ticket、Search、Dict、Audit 等 14+ 子系统。虽然已外迁部分业务模块，但核心仍过重：

- **单点故障**：unified-core 宕机 → 认证、插件注册、导航、工单全部失效。
- **编译耦合**：任一模块改动触发整个 unified-core 重编译（3-5 分钟）。
- **资源争抢**：File 大文件上传与 IAM 认证争抢连接池。

#### 思路

**"可拆即拆，不可拆则隔离"**：

1. **可拆模块外迁**：Notification/Mail/IM 组成 `svc/communication`（已规划）；File 独立为 `svc/file`；Search 独立为 `svc/search`。
2. **不可拆模块隔离**：unified-core 内部按模块划分独立连接池、独立线程池、模块级熔断，避免局部故障扩散。
3. **插件化下沉**：非核心模块（Dict/Audit）以内部插件形式加载，支持热启停。

#### 依据

- **康威定律**：服务边界应匹配组织结构，14 个子系统对应多个团队，不应挤在一个进程。
- **微服务单一职责**：一个服务应可被一个团队独立维护。
- 已有 `tenant_plugins` 插件框架可复用于内部模块热加载。
- File 服务的大文件上传与 IAM 的高频小请求，资源画像差异大，适合拆分。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 中高。拆分涉及跨服务调用改造，需保证平滑迁移 |
| 改造规模 | XL（>20 人天），建议分模块逐步拆 |
| 兼容性 | 通过 Portal BFF 代理保持 API 路径不变，前端无感 |
| 回滚风险 | 中。需灰度切流 |

#### 原则

- **渐进拆分**：一次拆一个模块，验证稳定再拆下一个。
- **API 不变**：通过 BFF/网关保持对外路径不变，内部调用走服务发现。
- **故障隔离**：拆分后模块故障不扩散，unified-core 仅保留 IAM/Flow/Tenant/Plugin 不可卸载核心。

#### 步骤

1. **【2 天 评估】** 梳理各模块调用关系（跨模块 RPC/DB 调用），确定拆分优先级与依赖解耦方案。
2. **【3 天 File 外迁】** File 模块独立为 `svc/file`，通过 `SmartServiceClient` 调用，Portal BFF 代理路径不变。
3. **【3 天 Communication 外迁】** Notification/Mail/IM 合并为 `svc/communication`，事件总线保持不变。
4. **【2 天 Search 外迁】** Search 模块独立，复用 Redis 向量索引。
5. **【2 天 模块级熔断】** unified-core 内部引入 `tower::limit::ConcurrencyLimit` 与熔断器，按模块隔离连接池。
6. **【测试】** 混沌测试：模拟 File 服务宕机，验证 IAM/Flow 仍可用。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：File 服务独立后可按存储量计费，Communication 可按消息量计费，支撑精细化商业化。
- **阶段部署**：先 File（低耦合），再 Communication（中耦合），最后 Search。每个模块独立上线，互不阻塞。
- **未来扩展**：unified-core 最终收敛为"IAM + Flow + Tenant + Plugin"四个不可卸载核心，其余全部插件化，支持按租户按需启停。

---

### 4.3 微服务粒度与运维成本

#### 问题

20+ 独立 Rust 服务，多数业务服务（CRM/HRM/QMS/WMS/PM 等）仅 1-2 个子模块、基础 CRUD，独立部署价值有限但带来：

- 每服务一个 Dockerfile + 端口 + 进程，本地/CI 启动开销大。
- 共享同一 PostgreSQL 实例，Schema 隔离虽在但单库故障影响面大。
- 运维成本（监控、日志、部署）随服务数线性增长。

#### 思路

**"域服务聚合"**：按业务域将低频/轻量服务合并为"域服务"进程：

| 域 | 聚合服务 | 包含模块 |
|----|---------|---------|
| 制造域 | `svc/manufacturing` | MES + PDM + QMS |
| 供应链域 | `svc/supply-chain` | SCM + WMS + SRM |
| 质量研发域 | `svc/quality-rd` | LIMS + EHS + RS |
| 协同域 | `svc/collaboration` | HRM + PM + CRM |

每个域服务内部仍按模块组织代码，但共享进程与端口（通过路由前缀区分）。

#### 依据

- **领域驱动设计（DDD）**：限界上下文应匹配业务域，而非技术分层。
- 单进程多模块可减少 60%+ 进程数，降低运维成本。
- Module Federation 微前端已按业务域组织，后端域服务与之对齐。
- 现有 `scripts/topems.sh` + Docker Compose profile 可平滑支持域服务分组启停。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 中。合并进程需处理端口/路由/资源隔离 |
| 改造规模 | XL（>20 人天），建议按域逐步合并 |
| 兼容性 | 高。API 路径不变，仅进程合并 |
| 回滚风险 | 中。可灰度切流 |

#### 原则

- **域内高内聚、域间低耦合**：同域模块常有跨表查询，合进程减少跨服务调用。
- **独立可扩展**：高频域（如制造）可单独扩容，不影响其他域。
- **数据隔离不退步**：域服务内仍按 Schema 隔离各模块数据。

#### 步骤

1. **【1 周 评估】** 分析各服务调用关系与资源画像，确定域划分与合并优先级。
2. **【1 周 协同域试点】** 合并 HRM + PM + CRM 为 `svc/collaboration`，验证路由聚合与进程内模块隔离。
3. **【1 周 制造域】** 合并 MES + PDM + QMS。
4. **【1 周 供应链域 + 质量研发域】** 完成剩余域合并。
5. **【持续】** 评估独立数据库按域分库，降低单库风险。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：域服务对应"行业套件"（制造套件、供应链套件），可按域打包售卖。
- **阶段部署**：先协同域（改动小），再制造域（价值高），最后供应链与质量研发。
- **未来扩展**：域服务可独立部署到客户私有环境（混合云），支持大客户数据主权要求。

---

### 4.4 共享库 topems_shared 膨胀

#### 问题

[lib/src/lib.rs](file:///Users/xingzhai/TOPEMS/lib/src/lib.rs) 导出 40+ 模块（auth/database/cache/response/schema/rls/tenant/permission/middleware/service_config/service_discovery/service_client/event/telemetry/monitoring/health/encryption/ai_client/embedding/vector_store...）。任何共享库修改触发所有 20+ 服务全量重编译（本地 8-12 分钟，CI 更久）。

#### 思路

**拆分为 feature-gated 子 crate**：

| 子 crate | 包含模块 | 典型依赖方 |
|----------|---------|-----------|
| `topems-core` | auth, database, cache, response, schema, rls, tenant, permission | 所有服务 |
| `topems-infra` | telemetry, monitoring, health, service_discovery, service_config | 所有服务 |
| `topems-comm` | event, notification, messaging | 需事件总线的服务 |
| `topems-ai` | ai_client, embedding, vector_store | AI 服务、搜索服务 |
| `topems-security` | encryption, audit | 需字段加密的服务 |

各服务按需引入，`topems-ai` 改动不再触发 GIS 服务重编译。

#### 依据

- **Rust workspace + feature flags** 是管理共享代码的标准模式。
- `Cargo` 的增量编译仅在同 crate 边界内有效，拆 crate 可显著缩小重编译范围。
- 行业实践：Tokio、Azure SDK 均采用多 crate workspace 而非单体 lib。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 中。拆 crate 涉及大量 `use` 路径调整 |
| 改造规模 | L（5-10 人天） |
| 兼容性 | 高。对外 API 不变，仅内部组织调整 |
| 回滚风险 | 低。可逐模块拆分验证 |

#### 原则

- **按依赖方向拆分**：底层（core）不依赖上层（ai/comm）。
- **最小依赖**：服务只引入实际使用的子 crate。
- **版本同步**：子 crate 统一版本号，避免版本漂移。

#### 步骤

1. **【1 天 依赖分析】** 用 `cargo tree` 分析各模块依赖关系，确定拆分边界。
2. **【2 天 topems-core】** 拆出基础模块，调整 `use` 路径。
3. **【1 天 topems-infra】** 拆出基础设施模块。
4. **【1 天 topems-ai / topems-comm / topems-security】** 拆出可选模块。
5. **【1 天 编译验证】** 全量编译，确认重编译范围缩小。
6. **【持续】** CI 增加编译时间监控，回归验证。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：子 crate 可独立版本化，未来开源部分能力（如 `topems-core`）作为 Rust 生态贡献。
- **阶段部署**：先 `topems-ai`（收益最大），再 `topems-comm`，最后 `topems-security`。
- **未来扩展**：子 crate 可发布到私有 crates.io，支持外部插件复用平台能力。

---

## 5. 工程效能类短板（P2/P3，持续改进）

### 5.1 前后端类型不同步

#### 问题

- 前端 `packages/shared-types` 与后端 Rust struct 独立维护，无自动同步。
- API URL 手工维护在 `apps/web/src/api/` 各模块，容易与后端路径漂移（如本次 SLA 断点即为此类问题）。
- 后端 `utoipa` 已能生成 OpenAPI，但前端未消费。

#### 思路

**OpenAPI 驱动的类型同步**：

1. 后端 CI 生成 `openapi.yaml`（utoipa 已集成）。
2. 前端 CI 用 `openapi-typescript` 生成 TS 类型，与 `packages/shared-types` 对比。
3. 差异时 CI 失败，强制前后端同步提交。

#### 依据

- **OpenAPI 3.0** 是 API 契约的事实标准。
- `openapi-typescript`（hey-api/openapi-ts）已成熟，支持 React Query hooks 自动生成。
- 行业实践：Stripe、Linear 均采用 OpenAPI 驱动的前后端类型同步。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 低。工具链成熟 |
| 改造规模 | M（3-5 人天） |
| 兼容性 | 高。生成的类型可渐进替换手写类型 |
| 回滚风险 | 极低 |

#### 原则

- **单一真理源**：后端 OpenAPI 是类型唯一来源。
- **CI 强制**：类型漂移即构建失败。

#### 步骤

1. **【1 天 后端注解补全】** 核心模块（IAM/Ticket/Flow）补全 `#[derive(ToSchema)]`。
2. **【1 天 CI 生成】** 后端 CI 构建后导出 `openapi.yaml` 至前端仓库。
3. **【1 天 前端生成】** 前端 CI 用 `openapi-typescript` 生成类型，替换手写。
4. **【1 天 契约测试】** 核心路径增加端到端契约测试（如 `schemathesis`）。
5. **【0.5 天 监控】** CI 增加 API 路径一致性检查脚本。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：OpenAPI 文档可自动生成 API 市场页面，降低客户集成门槛。
- **阶段部署**：先核心模块，再业务模块，最后全覆盖。
- **未来扩展**：基于 OpenAPI 自动生成 SDK（多语言），开放平台能力。

---

### 5.2 Vite Proxy 配置仍偏手动

#### 问题

`apps/web/vite.config.ts` 中仍有数十条按服务硬编码的代理规则，每新增服务需同步修改 `ports.env`、`services.yaml`、`runtime.ts`、`vite.config.ts` 多处，易遗漏。

#### 思路

**单一配置源驱动**：从 `config/services.yaml` 自动生成 Vite proxy 规则，已有 `generateServiceProxies` 函数雏形，扩展为读取 YAML 循环生成。

#### 依据

- **DRY 原则**：服务配置应只维护一处。
- `config/services.yaml` 已是服务注册的单一真理源。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 极低 |
| 改造规模 | S（1-2 人天） |
| 兼容性 | 高 |
| 回滚风险 | 极低 |

#### 原则

- **配置即代码**：YAML 驱动，减少手工硬编码。

#### 步骤

1. **【0.5 天】** 完善 `generateServiceProxies` 读取 `services.yaml`。
2. **【0.5 天】** 移除 `vite.config.ts` 中硬编码规则，替换为函数生成。
3. **【0.5 天】** 新增服务仅需修改 `services.yaml` 一处，验证全链路。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：降低新服务接入成本，加速模块扩展。
- **阶段部署**：一次性迁移。
- **未来扩展**：配置驱动可延伸至 Nginx/K8s Ingress 规则自动生成。

---

## 6. 产品完整度类短板（P3，规划补齐）

### 6.1 模块实现深度不均衡

#### 问题

- ERP、Flow、AI 实现较完整；CRM、HRM、PM、QMS、WMS、MES 等多数服务仅基础 CRUD。
- 前端声明 20+ 模块，部分页面仍使用 mock 或 TODO 占位。
- Portal BFF 部分接口仍为硬编码 mock。

#### 思路

**"MVP 能力清单 + 优先级排序"**：

1. 定义每个业务模块的 MVP 能力清单（如 CRM 的客户/联系人/商机/合同四件套）。
2. 按客户需求与商业价值排序，优先补齐高频模块。
3. 清理前端 mock 与 TODO，明确无后端支撑的模块去留。

#### 依据

- **MVP 原则**：先交付核心价值，再迭代扩展。
- 客户需求驱动优先级，避免技术自嗨。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 低。逐模块补齐 |
| 改造规模 | XL（持续投入） |
| 兼容性 | 高 |
| 回滚风险 | 极低 |

#### 原则

- **价值优先**：高使用频率模块先补齐。
- **去伪存真**：无后端支撑的 mock 页面要么补齐要么删除。

#### 步骤

1. **【1 周 清单定义】** 各模块 MVP 能力清单与现状 gap 分析。
2. **【按优先级迭代】** 每两周一个模块 MVP 补齐，前端去 mock。
3. **【持续】** Portal BFF 接入真实服务数据，替代硬编码。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：模块完整度直接影响可售卖性，按行业套件打包（制造套件、供应链套件）。
- **阶段部署**：先协同域（HRM/PM/CRM），再制造域（MES/PDM/QMS）。
- **未来扩展**：模块完整度达标后开放插件市场，第三方可扩展行业垂直能力。

---

### 6.2 桌面端与移动端薄弱

#### 问题

- Desktop（Tauri）是独立简化实现，与 Web 端割裂，缺少 IAM/工作流/文件等核心能力。
- Mobile（React Native / Expo）与 Web 技术栈差异大，代码复用率低。

#### 思路

- **Desktop 改为 Web 套壳**：Tauri 加载 `apps/web` 构建产物，统一功能与发布节奏。
- **Mobile 短期共享类型与工具**：复用 `packages/shared-types` 与 `packages/shared-utils`；中期评估 React Native Web 或跨平台组件库。

#### 依据

- **Electron/Tauri 套壳模式**：VS Code、Slack 验证可行，维护成本远低于独立实现。
- React Native Web 可复用 80%+ 业务逻辑代码。

#### 可行性

| 维度 | 评估 |
|------|------|
| 技术风险 | 中。Mobile 跨平台方案选型需验证 |
| 改造规模 | L（Desktop 1 周；Mobile 评估+试点 2-3 周） |
| 兼容性 | 高。Desktop 套壳不影响 Web |
| 回滚风险 | 低 |

#### 原则

- **四端一致**：核心功能在 Web/Desktop/Mobile 体验对齐。
- **最大化复用**：能共享的代码不重复实现。

#### 步骤

1. **【1 周 Desktop 套壳】** Tauri 加载 Web 构建产物，增加原生菜单与文件系统访问桥接。
2. **【1 周 Mobile 评估】** 调研 React Native Web vs 现有 Expo 方案，确定技术路线。
3. **【2 周 Mobile 试点】** 核心页面（工单、审批、通知）跨平台复用。

#### 增值运营 / 阶段部署 / 未来扩展

- **增值运营**：四端齐全是企业数字化平台的硬需求，影响大客户采购决策。
- **阶段部署**：先 Desktop 套壳（快），再 Mobile 试点。
- **未来扩展**：Mobile 可扩展离线模式、推送通知、扫码等原生能力。

---

## 7. 已闭环短板（V51.0 修复验证）

### 7.1 工单 SLA 前后端断点（已修复 ✅）

#### 修复验证

| 问题 | 修复 | 证据 |
|------|------|------|
| Portal BFF 未代理 SLA 路径 | 已注册全部 SLA 代理路由 | [svc/portal/src/main.rs#L341-L370](file:///Users/xingzhai/TOPEMS/svc/portal/src/main.rs#L341-L370) |
| SLA 代理 handler 缺失 | 已实现全部 handler | [svc/portal/src/modules/tickets.rs#L248-L400](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/tickets.rs#L248-L400) |
| 升级计算未对齐工作时间 | `check_and_escalate` 已复用 `calculate_due_time` | [sla_service.rs#L283-L291](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs#L283-L291) |

#### 遗留建议

- 补充 SLA 路径契约测试与集成测试，防止断点回归。
- 增加 `working_hours_only=true` 与 `weekend_excluded=true` 场景的升级点一致性回归测试。

---

## 8. 分阶段部署路线图

### 8.1 阶段划分

```
┌─────────────────────────────────────────────────────────────────────┐
│  阶段 0: 紧急安全止血（本周）  V16.2                                │
│  - 🔴 BI SQL 注入修复（P0）                                        │
│  - 🟠 JWT 默认密钥回退移除（P1 止血）                               │
│  - 🟡 插件 token 生产强制校验（P1）                                 │
│  - CI 集成 cargo-audit                                             │
├─────────────────────────────────────────────────────────────────────┤
│  阶段 1: 架构治理（本月-下月）  V17.0                              │
│  - 路由废弃路径下线（Sunset header + 迁移）                         │
│  - File 模块从 unified-core 外迁                                    │
│  - 前后端 OpenAPI 类型同步                                          │
│  - Vite Proxy 配置自动化                                            │
├─────────────────────────────────────────────────────────────────────┤
│  阶段 2: 安全深化（下季度）  V18.0                                 │
│  - JWT 迁移 RS256 + JWKS 密钥轮换                                   │
│  - Communication/Search 模块外迁                                    │
│  - 共享库拆分 feature crates                                        │
│  - 协同域服务聚合试点                                               │
├─────────────────────────────────────────────────────────────────────┤
│  阶段 3: 产品完整度（持续）  V19.0+                                │
│  - 业务模块 MVP 能力补齐（协同域→制造域→供应链域）                  │
│  - Desktop 改 Web 套壳                                              │
│  - Mobile 跨平台复用                                                │
│  - 域服务全面聚合 + 独立数据库评估                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 里程碑与验收标准

| 阶段 | 里程碑 | 验收标准 |
|------|--------|---------|
| V16.2 | 安全止血 | SQL 注入单测全过；prod 无默认密钥；CI cargo-audit 通过 |
| V17.0 | 架构治理 | 旧路径流量归零；File 外迁稳定；OpenAPI 类型同步 CI 通过 |
| V18.0 | 安全深化 | RS256 全服务切换；JWKS 轮换验证；共享库编译时间下降 40%+ |
| V19.0+ | 产品完整度 | 协同域 MVP 上线；Desktop 套壳发布；Mobile 核心页面跨平台 |

---

## 9. 增值运营与商业化建议

### 9.1 安全能力产品化

- **安全审计包**：将 SQL 注入防护、JWT 非对称加密、插件签名校验打包为"企业安全增强包"，作为高客单价增值项。
- **合规报告**：基于审计日志与 cargo-audit 输出，自动生成等保 2.0 / ISO 27001 合规报告。

### 9.2 行业套件商业化

- **制造套件**：MES + PDM + QMS 域服务打包，按产线数计费。
- **供应链套件**：SCM + WMS + SRM 域服务打包，按仓库数计费。
- **协同套件**：HRM + PM + CRM 域服务打包，按用户数计费。

### 9.3 平台化运营

- **插件市场**：基于插件白名单与签名校验，开放第三方插件上架，平台抽成。
- **数据集市场**：BI 白名单元数据演化为租户自助数据源注册，支撑自助分析 SaaS。
- **API 市场**：OpenAPI 文档自动生成 API 市场，降低客户集成成本，开放 SDK 下载。

### 9.4 部署模式多元化

- **SaaS 公有云**：多租户共享，按用量计费。
- **私有化部署**：域服务独立部署到客户环境，支持数据主权。
- **混合云**：核心数据私有化，AI/BI 分析公有云，兼顾安全与弹性。

---

## 10. 未来扩展架构演进

### 10.1 终态架构愿景

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong/APISIX)                │
│         统一路由 · 限流 · 认证 · API 市场                     │
├─────────────────────────────────────────────────────────────┤
│  unified-core (IAM + Flow + Tenant + Plugin)  ← 不可卸载核心 │
├─────────────────────────────────────────────────────────────┤
│  域服务: manufacturing | supply-chain | collaboration | ...  │
│  独立服务: file | communication | search | ai | bi | portal  │
├─────────────────────────────────────────────────────────────┤
│  共享库: topems-core | topems-infra | topems-comm |         │
│         topems-ai | topems-security  ← feature crates       │
├─────────────────────────────────────────────────────────────┤
│  数据层: 按域分库 · Redis 集群 · 事件总线 · 向量索引          │
│  身份层: RS256 + JWKS · OAuth 2.1 / OIDC · FIDO2             │
│  可观测: Prometheus + Jaeger + Loki + Alertmanager           │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 关键演进方向

| 方向 | 近期 | 中期 | 远期 |
|------|------|------|------|
| **身份** | 移除默认密钥 | RS256 + JWKS | OAuth 2.1 / OIDC / FIDO2 |
| **安全** | SQL 注入修复 | 插件签名校验 | WASM 沙箱插件 |
| **架构** | File 外迁 | 域服务聚合 | 域级独立数据库 |
| **工程** | OpenAPI 类型同步 | 共享库拆分 | API Gateway 统一治理 |
| **产品** | 模块 MVP 补齐 | 四端对齐 | 插件市场 + 数据集市场 |
| **运营** | 安全增强包 | 行业套件 | 混合云部署 |

### 10.3 技术债务治理原则

1. **新功能不让旧债恶化**：新增代码必须符合新规范（新路径、参数化查询、RS256）。
2. **每次迭代偿还一点**：每个版本预留 20% 容量处理技术债务。
3. **CI 即治理**：路径规范、类型同步、cargo-audit 全部 CI 卡点，自动阻止债务回归。

---

## 附录：短板与代码位置索引

| 短板 | 关键代码位置 |
|------|------------|
| BI SQL 注入 | [chart_service.rs#L103](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/chart_service.rs#L103), [multidimensional_analysis.rs#L332](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/multidimensional_analysis.rs#L332) |
| JWT HS256 | [auth.rs#L69-L96](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs#L69-L96) |
| 插件 token 放行 | [runtime.rs#L14-L23](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23) |
| 路由遗留债务 | [routes/mod.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/mod.rs) `register_routes_with_legacy_alias` |
| unified-core 职责 | [main.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/main.rs) |
| 共享库膨胀 | [lib/src/lib.rs](file:///Users/xingzhai/TOPEMS/lib/src/lib.rs) |
| 前后端类型 | [packages/shared-types](file:///Users/xingzhai/TOPEMS/packages/shared-types), [utoipa](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/main.rs) |
| Vite Proxy | [vite.config.ts](file:///Users/xingzhai/TOPEMS/apps/web/vite.config.ts) |
| SLA（已修复） | [sla_service.rs#L283-L291](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs#L283-L291), [portal main.rs#L341-L370](file:///Users/xingzhai/TOPEMS/svc/portal/src/main.rs#L341-L370) |

---

*本报告由 TOPEMS 架构分析生成，最后更新于 2026-07-24*
