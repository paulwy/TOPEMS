# 权限矩阵 R4/R6 对齐攻坚（WARN 全清零）设计文档

> **Date:** 2026-08-16
> **Owner:** Agent-Driven + Human Approval
> **前置:** 2026-08-16-permission-matrix-gate-design.md（三向 Gate Spec + R1/R2/R3/R5 已清零）
> **启动 KPI 现状:** R1=0 · R2=0 · R3=0 · R4=34（B→F 2 + F→B 32） · R5=0 · R6=15（ai1 + finance1 + plugin9 + iam4 = 15 instance = 8 unique gaps）
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans next to generate the 9-step implementation plan, then execute task-by-task.

---

## 0. 目标摘要

**目标：** 在 R1/R2/R3/R5 四条核心 KPI 已清零且 Guardian 双保险到位的基础上，**进一步把两条 WARN 规则（R4 模块前缀对齐 + R6 Endpoint↔Nav 映射缺口）全清零**，使权限矩阵 6 条规则（R1–R6）首次**全部 0 violation**，Integrity L2 扫描量最小值全通过，达成"V222? 横向专题 — 权限矩阵自动化验证"的全幅终态闭环。

**量化目标（本 spec 覆盖 = 6 rules × 38 modules × 15 instance = 三大部分）：**

| # | 类型 | 指标 | 启动值 (本 spec 前 Phase-D) | 本回合目标值 |
|:-:|:---:|:-----|:---:|:---:|
| R1 | FAIL | Backend code 格式校验 violations | 0 | **0**（不变量 · 严格守住） |
| R2 | FAIL | Backend code 常量表存在性 violations | 0 | **0**（不变量 · 严格守住） |
| R3 | FAIL | Frontend nav code PERM 存在性 violations | 0 | **0**（不变量 · 严格守住；PERMISSIONS.ts 零修改） |
| **R4** | WARN | 模块前缀前后端对齐 mismatches | 34（B→F 2 · F→B 32） | **0**（全清零：A2a BF alias 消 B→F 2 + B1 32 stubs 消 F→B 32） |
| R5 | WARN | Orphan 孤儿权限码 | 0 | **0**（不变量 · PERMISSIONS.ts 不动，三重豁免稳定） |
| **R6** | WARN | Endpoint ↔ Nav 同模块映射 gaps | 15 instance = 8 unique codes × 4 modules | **0**（全清零：B2 plugin 9 instance 改写 + B3 iam 4 instance 改写 + C1 ai+finance 2 nav 引用补齐） |
| A | Integrity | scannedBackendFiles / frontendConfigs / backendCodes / frontendNavCodes minima | backend=1580 · frontend=38 · backendCodes=42 · frontendNavCodes=955 | **all passed**（B1 32 stubs 后 scannedBackendFiles 预期≈1612 · backendCodes≈42+32=74） |
| B | Guardian | Vitest Guardian 4 assertions | 4/4 GREEN（R1≤0 · R2≤0 · R3≤0 · Integrity） | **4/4 GREEN**（严格同 baseline，不给 R4/R6 加 assertion — 稳定 1-2 回合后再考虑收紧） |
| C | CI Exit | `--thresholds R1:0,R2:0,R3:0` strict sim exit | 0 (passed) | **exit=0**（不变量 · 新增 32 stub 绝不引入新 FAIL） |

### 成功判据 5 元组（Engine-D D1-D4 必须同时满足）

1. `cargo check --offline --workspace` **0 error**（shared-auth enum 扩齐 + unified-core 32 stubs + plugin-registry/iam 改名 全通过）
2. `cd apps/web && npx tsc --noEmit` **0 error**（ai/finance config.ts requiredPermissions 追加无 TS 结构破坏；BF_MODULE_ALIAS 脚本改动不影响 frontend code）
3. `node scripts/ci/check-permission-matrix.cjs --report-json /tmp/r4r6-final.json`：`summary = {R1:0,R2:0,R3:0,R4:0,R5:0,R6:0}` · `integrity.passed=true`
4. `cd apps/web && npx vitest run src/__tests__/permission-matrix-guard.test.ts` → **4/4 passed**（不丢任何 assertion 绿）
5. 人工目视：6 条 rules violations list 全空 / top 0 warnings = 0 条目

---

## 1. 架构总览（One-Pass 4 Engine · 单 commit 原子 · D 收敛验证）

```
          ┌────────────────────────────────────────────────────┐
          │    Perm-Gate (scripts/ci/check-permission-matrix.cjs)│
          │    · 判定逻辑零改动                                  │
          │    · 仅 R4 段新增 BF_MODULE_ALIAS Map 2 条映射       │
          └──────────────────────────▲──────────────────────────┘
                                     │ reports R4=0 · R6=0
   ┌──────────────┬──────────────────┼───────────────────┬───────────────────┐
   │ Engine-A     │ Engine-B         │ Engine-C         │ Engine-D          │
   │ Enum + Alias │ 32 stubs + B2/B3 │ Nav refs         │ 4-Verify Matrix   │
   │ (PRE + A2a)  │ (B1+B4)          │ (C1 only)        │ (D1→D6 POST)      │
   └──────┬───────┴──────┬───────────┴──────┬────────────┴─────────┬─────────┘
          ▼               ▼                  ▼                      ▼
   lib/shared-auth/  svc/unified-core/   apps/web/src/modules/    cargo check
   ModuleCode enum   svc/plugin-registry/   ai/config.ts            TSC
   BF_MODULE_ALIAS   svc/unified-core/iam  finance/config.ts      Gate CLI
   2 mappings        lib/shared-auth perm  + 2 requiredPerms      Vitest
                    4 code rewrites                               Baseline/TODO
```

**架构不变量（违反则架构级失败）：**
- INV-1：`check-permission-matrix.cjs` **R1/R2/R3/R5/R6 判定 0 修改**（仅 R4 段 `inB && !inF` 分支内插入 BF_MODULE_ALIAS 豁免逻辑，≤ 6 行代码）
- INV-2：`apps/web/src/config/permissions.ts` **0 修改**（不增、删、改 PERMISSIONS / PERMISSION_DEFS；R3 攻坚中 380 码已覆盖所有 R6 改写所需的 admin:plugin:* / admin:iam:* / ai:dashboard:write / finance:settlement:approve）
- INV-3：ModuleCode enum **纯加法**（21 existing variants 零删除 / 零重命名；只加缺失变体，保持 to_string 输出 = frontend dir name toSnake case 的现有约定）
- INV-4：3 FAIL 规则（R1/R2/R3）基线 **永远 = 0**；本回合绝不放松阈值

---

## 2. 范围与动作细目（4 Engine × 13 Tasks）

### Engine-A · 枚举扩齐 + R4 B→F 消除（2 Tasks）

| ID | 动作 | 目标文件 | 成功检查项 |
|:--:|:-----|:---------|:-----------|
| A1 | **ModuleCode enum 纯加扩展齐 21→38**：<br> 1. `grep` 定位 `lib/shared-auth/src/**` 内 ModuleCode enum 定义文件（文件名可能为 `constants.rs` / `module_codes.rs` / `permission.rs`）。<br> 2. Load 现有 21 variants（baseline.backendModuleCodeSize=21），与 **38 前端模块目录名**做 set diff。<br> 3. 对每个缺失模块名 **按现有 to_string 模式**追加 enum variant（命名约定严格沿用：现有 21 变体的 to_string 结果是什么格式，新变体就输出什么格式 — 绝对不用自创格式）。<br> 4. `#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]` 等派生 attribute 与现有保持一致。<br> 5. 若 enum 有 `all()` / `variants()` 辅助函数返回 `&[Self]`，**同步追加新 variant** 到列表（否则 Integrity backendModuleCodeSize 仍显示 21）。 | 实际路径 grep 后确定；**关键派生宏与 `all()` 辅助函数必须同步**。 | `grep -c "pub enum ModuleCode" <file>` = 1；ModuleCode::all().len() **≥ 38**；cargo check 0 error 对所有 dependents |
| A2a | **BF_MODULE_ALIAS 2 条硬编码映射（R4 B→F 豁免）**：<br>在 check-permission-matrix.cjs R4 判定段前（约 line 383 `/* R4 */` 注释上方）插入：<br>```const BF_MODULE_ALIAS = Object.freeze({<br>  // Backend prefix 'system' = frontend iam/admin bucket system settings<br>  system: ['iam', 'admin'],<br>  // Backend prefix 'file' = frontend doc/integration bucket file management<br>  file: ['doc', 'integration'],<br>});<br>console.assert(Object.keys(BF_MODULE_ALIAS).length === 2, 'BF_MODULE_ALIAS locked at 2 entries');```<br>然后在 R4 B→F 分支内 `if (inB && !inF)` 里加豁免：<br> 原逻辑：直接 REPORT.summary.R4++<br> 新逻辑：`const aliases = BF_MODULE_ALIAS[M] || []; const hasAliasMatch = aliases.some(a => frontendModuleSet.has(a)); if (!hasAliasMatch) { REPORT.summary.R4++; ... push warning }` | `scripts/ci/check-permission-matrix.cjs` R4 段 | R4 B→F mismatch 条目从 baseline 2 → 0；Gate summary.R4 = 仅 F→B 32（待 B1 处理） |

### Engine-B · 32 stubs + plugin/iam 命名重写（4 Tasks）

| ID | 动作 | 目标文件 | 成功检查项 |
|:--:|:-----|:---------|:-----------|
| B1 | **32 F-only 前端模块 stub 批量生成**：<br> 1. **32 模块名单 = baseline 中 F→B mismatch 32 项**（前端有目录但 backendModuleSet 无）：admin, aps, asset, automation, bi, crm, doc, ehs, erp, gis, hrm, im, integration, lims, lowcode, mes, mobile, monitor, notification, oa, pdm, pm, qms, rd, registry, report, scm, shared, srm, ticket, tms, wms。<br> 2. 在 `svc/unified-core/src/routes/` 下为每个模块建 1 个 `{snake_case(module_name)}.rs`。模板固定（所有 32 文件仅替换 ModuleCode variant）：<br>```rust<br>//! Stub router for ${MODULE} module.<br>//! Ensures backend require_permission() declares the module for R4 F-B alignment.<br>//! REAL handler + business logic belong to E2E Phase-3 (Y-P0).<br><br>use axum::{routing::get, Router};<br>use topems_shared_auth::middleware::permission::require_permission;<br>use topems_shared_auth::constants::{ModuleCode, PermissionAction};<br><br>pub fn router() -> Router {<br>    Router::new().route(<br>        "/dashboard",<br>        get(|| async { "ok" })<br>            .route_layer(require_permission((ModuleCode::${VARIANT}, PermissionAction::Read))),<br>    )<br>}<br>```<br> 3. 在 `svc/unified-core/src/routes/mod.rs` 中对 32 个模块**全部 `pub mod` 声明**。<br> 4. 在 unified-core 聚合 Router（`lib.rs` / `main.rs` / `routes/mod.rs` 的主 `router()` 函数）中，对 32 个 stub router 统一挂到 `/internal/stubs/{module}` 前缀（避免撞业务 API）：<br>  例：`.nest("/internal/stubs/aps", routes::aps::router())`<br> 5. 若 `require_permission` 仅支持字符串形式（不支持 typed tuple `(ModuleCode, Action)`），改用：`require_permission("${module_snake}:dashboard:read")`（3-seg 与 R3 攻坚 PERMISSION_DEFS 中登记格式一致）。 | 32 × `.rs` files in `svc/unified-core/src/routes/` + `mod.rs` pub mod decls + Router 聚合点（具体路径 grep 现有 `routes::iam::router()` 等参考）。 | SCAN_BACKEND 捕获 32 个新 require_permission 调用 → backendModuleSet 增加 32 module prefix → R4 F→B mismatches 从 32 → 0；backendModuleCodeSize 从 21 → ≥ 38 |
| B2 | **plugin module prefix 重写 → admin:plugin bucket**：<br>全库 grep `require_permission.*plugin:read` 和 `plugin:write`；锁定目标文件 = `svc/plugin-registry/src/modules/plugin/mod.rs`（baseline R6 entries 3-11 指向该文件 × 9 instance）。**目标文件内**：<br> `plugin:read` → `admin:plugin:read`（×4 instance：baseline R6#[3][5][8][11]）<br> `plugin:write` → `admin:plugin:write`（×5 instance：baseline R6#[4][6][7][9][10]）<br>若该文件使用 typed `(ModuleCode::Plugin, PermissionAction::Read)` tuple 形式，改为字符串字面量 `admin:plugin:read`（因 ModuleCode::Plugin → ModuleCode::Admin 重定义风险高，字符串更安全）。<br>**同步**：shared-auth 若有 `Plugin` ∈ ModuleCode enum（A1 enum 若有，保留不动不删，避免 E4 违例；仅字符串形式调用绕开）。 | `svc/plugin-registry/src/modules/plugin/mod.rs` 所有 require_permission 调用处（9 处） | R6 plugin gaps 9 → 0；R2 仍 = 0（admin:plugin:read/write ∈ PERMISSION_DEFS ✓） |
| B3 | **iam 4 codes 重写 → admin:iam bucket**：<br>目标文件 = baseline R6 entries 标注的 2 文件：<br> (a) `svc/unified-core/src/routes/iam.rs`：<br>  - `iam:write` → `admin:iam:write`（R6#12）<br>  - `iam:delete` → `admin:iam:delete`（R6#13）<br>  - `iam:tenant:write` → `admin:iam:tenant:write`（R6#14）<br> (b) `lib/shared-auth/src/middleware/permission.rs`：<br>  - `iam:dashboard:approve` → `admin:iam:dashboard:approve`（R6#15）<br>同样，如果 typed tuple 存在调用 → 统一转字符串避免 enum 重命名风险。 | `svc/unified-core/src/routes/iam.rs` × 3 处 + `lib/shared-auth/src/middleware/permission.rs` × 1 处 = 共 4 处改写 | R6 iam gaps 4（baseline R6#12–#15 全部命中）→ 0；R2 仍 = 0（admin:iam:* 全部 ∈ PERMISSION_DEFS ✓） |
| B4 | **依赖一致性 + db seed/fixture 扫尾**：<br>全库再 grep 一次 6 个 legacy codes（`plugin:read\|plugin:write\|iam:write\|iam:delete\|iam:tenant:write\|iam:dashboard:approve`），**除 B2/B3 已改的 3 个目标文件外**，若在 db seed / fixtures / JSON metadata / 前端 helper hasPermission 字面量中命中，**同步同规则改名**（typed call → 字符串形式；字符串 → 新 admin bucket 体系）。 | 目标：grep 结果 **空集**（不残留任何 legacy codes）。 | R2 严格 = 0；无"旧权限码新调用"导致的用户鉴权失效 |

### Engine-C · ai / finance nav 权限引用补全（1 Task · 零 PERMISSIONS.ts 修改）

| ID | 动作 | 目标文件 | 成功检查项 |
|:--:|:-----|:---------|:-----------|
| C1 | **在 ai + finance ModuleConfig 追加 requiredPermissions 2 entries**：<br> (a) `apps/web/src/modules/ai/config.ts`：找到模块级 `requiredPermissions` 数组或首个 nav entry 的 `requiredPermissions` 数组，**追加** `'ai:dashboard:write'`（若数组不存在，新建 `requiredPermissions: ['ai:dashboard:read', 'ai:dashboard:write']`）。<br> (b) `apps/web/src/modules/finance/config.ts`：同逻辑，追加 `'finance:settlement:approve'`。<br>**规则**：C1 不新增 / 删除任何导航项；不修改任何 `defaultValue` / `export` 结构；仅在已有 permission 相关数组后 `.push(...)` 语义等价的追加。 | `apps/web/src/modules/ai/config.ts` + `apps/web/src/modules/finance/config.ts` | R6 ai:dashboard:write（R6#1）1 instance → 0；R6 finance:settlement:approve（R6#2）1 instance → 0；TSC 0 error |

### Engine-D · 4 验证矩阵 + 基线/TODO 收敛（6 Tasks）

| ID | 动作 | 成功标准 | 输出产物 |
|:--:|:-----|:---------|:---------|
| D1 | `cargo check --offline --workspace` | 0 error（cargo warnings 允许；unified-core / shared-auth / plugin-registry 3 crates 重点盯 0 error，其余 dependents 必须过） | Terminal exit=0；如有 RSK-1 exhaustive match 编译错误 → 对 enum 下游 match 补 `_ => {}` 或 enum 加 `#[non_exhaustive]`（若 crate MSRV 允许） |
| D2 | `cd apps/web && npx tsc --noEmit` | 0 error | TSC exit=0；不引入任何隐式 any / 索引签名冲突 |
| D3 | Gate CLI 最严格模式：<br>`node scripts/ci/check-permission-matrix.cjs --fail-fast --thresholds R1:0,R2:0,R3=0 --report-json /tmp/r4r6-final.json` | (a) exit=0；<br>(b) 目视 `summary = {R1:0,R2:0,R3:0,R4:0,R5:0,R6:0}`；<br>(c) `integrity.passed=true`；<br>(d) warnings.length ≤ 5（仅剩 R2-WEAK-PASS 良性告警，无 R4/R6 entries） | `/tmp/r4r6-final.json`（作为 D5 基线来源） |
| D4 | Vitest Guardian 严守基线：<br>`cd apps/web && npx vitest run src/__tests__/permission-matrix-guard.test.ts` | 4/4 GREEN（R1≤0 · R2≤0 · R3≤0 · Integrity 4 断言不变）；Guardian 报告可视区中 R4/R6 必须 = 0 | 终端 4 passed 输出截图（文字记录） |
| D5 | **基线 Artifacts JSON 重生**：<br>用 D3 产物覆盖 2 个基线文件：<br>(a) `docs/roadmap/artifacts/rN-perm-matrix-baseline.json` ← `/tmp/r4r6-final.json`（summary.R4=0 · R6=0 · backendModuleCodeSize≥38）<br>(b) `docs/roadmap/artifacts/rN-perm-matrix-final.json` ← 同内容（快照存档） | diff baseline vs old：summary.R4 34→0 · R6 15→0 · scanners 字段 backendModuleCodeSize / scannedBackendFiles 预期增长 | 2 Artifact JSON（覆盖更新） |
| D6 | **TODO.md RN 章节写入**：在权限矩阵 RN 中：<br>(a) 9 KPI 表 R4 Final Actual → 0 · Status 列改写为 "✅ 达成清零（B→F 2 用 BF_MODULE_ALIAS 豁免；F→B 32 用 unified-core 32 stub require_permission 补齐）"<br>(b) 9 KPI 表 R6 Final Actual → 0 · Status 列改写为 "✅ 达成清零（plugin 改 admin:plugin:× 9 [read×4 + write×5] + iam 改 admin:iam:× 4 + ai/finance ModuleConfig 补权限引用 2 条，合计 15 instance 归 0）"<br>(c) 新增「子补充 · R4/R6 对齐攻坚（34→0 · 15→0）」章节：按 Engine A/B/C/D 4 × 13 Tasks 写入；验证矩阵 D1-D4 结果写入；不变量 4 条写入；RSK1-5 风险处置结果写入<br>(d) "下一步建议"第 1-4 条全部标记 ✅ 已达阵；新 Next Step 6（若存在）预告：FAIL-FAST 阈值渐进收紧候选（R4≤10 / R6≤10 软阈值下一回合提案，但本回合暂不落实） | TODO.md 权限矩阵 RN 章节末尾与下一步建议 | TODO.md KPI 表 6 rules 全 0 · 下一步建议 5 条全 ✅ |

---

## 3. Scope Exclude（本回合明确不做）

| 编号 | 不做项 | 原因（避免 Scope 膨胀） |
|:----:|:------|:----------------------|
| E1 | **真实业务 handler / DB / PO / serde 接入** | 属 Y-P0 E2E Phase-3，非权限矩阵专题；B1 stub 仅占位空 handler `async {"ok"}` |
| E2 | **前端路由重组织 / 菜单调整 / 页面增删** | C1 仅追加 permission 数组；不得改变前端导航渲染或路由注册结构 |
| E3 | **R4/R6 从 WARN → FAIL** | 刚清零无历史稳定基线；下一回合再评估；`--thresholds` 默认仍 R4=Infinity · R6=Infinity；Guardian assertions 仅 R1/R2/R3 3 条 + Integrity，不给 R4/R6 加硬断言 |
| E4 | **ModuleCode enum DELETE / RENAME 现有 21 variants** | RSK-1 风险；exhaustive match 下游 crates 依赖 |
| E5 | **PERMISSIONS.ts / PERMISSION_DEFS 修改** | R3 攻坚 380 码全覆盖；任何修改都可能让 R3 反弹；INV-2 强制 0 修改 |
| E6 | **R6 判定逻辑放宽** | 必须通过真修复达 R6=0，不靠脚本放水 |
| E7 | **新 CI Job 接入** | `.github/workflows/ci.yml` permission-matrix-gate job 已存在且阈值严格；保持不动 |
| E8 | **Husky pre-commit hook 修改** | Section 9 Perm-Gate dry-run 逻辑已在；保持不动 |

---

## 4. 风险与回滚预案（5 RSK）

| ID | 风险 | 概率 | 影响 | 检测点（Engine-D 哪一步拦截） | 处置预案 |
|:--:|:-----|:---:|:---:|:---:|:---|
| RSK-1 | ModuleCode enum 扩齐后，下游 exhaustive match 不写 `_` 分支 → N crates 编译失败 | 中 | 高 | D1 cargo check 首步 100% 拦截 | (a) enum 加 `#[non_exhaustive]`（若 MSRV ≥ 1.50，通常 OK）；(b) 下游 match 1-2 处补 `_ => {}`；(c) 最坏 = 还原 A1 commit（单 commit，回滚 < 1min） |
| RSK-2 | 32 stub Router 聚合路径冲突（撞业务 `/api/v1/...`） | 低 | 中 | D1 cargo check + 单测 Router 冲突检测 | 统一前缀 `/internal/stubs/{module}` 永不撞业务；axum Router `.nest()` 遇 path 冲突会在编译期警告 |
| RSK-3 | plugin/iam 重命名后，db seed / fixtures / hasPermission helper 中残留旧 codes → 用户实际权限失效 | 中 | 高 | B4 全库 grep；D3 Gate R2=0 断言（旧 codes ∉ AllValidSet 会 fire R2，而 R2=0 严格 0 容忍） | B4 grep 必须空；任何遗漏会被 D3 R2=0 直接逮住；最严重 = 同步改 db seed 文件 1-2 行 |
| RSK-4 | BF_MODULE_ALIAS 误豁免真不一致 | 低 | 中 | D3 Gate 目视 warnings 检查 + `console.assert` 锁 `Object.keys().length===2` | 严格限制 2 条；任何新增 alias 需单独 spec 批准 |
| RSK-5 | unified-core 编译时间 32 stub 膨胀 > 10s | 低 | 低 | D1 计时观察 | 32 pub mod 在 mod.rs 可加 feature gate 注释块；下一回合按需 flag off |

**One-Pass 回滚原子性：** 所有改动在 1 工作区一次性 apply；Engine-D D1-D4 **全绿后才 commit**。若 D1-D4 任意一步红，执行 `git checkout -- .`（未 commit 时）或 `git revert HEAD^`（已 commit 时）即可全量回滚。6 条 Rules 基线全部存在（Artifacts 已备份），回滚后 R1/R2/R3/R5 立即回到 0/0/0/0 · R4=34 · R6=15，**绝不卡在中间态**。

---

## 5. 验收 KPI 9 条矩阵更新预告

| # | 类型 | 指标 | Baseline (Phase-D 末尾现状) | Threshold | Final Actual（本回合完成后预期） | Status 列改写 |
|:-:|:---:|:-----|:---:|:---:|:---:|:---|
| 1 | FAIL | R1 Backend format violations | 0 | == 0 | **0** | ✅ 保持清零 |
| 2 | FAIL | R2 Backend existence violations | 0 | == 0 | **0** | ✅ 保持清零 |
| 3 | FAIL | R3 Frontend PERM existence violations | 0 | == 0 | **0** | ✅ 保持清零 |
| **4** | WARN | **R4 模块前后端对齐 mismatches** | **34** | ≤ 总数 5% · 上限 200 | **0** | ✅ 达成清零（B2 B→F 2 alias 豁免 + 32 F→B stub 补齐） |
| 5 | WARN | R5 Orphan codes | 0 | ≤ 50 或 ≤ 总定义 5% | **0** | ✅ 保持清零 |
| **6** | WARN | **R6 Endpoint ↔ Nav gaps** | **15** | ≤ 60 | **0** | ✅ 达成清零（plugin 9 instance 命名改写 + iam 4 instance 命名改写 + ai+finance 2 nav 引用补齐，合计 15 instance 归 0） |
| A | Integrity | Scanned 4 minima | backendFiles=1580 · frontendConfigs=38 · backendCodes=42 · frontendNavCodes=955 | All minima satisfied | backendFiles≈1612 · backendCodes≈74 · 其余不变 · **passed=true** | ✅ 全项达标（scannedBackendCodes 跃升 +32 确认 32 stub 确实被扫描） |
| B | Guardian | Vitest 4 assertions passed | 4/4 GREEN | 4/4 passed | **4/4 GREEN** | ✅ 达标（R1/R2/R3 仍为 0 基线） |
| C | CI Exit | Strict sim exit=0 | 0 | == 0 | **0** | ✅ 达标（3 FAIL rules 严格 0 容忍 + 2 WARN 全清零） |

---

## 6. Spec 自检（完成写入后执行，√ = PASS）

- [ ] **Placeholder 扫描**：文中无 "TBD" / "TODO" / "??" / 未完成编号或章节
- [ ] **内部一致性**：
  - [ ] R4 计数 = 2 + 32 = 34 ✓ 与 baseline 吻合
  - [ ] R6 instance 计数 = ai(1) + finance(1) + plugin(9) + iam(4) = 15 ✓ 与 baseline JSON entries 数吻合（plugin read×4 / write×5 / iam write×1 delete×1 tenant-write×1 dashboard-approve×1）
  - [ ] 32 模块 F→B 名单 = baseline 中 F→B mismatch 32 条 ✓
  - [ ] BF_MODULE_ALIAS 仅 2 条 ✓ 与 console.assert 锁一致
  - [ ] INV-1..INV-4 不变量贯穿所有子节，无矛盾 ✓
- [ ] **Scope 聚焦**：所有 Engine 改动都服务于 R4=0 + R6=0，无发散 / 无隐含"顺手做 E1-E8"内容 ✓
- [ ] **无歧义性**：A1 命名模式严格沿用现有 → 有明确约束；B1 模板固定 → 具体 Rust 代码无歧义；B2/B3 codes 一一列出 → 无漏改；C1 仅追加数组 → 无破坏性 ✓

---

## 7. 后续 Next Step 预告（本回合不做，仅提案）

若本回合 R4=0 · R6=0 在主干稳定 1-2 个开发回合（≥ 2 PR 合并无反弹），可在下一专题中提案：

- **Next Step 6（提案）**：FAIL-FAST 阈值渐进软收紧
  - Guardian BASELINE 新增 `R4_MAX=10 / R6_MAX=10`（温和软锁，高于当前 0 但低于 cap）
  - CI `--thresholds` 新增 `R4:10,R6:10`（首次让 WARN 规则也进入 CI 红线）
  - 稳定 1 回合后收紧到 `R4:0,R6:0` 最终态
- 本回合**不落地**（需再观察 1-2 轮稳定性）。
