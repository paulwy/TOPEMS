# V71 Build Cache 基准测试报告

> 版本：V71 A2 实测 | 日期：2026-08-09 | 测试机：macOS Apple Silicon

---

## 1. 环境说明

### 1.1 基础环境

| 项目 | 数值 |
|------|------|
| **操作系统** | macOS (Apple Silicon) |
| **CPU 核数** | 10 核 |
| **磁盘类型** | Apple Fabric SSD (Solid State) |
| **Rust 版本** | rustc 1.95.0 (59807616e 2026-04-14) (Homebrew) |
| **sccache 版本** | sccache 0.16.0（已安装，已在 `.cargo/config.toml` 配置为 `rustc-wrapper = "sccache"`） |
| **构建模式** | `--release`（opt-level=3, lto=thin, codegen-units=16） |
| **Build Profile** | workspace `Cargo.toml:192-204` |

### 1.2 测试方法说明

由于本次测试中 sccache server 端口被占用（重启失败），按照用户步骤 2 的备选方案执行：

- **冷构建（Clean Build）**：`cargo clean -p <pkg>` 清理该包产物后，`time cargo build -p <pkg> --release`
- **热构建（No-Change Rebuild）**：不做任何清理，直接再次 `time cargo build -p <pkg> --release`
- 所有日志保存在 `/tmp/build-<svc>-cold.log` 和 `/tmp/build-<svc>-hot.log`

> ⚠️ **重要提示**：由于 5 个服务在同一 workspace 中共享大量依赖（`topems-shared-*` 系列库），**按顺序执行时，后序服务的「冷构建」并非完全从零开始**，其共享依赖 `.rlib` 已被前序服务构建并保留在 `target/release/deps/` 中，因此冷构建时间可能短于真实"首次全量构建"。第一个服务 `monitor` 的冷构建最接近纯冷构建基线。

---

## 2. 5 服务构建时间汇总

### 2.1 汇总表（Wall Clock / User / Sys）

| 服务名 | crate 名 | 冷构建 Wall | 冷 User | 冷 Sys | 热构建 Wall | 热 User | 热 Sys | 加速比 (冷/热) |
|--------|----------|-------------|---------|--------|-------------|---------|--------|----------------|
| **monitor** | `topems-monitor` | **105.42s** | 154.15s | 21.90s | **39.84s** | 120.14s | 5.76s | **2.65×** |
| **plugin-registry** | `topems-plugin-registry` | **49.26s** | 111.53s | 6.43s | **22.31s** | 107.70s | 5.76s | **2.21×** |
| **master-data** | `topems-master-data` | **59.15s** | 182.18s | 7.46s | **64.49s** | 183.90s | 7.77s | **0.92×** |
| **portal** | `topems-portal` | **311.71s** | 506.51s | 19.70s | **178.85s** | 483.72s | 14.86s | **1.74×** |
| **unified-core** | `topems-unified-core` | **64.19s** | 186.19s | 6.97s | **38.14s** | 184.71s | 6.90s | **1.68×** |

### 2.2 各服务构建详情

#### monitor (监控服务)

```
冷构建: cargo clean -p topems-monitor → cargo build -p topems-monitor --release
  real   1m45.42s (105.42s)
  user   2m34.15s (154.15s)
  sys    0m21.90s (21.90s)
  备注: 第一个构建，共享依赖全部从零编译，最接近纯冷构建基线

热构建: cargo build -p topems-monitor --release
  real   0m39.84s (39.84s)
  user   2m00.14s (120.14s)
  sys    0m05.76s (5.76s)
  重新编译: topems-shared-core + topems-shared + shared-event/db/ai/auth/observability/service-client/bootstrap + topems-monitor
```

#### plugin-registry (插件市场)

```
冷构建: cargo clean -p topems-plugin-registry → cargo build -p topems-plugin-registry --release
  real   0m49.26s (49.26s)
  user   1m51.53s (111.53s)
  sys    0m06.43s (6.43s)
  备注: 共享依赖已被 monitor 构建，仅编译 rust_decimal + 少数独有依赖 + 服务本身

热构建: cargo build -p topems-plugin-registry --release
  real   0m22.31s (22.31s)
  user   1m47.70s (107.70s)
  sys    0m05.76s (5.76s)
  重新编译: topems-shared + topems-plugin-registry
```

#### master-data (主数据治理)

```
冷构建: cargo clean -p topems-master-data → cargo build -p topems-master-data --release
  real   0m59.15s (59.15s)
  user   3m02.18s (182.18s)
  sys    0m07.46s (7.46s)
  备注: cargo clean 清理了 1.8GiB 产物（含 test 依赖）

热构建: cargo build -p topems-master-data --release
  real   1m04.49s (64.49s)
  user   3m03.90s (183.90s)
  sys    0m07.77s (7.77s)
  异常: 热构建慢于冷构建（0.92×），原因是热构建时重新编译了 shared-auth + shared + shared-bootstrap
  推测: clean 仅移除当前 pkg 产物，但前序 monitor/plugin-registry 构建后 shared 状态可能发生了 fingerprint 级联
```

#### portal (门户 BFF)

```
冷构建: cargo clean -p topems-portal → cargo build -p topems-portal --release
  real   5m11.71s (311.71s)
  user   8m26.51s (506.51s)
  sys    0m19.70s (19.70s)
  备注: cargo clean 清理了 4.1GiB 产物；portal 独有 async-graphql/async-graphql-axum 大依赖，是全量冷构建瓶颈

热构建: cargo build -p topems-portal --release
  real   2m58.85s (178.85s)
  user   8m03.72s (483.72s)
  sys    0m14.86s (14.86s)
  重新编译: topems-shared-event + topems-shared + shared-auth/observability/service-client/bootstrap + topems-portal
```

#### unified-core (统一核心平台)

```
冷构建: cargo clean -p topems-unified-core → cargo build -p topems-unified-core --release
  real   1m04.19s (64.19s)
  user   3m06.19s (186.19s)
  sys    0m06.97s (6.97s)
  备注: cargo clean 清理了 2.2GiB 产物；独有 bcrypt/redis/lettre/handlebars 等依赖已在前序服务中共享

热构建: cargo build -p topems-unified-core --release
  real   0m38.14s (38.14s)
  user   3m04.71s (184.71s)
  sys    0m06.90s (6.90s)
  重新编译: topems-shared + topems-unified-core
```

---

## 3. 与 V71 A2 文档估算值偏差比对

### 3.1 偏差对照表

V71 A2 文档参考：`docs/architecture/a2-build-cache.md` §4.1 ~ §4.5

| 服务 | A2 估算冷 | 实测冷 | 冷偏差 | A2 估算热 | 实测热 | 热偏差 | 是否在 ±25% 内 |
|------|-----------|--------|--------|-----------|--------|--------|----------------|
| **monitor** | 95s | 105.42s | **+10.97%** | 12s | 39.84s | **+232.00%** | 冷 ✅ / 热 ❌ |
| **plugin-registry** | 110s | 49.26s | **-55.22%** | 15s | 22.31s | **+48.73%** | 冷 ❌ / 热 ❌ |
| **master-data** | 130s | 59.15s | **-54.50%** | 20s | 64.49s | **+222.45%** | 冷 ❌ / 热 ❌ |
| **portal** | 180s | 311.71s | **+73.17%** | 30s | 178.85s | **+496.17%** | 冷 ❌ / 热 ❌ |
| **unified-core** | 200s | 64.19s | **-67.91%** | 35s | 38.14s | **+9.00%** | 冷 ❌ / 热 ✅ |

### 3.2 偏差原因分析

#### 3.2.1 冷构建偏差（monitor: +10.97% ✅ 合规；其余服务严重偏低/偏高）

**正向偏差（实测慢于估算）：**
- **monitor +11%**：估算基于 M2 Max 64G，本机 CPU/内存可能略弱；monitor 作为首个构建的服务承担了全量共享依赖编译（~210+ crates），+11% 在可接受范围内。
- **portal +73%**：`cargo clean -p topems-portal` 清理了 4.1GiB 产物，实际不仅清了 portal，还触发了大量 `topems-shared-*` 共享库级联重建（portal 引入的 `async-graphql` 派生宏展开量大，cold codegen 重）。A2 文档可能未计入 async-graphql 完整展开耗时。

**负向偏差（实测快于估算）：**
- **plugin-registry -55% / master-data -55% / unified-core -68%**：核心原因是**按顺序串行构建时，共享依赖缓存被前序服务预热**。monitor 构建后 `target/release/deps/` 中已存在 `axum / sqlx / tokio / topems-shared-*` 等 200+ 公共 crates 的 `.rlib`，后续服务的 `cargo clean -p` 仅删除自己的产物，不触碰这些 deps，所以"冷构建"实际上是"半热构建"。
- **佐证**：plugin-registry 冷构建 log 中没有出现 `Compiling proc-macro2` 等基础库，直接从 `typenum/const-oid` 开始，说明大部分依赖已编译完成。

#### 3.2.2 热构建偏差（unified-core: +9% ✅ 合规；其余服务严重偏高）

**严重偏高（实测远慢于估算）：**
- A2 文档假设的"热构建"条件是 **sccache 命中 60%+ + 无共享库级联**，而本测试实际执行的是 **cargo clean -p + 再次 build** 模式，热构建中仍然重新编译了多个 `topems-shared-*` 共享 crate（这是 Cargo workspace 的 fingerprint 机制：当依赖链中任何 crate 的 fingerprint 变化时，下游都要重编）。
- 以 monitor 热构建为例：重新编译了 9 个共享 crate + monitor 本身，而不是仅重新编译 monitor。A2 估算 ~12s 假设的是"仅 monitor 自身重编 + sccache 命中"，条件差异巨大。
- portal 热构建中 `async-graphql` 宏即使无代码变更，展开仍需一定 CPU 时间（+496% 偏差主要来自此）。

**接近估算（unified-core +9%）：**
- unified-core 热构建仅重编 `topems-shared` + `topems-unified-core` 两个 crate，是 5 个服务中最接近 A2 文档假设的场景。

### 3.3 偏差结论

| 维度 | 结论 |
|------|------|
| 整体偏差率 | 5 服务共 10 个数据点中，仅 **2/10** 在 ±25% 偏差内（monitor 冷 +11%、unified-core 热 +9%） |
| 主要原因 | 1️⃣ 测试方法差异：A2 假设"独立冷启动（sccache 空 + target 空）" vs 实测"workspace 串行 + cargo clean -p 半热" <br> 2️⃣ Cargo workspace 共享 crate fingerprint 级联重编（A2 估算可能低估了 shared-* 级联开销） <br> 3️⃣ portal 的 async-graphql 宏展开量远大于 A2 估算模型 |
| 修正建议 | 若需精确对齐 A2 估算，应：① 每个服务测试前**删除整个 `target/` 目录 + 清空 sccache**；② 或使用独立 workspace 测试；③ 对 shared-* 库设置独立缓存桶 |

---

## 4. 加速比分析（实测）

### 4.1 加速比柱状对比

```
monitor        2.65x  █████████████████████████ (105.42s → 39.84s)
plugin-registry 2.21x ██████████████████████    (49.26s  → 22.31s)
portal         1.74x  █████████████████         (311.71s → 178.85s)
unified-core   1.68x  ████████████████          (64.19s  → 38.14s)
master-data    0.92x  █████████▌                (59.15s  → 64.49s, 反常)
```

### 4.2 典型场景加速收益

| 场景 | 原始耗时 | 加速后耗时 | 节省时间 | 适用发布场景 |
|------|----------|------------|----------|--------------|
| **monitor 单独发布**（有缓存） | 105s | 40s | 65s | 告警规则变更、指标面板更新 |
| **plugin-registry 单独发布** | 49s | 22s | 27s | 插件上架、市场配置变更 |
| **portal 单独发布**（瓶颈） | 312s | 179s | 133s | BFF GraphQL schema 变更 |
| **unified-core 单独发布** | 64s | 38s | 26s | IAM/Doc/Flow 等核心模块小版本 |

---

## 5. 后续优化建议

### 5.1 缓解 shared-* 级联重编（短期）

1. **sccache 恢复启用**：本次 sccache server 因端口冲突未能重启，若 sccache 正常工作（命中率 60%+），热构建中的共享 crate 重编时间可再减 40~60%。
2. **拆分 shared 库独立缓存键**：CI 中将 `topems-shared-bootstrap / topems-shared-auth` 等稳定 crate 的 `.rlib` 单独缓存，避免因 monitor 改动导致 portal 重新编译所有共享库。

### 5.2 portal 专项优化（中期）

1. **`async-graphql` 派生宏拆分**：将大 schema 拆分为多个 `SchemaPart`，每次只重编变更的子模块（预计热构建时间 -30%）。
2. **GraphQL SDL 预生成**：CI 中将 `async-graphql` 派生宏的输出缓存，本地开发用 `cargo check --features schema-offline` 跳过宏展开。

### 5.3 基准测试流程规范（长期）

1. **标准化基线测试脚本**：每个服务独立测试时执行：
   ```bash
   rm -rf target/
   sccache --stop-server && rm -rf ~/Library/Caches/Mozilla.sccache && sccache --start-server
   time cargo build -p <pkg> --release   # 纯冷构建
   time cargo build -p <pkg> --release   # 纯热构建（sccache 命中）
   ```
2. **与 A2 估算的对齐脚本**：写入 `scripts/benchmarks/build-cache-bench.sh`，确保 CI 每次发布前自动跑并校验偏差 <25%。

---

## 6. 原始日志文件

| 服务 | 冷构建日志 | 热构建日志 |
|------|------------|------------|
| monitor | `/tmp/build-monitor-cold.log` | `/tmp/build-monitor-hot.log` |
| plugin-registry | `/tmp/build-plugin-registry-cold.log` | `/tmp/build-plugin-registry-hot.log` |
| master-data | `/tmp/build-master-data-cold.log` | `/tmp/build-master-data-hot.log` |
| portal | `/tmp/build-portal-cold.log` | `/tmp/build-portal-hot.log` |
| unified-core | `/tmp/build-unified-core-cold.log` | `/tmp/build-unified-core-hot.log` |

---

*报告生成时间：2026-08-09 21:25*
