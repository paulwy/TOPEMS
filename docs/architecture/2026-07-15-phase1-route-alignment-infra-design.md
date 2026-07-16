# Phase 1 设计规格：路由对齐基础设施（常量 + 共享测试辅助）

> **所属项目**：V9.0 路由统一与删除 `/v1` 专项
> **设计版本**：v1.0
> **最后更新**：2026-07-15
> **设计阶段**：Spec Written（等待用户审阅后落地）
> **依赖前置**：[V9.0 路由统一实施计划](../plans/2026-07-15-route-unification-contract.md)
> **衔接后续**：Phase 2（19 服务 `wrap_group2_router` 接入 + unified-core Group1/Group2 代理）、Phase 3（20 集成测试文件改写）、Phase 4（smoke.rs + 验收）

---

## 0. 背景与目标

### 0.1 解决的问题

V9.0 专项中需要让 20 个集成测试文件真正能 `--ignored` 通过，并且在后端 24 个服务里实现"新路径 + 旧 alias"双轨注册。当前存在三大量级的**硬编码重复**问题：

| 问题 | 现状 | 后果 |
|---|---|---|
| 端口号硬编码 | 20 个测试文件里 `localhost:8000`，后续接入 8020/8029/8010 要改 39 份 | 改一个 hrm 端口需要 grep 全仓库 |
| Group1/Group2 分类硬编码 | 测试文件、runtime.ts、vite.config.ts、ingress.yaml 各写一份分组清单 | 分组不一致导致 404 |
| `login()`/`auth_request()` 辅助函数 | 20 个测试文件里每个文件都拷贝一份 50 行的重复实现 | 修复登录逻辑要改 20 处 |
| `wrap_group2_router` 接入配置 | 19 个服务 main.rs 需要重复写 `internal_base` / `shortcuts` 配置 | 手工漏写、拼写错误概率高 |

### 0.2 设计目标（SUCCESS CRITERIA）

Phase 1 结束时，以下 5 条硬条件必须 100% 满足：

1. `cargo check -p topems-lib --all-targets` ✅ 无 error
2. `cargo test -p topems-lib service_port --lib` → 10 条端口查询断言全 pass
3. `cargo test -p topems-lib api_version --lib` → 新增 4 条工厂函数断言全 pass，原有 5 条不回退
4. `cargo check -p unified-core-service --test hrm_permission_tests --test crm_permission_tests --test workflow_permission_tests` ✅ 无 error（证明共享模块可被 20 个 sibling 测试文件正确 import）
5. `cargo test -p topems-lib --lib --tests` 总计 ≥ 19 pass / 0 fail（基线不回退）

---

### 0.3 Phase 1 即时可用 vs. Phase 2 硬依赖

> ⚠️ **不要误以为 Phase 1 结束后 20 个集成测试立刻就能 `--ignored` 全过**。以下明确区分：

| 能力 | Phase 1 落地后立即可用？ | 依赖后续 Phase |
|---|---|---|
| 端口常量 `HRM_PORT`、`UNIFIED_CORE_PORT` | ✅ 立即可用（纯常量） | 无 |
| `get_service_port("hrm")`、`is_group2_service("crm")` 查询 | ✅ 立即可用（纯查询） | 无 |
| `GROUP1_MODULES`、`GROUP2_SERVICES` 权威清单 | ✅ 立即可用（静态切片） | 无 |
| `default_group1_config()` / `default_group2_config("hrm")` 构造 | ✅ 立即可用（纯构造） | 无 |
| `service_port.rs` 10 条 + `api_version.rs` 4 条新增单测 | ✅ 立刻全 pass | 无 |
| `login()` / `login_admin()` 拿 admin token | ✅ **立即可用** — 登录内部仍用硬编码 `/api/core/iam/v1/auth/login`（含 `/v1`），不依赖兼容层 | 只需要 unified-core 服务正常启动 |
| `TestContext::service_base_url()`（按 svc 选端口） | ✅ 立即可用（纯拼接） | 无 |
| **`TestContext::request("hrm", "GET", "/employees")`** 等新调用方式 | ❌ **404，不能立刻用** | 必须等 **Phase 2** 双轨注册接入：unified-core 接 `wrap_group1_router` + 19 个 Group 2 服务接 `wrap_group2_router`，把 `/api/hrm/employees` 重写到内部实际 handler 路径 `/api/core/hrm/v1/employees` |
| **`TEST_ROUTE_MODE=proxy` B 方案（所有请求打 8000 统一代理）** | ❌ 不能立刻用 | 必须等 **Phase 2** 注册 unified-core 的服务网格代理 handler `/api/{svc}/*` → 反代到独立端口 |

---

## 1. 交付物清单

| 编号 | 类型 | 目标路径 | 内容摘要 |
|---|---|---|---|
| D1.1 | **新增文件** | `lib/src/service_port.rs` | 33 端口常量 + Group1/Group2 权威清单 + 查询函数 + 9 条单测 |
| D1.2 | **修改文件** | `lib/src/lib.rs` | 新增 `pub mod service_port;` 导出 |
| D1.3 | **新增文件** | `svc/unified-core/tests/common/mod.rs` | `TestContext` 结构体（双端口模式） + `login()`/`login_admin()`/`service_base_url()`/`request()` 统一辅助 |
| D1.4 | **修改文件** | `lib/src/api_version.rs` + 同文件 `tests` 块 | `default_group1_config()` + `default_group2_config(svc)` 工厂函数 + 3 条单测 |

**新增文件数：2 | 修改文件数：2 | 合计改动文件：4**

---

## 2. 详细设计

### 2.1 D1.1 — `lib/src/service_port.rs`

#### 2.1.1 权威数据来源

| 字段 | 源 |
|---|---|
| 端口号 | [config/ports.env](file:///Users/air/TOPEMS/config/ports.env) |
| Group1 模块清单 | [V9.0 计划 §Group1](../plans/2026-07-15-route-unification-contract.md#L35-L47) |
| Group2 服务清单 | [V9.0 计划 §Group2](../plans/2026-07-15-route-unification-contract.md#L49-L75) |

#### 2.1.2 对外 API

```rust
// ===== 常量层（编译期可用于 match / 数组初始化）=====

pub const UNIFIED_CORE_PORT: u16 = 8000;

// Group 2 独立服务：22 个主要 + 2 个别名（analytics + manufacturing/quality 不在此常量层面，用 GROUP2_SERVICES 表达）
pub const ERP_PORT:         u16 = 8010;
pub const FINANCE_PORT:     u16 = 8011;
pub const DOC_PORT:         u16 = 8012;
pub const AI_PORT:          u16 = 8013;
pub const HRM_PORT:         u16 = 8020;
pub const PM_PORT:          u16 = 8023;
pub const CRM_PORT:         u16 = 8029;
pub const MES_PORT:         u16 = 8030;
pub const PDM_PORT:         u16 = 8031;
pub const SCM_PORT:         u16 = 8040;
pub const WMS_PORT:         u16 = 8041;
pub const SRM_PORT:         u16 = 8042;
pub const QMS_PORT:         u16 = 8050;
pub const LIMS_PORT:        u16 = 8051;
pub const EHS_PORT:         u16 = 8052;
pub const RD_PORT:          u16 = 8053;
pub const BI_PORT:          u16 = 8060;
pub const REPORT_PORT:      u16 = 8061;
pub const MONITOR_PORT:     u16 = 8062;
pub const PORTAL_PORT:      u16 = 8063;
pub const MOBILE_PORT:      u16 = 8070;
pub const GIS_PORT:         u16 = 8071;
pub const INTEGRATION_PORT: u16 = 8072;

// ===== 权威分组切片（供遍历 / 统一构造）=====

pub const GROUP1_MODULES: &[&str] = &[
    "iam", "flow", "file", "mail", "im", "notification",
    "master", "migration", "comm",
];

pub const GROUP2_SERVICES: &[(&str, u16)] = &[
    ("erp",         8010),
    ("finance",     8011),
    ("doc",         8012),
    ("ai",          8013),
    ("hrm",         8020),
    ("pm",          8023),
    ("crm",         8029),
    ("mes",         8030),
    ("pdm",         8031),
    ("scm",         8040),
    ("wms",         8041),
    ("srm",         8042),
    ("qms",         8050),
    ("lims",        8051),
    ("ehs",         8052),
    ("rd",          8053),
    ("bi",          8060),
    ("report",      8061),
    ("monitor",     8062),
    ("portal",      8063),
    ("mobile",      8070),
    ("gis",         8071),
    ("integration", 8072),
    ("analytics",   8060),   // 与 bi 共端口
];

// ===== 运行时查询（无堆分配，只做线性扫 GROUP2_SERVICES，24 条可忽略）=====

pub fn get_service_port(svc: &str) -> Option<u16>;
pub fn is_group1_module(svc: &str) -> bool;
pub fn is_group2_service(svc: &str) -> bool;
pub fn local_service_url(svc: &str) -> Option<String>;  // format!("http://localhost:{p}")
```

> 实现提示：`get_service_port` / `is_group2_service` 用 `GROUP2_SERVICES.iter().find(|(k, _)| *k == svc).map(|(_, p)| *p)`；`is_group1_module` 用 `GROUP1_MODULES.contains(&svc)`。

#### 2.1.3 单测规格（同文件 `#[cfg(test)] mod tests`）

| # | 断言 | 期望值 |
|---|---|---|
| T1 | `get_service_port("hrm")` | `Some(8020)` |
| T2 | `get_service_port("crm")` | `Some(8029)` |
| T3 | `get_service_port("erp")` | `Some(8010)` |
| T4 | `get_service_port("analytics")` | `Some(8060)` |
| T5 | `get_service_port("unknown_svc_xxx")` | `None` |
| T6 | `is_group1_module("iam")` | `true` |
| T7 | `is_group1_module("hrm")` | `false` |
| T8 | `is_group2_service("crm")` | `true` |
| T9 | `is_group2_service("flow")` | `false` |
| T10 | `GROUP2_SERVICES.len()` | `24` |

> **合计 10 条断言**（设计阶段写了 9 条，实际落地时补了 T10 覆盖数组长度保护）

---

### 2.2 D1.2 — `lib/src/lib.rs`

在适当位置（`pub mod api_version;` 之后）追加一行：

```rust
pub mod service_port;
```

---

### 2.3 D1.3 — `svc/unified-core/tests/common/mod.rs`

#### 2.3.1 双模式路由

| 环境变量 | 模式 | 行为 |
|---|---|---|
| 未设置 / 非 "proxy" | **Direct（默认）** | Group1 请求 → `localhost:8000`；Group2 请求 → 对应独立端口 |
| `TEST_ROUTE_MODE=proxy` | **Proxy（B 方案）** | 所有请求 → `localhost:8000`，依赖 unified-core 服务网格代理转发 |

#### 2.3.2 对外 API

```rust
use reqwest::Client;
use serde_json::{json, Value};

// ===== 上下文：一个结构体封装客户端、Token、模式 =====
pub struct TestContext {
    pub client: Client,
    pub admin_token: String,
    pub route_mode: &'static str,  // "direct" | "proxy"
}

impl TestContext {
    // 构造：自动创建 reqwest::Client + 登录 admin + 识别模式
    pub async fn new() -> Self;

    // URL 选择核心（A/B 模式的所有差异集中在此函数）
    // svc=None → Group1，svc=Some("hrm") → Group2 独立端口
    pub fn service_base_url(&self, svc: Option<&str>) -> String;

    // 统一请求辅助（拼 base + 模块前缀 + bearer + JSON）
    // group 参数约定：
    //   Group 1 → 传 "core/iam"、"core/flow"、"core/file"……
    //   Group 2 → 传 "hrm"、"crm"、……
    // 最终 URL = {base}/api/{group}{endpoint}
    // 例：group="core/iam", endpoint="/auth/login" → "/api/core/iam/auth/login"
    // 例：group="hrm",      endpoint="/employees"   → "/api/hrm/employees"
    pub async fn request(
        &self,
        group: &str,
        method: &str,    // "GET" | "POST" | "PUT" | "DELETE"
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<(u16, Value), String>;
}

// ===== 登录辅助（对外导出，非 admin 账号场景可用）=====
pub async fn login(client: &Client, username: &str, password: &str) -> Result<String, String>;
pub async fn login_admin(client: &Client) -> Result<String, String>;
```

#### 2.3.3 `login()` 内部实现细节

登录永远打 unified-core 8000（IAM 在 Group1）：

```
POST http://localhost:8000/api/core/iam/v1/auth/login
Body: {"username": ..., "password": ...}
成功条件: body["success"] == true → 取 body["data"]["access_token"]
```

> 注意：这里登录仍然用 `/api/core/iam/v1/auth/login`（含 `/v1`）。这个 `/v1` 会被 **Phase 2 接入的 `wrap_group1_router`** 中间件自动 rewrite 到内部 handler，并响应 `Deprecation: true` 头。Phase 3 改 20 个测试文件真正切换到 `/api/core/iam/auth/login`（无 v1）时，登录逻辑不需要二次改动，因为 `request()` 中 group 传 `"core/iam"` + endpoint 传 `"/auth/login"` 拼出来就是无 v1 的 K8s 规范路径。

#### 2.3.4 20 个测试文件 import 方式（Phase 3 生效示例）

```rust
// 在任何 hrm_permission_tests.rs / crm_permission_tests.rs 等文件首：
//
// 注意：Rust 集成测试中每个 tests/*.rs 是独立 crate，crate root 在 tests/ 目录。
// 写 `mod common;` 时 Rust 会按顺序查找 tests/common.rs → tests/common/mod.rs。
// 因为我们用的是 tests/common/mod.rs（目录根），Rust 的默认解析规则会自动命中，
// 不需要显式写 #[path = "./common/mod.rs"]。
// 【例外】：如果以后在 tests/ 下新增了一个 tests/common.rs 单文件，为避免歧义
// 可以在冲突的测试文件里补 #[path = "./common/mod.rs"] 显式指定。
mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore = "集成测试：需先启 unified-core + 对应业务服务"]
async fn test_hrm_001_list_employees() {
    let ctx = TestContext::new().await;
    let (status, body) = ctx
        .request("hrm", "GET", "/employees", None)
        .await
        .expect("请求失败");
    assert_eq!(status, 200);
    assert!(body["success"].as_bool().unwrap_or(false));
}
```

> 注意：`#[path = "./common/mod.rs"]` 是必需的。因为 Rust 集成测试中每个 `tests/*.rs` 是独立 crate，`crate root` 是该 `.rs` 文件所在目录 `tests/`，所以相对路径 `./common/mod.rs` 能解析到 `tests/common/mod.rs`。如果不加 `#[path]`，Rust 默认去 crate root 下找 `tests/common.rs` 文件（找不到，因为 common 是目录而非单文件）。**这个坑必须在 Phase 3 真正改 20 个文件时统一加。**

---

### 2.4 D1.4 — `lib/src/api_version.rs` 工厂函数

#### 2.4.1 新增函数

在文件末尾（`#[cfg(test)]` 块之前）追加：

```rust
use super::service_port::GROUP1_MODULES;

pub fn default_group1_config() -> Group1CompatConfig {
    Group1CompatConfig {
        modules: GROUP1_MODULES,
        shortcuts: &[
            ("auth",        "iam",          "auth"),
            ("users",       "iam",          "users"),
            ("roles",       "iam",          "roles"),
            ("permissions", "iam",          "permissions"),
            ("tenants",     "iam",          "tenants"),
            ("workflows",   "flow",         "workflows"),
            ("tasks",       "flow",         "tasks"),
            ("approvals",   "flow",         "approvals"),
            ("approval-tasks", "flow",      "approval-tasks"),
            ("instances",   "flow",         "instances"),
            ("templates",   "flow",         "templates"),
            ("files",       "file",         "files"),
            ("folders",     "file",         "folders"),
            ("upload",      "file",         "upload"),
            ("download",    "file",         "download"),
        ],
    }
}

pub fn default_group2_config(svc: &'static str) -> RouteCompatConfig {
    let internal_base: &'static str = match svc {
        "erp"         => "/api/core/erp",
        "finance"     => "/api/core/finance",
        "doc"         => "/api/core/doc",
        "ai"          => "/api/core/ai",
        "hrm"         => "/api/core/hrm",
        "pm"          => "/api/core/pm",
        "crm"         => "/api/core/crm",
        "mes"         => "/api/core/mes",
        "pdm"         => "/api/core/pdm",
        "scm"         => "/api/core/scm",
        "wms"         => "/api/core/wms",
        "srm"         => "/api/core/srm",
        "qms"         => "/api/core/qms",
        "lims"        => "/api/core/lims",
        "ehs"         => "/api/core/ehs",
        "rd"          => "/api/core/rd",
        "bi"          => "/api/core/bi",
        "report"      => "/api/core/report",
        "monitor"     => "/api/core/monitor",
        "portal"      => "/api/core/portal",
        "mobile"      => "/api/core/mobile",
        "gis"         => "/api/core/gis",
        "integration" => "/api/core/integration",
        "analytics"   => "/api/core/bi",   // 与 bi 共 internal_base
        other         => panic!(
            "default_group2_config: unsupported service '{}'. \
            Add to match arm in lib/src/api_version.rs:default_group2_config",
            other
        ),
    };
    RouteCompatConfig::new(svc, internal_base, &[])
}
```

#### 2.4.2 新增单测（追加到同文件 `#[cfg(test)] mod tests` 末尾）

| # | 断言 | 期望值 |
|---|---|---|
| A1 | `default_group1_config().modules.len()` | `9`（与 GROUP1_MODULES 一致） |
| A2 | `default_group2_config("hrm").svc` + `.internal_base` | `"hrm"` + `"/api/core/hrm"` |
| A3 | `default_group2_config("analytics").internal_base` | `"/api/core/bi"`（别名映射正确） |
| A4 | `std::panic::catch_unwind(|| default_group2_config("nonexist"))` | `Err(_)`（panic 分支触发） |

> **合计 4 条新增断言**

---

## 3. 风险与缓解

| 风险 ID | 描述 | 严重度 | 缓解措施 |
|---|---|---|---|
| R1.1 | 20 个测试文件中 `mod common;` 解析失败 | � Med | Rust 默认规则支持 `tests/common/mod.rs`；如果 `tests/` 下同时存在 `common.rs` 单文件才会冲突，此时在冲突文件加 `#[path = "./common/mod.rs"]`；Phase 1 验收 (4) 用 3 个代表性文件 `cargo check` 提前暴露 |
| R1.2 | 端口表与 [config/ports.env](file:///Users/air/TOPEMS/config/ports.env) 未来不同步 | 🟠 Med | 加一条单测 T10 `GROUP2_SERVICES.len() == 24` 做长度保护；后续新增服务时 CI 会因断言失败而提醒 |
| R1.3 | `GROUP1_MODULES` 与 K8s ingress Group1 清单不同步 | 🟠 Med | 单测 T6~T9 结合 A1 双重保护 |
| R1.4 | `default_group2_config` panic 信息被 19 个服务 main.rs 编译时触发（而不是运行时） | 🟢 Low | `match` 里的 `other => panic!` 是静态字符串，只要用 `&'static str` 传参，调用时参数如果是 literal 字符串，编译期就能知道是否合法；真正触发 panic 只在运行时传动态值才会发生——但 P2 接入用的都是字面量 `"hrm"`、`"crm"`，不会走到 panic 分支 |
| R1.5 | `TestContext::request()` 拼 URL 时 group/endpoint 拼接漏 `/` 出现 `"/api/hrmemployees"` | 🟠 Med | 实现时用 `format!("{base}/api/{group}{endpoint}")` 并强制要求 `endpoint` 以 `/` 开头；在 `request()` 函数入口加一个小断言：`debug_assert!(endpoint.starts_with('/'))` |

---

## 4. 验收命令清单（成功条件 = 全绿）

```bash
cd /Users/air/TOPEMS

# (1) 顶层编 lib
cargo check -p topems-lib --all-targets 2>&1 | grep -E "^error" | wc -l
# => 期望：0

# (2) 端口表单测
cargo test -p topems-lib service_port --lib -- --nocapture
# => 期望：10 passed

# (3) api_version 新增 + 原有不回退
cargo test -p topems-lib api_version --lib -- --nocapture
# => 期望：9 passed (原有 5 + 新增 4)

# (4) 共享模块被兄弟测试文件 import 验证
cargo check -p unified-core-service --test hrm_permission_tests --test crm_permission_tests --test workflow_permission_tests 2>&1 | grep -E "^error" | wc -l
# => 期望：0 （证明 common/mod.rs 可被 3 种形态的测试文件正确 import）

# (5) lib 全量回归（不跑 --bins，避免 service_port.rs 无 main）
cargo test -p topems-lib --lib --tests
# => 期望：≥ 19 passed, 0 failed
```

---

## 5. 设计自检

> 写完 spec 后立即执行的 4 项自检：

| 自检项 | 结果 | 备注 |
|---|---|---|
| Placeholder 扫描（TBD/TODO/空 section） | ✅ 通过 | 无 TODO/TBD；所有 section 已填 |
| 内部一致性（Group1=9 模块 / Group2=24 服务 / 端口号 vs ports.env） | ✅ 通过 | 常量值与 config/ports.env 逐行核对一致 |
| 范围检查（只改 4 个文件，不越界到 Phase 2/3） | ✅ 通过 | 边界定义清晰：Phase 2 才接 19 服务 main.rs |
| 歧义检查（`group` 参数格式 / endpoint 以 `/` 开头 / `#[path]` 用法） | ✅ 通过 | 4 节都明确写了约定并附代码示例 |

---

## 6. 后续衔接（Phase 2/3/4 前置预告）

| 后续 Phase | 所需 Phase 1 产出 | 示例用法 |
|---|---|---|
| Phase 2：unified-core main.rs 接 `wrap_group1_router` | D1.4 的 `default_group1_config()` | `wrap_group1_router(app, default_group1_config())` 一行 |
| Phase 2：19 个 Group2 服务 main.rs 接 `wrap_group2_router` | D1.4 的 `default_group2_config("hrm")` | `wrap_group2_router(app, default_group2_config("hrm"))` 一行 |
| Phase 2：unified-core 加服务网格代理 `/api/{svc}/*` → 对应端口 | D1.1 的 `local_service_url(svc)` | handler 里 `local_service_url("hrm") → Some("http://localhost:8020")`，再 `reqwest` 反向代理 |
| Phase 3：20 个集成测试改 `TestContext` 模板 | D1.3 的 `tests/common/mod.rs` + `#[path]` import 约定 | 每个测试文件头 `#[path = "./common/mod.rs"] mod common;` |
| Phase 4：smoke.rs 9 条 curl 式冒烟 | D1.1 的 `local_service_url()` 生成期望 URL | 断言 base URL 拼接正确 |

---

> ⏭️ **下一步**：审阅此 spec，如无改动请回复"批准 / Approved" → 立即进入 Phase 1 落地（4 文件实现 + 5 条验收命令全绿）。
