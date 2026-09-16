---
name: migrate-error-leaks
description: 把某个 Rust 服务的"错误细节泄露"迁移到统一错误出口（TopemsError）并让 CI 门禁保持全绿。当需要推进 docs/architecture/unified-error-handling-decision.md 里 V517 的存量迁移、或处理 `ApiResponse::error(500, &format!("...: {}", e))` / `&e.to_string()` 这类泄露形态时使用。
---

# 迁移单个服务的错误泄露（V517 / Gate T）

## 适用场景

推进 `docs/architecture/unified-error-handling-decision.md` 的存量迁移：把
`ApiResponse::error(<码>, &format!("<文案>: {}", e))` 与 `ApiResponse::error(<码>, &e.to_string())`
改为 `TopemsError` 出口，同时保证 CI 不红。

未迁移服务清单与数量：`node scripts/ci/check-error-handling.cjs --by-service`。

## 一道命令起步（先看，再改）

```bash
python3 scripts/migrations/migrate_error_leaks.py --service <svc> --dry-run                     # 仅 500 形态
python3 scripts/migrations/migrate_error_leaks.py --service <svc> --include-4xx --dry-run       # 500 + 4xx/503 形态（推荐）
```

输出分两部分：**可机械改写**数（含文件清单）与**需人工判断**数（含行号与原文）。
不要跳过 dry-run 直接改——机械形态占多数，人工形态每处都要单独决策。

`--include-4xx` 覆盖 `400/403/404/409/503` 的泄露点，按 ADR §4.1 既定策略处理（保留原状态码、
客户端回逐字静态文案、细节进 `tracing::warn!`）。**建议默认开启**：实测它把 `ticket` 的
"55 机械 + 4 人工"变成 **59 全机械**，且文案从前缀逐字复制——人工重打曾把
`"GeoJSON解析失败"` 打成 `"GeoJSON 解析失败"`（多一空格），那是在改客户端可见文案。

## 固定流程（顺序不可换）

```bash
# 1. 机械改写（幂等，可重复执行；写盘后自带 rustfmt 收尾）
python3 scripts/migrations/migrate_error_leaks.py --service <svc> --include-4xx

# 2. 人工形态：逐处处理（工具已覆盖 500 形态、4xx 形态、to_string 直出；剩余多是含额外占位符的 format!）
# 3. 编译（首次会全量构建依赖树，很慢；见下方"环境陷阱"）
SQLX_OFFLINE=true cargo check -p topems-<svc> --offline
# 4. CI 真实门禁（unused import 会在这里红，不在 check 里红）
SQLX_OFFLINE=true cargo clippy -p topems-<svc> --offline --all-targets -- -D warnings
# 5. 格式（本项目 pin nightly，见"环境陷阱"；工具已自动收尾，这步是复核）
rustup run nightly-2026-07-01 rustfmt --edition 2021 --check $(git diff --name-only -- 'svc/<svc>' | grep '\.rs$')
# 6. 门禁必须放行
node scripts/ci/check-error-handling.cjs --changed-only   # 退出码必须 0
# 7. 重校准基线：改 leakInternalError / apiResponseErrorTotal / leakSurfaceTotal / leakByService，
#    并追加一条 baselineHistory（bump baselineRevision）
```

## 改写形态对照

| 原形态 | 改后 | 说明 |
|---|---|---|
| `error(500, &format!("查询失败: {}", e))` | `ApiResponse::from(TopemsError::internal("查询失败", e))` | 状态码恒 500，语义不变；上下文进日志 |
| `error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), &format!(...))` | 同上 | 与 500 等价，codemod 自动处理 |
| `error(500, &e.to_string())` | `ApiResponse::from(TopemsError::internal("<所在函数名>", e))` | 无上下文文案，用**所在函数名**做日志上下文；客户端从"原始错误直出"变为通用文案，正是迁移目的 |
| `error(400, &format!("Invalid X ID: {}", e))` | 见下方"4xx 块的形状" | `--include-4xx` 自动处理 |

### to_string 直出形态（unified-core 35 处 / finance 364 处）

形态统一为 `Err(e) => Json(ApiResponse::error(500, &e.to_string()))`，**可以机械化**：
上下文取调用点之前最近的 `fn` / `async fn` 名（`enclosing_fn_name()`），只进日志；
找不到所在函数时退回人工清单（宁窄勿宽）。这样 `finance` 的 364 处不再是"必须先定文案"的阻塞项——
它和别的服务一样机械可迁。若日后要给客户端可见文案分域，那是在此之上的一层，不影响本次去泄露。

### 4xx 块的形状

```rust
Err(e) => Json(ApiResponse::from({
    tracing::warn!("Invalid X ID: {}", e);
    TopemsError::ValidationFailed("Invalid X ID".to_string())
})),
```

用块表达式而非两条语句，是为了在 `Json(...)` 参数位与 `return` 语句两种上下文里都成立，
同时**不新增库 API**。缩进按调用点行首空白计算（内层 +4）。

> ⚠️ **不要依赖"emitted 即 rustfmt 规范输出"**：这只对**短行**成立。函数名较长或缩进较深时
> 单行形态会超过 100 列，rustfmt 会折行（`unified-core` 的
> `TopemsError::internal("list_documents", e)` 即被判漂移）。工具现在写盘后自动调用 pin 工具链
> rustfmt 收尾（`--no-format` 可关）；手工改动的行务必自己跑一次 `rustfmt --edition 2021 <文件>`。
> 别尝试复刻 rustfmt 的折行启发式，直接调它。

**变体选择的硬约束**：必须选 `classify()` 里**原样回显 `msg`** 的变体，否则会改变客户端文案。

| 原状态码 | 变体 | 反例 |
|---|---|---|
| 400 | `ValidationFailed` | `ValidationError` 会加「验证错误: 」前缀 |
| 403 | `OperationNotAllowed` | — |
| 404 | `ResourceNotFound` | **`NotFound` 会加「未找到: 」前缀**，不可用 |
| 409 | `ResourceAlreadyExists` | — |
| 503 | `ServiceUnavailable` | — |

工具 `--self-test` 里有一条不变式断言守着这张表：改动 `CODE_TO_VARIANT` 会直接自测失败。

## 人工形态的判断规则

- **`format!` 串含额外占位符**（如 `format!("{} 失败: {}", id, e)`）：不动，人工定文案。
- **非 500/4xx 状态码**或状态码是变量表达式：不动，人工判断。
- 若确实遇到 4xx 但想手改：在调用点显式 `tracing::warn!`，再用上表的变体表达原语义。
  **不要为此新增枚举变体**——`TopemsError` 已有 40+ 变体，其中一组是重复的"兼容性别名"。

## 环境陷阱（都真实踩过）

1. **首次编译极慢**：单服务首次 `cargo check` 实测 53 分钟（全量依赖树）。用后台任务跑，
   **重定向到日志文件**再 tail；`cargo ... | tail` 的管道缓冲会让你看不到进度，
   沙箱内 `ps`/`pgrep` 也看不到 cargo/rustc 进程。判据：`grep -E "^    Finished|^error"`。
2. **工具链不一致会伪造格式漂移**：本地默认 `cargo` 是 Homebrew stable，项目 pin
   `nightly-2026-07-01`（`rust-toolchain.toml`）。判断格式必须用 `rustup run nightly-2026-07-01`。
   另注：`cargo fmt --all --check` 全仓当前是红的（38 文件存量漂移），所以只校验**本次改动文件**。
3. **改文件前先查该文件是否在存量 fmt 漂移名单里**。若在，rustfmt 重排会把无关格式改动混进
   迁移 diff；不在名单里才可以直接跑 rustfmt。
4. **`cargo check` 不编译 `#[cfg(test)]`**：动了测试要另跑 `cargo test` 才算验证。
5. **只在 Bash 里用 `&` 派生的子进程会随本轮结束被回收**，长任务必须用受管后台任务。
6. **cargo 会串行争 target 锁**：另一个 `cargo` 在跑时，后续命令会停在
   `Blocking waiting for file lock on build directory`——日志一行不涨，看起来像"卡死"。
   队列里的任务会在锁释放后自动继续，别误判为失败而重启（重启后仍要重新排队）。
   把多个 crate 合成**一次** `cargo clippy -p a -p b` 比排两次队更快。
7. **`cargo test` 与 `cargo check`/`clippy` 是两套产物**（dev vs check profile），
   首次跑测试会再全量编译一遍 dev profile（实测 30+ 分钟）。别在等编译时误以为任务死了。
8. **编译进行中，别的小命令也可能被 SIGTERM（退出码 137）**：`cargo check` 跑着时，Python 的
   `os.walk` 或批量 grep 会被沙箱直接杀掉，看起来像"脚本坏了"——其实脚本没变。等编译结束再跑，
   或改用更轻的核验方式（如对目标文件 `grep -c` 单点计数）。

## 易错点（codemod 已代劳，但要知道为什么）

- **`TopemsError` 在 crate 根，不在 `response` 模块**。绝不能拼进
  `use topems_shared_core::response::{…}`（`wms`/`tms`/`crm`/`erp` 都是这个分组形态，拼进去就是编译错误）。
- **摘 `StatusCode` 孤儿导入**：`StatusCode::INTERNAL_SERVER_ERROR.as_u16()` 常是该文件里
  `StatusCode` 的唯一用途，替换后导入变成 unused ⇒ `clippy -D warnings` 直接红。
- 工具自带形态回归：`migrate_error_leaks.py --self-test`（改工具后必跑）。

## 进度（每迁完一个就更新这里）

| 服务 | 原泄露 | 机械/人工 | 状态 |
|---|---|---|---|
| gis | 86 | 83 / 3 | ✅ 已验证（clippy 0，基线 V517.2） |
| integration | 65 | 60 / 5 | ✅ 已验证（clippy 0，基线 V517.3） |
| ticket | 59 | 59 / 0 | ✅ 已验证（`--include-4xx` 后全机械，clippy 0） |
| unified-core | 44 | 44 / 0 | 🔄 已改写（9 处 format! + 35 处 to_string 直出），待 clippy 验证 |

> 经验：`cargo check`/`clippy` 的依赖产物**可跨服务复用**（gis 全量 53min 之后，
> > integration+ticket 的 check 只新增 2 个 crate、clippy 仅 1m43s）——首服务最贵，后面很快。

**关键修正**：`e.to_string()` 直出形态已机械化（见 §"to_string 直出形态"），
`finance`（386）不再是"特殊服务"，可作为普通批次推进。

剩余按 `--by-service` 排序推进：erp 37 → mobile 23 / lims 23 → mes 18 → rd 9 → communication 8 → pm 6 → 其余个位数服务 → finance 386。

## 收尾

迁移完一个服务就把基线数字降下来并 bump revision，否则报告会一直显示"✅ 较基线 -N"，
失去"数字只应下降"的告警意义。
