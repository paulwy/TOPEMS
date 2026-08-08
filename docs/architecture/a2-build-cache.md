# A2 瘦身后续：Build Cache 优化与覆盖率策略

> 版本：V68.1 A2 | 日期：2026-08-09 | 适用：TOPEMS Rust 微服务 monorepo

## 1. 3 层 Build Cache 结构

TOPEMS 采用三层递进式缓存架构，兼顾跨分支复用、单服务独立构建、工作区增量编译三个维度：

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Fingerprint 增量 (仅 workspace 级)                 │
│  ├─ 机制：Cargo 内置 fingerprint + target/debug/incremental  │
│  ├─ 范围：单次 session 内文件级增量，~30s → ~3s              │
│  └─ 限制：跨分支/跨机器失效，CI 环境需谨慎启用               │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Crate 级 target/deps (独立服务粒度)                │
│  ├─ 机制：target/debug/deps 中 .rlib/.rmeta 复用             │
│  ├─ 范围：单 crate 构建，-p <crate> 时命中                   │
│  └─ 效果：冷→热构建 5~10× 加速，服务独立发布场景核心         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: sccache + Registry 共享 (全局跨 workspace)         │
│  ├─ 机制：~/.cache/sccache 磁盘缓存 / S3 / GCS               │
│  ├─ 范围：跨分支、跨版本、跨 workspace 复用 rustc 产物        │
│  └─ 效果：命中 40~70%，全量冷构建 15min → 4~6min             │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Layer 1：sccache + Registry 共享

**配置位置**：`.cargo/config.toml:11-18`

```toml
[build]
rustc-wrapper = "sccache"

[registries.crates-io]
protocol = "sparse"
```

**环境变量**（CI 必设，`.github/workflows/ci.yml:47-60` 已配置）：

| 变量 | 值 | 说明 |
|------|----|------|
| `RUSTC_WRAPPER` | `sccache` | 启用 sccache（与 config.toml 双保险） |
| `SCCACHE_DIR` | `${{ github.workspace }}/.sccache` | sccache 本地缓存目录（与 rust-cache 同路径） |
| `SCCACHE_CACHE_SIZE` | `50G` | 单实例缓存上限（默认 10G 对 monorepo 约 1 周即满） |
| `CARGO_REGISTRIES_CRATES_IO_PROTOCOL` | `sparse` | 稀疏注册中心（`.cargo/config.toml` 已配置，此为兜底） |
| `CARGO_INCREMENTAL` | `0` | CI **禁用**增量编译（见 §1.3） |

**CI 缓存落地（推荐方案：`Swatinem/rust-cache` + `mozilla-actions/sccache-action` 组合）**：

TOPEMS CI 已采用业界主流的"动作组合"方案，而非手写 `actions/cache` 管理 sccache 目录：

```yaml
# 1. 安装+启动 sccache 服务端（负责 RUSTC_WRAPPER 对接，自动管理缓存生命周期）
- uses: mozilla-actions/sccache-action@v0.0.9

# 2. rust-cache 统一管理 registry + target/ + sccache dir（按 toolchain 前缀分桶）
- uses: Swatinem/rust-cache@v2
  with:
    # 按 job 类型分桶（lint/test/audit 各自独立 bucket，互不污染）
    prefix-key: "rust-lint-nightly-2026-07-01"
```

**为什么不用手写 `key: sccache-xxx`**：
- `Swatinem/rust-cache` 已内置 Cargo.lock hash + CARGO_HOME + target/ 的联合缓存，同时兼容 `SCCACHE_DIR` 落在 workspace 内的场景（TOPEMS 设为 `.sccache/`，会被 `rust-cache` 一并保存/恢复）。
- 对 nightly 工具链敏感的项目，`prefix-key` 附带 toolchain 版本能避免"稳定版 ↔  nightly"之间缓存串桶导致的 ICE。

### 1.2 Layer 2：Crate 级 target/deps

**核心实践**：使用 `cargo check -p <crate>` 而非全 workspace check，让 CI/CD 按服务独立构建时充分命中 deps 层。

**适用场景**：
- 单服务 PR 仅改动 `svc/monitor/**` → 只构建 `topems-monitor`
- 预发环境灰度发布 → 仅重构建受影响 crate
- lib 改动后级联检查 → `--workspace` 退化为 Layer 3

### 1.3 Layer 3：Fingerprint 增量（仅 workspace 本地开发）

**⚠️ CI 默认禁用**（见 2.1 节 `CARGO_INCREMENTAL=0`），原因：
- CI 每次是干净环境，增量目录 restore 时间 > 重编时间
- fingerprint 对 mtime 敏感，restore 后易大面积失效

**本地开发启用**（workspace Cargo.toml 已默认 `incremental = true`）。

---

## 2. CI 变量与 Profile 规范

### 2.1 CI 环境变量（`.github/workflows/ci.yml` 必设）

```bash
# 增量编译：CI 禁用，避免 fingerprint 陷阱
export CARGO_INCREMENTAL=0

# Codegen Units：CI release 构建强制 1，换取最大优化
#   (dev/本地保留 16/256 并行)
export CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1

# sccache 相关
export RUSTC_WRAPPER=sccache
export SCCACHE_CACHE_SIZE=50G

# 稀疏注册中心（兜底，.cargo/config.toml 已配置）
export CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

# 网络重试
export CARGO_NET_RETRY=3

# 覆盖率（分阶段启用，见第 3 节）
# export CARGO_INCREMENTAL=0  # 与 coverage 要求一致
# export RUSTFLAGS="-C instrument-coverage"
```

### 2.2 Profile 速查

| Profile | opt-level | lto | codegen-units | 适用 |
|---------|-----------|-----|---------------|------|
| `dev` | 1 | false | 256 | 本地开发 |
| `test` | 1 | - | - | cargo test |
| `release (CI 默认)` | 3 | thin | 16 | 日常发布，体积/性能/编译时间均衡 |
| `release (极限)` | 3 | fat | 1 | 正式上线，编译 +60~120% 时间 |

---

## 3. 覆盖率分阶段推进

TOPEMS 覆盖率策略遵循 **"先有后优、先粗后细"** 三阶段落地：

### Phase 1.0：`--lib` 冒烟覆盖率（当前）

```bash
# 单服务：只测 lib.rs 单元编译
cargo test -p topems-monitor --lib
cargo test -p topems-plugin-registry --lib
cargo test -p topems-master-data --lib
```

**目标**：0% → 5~15%，确保：
- 每个独立 crate 至少能 `#[cfg(test)]` 编译通过
- smoke test (`tests/smoke.rs::it_compiles`) 通过
- 为接入 tarpaulin 打基础

**准入要求**：3 个 smoke test × 所有独立服务 = 全绿。

### Phase 2.0：`--test '*'` 全量测试（下一季度）

```bash
# 工作区级：单元 + 集成测试全部跑
cargo test --workspace --test '*'
```

配合：
- `cargo-nextest`（已在 `.cargo/config.toml:24-26` 配置为默认 runner）
- 失败率 1% 以下才进入 Phase 3

### Phase 3.0：`cargo-tarpaulin` 行覆盖率度量（里程碑）

```toml
# .cargo/config.toml 已预留 coverage feature gate
[features]
coverage = ["instrument-coverage"]
```

```bash
# 安装：cargo install cargo-tarpaulin
cargo tarpaulin --workspace \
  --out Html --out Lcov \
  --exclude-files '**/main.rs' \
  --threshold 30
```

**阶段目标**：
- Q3：30%（主干业务服务）
- Q4：50%（含 shared-* lib 子 crate）
- 次年：70%（核心路径）

---

## 4. 各独立服务 Profile

> 冷/热构建时间估算基于 MacBook Pro M2 Max 64G，sccache 冷启动无命中 → 热启动命中 60%+。

### 4.1 `topems-monitor`（监控服务）

| 维度 | 数值 |
|------|------|
| crate 名 | `topems-monitor` |
| 路径 | `svc/monitor` |
| 冷构建 | ~95s |
| 热构建（sccache 命中） | ~12s |
| 依赖数 | ~210 |
| **关键依赖** | `axum-prometheus`, `prometheus`, `utoipa`, `sqlx` |
| 缓存粒度建议 | **粗（Layer 1 + Layer 2）**：指标/告警逻辑稳定，依赖变动少，sccache 命中率通常 >65% |

### 4.2 `topems-plugin-registry`（插件市场）

| 维度 | 数值 |
|------|------|
| crate 名 | `topems-plugin-registry` |
| 路径 | `svc/plugin-registry` |
| 冷构建 | ~110s |
| 热构建 | ~15s |
| 依赖数 | ~225 |
| **关键依赖** | `rust_decimal`, `futures-util`, `utoipa`, `sqlx` |
| 缓存粒度建议 | **中**：rust_decimal 与 db feature 组合多，sqlx offline mode 命中 fingerprint 易失效，建议 CI 用 `SQLX_OFFLINE=true` 固定查询元数据 |

### 4.3 `topems-master-data`（主数据治理）

| 维度 | 数值 |
|------|------|
| crate 名 | `topems-master-data` |
| 路径 | `svc/master-data` |
| 冷构建 | ~130s |
| 热构建 | ~20s |
| 依赖数 | ~240 |
| **关键依赖** | `rand`, `utoipa`, `sqlx`（AI 治理模块多） |
| 缓存粒度建议 | **细（Layer 1 + Layer 2 + tests/ 子缓存）**：该 crate tests/ 下已有 12 个集成测试文件，建议 CI 将 `target/debug/deps/master_data-*` 与 `target/debug/incremental` 拆分缓存键，避免改一行测试全量重编 |

### 4.4 `topems-portal`（门户 BFF）

| 维度 | 数值 |
|------|------|
| crate 名 | `topems-portal` |
| 路径 | `svc/portal` |
| 备注 | `help` 模块在 `src/modules/help/`（faq.rs / guide.rs），无独立 crate |
| 备注 | 无 `login_log` 独立 crate/模块；审计日志为 `src/models/audit_log.rs` + GraphQL query 审计 |
| 冷构建 | ~180s（GraphQL schema 大，编译 heavy） |
| 热构建 | ~30s |
| 缓存粒度建议 | **最粗**：`async-graphql` 派生宏展开慢，sccache 是主要收益来源 |

### 4.5 `topems-unified-core`（统一核心平台）

| 维度 | 数值 |
|------|------|
| crate 名 | `topems-unified-core` |
| 路径 | `svc/unified-core` |
| 冷构建 | ~200s |
| 热构建 | ~35s |
| 缓存粒度建议 | Layer 1 优先；IAM/Doc/Flow/File/Communication/Monitor 聚合，改动频繁，Layer 2/3 增量收益有限 |

---

## 5. 落地检查清单

- [x] `.cargo/config.toml` 中 `rustc-wrapper = "sccache"` 已配置
- [x] `registries.crates-io.protocol = "sparse"` 已配置
- [x] `svc/monitor/tests/smoke.rs` 已创建
- [x] `svc/plugin-registry/tests/smoke.rs` 已创建
- [x] `svc/master-data/tests/smoke.rs` 已创建
- [x] `svc/portal/tests/smoke.rs` 已创建（5/5 独立服务补齐）
- [x] `svc/unified-core/tests/smoke.rs` 已创建（5/5 独立服务补齐）
- [x] CI 中 `CARGO_INCREMENTAL=0` + `SCCACHE_CACHE_SIZE=50G`（`.github/workflows/ci.yml:53-56`）
- [x] 5 服务 cache key 按 `Swatinem/rust-cache` + prefix-key + toolchain 前缀配置（§1.1）
- [x] Phase 1.0 准入：`cargo test -p <crate> --test smoke` 5/5 全绿
- [x] `.cargo/config.toml` `[profile.release]` 兜底 `lto = "thin"` + `codegen-units = 16`（与 workspace Cargo.toml 对齐）
- [x] Phase 1.5：CI `rust-smoke` 独立 job（`.github/workflows/ci.yml:124-157`），5 服务 `--test smoke` 并行，lint/test 之前快反失败
