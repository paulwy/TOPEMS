//! # Search 模块
//!
//! 全局搜索服务模块，提供跨模块、跨表的统一搜索能力。
//!
//! ## 功能特性
//!
//! - **多类型搜索**：支持按模块、按类型搜索业务数据
//! - **智能排序**：基于相关性评分的搜索结果排序
//! - **分页支持**：标准分页参数，支持自定义每页数量
//! - **租户隔离**：基于 RLS 的多租户数据隔离
//!
//! ## 模块结构
//!
//! - [`handlers`]：HTTP API 处理器，定义搜索路由
//! - [`models`]：数据模型，定义搜索请求和响应结构
//! - [`scoring`]：相关性评分算法，计算搜索结果的权重
//! - [`util`]：工具函数，提供搜索辅助方法
//! - [`openapi`]：OpenAPI 文档配置
//!
//! ## API 路由
//!
//! - `GET /api/search`：全局搜索
//! - `GET /api/search/suggest`：搜索建议
//!
//! ## 使用示例
//!
//! ```no_run
//! use topems_search::handlers::search_routes;
//!
//! let app = search_routes();
//! // 挂载到 Axum 应用
//! ```

pub mod handlers;
pub mod models;
pub mod openapi;
pub mod scoring;
pub mod util;
