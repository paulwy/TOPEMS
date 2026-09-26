# V70-2 topems_shared 门面彻底闭环 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（已选择 Inline Execution 直接批量执行带检查点）

**Goal:** 清空 lib.rs COMPAT 区 107 条 re-export，最终 pub use 总条数 ≤ 30，所有 29 服务 0 E0432/E0599 错误通过 `cargo check`

**Architecture:** 两步渐进（Step 1 无业务动刀 → 独立 cargo check → Step 2 替换 9 服务 6 符号 → 最终验证）。每步独立 commit，分别 rollback。

**Tech Stack:** Rust workspace (lib + svc/*) · Cargo · grep/ripgrep · 前端 pnpm + node CI scripts

---

## 0. File Structure（改动文件清单）

### Step 1（仅 1 文件）
- **Modify:** [lib/src/lib.rs](file:///Users/air/TOPEMS/lib/src/lib.rs#L77-L202) COMPAT 区 L77-L202 删除 101 条 pub use，仅保留 6 条待 Step 2 处理

### Step 2（9-15 文件）
- **Modify 9 服务（`svc/*/src/*.rs`）**: crm/mes/mobile/monitor/portal/unified-core/gis/integration/rd — 替换 10 行 use 语句
- **可能 Modify 对应 Cargo.toml:** 若缺子 crate 依赖则补 2-4 行
- **Modify:** lib/src/lib.rs 再次编辑，删除 Step 1 保留的最后 6 条（+ 4 条 lib 自引用如确认无引用）
- **最后 Modify:** lib/src/lib.rs 文件头注释，COMPAT 标题移除

### 验证
- **Run:** cargo check + pnpm lint + pnpm tsc + 8 CI scripts

---

## 任务组 A · Step 1 大扫除（低风险无业务动刀）

### Task A1: 精确提取 lib.rs COMPAT 区，构造删除后内容

**Files:**
- Modify: `lib/src/lib.rs:77-202`

- [ ] **Step 1.1 先 Read 当前 lib.rs（77-202 行）确认 COMPAT 区完整**

Run: `sed -n '77,202p' lib/src/lib.rs | head -n 130`
Expected: 含 `// =============================================================================\n// COMPAT — 高频使用的 re-export...` 标题 + 各模块 pub use

- [ ] **Step 1.2 构建"保留 6 条 COMPAT"筛选逻辑**

根据 spec Section 4.1，Step 1 保留以下 6 组 re-export：
```rust
// --- Event 模块 ---
pub use topems_shared_event::event;

// --- Service Client 模块 ---
pub use topems_shared_service_client::service_client;

// --- RLS / Observability / Audit Soft Delete / API Security（lib 自引用待 Step 2 核对）---
pub use topems_shared_rls::rls;
pub use topems_shared_observability::observability;
pub use topems_shared_audit::audit_soft_delete;
pub use topems_shared_auth::api_security;

// --- 条目级（Step2 替换后再删）---
pub use topems_shared_core::health::build_health_response;
pub use topems_shared_observability::telemetry::telemetry_middleware;
pub use topems_shared_observability::performance::SystemMetrics;
```
> 注意：以上最后 3 条条目级如果条目级模块路径与 lib.rs 中不一致，**保持 lib.rs 当前条目级格式，只删除其他条目**。具体保留清单以 Step 1.1 读取到的实际 `pub use ... build_health_response / telemetry_middleware / SystemMetrics` 三行原文为准。

- [ ] **Step 1.3 使用 Edit 工具删除 COMPAT 区 101 条**

具体做法：将 lib.rs 的 COMPAT 整段替换为：
```
// =============================================================================
// COMPAT — 迁移兜底兼容层（V70-2 Step 1 后仅余 9 服务 × 6 符号，Step 2 清理）
// =============================================================================
// --- 模块级（Step2 收尾）---
pub use topems_shared_event::event;
pub use topems_shared_service_client::service_client;
pub use topems_shared_rls::rls;
pub use topems_shared_observability::observability;
pub use topems_shared_audit::audit_soft_delete;
pub use topems_shared_auth::api_security;

// --- 条目级（Step2 收尾）---
pub use topems_shared_core::health::build_health_response;
pub use topems_shared_observability::telemetry::telemetry_middleware;
pub use topems_shared_observability::performance::SystemMetrics;
```
> 编辑时必须：保留上述 9 条 `pub use` 的**模块路径与条目级路径完全等于 Step 1.1 读取到的当前 lib.rs 中实际值**，避免路径写错。只删除其他非保留 101 行。

- [ ] **Step 1.4 检查 Step 1 后 pub use 剩余条数**

Run: `grep -cE "^\s*pub use " lib/src/lib.rs`
Expected: ≈29 条左右（KEEP 20 + Step 1 保留 COMPAT 9 = 约 29 条，≤ 30 中间目标）

---

### Task A2: Step 1 cargo check 门闩验证（无 import 错误）

**Files:**
- （无修改，仅验证）

- [ ] **Step 2.1 运行 cargo check 全 workspace**

Run: `cd /Users/air/TOPEMS && SQLX_OFFLINE=true cargo check --workspace --message-format=short 2>&1 | tail -n 80 | tee /tmp/v70_step1.log`
Expected: 仅 SQLX offline 缓存缺失 error（关键词 `no such file` 或 `missing offline`），**无 E0432/E0599/cannot find/unresolved import**。

- [ ] **Step 2.2 针对性过滤 import 类错误**

Run: `grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" /tmp/v70_step1.log`
Expected: 输出 `0`。若 >0 → 说明 Step 1 漏了某条被服务引用的 COMPAT 符号 → 恢复 lib.rs + 重新执行 B2 引用统计 → 补入保留清单后重新 Step 1。

---

### Task A3: Step 1 独立 commit 并 push（可独立 rollback）

**Files:**
- Commit 内容：仅 `lib/src/lib.rs` 改动

- [ ] **Step 3.1 git add 仅 lib.rs**

Run:
```bash
cd /Users/air/TOPEMS && git status --short lib/
git add lib/src/lib.rs && git status --short lib/
```
Expected: lib/src/lib.rs 标为 staged（M），其他文件未动。

- [ ] **Step 3.2 语义 commit**

Run:
```bash
cd /Users/air/TOPEMS && git commit -m 'refactor(lib): V70-2 Step1 · 删除COMPAT区101条0引用re-export

仅保留6条仍被9服务实际引用的符号（event/service_client/rls/
observability/audit_soft_delete/api_security模块级 + build_health_response/
telemetry_middleware/SystemMetrics条目级），剩余101条(94%)0服务引用，
经cargo check E0432/E0599=0验证无编译影响

Completes: V70-2 Step1 大扫除 (spec §3)'
```
Expected: 新 commit hash 输出。

- [ ] **Step 3.3 推送到远端**

Run: `cd /Users/air/TOPEMS && git push origin main 2>&1 | tail -n 3`
Expected: `main -> main` 成功输出。

---

## 任务组 B · Step 2 9 服务 6 符号路径替换（真正的迁移）

> 本任务组前需先做 2 个预备小任务：**B0 符号真实位置核对**（避免路径错配）+ **B0.5 9 服务 Cargo.toml 依赖检查**（缺啥补啥）

### Task B0: 子 crate 符号真实位置核对（防路径错配）

**Files:**
- Read only: `lib/shared-event/src/lib.rs`, `lib/shared-service-client/src/lib.rs`, `lib/shared-core/src/lib.rs`, `lib/shared-observability/src/lib.rs`, `lib/shared-audit/src/lib.rs`, `lib/shared-rls/src/lib.rs`

- [ ] **Step 0.1 定位 6 条 COMPAT 保留符号在各自子 crate 中的真实路径**

Run 6 条 Grep（用于 Step B1-B10 替换前核对路径）：
```bash
# ① event 模块
grep -nE "pub mod event|pub use.*event" /Users/air/TOPEMS/lib/shared-event/src/lib.rs | head -n 5
# ② service_client 模块
grep -nE "pub mod service_client|pub use.*service_client" /Users/air/TOPEMS/lib/shared-service-client/src/lib.rs | head -n 5
# ③ build_health_response
grep -rnE "pub (fn|use) build_health_response" /Users/air/TOPEMS/lib/shared-core/src/ | head -n 3
# ④ telemetry_middleware
grep -rnE "pub (fn|use) telemetry_middleware" /Users/air/TOPEMS/lib/shared-observability/src/ | head -n 3
# ⑤ SystemMetrics (或别名 ComprehensiveMetrics)
grep -rnE "pub (struct|enum) SystemMetrics|pub use.*SystemMetrics|ComprehensiveMetrics" /Users/air/TOPEMS/lib/shared-observability/src/ | head -n 5
# ⑥ rls/audit_soft_delete/observability/api_security 模块级核对
grep -nE "pub mod rls|pub mod audit_soft_delete|pub mod observability|pub mod api_security" /Users/air/TOPEMS/lib/shared-rls/src/lib.rs /Users/air/TOPEMS/lib/shared-audit/src/lib.rs /Users/air/TOPEMS/lib/shared-observability/src/lib.rs /Users/air/TOPEMS/lib/shared-auth/src/lib.rs | head -n 20
```
Expected: 每条都能找到 `pub mod <模块名>` 或 `pub use ... <符号>` 行；用于构造正确路径前缀。**若 SystemMetrics 实际为 ComprehensiveMetrics，则后续所有任务替换为此名**。

- [ ] **Step 0.2 将 Step 0.1 6 条路径记录为临时映射表（后续任务用到时直接引用）**

示例临时映射表（执行后替换 Step 0.1 真实结果）：
```
event              → topems_shared_event::event
service_client     → topems_shared_service_client::service_client
build_health_response → topems_shared_core::health::build_health_response
telemetry_middleware  → topems_shared_observability::telemetry::telemetry_middleware
SystemMetrics      → topems_shared_observability::performance::SystemMetrics  (或 ComprehensiveMetrics)
rls                → topems_shared_rls::rls
observability      → topems_shared_observability::observability
audit_soft_delete  → topems_shared_audit::audit_soft_delete
api_security       → topems_shared_auth::api_security
```

---

### Task B0.5: 9 服务 Cargo.toml 依赖预检（缺啥补啥）

**Files:**
- Modify (if missing): `svc/{crm,mes,mobile,monitor,portal,unified-core,gis,integration,rd}/Cargo.toml`

- [ ] **Step 0.5.1 检查 9 服务 Cargo.toml 是否已存在需要的子 crate 依赖（9 条命令合并）**

Run:
```bash
cd /Users/air/TOPEMS
for s in crm mes mobile monitor portal unified-core gis integration rd; do
  echo "=== svc/$s ==="
  grep -E "topems-shared-(event|service-client|core|observability|audit|rls|auth)" "svc/$s/Cargo.toml" || echo "(缺 shared-event|service-client|core|observability|audit|rls|auth 任一项)"
done
```
Expected: 每个服务按 Task B1-B9 的"需补依赖"输出。缺的行在 Task B1-B9 中执行 Edit 时补入 `[dependencies]` 段末尾。

- [ ] **Step 0.5.2 统一依赖格式（与已存在的依赖保持一致）**

所有补入行示例（按实际子 crate 路径）：
```toml
topems-shared-event = { path = "../../lib/shared-event" }
topems-shared-service-client = { path = "../../lib/shared-service-client" }
topems-shared-core = { path = "../../lib/shared-core" }
topems-shared-observability = { path = "../../lib/shared-observability" }
topems-shared-audit = { path = "../../lib/shared-audit" }
topems-shared-rls = { path = "../../lib/shared-rls" }
```
> 注意：svc 目录深度为 2 层（svc/xxx），相对路径 `../../lib/` 正确。

---

### Task B1: crm 服务替换（event + service_client 2 符号）

**Files:**
- Modify: `svc/crm/src/main.rs`（或其他 .rs 文件，按 B1.1 实际 grep 结果）
- Modify (if missing in B0.5.1): `svc/crm/Cargo.toml` [dependencies] 末尾

- [ ] **Step 1.1 查找 crm 服务中 `use topems_shared::event` 与 `use topems_shared::service_client` 实际文件**

Run:
```bash
cd /Users/air/TOPEMS && grep -rnE "use topems_shared::(event|service_client)" svc/crm/src/
```
Expected: 显示 1-2 个文件 + 行号。例如：
```
svc/crm/src/main.rs:12:use topems_shared::event;
svc/crm/src/routes/mod.rs:8:use topems_shared::service_client;
```

- [ ] **Step 1.2 替换为 B0 映射表中对应路径**

对于 Step 1.1 输出的每个文件，使用 Edit 精确替换：
```rust
// Before
use topems_shared::event;
use topems_shared::service_client;

// After（使用 B0 Step 0.2 映射表真实路径）
use topems_shared_event::event;
use topems_shared_service_client::service_client;
```

- [ ] **Step 1.3 若 B0.5.1 显示缺子 crate 依赖，补入 Cargo.toml**

把对应 2 行追加到 `svc/crm/Cargo.toml` 的 `[dependencies]` 段：
```toml
topems-shared-event = { path = "../../lib/shared-event" }
topems-shared-service-client = { path = "../../lib/shared-service-client" }
```
（已存在的行不要重复添加）

- [ ] **Step 1.4 验证单个服务 cargo check**

Run: `cd /Users/air/TOPEMS && SQLX_OFFLINE=true cargo check -p topems-crm --message-format=short 2>&1 | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" || true`
Expected: `0`（SQLX 缓存类错忽略）。

---

### Task B2: mes 服务替换（event 1 符号）

**Files:**
- Modify: `svc/mes/src/*.rs`（按 B2.1 grep 定位）
- Modify (if missing): `svc/mes/Cargo.toml`

- [ ] **Step 2.1 定位引用**
Run: `cd /Users/air/TOPEMS && grep -rnE "use topems_shared::event\b" svc/mes/src/`

- [ ] **Step 2.2 替换路径**
```rust
// Before
use topems_shared::event;
// After
use topems_shared_event::event;
```

- [ ] **Step 2.3 补依赖（若缺）**
```toml
topems-shared-event = { path = "../../lib/shared-event" }
```

- [ ] **Step 2.4 验证 mes cargo check**
Run: `SQLX_OFFLINE=true cargo check -p topems-mes --message-format=short 2>&1 | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" || true`

---

### Task B3: mobile 服务替换（build_health_response 1 符号）

**Files:**
- Modify: `svc/mobile/src/*.rs`
- Modify (if missing): `svc/mobile/Cargo.toml`

- [ ] **Step 3.1 定位引用**
Run: `cd /Users/air/TOPEMS && grep -rnE "use topems_shared::build_health_response\b" svc/mobile/src/`

- [ ] **Step 3.2 替换路径**
```rust
// Before
use topems_shared::build_health_response;
// After（用 B0 Step 0.2 表真实路径）
use topems_shared_core::health::build_health_response;
```

- [ ] **Step 3.3 补依赖（若缺）**
```toml
topems-shared-core = { path = "../../lib/shared-core" }
```

- [ ] **Step 3.4 验证 mobile cargo check**
Run: `SQLX_OFFLINE=true cargo check -p topems-mobile --message-format=short 2>&1 | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" || true`

---

### Task B4: monitor 服务替换（build_health_response）
### Task B5: portal 服务替换（build_health_response）
### Task B6: unified-core 服务替换（build_health_response）

> B4/B5/B6 与 B3 完全同构，符号相同，只是服务不同。严格重复执行：定位引用 → 替换路径 → 补 shared-core 依赖 → cargo check。

---

### Task B7: gis 服务替换（telemetry_middleware）

**Files:**
- Modify: `svc/gis/src/*.rs`
- Modify (if missing): `svc/gis/Cargo.toml`

- [ ] **Step 7.1 定位引用**
Run: `cd /Users/air/TOPEMS && grep -rnE "use topems_shared::telemetry_middleware\b" svc/gis/src/`

- [ ] **Step 7.2 替换路径**
```rust
// Before
use topems_shared::telemetry_middleware;
// After（使用 B0 Step 0.2 真实路径）
use topems_shared_observability::telemetry::telemetry_middleware;
```

- [ ] **Step 7.3 补依赖（若缺）**
```toml
topems-shared-observability = { path = "../../lib/shared-observability" }
```

- [ ] **Step 7.4 验证 gis cargo check**
Run: `SQLX_OFFLINE=true cargo check -p topems-gis --message-format=short 2>&1 | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" || true`

---

### Task B8: integration 服务替换（telemetry_middleware）

完全同构 Task B7，只是 svc/integration。重复 7.1-7.4。

---

### Task B9: rd 服务替换（SystemMetrics）

**Files:**
- Modify: `svc/rd/src/*.rs`
- Modify (if missing): `svc/rd/Cargo.toml`

> **⚠️ 关键：SystemMetrics 或实际 ComprehensiveMetrics 以 B0 Step 0.1 第 5 条 grep 结果为准**

- [ ] **Step 9.1 定位引用**
Run: `cd /Users/air/TOPEMS && grep -rnE "use topems_shared::(SystemMetrics|ComprehensiveMetrics)\b" svc/rd/src/`

- [ ] **Step 9.2 替换路径**（符号名按 B0 真实位置匹配）
```rust
// Before
use topems_shared::SystemMetrics;  // 或 ComprehensiveMetrics
// After
use topems_shared_observability::performance::SystemMetrics;  // 或 ComprehensiveMetrics
```

- [ ] **Step 9.3 补依赖（若缺）**
```toml
topems-shared-observability = { path = "../../lib/shared-observability" }
```

- [ ] **Step 9.4 验证 rd cargo check**
Run: `SQLX_OFFLINE=true cargo check -p topems-rd --message-format=short 2>&1 | grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" || true`

---

### Task B10: 清理 COMPAT 最后 6-10 条 + 重写文件头注释

**Files:**
- Modify: `lib/src/lib.rs`（COMPAT 区 + 文件头两行注释）

- [ ] **Step 10.1 核对 rls/observability/audit_soft_delete/api_security 4 模块级是否真的被 lib 自引用**

Run（全 workspace 含 lib/ 内）：
```bash
cd /Users/air/TOPEMS
for m in rls observability audit_soft_delete api_security; do
  echo -n "=== topems_shared::$m 引用服务数 ==="
  grep -rnE "use topems_shared::$m\b" . --include='*.rs' 2>/dev/null | wc -l
  grep -rnE "use topems_shared::$m\b" . --include='*.rs' 2>/dev/null
done
```
Expected: 4 个模块若计数为 0（未被 svc/* 或 lib/* 任何实际代码引用）→ Step 10.2 中一并删除；若计数>0 → 保留为 KEEP 区新增项。

- [ ] **Step 10.2 删除 Step 1 保留的最后 6-10 条 COMPAT 条目**

使用 Edit 工具，删除 COMPAT 区整个块（含 `// COMPAT — ...` 标题），如果 Step 10.1 中 4 个自引用模块计数>0 则把它们挪到 KEEP 区末尾（带注释说明）。最终 lib.rs 仅剩：
```
// =============================================================================
// topems_shared 门面 Crate — 去门面化完成（V70-2 仅保留 KEEP）
// =============================================================================
//
// ... 原 KEEP 区 20 条 pub use ...
//
// =============================================================================
// 扩展：便利特征（非 re-export）
// =============================================================================
//
// ... AuditContextExt impl ...
```

- [ ] **Step 10.3 统计最终 pub use 条数**

Run: `grep -cE "^\s*pub use " /Users/air/TOPEMS/lib/src/lib.rs`
Expected: **20-25 条（≤ 30 目标）**。若 >30 → KEEP 区可能有可合并重复项，检查是否存在同模块下既有模块级又有条目级声明（如 `pub use foo::bar;` 后又 `pub use foo::bar::baz;` → 这种不能合并，但计数超过 30 需用户确认是否接受。）

- [ ] **Step 10.4 最终全 workspace cargo check 门闩**

Run:
```bash
cd /Users/air/TOPEMS && SQLX_OFFLINE=true cargo check --workspace --message-format=short 2>&1 | tee /tmp/v70_step2.log
grep -Ec "error\[E0432|error\[E0599|cannot find|unresolved import" /tmp/v70_step2.log
```
Expected: 第二项输出 `0`。若 >0 → 某服务的替换路径不对，按报错信息回溯修正对应 B1-B9 任务。

---

## 任务组 C · Step 2 Commit & Push + 最终全面验收

### Task C1: 前端 & CI 门禁全通过

**Files:**
- （仅验证，不改）

- [ ] **Step C1.1 前端 lint**

Run: `cd /Users/air/TOPEMS/apps/web && pnpm lint --max-warnings=0 2>&1 | tail -n 5`
Expected: `0 error` / `0 warnings` 输出。

- [ ] **Step C1.2 前端 tsc 类型检查**

Run: `cd /Users/air/TOPEMS/apps/web && pnpm tsc --noEmit 2>&1 | tail -n 5`
Expected: 退出码 0，无 error 行。

- [ ] **Step C1.3 8 项合规 CI 脚本全通过**

Run:
```bash
cd /Users/air/TOPEMS
for s in check-header-toolbar-order check-single-primary-button check-mobile-overflow \
         check-ai-context-injection check-backbutton-backhref check-breadcrumb-detailname \
         verify-mes-schema-truth verify_navigation; do
  echo "=== $s ==="
  node scripts/$s.mjs 2>&1 | tail -n 3
  echo ""
done
```
Expected: 每个脚本输出 `PASS` 或退出码 0。若某脚本 FAIL → 但该文件不在本轮修改列表 → 独立 issue，不在 V70-2 范围阻止 commit。

---

### Task C2: Step 2 完整 commit & push

**Files:**
- 所有 B 组文件（lib.rs + 9 服务 .rs + Cargo.toml）

- [ ] **Step C2.1 查看所有改动文件列表**

Run: `cd /Users/air/TOPEMS && git status --short | head -n 30`
Expected: 改动文件分类为：(a) lib/src/lib.rs (b) svc/*/src/*.rs × 9-10 (c) svc/*/Cargo.toml × 0-4

- [ ] **Step C2.2 git add 全部改动**

Run: `cd /Users/air/TOPEMS && git add lib/ svc/`

- [ ] **Step C2.3 语义 commit Step 2 主提交**

Run:
```bash
cd /Users/air/TOPEMS && git commit -m 'refactor(shared): V70-2 Step2 · 9服务6符号COMPAT→直接子crate路径替换

B1-B9任务：crm/mes/mobile/monitor/portal/unified-core/gis/integration/rd
共9服务的10行use语句，从 topems_shared::COMPAT符号 → topems_shared_X::子模块路径
并在缺依赖的服务Cargo.toml补入 shared-event/service-client/core/observability 依赖

B10任务：从lib.rs COMPAT区删除Step1保留的最后9条；重写文件头为"去门面化完成"。
最终pub use总条数 = XX条（≤30目标）

验证：
- cargo check --workspace E0432/E0599 = 0
- pnpm lint --max-warnings = 0
- pnpm tsc --noEmit = exit 0
- 8项合规脚本 = 全部通过

Completes: V70-2 Step2 迁移收尾 (spec §4)
Completes: V70-2 topems_shared 去门面化彻底闭环'
```
（Commit 消息中的 XX 条替换为 Step 10.3 实际计数）

- [ ] **Step C2.4 push 到远端**

Run: `cd /Users/air/TOPEMS && git push origin main 2>&1 | tail -n 3`
Expected: `main -> main` 成功。

---

## Self-Review Checklist

- [x] **Spec 覆盖度**:
  - Step 1 删除 101 条 COMPAT → Task A1-A3 ✅
  - Step 2 替换 9 服务 6 符号 → Task B0-B9 ✅
  - 最终 ≤ 30 pub use → Task B10.3 ✅
  - cargo check E0432/E0599=0 → A2 + B(1-9).4 + B10.4 ✅
  - 前端 lint/tsc + 8 CI 脚本 → C1 ✅
  - Commit 拆分独立 Step1/Step2 → A3 + C2 ✅
  - 风险预案（B0 先核对路径 + B10.1 自引用核对）→ 已内建 ✅
- [x] **无 TBD/TODO 占位符**：SystemMetrics 特殊处理为 B0 Step 0.1 预先 grep 定位的具体步骤
- [x] **类型一致性**：B 组所有 use 替换路径前缀均引用 B0 临时映射表，避免前后任务命名不一致
