# V257-P0-3 · Frontend Generics Tightening Tail (37 config.ts 全闭环)

- **Milestone**: TOPEMS-V257 P0-3（收尾轮 · 保守口径 37/40 · 实存 config.ts = 37/37 100% 全合格）
- **Scope**: 4 config.ts 处理
  - 2 实装 v5 转换：`aps / im`
  - 2 空壳占位补齐：`registry / shared`（P0-2 已算合格但 0 Props → 补齐 EmptyXxxModuleProps{}）
  - 说明：TODO.md 原始 P0-3 预估 5 模块（im + microfrontend + 2 api + 其他骨架），实扫 apps/web/src/modules 目录下仅有 37 个 config.ts 文件，microfrontend / api-tenant / api-notification 3 个根本不存在 config.ts，按用户所选 **保守口径 B** 留 3 未来补
- **Landed Commit**: `d1b6b9f7c`（2026-08-20）"feat(web): close P0-3 2/2 · aps+im 20 Props × 30 Fields + registry/shared Empty占位补齐"

---

## 1 · Design Intent（WHY）

P0-1 + P0-2 双轮 30/30 闭环后，V257 目标还剩 P0-3 收尾：
- aps（高级排产模块）与 im（即时通讯模块）是 P0 序列最后两个有真正 routes 的 config.ts，若不处理会留两个"类型黑洞"，造成 V257 矩阵 #1（有 Props 模块数）#6（替换率）无法真正全仓闭环；
- registry/shared 虽然 P0-2 已经被允许 `0 Props + 0 routes` 算合格，但这种"特殊口径"是历史债，P0-3 顺手用 2 行 Empty 接口补齐，让 **37 个实存 config.ts 全 100% 非 0 Props**（无例外、无特殊口径），后续 tooling（如 Perm-Gate 前端 gate-annotation 扫描）不需要额外 if-else。

### 1.1 Non-Goals

1. **不"创造" microfrontend / 2 api 不存在的 config.ts**：如果未来真要引入这些模块，自然会有 routes 再按同一流水线推进；
2. **不拆 registry/shared 的 routes 数组**：它们 `routes: []` 是设计态（模块级导航入口但页面在别处），不能为了凑 Vars=1 硬加空 RouteConfigV2 变量污染模块语义；
3. **不引入 stats 模板新规范**：aps 有 6 个 `template=stats` 路由，本 spec 允许它们按 `{}`（0 字段·但 interface 必须存在）推进，不在 P0-3 临时新增 stats 模板字段规范（留 V258 / 未来业务需求再扩）。

---

## 2 · Scope & DRY_RUN Expectation Table

### 2.1 Module 实态重扫（Step 0 关键发现）

```bash
$ ls apps/web/src/modules/*/config.ts | wc -l
37

37 = V253(5: report/admin/crm/pm/wms)
   + P0-1(15: hrm/mes/qms/lims/monitor/asset/finance/scm/srm/erp/bi/rd/oa/ai/workflow)
   + P0-2(15: ehs/tms/integration/gis/pdm/plugin/registry/notification/ticket/doc/mobile/automation/lowcode/shared/iam)
   + P0-3(2: aps + im)      ← 新增
```

### 2.2 P0-3 期望表（Step 1 DRY_RUN · 与落地 100% 一致）

| 模块 | PATHS | 路由模板分布 | Props | Vars | Bind | Fields | id | any=0 | 3≡? |
|------|-------|-------------|-------|------|------|--------|----|-------|-----|
| aps | 19 | dashboard 1 · list 5 · detail 6 · stats 6 · 动态段 /:id×6 | 18 | 18 | 18 | 27 | 6 | ✅ | ✅ |
| im | 3 | dashboard 1 · list 1 · 动态段 0 | 2 | 2 | 2 | 3 | 0 | ✅ | ✅ |
| registry | 2 | 空壳 · routes=[] | 1（Empty占位） | 0 | 0 | 0 | 0 | ✅ | N/A合格 |
| shared | 2 | 空壳 · routes=[] | 1（Empty占位） | 0 | 0 | 0 | 0 | ✅ | N/A合格 |
| **Sum 4** | **26** | **D1×L5×D6×S6 / D1×L1** | **22** | **20** | **20** | **30** | **6** | **4/4✅** | **4/4合格** |

### 2.3 合格判定公式（含骨架）

```
IF routes_count > 0:
    PASS ⟺ I = V = B > 0  AND  any == 0          // 3 恒等
ELSE (routes_count == 0):
    PASS ⟺ I >= 1  AND  any == 0                   // 只要有至少 1 个占位 interface 就合格
```

---

## 3 · Pipeline（6 步 · 与 P0-2 同口径 + 2 处 P0-3 专有补丁）

| Step | 操作 | 关键命令 / 处理 | P0-3 专有细节 |
|------|------|----------------|---------------|
| 1 | DRY_RUN 期望表 | `tmp-v257-props-gen-v5.cjs --module=aps` / `--module=im` · 内存期望模拟 registry/shared | v5 已支持任意模块（原白名单 CLI help 只列 6 个，但 findConfig 逻辑通用） |
| 2 | v5 apply | `--module=aps --apply` + `--module=im --apply`；registry/shared 手工插 EmptyXxxModuleProps{} | Python 插 XX_PATHS 行前（不影响 moduleConfig 字段） |
| 3 | v5fix + 语法清洗 | `v5fix.cjs aps im`（PATHS 还原 + templateType 删除）；sed `]] , / 连续空逗号`；**Edit 修 aps L412/im L69 的 `  ]],` → `  ],`** | 发现 v5 新缺陷：当 routes 数组全是独立变量引用（无内联对象字面量）时，闭合右括号被多写一个 `]`，P0-3 手工 2 处修复 → 留 V258 v6 修 root cause |
| 4 | ESLint + Prettier | `npx eslint --fix` · `npx prettier --write`（apps/web 下） | registry/shared 仅 2 warning：`RouteConfigV2` imported 但未使用（骨架无绑定属正常，不处理） |
| 5 | tsc 12GB heap | `NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit` 过滤 P0-3 4 模块 | **errors=29 = P0-2 baseline · 0 新增**；P0-3 4 模块 0 errors ✅ |
| 6 | TODO.md 回填 + commit + push | #1→37/40 · #1c→2/2✅ · #2→444 · #3→1350 · #6→393 routes · 任务拆分 P0-1/P0-2/P0-3 全 ✅ | Commit `d1b6b9f7c` · push origin main |

---

## 4 · Acceptance Matrix

| # | 指标 | Baseline | Target | Actual | PASS? |
|---|------|----------|--------|--------|-------|
| A1 | P0-3 有 config.ts 的模块 Props interface 存在 | 0/2 | 2/2 | **2/2（aps 18 + im 2 = 20）** | ✅ |
| A2 | registry/shared 空壳占位补齐 | 0/2 | 2/2 | **2/2（EmptyRegistry + EmptyShared · 均 0 字段）** | ✅ |
| A3 | 3 恒等（非空路由 aps/im） | — | 100% | **aps 18=18=18 · im 2=2=2 → 全绿 ✅** | ✅ |
| A4 | 路由对象残留 templateType = 0 | — | 0 | **0 / 20（v5fix 删除 18+2=20 行）** | ✅ |
| A5 | tsc P0-3 4 模块 errors | — | 0 | **0** | ✅ |
| A6 | 全仓 tsc 新增 = 0 | P0-2=29 | 29 | **29（0 新增）** | ✅ |
| A7 | TODO.md V257 验收矩阵 8 处回填 | — | 8/8 | **8/8（Status/#1/#1a/#1b/#1c/#2/#3/#6 + 任务拆分 3 行）** | ✅ |
| A8 | Conventional commit + push | — | SHA 可查 | **d1b6b9f7c** | ✅ |
| A9 | V257 全仓实存 Props 接口数 | P0-2=422 | +22 → 444 | **444（含 V253 50 + P0-1 260 + P0-2 113 + P0-3 22 + 2 Empty 占位重复记）** | ✅ |
| A10 | V257 全仓 RouteConfigV2<Props> 绑定 routes 数 | P0-2=373 | +20 → ≥315 | **393（= 373 + 18+2）· ≥90% 持续超额 ✅** | ✅ |

**Total PASS 率：10/10（100%）**

---

## 5 · 缺陷记录（Root Cause 留 V258 / v6）

| ID | 模块 | 缺陷描述 | 触发条件 | P0-3 临时处理 | 根因修复建议 |
|----|------|----------|----------|---------------|-------------|
| V5-01 | aps/im | routes 数组闭合生成 `  ]],` 双 `]` 而非 `  ],` | 原内联 routes 数组全部替换为独立变量引用、无对象字面量内容时，parser 在 "end of array" 时多 append 了一次 `]` | L412(aps) + L69(im) 手工 2 处 Edit | v5 生成阶段使用 bracket-stack 计数写回，而不是 regex 替换 + head template |
| V5-02 | registry/shared | eslint warning `RouteConfigV2` 未使用 | Empty 占位接口不需要绑定任何路由变量 | WONT-FIX（P0-3）· 风险低 | 未来如果要 0 warning，可改成 `import type { RouteConfigV2 as _RouteConfigV2 } ...` 或只在真有 routes 时加入 import |
| V5-03 | P0-3 通用 | v5 CLI help message 写死 `--module=<erp|bi|rd|oa|ai|workflow>`，误导用户 | 老注释未随脚本通用性扩展而更新 | WONT-FIX（P0-3） | 更新 line 32 报错文案 + line 9 文档头注释为 `--module=<any-module-under-modules/>` |

---

## 6 · Artifact（复现命令）

```bash
# 1. 最终回读表 7 维（bracket-stack inside 精确 Fields 算法）
cd /Users/xingzhai/TOPEMS
node -e '
const MODS=["aps","im","registry","shared"];
const fs=require("fs");
for(const m of MODS){
  const s=fs.readFileSync("apps/web/src/modules/"+m+"/config.ts","utf8");
  const I=(s.match(/^export interface [A-Z][A-Za-z0-9]+Props\b/gm)||[]).length;
  const V=(s.match(/^const\s+[a-z][A-Za-z0-9]*Route\s*:\s*RouteConfigV2\s*</gm)||[]).length;
  const B=(s.match(/RouteConfigV2\s*<\s*[A-Z][A-Za-z0-9]+Props\s*>/g)||[]).length;
  const any=(s.match(/RouteConfigV2\s*<\s*any\s*>/g)||[]).length;
  let F=0,id=0,inside=false;
  for(const l of s.split(/\r?\n/)){
    if(/^export interface [A-Z][A-Za-z0-9]+Props\b/.test(l)){inside=true;const m2=l.match(/\{\s*\}\s*$/);if(m2)inside=false;continue;}
    if(inside){if(/^\s*\}/.test(l))inside=false;else{const mm=l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);if(mm){F++;if(/^id$/i.test(mm[1])||/Id$/.test(mm[1]))id++;}}}
  }
  console.log(m,"I="+I,"V="+V,"B="+B,"F="+F,"id="+id,"any="+any);
}
'
# 期望：
# aps I=18 V=18 B=18 F=27 id=6 any=0
# im  I=2  V=2  B=2  F=3  id=0 any=0
# registry I=1 V=0 B=0 F=0 any=0
# shared   I=1 V=0 B=0 F=0 any=0

# 2. tsc 门禁复现（全仓仅 P0-3 4 模块过滤）
cd apps/web
NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit 2>&1 | grep -E "(aps|im|registry|shared)/config.ts" | grep -v node_modules
# 期望：空输出（0 error）
```

---

## 7 · 后续推进建议（V257 → V258 过渡）

P0-1/P0-2/P0-3 全闭环后，V257 剩余 P1-1 / P1-2 两项（相互独立，可并行）：
- **P1-1**：把存量 29 历史 tsc errors 清理 + V256 #12 tsc+i18n 推绿；
- **P1-2**：Perm-Gate R3=38 个 admin-only endpoints 补 `// gate: admin-only` 注释；

若 V258 继续推 V257 的 v5 脚本升级，建议 roadmap：
1. v6 用 AST-level bracket-stack 替换 regex，根修 V5-01（`]]` 双闭合）；
2. 更新 V5-03 CLI 文档为任意模块；
3. 把 stats 模板字段（空对象）按业务真正需求标准化为 `period? / dimensions? / metricId?` 三字段；
4. 将 37 模块 Props 接口接入真实 `useSearchParams<T>()` 类型推断的 E2E 类型链路测试（目前只是 Props 存在，未验证 TSX 侧真正强类型使用）。
