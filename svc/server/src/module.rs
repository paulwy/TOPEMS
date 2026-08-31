//! 模块化单体统一接口定义
//!
//! 每个模块组需实现 `Module` trait 以接入 `topems-server` 统一入口。
//! 详见 docs/architecture/modular-monolith-design.md

use axum::Router;
use serde::Serialize;
use std::sync::Arc;

/// 模块所属的 7 个核心模块组
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum ModuleGroup {
    /// 平台核心：IAM/文档/流程/文件/通信/监控/搜索/集成/门户
    Core,
    /// 企业资源：采购/销售/供应链/项目/研发/产品数据
    Erp,
    /// 财务：总账/凭证/应收应付/计费
    Finance,
    /// 客户关系：客户/商机/营销
    Crm,
    /// 仓储制造：仓储/运输/制造执行/质量/环境安全/实验室
    Wms,
    /// 高级数据：主数据/数据分析
    Advanced,
    /// 智能：AI 中间层/Agent
    Ai,
}

impl ModuleGroup {
    pub fn as_str(&self) -> &'static str {
        match self {
            ModuleGroup::Core => "core",
            ModuleGroup::Erp => "erp",
            ModuleGroup::Finance => "finance",
            ModuleGroup::Crm => "crm",
            ModuleGroup::Wms => "wms",
            ModuleGroup::Advanced => "advanced",
            ModuleGroup::Ai => "ai",
        }
    }

    /// 模块组对应的 feature flag 名（与 Cargo.toml 对齐）
    pub fn feature_flag(&self) -> &'static str {
        match self {
            ModuleGroup::Core => "module-core",
            ModuleGroup::Erp => "module-erp",
            ModuleGroup::Finance => "module-finance",
            ModuleGroup::Crm => "module-crm",
            ModuleGroup::Wms => "module-wms",
            ModuleGroup::Advanced => "module-advanced",
            ModuleGroup::Ai => "module-ai",
        }
    }
}

/// 模块健康检查结果
#[derive(Debug, Clone, Serialize)]
pub struct ModuleHealth {
    /// 模块名
    pub module: String,
    /// 模块组
    pub group: &'static str,
    /// 是否健康
    pub healthy: bool,
    /// 健康状态详情（如 "ok" / 依赖错误信息）
    pub status: String,
    /// 依赖项健康状态
    pub dependencies: Vec<DependencyHealth>,
}

/// 依赖项健康状态
#[derive(Debug, Clone, Serialize)]
pub struct DependencyHealth {
    pub name: &'static str,
    pub healthy: bool,
    pub detail: String,
}

impl ModuleHealth {
    pub fn healthy(module: &str, group: ModuleGroup) -> Self {
        Self {
            module: module.to_string(),
            group: group.as_str(),
            healthy: true,
            status: "ok".to_string(),
            dependencies: Vec::new(),
        }
    }

    pub fn unhealthy(module: &str, group: ModuleGroup, reason: impl Into<String>) -> Self {
        Self {
            module: module.to_string(),
            group: group.as_str(),
            healthy: false,
            status: reason.into(),
            dependencies: Vec::new(),
        }
    }
}

/// 模块运行时共享状态（可注入 db pool / 配置等）
#[derive(Clone, Default)]
pub struct ModuleContext {
    /// 模块可访问的共享依赖
    pub shared: Arc<SharedModuleDeps>,
}

/// 模块共享依赖（由统一入口初始化后注入各模块）
#[derive(Clone, Default)]
pub struct SharedModuleDeps {
    // 预留：数据库连接池 / 事件总线 / 配置中心等
    // pub db: Option<sqlx::PgPool>,
}

/// 模块化单体统一接口
///
/// 每个模块组实现此 trait 以接入统一入口，支持：
/// - 路由注册（`routes`）
/// - 健康检查聚合（`health_check`）
/// - 进程内调用（后续通过 `module_registry` 访问其他模块）
#[async_trait::async_trait]
pub trait Module: Send + Sync + 'static {
    /// 模块唯一标识（如 "core" / "erp"）
    fn name(&self) -> &'static str;

    /// 模块所属组
    fn group(&self) -> ModuleGroup;

    /// 注册本模块的路由
    fn routes(&self, _state: ModuleContext) -> Router {
        Router::new()
    }

    /// 模块健康检查（返回依赖项状态）
    async fn health_check(&self) -> ModuleHealth {
        ModuleHealth::healthy(self.name(), self.group())
    }

    /// 模块版本
    fn version(&self) -> &'static str {
        "0.1.0"
    }
}
