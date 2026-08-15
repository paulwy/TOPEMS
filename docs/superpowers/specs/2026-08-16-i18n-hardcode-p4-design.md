# R13 V222 P4：i18n 硬编码清零 P4（3 清零 + 4 续扫 + 双保险）设计文档

> **Date:** 2026-08-16
> **Owner:** Agent-Driven + Human Approval
> **承接:** V219 P1（31627→27159, -4468）+ V221 P3（27159→18856, -8303, -30.6%）
> **V222 候选定位:** 优先方向 — i18n 硬编码清零 P4
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans next to generate the 9-step implementation plan, then use executing-plans or subagent-driven-development task-by-task.

---

## 0. 目标摘要

**目标：** 7 个目标模块按 B 型策略推进 — 3 个清零 + 4 个中模块续扫 20%~40%，并建立"CI Gate + Vitest Guard"双层守护，确保清零 3 块永不回弹、4 块续扫阈值被严格锁定。

**量化目标 7+1+2 条：**

| 编号 | 类型 | 指标 | 启动值 (TBD Phase-A 实取) | 阈值 |
|:----:|:----:|------|:------------------------:|-----:|
| 1 | 清零 | components/templates 硬编码行 | TBD（≈1069 V222 估值） | **== 0** |
| 2 | 清零 | ai 硬编码行 | TBD（≈2358） | **== 0** |
| 3 | 清零 | microfrontend 硬编码行 | TBD（≈1770） | **== 0** |
| 4 | 续扫 | admin 硬编码行 | TBD（≈649） | **≤ 500** (~↓23%) |
| 5 | 续扫 | mobile 硬编码行 | TBD（≈557） | **≤ 400** (~↓28%) |
| 6 | 续扫 | monitor 硬编码行 | TBD（≈612） | **≤ 450** (~↓26%) |
| 7 | 续扫 | mes 硬编码行 | TBD（≈668） | **≤ 470** (~↓30%) |
| 8 | 总量 | 全项目 total 硬编码行 | **18856** (V221 P3 终值) | **≤ 12000** (↓≥6856) |
| A | 守护 | check-i18n.cjs Gate exit code | N/A | **== 0** |
| B | 守护 | vitest p4-guard assertions passed | N/A | **7/7 == passed** |

---

## 1. 架构总览

```
┌───────────────────────────────────────────────────────────────────────┐
│ R13-V222 P4 执行流水线（5 commits · 9 steps）                           │
│                                                                       │
│  ┌─ Commit 1 ───────────────────────────────────────────────────┐     │
│  │ Phase-A 基线快照                                                │     │
│  │   [Step 1] gen-r13-p4-baseline.cjs                             │     │
│  │     → 7 modules counts + TOTAL 18856                           │     │
│  │     → artifacts/r13-v222-p4-baseline.json 保存                 │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              ↓                                         │
│  ┌─ Commit 2 ───────────────────────────────────────────────────┐     │
│  │ Phase-B 批量脚本扩展 + apply                                    │     │
│  │   [Step 2] batch-i18n-replace.cjs Mode-5/6/7 + --scope=p4     │     │
│  │   [Step 3] Mode-5: CrudPage Adapter columns (templates + ai)  │     │
│  │   [Step 4] Mode-6: Menu Config arrays (admin/mobile/monitor)  │     │
│  │   [Step 5] Mode-7: Tpl Prefix Index + msg.t (ai/microfrontend)│     │
│  │   → 每步后 pnpm typecheck (apps/web) GREEN                     │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              ↓                                         │
│  ┌─ Commit 3 ───────────────────────────────────────────────────┐     │
│  │ Phase-B-sub 扩展 CI Gate 参数 + 调准                            │     │
│  │   [Step 6] check-i18n.cjs 扩展:                                │     │
│  │     --strict-zero=components/templates,ai,microfrontend       │     │
│  │     --upper-bound admin:500,mobile:400,monitor:450,mes:470    │     │
│  │     → 违规 → exit≠0 + 机器可读 JSON 报告                       │     │
│  │   [Step 7] 实跑全量，若 4 个 bound 有超标 → 回 Step 3-5 补替换  │     │
│  │   → 确认 3==0 GREEN + 4≤bound GREEN + TOTAL≤12000              │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              ↓                                         │
│  ┌─ Commit 4 ───────────────────────────────────────────────────┐     │
│  │ Phase-C Vitest 守护测试（Layer-2）                              │     │
│  │   [Step 8] i18n-hardcode-p4-guard.test.ts:                    │     │
│  │     调用 check-i18n.cjs 导出的 countModules()                  │     │
│  │     7 assertions (3 toBe(0) + 4 toBeLessThanOrEqual)           │     │
│  │   → pnpm typecheck + pnpm vitest run 双绿                      │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                              ↓                                         │
│  ┌─ Commit 5 ───────────────────────────────────────────────────┐     │
│  │ Phase-D 验收 + TODO 归档 + push                                 │     │
│  │   [Step 9] TODO.md R13 章节 + 7 模块验收表 + KPI 实际值         │     │
│  │   → commit → git pull --rebase origin main → git push          │     │
│  └────────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────┘
```

### 守护双保险结构

```
           Hardcode Threshold Gate (Layer-1)
            scripts/ci/check-i18n.cjs
          ┌───────────────────────────────┐
          │ --strict-zero=<csv modules>   │ → 对 3 个清零模块：计数==0
          │ --upper-bound=<n:v,n:v,...>   │ → 对 4 个续扫模块：计数≤上限
          │ --report-json=<path>          │ → 机器可读结果（给 vitest 读）
          │ exit: 0=PASS / 1=FAIL         │ → 可直接接进 PR CI yml
          └───────────────────────────────┘
                      ↓ 函数同构调用
          Vitest Guardian (Layer-2)
     apps/web/src/__tests__/i18n-hardcode-p4-guard.test.ts
          ┌───────────────────────────────┐
          │ import { countByModule } from │   ← 从 check-i18n.cjs 导出的纯函数
          │   'scripts/ci/check-i18n.cjs' │
          │ describe("P4 7-Module Guard") │
          │   3 × expect(count("..."))    │
          │     .toBe(0)                  │
          │   4 × expect(count("..."))    │
          │     .toBeLessThanOrEqual(x)   │
          └───────────────────────────────┘
                    7/7 passed?
                    YES → GREEN (不可回弹)
```

---

## 2. 关键数据 & 3 种新增 Mode 触发特征

### 2.1 模块硬编码启动值（V222 估值 + Phase-A 精测双栏）

| # | 模块路径 (apps/web/src/...) | 类型 | V222 估值行 | Phase-A 实测行 | 最终阈值 |
|:-:|------------------------------|------|------------:|---------------:|---------:|
| 1 | components/templates/ | 清零 | 1069 | TBD | **== 0** |
| 2 | ai/ | 清零 | 2358 | TBD | **== 0** |
| 3 | microfrontend/ | 清零 | 1770 | TBD | **== 0** |
| 4 | admin/ | 续扫 | 649 | TBD | **≤ 500** |
| 5 | mobile/ | 续扫 | 557 | TBD | **≤ 400** |
| 6 | monitor/ | 续扫 | 612 | TBD | **≤ 450** |
| 7 | mes/ | 续扫 | 668 | TBD | **≤ 470** |
| Σ | 以上 7 项小计 | | ≈7683 | TBD | |
| TOTAL | 全 apps/web | B 型总量 | **18856** | TBD | **≤ 12000** (↓≥6856 / ≥36.4%) |

### 2.2 三种新增批量替换 Mode（仅扫描 p4-7mods scope 内文件）

#### Mode-5：createCrudPageAdapter Table Column Headers

**触发特征（Regex 匹配）：**
```
createCrudPageAdapter\s*\(\s*\{[\s\S]*?columns\s*:\s*\[([\s\S]*?)\]
```
在 columns 数组内每个元素匹配 `title\s*:\s*"([^"]{2,})"`（中文字符串，长度 ≥ 2）。

**Key 生成规则：**
```
父上下文提取 prefix:
  - 文件 basename: e.g. OrderList.tsx → orderList
  - createCrudPageAdapter 传入的 pageKey 字段（若有）优先级更高
最终 Key: pages.<pageOrFileKey>.columns.<colKey>Title
  - colKey 优先取 column.dataIndex / column.key；否则取 titleCamelCase（中文去重后 CamelCase）
```

**产物：**
- en.json 加 `pages.xxx.columns.yyyTitle`（需 i18n translate 成英文；**本 P4 先写中文占位 en 值，X-P4 HIGH 清理放 R14 或一并推进**）
- zh.json 加同 key 的原始中文（1:1 不变）
- 源文件替换 `title: "中文"` → `title: t(prefix + 'columns.yyyTitle')`，prefix 为父级已声明的 `const pfx = 'pages.xxx.';` 变量

#### Mode-6：Menu Config Object Arrays

**触发特征（Regex 匹配）：**
```
const\s+(menu\w*|nav\w*|sidebar\w*|items)\s*=\s*\[([\s\S]*?)\];
```
数组项内匹配 `label\s*:\s*"([^"]{2,})"` 或 `title\s*:\s*"([^"]{2,})"`。

**Key 生成规则：**
```
menu.<path-or-id-slug>.<label|title>
  - path-or-id-slug: 从数组项中取 .path / .id / .key 字段，去掉前导 / 替换 / 为 . ，CamelCase
  - 若无 path/id/key：用 label 中文转 slug（pinyin slug 去声 + CamelCase）
  - 冲突检测：en.json 若同 key 已存在且 value ≠ 新值 → SKIP + WARN 日志（不写入）
```

**Scope 限制**：只扫 admin/ mobile/ monitor/ 这 3 个 menu-heavy 模块 + mes/ 的导航配置。

#### Mode-7：Template-Literal Prefix Index（Dynamic t() Calls）

**触发特征（双条必须同时满足）：**
1. 文件内存在 `const (prefix|msgPrefix|pfx|i18nKey)\s*=\s*['"]([\w.-]+)['"]` 定义静态前缀
2. 出现 `t\s*\(\s*` + `(prefix|msgPrefix|pfx|i18nKey)` + 字符串拼接（+ 或 模板字符串）

**替换规则**：**不修改 JSX/TS**。原因：动态拼接有 `+ i` 下标、有 `${variant}` 变量，正则没法 100% 安全写回。Mode-7 只做"探测 + 预生成占位 key + 写 JSON"，在 en/zh.json 里预填 `prefix.item0 / prefix.item1 / prefix.item2 ... prefix.itemN` 占位（值分别是扫描出来的静态中文列表），给后续人工替换做准备，同时 emit WARN 日志列出需要手动替换的行。

---

## 3. 文件清单 & 职责边界

### 3.1 新建（4 个文件）

| # | 文件 | 作用 | 归属 |
|:-:|------|------|------|
| 1 | `scripts/i18n/gen-r13-p4-baseline.cjs` | Phase-A 基线快照。扫描 7 模块 + 全项目 total 硬编码计数，输出 JSON（含每个模块文件数、总行数）。exit 0。 | 脚本 |
| 2 | `apps/web/src/__tests__/i18n-hardcode-p4-guard.test.ts` | Layer-2 Vitest 守护。7 断言：3 清零 `toBe(0)` + 4 续扫 `toBeLessThanOrEqual(upperBound)`。CI PR 必跑。 | 测试 |
| 3 | `docs/superpowers/specs/2026-08-16-i18n-hardcode-p4-design.md` | **本 spec 文档**。设计 6 节 + 量化目标 + 验收表。 | 文档 |
| 4 | `docs/roadmap/artifacts/r13-v222-p4-baseline.json` | Phase-A 基线快照落盘。commit 1 产出。可回查。 | Artifact |

### 3.2 修改（3 个文件）

| # | 文件 | 改动摘要 |
|:-:|------|---------|
| 1 | `scripts/i18n/batch-i18n-replace.cjs` | ① 新增 `--scope=p4-7mods` CLI 参数（过滤器：7 个模块路径）；② 新增 Mode-5/6/7 三种匹配器；③ 对 Mode-6 增加"同 key conflict SKIP + WARN"；④ 每轮结束输出 summary（新增 keys 数 / 写入 JSON 数 / SKIP 冲突数） |
| 2 | `scripts/ci/check-i18n.cjs` | ① 新增 `--strict-zero=<csv-modules>` 参数，csv 任一模块计数 > 0 → fail；② 新增 `--upper-bound=<name:num,name:num,...>` 参数，任一模块计数 > bound → fail；③ 新增纯函数导出 `export async function countByModule(moduleNames: string[])` 供 vitest 调用；④ 新增 `--report-json=<path>` 写机器可读结果；⑤ 未开启上述严格参数时，默认行为不变（V221 向后兼容） |
| 3 | `docs/roadmap/TODO.md` | ① 新增 R13 V222 P4 章节（按 Phase-A / Phase-B / Phase-B-sub / Phase-C / Phase-D 五部分写明步骤 + 完成状态 + 实际值）；② 新增 7 模块硬编码 Actual / Threshold / Status 验收 8 行表；③ 写终态：total 18856→X 行、降幅 YY%、守护 2/2 GREEN |

### 3.3 明确不碰（Scope Exclude）

- 除 7 个目标模块外，apps/web/src 的其余目录（pages/ shared/ services/ store/ utils/ 等）在 Phase-B 替换中 **一律跳过**（由 `--scope=p4-7mods` 过滤器保证）
- apps/* 的非 web app、cargo workspace Rust 代码、scripts 本身
- 不新建 MCP / 不需要 Figma / 不需要浏览器 UI

---

## 4. 错误处理 & 安全网（脚本 / 门禁 / 守护 三层）

| # | 风险 | 概率 | 保护层 | 动作 |
|:-:|------|:----:|:------:|------|
| 4.1 | **Mode-6 Menu key 冲突**：两项 menu 都叫 `overview` 推导出同 key `menu.overview.label`，但对应中文不同 | 中 | batch 脚本内置 | 冲突检测：en.json 若 key 已存在且 value.trim() ≠ 新 value.trim() → **SKIP 该项不写入 JSON**，emit WARN：`[Mode-6 SKIP CONFLICT] key=menu.overview.label old=... new=... file=...`；保留到 Phase-B 末尾手动 review |
| 4.2 | **Mode-7 动态 tpl 误伤**：把 `import { t } from 'i18next'` 跨模块调用、或者 scope 外文件的同样模式也匹配了 | 低 | 双重 scope 过滤 | ① 命令行 `--scope=p4-7mods` 严格限定 7 个目录子树；② Mode-7 触发的前置条件要求"同文件内有 `const pfx = 'xxx.yyy'`"。不同文件或跨模块的动态拼接直接 SKIP |
| 4.3 | **正则截断导致 TS 语法错**：替换中文时因为转义字符（`\"`、`\n`、模板字符串 `${xxx}`）导致字符串引号错位，`tsc` 挂 | 中 | Typecheck 强制门 | **每次 Mode-5 / 6 / 7 apply 之后立刻跑 `cd apps/web && pnpm typecheck`**：若 exit != 0 → `git checkout HEAD -- apps/web/src apps/web/src/i18n/locales` 回滚该次替换（JSON + src 一并回滚），然后用更小 scope 单文件逐个重试；**严禁带着 typecheck 错误进入下一个 Mode。** |
| 4.4 | **写 JSON 时 parse 失败**（批量 key 重名、非法 key 字符、未转义引号、BOM 头） | 极低 | batch 脚本 write-before-commit 校验 | 写入 JSON 前：① 对最终字符串执行 `JSON.parse()`；② 对所有新增 key 执行 key regex 校验 `/^[a-zA-Z][\w.-]*$/`（字母开头，仅允许字母数字下划线点横杠）；任一不通过 → **拒绝写 en/zh.json**，报错列出非法 key 列表和冲突 key 列表。同 4.3 做 src + JSON 整体回滚。 |
| 4.5 | **中文占位数写入 en.json 导致 HIGH 告警飙升**（Mode-5/6 给 en.json 写中文占位） | 高（几乎确定） | Phase-B-sub 末尾检查 + 可选项 | **有两个可选子策略，实施计划 Step 7 时二选一（默认子策略 A）：**<br/>• **子策略 A（推荐）**：同时推进 R12-X 技术栈复用的"占位中英翻译"，调用 glossary 常见术语表对 Mode-5/6 新生成的 3000+ key 做翻译（用已有的 glossary 精确映射 + Google Translate API fallback，若 API 不可用则仍占中文位，但在 artifacts 中输出待翻译清单 CSV，P4 验收表标注 HIGH 假 EN 新增）。<br/>• **子策略 B（保守，与 X 解耦）**：P4 只负责"把中文从 source 移到 JSON"，不负责翻译，en 写中文占位，HIGH 告警飙升（预计 +4000~5000 条）留给下一 R14-X 轮一并清。<br/>无论选哪个，必须在 TODO.md 明确说明 HIGH 假 EN 的前后变化，不要隐藏。 |
| 4.6 | **3 清零模块回弹**：P4 验收完成后，后续同事新提交的代码直接写中文硬编码，把 components/templates 从 0 拉回 100+ | 中高 | **双保险 Gate（本 P4 核心交付之一）** | ① `check-i18n.cjs --strict-zero=... --upper-bound=...` 接入 `.github/workflows/ci.yml` 的 apps/web job（若尚未接入，实施计划 Step 8 加一个 PR gate step，PR 红禁止 merge）；② `i18n-hardcode-p4-guard.test.ts` 7/7 断言挂 `pnpm test` default group，vitest 挂红。两层独立，任一失败都阻止合入。 |

### 4.7 异常恢复兜底（Catch-all）

- 每一次批量替换的 commit message 必须明确：`fix(i18n): R13 P4 Mode-X apply (YYY new keys · scope=Z)`。一旦 Phase 进行中发现 typecheck 或 JSON 坏，**可直接用 `git revert` 到上一个 Phase 间 commit 基线**，不影响 baseline 已记录数据。
- baseline JSON 永远保留在 artifacts/，方便后续对比：`node -e "console.log(JSON.parse(require('fs').readFileSync('artifacts/r13-v222-p4-baseline.json'))['total'])"`

---

## 5. 测试策略（7 层金字塔 + 2 层守护）

### 5.1 7 层阶梯式验收

| 层级 | 名称 | 命令 | 断言 / 绿灯条件 |
|:----:|------|------|-----------------|
| L0 | 基线快照（Phase-A） | `node scripts/i18n/gen-r13-p4-baseline.cjs` | 生成 artifacts JSON；包含 7 模块 + total 8 个计数字段；7 模块都 > 0；total ≈ 18856（±5% 正常，若偏离 > 5% 需在 TODO 备注） |
| L1 | batch 脚本 self-check（内建） | batch 脚本 end-of-run 自动 | `JSON.parse(en / zh)` 均成功；所有新增 key 都通过 `/^[a-zA-Z][\w.-]*$/` key regex；冲突 SKIP 数 ≤ 5%（若 > 5% 触发 ERROR 级日志，需要介入去重） |
| L2 | Typecheck 绿（**每次 Mode 后必跑**） | `cd apps/web && pnpm --filter @apps/web typecheck`（即 `tsc --noEmit`） | exit == 0；无 TS2304 / TS1005 / TS1127 / TS1131 等语法错误；**exit≠0 时整体回滚该次 Mode。** |
| L3 | 扩展 CI Gate（Phase-B-sub） | `node scripts/ci/check-i18n.cjs --strict-zero=components/templates,ai,microfrontend --upper-bound=admin:500,mobile:400,monitor:450,mes:470 --report-json=artifacts/r13-p4-gate.json` | ① 3 zero 模块计数 == 0；② 4 bound 模块计数 ≤ 各自 bound；③ exit == 0；④ report JSON 字段：`{allOk:true, failures:[], perModule:{...}}` 结构完整 |
| L4 | Vitest 守护（Layer-2 · Phase-C） | `cd apps/web && pnpm vitest run src/__tests__/i18n-hardcode-p4-guard.test.ts` | 1 test suite passed；7 assertions passed 0 failed；输出有 `7/7 assertions · 3 zero GREEN · 4 bound GREEN` 摘要 |
| L5 | 终验 TOTAL ≤ 12000 | 同 L3（全量统计字段） | hardcoded 总 行数 ≤ 12000；相比 baseline 18856 净减 ≥ 6856（降幅 ≥ 36.4%）。若未达标 → 追加一轮 Mode-* 手动挑剩余大项补替换，不进入 Phase-D |
| L6 | TODO.md 终验表人工审阅 | 打开 docs/roadmap/TODO.md R13 章节 | 7 模块 Actual / Threshold / Status 三列全部 ✅ GREEN；守护 Gate（L3 + L4）记录 exit 0 / passed；基线 vs 终值 total 对比数值完整（无 TBD 残留） |

### 5.2 守护两层（长期运行，非一次性验收）

- **Gate（Layer-1）：check-i18n.cjs** — 可被 `.github/workflows/ci.yml` 调用，机器可读 JSON；exit code 适合 CI 级 fail-fast。
- **Test（Layer-2）：vitest** — 可被 `pnpm test` / IDE 直接跑，7 assertions 人类可读，失败时 diff 输出直接提示是哪个模块超了多少行。

两层互为备份：Gate 适合 CI speed；Test 适合开发时本地跑 + 报错诊断信息更清晰。

---

## 6. 实施顺序（9 步 · 5 commits）

详见 §1 架构图 Commit 1–5。摘要版：

**Commit 1（Phase-A baseline）**
- [Step 1] 新建 `gen-r13-p4-baseline.cjs`，实跑 → `artifacts/r13-v222-p4-baseline.json` → commit

**Commit 2（Phase-B batch 扩展 + 逐 Mode apply）**
- [Step 2] 修改 `batch-i18n-replace.cjs`：加 --scope 参数 + Mode-5/6/7
- [Step 3] Mode-5 apply（components/templates + ai） → pnpm typecheck GREEN → continue
- [Step 4] Mode-6 apply（admin / mobile / monitor / mes menu） → typecheck GREEN → continue
- [Step 5] Mode-7 apply（ai + microfrontend 动态 prefix 探测占位 JSON） → typecheck GREEN → commit 2
  > 注：Step 3/4/5 任一 typecheck 红 → 整体回滚该 Mode，缩小到单文件逐个重试。

**Commit 3（Phase-B-sub：CI Gate 扩展 + 实跑调准）**
- [Step 6] 修改 `check-i18n.cjs`：--strict-zero / --upper-bound / --report-json / 纯函数导出 countByModule
- [Step 7] 全量实跑 Gate：
  - 若 3 zero 有模块 > 0 → 回 Step 3-5 追加该模块精确替换
  - 若 4 bound 任一模块超 → 回 Step 3-5 追加续扫 / 手动补
  - 若 total > 12000 → 继续追加 1-2 轮 Mode-5/6 大项
  - 调准到 GREEN → commit 3

**Commit 4（Phase-C：Vitest 守护 + Typecheck/Vitest 双绿）**
- [Step 8] 新建 `i18n-hardcode-p4-guard.test.ts`：7 assertions
- 跑 `pnpm typecheck` + `pnpm vitest run <test>` 双绿 → commit 4

**Commit 5（Phase-D：TODO.md 归档 + push）**
- [Step 9] TODO.md R13 章节 + 7 模块 8 行验收表 + 守护 2/2 记录
- commit → `git pull --rebase origin main` → `git push`

---

## §7. KPI 成功标准（Spec Self-Review 使用）

Spec Self-Review 时对照下面的 P4 完成条件，确保 9/9 全部"已达成"：

1. [ ] `components/templates` 硬编码行 == 0（check-i18n.cjs 实跑 + vitest 同值）
2. [ ] `ai` 硬编码行 == 0
3. [ ] `microfrontend` 硬编码行 == 0
4. [ ] `admin` 硬编码行 ≤ 500
5. [ ] `mobile` 硬编码行 ≤ 400
6. [ ] `monitor` 硬编码行 ≤ 450
7. [ ] `mes` 硬编码行 ≤ 470
8. [ ] TOTAL 全项目 ≤ 12000（从 18856 净减 ≥ 6856）
9. [ ] 守护双层：check-i18n.cjs Gate exit == 0 且 vitest 7/7 assertions passed

---

**Document ends here.**
Next phase after spec approval: Invoke writing-plans → 9-step detailed implementation plan with command-level instructions for each step.
