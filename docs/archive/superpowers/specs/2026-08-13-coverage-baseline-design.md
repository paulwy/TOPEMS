# 覆盖率基线测量脚本设计（V203 P0-3.1）

> 生成时间：2026-08-13  
> 版本：v1.0  
> 阶段：Spec → Implementation  
> 关联问题：P0-3 测试覆盖率低（当前约 13% 行 / 6% 分支）

## 1. 目标与范围

### 1.1 目标
为 TOPEMS 全仓（Rust workspace + TypeScript apps/web）建立**可复现的覆盖率基线测量入口**，输出人读 Markdown 报告 + 机读 JSON 报告，支持 CI 阈值门禁，为后续 V203.2 覆盖率提升行动提供量化基准。

### 1.2 范围（本设计交付物）
- 1 个 bash 主调度脚本：`scripts/ci/coverage-baseline.sh`（~250 行）
- 1 个 Python 汇总器：`scripts/ci/coverage-report.py`（~200 行）
- 2 个 Makefile 快捷目标：`coverage-baseline` / `coverage-baseline-full`

### 1.3 非目标（YAGNI，不包含）
- 不做覆盖率提升（V203.2 独立专题）
- 不做每次 PR 的覆盖率 diff（可后续集成 codecov.io / coveralls）
- 不集成到 GitHub Actions 每次 PR 跑（体积太大，仅 nightly/手动）
- 不做 e2e（cypress/playwright）覆盖率采集
- 不新增 Rust crate 或 Node 依赖包（用现有工具链）

## 2. 方案选择

**方案 A（采纳）**：bash 主调度 + Python 汇总
- Rust 采集：bash 调 `cargo test -Z instrument-coverage` → `llvm-profdata merge` → `llvm-cov export` JSON/HTML
- TS 采集：bash 调 `pnpm vitest run --coverage`（用 vitest 已配置的 v8 provider）
- 汇总：`coverage-report.py` 读 per-crate JSON + vitest summary，输出 Markdown/JSON/阈值判断
- 与现有 `scripts/ci/lint-check.sh` 风格一致

**方案 B（备选）**：纯 Python 单脚本。舍弃以保持风格一致。

**方案 C（备选）**：新增 Rust `tools/coverage-agent` crate。舍弃（杀鸡用牛刀）。

## 3. 架构

```
 scripts/ci/coverage-baseline.sh        scripts/ci/coverage-report.py
       (bash 主调度)                         (Python 汇总)
┌──────────────────────────────┐    ┌─────────────────────────────────┐
│ 1. 自检: cargo/rustc/llvm/   │    │ 1. 扫描 target/coverage/        │
│    jq/pnpm/python3           │    │    per-crate/*.json             │
│ 2. 解析 CLI flags            │    │ 2. 读 apps/web/coverage/        │
│ 3. 构建 crate 目标列表       │    │    coverage-summary.json        │
│ 4. 调度 Rust:                │    │ 3. 加权计算 (非简单均值)        │
│    cargo test -Z instrument  │→   │ 4. tier 分级 (red/yellow/green) │
│    llvm-profdata merge       │    │ 5. 阈值判断 exit 0/1            │
│    llvm-cov export           │    │ 6. 产出:                        │
│ 5. 调度 TS:                  │    │    - report.md                  │
│    pnpm vitest --coverage    │    │    - report.json                │
│    → coverage-summary.json   │    │    - 控制台 ASCII 表            │
└──────────────────────────────┘    └─────────────────────────────────┘
```

## 4. 工件目录

```
target/coverage/              ← 脚本默认 OUTPUT_DIR
├── profraw/<crate>/*.profraw
├── profdata/<crate>.profdata
├── per-crate/<crate>.json
├── html/<crate>/index.html    ← --no-html 跳过
├── report.md
└── report.json

apps/web/coverage/             ← Vitest 原生输出 (--ts 跳过此步时不生成)
├── coverage-summary.json
├── index.html
└── lcov.info
```

> 以上 `target/` 和 `apps/web/coverage/` 已在 `.gitignore` 中匹配，无需新增忽略项。

## 5. CLI 参数（coverage-baseline.sh）

参考 `scripts/ci/lint-check.sh` 风格（彩色日志 + `-h/--help` + 长短选项）。

| Flag | 说明 | 默认 |
|:----|:-----|:----:|
| `-h / --help` | 帮助 | — |
| `--rust` | 只跑 Rust（跳过 TS） | 关（双栈） |
| `--ts` | 只跑 TS（跳过 Rust） | 关（双栈） |
| `--fast` | 快速模式：shared-* 8 + 核心 5 + apps/web | ✅ 默认 |
| `--full` | 全量模式：--workspace 43 crates + apps/web | — |
| `-p <PKG>/--package <PKG>` | 指定 crate（可多次）；同时给 `--fast`/`--full` 则合并 | — |
| `--skip-clean` | 跑完不清除 profraw/profdata 中间文件 | 关 |
| `--no-html` | 跳过 llvm-cov/vitest HTML 输出 | 关 |
| `--output-dir <DIR>` | 报告输出目录 | `target/coverage` |
| `--fail-under <PCT>` | 总体行覆盖 < PCT 时 exit 1（小数 OK） | — |
| `--fail-rust-under <PCT>` | 仅 Rust 阈值 | — |
| `--fail-ts-under <PCT>` | 仅 TS 阈值 | — |
| `-v/--verbose` | 打印 cargo/vitest 子命令完整 stdout | 关（仅展示阶段进度） |

### 默认 crate 列表（快速模式，13 个）

shared-* 8：topems-shared-core, shared-db, shared-auth, shared-service-client, shared-event, shared-observability, shared-ai, shared-bootstrap

核心 svc 5：topems-unified-core, ai, erp, wms, crm

## 6. 数据模型

### 6.1 per-crate/<crate>.json（Rust 侧产出，bash 侧生成）

优先用 `jq` 裁剪为：
```json
{
  "crate": "topems-unified-core",
  "timestamp": 1755072000,
  "status": "ok",
  "totals": {
    "lines":     {"count": 12831, "covered": 1674, "percent": 13.05},
    "functions": {"count":  1840, "covered":  210, "percent": 11.41},
    "branches":  {"count":  8210, "covered":  493, "percent":  6.00},
    "regions":   {"count":  9500, "covered": 1201, "percent": 12.64}
  },
  "files_count": 84
}
```
- 无 `jq` 时直接落盘 llvm-cov 原始 JSON，Python 侧读 `data[0].totals` 结构字段名一致
- 若 `cargo test` 失败或 `llvm-cov export` 异常，则写：`{"crate":"topems-crm","status":"failed","reason":"compile_error"}`，汇总时放表尾单列

### 6.2 apps/web coverage-summary.json（Vitest 原生）

```json
{ "total": {
    "lines":     {"total": 15000, "covered": 2100, "pct": 14.00},
    "functions": {"total": 2400,  "covered": 300,  "pct": 12.50},
    "statements":{"total": 16200, "covered": 2250, "pct": 13.89},
    "branches":  {"total": 9000,  "covered": 600,  "pct":  6.67}
  }
}
```

### 6.3 report.json（Python 汇总）

参见设计 3.3 节。关键字段：
- `meta`（时间、模式、git、工具链版本）
- `summary.rust|ts|overall`（含 weighted_* 加权百分比）
- `rust_per_crate[]`（按 lines_pct 降序、含 tier 红黄绿）
- `threshold`（启用状态、阈值、实际值、pass/fail）

### 6.4 Tier 分级表

| Tier | lines_pct | 色码 |
|------|:---------:|:----:|
| 🟢 green | ≥ 40% | `#22c55e` |
| 🟡 yellow | 15% - 40% | `#eab308` |
| 🔴 red | < 15% | `#ef4444` |

## 7. 汇总算法（coverage-report.py）

1. **逐个 crate 读 per-crate JSON**：缺失 → `skipped[]` warning（不抛错）
2. **TS 读 vitest summary**：不存在 → `ts = null`，汇总仅 Rust
3. **Rust 加权**（不是简单均值！）：
   ```
   lines_pct_weighted = Σ(crate.totals.lines.covered) / Σ(crate.totals.lines.count)
   ```
   branches/functions 同理
4. **TS 直接取** vitest summary `total.<metric>.pct`
5. **overall**：(Rust_covered_lines + TS_covered_statements) ÷ (Rust_count_lines + TS_count_statements)
6. 阈值判断 → `threshold.enabled=true/false`，`threshold.passed=true/false`
7. 产出 Markdown（设计 4.1 格式）+ JSON + 控制台 ASCII 摘要表
8. `sys.exit(0 if passed else 1)`

## 8. 自检与降级策略（coverage-baseline.sh）

启动时按序执行：
1. `Cargo.toml` 根定位 → 自动 cd
2. `cargo` / `rustc` / `llvm-profdata` / `llvm-cov` → 缺失即 `exit 2`（+ 安装建议）
3. `rustc` 支持 `-Z instrument-coverage` 吗？
   - 本机有 nightly：直接 `cargo +nightly test -Z ...`
   - 只有 stable：尝试 `RUSTC_BOOTSTRAP=1 cargo test -Z ...`；仍失败则警告并进入"TS-only"模式或退出
4. `jq` 存在性：无则跳过 per-crate JSON 裁剪（落原图），Python 侧兼容
5. `pnpm` 存在性：跑 TS 时查，缺则跳过 TS（WARNING，不 fail）
6. `python3` ≥ 3.10：最后再查，缺则 fallback bash+awk 简表（并警告无法生成 report.md/json）

**中段容错**：
- 单 crate `cargo test` 失败 → 记录 failed JSON 继续下一个（不中断整轮）
- 单 crate `llvm-cov export` 失败 → 同上
- Vitest 失败 → ts 置 null + 记录

## 9. 现有入口集成

### 9.1 Makefile 目标（追加到 "质量门禁" 分组后）

```makefile
coverage-baseline: ## 快速模式覆盖率基线（13 crates + apps/web vitest）
	./scripts/ci/coverage-baseline.sh --fast

coverage-baseline-full: ## 全 workspace + apps/web 覆盖率基线
	./scripts/ci/coverage-baseline.sh --full
```

### 9.2 CI 接入

`scripts/README.md` 或 `docs/deployment/` 中说明：在 `.github/workflows/ci.yml` 加 nightly job。**本设计不改 ci.yml**。

## 10. 验收标准（Acceptance Criteria）

| # | 标准 | 验证方式 |
|:-:|:-----|:---------|
| A1 | `bash -n scripts/ci/coverage-baseline.sh` 无语法错误 | 命令执行 0 退出 |
| A2 | `python3 -m py_compile scripts/ci/coverage-report.py` 成功 | 命令执行 0 退出 |
| A3 | `./scripts/ci/coverage-baseline.sh -h` 输出帮助（包含 flags 列表） | 人工或 grep 验证 |
| A4 | 烟雾跑：`--ts-only` 模式（只需 `--ts --skip-clean --no-html`）生成 report.md + report.json 各一份 | 断言两文件均存在且 JSON 含 `meta`/`summary` 顶层 key |
| A5 | 报告内容：首次快跑结果中 Rust 行覆盖在 **11%–15%** 区间内（±2pp，匹配审计观察） | 检查 report.json `summary.rust.lines_pct` |
| A6 | 阈值门禁：`--fail-under 100` 必须 exit 非 0；`--fail-under 0` 必须 exit 0 | 两命令各自验证 |
| A7 | 单 crate 失败不影响整体：强制一个不存在的 crate `-p topems-xxx`，脚本仍生成报告，目标 crate 表尾显示 SKIPPED | 实际跑验证 |
| A8 | `make coverage-baseline` 与直接跑脚本输出一致 | 目视日志 |

## 11. 风险与缓解

| 风险 | 影响 | 缓解 |
|:----|:-----|:-----|
| `-Z instrument-coverage` 需要 nightly | 首次跑可能失败 | 自检阶段尝试 `+nightly` → `RUSTC_BOOTSTRAP=1` → 提示安装步骤 |
| llvm-cov/profdata 缺组件 | 不能跑 | 自检报错 + `rustup component add llvm-tools-preview` 提示 |
| `cargo test --workspace` 全量跑编译/运行耗时（30min+） | 本地慢 | 默认 `--fast`，`--full` 仅里程碑时使用 |
| MES crate 当前 98 个编译错误 | 全量模式下 MES 标记失败 | 中段容错记录 SKIPPED，不阻塞其他 crate |
| 前端 AD_HOC 引用错误（669 tsc 错） | vitest --coverage 可能中途 | 脚本中段容错，记录 TS: failed 并输出原因（捕获 stderr 前 5 行） |

## 12. 后续工作（V203.2，不包含在本 spec 实现）

1. 红区 crates (≤10%) 批量 handler smoke tests 补测
2. 前端 TS 按模块（api/pages/components）分批次提升到 20%
3. CI nightly 自动运行基线 + 存档报告到 S3/Artifact
4. Codecov 或 Coveralls 集成，PR 上显示 diff

---

## 13. 实施实测结果（2026-08-15 补录）

> V203 P0-3.1 基线工具链完整落地后，直接驱动了两轮覆盖率冲刺（V203 P1 + P5），实测 Region 覆盖从 ~13% 基线 → 45.84%。

### 13.1 基线工具落地验证

| 验收项 | 标准 | 实测 | 结果 |
|:------|:-----|:-----|:----:|
| A1 bash 语法 | `bash -n` exit 0 | ✅ 通过 | ✅ |
| A2 python 编译 | `py_compile` exit 0 | ✅ 通过 | ✅ |
| A3 help 列出 flags | 15+ flags | ✅ 全列出 | ✅ |
| A5 Rust 行覆盖区间 | 11%–15% 基线 | 初跑 ~13% | ✅ |
| A6 阈值门禁 | `--fail-under 100` → 1, `--fail-under 0` → 0 | ✅ | ✅ |
| A7 SKIPPED 不阻塞 | 不存在 crate → 表尾记录 | ✅ | ✅ |
| A8 make 入口 | `make help \| grep coverage` | ✅ 2 目标 | ✅ |

### 13.2 冲刺实测数据

| 阶段 | 策略 | 新增测试 | 覆盖文件 | Region Δ |
|------|------|----------|----------|----------|
| V203 P1 | 18 crate 纯函数提取 × 10% | ~1,000+ | 80+ | 13% → ~30% |
| V203 P5 Round 1 | serde derive roundtrip 批量 + mock 架构 | 147 | 22 | 43.19% → 45.53% |
| V203 P5 Round 2 | finance+portal zero-coverage + handlers | 88 | 21 | 45.53% → **45.84%** |

### 13.3 关键发现

1. **serde roundtrip 是拉覆盖率最高 ROI 的路径**：`Serialize`/`Deserialize` derive 密集的 0-test 文件，一条 `roundtrip(&struct)` 即可覆盖构造 → JSON 序列化 → 反序列化 → 字段校验，单文件 region 覆盖率从 0% 跃升至 40–80%。
2. **业务逻辑测试需要 mock 注入**：handlers.rs 里直接 `let client = AiFormAssistantClient::new()` 无法隔离测试；trait 化 + `impl AiFormAssistant for MockAssistant` 后，handlers.rs 从 0% → 91.46%。
3. **磁盘空间管理是长跑约束**：cargo llvm-cov 的 `.profraw` + `.profdata` + `llvm-cov export` JSON 会迅速膨胀到 10–20 GB；每 3–5 个 crate 清一次 `target/llvm-cov-target` + `target/llvm-cov-profdata` 可避免 ENOSPC。

### 13.4 下一步建议（替代原 §12）

| 优先级 | 方向 | 预期 Δ |
|--------|------|--------|
| P0 | finance V54-V60 handlers 业务逻辑 + mock（risk/settlement/tax） | +0.5–1.0pp |
| P1 | portal GraphQL resolver 业务 handler | +0.3–0.5pp |
| P1 | erp crate（27.91% region，13,348 行）纯函数提取 | +0.5pp |
| P2 | CI nightly：`make coverage-baseline` → artifact 存档 | 自动化 |
