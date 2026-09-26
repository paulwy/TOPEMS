# V71 第六轮架构审计探针设计（版本: v0.1.0 / 日期: 2026-08-09）

## 1. 目标与范围

### 1.1 背景
V70 第五轮审计已完成 15/15 探针闭环，覆盖了模块分层、依赖方向、Schema 一致性、命名规范、迁移可追溯、权限最小化等核心维度。V71 进入"稳态加固期"，重点从前置合规转向**运行时契约**与**趋势退化**的发现，即在不破坏现有架构的前提下，通过新增探针和升级既有探针，形成对代码库演进的长期约束力。

### 1.2 本轮目标
- **新增 3 支探针**：面向前后端契约、循环依赖、覆盖率趋势三大未覆盖盲区
- **升级 5 支既有探针**：V70 探针的 V71 refresh，提升阈值严格度或覆盖范围
- **总计 8~10 探针**：并行可跑、输出统一格式、可挂入 CI

### 1.3 非目标
- 不引入性能探针（延迟/吞吐/CPU/Mem 由监控系统覆盖）
- 不做安全渗透测试（由 `scripts/security/scan.sh` 独立负责）
- 不做业务逻辑正确性验证（属于单测/E2E 范畴）

---

## 2. 探针总表

| ID  | 名称                                   | 维度           | 严重度阈值        | PoC 难度 | 输入数据源                                 | 输出格式                     |
| --- | -------------------------------------- | -------------- | ----------------- | -------- | ------------------------------------------ | ---------------------------- |
| P-01 | EntitySchema maxLength 反向审计        | 数据契约       | mismatch ≥ 1 红   | 低       | lib/shared-db/* + migration 元数据         | Markdown 表格 + JSON         |
| P-02 | check-migration-names strict 化        | 命名规范       | mismatch ≥ 1 红   | 低       | database/migrations/*.sql                  | console diff + exit code     |
| P-03 | 跨 SVC 模块依赖方向审计                | 分层架构       | 反向边 ≥ 1 红     | 中       | svc/*/Cargo.toml + lib/*/Cargo.toml        | directed graph mermaid       |
| P-04 | OpenAPI 前后端契约一致性探针（新）     | API 契约       | mismatch ≥ 5 红   | 高       | openapi.d.ts + apps/web/src/api/**/*.ts    | operationId 差异清单         |
| P-05 | 去门面化后模块依赖有向图（新）         | 依赖结构       | SCC≥2 环 ≥ 1 红   | 中       | svc/lib/apps 依赖声明                      | SCC 环列表 + mermaid         |
| P-06 | 覆盖率散点探针（新）                   | 质量趋势       | P5 标红 / P25 黄  | 中       | tarpaulin.json + vitest coverage-summary   | 散点图 + 连续下降警报        |
| P-07 | utoipa schema vs 后端 handler 签名     | 代码契约       | mismatch ≥ 3 红   | 中       | src/routes.rs + openapi 生成 diff          | handler 列表 JSON            |
| P-08 | 全局 `use` 语句未使用/重复导入审计     | 代码质量       | count ≥ 20 黄     | 低       | **/*.rs 全量 AST                          | 文件级统计 CSV               |
| P-09 | lib/* 对外导出结构向后兼容检测         | API 稳定性     | break ≥ 1 红      | 中       | 上版本 pub API 快照 vs 当前                | breaking change 清单         |
| P-10 | 错误码前缀与模块映射一致性             | 运维可观测     | mismatch ≥ 1 红   | 低       | shared-error/src/errors.rs + svc 映射表    | 错误码矩阵 CSV               |

> 严重度阈值：红（block CI）/ 黄（warn 不阻塞）/ 蓝（info 仅展示）。

---

## 3. 新探针详情

### 3.1 OpenAPI 前后端契约一致性探针（typescript-interface vs utoipa schema diff）

**问题背景**：后端由 utoipa 生成 `openapi.yaml`，前端通过 codegen 生成 `packages/shared-types/src/generated/openapi.d.ts`，再由 `apps/web/src/api/**/*.ts` 手写调用封装。三者漂移会导致：
1. 前端传入字段后端不收 → 400 / 422
2. 后端返回字段前端不接 → 类型安全空洞
3. 可选性不一致 → 运行时 undefined 崩溃

**输入**：
- `packages/shared-types/src/generated/openapi.d.ts`（typescript interface 集合）
- `apps/web/src/api/**/*.ts`（手写 API 调用函数，按路径 + method 聚合）

**算法**（伪代码）：
```typescript
// scripts/audit/probe-openapi-contract.ts (PoC 伪代码，不需要真实可跑)
interface Op {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  params: Record<string, { type: string; optional: boolean }>;
  reqBody?: { type: string; optional: boolean };
  respType: string;
}

function parseOpenapiDts(contents: string): Op[] {
  // 1. 匹配 `export interface Paths { ... }` 块
  // 2. 对每个 path/method 组合提取 operationId 与入参/返回值
  // 3. 输出 Op[]，key = `${method} ${path}`
}

function parseWebApiFiles(files: string[]): Record<string, Op> {
  // 遍历 apps/web/src/api/**/*.ts
  // 匹配形如: `export async function createBug(params: CreateBugReq): Promise<Bug>`
  // 同时读取函数内注释或 decorator 推断 method + path（若缺失则走 fallback 按命名推断）
  // key = `${method} ${path}` 或 functionName
}

function diff(openapiOps: Op[], webOps: Record<string, Op>): Mismatch[] {
  const out: Mismatch[] = [];
  for (const op of openapiOps) {
    const web = webOps[op.operationId] ?? webOps[`${op.method} ${op.path}`];
    if (!web) { out.push({ level: "warn", opId: op.operationId, reason: "NO_WEB_WRAPPER" }); continue; }
    out.push(...diffFields("params", op.params, web.params));
    out.push(...diffType("reqBody", op.reqBody, web.reqBody));
    out.push(...diffType("resp", op.respType, web.respType));
  }
  return out;
}

type MismatchLevel = "error" | "warn" | "info";
interface Mismatch {
  level: MismatchLevel;
  opId: string;
  path?: string;
  reason:
    | "FIELD_MISSING" | "FIELD_EXTRA"
    | "TYPE_INCOMPATIBLE" | "OPTIONALITY_MISMATCH"
    | "NO_WEB_WRAPPER";
  field?: string;
  openapiSide?: string;
  webSide?: string;
}
```

**输出格式**（JSON + Markdown）：
```json
{
  "probe": "openapi-contract",
  "version": "0.1.0",
  "summary": { "error": 3, "warn": 12, "info": 45 },
  "mismatches": [
    { "level": "error", "opId": "rd_createBug", "field": "severity",
      "reason": "TYPE_INCOMPATIBLE", "openapiSide": "BugSeverity", "webSide": "string" }
  ]
}
```

**CI 阻断规则**：`error ≥ 5` → red / block；`warn ≥ 30` → yellow / allow。

---

### 3.2 去门面化后模块依赖有向图（循环依赖探测）

**问题背景**：V70 完成了去门面化（`lib/shared-*` 拆分），但跨 `svc/*` 之间、`svc ↔ lib` 之间若出现**循环依赖**（SCC ≥ 2），会导致：
- 编译增量退化（cargo 重新编译链放大）
- 模块边界名存实亡，重构成本指数级上升

**输入**：
- `svc/*/Cargo.toml`（`[dependencies]` 中 `topems-*` 的本地依赖）
- `apps/web/package.json`（`@topems/*` workspace 依赖）
- `lib/*/Cargo.toml`（`shared-*` 互相依赖）

**算法**（Tarjan SCC）：
```python
# scripts/audit/probe-dep-graph.py (PoC 伪代码，不需要真实运行)
import os, tomllib, json
from collections import defaultdict

def load_toml_deps(path):
    with open(path, "rb") as f:
        data = tomllib.load(f)
    name = data["package"]["name"]
    local_deps = []
    for dep_name in data.get("dependencies", {}).keys():
        if dep_name.startswith("topems-") or dep_name.startswith("shared-"):
            local_deps.append(dep_name)
    return name, local_deps

def build_graph(root):
    g = defaultdict(list)  # node -> [deps]
    nodes = set()
    for sub in ("svc", "lib"):
        for dirpath, _, files in os.walk(os.path.join(root, sub)):
            if "Cargo.toml" in files:
                n, deps = load_toml_deps(os.path.join(dirpath, "Cargo.toml"))
                nodes.add(n)
                for d in deps:
                    g[n].append(d); nodes.add(d)
    # apps/web
    # ... 解析 package.json workspace 依赖，以 npm 包名为节点
    return g, nodes

def tarjan_scc(g, nodes):
    index_counter = [0]; stack = []; lowlinks = {}; index = {}; on_stack = {}; result = []
    def strongconnect(v):
        index[v] = index_counter[0]; lowlinks[v] = index_counter[0]; index_counter[0] += 1
        stack.append(v); on_stack[v] = True
        for w in g.get(v, []):
            if w not in index:
                strongconnect(w); lowlinks[v] = min(lowlinks[v], lowlinks[w])
            elif on_stack.get(w):
                lowlinks[v] = min(lowlinks[v], index[w])
        if lowlinks[v] == index[v]:
            scc = []
            while True:
                w = stack.pop(); on_stack[w] = False; scc.append(w)
                if w == v: break
            result.append(scc)
    for v in nodes:
        if v not in index:
            strongconnect(v)
    return [s for s in result if len(s) >= 2]

def output_mermaid(cycles):
    lines = ["flowchart TD"]
    for c in cycles:
        for i, n in enumerate(c):
            nxt = c[(i+1) % len(c)]
            lines.append(f"  {n.replace('-','_')} --> {nxt.replace('-','_')}")
    return "\n".join(lines)

if __name__ == "__main__":
    g, nodes = build_graph("/Users/xingzhai/TOPEMS")
    cycles = tarjan_scc(g, nodes)
    print(json.dumps({
        "probe": "dep-graph-scc",
        "total_nodes": len(nodes),
        "cycle_count": len(cycles),
        "cycles": cycles,
        "mermaid": output_mermaid(cycles),
        "ci_block": len(cycles) > 0
    }, indent=2, ensure_ascii=False))
```

**输出格式**：
- `docs/audit/artifacts/v71-dep-scc.json`：SCC 列表 + 邻接表快照
- Mermaid 有向图：嵌入审计报告
- CI：若 `cycle_count > 0` → red / block

---

### 3.3 覆盖率散点探针

**问题背景**：覆盖率绝对值 80% 不代表质量，**持续下降趋势**才是风险信号。典型反模式：
- 某 crate 连续 3 版本从 92% → 88% → 83%，绝对值仍达标，但方向错误
- 某文件覆盖率 < P5（全线 5% 分位）却从未被关注

**输入**：
- `cargo tarpaulin --workspace --out Json` 生成的 `tarpaulin-report.json`
- `pnpm test:coverage` 生成的 `apps/web/coverage/coverage-summary.json`
- 历史基线：`docs/benchmarks/coverage-history/*.json`（每版本一条）

**算法**（百分位 + 趋势）：
```
输入:
  S = {(ver, crate, cov_pct)}   // 历史版本 + crate 二维面板
  curr_files = {(file, cov_pct)} // 当前版本文件级

步骤:
  1. crate 级百分位
     - 按 curr 版本的 crate cov 升序排序
     - P5  = percentile(5)；P25 = percentile(25)
     - 标记：cov < P5 → RED; P5 ≤ cov < P25 → YELLOW; else GREEN

  2. 连续 3 版本下降警报
     - 对每个 crate，取最近 3 条 (v_prev2, v_prev1, v_curr)
     - 若 cov_pct(v_prev2) > cov_pct(v_prev1) > cov_pct(v_curr)，且每轮降幅 ≥ 0.5%
       → 标记 ALARM，计算总降幅 = v_prev2 − v_curr

  3. 文件级散点
     - 输出 (x = 文件所在 crate 的历史 avg_cov, y = 当前 file_cov)
     - 画 y = P5 / y = P25 两条水平线，散点按色区分层

输出:
  {
    "p5": 38.2, "p25": 61.7,
    "red_files":   ["svc/rd/src/modules/rs/engine.rs: 12.4%"],
    "yellow_files":[...],
    "trend_alarms": [
      {"crate": "topems-shared-db", "v69": 91.2, "v70": 88.7, "v71": 85.1, "total_drop": 6.1}
    ]
  }
```

**PoC 伪代码（Python）**：
```python
# scripts/audit/probe-coverage-scatter.py (PoC 伪代码)
import json, glob, statistics

def percentile(sorted_vals, p):
    if not sorted_vals: return 0.0
    k = (len(sorted_vals)-1) * p/100
    f, c = int(k), int(k)+1
    if c >= len(sorted_vals): return sorted_vals[-1]
    return sorted_vals[f] + (sorted_vals[c]-sorted_vals[f])*(k-f)

def load_history(pattern):
    series = {}  # crate -> [(ver, pct)]
    for fp in sorted(glob.glob(pattern)):
        ver = fp.split("/")[-1].replace(".json", "")
        with open(fp) as f: data = json.load(f)
        for crate, pct in data.get("crates", {}).items():
            series.setdefault(crate, []).append((ver, pct))
    return series

def main():
    with open("tarpaulin-report.json") as f: curr = json.load(f)
    crate_cov = sorted(curr["crates"].values())
    p5, p25 = percentile(crate_cov, 5), percentile(crate_cov, 25)
    red, yellow = [], []
    for file_, pct in curr["files"].items():
        if pct < p5: red.append(f"{file_}: {pct:.1f}%")
        elif pct < p25: yellow.append(f"{file_}: {pct:.1f}%")
    hist = load_history("docs/benchmarks/coverage-history/*.json")
    alarms = []
    for crate, seq in hist.items():
        if len(seq) >= 3:
            a, b, c = seq[-3], seq[-2], seq[-1]
            if a[1]-b[1] >= 0.5 and b[1]-c[1] >= 0.5:
                alarms.append({"crate": crate, "drop_total": round(a[1]-c[1],1)})
    print(json.dumps({"p5":p5,"p25":p25,"red_files":red,"yellow_files":yellow,"trend_alarms":alarms}, ensure_ascii=False, indent=2))

if __name__ == "__main__": main()
```

**输出格式**：
- 结构化 JSON（上述）
- 一个 `.html` 散点图（d3/echarts，可选）
- CI：`len(trend_alarms) > 0` → yellow（不阻塞，只告警）；`len(red_files) > 20` → red。

---

## 4. 既有探针升级清单（第五轮探针 V71 refresh）

| 旧 ID (V70) | 升级动作                                                                             | 升级前阈值       | 升级后阈值         |
| ----------- | ------------------------------------------------------------------------------------ | ---------------- | ------------------ |
| AP-07       | EntitySchema maxLength 反向审计：新增 **Enum 枚举值上下线对齐** 校验                 | ≥1 字段 red      | ≥1 字段 red 不变 + Enum 漂移 ≥1 red |
| AP-03       | check-migration-names：新增 **`down.sql` 与 `up.sql` checksum 绑定** 校验             | 命名不规范 red   | 命名 + checksum 双 red |
| AP-11       | 跨 SVC 模块依赖方向：新增 **`apps/web` → `svc/*` 直接依赖** 检测（必须经 `shared-types`） | 反向边 ≥1 red    | 反向边 ≥1 red + web→svc 直接依赖 red |
| AP-05       | utoipa vs handler 签名：新增 **Query 参数 `#[serde(default)]` 与 openapi `required=false` 同步** 校验 | ≥3 mismatch red  | ≥3 mismatch red 不变，额外细分等级 |
| AP-09       | 错误码前缀映射：新增 **`InternalErrorCode` 文档索引** 自动生成                       | ≥1 mismatch red  | ≥1 mismatch red + 文档覆盖率 <100% yellow |

每项升级对应 `scripts/audit/` 下已有脚本的增量改造，不引入新的文件级路径，保证向后兼容。

---

## 5. 执行计划

### Phase 0：PoC 验证（1 周，2026-08-09 ~ 2026-08-15）
- [ ] P-04 OpenAPI 契约探针：先跑 1 个 svc（`svc/rd`）产出 mismatches，人工核验无误后推广全量
- [ ] P-05 依赖 SCC 探针：跑全量依赖，若发现真实环，输出 mermaid 图供架构评审
- [ ] P-06 覆盖率散点：准备 3 个历史版本 baseline（V69/V70/V71），触发一次报警验证

**退出标准**：每个新探针 ≥ 1 份真实 run 的 artifact 存放在 `docs/audit/artifacts/v71-poc/`。

### Phase 1：首次全量跑（1 周，2026-08-16 ~ 2026-08-22）
- [ ] 10 支探针全量跑一遍，生成完整问题矩阵
- [ ] 对 P-04 red 级 mismatch：开 issue 指派对应 owner（后端/前端各一人）
- [ ] 对 P-05 依赖环：召开 30min 架构会，商定拆环优先级（阻断 / 延后）
- [ ] 对 P-06 趋势警报：按 crate 派 PR，覆盖率回补或说明豁免理由

**退出标准**：全量审计报告 v1.0 交付 `docs/audit/V71-sixth-round-report.md`。

### Phase 2：CI 挂入（长期，2026-08-23 起）
- [ ] `probe-dep-graph-scc` + `EntitySchema maxLength`：**blocking**（red = fail CI）
- [ ] `probe-openapi-contract` + `check-migration-names`：**warning mode first**，2 周后切 blocking
- [ ] `probe-coverage-scatter`：**non-blocking**，仅在 PR comment 中展示 red/yellow/trend
- [ ] 在 `.github/workflows/ci.yml` 新增 `audit-probes` job，依赖于 `test` job 完成

**退出标准**：CI workflow 连续 5 个主分支 commit 全绿，无误报。

---

## 6. 预期产物

| 产物                                     | 路径 / 定位                                                                 | 交付人 / 方式       |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------- |
| 探针 PoC 脚本（伪代码）                  | 本 §3 内嵌 + `scripts/audit/probe-*.{ts,py}`（与本文版本同步）               | 架构小组 PR         |
| 首轮全量问题矩阵                         | `docs/audit/artifacts/v71-problem-matrix.csv`（行 = 问题，列 = 探针/模块/严重度/owner/状态） | 脚本自动生成        |
| 审计报告 v1.0                            | `docs/audit/V71-sixth-round-report.md`                                      | 架构 Owner 汇总撰写 |
| 修复批 ID 映射表                         | `docs/audit/artifacts/v71-fix-batch-map.json`：`{batch_id: [issue_ids], owner: ...}` | GitHub Issues 标签   |
| 覆盖率散点图 + SCC 循环图                | `docs/audit/artifacts/v71-coverage-scatter.html` + `v71-scc-graph.md`        | 探针脚本产物        |
| CI `audit-probes` job 配置               | `.github/workflows/ci.yml` 新增段                                           | DevOps PR           |

### 修复批 SLA 约定
| 等级 | 首次发现 → 关闭 SLA | 升级路径                |
| ---- | ------------------- | ----------------------- |
| RED  | ≤ 2 周              | 逾期主分支 lock 合并权  |
| YELLOW | ≤ 1 个月          | 逾期升级为 RED          |
| BLUE | 无强制              | 放入 backlog 按优先级   |

---

**文档尾注**：本文为设计稿，探针脚本实现细节、阈值微调以实际 Phase 0 PoC 结果为准，最终解释权归 V71 架构审计小组。
