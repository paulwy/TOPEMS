# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Rust 测试覆盖率基线工具链（V203 P0-3.1 落地）**：
  - `scripts/ci/coverage-baseline.sh`（27 KB）— bash 主调度：Rust `cargo test -Z instrument-coverage` + llvm-profdata/llvm-cov、TypeScript `pnpm vitest --coverage`、15+ CLI flags（`--fast`/`--full`/`--rust`/`--ts`/`-p`/`--fail-under` 等）、工具链自检与降级、per-crate JSON 产出
  - `scripts/ci/coverage-report.py`（19 KB）— Python 汇总器：读取 per-crate JSON + vitest summary、**按行数加权汇总**（非简单均值）、red/yellow/green 三级 tier、`--fail-under` 阈值门禁、Markdown + JSON + 控制台 ASCII 三输出
- **P5 覆盖率冲刺：Region 43.19% → 45.84%（+2.65pp）**
  - 30 个 `test(cov)` 系列 commit、282 个文件变更、+62,150 行测试代码
  - 策略：`Serialize`/`Deserialize` derive 密集 + 0-test 文件批量 roundtrip + 纯函数边界测试
  - 覆盖 crate：shared-core / shared-event / shared-observability / ai / erp / wms / crm / hrm / pdm / qms / lims / ehs / communication / master-data / scm / pm / mobile / finance / portal / unified-core / migration-sdk / plugin-registry 等 20+ crate
  - 代表性：finance domain 5 个文件 +72 tests、portal models +306 roundtrip、ai_form handlers.rs 从 0% → 91.46%
- **AI Form 模块接入**：`feat(ai): 接入 ai_form 模块 + 补齐 form_assistant 核心类型`
- **Mock 可测试架构**：AiFormAssistant trait 化注入，移除 handlers.rs 对 concrete client 的硬耦合

### Changed
- **finance + portal 两大 crate Region 显著提升**：finance 14.53% → 17.58%（+3.05pp，16 文件 +60 tests）、portal 23.83% → 24.52%（+0.69pp，5 文件 +28 tests）
- **ai_form handlers.rs 可测试性重构**：从直接实例化 client 改为 trait-based 注入，单测 0% → 91.46%（`refactor(ai): 引入 mock 可测试架构`）

### Fixed
- `.sqlx/` 目录缓存文件误提交风险：根目录 `.gitignore` 新增 pattern（`chore(gitignore)`）
- MES 数据库 schema refactor 后 97 个编译错误清零（`fix(mes): resolve 97 compile errors`）

---

## [V67.2] - 2026-08-11

### Changed - 导航架构里程碑（V178~V182 八提交聚合）
- 导航三联校验综合覆盖率：95.4% → 100.0%（V179→V182），1050/1050 全绿
- 第一联·页面文件匹配：302/350 (86.3%) → 350/350 (100.0%)，总缺失 48 → 34 → 0
- workflow 模块三联校验 39/39 = 100% 闭环封版（页面/路由/权限各 13/13）
- verify_navigation 脚本 10 类命名变体规则系统化落地覆盖 17 模块 34 项
- 项目版本：5.14.0 → 5.15.0（导航架构合规化里程碑）

### Fixed
- **web(PM)**: usePmReport 返回类型补齐 6 个缺失属性（projectStatistics/contractStatistics/budgetStatistics/riskStatistics/taskStatistics/dashboard），tsc --noEmit 清零
- **pm(backend)**: statistics.rs 13 个编译错误清零 — 全量 struct Default trait 实现、`#[utoipa::path]` 宏注册（修复 `__path_get_statistics` 未定义）、f64 与 int 比较修正、`ApiResponse<ProjectStatistics>` 泛型类型修正、`path` 歧义消除移除隐式 import
- **navigation(asset)**: Asset Module navItems 6 条 permission 字段补齐，第三联权限定义覆盖率 338/350 → 350/350
- **navigation(lowcode)**: Lowcode Module navItems 3 条 permission 字段补齐
- **navigation(oa)**: OA Module navItems 3 条 permission 字段补齐
- **verify_navigation V1**: pagePathToFile 候选路径生成新增 `XxxPage/index.tsx` 目录式 + 复数→单数变体，修复 workflow-templates（单数）/workflow-settings（目录式）误报 2 项
- **verify_navigation V2**: 系统化增强 7 项规则：
  1. ABBREV_DICT 缩写词典（statistics→Stats 等）
  2. toSingular 单数变体规则（`-ies→y` / `-ses→s` / `-s` 去尾，覆盖 categories→category 等）
  3. 6 类候选路径生成：目录式 index / 单数变体候选族 9 种 / 路径缩略 -management / 缩写词典候选 / 复合末段取后半段 / 模块根 index 兜底
  4. findFuzzyPageMatch 单数变体降权模糊匹配（覆盖语义扩展类 prompts→PromptLibrary 等）
  5. 单数变体精确匹配 +20 分（覆盖 Management/List 类）
  → 修复全局 34 项脚本盲点，清零第一联全部缺失

### Docs
- TODO.md V178：健康修复专项（usePmReport + statistics.rs 双模块编译清零）
- TODO.md V179：导航三联权限闭环，第三联 12 条 permission 补齐，350/350 = 100%
- TODO.md V180：verify_navigation 脚本增强 + workflow 2 项清零，第一联 90.3%
- TODO.md V181：workflow 模块页面骨架闭环封版 39/39 = 100%
- TODO.md V182：全局 34 项清零 + 导航三联校验 100% 全绿里程碑（7 版本迭代终点）

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
