//! V24.0 模块 C: gRPC 微服务基础
//!
//! lib 层提供纯 Rust 抽象（无 proto 生成依赖），各服务在自己的 build.rs 中
//! 通过 tonic-prost-build 生成具体 proto 代码并复用本模块的连接池/健康检查能力。
//!
//! 仅当启用 `grpc` feature 时编译。

#![cfg(feature = "grpc")]

pub mod connection_pool;
pub mod health;

pub use connection_pool::{
    GrpcChannelPool, GrpcPoolConfig, GrpcPoolError, GrpcPoolStats, LoadBalancingStrategy,
    PooledChannel,
};
pub use health::{
    DependencyProbe, GrpcHealthCheckResponse, GrpcHealthChecker, GrpcHealthServer, GrpcHealthState,
    GrpcHealthStatus, HealthProbeId, ProbeKind,
};
