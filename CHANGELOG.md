# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

---

## [V67.1] - 2026-08-08

### Changed - 架构治理
- P0×10 / P1×25 / P2×20 / P3×12 = 67 项第四轮审计修复（综合健康评分 99/100）
- 9 服务 Docker healthcheck 统一 `/health` + wget→curl
- 12 服务 docker-compose environment 通过 YAML 锚点压缩 DRY
- 11 服务 55+ tracing::info! → debug! 日志降级（QPS +5-15%）
- 前端 17 处 barrel 0 引用导出清理（tree-shaking ↓）

### Added
- shared-core: common_types.rs (ApprovalStatus 6变体 + ResourceType 14实体)
- shared-bootstrap: audit.rs 通用审计模块（create_routes<S>/log_audit_event）
- shared-core: `handle_result!` 宏统一 357 次重复错误处理
- 前端: utils/status.ts STATUS_COLOR_MAP（4 类别 + 6 页面替换）
- 前端: utils/date.ts formatDate 工具统一
- docs/architecture/ports.md（28 服务标准端口单一信源表）

### Fixed
- 6 服务 api_prefix 三方不一致（404 路由阻断 ×6）
- ERP 6 个列表 COUNT(*) 不带 WHERE 导致 total = 全表行数
- analytics check_permission 永远返回 true 的 stub
- docker-compose bi 服务 Dockerfile 路径 + report ghost 引用
- 6 user-guide 模块文档端口号与 main.rs 实际对齐

---

## [V67.0] - 2026-08-07

### Added
- shared-core `ListResponse<T>` 统一列表响应 + 5 端点试点迁移
- master-data service `auto_register_to_core` → 插件自动注册 **28/28 (100%)**

### Changed
- DocumentsPage 1438→783 (-45.5%) · ProfilePage 1298→566 (-56.4%) 超大页拆分
- 28 services `plugin.yaml` 统一 author/category/version 字段

---

## [V66.7] - 2026-08-07

### Changed
- 第三轮深度审计 **31/31 全闭环**（P0×6 / P1×10 / P2×9 / P3×3）
- 28 服务 shared-bootstrap V2 + println → tracing 迁移
- 14 处 allow(dead_code) 收敛为 crate/mod 级单条

---

> 变更历史归档请参考 [docs/changelog/](docs/changelog/) 目录
