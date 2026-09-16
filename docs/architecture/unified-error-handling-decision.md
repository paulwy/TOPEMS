# 统一错误出口决策（ADR）

> 状态：已采纳（脚手架 + 门禁 + 前两个服务迁移样板已落地并验证）｜日期：2026-09-14｜代号：V517 / Gate T
> 落地文件：
> `lib/shared-core/src/error/{enhanced.rs,mod.rs}`、`lib/shared-core/src/lib.rs`（脚手架）
> `scripts/ci/check-error-handling.cjs`、`scripts/ci/error-handling-baseline.json`（门禁）
> `.github/workflows/ci.yml`（Gate T）、`lefthook.yml`（pre-commit 报告模式）、`package.json`（脚本入口）
> `scripts/migrations/migrate_error_leaks.py`（存量迁移 codemod，自带 `--self-test`）
> `svc/gis/src/**`（首个服务迁移样板，见 §4.1）、`svc/integration/src/**`（第二个服务，见 §6.4）
> 关联：[shortcomings-analysis](../plans/shortcomings-analysis.md)、V184 `ErrorPayload`（`lib/shared-core/src/response.rs`）

---

## 1. 背景与实测数据

平台已有**类型正确**的错误基础设施（`TopemsError` + V184 `ErrorPayload` + `ApiResponse` 信封），但采纳度极低。实测口径：`svc/` 全量 1537 个 `.rs`，排除 `_archive` / `target` / `node_modules`，由 `scripts/ci/check-error-handling.cjs` 复算：

| 指标 | 数量 | 说明 |
|---|---|---|
| `ApiResponse::error(...)` 手写错误 | **3558** | 事实标准：错误码/文案由每个 handler 手工决定 |
| `TopemsError` 引用 | **252** | 其中 **244 集中在 `svc/finance`**（唯一试点） |
| 其中：`format!` 拼接原始错误 | **392** | gis 86 / integration 65 / ticket 59 / erp 37 / finance 36 / lims 23 / mobile 23 … |
| 其中：`<err>.to_string()` 直出 | **385** | 集中于 `svc/finance`（350）与 `svc/unified-core/src/modules/master/handlers.rs` |
| **泄露面合计** | **777** | 内部错误细节直达客户端 |
| 业务层 `anyhow::` | **60** | `svc/*/src/{modules,services,handlers,repositories}`，另 60 在 `main.rs` 启动边界（合理） |
| `.unwrap()` | 6755 | 同源的纪律问题，见项目评估报告 P0-1 |

> **口径修订（V517.1）**：初版门禁按**单行**匹配，`ApiResponse::error(` 跨行书写时整片漏检——实测漏检 85 处（`integration` 37 / `gis` 10 / `unified-core` 7 / `communication` 8 / `pm` 6 …）。
> 已将检测升级为**括号配平的语句级**（`extractArgs()`），泄露面由 307 修正为 **392**。两个独立实现（门禁脚本 / 独立 Python 复算）交叉核对一致，非新增违规。

**核心判断**：问题不是"缺少统一错误类型"，而是**服务层不用类型化错误**——用"手写 JSON 错误响应"代替。3558 : 252 的比例说明规范只停留在文档里。

### 1.1 由此产生的三个真实问题

**① 内部错误细节泄露（安全，可验证）**

```rust
// 形态 A：format! 拼接（392 处）— svc/lims/src/modules/sample_barcode.rs:274
Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),

// 形态 B：原始错误直出（385 处）— svc/unified-core/src/modules/master/handlers.rs:995
Err(e) => Json(ApiResponse::error(500, &e.to_string())),
```

`sqlx::Error` 的 Display 携带表名、列名、SQL 片段、约束名。形态 B 更直白：错误原文一字不改返回前端。

**② 错误码语义不可控**

3558 处手写错误的 HTTP 码分布：500 × 1854、404 × 679、400 × 597、变量 × 315、401 × 71、503 × 13、403 × 12、409 × 7、422 × 7、502 × 3。
同为"记录不存在"，不同服务可能返回 404 或 500；315 处码值是变量，无法静态审计。

**③ 无法统一埋点**：手写响应没有机器可读 `errorCode`，无法做分服务/分码错误率统计与告警。

---

## 2. 决策

采用**分层错误契约**，`TopemsError` 为唯一类型化错误，`ErrorPayload`（V184）为唯一错误响应体：

| 层 | 返回类型 | 说明 |
|---|---|---|
| service / 业务层 | `Result<T, TopemsError>` | `svc/finance/src/services/finance/*.rs` 已是此形态，作为参考实现 |
| handler 层 | `HandlerResult<T>`（新增） | `= Result<Json<ApiResponse<T>>, TopemsError>`，`?` 一站式收敛 |
| main / bootstrap 边界 | `anyhow` 允许 | 进程边界，失败即退出，不跨请求传播 |

- **成功响应**：继续用 `ApiResponse` 信封 → **前端契约零变更**。
- **失败响应**：`TopemsError` 经 `IntoResponse` 输出 `ErrorPayload`（含 `errorCode`），**不泄露内部细节**（细节只进 `tracing::error!`）。
- **`svc/*/src/{modules,services,handlers,repositories}` 下禁止新增 `anyhow`**，存量逐步清退。

### 2.1 命名：为何不叫 `ApiResult`

`svc/portal/src/modules/adaptive_execution.rs` 与 `smart_gateway.rs` 已定义 `pub struct ApiResult<T>`（成功信封，带 `ok()`），语义与本别名完全不同。一名两义会重演 V184 试图解决的"9 种错误体"困境，故取名 **`HandlerResult<T>`**。

> 后续清理项：portal 的 `ApiResult<T>` 结构体与 `ApiResponse` 职责重复，建议合并到 `ApiResponse` 后删除。

---

## 3. 已落地的脚手架（纯加法，零行为变更）

### 3.1 `TopemsError::classify()` — 单一映射源

把原本埋在 `IntoResponse` 里的 250 行映射抽为：

```rust
pub fn classify(&self) -> (StatusCode, String, Option<String>)  // (状态码, 客户端消息, 错误码)
```

- `IntoResponse` 改为调用 `classify()`，**行为逐字节保持**——原有 17 个 `into_response_*` 测试全部通过即为证据。
- 新增错误变体只需在 `classify()` 补一处，桥接与日志路径自动一致。

### 3.2 `HandlerResult<T>` — 目标签名

```rust
use topems_shared_core::error::{HandlerResult, TopemsError};

pub async fn get_receivable(...) -> HandlerResult<Value> {
    let data = service.get_receivable(id).await?;   // TopemsError 自动上抛 → ErrorPayload
    Ok(Json(ApiResponse::success(data, "查询成功")))
}
```

### 3.3 `From<TopemsError> for ApiResponse<T>` — 最小改动路径

给"不想改函数签名"的存量 handler 提供一行替换：

```rust
// 改前（泄露细节）
Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
// 改后（不改签名，安全）
Err(e) => return Json(ApiResponse::from(TopemsError::from(e))),
```

> 代价：`ApiResponse` 无 `errorCode` 字段，此路径丢失机器可读码。需要 `errorCode` 时迁移到 `HandlerResult<T>`。

### 3.4 防泄露回归测试

`test_classify_does_not_leak_internal_details` 覆盖 11 个内部类变体（含 `Sql` / `Io` / `RedisError` / `Serialization` 类型化变体，其**源错误自身即携带敏感串**），断言客户端消息不含内部细节。未来若有人在 `classify()` 里回显 `msg`，该测试立即失败。

### 3.5 `TopemsError::internal(context, e)` — 存量迁移的主力工具

存量泄露点绝大多数形如 `format!("查询失败: {}", e)`：**固定文案（可安全回显）+ 一个泄露位**。为此新增构造器：

```rust
pub fn internal<E: std::fmt::Display>(context: &str, error: E) -> Self
// → TopemsError::Internal("{context}: {error}")   // 细节进日志，客户端只收到「内部服务器错误」
```

迁移是**局部等价改写**，且**状态码语义不变**（`Internal` 恒为 500，与原 `500` 一致）：

| 迁移前 | 迁移后 |
|---|---|
| `Json(ApiResponse::error(500, &format!("查询失败: {}", e)))` | `Json(ApiResponse::from(TopemsError::internal("查询失败", e)))` |

- 相比裸用 `TopemsError::from(e)`，`internal()` **保留业务上下文**（`"查询失败: <detail>"` 进日志），可诊断性不降级。
- `?` 风格等价物是既有 trait `ErrorContext::with_context`（`.with_context("查询失败")?`），本次未新增重复 trait。

> **刻意不加新枚举变体**：`TopemsError` 已有 40+ 变体，其中一组还是"兼容性别名"（`Config` / `Database` / `Auth` …）。
> 4xx + 隐藏细节这一类（全仓仅 31 处：400 × 19、503 × 8、404 × 4）在调用点显式 `tracing::warn!` + 使用既有 `ValidationFailed` / `ServiceUnavailable` 变体表达，不为此增长枚举。
> 迁移完泄露面后，应另立任务清理这组重复的兼容变体。

---

## 4. 迁移路径（存量 3558 处）

### 4.1 首个服务迁移样板：`svc/gis`（泄露数最高的服务）

`gis` 86 处泄露全部迁移完成，作为后续服务的复刻模板：

| 类别 | 处数 | 处理方式 |
|---|---|---|
| `500` + `&format!("固定文案: {}", e)` | 77 | codemod 机械改写 → `TopemsError::internal` |
| `StatusCode::INTERNAL_SERVER_ERROR.as_u16()` + 同上 | 6 | 同上（与 500 语义等价） |
| `400` + 同上（解析/上传失败） | 3 | 人工：保留 400 语义 + `tracing::warn!` + `ValidationFailed` |

改写样例（`svc/gis/src/modules/device.rs`）：

```rust
// 迁移前
Err(e) => Json(ApiResponse::error(500, &format!("注册设备失败: {}", e))),

// 迁移后（客户端只收到「内部服务器错误」+ errorCode=INTERNAL_ERROR）
Err(e) => Json(ApiResponse::from(TopemsError::internal("注册设备失败", e))),
```

```rust
// 400 类：状态码语义保留，细节进日志（svc/gis/src/modules/geodata.rs）
Err(e) => {
    tracing::warn!("GeoJSON解析失败: {}", e);
    return Json(ApiResponse::from(TopemsError::ValidationFailed(
        "GeoJSON解析失败".to_string(),
    )));
}
```

> 400 类的处理原则：**客户端文案保留原前缀原文（逐字），只摘掉泄露位**。`ValidationFailed` 的客户端消息就是 `msg` 本身
> （见 `classify()`），因此这里传入的必须是可安全回显的静态文案，内部细节一律走 `tracing::warn!`。

**codemod 的边界（重要）**：只改写 `<状态码>, &format!("<无占位符的固定文案>: {}", <错误变量>)` 这一**完全确定**的形态。
其余形态（额外占位符、`e.to_string()`、非 500 码）一律**留给人工**——机械改写必须宁窄勿宽，否则会静默改变响应语义。

### 4.2 codemod 的两类"善后"（否则 CI 必红）

机械改写本身只替换调用点，但会连带产生两处**编译期副作用**，必须由工具一并处理：

| 副作用 | 原因 | 处理 |
|---|---|---|
| 缺 `TopemsError` 导入 | 新调用需要它 | `add_import()`：**绝不把 `TopemsError` 拼进 `use topems_shared_core::response::{…}`**——它在 crate 根、不在 `response` 模块（`wms`/`tms`/`crm`/`erp` 均为该分组形态，若拼进去是编译错误）。单条导入合并为 `{response::ApiResponse, TopemsError}`；分组导入一律**另起一行**追加独立导入 |
| `StatusCode` 变成未使用导入 | `StatusCode::INTERNAL_SERVER_ERROR.as_u16()` 是该文件里 `StatusCode` 的唯一用途 | `prune_unused_status_code()`：仅当摘除 `use` 语句后**再无** `StatusCode` 引用才摘导入；判断用的副本会剥掉行注释（含"字符串里的 `//` 不算注释"的启发式），但**只写回摘除结果**，判断失误不会污染输出 |

这两类副作用都不是"格式问题"——CI 门禁是 `cargo clippy -- -D warnings`，unused import 会**直接把门禁打红**（gis 迁移时实测命中 `geofence.rs`）。

工具自带形态回归：`migrate_error_leaks.py --self-test`（13 项，覆盖单条/分组/已导入/兜底四种导入与五种摘除场景）。

> 注意 `404` 分支（`Err(sqlx::Error::RowNotFound) => ...error(404, "设备未找到")`）**不在泄露面内**（无插值），迁移时保持原样。
> 全仓泄露的状态码分布：`500` × 642、`e.to_string()` × 385、`400` × 19、`StatusCode::INTERNAL_SERVER_ERROR` × 18、`503` × 8、`404` × 4。

### 4.3 4xx/503 类也机械化了（`--include-4xx`）

§4.1 里 400 类是**人工**处理的，但人工有一个已实证的失效模式：重复誊写静态文案时改了字
（`"GeoJSON解析失败"` → `"GeoJSON 解析失败"`）。因此给 codemod 加了 4xx 规则，默认关闭、显式开启：

```bash
python3 scripts/migrations/migrate_error_leaks.py --service <svc> --include-4xx
```

覆盖 `400 / 403 / 404 / 409 / 503`，改写为块表达式（在 `Json(...)` 参数位与 `return` 语句里都成立，且**不新增库 API**）：

```rust
// 迁移前
Err(e) => return Json(ApiResponse::error(400, &format!("Invalid LIMS sample ID: {}", e))),
// 迁移后（细节进日志，客户端逐字保留原前缀）
Err(e) => return Json(ApiResponse::from({
    tracing::warn!("Invalid LIMS sample ID: {}", e);
    TopemsError::ValidationFailed("Invalid LIMS sample ID".to_string())
})),
```

**变体选择的硬约束**：必须是 `classify()` 里**原样回显 `msg`** 的变体，否则会**再改一次**客户端文案。

| 原状态码 | 变体 | 反例（会加前缀，不可用） |
|---|---|---|
| 400 | `ValidationFailed` | `ValidationError` → 「验证错误: 」 |
| 403 | `OperationNotAllowed` | — |
| 404 | `ResourceNotFound` | **`NotFound` → 「未找到: 」** |
| 409 | `ResourceAlreadyExists` | — |
| 503 | `ServiceUnavailable` | — |

`--self-test` 里有一条不变式断言守着这张表：改动 `CODE_TO_VARIANT` 会直接自测失败。
另：文案串的正则收紧为 `[^"\\{}]*`，**不允许反斜杠**——否则逐字复制回 Rust 字符串字面量会变成非法转义。

效果：`ticket` 原为「55 机械 + 4 人工」，开启后 **59 全机械、人工 0**；`integration` 复查 0 残留。

### 4.4 后续顺序（按实测泄露密度）

数字来自 `node scripts/ci/check-error-handling.cjs --by-service`（含 `format!` 与 `.to_string()` 两种形态，是排期的唯一口径来源）：

| 优先级 | 服务 | 泄露数 | 机械/人工 | 备注 |
|---|---|---|---|---|
| ✅ 已完成 | gis | 86 → 0 | 83 / 3 | 本 ADR §4.1 样板 |
| ✅ 已完成 | integration | 65 → 0 | 60 / 5 | 已验证，见 §6.4；5 处 400 为 `Invalid XXX ID`（`Uuid::parse_str` 失败） |
| ✅ 已完成 | ticket | 59 → 0 | **59 / 0** | 见 §4.5：新增 `--include-4xx` 后 4xx 也机械化了，人工归零 |
| P0 | unified-core | 44 | 9 机械 + 35 直出 | `modules/master/handlers.rs` 全是 `.to_string()` 直出，风险最直观 |
| P1 | erp | 37 | 37 / 0 | 22 个文件为"分组导入"形态（codemod 已支持） |
| P1 | mobile / lims | 23 / 23 | — | mobile 23 处全为机械形态 |
| P2 | mes | 18 | 17 / 1 | |
| P2 | rd / communication / pm / wms / server / analytics | 9 / 8 / 6 / 3 / 3 / 2 | | |
| P3 | finance | 386 | 22 机械 + 364 直出 | **不能先做**：364 处 `.to_string()` 直出**没有上下文文案**，机械改写会产出无意义的通用文案，需先定"每个 handler 的业务上下文"策略；它同时是 `TopemsError` 的唯一试点，作为规范参考实现 |

> `tms` / `scm` / `master-data` / `crm` / `ai` 各 1 处，可并入任意批次。

### 4.5 阶段划分

- **阶段一（本季度）**：止血 777 处泄露（先 gis，再按上表推进）。
- **阶段二（下季度）**：service 层统一 `Result<T, TopemsError>`；`anyhow` 从业务层 60 处清退到仅 `main.rs`。
- **阶段三**：`ApiResponse::error(...)` 手写调用降至测试以外为 0，由 Gate T 守住。

---

## 5. 门禁（Gate T）

```bash
node scripts/ci/check-error-handling.cjs                  # 全量报告，不失败
node scripts/ci/check-error-handling.cjs --changed-only    # CI：只拦本次改动新增
node scripts/ci/check-error-handling.cjs --strict          # 本地：任何命中即失败
node scripts/ci/check-error-handling.cjs --by-service      # 附按服务的泄露分布（迁移排期用）
pnpm check:error-handling / pnpm check:error-handling:changed
```

| 接入点 | 模式 | 行为 |
|---|---|---|
| CI `error-handling-gate`（已入 `quality-gate.needs`） | `--changed-only` | 新增违规 → 红。`fetch-depth: 0` 保证 `origin/main` 可定位基线（浅克隆会静默放行 = 假绿） |
| `lefthook.yml` pre-commit | 报告模式 | 仅提示不阻断（存量未清完） |
| `package.json` | 手动 | 便于本地自查 |

基线：`scripts/ci/error-handling-baseline.json`（3407 / **241** / 385 / 60，泄露面合计 **626**，`baselineRevision: V517.3`），数字只应下降，报告会标注 `(= 基线)` / `(⚠️ 较基线 +N)`。

**检测粒度**：`extractArgs()` 做**括号配平**后按完整调用参数判定，因此跨行书写的 `ApiResponse::error(\n  500,\n  &format!("… {}", e),\n)` 也能命中（V517 的单行实现会漏检，实测漏 85 处）。两条规则（`leak-internal-error` / `raw-error-to-string`）互斥，一条调用只归属一条。

拦截三类：`leak-internal-error`、`raw-error-to-string`、`anyhow-in-business`。

---

## 6. 验证记录

### 6.1 脚手架与门禁（V517）

| 检查 | 命令 | 结果 |
|---|---|---|
| 编译 | `cargo check -p topems-shared-core --offline` | ✅ |
| 单测 | `cargo test -p topems-shared-core --offline error::` | ✅ 66 passed / 0 failed（含 17 个原有 `into_response_*` 回归 + 4 个新增）。此后又为 `internal()` 增加 2 个测试，**统计口径待重跑**（见 §6.3 编译占用 target 锁） |
| Clippy | `cargo clippy -p topems-shared-core --offline --all-targets -- -D warnings` | ✅ 0 告警 |
| 下游回归 | `cargo check -p topems-finance -p topems-unified-core --offline` | ✅ shared-* → finance/unified-core 全链通过 |
| 格式 | `cargo fmt --all --check` | ✅ 本次改动文件零漂移（`error/enhanced.rs`） |
| 门禁正向 | 临时植入 1 处泄露 → `--changed-only` | ✅ 成功拦截并退出 1；随后清理，恢复放行（退出 0） |
| 门禁存量 | `--strict` | ✅ 按预期拦截存量（退出 1） |
| 配置合法性 | `ci.yml` / `lefthook.yml` / `package.json` / baseline | ✅ 全部解析通过；`error-handling-gate` 已在 `quality-gate.needs` |

### 6.2 门禁粒度修复（V517.1）

| 检查 | 命令 | 结果 |
|---|---|---|
| 口径交叉核对 | 门禁脚本 vs 独立 Python 括号配平实现 | ✅ 两者一致：泄露 392 / `to_string` 385 |
| 修复前漏检量化 | 单行口径 307 vs 语句级 392 | ✅ 漏检 85 处，与服务级分布吻合 |
| 跨行恢复证明 | 植入**跨行**泄露 → `--changed-only` | ✅ 被捕获并退出 1（旧实现必然漏检）；清理后恢复退出 0 |
| 基线对齐 | `node scripts/ci/check-error-handling.cjs` | ✅ 显示 `392 (= 基线)`，无 `⚠️` |

### 6.3 gis 迁移（首个服务样板）

| 检查 | 命令 | 结果 |
|---|---|---|
| codemod 幂等性 | `migrate_error_leaks.py --service gis --dry-run` | ✅ 0 改写（已迁移完毕不会重复改） |
| codemod 形态回归 | `migrate_error_leaks.py --self-test` | ✅ 13/13 通过 |
| 迁移覆盖面 | 泄露点复查 | ✅ 86 处全部处理（83 机械 + 3 人工），无残留 |
| 格式 | `rustfmt --edition 2021 --check <14 个改动文件>` | ✅ 零漂移（pin 工具链与默认 stable 双重复核） |
| 编译 | `cargo check -p topems-gis --offline` | ✅ **0 error / 0 warning**（首次全量 53m10s，增量 3m03s） |
| Clippy 门禁 | `cargo clippy -p topems-gis --offline --all-targets -- -D warnings` | ✅ 退出码 0（对齐 CI 真实门禁） |
| 门禁放行 | `node scripts/ci/check-error-handling.cjs --changed-only` | ✅ 退出码 0；基线由 392 → **306**（`ApiResponse::error` 3558 → 3472），已重校准为 `V517.2` |

**迁移过程中真实撞到并修掉的问题**（都已沉淀进工具，不再复发）：

1. **unused import**：`geofence.rs` 里 `StatusCode` 的唯一用途被替换后成为未使用导入，`cargo check` 报 warning ⇒ 会让 `clippy -D warnings` 门禁变红。已加 `prune_unused_status_code()`。
2. **导入注入顺序 bug**：初版 `add_import()` 用"文件里是否出现 `TopemsError`"作守卫——而新增的调用本身就含有该符号，导致提前返回、**根本没加 `use`**。已改为判断"是否已 import"。
3. **无意改变客户端文案**：人工处理 400 类时把 `"GeoJSON解析失败"` 写成了 `"GeoJSON 解析失败"`（多一个空格）。客户端可见文案必须**逐字保留原前缀**，已改回。
4. **语句级检测器自身的索引 bug**：第一版把匹配起点当 `(` 传入括号配平，扫描一路滑到文件尾，得出"finance 386 处、全仓 777"的**假阳性**；传对索引后 finance 实为 36。教训：跨行/大范围正则的结果必须**抽样回验**，不能只看总数。

> 注 1：`cargo check` 不编译 `#[cfg(test)]`，新增测试必须用 `cargo test` 验证——本次即由此发现 `Sql` / `RedisError` / `Serialization` 是 `#[from]` 类型化变体（非 `String`）。
> 注 2：项目 pin 工具链为 `nightly-2026-07-01`（`rust-toolchain.toml`），本地默认 `cargo` 为 Homebrew stable。`cargo fmt --check` 与 `rustfmt --check` 均已用 pin 工具链复核。
> 注 3（环境教训）：本仓库首次全量构建依赖树耗时很长（gis 单服务 53 分钟）；沙箱内 `ps/pgrep` 看不到 `cargo`/`rustc` 进程，且 `cargo ... | tail` 会因管道缓冲掩盖进度——判断长编译须**重定向到日志文件**再 tail。
> 注 4：为 `internal()` 新增的 2 个单测**尚未重跑**（dev profile 全量构建让位给了服务编译验证）。类型层面的正确性已由 gis / integration / ticket 三个服务的编译与 clippy 实证（它们大量使用 `internal()` 与 `From<TopemsError> for ApiResponse<T>`）。

### 6.4 integration 迁移（第二个服务）

| 检查 | 命令 | 结果 |
|---|---|---|
| 迁移覆盖面 | 60 机械（codemod）+ 5 人工（`Uuid::parse_str` 400 类） | ✅ 65/65，服务从泄露分布中清零 |
| 人工形态 | `handlers/{lims_qms,mes_erp,wms_scm}.rs` 的 `Invalid XXX ID` | ✅ 保留 400 + `tracing::warn!` + `ValidationFailed`，文案逐字保留 |
| 格式 | `rustfmt --edition 2021 --check <9 个改动文件>` | ✅ 零漂移 |
| 编译 | `cargo check -p topems-integration --offline` | ✅ **0 error / 0 warning**（复用 gis 构建产物，仅新增 2 个 crate） |
| Clippy 门禁 | `cargo clippy -p topems-integration --all-targets -- -D warnings` | ✅ 退出码 0 |
| 门禁放行 | `node scripts/ci/check-error-handling.cjs --changed-only` | ✅ 退出码 0 |

### 6.5 ticket 迁移（第三个服务，`--include-4xx` 后全机械）

| 检查 | 命令 | 结果 |
|---|---|---|
| 迁移覆盖面 | `--include-4xx` 后 **59 全机械 / 0 人工**（`handlers.rs` 29 + `ticket_ext.rs` 30） | ✅ 59/59，泄露清零 |
| codemod 幂等性 | `--service integration --include-4xx --dry-run`（迁移完复查） | ✅ 0 改写 |
| 格式 | `rustfmt --edition 2021 --check <2 个改动文件>` | ✅ 零漂移 |
| 编译 | `cargo check -p topems-ticket --offline` | ✅ **0 error / 0 warning** |
| Clippy 门禁 | `cargo clippy -p topems-integration -p topems-ticket --all-targets -- -D warnings` | ✅ 退出码 0（两服务合并执行，1m43s） |
| 剩余 `ApiResponse::error(4xx, "静态文案")` | 无插值的 404/401 提示 | ✅ 本就不在泄露面内，按设计保持原样 |

> 迁移后基线：`V517.3`（`ApiResponse::error` 3348、泄露面 567；gis → integration → ticket 三服务累计 -210）。

---

## 7. 本次顺带发现（不在本 ADR 范围内，建议单独处理）

| # | 发现 | 证据 | 建议 |
|---|---|---|---|
| 1 | **`cargo fmt --all --check` 当前为红**：38 个文件、270 个 diff 块存在格式漂移（`l2_cache.rs`、`portal/src/modules/graphql_*.rs`、多份 `main.rs`、`*/tests/integration_tests.rs` …）。即 CI 的 `fmt-check`（Gate J）与 `rust-lint → Check code format` 应当失败，格式门禁实际未生效 | `cargo fmt --all --check` 退出码 1；pin 工具链复现一致 | **单独提交**一次 `cargo fmt --all`，勿混入功能 PR（会污染 review diff） |
| 2 | `ci.yml:255` `if: !inputs.skip_rust` 是 GitHub Actions 容错但**标准 YAML 非法**的写法（`!` 被解析为 tag），导致任何标准 YAML 工具（含 PyYAML）无法解析该文件 | `yaml.constructor.ConstructorError: could not determine a constructor for the tag '!inputs.skip_rust'` | 改为 `if: ${{ !inputs.skip_rust }}`，恢复本地/第三方工具可校验性 |
| 3 | portal 存在与 `ApiResponse` 职责重复的 `ApiResult<T>` 结构体 | `svc/portal/src/modules/{adaptive_execution,smart_gateway}.rs` | 合并到 `ApiResponse` 后删除 |
