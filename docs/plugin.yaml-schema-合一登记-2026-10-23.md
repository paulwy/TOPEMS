# plugin.yaml schema 合一登记（2026-10-23 · Phase D 横切线）

> 背景：《TOPEMS全项目测试与审计报告-2026-10-23》Phase D 指出"27 个 plugin.yaml 三套 schema 并存"。
> 本次完成：定位三套 → 差异比对 → 以运行时消费契约为基准合一 → CI lint 同步 → 验证。
> 底线：**不破坏 plugin-registry 运行时解析**（运行时注册契约零改动）。

---

## 一、三套 schema 定位与权威性结论

| # | schema | 路径 | 权威性结论 |
|---|--------|------|-----------|
| ① | **运行时注册契约（基准）** | `svc/plugin-registry/src/modules/plugin/models.rs:587` `RegisterPluginRequest` + `:608` `PermissionDef`；发送方对偶：`lib/shared-core/src/plugin/mod.rs:24` `PluginInfo` | **plugin-registry 服务实际消费**：`POST /dev/runtime/{code}/register` 端点 serde 反序列化的就是它。各服务经 `auto_register_to_core` 以 HTTP JSON 注册。字段 code/name/version/runtime_url/permissions(code,name,resource_type,action) 全必填 |
| ② | **磁盘工件事实格式** | 27 × `svc/*/plugin.yaml`；隐式校验逻辑：`scripts/validate-plugin-config.py`（脚本自述"以 svc/*/plugin.yaml 为单一信源"）、`scripts/ci/check-group2-services.cjs` | **CI 校验 + 文档真源**。没有任何 Rust 服务在运行时读 plugin.yaml（`PluginManifest::from_file` 全仓零调用方）；磁盘文件的实际消费者是 CI 端口/依赖一致性门禁 |
| ③ | **类型化但悬空的 Rust schema** | `lib/shared-core/src/plugin/mod.rs:44` `PluginManifest` | 类型化定义存在但**无运行时消费者**（仅自身单元测试引用），且与②事实格式漂移：反序列化 4 个现存文件会失败（详见下表） |

**旁证（不纳入合一）**：前端 `apps/web/src/lib/plugin-loader/PluginLoader.tsx:7` 的 `PluginManifest`（pluginCode/routes/menus/frontend{type,entry}）是 **marketplace 微前端清单**（API JSON 形态），与 `svc/*/plugin.yaml` 是两类工件，保持不动。归档文档 `docs/archive/misc/2026-08-17-microkernel-spec.md` 中"`runtime:` 为 native/remote/wasm-tenant 标量"的设想从未落地（现存 runtime 全部为 dict），属历史归档，不追溯修改。

**基准确认**：以 ① 运行时消费契约为基准（字段全必填语义不动）；② 磁盘文件保持现状工件；③ 类型化 schema 向 ①+② 事实格式对齐（向后兼容）。

---

## 二、差异比对表（字段 / 类型 / 必填项漂移点）

### 2.1 顶层字段

| 字段 | ① RegisterPluginRequest（运行时契约） | ③ Rust PluginManifest（改动前） | ② 磁盘 27 文件事实 | 漂移点 |
|------|--------------------------------------|--------------------------------|--------------------|--------|
| code | 必填 string | 必填 string | 27/27 有 | 一致 |
| name | 必填 string | 必填 string | 27/27 有 | 一致 |
| version | 必填 string | 必填 string | 27/27 有 | 一致 |
| description | Option<string> | Option<string> | 27/27 有 | 一致 |
| runtime_url | 必填 string | 无（磁盘不写，运行时由 env 注入） | 无 | 契约层字段，磁盘不出现——正常分层 |
| base_path | Option<string> | 无 | runtime.base_path(10)/deployment.base_path(16)/**gis 顶层 stray(1)** | ⚠ gis 把 base_path 写错层级（登记为已知漂移，本轮不动数据文件） |
| auth_required | （shared-core PluginInfo 侧，default true） | bool，default true | 仅 erp/pm 2/27 显式出现 | 一致（缺省=true） |
| category | Option<string> | Option<string> | 27/27 有 | 一致 |
| plugin_type | 无 | Option<string> | 27/27 有 | ① 契约不含（部署元数据，运行时不消费）——保留在③/② |
| author | 无 | Option<string> | 27/27 有 | 同上，磁盘扩展元数据 |
| icon | 无 | **无（被静默丢弃）** | **5/27 有**（ai/communication/mes/qms/unified-core） | ⚠ ③ 缺字段 → 本次合并入③（来源：磁盘事实） |
| dependencies | Vec<string>，default [] | Vec<string>，default [] | 27/27 有 | 一致 |
| permissions | Vec<PermissionDef{code*,name*,resource_type*,action*}> | Vec<PermissionDef>（同左，全必填） | list 23 文件 / **{} 空对象 4 文件**（ehs/qms/lims/pdm） | ⚠ **反序列化硬失败**：`{}` 不是 sequence |
| runtime | 无 | Option<Value> | 20/27（10={port,health_endpoint,base_path}，10={}）；7 文件无此键 | 一致（dict） |
| deployment | 无 | Option<Value> | 27/27（port 16 / base_path 16 / type 10） | 一致（dict） |
| port（顶层） | 无 | 无 | **1/27 stray**（gis） | ⚠ 已知漂移，登记待清理 |

### 2.2 权限条目（permissions[]，共 202 条统计）

| 字段 | ①/③ PermissionDef（契约，全必填） | ② 磁盘事实 | 漂移点 |
|------|----------------------------------|-----------|--------|
| code | 必填 | 202/202 | 一致 |
| name | 必填 | 180/202 | 一致 |
| resource_type | 必填 | **143/202（缺 59 条）** | ⚠ ③ 照契约全必填 → 现存文件反序列化失败 |
| action | 必填 | **143/202（缺 59 条）** | ⚠ 同上 |
| description | 无 | 37/202 | ③ 缺 → 本次合并入 manifest 专用条目（来源：磁盘事实） |
| tier | 无 | 40/202 | ③ 缺 → 本次合并入 manifest 专用条目 |

---

## 三、合一改动摘要

**原则**：运行时契约（①）零改动；磁盘 27 文件零改动（避免与并行分片冲突）；③ 类型化 schema 向后兼容对齐事实格式。

### 3.1 `lib/shared-core/src/plugin/mod.rs`

1. `PluginManifest` 新增 `icon: Option<String>`（来源：磁盘 5 文件事实使用；运行时注册契约不含，属磁盘扩展元数据）。
2. 新增 `ManifestPermission`（plugin.yaml 专用权限条目）：`code: String` 必填，`name/resource_type/action/description/tier` 全部 Option。与运行时 `PermissionDef`（**保持 code/name/resource_type/action 全必填，未动**）并存——plugin-registry 注册契约强度不受影响。
3. `PluginManifest.permissions` 类型 `Vec<PermissionDef>` → `Vec<ManifestPermission>`，挂 `deserialize_with` 容忍 `permissions: []` / `permissions: {}`（ehs/qms/lims/pdm 现存写法）/ `null` / 缺省。
4. `Default` 实现同步补 `icon` 字段。
5. 新增/更新单元测试 3 例：`permissions: {}` 兼容、可选权限字段 + icon 解析、缺省 auth_required。

### 3.2 `scripts/validate-plugin-config.py`

新增 **warn 级 schema 健全性 lint 块**（不改变既有 exit code / `--check` / `--fix` 门禁语义）：
- 必填 `code/name/version` 缺失 → 告警；
- `permissions` 非 list 且非 `{}` → 告警；
- `runtime`/`deployment` 非 dict → 告警。

### 3.3 未改动项（明确说明）

- `svc/plugin-registry/src/modules/plugin/models.rs`（① 运行时契约）：**不动**。
- 27 × `svc/*/plugin.yaml` 数据文件：不动。已知漂移（gis 顶层 stray `port`/`base_path`、microkernel spec 的标量 runtime 设想）登记待后续清理。
- 前端 TS `PluginManifest`：另一类工件，不动。

---

## 四、验证结果

| 验证项 | 命令 | 结果 |
|--------|------|------|
| 类型编译 | `DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-shared-core` | ✅ 0 error（仅 vendor/rsa 既有警告，与本次无关） |
| 运行时消费方回归 | `DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-plugin-registry` | ✅ 0 error（注册契约零改动，依赖链编译通过） |
| plugin schema 单测 | `DATABASE_URL= SQLX_OFFLINE=true cargo test -p topems-shared-core plugin::` | ✅ 43 passed / 0 failed（含 permissions:{} / icon / 可选权限字段新用例） |
| CI 端口一致性脚本 | `python3 scripts/validate-plugin-config.py` | ✅ "全部一致"；新增 schema lint 块对 27 文件零告警 |
| YAML 语法 | 27 文件经 PyYAML safe_load 全部可解析 | ✅（lint 脚本扫描即验证） |

---

## 五、后续清理项（非本次范围，登记备查）

1. `svc/gis/plugin.yaml` 顶层 stray `port`/`base_path` → 迁入 `deployment:` 下（需与 GIS 分片确认端口值一致性后执行）。
2. ehs/qms/lims/pdm 的 `permissions: {}` 空对象 → 后续补齐权限声明（当前已被 schema 合法容忍）。
3. 若未来启用 `PluginManifest::from_file` 运行时加载，应先跑通 27 个文件的批量解析回归（当前该函数无调用方）。
