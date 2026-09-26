# 权限矩阵三向自动化验证（A 档严格全量 · Gate 模式复用 P4）设计文档

> **Date:** 2026-08-16
> **Owner:** Agent-Driven + Human Approval
> **承接:** R12 X/Y/Z（i18n 质量门 + ERP E2E + CI 深水区）· R13 V222 P4（i18n 硬编码清零双保险）
> **V222? 候选定位:** 质量横向专题 — 权限矩阵自动化验证
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans next to generate the 9-step implementation plan, then use executing-plans or subagent-driven-development task-by-task.

---

## 0. 目标摘要

**目标：** 对后端路由（Axum `require_permission`）、前端导航（Routes + NavTree + ModuleConfig）、权限标识常量表（前端 PERMISSIONS TS 对象 + 后端 ModuleCode×PermissionAction 笛卡尔）进行 A 档严格全量三向一致性校验，建立 **CI Gate (dry-run 默认 + fail-fast 可选) + Vitest Guardian ≤baseline 双保险**，严格区分"事实层 FAIL（硬错）"和"推断层 WARN（需人工二次确认）"两层，彻底消除"后端要求权限 X vs 前端 UI 配置权限 Y 对不上"导致的权限越权/权限缺失问题。

**量化目标 3+3+2+1 = 9 条 KPI：**

| 编号 | 类型 | 指标 | 启动值 (Phase-0 baseline 实取) | A 档阈值 |
|:----:|:----:|------|:-------------------------------:|---------:|
| 1 | 硬 FAIL | R1 Backend code 格式校验 violations | TBD | **== 0**（fail-fast 触发项） |
| 2 | 硬 FAIL | R2 Backend code 常量表存在性 violations | TBD | **== 0**（fail-fast 触发项） |
| 3 | 硬 FAIL | R3 Frontend nav code PERMISSIONS 存在性 violations | TBD | **== 0**（fail-fast 触发项） |
| 4 | WARN | R4 模块前缀前后端对齐 mismatches | TBD | ≤ 总量 5%（WARN only，不触发 fail） |
| 5 | WARN | R5 Orphan 孤儿权限码（静态定义：未被 B/F 两侧引用） | TBD | ≤ 50 条 或 ≤ 常量表总数 5% |
| 6 | WARN | R6 Endpoint ↔ Nav 同模块交叉映射缺口 | TBD | ≤ 20 条（WARN only，人工审阅） |
| A | 守护 | CI Gate integrity 扫描量（防假绿） | N/A | scannedBackendFiles≥50 · scannedFrontendConfigs≥20 · totalBackendCodes≥100 · totalFrontendNavCodes≥100 全部满足 |
| B | 守护 | Vitest Guardian assertions passed | N/A | **3/3 passed**（R1≤baseline · R2≤baseline · R3≤baseline；首次不是 toBe 0，等团队清零后 PR 收紧） |
| C | 守护 | CI Gate dry-run exit code | N/A | **== 0**（dry-run 默认永不红；fail-fast 启用后需 1/2/3 条都 == 0 才 exit 0） |

---

## 1. 架构总览（P4 同构 60% 骨架复用 · 吸收 847749 合规默认）

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ 权限矩阵三向自动化验证 — A 档严格全量                                                │
│                                                                                   │
│  NEW: scripts/ci/check-permission-matrix.cjs (1 file · ~650 lines · Node CJS)     │
│                                                                                   │
│  ┌─ CLI (reuse P4 args pattern) ────────────────────────────────────────────────┐ │
│  │  --dry-run (=DEFAULT, **NEVER exit≠1 除非显式 --fail-fast**)                  │ │
│  │    → 吸收 847749：首次接入 CI 不打红现有 PR，渐进启用                            │ │
│  │  --fail-fast [默认阈值: R1≥1 OR R2≥1 OR R3≥1 → exit 1]                       │ │
│  │  --report-json=<path>   → machine-readable (reuse P4 fields)                 │ │
│  │  --scan=backend,frontend,constants  → 可单独扫某向（调试用）                    │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                            │
│  ┌─ Phase 1: 3 Scanners（1 file 内 3 函数，共享 fs cache / path 常量）───────────┐ │
│  │  ① scanBackendPermissions(svc/**/*.rs)                                        │ │
│  │     Regex: `require_permission\(\s*"([A-Za-z0-9_:.\-]+)"\s*\)`               │ │
│  │     Context 排除：// 行注释 · /* */ 块注释 包围的文本                          │ │
│  │     路径：TOPEMS_ROOT/svc/*/src/**/*.rs                                       │ │
│  │     Output: [{ crateName, filePath, lineNo, code, axumRoutePath?, httpMethod? }]│ │
│  │                                                                                │ │
│  │  ② scanFrontendNavRoutes(apps/web/src)                                        │ │
│  │     3 来源合并：                                                               │ │
│  │     a. modules/*/config.ts: moduleConfig.permission / routes[i].requiredPerms│ │
│  │     b. layouts/navTree.ts: L2NavNode.permission 字段                          │ │
│  │     c. routes/v2/*.ts: RouteConfig.requiredPermissions[]                     │ │
│  │     Output: [{ module, navPathOrRoutePath, filePath, lineNo, perms:string[] }]│ │
│  │                                                                                │ │
│  │  ③ scanConstantsTables()                                                      │ │
│  │     a. apps/web/src/config/permissions.ts: PERMISSIONS 对象字面量所有 key     │ │
│  │        → Set<String> frontendPERMSet (300+)                                   │ │
│  │     b. shared-auth/src/permission.rs: ModuleCode 枚举 × PermissionAction 枚举 │ │
│  │        → Set<String> backendCartesianSet                                      │ │
│  │     c. [可选] scripts/data/permission-metadata.json 缓存（若存在则合并）      │ │
│  │     Output: AllValidSet = frontendPERMSet ∪ backendCartesianSet ∪ metadataSet│ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                            │
│  ┌─ Phase 2: Validator 6 Rules（A 档严格全量 · FAIL/WARN 分层）──────────────────┐ │
│  │  硬 FAIL（触发 fail-fast → exit≠1）：                                          │ │
│  │  R1  Backend code 格式校验（段数 2~4 · 字符集 · 模块名 ∈ 合法集合）             │ │
│  │  R2  Backend code ∈ AllValidSet（存在性）                                      │ │
│  │  R3  Frontend nav code ∈ frontendPERMSet（精确 key 匹配 + 大小写建议）        │ │
│  │                                                                                │ │
│  │  WARN only（绝不触发 exit≠1 · 吸收 847749：推断层需人工二次确认）：             │ │
│  │  R4  模块前缀前后端对齐（backend module name ↔ frontend module config present）│ │
│  │  R5  Orphan 孤儿权限码（简化静态定义：frontendPERMSet − backend引用 − 前端引用）│ │
│  │  R6  Endpoint ↔ Nav 同模块交叉映射缺口（M 模块有 code 但前端 M 模块没配）       │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                            │
│  ┌─ Layer 1·CI Gate（reuse P4 exit/report 模式）────────────────────────────────┐ │
│  │  node scripts/ci/check-permission-matrix.cjs --dry-run --report-json=...      │ │
│  │  exit: 0 GREEN 永远（dry-run）；--fail-fast 下 R1||R2||R3 ≥1 → exit 1 RED    │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│  ┌─ Layer 2·Vitest Guardian（同 P4 require() 调用架构）─────────────────────────┐ │
│  │  NEW: apps/web/src/__tests__/permission-matrix-guard.test.ts                  │ │
│  │  const { runGate } = require('./scripts/ci/check-permission-matrix.cjs')      │ │
│  │  Assertions (首次不是 toBe 0，收紧为 ≤ baseline 避免开发 `pnpm test` 直接红)   │ │
│  │    ① R1 violations ≤ baseline.R1  (toBeLessThanOrEqual)                       │ │
│  │    ② R2 violations ≤ baseline.R2                                              │ │
│  │    ③ R3 violations ≤ baseline.R3                                              │ │
│  │  WARN 不做断言，仅 console.log 摘要供团队审阅                                  │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 守护双保险对齐 P4 同构的关键设计

```
        Permission Matrix Gate (Layer-1)
         scripts/ci/check-permission-matrix.cjs
       ┌─────────────────────────────────────────┐
       │ --dry-run (default) → exit ALWAYS 0     │ ← 合规默认，首次接入不打红
       │ --fail-fast → R1||R2||R3 ≥1 exit 1      │ ← A 档硬 fail 规则
       │ --report-json=<path>                    │
       │ module.exports = { runGate, countR1R2R3 }│ ← 纯函数，供 Vitest 同进程 require
       └─────────────────────────────────────────┘
                   ↘ 函数同构调用（无进程开销）
          Vitest Guardian (Layer-2)
     apps/web/src/__tests__/permission-matrix-guard.test.ts
       ┌─────────────────────────────────────────┐
       │ 3 assertions:                            │
       │   R1 ≤ baselineR1  (软锁，不强制 0)      │
       │   R2 ≤ baselineR2                       │
       │   R3 ≤ baselineR3                       │
       │ （团队修完现存 violations 后，后续 PR    │
       │   可改为 R1.toBe(0) R2.toBe(0) R3.toBe(0)）│
       └─────────────────────────────────────────┘
                 3/3 passed?
                 YES → GREEN（永不再劣化 baseline）
```

---

## 2. 6 条规则详细定义（A 档严格全量 · FAIL/WARN 分层严格吸收 847749）

### 2.1 术语约定

- **code = 权限标识字符串**，格式由 `validate_permission_code` 定义：`module:action` 两段、`module:resource:action` 三段、`module:resource:action:scope` 四段（最多四段）。
- **frontendPERMSet** = `apps/web/src/config/permissions.ts` 中 `PERMISSIONS` 对象所有 key。
- **backendCartesianSet** = `{ModuleCode.variant}:{PermissionAction.variant}` 两两组合（两段式笛卡尔）。
- **AllValidSet** = frontendPERMSet ∪ backendCartesianSet ∪ metadataSet（permission-metadata.json 缓存）。
- **backendModuleSet** = 所有 `require_permission(code)` 的 code.split(':')[0] 去重。
- **frontendModuleSet** = `apps/web/src/modules/` 目录 basename 集合（finance/ erp/ hrm/ ...）。

| Rule ID | 名称 | 方向 | 判定条件 | 严重度 | 报告字段 |
|:-------:|------|:----:|---------|:------:|---------|
| **R1** | Backend 权限码格式校验 | ← 后端 | 对每个 `require_permission(X)` 同时满足：<br>① X 用 `:` 切分 len ∈ [2, 4]<br>② 每段非空 · 仅匹配正则 `^[a-z0-9_\-]+$`<br>③ **第一段模块名** ∈ (所有 ModuleCode 枚举变体 U frontendPERMSet 所有第一段前缀) | **FAIL**（硬错） | `failures[].rule="R1"` |
| **R2** | Backend 权限码常量表存在性校验 | ← 后端 + 常量表 | `X ∈ AllValidSet` → PASS。<br>否则额外检查 "弱匹配模式"：`split(X)[0]∈ 合法模块名集合 AND split(X)[last] ∈ {read,write,delete,approve,admin}` → **WEAK_PASS**（只输出 WARN，不计 FAIL，备注 "code 未在常量表显式声明但模块/动作匹配，建议补声明"）。<br>否则 → FAIL。 | **FAIL**（硬错） | `failures[].rule="R2"` · `warnings[].rule="R2-WEAK-PASS"` |
| **R3** | Frontend 导航权限码 PERMISSIONS 存在性校验 | ← 前端 + 常量表 | 前端每 perm ∈ frontendPERMSet **精确字符串匹配** → PASS。<br>若 perm ∉ frontendPERMSet 但 `perm.toLowerCase() ∈ {k.toLowerCase()|k∈frontendPERMSet}` → FAIL + msg 内建议正确大小写 `"Expected 'iam:Dashboard:Read' did you mean 'iam:dashboard:read'?"`。<br>否则 → FAIL + 建议"请在 config/permissions.ts 中补定义或修正拼写"。 | **FAIL**（硬错） | `failures[].rule="R3"` |
| **R4** | 模块前缀前后端对齐 | 交叉 B→F | ① M ∈ backendModuleSet 且 M ∉ frontendModuleSet → WARN "backend 模块 M 有 require_permission 校验，但前端 modules/M/ 目录未检出，请核对命名（例如 backend 叫 `pdm` 前端目录叫 `product` 的命名差异）"。<br>② M ∈ frontendModuleSet 且 M ∉ backendModuleSet → WARN "前端模块 M 有目录/导航配置，但 backend 未检出 require_permission（可能是 public 开放模块，正常；若不是则需补后端权限中间件）"。 | **WARN**（推断层，绝不 fail） | `warnings[].rule="R4"` |
| **R5** | Orphan 孤儿权限码（简化静态定义，无 git 数据） | 交叉 | `orphanSet = frontendPERMSet − backendCodesSet − frontendNavCodesSet`。<br>orphanSet 数量 > 0 → 输出 WARN 摘要 + 每个 orphan code 列出所在行号文件。<br>无论多少绝不触发 FAIL（847749 推断层不触发 exit）。 | **WARN**（绝不触发 fail-fast） | `warnings[].rule="R5"` 摘要 + `orphanCodes: [{code, file, line}]` |
| **R6** | Endpoint ↔ Nav 同模块交叉映射缺口 | 交叉 | 对每个 backend code X = `M:R:A`，若 M ∈ frontendModuleSet 且 frontendNavCodesSet 中不存在 `startsWith("${M}:")` 且包含 `:A`（动作相同）的 code → WARN "backend 模块 M 的资源 R 动作 A 有权限校验，但前端 M 模块导航/路由未检出含该动作的 permission 配置（可能 UI 未暴露，正常；若 UI 已暴露则需补前端权限字段）"。 | **WARN**（推断层，需人工二次确认） | `warnings[].rule="R6"` |

### 2.2 Fail-fast 阈值（A 档默认，写进脚本 const）

```javascript
const DEFAULT_FAIL_FAST_THRESHOLDS = {
  R1: 1,  // R1 violations >= 1 → FAIL
  R2: 1,  // R2 violations >= 1 → FAIL
  R3: 1,  // R3 violations >= 1 → FAIL
  R4: Infinity,
  R5: Infinity,
  R6: Infinity
};
// CLI 暴露扩展: --thresholds=R1:5,R2:3,R3:10（若团队需要渐进收紧，可调）
```

---

## 3. 文件清单 & 职责边界（严格 1+N 模式保持最小变更）

### 3.1 新建（6 files · 全部 P4 同构结构）

| # | 文件 | 大小估 | 作用 | 归属 |
|:-:|------|:-----:|------|------|
| 1 | `scripts/ci/check-permission-matrix.cjs` | ~650 | **核心 Gate 脚本**（1 file · 3 scanners · 6 rules · CLI · CJS export · Integrity L2 校验 · Dry-run 默认 exit handler）。60% 骨架抄 P4 scripts/ci/check-i18n.cjs（CLI 解析、--report-json 写入、summary 打印 block、module.exports 纯函数）。 | 脚本（CI） |
| 2 | `apps/web/src/__tests__/permission-matrix-guard.test.ts` | ~100 | Layer-2 Vitest Guardian。3 assertions：R1≤baseline.R1 · R2≤baseline.R2 · R3≤baseline.R3（首次不强制 0，后续团队清零后 PR 收紧为 toBe(0)）。 | 测试（Guardian） |
| 3 | `docs/superpowers/specs/2026-08-16-permission-matrix-gate-design.md` | ~280 | **本 spec 文档**（设计 7 节 + A 档 9 KPI 表 + FAIL/WARN 分层 + Scope Exclude + 5 commits 9 steps）。 | 文档 |
| 4 | `docs/superpowers/plans/2026-08-16-permission-matrix-gate.md` | ~900 | **实施计划**（writing-plans skill 产出，9 steps · 5 commits，命令级详细指引）。 | 计划 |
| 5 | `docs/roadmap/artifacts/rN-perm-matrix-baseline.json` | ~20 | Phase-0 baseline Gate 结果（A 档 9 KPI 启动值，failures/warnings 原始数组，Integrity 4 个扫描量）。commit 1 产出。 | Artifact |
| 6 | `docs/roadmap/artifacts/rN-perm-matrix-final.json` | ~20 | Phase-D 终态 Gate 结果（验收对比用，Guardian 收紧为 toBe 0 后再次产出的 snapshot）。commit 5 产出。 | Artifact |

### 3.2 修改（2 files · 最小 footprint）

| # | 文件 | 改动摘要 |
|:-:|------|---------|
| 1 | `docs/roadmap/TODO.md` | 末尾追加「权限矩阵 Gate（R?）」章节：按 Phase-0 baseline → Phase-A scanners → Phase-B rules → Phase-C guardian double green → Phase-D TODO push 五阶段写明步骤 + 完成状态 + Actual KPI；追加 9 KPI 行验收表（3 FAIL + 3 WARN + 2 Guardian + 1 Integrity）；10 files 清单。 |
| 2 | `.github/workflows/ci.yml`（*可选追加，非必须*） | apps/web job 末尾加 1 step：`node scripts/ci/check-permission-matrix.cjs --dry-run --report-json=docs/roadmap/artifacts/ci-perm-matrix-latest.json`。**默认 dry-run，永久 exit 0，只是收集报告**；不影响现有 CI 绿。后续团队独立 PR 再加 `--fail-fast` step。 |

### 3.3 明确不碰（Scope Exclude · 严格只读不自动改源码，吸收 847749 审查原则）

- ❌ **绝对不修改任何 svc/**/*.rs 的权限代码**：R1/R2 violations 只**报告（输出 file+line+code+msg）**，不自动 sed 或 AST 改。shared-auth 中 `ModulePermission::parse` 两段 vs 三段不一致 bug → 会在 R1/R2 报告中以 violation 列出来，留给团队专门 PR 修（不在本轮 Gate 工作范围）。
- ❌ **绝对不修改 apps/web/** 的 permission/nav/config 源代码**：R3 violations 只报告，不自动替换 `permission: 'xxx'` 字符串或补常量表。
- ❌ 不新建 xtask/permissions-check Rust crate（方案 Y 过度工程，已排除）。
- ❌ 不新建 MCP 工具、不需要 Figma、不需要浏览器 UI（纯 Node CJS 脚本 + Vitest）。
- ❌ 不改动 `scripts/ci/check-i18n.cjs` / `apps/web/src/__tests__/i18n-hardcode-p4-guard.test.ts`（Gate 是平行独立脚本，互不干扰）。

---

## 4. 错误处理 & 安全网（7 条兜底，全部吸收 847749 合规/假绿防范）

| # | 风险 | 概率 | 保护层 | 动作 |
|:-:|------|:----:|:------:|------|
| 4.1 | **Rust 枚举正则脆度**：ModuleCode 枚举中间加了多行外注释 `/* todo */`、逗号格式变化、或者 `derive(...)` 换行导致 regex 漏匹配 → ModuleCode 集合只剩几个 → R2 规则对大量合法 code 误判 FAIL。 | 中高 | Scanner 降级保护 + Integrity L2 强制量 | **正则解析失败的判定**：`parsedModuleCodeCount < 18`（已知 ModuleCode ≥ 18 模块：iam/erp/finance/pdm/hrm/ehs/qms/wms/mes/bi/pm/settlement/plm/mfg/workflow/document/file/system 共 18+）→ 输出 WARNING "shared-auth ModuleCode 枚举解析疑似失败，R2 降级为 WEAK_PASS 模式（只校验格式，不校验存在性，R2 不判 FAIL）"，并把 Rule 2 的 threshold 临时设为 Infinity（不 fail）。**绝不因解析失败而乱报硬 FAIL。** |
| 4.2 | **前端 PERMISSIONS 结构变化**：V2 重构时 PERMISSIONS 从对象字面量改成 `Map<string, PermissionDef>` 或 `function buildPermissions()` 返回 → regex 解析出的 key 量骤降到 < 100。 | 低 | Scanner fallback + Integrity L2 | **判定**：`frontendPERMSet.size < 100`（实际有 300+）→ WARNING "前端 PERMISSIONS 解析疑似失败，R3 降级为仅格式校验 + WARN only（不判 FAIL，不触发 fail-fast）"，R3 threshold=Infinity。 |
| 4.3 | **注释字符串误判 require_permission()**：Rust 文件注释块里写的示例 `// require_permission("iam:user:read")` 被正则错误匹配成真实挂载 → R1/R2 假阳性。 | 中 | Scanner 上下文排除 | 匹配到 `require_permission\(` 时，额外检查：<br>① 当前行 `//` 前缀（行内注释后面的不算，`//` 到行尾一律跳过）<br>② 向上 5 行 + 当前行检查是否在 `/* ... */` 块注释内部（用栈跟踪开/闭状态）<br>满足任一 → 排除（不记录到 backendCodes）。Scanner 末尾输出 `scannerCtx: { totalMatches, skippedCommentMatches }` 供自检。 |
| 4.4 | **首次启用 --fail-fast 就 CI 全红**：团队遗留了 N 百个现存 R1/R2/R3 violations → CI 第一天全挂，PR 无法合入。 | **极高（几乎确定）** | **DRY-RUN 默认** + Guardian ≤baseline 软锁 | ① Script 默认值 `--dry-run`（不传 --fail-fast → **永远 exit 0**，只打印摘要和 violations 明细）。<br>② `.github/workflows/ci.yml` 首次追加 step 时，**去掉 --fail-fast 保留 dry-run**，连续收集 3~5 次报告，团队专门 PR 修完现存 violations 后，再追加独立 PR 加 `--fail-fast` step（或在现有 step 改参数）。<br>③ Vitest Guardian 首次断言为 `≤ baseline`（软锁），不是 `toBe(0)`，保证本地 `pnpm test` 也不红。<br>（三层协同：绝不"一上来就红"，吸收 847749 §3 审查越权违约反向教训：合规工具启用本身不能成为团队阻塞来源） |
| 4.5 | **Orphan 定义中"30 天"无 git 数据不可得**：要判断"30 天内未被引用"需 git blame / git log logics 实现复杂 + node 调 git shell 慢 + 部分 env git 不可用 → R5 执行超时/出错。 | 中（~50%） | **简化孤儿定义：纯静态**（已在 §2 R5 固化） | R5 不判断 git 时间；定义改为：`frontendPERMSet − backend引用Set − 前端引用Set` → 即"常量表里有定义，但 backend 中间件没用到、前端 nav/config 也没引用"的 code 就算 orphan。这个定义零外部依赖、100% 可重复、300ms 内可算；30 天动态判断彻底移除（复杂度 > 价值，不满足 Gate "稳定可重复"要求）。 |
| 4.6 | **脚本自身异常导致"全绿假阳性"**：require_permission() 的 regex 写错了（例如少了 `"([A-Za-z0-9_:.\-]+)"` capture group）→ 所有 backend code 都扫描不到 → violations[] 为空 → exit 0 显示 GREEN，但实际真实存在的 violations 完全没检出。这是最严重的风险（假绿 = 失去防护）。 | 极低（但**致命**） | **Integrity L2 强制量校验**（脚本 exit 前强制执行，哪怕 dry-run 也会 ERROR） | Scanner 阶段结束后、Validator 阶段开始前，强制检查 4 个扫描量**全部满足最低下界**：<br>```<br>const INTEGRITY_MIN = { scannedBackendFiles: 50, scannedFrontendConfigs: 20, totalBackendCodes: 100, totalFrontendNavCodes: 100 }<br>```<br>**任一不满足 → Integrity FAIL**：stdout 打印 `[INTEGRITY FAIL] ...` 详情、exit code = 2（特殊退出码，和 fail-fast 的 1 区分）。**即便是 --dry-run 模式，Integrity FAIL 也会 exit≠0**（因为扫描量不足 = 脚本坏了，必须 exit 非 0 让 CI 红/让 Guardian 断言红，防止假绿）。<br>（§0 KPI A 条目就是这个 Integrity 强校验本身必须 PASS） |
| 4.7 | **四段式 code（scope 段）R1 段数误判**：`iam:user:read:self` 四段是否合法？validate_permission_code 现实现允不允许？若脚本 R1 规则上限设 3 段 → 对合法四段式误判 R1 FAIL。 | 低 | 对齐原实现白名单 | 查阅 `shared-auth/src/permission.rs` `validate_permission_code`：段数上限 = **4（module:resource:action:scope）**。脚本 R1 规则 §2.1 ① 写死 len ∈ [2, 4]，和原实现完全对齐；并额外加正则 `/^[a-z0-9_\-]+$/` 每段字符集匹配，避免空/大写/非法字符。 |

### 4.8 异常恢复兜底（Catch-all）

- 每次 commit 的 message 遵循 `<type>(<scope>): <subject>`（workspace 规范）。Gate 脚本改动用 `chore(ci)` 或 `feat(ci)`；Guardian 改动用 `test(guard)`；TODO 改动用 `docs(todo)`；Artifacts 用 `chore(artifacts)`。一旦 Phase 进行中发现 Integrity FAIL 没法修 → `git revert` 到上一个 Phase 间 commit 基线（不影响 baseline artifact）。
- baseline JSON 永远保留：`cat docs/roadmap/artifacts/rN-perm-matrix-baseline.json | jq '.summary.R1, .summary.R2, .summary.R3'` 可随时查看启动值。

---

## 5. 测试策略（L0~L6 七层 + Layer-2 Guardian 软锁，完全复用 P4 金字塔）

| 层级 | 名称 | 命令 | 绿灯条件 / 断言 |
|:----:|------|------|-----------------|
| **L0** | Baseline 快照（Phase-0） | `node scripts/ci/check-permission-matrix.cjs --report-json=docs/roadmap/artifacts/rN-perm-matrix-baseline.json` | ① 生成 JSON 文件；② summary 有 R1~R6 六个键；③ Integrity 4 个字段都在（且 Integrity FAIL=NO，即 exit 0）；④ R1/R2/R3 Actual 值写入 TODO.md（即便 > 0 也正常，Phase-B/C 后续 PR 由团队修，Guardian 软锁不强制）。 |
| **L1** | Gate 脚本语法自检 | `node --check scripts/ci/check-permission-matrix.cjs` | exit == 0（无 SyntaxError / ReferenceError）。 |
| **L2** | Integrity 强制量校验（§4.6 · 防假绿，致命） | 首次实跑 Gate 时看 stdout Integrity block：<br>scannedBackendFiles ≥ 50 · scannedFrontendConfigs ≥ 20 · totalBackendCodes ≥ 100 · totalFrontendNavCodes ≥ 100 | 全部满足 → Integrity GREEN。<br>任一不足 → exit code=2（Integrity FAIL）→ 需排查对应 scanner regex/路径是否错了。 |
| **L3** | CI Gate（Layer-1）Dry-run | `node scripts/ci/check-permission-matrix.cjs --dry-run --report-json=...` | exit **永远 == 0**（dry-run 承诺，哪怕 R1 有 1000 个 violations 也不红）。report JSON 结构完整（failures/warnings/summary/integrity/scanners 五个一级键齐全）。 |
| **L3'** | CI Gate（Layer-1）Fail-fast（团队修完现存 violations 后启用） | `node scripts/ci/check-permission-matrix.cjs --fail-fast --report-json=...` | R1 violations ≤ 0 · R2 violations ≤ 0 · R3 violations ≤ 0 → exit 0 GREEN。只要任一 > 0 → exit 1 RED。（首次实施时暂**不要求** GREEN，只在 CI yml dry-run 收集报告；独立后续 PR 修完后才要求这一项） |
| **L4** | Vitest Guardian（Layer-2 · 软锁 ≤ baseline） | `cd apps/web && pnpm vitest run src/__tests__/permission-matrix-guard.test.ts --reporter=verbose` | 3/3 assertions passed（R1 ≤ baseline.R1 · R2 ≤ baseline.R2 · R3 ≤ baseline.R3）。Guardian 中用 `JSON.parse(readFileSync(baselineJson))` 读 L0 基线快照的 summary.R1/R2/R3 做比较。**Guardian 必须首次 GREEN（因为 ≤ baseline 保证了首次就不红）。** |
| **L5** | Report JSON 完整性自检（Schema） | 读 --report-json 输出：<br>`node -e "const r=require('./artifacts/rN-...-final.json'); console.log(Object.keys(r).sort().join(','))"` | 一级键完整：`failures,integrity,scanners,summary,version,warnings`；summary 6 键（R1~R6）全在；failures[] 每条 rule+file+line 三字段齐全。 |
| **L6** | TODO.md 终验表人工审阅 | 打开 docs/roadmap/TODO.md 「权限矩阵 Gate」章节 | ① 9 KPI 条目的 Actual / Threshold / Status 三列全部填完，无 "TBD" 残留；② 五阶段（Phase-0/A/B/C/D）完成状态全部 ✅；③ 守护两层（L3 dry-run exit 0 + L4 3/3 passed）实际值完整记录。`grep -n "TBD" docs/roadmap/TODO.md | grep -i "权限矩阵\|perm\|R?"` 应 0 命中。 |

### 5.1 Guardian 首次软锁策略（避免开发 `pnpm test` 直接红）

> **为什么不是 toBe(0)？** A 档严格全量首次扫，大概率 R1/R2/R3 现存 violations > 0（尤其 backend Cartesion Set 两段 vs frontend PERM 三段不一致 bug 之前已发现）。若 Guardian 写死 toBe(0)，本次合入后立刻把 `pnpm test` default group 搞红 → 影响团队日常开发。
>
> **策略**：
> - **Phase-0 baseline**（commit 1）保存 R1/R2/R3 的现状 baselineN1/N2/N3 到 artifact JSON。
> - **Guardian 首次断言**（commit 4）写 `R1.violations.length ≤ baseline.summary.R1`（同值也算 PASS）。这样保证 **Guardian 首次就 3/3 GREEN**。
> - 团队每修一个 PR 减少一些 violations，每次 Guardian 仍然 PASS（因为只要求不劣化）。直到某次修完 N1=N2=N3=0，再**独立 PR** 把 Guardian 断言改为 `toBe(0)`（永久硬锁）。这个渐进收紧策略和 P4 Gate dry-run 默认是同一理念：合规工具合入本身不能成为团队生产力阻塞源（847749 §3 失败经验反向应用）。

---

## 6. 实施顺序（9 steps · 5 commits，完全复用 P4 结构）

详见 §1 架构图 Commit 1–5。摘要版：

```
Commit 1（Phase-0 Baseline · Gate Skeleton + Baseline Snapshot）
  [Step 1] 新建 check-permission-matrix.cjs 骨架：
            CLI args 解析（dry-run default/fail-fast/report-json/scan）
            --report-json 写入骨架（version/integrity/scanners/summary 占位 0）
            Integrity L2 4 量校验（INTEGRITY_MIN 常量 + exit=2）
            Exit handler（dry-run 永远 exit=0；fail-fast 按 DEFAULT_FAIL_FAST_THRESHOLDS）
            → 跑 baseline dry-run → artifacts/rN-perm-matrix-baseline.json 保存
            → TODO.md 写入启动值 R1=N1 · R2=N2 · R3=N3
            → Commit

Commit 2（Phase-A Scanners 3 个）
  [Step 2] 实现 scanBackendPermissions(svc/**/*.rs)
            require_permission(CODE) regex + 注释排除栈
            → Integrity L2 检查 scannedBackendFiles≥50 + totalBackendCodes≥100
  [Step 3] 实现 scanFrontendNavRoutes(apps/web/src)
            modules/*/config.ts (moduleConfig.permission / routes[i].requiredPermissions)
            + layouts/navTree.ts L2NavNode.permission
            + routes/v2 RouteConfig.requiredPermissions
            → Integrity L2 检查 scannedFrontendConfigs≥20 + totalFrontendNavCodes≥100
  [Step 4] 实现 scanConstantsTables()
            ① frontend PERMISSIONS 对象字面量（apps/web/config/permissions.ts）regex 解析所有 key
            ② shared-auth ModuleCode + PermissionAction 枚举 regex → 笛卡尔
            → Integrity L2 检查 frontendPERMSet.size ≥ 100 + ModuleCode 数 ≥ 18
            → commit 2

Commit 3（Phase-B Rules 6 条）
  [Step 5] 实现 R1/R2/R3 三条 FAIL rules
            R1 format (段数 2~4 · 字符集 · 模块名合法集合)
            R2 existence (AllValidSet · WEAK_PASS 降级)
            R3 frontend exact match + 大小写建议
            → 跑 Gate：R1/R2/R3 FAIL 数应等于 baseline JSON 中 N1/N2/N3（±0 正常，若差异需检查 scanner）
  [Step 6] 实现 R4/R5/R6 三条 WARN rules
            R4 module prefix align（B→F 双向）
            R5 orphan 静态定义
            R6 endpoint↔nav 同模块缺口
            → 跑 Gate 输出 warnings[] 摘要
            → commit 3

Commit 4（Phase-C Guardian Double Green）
  [Step 7] 新建 permission-matrix-guard.test.ts
            require(check-permission-matrix.cjs).runGate()
            读取 baseline.json.summary.R1/R2/R3
            3 assertions: R1.len ≤ baseline.R1 · R2.len ≤ baseline.R2 · R3.len ≤ baseline.R3
            console.log warnings summary（R4/R5/R6 数）
            → cd apps/web && pnpm typecheck (apps/web) GREEN
            → pnpm vitest run permission-matrix-guard.test.ts 3/3 GREEN
            → commit 4

Commit 5（Phase-D TODO.md 归档 + 基线 JSON 对比 + push）
  [Step 8] TODO.md 完整验收表：
            9 KPI 条（3 FAIL + 3 WARN + 2 Guardian + 1 Integrity）
            五阶段步骤完成状态 + Artifacts 清单
            → grep TBD 残留自检 = 0 in 新增章节
            → 跑一遍终态 Gate → artifacts/rN-perm-matrix-final.json
            → 对比 baseline vs final：R1/R2/R3 应 ≤ baseline（已由 Guardian 保证）
            → git commit
  [Step 9] git pull --rebase origin main → git push
```

---

## §7. KPI 成功标准（Spec Self-Review 使用 · 9/9 全部达成才算通过）

Spec Review 时对照，完成后打 `[x]`（在 writing-plans 之后的 executing-plans / subagent 阶段执行）：

1. [ ] **R1 == 0**：Backend code 格式校验 violations == 0（或者 Phase-C Guardian 通过时软锁条件：R1 ≤ baselineR1，后续 PR 再收紧到 0）
2. [ ] **R2 == 0**：Backend code 存在性 violations == 0（同上软锁策略）
3. [ ] **R3 == 0**：Frontend nav code 存在性 violations == 0（同上软锁策略）
4. [ ] **R4 ≤ 5%**：模块前缀前后端对齐 mismatches ≤ backendModuleSet ∪ frontendModuleSet 总数 5%
5. [ ] **R5 ≤ 50 或 ≤ 5%**：Orphan 孤儿权限码 ≤ 50 条 或 ≤ frontendPERMSet 总数 5%
6. [ ] **R6 ≤ 20**：Endpoint ↔ Nav 交叉映射缺口 ≤ 20 条
7. [ ] **KPI A Integrity PASS**：L2 4 个扫描量（backendFiles≥50 frontendConfigs≥20 backendCodes≥100 frontendNavCodes≥100）全部满足；Integrity exit code ≠ 2
8. [ ] **KPI B Guardian 3/3 GREEN**：Vitest 3 assertions 全部 PASS（软锁 ≤ baseline 或 硬锁 toBe(0)，取决于团队是否已清零现存 violations）
9. [ ] **KPI C Gate dry-run exit 0**：CI 接入 dry-run 模式 exit == 0；report JSON schema 完整（version/integrity/scanners/summary/failures/warnings 6 一级键齐全）

---

**Document ends here.**

Next phase after spec approval: Invoke `superpowers:writing-plans` skill → generate 9-step detailed implementation plan with command-level instructions, then run via subagent-driven development 5 commits 9 steps.
