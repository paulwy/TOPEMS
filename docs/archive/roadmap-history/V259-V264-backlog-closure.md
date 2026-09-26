# V259-V264+ Backlog 全量收闭归档

> **版本范围**: V259 ~ V264+ | **归档日期**: 2026-08-21
>
> 本文档归档 V259-V264+ 期间完成的所有 Backlog 任务，包括 P0/P1 活跃任务和 P1-P3 全部 16 条 Backlog。

---

## V259 更新摘要

Backlog P2 #3 ① TypeMap 基础设施落地 — 新增 `ListPageProps<TFilters>` / `FormPageProps<TValues>` 泛型基类型（`routes/v2/types.ts`），已完成 **32 模块全量迁移**（3 轮并行：PDM/SRM/Workflow/ERP/RD/EHS/AI/BI/APS/TMS/Notification/OA + MES/HRM/QMS/Finance/SCM/LIMS + Asset/Monitor/Lowcode/Automation/Doc/IAM/Integration/Mobile/Plugin/Admin/GIS/IM/PM/Report/Ticket/WMS），累计 ~160 interface 从 `Record<string, unknown>` 升级为 `extends ListPageProps`/`extends FormPageProps`。② **Scanner AST 升级**：新增 Pattern B `as RouteConfigV2<PropsType>` 检测（`AsExpression` 节点），路由覆盖 257→359（+102）。③ **Dead Props 清理**：2 轮并行修复 131 个 dead interface，**realness 31%→100%**（359 routes，0 LOW-REALNESS）。④ **react-window v2 迁移**：DataTable.tsx 从 v1 迁移至 v2。⑤ **TS2590 修复**：tsc **0 errors**。⑥ **CI 收紧**：shared packages tsc 从 `exit 0` 切换为 `exit $FAILED`。⑦ **CRM warnings 清理**：0 warnings。

---

## P0 · V252 — 全服务 CRUD 层系统性缺陷审计与修复

> **触发**：HRM 模块 CRUD 深度验证（21/21 通过）过程中暴露出 5 类跨服务系统性缺陷。
> **完成日期**：2026-08-21 · Phase 1-6 全部完成，7/7 验收标准全绿。

| Phase | 范围 | 优先级 | 状态 | 涉及服务数 |
|-------|------|--------|------|-----------|
| Phase 1 | CRM + ERP SELECT 补齐 tenant_id | P0 | ✅ | 2 |
| Phase 2 | WMS SELECT 补齐 tenant_id | P0 | ✅ | 1 |
| Phase 3 | 全服务加密字段 VARCHAR → TEXT | P0 | ✅ | 7+ |
| Phase 4 | 全服务 f64/DateTime 类型转型 | P1 | ✅ | 8+ |
| Phase 5 | 全服务 deleted_at IS NULL 过滤补齐 | P1 | ✅ | 全仓 |
| Phase 6 | FK 约束 + CHECK 约束审计 | P2 | ✅ | 全仓 |

### 问题清单详情

#### P0-1 · SELECT/RETURNING 缺失 tenant_id

表定义含 `tenant_id UUID NOT NULL`，但 SQL SELECT/RETURNING 列表未包含，导致 `ColumnNotFound` 运行时错误。已修复：CRM (7处) / ERP (14处) / WMS (12+处)。

#### P0-2 · VARCHAR 列用于加密字段

加密后长度膨胀超过 VARCHAR 限制。已修复：SRM / CRM / ERP / SCM / TMS / HRM 全部 VARCHAR → TEXT。

#### P1-1 · Option<f64> 映射 NUMERIC 列

sqlx 解码可能 panic。已修复：PDM / MES / ERP / SRM / APS / SCM 全部添加 `::float8` 转型或改用 `Decimal`。

#### P1-2 · DateTime<Utc> 映射 DATE 列

DATE 无时间分量，sqlx 解码失败。已修复：全部添加 `::timestamptz` 转型。

#### P1-3 · 主查询缺失 deleted_at IS NULL 过滤

已修复：全服务 list/get 查询均补齐。

#### P2-1 · FK 引用错误 schema

已修复：HRM contracts.employee_id FK 修正 + 全服务 FK 审计无跨 schema 问题。

#### P2-2 · CHECK 约束过严

已修复：迁移删除全部 492 个 `ck_*_status_standard` 约束。

### 验收标准（7/7 全绿）

1. 全服务 CRUD 深度验证通过率 100%
2. SELECT 缺 tenant_id 返回 0 条
3. email/phone/id_card 列无 VARCHAR(≤128) 定义
4. NUMERIC 列有 `::float8` 转型或 `Decimal` 类型
5. list/get 查询均含 `deleted_at IS NULL` 过滤
6. 无跨 schema FK 引用错误
7. `ck_*_status_standard` CHECK 约束已删除

---

## P1 · V232 — i18n Strict-Zero + Design Token + Finance Handler + Gate 升级

> **完成日期**：2026-08-21 · P0-P4 全部完成，5/5 KPI 全绿。
> **提交**：`a85b4b38e` · `5c449d014`

| 批次 | 任务 | 交付结果 | 状态 |
|------|------|---------|------|
| P0 | Finance Handler 接入生产调用 | voucher_generation.rs 真实查询实现 | ✅ |
| P1 | i18n Strict-Zero：剩余硬编码 280→0 | precise scan --strict 全仓 0 hits | ✅ |
| P2 | 616 Design Token 收尾 | Design Token 429→28 | ✅ |
| P3 | 9→11 Gate 升级 | Gate M=11 条，lefthook + ci.yml 固化 | ✅ |
| P4 | SEAL 11-Gate + Actual/Status 全填 | 11-Gate 本地实跑全绿，16 行全填无 TBD | ✅ |

---

## Backlog 全量完成清单（5 大主题 16 条）

### P1 · 长期高价值

| # | 主题 | 子项完成情况 |
|---|------|------------|
| 1 | Dify AI 端到端闭环 | ① Docker Compose + Ollama ② 前端 DifyChatPage + SSE chat_stream ③ WorkflowOrchestrator 接入 DifyService + e2e 冒烟测试 |
| 2 | Tauri 5 件套剩余 3 件 | ② 平台原生 Keychain（`keyring` crate 三平台） ③ 启动自动解锁（首启随机生成 32B 主密码） ⑤ 迁移 auth_token.enc → Stronghold + JSON 导入工具 |

### P2 · 质量深化

| # | 主题 | 子项完成情况 |
|---|------|------------|
| 3 | Frontend 泛型第二轮深度细化 | ① TypeMap 基础设施 + 32 模块全量迁移（~160 interface） ② Props 对齐 AST 扫描器 Pattern A+B + Dead Props 清理 131 interface，359 routes × 100% realness |
| 4 | Perm Gate Scanner 长期演进 | ① SCAN_FRONTEND AST 升级（37 config × 391 navCodes × 873 PERM） ② 旧脚本删除（3 个，引用全迁移至 `perm-matrix-toolkit.cjs`） |
| 5 | CI 收紧双开关切换 | ① frontend-typecheck shared packages `exit $FAILED`（blocking） ② cargo test `continue-on-error: false`（blocking） |

### P3 · 死代码 & 工具链小步优化

| # | 主题 | 子项完成情况 |
|---|------|------------|
| 6 | ts-unused-exports 扩面清理 | ① 4 小项目扫描（2707 文件 / 9604 exports，0 条 dead） ② apps/web L1-VALUE 514→96 dead（验证脚本修复 3 bug，保守删除 96 条跨 29 文件，tsc 0 new errors） ③ scanner `--no-skip-underscore` + `--dir` CLI 选项 |
| 7 | Tauri 生态完善 | ① 请求级取消（CANCEL_TOKENS + RAII guard） ② 离线冲突解决（ConflictResolution 枚举） ③ 密钥轮换（rotate_master_key + 备份回滚） ④ 审计日志前端页面（audit.ts + AuditLogPage + ExportWizard，已接入 /audit 路由 + 侧边栏导航） ⑤ 跨窗口事件通信（broadcast_event + SUBSCRIPTIONS） |
| 8 | crm unused warnings 清理 | `cargo check -p topems-crm` 0 warnings |

---

## 版本节点映射

| 版本 | 承接工作包 | 状态 |
|------|-----------|------|
| V259 | V252 CRUD Phase 1-2 + V232 P0 Finance Handler | ✅ |
| V260 | V252 CRUD Phase 3 + V232 P1 i18n Strict-Zero | ✅ |
| V261 | V252 CRUD Phase 4-5 + V232 P2/P3 Design Token + Gate | ✅ |
| V262 | V252 CRUD Phase 6 + V232 P4 SEAL + Dify POC | ✅ |
| V263 | Tauri 5 件套 + Perm Scanner AST + TypeMap 32 模块 | ✅ |
| V264+ | CI 双开关 blocking + ts-unused-exports 3/3 + Tauri 生态 5/5 | ✅ |

---

## 质量门禁基线（V264+ 封版）

- axum-layer-gate R1/R2/R3 = 0/0/0
- perm-gate R1/R3/R5 = 0/0/0
- cargo check 0 errors · CRM 0 warnings
- tsc apps/web 0 errors · tsc shared packages 6/6 passed
- props-alignment 100% realness (359 routes)

## 代码净减统计

- V254(-531) + V257(-29→0 tsc) + V258(-2814 dead exports) + V257 BFF 清理(-19074) + V264+(-96 dead exports) ≈ **净减 22,500+ 行**
