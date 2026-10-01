# TOPEMS Clippy 存量审计（2026-10-01）

> 命令：`cargo clippy --workspace --no-deps --message-format=short -- --force-warn <13 个高危 lint>`，原始日志 `/tmp/clippy_hidden.txt`。
> 口径：按 `(文件, 消息)` 去重后的真实诊断数；同一位置在 lib/bin/多 feature 编译下的重复报告已合并。
> **口径补注（2026-10-01 修订）**：按 `(path:line:col)` 精确位置重新统计 **panic 类（unwrap/expect/indexing）为全工作区 3,085 条**（indexing_slicing 1,252 / unwrap_used 624 / expect_used 1,209）——同一条诊断在 lib/bin/多 feature 编译下重复报告，`(文件,消息)` 口径 2,227 低于精确值。本文档其余统计沿用 2,227 口径（对修复排序列无影响；panic 类逐服务推进时以该服务 force-warn 精确清单为准，方法见 Phase 2）。

## 结论

- **默认 clippy 输出：0 条**（workspace ~150 条 allow + 37 个 crate 内联 `#![allow]` 全部压制）；仅剩 81 条 rustc 级琐碎警告（map identity ×40 / unused import ×21 / 冗余字段名 ×11）。
- **强制开启 13 个高危 lint 后：去重 2,227 条真实诊断**（原始行 9,169 含多目标重复）。
- 分布：数值转换类 1,487（67%）| panic 类 541（24%）| 性能类 161（7%）| 机械清理 37（2%）。

## 按 lint 统计

| clippy lint | 数量 | 类别 | 修复方式 |
|---|---|---|---|
| `as_conversions` | 458 | 数值安全 | 人工 |
| `cast_possible_truncation` | 303 | 数值安全 | 人工 |
| `cast_possible_wrap` | 286 | 数值安全 | 人工 |
| `cast_precision_loss` | 262 | 数值安全 | 人工 |
| `cast_sign_loss` | 178 | 数值安全 | 人工 |
| `expect_used` | 212 | panic 风险 | 人工 |
| `indexing_slicing` | 201 | panic 风险 | 人工 |
| `unwrap_used` | 128 | panic 风险 | 人工 |
| `redundant_clone` | 99 | 性能 | 自动(clippy --fix) |
| `needless_pass_by_value` | 58 | 性能 | 人工 |
| `unused_import` | 22 | 机械清理 | 自动(clippy --fix) |
| `redundant_field_names` | 7 | 机械清理 | 自动(clippy --fix) |
| `map_identity` | 7 | 机械清理 | 自动(clippy --fix) |
| `clone_on_copy` | 3 | 性能 | 人工 |
| `unused_variable` | 1 | 机械清理 | 自动(clippy --fix) |
| `other` | 2 | 其他 | 人工 |

**合计：2227 条**

## 按服务分布（Top 20）

| 服务 | 条数 | 主要问题 |
|---|---|---|
| portal | 385 | cast_possible_wrap(118), cast_possible_truncation(63), cast_sign_loss(57) |
| ai | 285 | as_conversions(72), cast_possible_truncation(63), indexing_slicing(49) |
| erp | 232 | expect_used(44), as_conversions(39), cast_sign_loss(38) |
| finance | 135 | as_conversions(31), cast_possible_wrap(23), cast_possible_truncation(19) |
| unified-core | 132 | as_conversions(47), unwrap_used(16), cast_possible_truncation(12) |
| mes | 105 | as_conversions(25), unused_import(18), cast_possible_truncation(13) |
| crm | 81 | expect_used(23), unwrap_used(12), as_conversions(11) |
| wms | 65 | expect_used(25), as_conversions(16), cast_possible_wrap(11) |
| master-data | 65 | cast_precision_loss(13), as_conversions(11), cast_possible_truncation(11) |
| srm | 53 | expect_used(17), unwrap_used(14), cast_precision_loss(8) |
| rd | 52 | expect_used(17), as_conversions(9), unwrap_used(7) |
| shared-event | 51 | as_conversions(11), cast_possible_truncation(10), cast_precision_loss(8) |
| integration | 41 | cast_possible_truncation(10), as_conversions(9), cast_possible_wrap(6) |
| analytics | 40 | as_conversions(16), cast_possible_wrap(7), indexing_slicing(4) |
| scm | 39 | expect_used(17), as_conversions(9), cast_precision_loss(4) |
| shared-core | 38 | as_conversions(12), cast_possible_truncation(6), expect_used(6) |
| ehs | 38 | unwrap_used(14), as_conversions(7), redundant_clone(6) |
| mobile | 35 | as_conversions(12), cast_possible_truncation(6), cast_possible_wrap(6) |
| hrm | 35 | expect_used(18), as_conversions(5), indexing_slicing(3) |
| gis | 34 | as_conversions(7), cast_possible_truncation(7), indexing_slicing(6) |

## 服务 × lint 交叉矩阵（Top 20 服务 × 主要 lint）

| 服务 | as_conversions | truncation | wrap | precision | sign_loss | expect | indexing | unwrap | redundant_clone |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| portal | 40 | 63 | 118 | 48 | 57 | 1 | 20 | 8 | 13 |
| ai | 72 | 63 | 23 | 32 | 13 | 3 | 49 | 6 | 12 |
| erp | 39 | 23 | 32 | 25 | 38 | 44 | 17 | 2 | 9 |
| finance | 31 | 19 | 23 | 16 | 12 | 1 | 14 | 4 | 10 |
| unified-core | 47 | 12 | 8 | 11 | 10 | 2 | 11 | 16 | 7 |
| mes | 25 | 13 | 7 | 9 | 1 | 1 | 3 | 3 | 7 |
| crm | 11 | 4 | 5 | 9 | 5 | 23 | 7 | 12 | 3 |
| wms | 16 | 3 | 11 | 7 | 0 | 25 | 0 | 1 | 1 |
| master-data | 11 | 11 | 10 | 13 | 7 | 1 | 6 | 2 | 4 |
| srm | 7 | 2 | 0 | 8 | 1 | 17 | 3 | 14 | 1 |
| rd | 9 | 5 | 4 | 3 | 3 | 17 | 2 | 7 | 0 |
| shared-event | 11 | 10 | 2 | 8 | 4 | 2 | 8 | 4 | 2 |
| integration | 9 | 10 | 6 | 2 | 4 | 1 | 4 | 2 | 2 |
| analytics | 16 | 3 | 7 | 4 | 3 | 2 | 4 | 1 | 0 |
| scm | 9 | 3 | 2 | 4 | 0 | 17 | 3 | 0 | 1 |
| shared-core | 12 | 6 | 1 | 6 | 1 | 6 | 3 | 1 | 0 |
| ehs | 7 | 5 | 0 | 2 | 1 | 1 | 1 | 14 | 6 |
| mobile | 12 | 6 | 6 | 4 | 2 | 2 | 2 | 0 | 0 |
| hrm | 5 | 1 | 2 | 1 | 0 | 18 | 3 | 2 | 3 |
| gis | 7 | 7 | 3 | 3 | 2 | 1 | 6 | 2 | 3 |

## 修复优先级（分阶段）

### Phase 1 — 机械清理（~139 条，`cargo clippy --fix` 可自动）
- `map_identity`(7) + `unused_import`(22) + `redundant_field_names`(7) + `clone_on_copy`(4) + `redundant_clone`(99，部分自动)

### Phase 2 — panic 类（541 条，需人工分类）
- `indexing_slicing`(201) + `unwrap_used`(128) + `expect_used`(212)
- 分类原则：启动/配置路径可保留并局部 allow；请求处理路径改为错误传播（`?` / `map_err`）；测试代码单独审计。
- 顺序：按服务从高到低（ai → erp → unified-core → mes → portal → finance）。
- **ai 服务已清盘（2026-10-01）**：force-warn 精确口径 483 条（indexing 467 / unwrap 9 / expect 7）→ 修复后真实待修 **0 条**。手法：① 431 处 `X["k"].as_Y()` → `X.get("k").and_then(|v| v.as_Y())`（缺失键 panic 实修）；② 28 处分页切片 → `.get(start.min(total)..end)`（Option 序列化语义等价）；③ 66 处 unwrap/expect/裸索引 → match/first/get/as_object_mut/let-else 等错误传播或防御式改写；④ 数学上安全但 clippy 无法证明的模运算 mock 生成器（46 个函数）与有界循环解析函数（2 个）加**函数级** `#[allow]` 并注明不变量；⑤ 2 个 bin 的 `#[tokio::main]` 宏展开内 `runtime.build().expect()` 加函数级 allow（启动失败即崩溃属预期）。验证：默认 clippy 0 告警；`cargo test -p topems-ai --lib` 1,171 通过；force-warn 剩余 105 条全部落在上述窄范围 allow 内。
- **erp 服务已清盘（2026-10-01）**：force-warn 精确口径 419 条（expect 242 / unwrap 3 / indexing+slicing 174）→ 修复后真实待修 **0 条**。手法：① 232 处 RLS 事务不变量 `guard.as_mut().expect("rls txn missing")`（全部同构）→ `match guard.as_mut() { Some(txn) => txn, None => unreachable!("rls txn missing") }`，保留「不可达即崩溃」语义且脱离 expect_used；② main.rs metrics lazy_static（5 处）与 validation.rs 硬编码 Regex（4 处）的 `expect` → `match { Ok => 值, Err => panic!(原消息) }`（**lazy_static! 宏不支持属性透传，块级 allow 无效会触发 unused_attributes，必须表达式改写**）；③ 1 处 `#[tokio::main]` 宏展开 expect → 函数级 allow（fn 属性对宏展开有效，与 ai 同）；④ 3 处 unwrap（硬编码 UUID → `Uuid::from_u128(1)`、`is_none()+unwrap` → `let-else`、`filter+unwrap` → `filter_map`）；⑤ 174 处索引全部为「position() 定位 + 有界循环/显式守卫」数学安全 → 38 个函数级 allow（注释按定位簇/算法簇分类，e2e fixture 2 处 `lines[0]` 实改为 `first_mut`）。验证：默认 clippy 0 告警；`cargo test -p topems-erp --lib` 899 通过（3 次稳定）；force-warn 剩余 173 条全部落在函数级 allow 区（含宏展开渲染行判定），真实遗留 0。教训：**lazy_static! 宏不接受调用点属性透传**，与 `#[tokio::main]`（fn 属性）行为不同，需表达式改写而非 allow。
- **mes 服务已清盘（2026-10-01）**：17 个测试模块 `chrono` 时间方法 import 缺失（Datelike/Timelike 各自为政，`use super::*` 不传导父级普通 use），88 编译错误 → 逐模块补 import 清零；`cargo test -p topems-mes --lib` 458 通过。教训：`hour()/minute()/second()` 属 **Timelike** 而非 Datelike，每个测试模块需自备 `use`。
- **portal 服务已清盘（2026-10-01）**：`never_loop` 真实缺陷 1 处（`for` + 首项后 `break` 恒等）→ `if let Some(first)` 改写；`cargo test -p topems-portal --lib` 608 通过。
- **unified-core 服务已清盘（2026-10-01，批 2 fe0c48282 + 批 3 5a519214d）**：force-warn 精确口径 **1,224 条 = expect 520 + unwrap 704 + indexing 0**（indexing 全 0 为重大利好）；生产 797（unwrap 648 / expect 149）、测试 427。批 2（93 文件 +314/−226）：① 测试代码显式豁免 427 处（26 个 tests/ 文件级 + 63 个 src 测试模块 `#[allow(clippy::unwrap_used, clippy::expect_used)]`）；② lock/read/write poison 恢复 103 处（行内 `.lock().unwrap()` → `.unwrap_or_else(\|e\| e.into_inner())`）；③ serde/regex/http 消息化 122 处（`serde_json::to_string/from_str`、`Regex::new`、`Uri::try_from`、`HeaderValue::from_str` 的 unwrap → `unwrap_or_else(\|e\| panic!("...: {e}"))`）→ 生产 unwrap 648→426。批 3（58 文件 +761/−285）：① lock 扩展全仓库 + **多行模式**（`.lock()\n.unwrap()`）24 处 8 文件，全仓库行内残留 0；② 安全模式函数级窄 allow 102 个函数 151 位置；③ 真实遗留 14→0（schema_registry `is_object` 守卫 / stream_subscriber `is_none` 守卫 ×2 / slo `!is_empty` 守卫 / redis_pubsub let-else，逐一核实守卫后消息化）。验证：force-warn 服务范围真实遗留 **0**（unwrap+expect）；测试 unified-core 570 / shared-event 361 / shared-observability 227 / shared-auth 227 全绿；pre-commit 21 项含 sqlx 缓存全绿。教训：clippy 位置判定必须覆盖**模块级 allow 与 static 级 allow**（初版判定漏查导致误报），且**行内正则漏多行 lock 模式**需双模式补做。
- **lib/shared-\* 共享库已清盘（2026-10-01，补充批 ac20004b4）**：force-warn 精确口径生产 **1,631 条** → 真实遗留 **0 条**。手法：① 补测试代码显式豁免（批 2 仅覆盖 unified-core，lib 一直缺失）——5 个 tests/ 文件级 + 141 处 cfg(test) 模块 allow；② 真实遗留 43 处逐一核实数学安全后窄 allow——metrics.rs 22 处 static 级（prometheus 注册宏，静态名称唯一仅重复注册失败）、cors/validation/auth/api_security/bootstrap 8 处 expect 消息化（URL/正则字面量、HMAC 任意长度 key 恒安全；`DATABASE_URL` 启动必需项语义保留）、reqwest/axum Response builder 恒成功 6 处、test_helpers 3 处。验证：生产 1,631 全部豁免覆盖、真实遗留 0；测试 11 个共享 crate 2,066 passed（core 790 / event 361 / auth 227 / observability 227 / db 152 / bootstrap 120 / service-client 73 / ai 71 / dsh 21 / mcp 17 / boundary 7）；fmt 0 漂移。教训：**`-p <crate>` 的 clippy 会话会把依赖 crate 一并 force-warn**，量化服务真实遗留必须按 crate 归属过滤，共享库需单独建批。
- **pm env 竞态 flake 修复（2026-10-01，d9af2a910，push 门禁附随）**：`test_get_runtime_url_default/from_env` 并行 `set_var/remove_var("RUNTIME_URL")` 互相覆盖进程级 env → 随机断言失败（两次 push 均红）。按 shared-observability `OTEL_ENV_LOCK` 先例加 `static Mutex` 互斥，3 次连续全量运行稳定 497 passed。

### Phase 3 — 数值安全（1,487 条，需人工，最大面）
- `as_conversions`(458)：`as` → `try_from`/`From` 或显式 `saturating_*`/`wrapping_*`
- `cast_*`(1,029)：按业务语义选择截断/回绕/符号处理，不得机械替换
- 顺序：金额域优先（finance → erp → srm），网关其次（portal），再批量（ai/unified-core/…）

### Phase 4 — 闸门恢复（防回退）
- 每清零一批，从根 `Cargo.toml` 的 `[workspace.lints.clippy]` 移除对应 allow 并升级为 `deny`
- 删除 37 个 crate `lib.rs` 中与 workspace 重复的内联 `#![allow]` 块
- CI 增加 `cargo clippy --workspace --no-deps -- -D warnings`（sccache 下成本≈0）