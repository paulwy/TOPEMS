# TOPEMS-IAM 统一身份与权限中台

TOPEMS-IAM 是 TOPEMS 平台的统一身份与权限中台，为所有子系统提供认证授权服务。

## 核心功能

- SSO 单点登录
- 多租户支持
- 分级权限控制
- 行级数据权限
- 审计日志
- 内外网隔离

## 技术栈

- **后端**：Rust + Axum + SQLx
- **前端**：React 18 + TypeScript 5
- **数据库**：PostgreSQL 15+

## 快速开始

```bash
cd backend
cargo run
```

## API 文档

访问 http://localhost:8002/swagger-ui

## 版本

v1.0.0  
更新日期: 2026-05-20
