# TOPEMS Performance Baseline

> **版本**: V62.0 | **更新日期**: 2026-07-24
> Performance baseline for the 5 core APIs across the TOPEMS microservices.
> Established: 2026-07-24 · Methodology: curl-based sequential latency sampling + p50/p95/p99 latency measurement.

---

## 1. Core APIs Under Benchmark

The 5 APIs below were selected because they represent the highest-traffic,
most latency-sensitive paths in the platform. Routes and ports were
verified by reading the service source code (`svc/*/src/main.rs` and
route registration modules) and the authoritative port table
(`config/ports.env`).

### 1.1 Finance — Voucher List Query

| Field | Value |
| --- | --- |
| Service | `topems-finance` |
| Port | `8011` (`FINANCE_PORT`) |
| Method | `GET` |
| Path | `/api/core/finance/v1/vouchers` |
| Legacy alias | `/api/v1/finance/vouchers`, `/api/finance/vouchers` |
| Auth | Required (`Authorization: Bearer <token>`) |
| Query params | `status` (draft/submitted/approved/posted/rejected/cancelled), `period` (e.g. `202607`) |
| Source | `svc/finance/src/modules/mod.rs:2201` → `list_vouchers` |
| SQL | `SELECT * FROM core_finance_vouchers WHERE tenant_id = $1 [AND status = $2] [AND period = $3] ORDER BY voucher_date DESC` |

### 1.2 MDM — Master Data Metadata List

| Field | Value |
| --- | --- |
| Service | `topems-master-data` |
| Port | `8090` (`MASTER_DATA_PORT`, default) |
| Method | `GET` |
| Path | `/api/master/mdm-v60/metadata` |
| Search variant | `/api/master/mdm-v60/metadata/search` |
| Auth | Required (`Authorization: Bearer <token>`) |
| Middleware | `auth_middleware` + `rls_middleware` (row-level security) |
| Source | `svc/master-data/src/modules/mod.rs:705` → `metadata_v60::list_metadata` |

### 1.3 Portal BFF — GraphQL Query

| Field | Value |
| --- | --- |
| Service | `topems-portal` |
| Port | `8063` (`PORTAL_PORT`) |
| Method | `POST` |
| Path | `/api/portal/graphql` |
| Auth | Required (`Authorization: Bearer <token>`) |
| Headers | `Content-Type: application/json` |
| Request body | `{ "query": "{ serviceHealth { name status } }" }` |
| Security | IP blacklist, rate limit, query depth/complexity validation, optional hash whitelist |
| Source | `svc/portal/src/main.rs:408` |

### 1.4 Portal BFF — SLA Policy Query

| Field | Value |
| --- | --- |
| Service | `topems-portal` |
| Port | `8063` (`PORTAL_PORT`) |
| Method | `GET` |
| Path | `/api/portal/sla-policies` |
| Single item | `/api/portal/sla-policies/{id}` |
| Auth | Required (`Authorization: Bearer <token>`) |
| Source | `svc/portal/src/main.rs:353` → `modules::tickets::list_sla_policies` |

### 1.5 Unified-Core — User Login

| Field | Value |
| --- | --- |
| Service | `topems-unified-core` (IAM module) |
| Port | `8000` (`CORE_PORT` / `IAM_PORT`) |
| Method | `POST` |
| Path | `/api/core/iam/auth/login` |
| Legacy alias | `/api/v1/core/iam/auth/login` |
| Auth | **Not required** (public route) |
| Headers | `Content-Type: application/json` |
| Request body | `{ "username": "<user>", "password": "<pass>" }` |
| Response | `{ "token": "<jwt>", "user": { ... } }` on success |
| Source | `svc/unified-core/src/routes/mod.rs:94` → `modules::iam::auth::login` |

---

## 2. Benchmark Methodology

### 2.1 Tooling

| Tool | Required | Purpose |
| --- | --- | --- |
| `curl` | yes | HTTP client with `-w` write-out timing |
| `awk` | yes | Percentile and average computation |
| `sort` | yes | Sorting samples for percentile lookup |
| `wrk` | optional | Higher-concurrency benchmarks (not used by `benchmark.sh`) |
| `hey` | optional | Higher-concurrency benchmarks (not used by `benchmark.sh`) |

`benchmark.sh` uses `curl` for portability — it runs anywhere `curl` is
available without compiling a load generator. This measures **single-client
sequential latency**, not throughput under concurrency.

### 2.2 Parameters

| Parameter | Default | Override |
| --- | --- | --- |
| Warmup requests | 10 | `WARMUP=` in `benchmark.sh` |
| Measured requests | 100 | 3rd positional arg |
| Per-request timeout | 30s | `--max-time 30` |
| Target host | `localhost` | 1st positional arg |

### 2.3 Metrics Computed

- **min** — fastest sample (ms)
- **max** — slowest sample (ms)
- **avg** — arithmetic mean (ms)
- **p50** — 50th percentile (median) (ms)
- **p95** — 95th percentile (ms)
- **p99** — 99th percentile (ms)
- **success rate** — non-zero-latency responses / total (%)
- **QPS (approx)** — `1000 / avg(ms)` (single-client upper bound)

Percentiles are computed by sorting samples and indexing
`v[int((n-1)*p)+1]` (nearest-rank method).

### 2.4 Auth for Benchmarks

Protected routes require `Authorization: Bearer <jwt>`. Two options:

1. **Development mode** — set `DEVELOPMENT_MODE=true` on each service.
   The auth middleware (`lib/src/auth.rs:613`) injects dev claims with
   `tenant_id=00000000-0000-0000-0000-000000000001` and skips JWT
   verification. Pass any non-empty token (e.g. `dev-token`) to
   `benchmark.sh`.
2. **Real token** — call the login endpoint first, extract the `token`
   field from the response, and pass it as the 2nd argument.

---

## 3. Expected Performance Characteristics

These expectations are derived from static code analysis of the SQL
queries and middleware layers each request traverses. They are **targets**,
not measured values — fill in the table in §4 after the first run.

### 3.1 Finance — Voucher List

- **SQL profile**: single-table read on `core_finance_vouchers` filtered by
  `tenant_id` (+ optional `status`, `period`). No joins in the list path.
  `get_voucher` (single item) does a second query on
  `core_finance_voucher_lines`.
- **Middleware**: `auth_middleware` → `rate_limit_middleware` → telemetry → CORS.
- **DB pool**: 20 max connections, 30s acquire timeout.
- **Expected**: p95 < **150ms** (indexed `tenant_id` lookup, no joins).

### 3.2 MDM — Metadata List

- **SQL profile**: metadata list query (verify index on tenant in
  `metadata_v60`).
- **Middleware**: `auth_middleware` → `rls_middleware` (row-level security
  adds a policy predicate per query) → rate limit.
- **Expected**: p95 < **200ms** (RLS predicate adds overhead vs. plain tenant filter).

### 3.3 Portal BFF — GraphQL

- **SQL profile**: `serviceHealth` aggregates health across federated
  services (in-memory registry + optional upstream probes).
- **Middleware**: auth → IP blacklist → rate limit → query depth/complexity
  validation → hash whitelist (optional) → audit logging.
- **Expected**: p95 < **100ms** for the `serviceHealth` root field (no DB
  hit; registry lookup). Complex federated queries (`federatedEntity`,
  `voucherEntity`) will be slower due to upstream HTTP fan-out — expect
  p95 < **500ms** for those and avoid them in the baseline unless measuring
  federation specifically.

### 3.4 Portal BFF — SLA Policy List

- **SQL profile**: `SELECT * FROM ... sla_policies WHERE tenant_id = $1`
  (single-table read; verify table name in `modules/tickets`).
- **Middleware**: same Portal stack as GraphQL minus the GraphQL-specific
  security layers.
- **Expected**: p95 < **150ms** (simple tenant-filtered list).

### 3.5 Unified-Core — User Login

- **SQL profile**: `SELECT ... FROM core_users WHERE username = $1`
  followed by `bcrypt::verify` and a JWT `encode`. The password hash
  verification is CPU-bound, not I/O-bound.
- **Middleware**: input validation, audit logger, body limit, rate limit,
  security headers, compression. No `auth_middleware` (public route).
- **Expected**: p95 < **300ms** (dominated by bcrypt cost factor; first
  request may be slower due to JIT/cold cache). Login is **write-ish**
  (updates `login_log`) so do not over-benchmark against production data.

---

## 4. Baseline Results Template

Run `benchmark.sh` and paste the table here. Record the environment so
results are reproducible.

### Environment

| Field | Value |
| --- | --- |
| Date | _YYYY-MM-DD_ |
| Machine | _e.g. Apple M2 Pro, 16GB_ |
| OS | _e.g. macOS 14.5_ |
| Docker | _yes/no (services running in containers vs. native)_ |
| DB | _e.g. Postgres 16, local_ |
| DEVELOPMENT_MODE | _true/false_ |
| Requests per API | _100_ |
| Notes | _e.g. cold DB cache, other load_ |

### Results

| API | METH | min(ms) | max(ms) | avg(ms) | p50(ms) | p95(ms) | p99(ms) | ok | fail | succ% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Finance Voucher List | GET | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ |
| MDM Metadata List | GET | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ |
| Portal GraphQL | POST | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ |
| Portal SLA Policies | GET | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ |
| User Login | POST | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ | _fill_ |

### SLO Targets (proposed)

| API | p50 target | p95 target | p99 target |
| --- | --- | --- | --- |
| Finance Voucher List | < 50ms | < 150ms | < 300ms |
| MDM Metadata List | < 80ms | < 200ms | < 400ms |
| Portal GraphQL (serviceHealth) | < 30ms | < 100ms | < 200ms |
| Portal SLA Policies | < 50ms | < 150ms | < 300ms |
| User Login | < 100ms | < 300ms | < 600ms |

A regression is flagged when p95 exceeds **1.5×** the baseline value.

---

## 5. Running the Benchmarks

### 5.1 Quick start (development mode)

```bash
# 1. Start target services with DEVELOPMENT_MODE=true
#    (do NOT start services from this script — see run_benchmark.sh)

# 2. Run the benchmark against localhost
cd /Users/air/TOPEMS
./scripts/perf/benchmark.sh localhost dev-token 100
```

### 5.2 With a real token

```bash
# 1. Obtain a JWT by logging in
TOKEN=$(curl -s -X POST http://localhost:8000/api/core/iam/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"changeme"}' | jq -r .data.token)

# 2. Run the benchmark with the token
./scripts/perf/benchmark.sh localhost "${TOKEN}" 100
```

### 5.3 All-in-one runner

```bash
# Starts services, waits for health, runs benchmark, saves to results/
./scripts/perf/run_benchmark.sh
```

Results are written to `scripts/perf/results/benchmark_<timestamp>.txt`.

### 5.4 Interpretation

- **p95 color coding** in the terminal: green < 200ms, yellow 200–500ms,
  red > 500ms.
- A high `fail` count with near-zero `ok` usually means the auth token is
  invalid or the service is not running on the expected port.
- The login endpoint will return 401 for wrong credentials but still
  exercises the full middleware + bcrypt path, so latency is meaningful
  even with a synthetic password.

---

## 6. Caveats

- **Sequential, single-client**: `benchmark.sh` does not measure
  throughput under concurrent load. Use `wrk` or `hey` for that
  (e.g. `wrk -t4 -c50 -d30s http://localhost:8011/...`).
- **No DB warmup control**: the first run after a cold start will be
  slower. The 10-request warmup mitigates but does not eliminate this.
- **Login writes data**: each login attempt may insert a row into
  `login_log`. Avoid running thousands of login benchmarks against a
  production database.
- **Rate limiting**: services apply 200 req/60s per IP
  (`RateLimitConfig::new(200, 60)`). With 100 measured + 10 warmup = 110
  requests per API, you are within the limit for a single API, but running
  all 5 back-to-back against the same IP on the Portal service (GraphQL +
  SLA share port 8063) is 220 requests — may trip the limiter. If you see
  429s, raise the limit or space out the runs.

---

## 7. Baseline Environment (V62.0)

> 以下章节为 V62.0 补充基线数据，与 §1–§6 的 curl 顺序采样方法互补，
> 提供环境配置、实测延迟近似值、编译性能与二进制大小基线。
> §1 中的权威路由信息（端口、路径、SQL profile）仍然适用。

| 配置项 | 值 |
| -------- | ----- |
| OS | macOS |
| Rust | stable |
| DB | PostgreSQL 16 (local) |
| Redis | 7.x (local) |
| 编译模式 | release |

---

## 8. Measured Baseline Values

> 近似值（`~`），用于回归对比参考。路由细节见 §1；SLO 目标见 §4.3。
> 当 p95 超过基线值 **1.5×** 时视为回归。

### 8.1 IAM 认证 API

| 端点 | 方法 | p50 | p95 | p99 | 说明 |
| ------ | ------ | ----- | ----- | ----- | ------ |
| /api/iam/auth/login | POST | ~50ms | ~120ms | ~200ms | JWT 签发（对应 §1.5 unified-core 登录，bcrypt 主导） |
| /api/iam/auth/verify | GET | ~5ms | ~15ms | ~30ms | JWT 验证 |
| /api/iam/users | GET | ~20ms | ~50ms | ~80ms | 列表查询 |
| /api/iam/users/{id} | GET | ~10ms | ~25ms | ~40ms | 单条查询 |

### 8.2 Portal GraphQL API

| 端点 | 方法 | p50 | p95 | p99 | 说明 |
|------|------|-----|-----|-----|------|
| /api/portal/graphql | POST | ~30ms | ~100ms | ~200ms | GraphQL 查询（对应 §1.3 serviceHealth） |
| /api/portal/health | GET | ~2ms | ~5ms | ~10ms | 健康检查 |

### 8.3 MDM 主数据 API

| 端点 | 方法 | p50 | p95 | p99 | 说明 |
| ------ | ------ | ----- | ----- | ----- | ------ |
| /api/mdm/materials | GET | ~15ms | ~40ms | ~70ms | 物料列表 |
| /api/mdm/suppliers | GET | ~15ms | ~40ms | ~70ms | 供应商列表 |
| /api/master/mdm-v60/metadata | GET | ~20ms | ~200ms | ~400ms | 元数据列表（对应 §1.2，含 RLS 谓词开销） |

### 8.4 Finance 财务 API

| 端点 | 方法 | p50 | p95 | p99 | 说明 |
|------|------|-----|-----|-----|------|
| /api/finance/vouchers | GET | ~25ms | ~60ms | ~100ms | 凭证列表（对应 §1.1，单表 tenant 过滤） |
| /api/finance/reports | GET | ~50ms | ~150ms | ~300ms | 报表查询 |

---

## 9. Compile Performance Baseline

### 9.1 子 crate 编译时间（clean build）

| Crate | 编译时间(clean) | 说明 |
| ------- | --------------- | ------ |
| topems-shared-core | 22.33s | 核心基础模块 |
| topems-shared-db | ~15s | 数据库模块 |
| topems-shared-auth | ~18s | 认证模块 |
| topems-shared-event | ~20s | 事件驱动模块 |
| topems-shared (完整) | 40.36s | 全部模块 |
| topems-shared-service-client | ~12s | 服务客户端 |
| topems-shared-observability | ~15s | 可观测性 |
| topems-shared-ai | ~10s | AI 模块 |

### 9.2 增量编译时间

| 场景 | 增量编译时间 | 说明 |
| ------ | ------------ | ------ |
| 修改 shared-core 中单文件 | ~3-5s | 仅重编 core + 依赖链 |
| 修改 shared-db 中单文件 | ~2-3s | 仅重编 db + 依赖链 |
| 修改主 crate 单文件 | ~5-8s | 重编 shared + 依赖服务 |
| 修改服务单文件 | ~3-5s | 仅重编该服务 |

---

## 10. Binary Size Baseline

| 服务 | release 大小 | 说明 |
| ------ | ------------- | ------ |
| topems-iam | ~25MB | 认证服务 |
| topems-portal | ~35MB | GraphQL 网关 |
| topems-unified-core | ~40MB | 核心平台 |
| topems-search | ~15MB | 搜索服务 |
| topems-communication | ~18MB | 通信服务 |
| minimal-service-example | ~8MB | 最小示例（仅 shared-core） |

---

## 11. Concurrent Load Measurement (wrk / hey)

> §2 的 curl 方法测量单客户端顺序延迟；本节用于并发吞吐基准。
> 两者互补：curl 测延迟分布，wrk 测并发下的稳定性。

使用 `wrk` 或 `hey` 进行并发基准测试：

```bash
# 安装
brew install wrk

# 测量 IAM 登录（对应 §1.5，端口 8000）
wrk -t4 -c100 -d30s -s scripts/performance/login.lua http://localhost:8000/api/iam/auth/login

# 测量 GraphQL 查询（对应 §1.3，端口 8063）
wrk -t4 -c100 -d30s -s scripts/performance/graphql.lua http://localhost:8090/api/portal/graphql
```

> 注意：`scripts/performance/login.lua` 与 `graphql.lua` 为计划中的 wrk
> 脚本，尚未创建。当前并发基准可先用 `wrk` 内联 payload：
> `wrk -t4 -c100 -d30s http://localhost:8000/api/portal/health`

---

## 12. Compile Time & Binary Size Measurement

### 12.1 编译时间测量

```bash
# Clean build
cargo clean && cargo build --timings -p topems-shared-core

# Incremental build
touch lib/shared-core/src/response.rs && cargo build --timings -p topems-shared-core
```

### 12.2 二进制大小

```bash
cargo build --release -p topems-iam
ls -lh target/release/topems-iam
```

---

## 13. Performance Regression Detection

CI 中的 `scripts/ci/lint-check.sh` 会检测编译警告和类型错误。
建议添加性能回归检测脚本，对比当前构建时间与基线，超过 20% 则报警：

```bash
# scripts/performance/regression-check.sh
# 对比当前构建时间与基线，超过 20% 则报警
```

### 13.1 回归判定阈值

| 指标 | 告警阈值 | 依据 |
| ------ | --------- | ------ |
| API p95 延迟 | > 基线 × 1.5 | §4.3 SLO 约定 |
| 子 crate clean 编译时间 | > 基线 × 1.2 | §9.1 |
| 二进制大小 | > 基线 × 1.2 | §10 |

---

## 14. Notes

1. 以上数据为本地开发环境基线，生产环境性能受部署配置影响
2. 编译时间受 CPU 核心数和内存影响
3. API 延迟受数据库数据量和网络环境影响
4. 建议每次重大架构变更后更新基线
5. §1–§6 的 curl 顺序采样与 §8 的近似基线值共同构成完整基线；
   当两者不一致时，以 `benchmark.sh` 实测结果为准并回填 §4 / §8

---

## 15. k6 并发性能测试套件

> 与 §2 的 curl 单客户端顺序采样互补，本节使用 **k6** 进行并发负载测试，
> 测量多虚拟用户同时请求下的吞吐量、稳定性与资源瓶颈。

### 15.1 工具链

| 工具 | 用途 | 版本要求 |
| --- | --- | --- |
| `k6` | 负载生成器 | ≥ v2.0 (`brew install k6`) |
| `scm-performance-test.js` | SCM 供应链管理服务测试 | 内置 |
| `database-performance-test.js` | 数据库查询性能测试 | 内置 |
| `run-all-tests.sh` | 套件入口（自动分发 + 汇总） | 内置 |

### 15.2 双模式配置

| | 冒烟测试 `SMOKE=true` | 完整性能测试（默认） |
| --- | --- | --- |
| **VUs** | 1 | 50-100 |
| **Duration** | 5s | 60-120s |
| **阈值** | errors < 50% | 严格（errors < 1%，p95/p99 分级） |
| **需后端** | 否（CI 友好） | 是 |
| **用途** | CI 验证脚本无语法错误 | 真实性能评估 |

### 15.3 快速开始

```bash
# 安装 k6
brew install k6

# 方式 1：一键 E2E（自动启动后端 → 测试 → 清理）
./scripts/performance/run-e2e-performance.sh

# 方式 2：冒烟测试（无需后端，5s 完成）
SMOKE=true ./scripts/performance/run-all-tests.sh

# 方式 3：完整性能测试（需先启动后端服务）
./scripts/performance/run-all-tests.sh

# 指定后端地址
BASE_URL=http://192.168.1.100:8040 ./scripts/performance/run-all-tests.sh
```

### 15.4 阈值配置

#### SCM 服务

| 指标 | 冒烟阈值 | 完整阈值 |
|---|---|---|
| `errors` | `< 50%` | `< 1%` |
| `http_req_duration` p95 | — | `< 500ms` |
| `http_req_duration` p99 | — | `< 1000ms` |
| `list_suppliers` p95 | — | `< 300ms` |
| `get_supplier` p95 | — | `< 200ms` |

#### 数据库

| 指标 | 冒烟阈值 | 完整阈值 |
| --- | --- | --- |
| `errors` | 无 | — |
| `http_req_duration` p95 | — | `< 800ms` |
| `http_req_duration` p99 | — | `< 1500ms` |

### 15.5 输出文件

| 文件 | 内容 |
| --- | --- |
| `scm-test-results.json` | k6 原始时序数据 |
| `database-test-results.json` | k6 原始时序数据 |
| `performance-report.json` | SCM 聚合摘要（由 `handleSummary` 生成） |
| `database-performance-report.json` | 数据库聚合摘要 |

### 15.6 k6 v2 注意事项

- **`scenarios` vs 顶层 `vus`/`duration`**：k6 v2 不允许同时使用 `scenarios` 和顶层 `vus`/`duration` 属性。SCM 脚本使用 `scenarios`（`constant-vus`），数据库脚本使用顶层属性。
- **Counter 指标访问**：k6 v2 中 `Counter` 类型使用 `.values.count`（非 `.value`）。
- **可选链**：`data.metrics['name']?.values.count ?? 0` 安全访问。

### 15.7 两种测试方法对比

| | curl `benchmark.sh` | k6 `run-all-tests.sh` |
| --- | --- | --- |
| **并发模型** | 单客户端顺序 | 多 VUs 并发 |
| **测量维度** | 延迟分布 (p50/p95/p99) | 延迟 + 吞吐量 + 错误率 |
| **工具依赖** | 仅 curl | 需 k6 |
| **适合场景** | API 延迟基线 | 并发压力 / 稳定性 |
| **CI 集成** | 需后端 | SMOKE 模式无需后端 |
