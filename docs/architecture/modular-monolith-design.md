# TOPEMS 模块化单体设计（Modular Monolith Design）

> 状态：v0.2（Phase B 扩展完成 + P3 裁剪落地）
> 日期：2026-08-30
> 关联：`docs/architecture/TOPEMS_Architecture_Roadmap_v2.md` §1.2

## 1. 目标与动机

当前系统为 **32 个独立微服务**，运维复杂度高、私有化部署成本大。模块化单体（Modular Monolith）作为架构优化的核心方向，目标：

1. **统一部署形态**：`topems-server` 单进程可启动，降低私有化部署门槛
2. **保留模块边界**：7 个核心模块组，每组内部自治、组间通过 trait 接口调用
3. **渐进式迁移**：保留现有微服务部署模式作为 fallback，每个模块组独立迁移
4. **按需裁剪**：通过 Cargo feature flags 按模块组 / 按 tier 裁剪

## 2. 7 个核心模块组定义

将现有 32 个 svc 归入 7 个核心模块组：

| 模块组 | Feature Flag | 职责 | 成员服务 |
|--------|-------------|------|---------|
| **core** | `module-core` | 平台核心：IAM/文档/流程/文件/通信/监控/搜索/集成/门户 | unified-core, monitor, plugin-registry, search, communication, integration, portal, mobile, ticket |
| **erp** | `module-erp` | 企业资源：采购/销售/供应链/项目/研发/产品数据 | erp, scm, srm, pm, pdm |
| **finance** | `module-finance` | 财务：总账/凭证/应收应付/计费 | finance, billing |
| **crm** | `module-crm` | 客户关系：客户/商机/营销 | crm |
| **wms** | `module-wms` | 仓储制造：仓储/运输/制造执行/质量/环境安全/实验室 | wms, tms, mes, qms, ehs, lims, gis, rd |
| **advanced** | `module-advanced` | 高级数据：主数据/数据分析 | master-data, analytics |
| **ai** | `module-ai` | 智能：AI 中间层/Agent | ai |

> 注：`feedback` 已于 V2026.08 合并至 `ticket`（customer_feedback 类型）；`aps` 已合并至 `mes`（高级排程模块）；`lowcode` 已移除（空壳占位）。

## 3. 模块边界与调用契约

### 3.1 模块边界规则

- **数据边界**：每个模块组拥有独立的 PostgreSQL schema（`plugin_<module>`），禁止跨组直查
- **调用边界**：模块组间禁止直接依赖内部实现，必须通过模块 trait 接口
- **事件边界**：模块组间通过事件总线（Redis Stream）异步解耦，同步场景走 trait

### 3.2 统一入口 Module trait

`topems-server` 定义统一的模块注册契约：

```rust
/// 模块化单体中每个模块组需实现的统一接口
#[async_trait::async_trait]
pub trait Module: Send + Sync + 'static {
    /// 模块唯一标识（如 "core" / "erp"）
    fn name(&self) -> &'static str;

    /// 模块所属组（core/erp/finance/crm/wms/advanced/ai）
    fn group(&self) -> ModuleGroup;

    /// 注册本模块的路由
    fn routes(&self, state: AppState) -> Router;

    /// 模块健康检查（返回依赖项状态）
    async fn health_check(&self) -> ModuleHealth;
}
```

### 3.3 进程内调用机制

模块组间调用优先走进程内 trait（消除网络开销）：

- **私有化模式**：`ModuleRegistry` 持有各模块的 trait 对象，模块间直接调用
- **SaaS 模式**：可通过 feature flag 切换为 HTTP 调用（保留微服务形态）

## 4. Cargo Workspace 结构

`svc/server/Cargo.toml` 通过 feature 控制挂载哪些模块（单一事实源，与 workspace 成员对齐）：

```toml
[features]
default = ["module-core", "module-erp", "module-finance", "module-qms", "module-crm",
           "module-hrm", "module-scm", "module-wms", "module-pm", "module-mes",
           "module-ehs", "module-lims", "module-advanced", "module-ai"]
# 行业特定服务：默认不启用，按客户需求裁剪（P3）
module-tms = ["dep:topems-tms"]
module-gis = ["dep:topems-gis"]

module-core = []
module-finance = ["dep:topems-finance"]
module-erp = ["dep:topems-erp"]
module-qms = ["dep:topems-qms"]
module-crm = ["dep:topems-crm"]
module-hrm = ["dep:topems-hrm"]
module-scm = ["dep:topems-scm"]
module-wms = ["dep:topems-wms"]
module-pm = ["dep:topems-pm"]
module-mes = ["dep:topems-mes"]
module-ehs = ["dep:topems-ehs"]
module-lims = ["dep:topems-lims"]
module-advanced = []
module-ai = []
```

### 4.1 按客户需求裁剪（P3）

- **进程内裁剪**：`--no-default-features --features <模块清单>` 可组合任意模块。
  - 最小集已验证：`module-core,module-erp,module-finance` 编译通过
  - 全量已验证：`--all-features` 编译通过（含 gis/tms/lims/ehs）
  - tms 可选接入：`--features module-tms` 编译干净（`tms_real_module` 接入统一入口）
  - 订阅模块可选接入（P5）：`--features module-subscription` 编译干净（`subscription_module` 接入统一入口，`public.subscriptions` 表 + /api/subscriptions/*）
- **部署级裁剪**：`config/services.yaml` 为全量服务清单（含 tms/gis/lims/ehs），私有化部署按客户勾选启动项，未选服务不部署
- **gis 特例**：gis 含 WebSocket/事件订阅/插件体系，保持独立微服务部署（services.yaml 已含）；`module-gis` feature 仅编译依赖，不注册 server 路由（进程内嵌入需先重构 gis lib，成本高、价值低，暂不做）

## 5. 迁移路径（渐进式）

| 阶段 | 内容 | 验收 |
|------|------|------|
| **Phase A（骨架）** | 模块分组定义 + Cargo features + topems-server 框架 | `topems-server` 编译通过、可启动、健康检查响应 |
| **Phase B（接入）** | 将已 lib+bin 化的服务（erp/finance/qms）接入统一入口 | 单进程启动 3 个业务模块 |
| **Phase C（铺开）** | 其余服务逐步 lib+bin 化并接入 | 32 svc 全部归入 7 组，单进程可启动 |
| **Phase D（trait 化）** | 模块间调用改为进程内 trait | 至少 2 个模块间调用非 HTTP |
| **Phase P3（裁剪）** | 行业特定服务 feature flag 控制 + 按客户裁剪 | 最小集/全量 feature 编译通过 |

### 5.1 实施状态（2026-08-30）

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase A | ✅ 完成 | topems-server 骨架 + 模块组 features + 健康检查聚合 |
| Phase B | ✅ 完成 | 真实 finance + erp 服务接入（FinanceRealModule / ErpRealModule，feature 门控），单进程 5 模块启动，`/api/finance/*`、`/api/erp/*` 真实业务路由 + 数据库读写验证 |
| Phase B 扩展 | ✅ 完成 | qms / crm / hrm / scm / wms / pm / mes / ehs / lims 已全部接入统一入口（real_module 模式，feature 门控，单进程 14 模块） |
| Phase D | ✅ 完成 | dashboard → finance 进程内 trait 调用（AccountBalanceProvider，非 HTTP）已验证 |
| Phase P3 | ✅ 完成 | `module-tms` 可选接入（默认不启用）；gis 决策保持独立微服务；裁剪矩阵 5 组合（default / +tms / 最小集 / +subscription / 全量）编译验证通过 |
| Phase C | ⏳ 待办 | 其余服务（如 gis 重构后可接入）lib+bin 化并接入 |

**真实服务接入的关键工程点**（已在 finance + erp 上验证）：
1. **全局 tracing subscriber 冲突**：`bootstrap_service` 默认初始化全局 telemetry，与宿主进程冲突 → 新增 `ServiceConfig.init_telemetry=false` 开关（默认 true 保持原行为）
2. **search_path schema 解析**：`.env` 的 `SEARCH_PATH` 会导致连接池解析到其他 schema 的旧表 → 模块构建时显式 `set_var("SEARCH_PATH", "<svc>, public")`
3. **跨模块 SEARCH_PATH 时序**（多真实模块时）：SEARCH_PATH 是进程级全局 env，各模块需在 `bootstrap_service` 后**立即 `db.acquire()` 强制建立连接**，固化本连接池的 search_path（防止其他模块覆盖）
4. **业务 schema 演进**：模型与建表 SQL 不一致（缺列/类型不匹配）→ 在服务自身 init_database 中补幂等迁移（`ADD COLUMN IF NOT EXISTS` + DO 块类型转换）
5. **认证注入**：开发验证阶段用 `inject_dev_claims`（公共 `dev_claims.rs`）模拟 Claims（`is_superuser=true` 使权限检查放行），生产需接真实 `auth_middleware`
6. **路由前缀**：真实模块路由相对路径需按 `config.api_prefix` nest（与 `build_application` 一致）；演示模块用独立前缀避免冲突
7. **权限中间件**：erp 在路由上叠加 `require_permission("erp:admin")`（与独立部署一致）

## 6. 风险与回退

- **重构回归风险**：每个模块组独立迁移，充分测试后再合并
- **回退方案**：保留现有微服务部署模式作为 fallback，`topems-server` 可随时切换
- **数据库不变**：模块化单体不改变数据库 schema，仅改变部署形态，风险可控
