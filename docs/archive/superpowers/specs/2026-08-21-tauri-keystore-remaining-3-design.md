# Tauri Keystore 剩余 3 件套设计文档

> **Date:** 2026-08-21
> **Owner:** Agent-Driven + Human Approval
> **承接:** V257 Dify POC（`78e489b09`）。Backlog 主题 2 "Tauri 5 件套剩余 3 件"首次提出 V244，连续提及 >=12 版。
> **目标:** 完成 Tauri keystore 剩余 3 件——② 平台原生 Keychain API（keyring 统三平台）、③ 启动自动解锁（随机主密码 + Keychain）、⑤ 迁移 `secure_store.rs` 遗留 `auth_token.enc` + 一次性 JSON 导入工具。

---

## 0. 目标摘要

**一句话目标：** 用 `keyring` crate 实现 `PlatformKeyStore`，首启随机生成 32B 主密码写入平台 Keychain，启动时从 Keychain 读出解锁 Stronghold，自动迁移 `secure_store.rs` 的 `auth_token.enc` 到 Stronghold，并提供 JSON 导入工具；Keychain 不可用时降级到用户输入主密码。

### 量化成功标准（3 KPI）

| # | 指标 | 基线 | 阈值 | Actual | Status |
|---|------|:----:|:----:|--------|--------|
| 1 | 平台 Keychain 可用 | 无 PlatformKeyStore | keyring 三平台编译通过 + 单测 PASS | 待实现 | 待实现 |
| 2 | 启动自动解锁 | 空密码 / 每次新建实例 | 首启自动生成主密码 + 常规启动自动解锁 | 待实现 | 待实现 |
| 3 | auth_token.enc 迁移 | 0 迁移 | 无遗留文件 + token 写入 Stronghold key="auth_token" | 待实现 | 待实现 |

---

## 1. 现状分析

### 已有代码（① Stronghold 已完成 / ④ IPC 已完成）

| 层 | 文件 | 状态 |
|----|------|------|
| Stronghold 主实现 | `apps/desktop/src-tauri/src/keystore.rs:56-168` | `StrongholdKeyStore` 完整 set/get/delete + 快照持久化 |
| Tauri IPC | `apps/desktop/src-tauri/src/keystore.rs:176-230` | `keystore_set/get/delete` 已注册（lib.rs:251-253） |
| 旧文件加密 | `apps/desktop/src-tauri/src/secure_store.rs` | `auth_token.enc` 读写（AES-GCM），`load_token_encrypted()` 返回明文 token |
| 加密原语 | `apps/desktop/src-tauri/src/crypto.rs` | `encrypt_token/decrypt_token` + `get_or_create_key`（32B key 文件） |

### 缺口与隐患（探索发现）

| # | 缺口/隐患 | 影响 |
|---|----------|------|
| 1 | 无 `keyring` crate 依赖（Cargo.toml 无声明） | ② 无法实现 |
| 2 | `keystore_set/get` 用 `password.unwrap_or_default()` -> **默认空密码加密** | 安全性为 0，③ 必须修 |
| 3 | 每次命令调用都 `StrongholdKeyStore::new + init`，无状态缓存 | 性能差，且无法实现"启动一次解锁、后续复用" |
| 4 | `FileKeyStore`（keystore.rs:27-54）是纯内存 stub（`set` 返回 "Not implemented yet"），从未写文件 | TODO 描述的 `~/.topems/keystore/*.json` 遗留**不存在** |
| 5 | 真正的遗留是 `secure_store.rs` 写的 `auth_token.enc`（`com.topems.TOPEMS/data_local/auth_token.enc`） | ⑤ 迁移源应为此文件 |
| 6 | 无启动钩子做自动解锁/迁移 | ③ ⑤ 无触发点 |

---

## 2. 设计（方案 A：策略模式 + 首启自动迁移 + 优雅降级）

### 2.1 架构与模块组织

将当前 230 行单文件 `keystore.rs` 拆为 `keystore/` 目录，各单元单一职责、可独立测试：

```
apps/desktop/src-tauri/src/keystore/
├── mod.rs          # 模块导出 + KeyStore trait re-export + 全局已解锁实例 state
├── trait.rs        # KeyStore trait（从原文件抽出，API 不变）
├── stronghold.rs   # StrongholdKeyStore（迁移自原文件，保持 API）
├── platform.rs     # PlatformKeyStore（新，keyring crate 统三平台）
├── master_key.rs   # 主密码 helper: get_or_create() / ensure_unlocked()
├── migration.rs    # migrate_auth_token() / import_json()
└── commands.rs     # Tauri 命令（原有 3 个 + 新增 4 个）
```

### 2.2 组件职责

| 单元 | 职责 | 依赖 |
|------|------|------|
| `trait.rs` | `KeyStore` trait: set/get/delete | — |
| `stronghold.rs` | Stronghold 加密 KV（迁移自原文件） | tauri-plugin-stronghold |
| `platform.rs` | 平台 Keychain 存取（新） | `keyring` crate |
| `master_key.rs` | 主密码 get_or_create + ensure_unlocked | platform + stronghold |
| `migration.rs` | auth_token.enc -> Stronghold；JSON 导入 | stronghold + secure_store |
| `commands.rs` | Tauri IPC 命令层 | 全部 |

### 2.3 数据流

**首启**（无 Keychain 主密码 + 无 stronghold 快照）：
```
Tauri setup()
  └─ master_key::ensure_unlocked()
      └─ PlatformKeyStore.get("stronghold_master_key") -> None
          └─ 生成 32B 随机密码 -> PlatformKeyStore.set(...) -> 写入 Keychain
              └─ StrongholdKeyStore::new(path, master).init()  // 创建新快照
                  └─ migration::migrate_auth_token()
                      └─ secure_store::load_token_encrypted() -> 明文 token
                          └─ Stronghold.set("auth_token", token) -> save()
                              └─ 删除 auth_token.enc
```

**常规启动**（主密码已在 Keychain）：
```
setup() -> ensure_unlocked() -> PlatformKeyStore.get(主密码) -> Stronghold.init(已存快照) -> 就绪
```

**回退链**（Keychain 不可用，如 Linux 无 secret-service 守护）：
```
PlatformKeyStore 报错 -> ensure_unlocked() 返回 KeychainUnavailable
  └─ 前端弹窗让用户输入主密码 -> keystore_unlock_with_password 解锁（不落 Keychain，每次启动需输入）
```

### 2.4 错误处理与回退

| 场景 | 行为 |
|------|------|
| Keychain 读主密码失败（不存在） | 首启：生成新主密码写入；非常规：视为损坏，记录日志，走用户输入回退 |
| Keychain 写入失败（不可用） | `ensure_unlocked()` 返回 `KeychainUnavailable`，前端弹窗 |
| Stronghold 快照损坏（init 失败） | 返回错误，不静默删除快照（需用户手动处理） |
| 迁移时 `auth_token.enc` 不存在 | `MigrationResult::NoLegacy`，正常路径 |
| 迁移时解密失败 | `MigrationResult::Failed(reason)`，保留旧文件，不删除 |
| JSON 导入格式错误 | 返回具体行号/字段错误，不部分写入 |

### 2.5 迁移细节

**auth_token.enc 迁移**（`migrate_auth_token`）：
1. `secure_store::load_token_encrypted()` -> `Ok(None)` -> 返回 `NoLegacy`
2. `Ok(Some(token))` -> `Stronghold.set("auth_token", &token)` -> `save()` -> `secure_store::clear_token_encrypted()` -> 返回 `Migrated`
3. `Err(e)` -> 返回 `Failed(e)`，保留旧文件

**JSON 导入工具**（`import_json`）：
- 输入：JSON 文件路径，格式 `{ "key1": "value1", "key2": "value2" }`（扁平 KV）
- 流程：读文件 -> `serde_json::from_str::<HashMap<String,String>>` -> 逐条 `Stronghold.set` -> `save()`
- 错误：格式不符返回首条错误，不部分写入（事务性）

### 2.6 Tauri 命令

| 命令 | 用途 | 签名 |
|------|------|------|
| `keystore_set` | 保存密钥（保持原签名） | `(app, key, value, password?) -> ()` |
| `keystore_get` | 读取密钥（保持原签名） | `(app, key, password?) -> Option<String>` |
| `keystore_delete` | 删除密钥（保持原签名） | `(app, key, password?) -> ()` |
| `keystore_unlocked_status` | 返回解锁状态供前端 UI | `(app) -> {unlocked, first_run, keychain_available}` |
| `keystore_unlock_with_password` | 回退路径手动解锁 | `(app, password) -> ()` |
| `keystore_migrate_status` | 返回迁移结果 | `(app) -> {result, detail?}` |
| `keystore_import_json` | 一次性 JSON 导入 | `(app, path) -> {imported: N}` |

`keystore_set/get/delete` 内部从"每次 new 实例"改为复用 `ensure_unlocked()` 后的全局已解锁实例（修掉空密码隐患 + 性能）。

### 2.7 测试策略

| 层 | 测试 | 方式 |
|----|------|------|
| `trait.rs` | trait 定义可被 mock 实现 | 单测 |
| `stronghold.rs` | set/get/delete roundtrip + save 持久化 | 单测（临时快照路径） |
| `platform.rs` | keyring mock（`keyring` 提供 `mock` feature） | 单测 |
| `master_key.rs` | get_or_create 首启生成 + 二次读取命中 | 单测（mock platform） |
| `migration.rs` | 造 `auth_token.enc` -> 迁移 -> 校验 Stronghold + 旧文件删除 | 单测（临时目录） |
| `commands.rs` | 命令参数校验 + 错误返回 | 单测（mock AppHandle 困难，重点测下层） |

---

## 3. 文件清单

| 动作 | 文件 |
|------|------|
| 新建 | `apps/desktop/src-tauri/src/keystore/mod.rs` |
| 新建 | `apps/desktop/src-tauri/src/keystore/trait.rs` |
| 新建 | `apps/desktop/src-tauri/src/keystore/stronghold.rs`（迁移自原 keystore.rs） |
| 新建 | `apps/desktop/src-tauri/src/keystore/platform.rs` |
| 新建 | `apps/desktop/src-tauri/src/keystore/master_key.rs` |
| 新建 | `apps/desktop/src-tauri/src/keystore/migration.rs` |
| 新建 | `apps/desktop/src-tauri/src/keystore/commands.rs` |
| 删除 | `apps/desktop/src-tauri/src/keystore.rs`（内容拆分到上述文件） |
| 修改 | `apps/desktop/src-tauri/Cargo.toml`（加 `keyring = "3"`） |
| 修改 | `apps/desktop/src-tauri/src/lib.rs`（setup 加 `ensure_unlocked`，invoke_handler 加 4 新命令） |

---

## 4. 验收标准（全绿才能合并）

1. `cargo check -p topems-desktop` 编译通过
2. `cargo test -p topems-desktop` 单测全绿（含 platform mock + migration 临时目录测试）
3. `cargo fmt --all --check` 干净 + `cargo clippy` 无 warning
4. 现有 `keystore_set/get/delete` 前端调用无需改动（签名兼容）
5. 首启路径：无主密码时自动生成 + 写入 Keychain + 创建 Stronghold 快照
6. 常规启动：从 Keychain 读主密码 + 解锁已有快照
7. 迁移：`auth_token.enc` 存在时迁移到 Stronghold key="auth_token" 并删除旧文件；不存在时返回 NoLegacy
8. 回退：Keychain 不可用时 `keystore_unlocked_status.keychain_available=false`，前端可走 `keystore_unlock_with_password`

---

## 5. 不做（YAGNI）

- 不做多 backend 策略切换（Stronghold 是唯一业务 KV 存储，Platform 仅存主密码）
- 不做 `FileKeyStore` 真实文件实现（保持 stub，仅作 fallback 占位，无遗留数据）
- 不做主密码轮换/多设备同步（设备绑定，跨设备需重新生成）
- 不做 Stronghold 锁定/超时自动锁（后续版本）
