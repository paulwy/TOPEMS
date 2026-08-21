# TOPEMS 项目任务规划与路线图

> **版本**: V257 | **更新日期**: 2026-08-21
>
> **V257 更新（2026-08-21）**：完成 BFF 实验性 hooks 清理（P4-6）。删除前端三层纯实验性死代码（hooks/bff 10 文件 + components/bff 12 文件 + utils/bff 5 文件 = 27 文件，~13,379 行），精简 api/bff/index.ts 从 6,162 行到 468 行（删除 ~5,694 行实验性 GraphQL CRUD/联邦/治理/安全 API）。保留真实业务函数：getDashboard / completeTodoGql / subscribeServiceHealth / masterDataApi / MasterDataRef。验证：tsc --noEmit 0 error。总净减 ~19,074 行。
>
> **📐 文档重构（2026-08-21）**：原 8,674 行 TODO 按时间轴拆分为 4 个归档文件（详见 [📚 归档索引](#-归档索引)），主文档仅保留：🔥 当前活跃任务 + 📦 待办 Backlog 主题汇总 + 📊 版本统计面板 + 📚 归档链接。已完成版本的详细验收矩阵、变更统计、EDGE CASE 记录请查阅对应归档文件。

---

## 🔥 当前活跃任务（执行中 / P0）

### ✅ P0 · V252 — 全服务 CRUD 层系统性缺陷审计与修复（HRM 验证暴露）— 已完成

> **触发**：HRM 模块 CRUD 深度验证（21/21 通过）过程中暴露出 5 类跨服务系统性缺陷，经全仓扫描确认。
> **参考实现**：[svc/hrm/src/modules/contract.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/contract.rs) · [svc/hrm/src/modules/attendance.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/attendance.rs)
> **完成日期**：2026-08-21 · Phase 1-6 全部完成，7/7 验收标准全绿。

| Phase | 范围 | 优先级 | 状态 | 涉及服务数 |
|-------|------|--------|------|-----------|
| Phase 1 | CRM + ERP SELECT 补齐 tenant_id | P0 | ✅ | 2 |
| Phase 2 | WMS SELECT 补齐 tenant_id | P0 | ✅ | 1 |
| Phase 3 | 全服务加密字段 VARCHAR → TEXT | P0 | ✅ | 7+ |
| Phase 4 | 全服务 f64/DateTime 类型转型 | P1 | ✅ | 8+ |
| Phase 5 | 全服务 deleted_at IS NULL 过滤补齐 | P1 | ✅ | 全仓 |
| Phase 6 | FK 约束 + CHECK 约束审计 | P2 | ✅ | 全仓 |

**详细缺陷清单与修复计划见文档末尾 [V252 CRUD 审计详情（原文保留）](#v252--全服务-crud-层系统性缺陷审计与修复hrm-验证暴露)**

**验收标准（5/5 必须全绿）**：
1. 全服务 CRUD 深度验证（新增→列表→查询→编辑→删除）通过率 100%
2. `grep -r "SELECT id, " svc/*/src/modules/ | grep -v tenant_id` 返回 0 条（排除无 tenant_id 列的表）
3. 全服务 schema_defense.rs 中 email/phone/id_card 列无 VARCHAR(≤128) 定义
4. 全服务 SELECT/RETURNING 中 NUMERIC 列有 `::float8` 转型或使用 `Decimal` 类型
5. 全服务 list/get 查询均含 `deleted_at IS NULL` 过滤（针对有 deleted_at 列的表）
6. 全服务无跨 schema FK 引用错误
7. 全服务 `ck_*_status_standard` CHECK 约束已删除（不阻止业务状态值）

---

### 🟡 P1 · V232 — i18n Strict-Zero + 616 Design Token 收尾 + Finance Handler 接入 + 9→11 Gate 升级

> **承接**：V231 六闸 SEAL ALL GREEN 封版。方向 A "最后硬骨头收尾 + CI 升级一次性闭环"，打包策略 A-1（全量一锅端）。
> **日期**：⏳ 待执行（计划 2026-08-18 起）
> **策略**：P0(Finance Handler)→P1(i18n 280→0)→P2(616 Token 收尾)→P3(9→11 Gate 升级)→P4(SEAL 11-Gate + Actual 全填)，五批严格串行，每批完工即 commit。批次文件空间零耦合，可独立 revert。

| 批次 | 任务 | 预期交付 |
|------|------|---------|
| P0 | Finance Handler 接入生产调用 | 所有 Finance 路由用真实 handler（非临时 stub） |
| P1 | i18n Strict-Zero：剩余硬编码 280→0 | precise scan --strict 全仓 0 hits |
| P2 | 616 Design Token 收尾：剩余未收敛 token → palette 映射 | Design Token 最终清单 ≤169 |
| P3 | 9→11 Gate 升级：新增 2 条质量门禁到 pre-commit + CI | Gate M=11 条 |
| P4 | SEAL 11-Gate + Actual/Status 两列全填值 | A-K 11-Gate 本地实跑全绿 |

---

## 📦 待办 Backlog（主题汇总 · 按优先级归类）

> 说明：原 TODO 中 V231~V258 共 15+ 个版本"已知遗留/后续扩展"章节散列 85 条 [ ] 项，经**语义去重 + 剔除后续版本已落地项**，归纳为 5 大主题 16 条。每条标注**首次提出版本**与**连续提及次数**，作为优先级参考。

### 🔴 P1 · 长期高价值（连续 10+ 版本列入 · 直接影响生产链路）

| # | 主题 | 子项 | 首次提出 | 连续提及 |
|---|------|------|---------|---------|
| 1 | **Dify AI 端到端闭环** ✅ POC 代码完成 | ① ✅ Docker Compose + Ollama 配置就绪（`docker-compose.dify.yml`） ② ✅ 前端 DifyChatPage + SSE `chat_stream` 已有（V238 完成） ③ ✅ WorkflowOrchestrator 接入 DifyService（executor="dify"）+ `dify_qa` workflow + 3 个 e2e 冒烟测试（需 `DIFY_API_KEY` 运行） | V238 | **≥15 版** |
| 2 | **Tauri 5 件套剩余 3 件**（① Stronghold ✅/④ IPC ✅ 已完成） | ② **平台原生 Keychain API 对接**：macOS Keychain / Windows Credential Manager / Linux Secret Service，作为 Stronghold 之外的本地加密备选 ③ **启动时自动解锁 keystore**：强密码从 Tauri AppHandle 安全存储或用户首次输入 ⑤ **迁移 FileKeyStore 遗留数据到 Stronghold**：一次性脚本扫描 `~/.topems/keystore/*.json`，导入 Stronghold 快照后清理 | V244 | **≥12 版** |

### 🟡 P2 · 质量深化（类型 / 工具链 / CI 持续收紧）

| # | 主题 | 子项 | 首次提出 | 连续提及 |
|---|------|------|---------|---------|
| 3 | **Frontend 泛型第二轮深度细化** | ① `filters` / `initialValues` 从 `Record<string, unknown>` 升级为具体 schema（`TypeMap<Entity>`），需 tsc + 后端 DTO 联动 ② **深 Props 对齐 TS AST 扫描器**：检测 `@/pages/<module>/<Page>.tsx` 实际解构的 props 字段，反向补 `config.ts` 的 Props interface，确保字段真实度 >90% | V256 | **≥6 版** |
| 4 | **Perm Gate Scanner 长期演进** | ① SCAN_FRONTEND 从**逐行正则**升级为 `typescript.createSourceFile` AST 解析 `requiredPermissions` 数组，彻底消除跨行数组、换行字符串等误报 ② 老脚本正式 rm：`check-perm-gate.cjs` / `check-permission-matrix.cjs`（已被 `perm-matrix-toolkit.cjs` 替代，V257+ 移除） | V245 | **≥8 版** |
| 5 | **CI 收紧双开关切换** | ① `frontend-typecheck` job 末尾：连续 N=3 次 CI 全绿后，把锚点 `# CI-TIGHTEN-ANCHOR: exit 0 → exit $FAILED` 正式切换为阻断（V246 ci.yml:1189）② 测试基线升级：从 `cargo test --workspace --no-run`（只编译）升级为完整 `cargo test --workspace` 运行通过，尤其 unified-core 集成测试实际断言 HTTP 响应 | V245 | **≥6 版** |

### 🟢 P3 · 死代码 & 工具链小步优化

| # | 主题 | 子项 | 首次提出 | 连续提及 |
|---|------|------|---------|---------|
| 6 | **ts-unused-exports 扩面清理（V258 后续）** | ① apps/desktop + apps/mobile + packages/shared-components + packages/shared-constants 4 小 TS 项目（143 文件）生成独立报告并 L1-SAFE 清理 ② apps/web **L1-UNSAFE VALUE 241 条**：整链回滚策略挖掘剩余 VALUE 死链 ③ scanner 新增 `--no-skip-underscore` 选项（`_mock.ts` 下划线前缀默认跳过导致假阳性） | V258 | 1 版（新增） |
| 7 | **Tauri 生态完善（小项组合）** | ① 请求级取消：每个请求独立 `CancellationToken`，而不是全局 `broadcast_event` 广播 ② 离线模式冲突解决策略：乐观锁 / 最后写入胜出 ③ 加密密钥轮换机制 ④ 审计日志前端页面 + 数据导出 UI（基于 `get_audit_logs` / `export_data` 构建向导）⑤ 跨窗口事件通信 | V235 | 多次 |
| 8 | **crm unused warnings 清理** | `topems-crm` 3 unused import warnings：`cargo fix --bin topems-crm -p topems-crm` 一键修复 | V246 | 1 版 |

---

## 📊 版本统计面板

> 历史版本完整详情 → [📚 归档索引](#-归档索引)

### 版本全景（V67.2 ~ V258）

| 阶段 | 版本区间 | 主题 | 完成状态 | 归档文件 |
|------|---------|------|---------|---------|
| 🏗️ 基础夯实 | V67.2 ~ V99 | 数据层 P0 修复 / UI 优化 / 导航统一 / Schema 防御 / OpenAPI 契约 | ✅ 全闭环 | [V67-V99-foundation.md](archive/V67-V99-foundation.md) |
| 📦 模块建设 | V178 ~ V210 | MES/QMS/WMS/TMS/APS 6 大模块落地 / 导航三联校验 / utoipa 注解 RC4a/b/c | ✅ 五重验收全绿 | [V178-V210-modules.md](archive/V178-V210-modules.md) |
| 🧪 质量治理 | V211 ~ V230 | 覆盖率冲刺 P2→P4 / Design Token 2845→169 / i18n 落地与硬编码清零 R5→R13 | ✅ 七闸全绿 | [V211-V230-quality.md](archive/V211-V230-quality.md) |
| 🔒 架构收闭 | V231 ~ V258 | 架构冗余实修 P0-R01 多批 / R5 security 2379→0 / Tauri Stronghold+IPC / 前端泛型 37 模块全落地 / 死代码清理 2814 条 | ✅ 全门禁通过 | [V231-V258-closure.md](archive/V231-V258-closure.md) |

### 完成度速览

- **历史版本完成率**：V67.2~V258 关键里程碑 107 个章节 / 实际已完成 100+（≥94%）
- **代码净减最近 5 版**：V254(-531) + V257(-29→0 tsc) + V258(-2814 dead exports) + V257 重构前 BFF 清理(-19074) ≈ **净减 22,400+ 行**
- **质量门禁当前基线（V257 封版）**：axum-layer-gate R1/R2/R3 = 0/0/0 · perm-gate R1/R3/R5 = 0/0/0 · cargo check 0 errors · tsc apps/web 0 errors · i18n 7-in-1 0 failures
- **当前活跃缺口**：V232 Strict-Zero P0-P4 × 5 批 + Backlog 5 大主题 16 条（V252 已完成）

### 当前活跃任务 → 版本节点映射（规划建议 V259+）

| 规划版本 | 承接工作包 | 建议优先级 |
|---------|-----------|-----------|
| **V259** | ~~V252 CRUD Phase 1-2~~ ✅已完成 + V232 P0 Finance Handler | 🔴 P0 |
| **V260** | ~~V252 CRUD Phase 3~~ ✅已完成 + V232 P1 i18n Strict-Zero | 🔴 P0 |
| **V261** | ~~V252 CRUD Phase 4-5~~ ✅已完成 + V232 P2/P3（Design Token + Gate 升级） | 🟡 P1 |
| **V262** | ~~V252 CRUD Phase 6~~ ✅已完成 + V232 P4 SEAL + Dify POC 最小闭环 | 🟡 P1 |
| **V263+** | Tauri 5 件套剩余 3 件 + 泛型深度细化 + CI 收紧双开关 | 🟢 P2 按季度排期 |

---

## 📚 归档索引

> 已完成版本的**详细验收矩阵、变更文件统计、关键 EDGE CASE 踩坑记录、Git 提交时间线**均已按时间轴拆分至以下 4 份归档文档。主文档 TODO.md 不再保留已完成版本的过程细节（从 8,674 行精简至本页）。

| 归档文件 | 版本范围 | 行数 | 核心产物覆盖 |
|---------|---------|------|-------------|
| 📘 [V67-V99-foundation.md](archive/V67-V99-foundation.md) | V67.2 ~ V99 + 历史任务归档 + V68 统计 | ~1,550 | V67.2 P0 5/5 闭环 · V68.0 15/15 导航统一 · V68.1 短板 S1/A2/A4 · V69.x Schema 防御 26 服务全覆盖 · V72.6/72.7/72.8 P-04 探针 GREEN · V73 死端点清理 · V74/V75-V81 API 绑定 |
| 📗 [V178-V210-modules.md](archive/V178-V210-modules.md) | V178 ~ V210 + V191-V197 MES | ~1,520 | V178 健康修复 3 清零 · V179-V182 导航三联 100% · V183 CRM 进阶 + 4 模块补齐 · V198 QMS / V199 WMS / V200 三联调 / V201 TMS / V201-fix 冒烟 / V202 APS · V208-V210 utoipa RC4a/b/c |
| 📙 [V211-V230-quality.md](archive/V211-V230-quality.md) | V210.5 ~ V230 + V213~V230 | ~1,150 | V203 18 crate +1439 tests · V204 UI 13 项差距闭环 · V205-V207 UI/运行时/any 治理 · V210.5 可观测性 · V213-V215 覆盖率 P2→P3 · V214-V220 Design Token 2845→169 · V216 E2E 扩面 · V217 MF 埋点 · V218-V230 i18n R5-R13 清零 · V229 Coverage P4 |
| 📕 [V231-V258-closure.md](archive/V231-V258-closure.md) | V231 ~ V258 + V253 Step1-4 + V254~V258 | ~5,350 | V231 NEEDS_FIX · V233-V239 Tauri/Mock/Dify/comm 系列 · V240-V245 cargo 0 警告 + CI Gate M~R 收紧 · V246-V250-2 架构冗余 P0-R01 多批 17 中间件收归 · V251-V252 R5 2379 处 security() 清零 · V253 4 轨并行（R1/R3 清零 + 泛型 5 模块 + Tauri IPC + Perm CLI）· V254/V255/V256 mapping 扩围 460 keys + 全仓 rewrites · V257 37 模块 Props 泛型 + tsc 29→0 + R3=38→0 · V258 dead exports 清理 2814 条 |

**快速跳转**：
- 最早的设计决策 → V67-V99
- MES/QMS/WMS/TMS/APS 业务逻辑落地细节 → V178-V210
- i18n 硬编码清零 / Design Token 收敛经验与脚本 → V211-V230
- Tauri keystore / utoipa security / 前端泛型 / 最近 CI Gate → V231-V258

---

## V252 · 全服务 CRUD 层系统性缺陷审计与修复（HRM 验证暴露）

### 背景

HRM 模块 CRUD 深度验证（21/21 通过）过程中暴露出 5 类系统性缺陷。经全项目扫描确认，这些问题在多个业务服务中普遍存在，不仅限于 HRM。需作为专项版本统一修复。

### 问题清单

#### 🔴 P0-1 · SELECT/RETURNING 缺失 `tenant_id`（FromRow 解码失败）

**根因**：表定义含 `tenant_id UUID NOT NULL`，Rust 结构体也声明 `tenant_id: Uuid`，但 SQL SELECT/RETURNING 列表未包含 `tenant_id`，导致 `query_as::<_, T>()` 反序列化报 `ColumnNotFound` 运行时错误。

**已修复**：
- ✅ HRM `contract.rs` — 5 处 SELECT/RETURNING 补齐 `tenant_id`

**未修复（扫描发现）**：
- 🔴 CRM `customer_profile.rs` — 5 处 SELECT 缺 `tenant_id`（L122, L229, L255, L278, L423）
- 🔴 CRM `customer_recommendation.rs` — 2 处 SELECT 缺 `tenant_id`（L84, L161）
- 🔴 ERP `audit.rs` — 2 处 SELECT 缺 `tenant_id`（L64, L144）
- 🔴 ERP `dict.rs` — 4 处 SELECT 缺 `tenant_id`（dict_types + dict_items 各 2 处）
- 🔴 ERP `fixed_asset.rs` — 3 处 SELECT 缺 `tenant_id`（L120, L317, L358）
- 🔴 ERP `office_supplies.rs` — 3 处 SELECT 缺 `tenant_id`
- 🔴 ERP `opening_balance.rs` — 2 处 SELECT 缺 `tenant_id`
- 🔴 ERP `meeting_room.rs` — 3 处 SELECT 缺 `tenant_id`
- 🔴 WMS `stock_take.rs` — 8+ 处 SELECT 缺 `tenant_id`
- 🔴 WMS `location.rs` — 3 处 SELECT 缺 `tenant_id`
- 🔴 WMS `inventory_alert.rs` — 1 处 SELECT 缺 `tenant_id`（L851，其余已含）

**对照（已正确实现）**：PDM 全模块、SRM 全模块、CRM `customer.rs`/`tag.rs`/`billing.rs` 等

#### 🔴 P0-2 · VARCHAR 列用于加密字段（加密后超长截断）

**根因**：`email`/`phone`/`id_card` 等字段经 AES 加密 + Base64 编码后长度膨胀（原文 17 字符 → 密文 60+ 字符），超过 `VARCHAR(20~100)` 限制导致 `value too long for type character varying` 错误。

**已修复**：
- ✅ HRM `employees` 表 `email`/`phone`/`id_card_number` → TEXT

**未修复（扫描发现）**：
- 🔴 SRM `suppliers` 表 — `phone VARCHAR(20)`、`email VARCHAR(100)`
- 🔴 CRM `customers` 表 — `email VARCHAR(100)`、`phone VARCHAR(50)`、`mobile VARCHAR(50)`
- 🔴 CRM `contacts` 表 — `email VARCHAR(100)`、`phone VARCHAR(50)`
- 🔴 ERP — 2 处 `email VARCHAR(100)`
- 🔴 SCM `suppliers` 表 — `phone VARCHAR(20)`、`email VARCHAR(100)`
- 🔴 TMS — `phone VARCHAR(32)`
- 🔴 HRM `companies` 表 — `email VARCHAR(128)`、`phone VARCHAR(64)`（尚未触发但隐患存在）

#### 🟡 P1-1 · `Option<f64>` 映射 NUMERIC 列（解码 panic 风险）

**根因**：Rust `Option<f64>` 与 PostgreSQL `NUMERIC(p,s)` 类型不完全兼容，sqlx 解码可能 panic。需在 SELECT/RETURNING 中显式 `::float8` 转型，或改用 `rust_decimal::Decimal`。

**已修复**：
- ✅ HRM `contract.rs` — `salary::float8 AS salary`
- ✅ HRM `attendance.rs` — `work_hours::float8 AS work_hours`

**未修复（扫描发现）**：
- 🟡 PDM `project.rs` — `budget: Option<f64>`（3 处，L71/L90/L106）
- 🟡 MES — `quantity: Option<f64>`（work_order.rs, production_order.rs, wip.rs, quality_traceability.rs）
- 🟡 MES `equipment.rs` — `cost: Option<f64>`（L701, L724）
- 🟡 ERP — `quantity: Option<f64>`（production_order.rs L52, material.rs L213, finance.rs L132）
- 🟡 SRM `openapi.rs` — `price: Option<f64>`（L58）
- 🟡 APS `schedule.rs` — `quantity: Option<f64>`（L59, L71）
- 🟡 SCM `price_comparison.rs` — `quantity: Option<f64>`（L262, L273）

#### 🟡 P1-2 · `DateTime<Utc>` 映射 DATE 列（解码错误）

**根因**：Rust `DateTime<Utc>` 映射 PostgreSQL `DATE` 列时，DATE 无时间分量，sqlx 解码可能失败。需在 SELECT/RETURNING 中显式 `::timestamptz` 转型。

**已修复**：
- ✅ HRM `contract.rs` — `start_date::timestamptz`、`end_date::timestamptz`
- ✅ HRM `attendance.rs` — `date::timestamptz`

**未修复**：需对上述 P1-1 涉及服务中的日期字段逐一排查

#### 🟡 P1-3 · 主查询缺失 `deleted_at IS NULL` 过滤

**根因**：count 子查询含 `WHERE deleted_at IS NULL`，但主 SELECT 查询遗漏，导致列表返回已软删记录，与 total 不一致。

**已修复**：
- ✅ HRM `contract.rs` — list_contracts / get_contract / list_expiring_contracts / update_contract 均补齐

**未修复**：需对全服务 list/get 查询逐一排查（模式：count 有 deleted_at 但主查询没有）

#### 🟢 P2-1 · FK 引用错误 schema（跨库引用）

**已修复**：
- ✅ HRM `contracts.employee_id` FK 从 `shared.employees(id)` 改为 `hrm.employees(id)`
- ✅ V252 Phase 6 全服务 FK 约束审计完成 — 无跨 schema FK 问题（`public.project_contracts`/`project_budgets` 引用正确）

#### 🟢 P2-2 · CHECK 约束过严（业务状态值被拒）

**已修复**：
- ✅ HRM `attendance_records.ck_attendance_records_status_standard` — 扩展允许 present/absent/late/leave 等
- ✅ V252 Phase 6 — 迁移 `20260821000001` 删除全部 492 个 `ck_*_status_standard` 约束（P3-2 添加的 `CHECK(status IN ('active','inactive','archived'))` 过严，阻止业务状态值如 pending/completed/draft/cancelled 等）

### 修复计划

| 阶段 | 范围 | 优先级 |
|------|------|--------|
| Phase 1 | CRM + ERP SELECT 补齐 tenant_id | P0 |
| Phase 2 | WMS SELECT 补齐 tenant_id | P0 |
| Phase 3 | 全服务加密字段 VARCHAR → TEXT | P0 |
| Phase 4 | 全服务 f64/DateTime 类型转型 | P1 |
| Phase 5 | 全服务 deleted_at IS NULL 过滤补齐 | P1 |
| Phase 6 | FK 约束 + CHECK 约束审计 | P2 | ✅ 完成 |

### 验收标准

1. 全服务 CRUD 深度验证（新增→列表→查询→编辑→删除）通过率 100%
2. `grep -r "SELECT id, " svc/*/src/modules/ | grep -v tenant_id` 返回 0 条（排除无 tenant_id 列的表）
3. 全服务 schema_defense.rs 中 email/phone/id_card 列无 VARCHAR(≤128) 定义
4. 全服务 SELECT/RETURNING 中 NUMERIC 列有 `::float8` 转型或使用 `Decimal` 类型
5. 全服务 list/get 查询均含 `deleted_at IS NULL` 过滤（针对有 deleted_at 列的表）
6. 全服务无跨 schema FK 引用错误
7. 全服务 `ck_*_status_standard` CHECK 约束已删除（不阻止业务状态值）

### 审计产物

- V252 扫描脚本：`scripts/audit-crud-patterns.sh`（待创建）
- V252 修复清单：本节上述问题清单
- HRM 修复参照：`svc/hrm/src/modules/contract.rs`、`svc/hrm/src/modules/attendance.rs`
