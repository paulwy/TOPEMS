# cargo audit 忽略登记表（Audit Ignore Registry）

本表登记 `.cargo/audit.toml` 中所有 `[advisories].ignore` 条目，供审查与追溯。
新增/删除 ignore 必须同步更新本表与 `.cargo/audit.toml`。

| ID | 日期 | Crate | 漏洞类型 | 忽略理由 | 关联修复/补丁 |
|---|---|---|---|---|---|
| RUSTSEC-2023-0071 | 2026-10-22 | rsa 0.9.x | Timing side-channel（Marvin Attack） | 见下 | `vendor/rsa` 私有补丁（implicit rejection） |
| RUSTSEC-2026-0253 | 2026-10-07 | lru 0.16.4 | unsound（catch_unwind+panic Drop 路径） | 本仓无触发用法，随 async-graphql 滚动消除 | — |
| RUSTSEC-2026-0387 | 2026-10-28 | crypto-bigint 0.5.5 | Timing（常数时间操作差异） | ES 算法零使用（仅 RS256/HS256/None），见下 | 待 jsonwebtoken 滚动升级 |

## RUSTSEC-2023-0071 详细理由

- **无法升级修复**：上游 RustCrypto/RSA 至今无修复版本（RUSTSEC `patched=[]`，
  2026-09-12 复核；缓解 PR #680/#702 未合入），升级路径不存在。
- **实际利用面为空**：本项目经 `jsonwebtoken`（rust_crypto 后端）使用 rsa 仅用于
  JWT RS/PS 算法**签名验证**（`SigningKey` / `BlindedSigningKey` / `Pkcs1v15Sign` / `Pss`），
  **解密路径零调用**；Marvin Attack 仅影响 PKCS#1 v1.5 解密（RSAES-PKCS1-v1_5）
  的错误区分计时侧信道，与本项目使用方式无关。
- **已引入纵深防御**：`[patch.crates-io] rsa = { path = "vendor/rsa" }`（版本仍为
  0.9.10 以匹配依赖约束），移植上游 PR #702 的 implicit rejection 缓解——解密
  padding 无效时返回 KDF（HMAC-SHA256，私钥指数派生）伪随机消息而非错误，
  消除错误区分计时侧信道；若未来误用解密路径，仍受保护。

## RUSTSEC-2026-0387 详细理由（crypto-bigint 0.5.5，2026-10-28）

- **引入链**：`jsonwebtoken 10.4.0`（rust_crypto feature）→ `p256 0.13.2` → `ecdsa` →
  `elliptic-curve 0.13.8` → `crypto-bigint 0.5.5`；修复需 jsonwebtoken 11.x
  （10→11 存在 API breaking，未评估引入）。
- **实际利用面为空**：项目 JWT 仅使用 `RS256`（4 处，rsa 已 vendor 补丁）、`HS256`
  （10 处，HMAC 不经 crypto-bigint）、`None`（3 处，allow none 场景）。
  `p256/p384`（ES256/ES384）**零调用**——`lib/shared-auth/src/auth.rs` 复核无任何
  ES 算法使用；该链仅作为编译依赖存在于依赖树。
- **处置**：登记忽略 + 跟踪项；未来启用 ES 算法或 jsonwebtoken 生态滚动升级时消除。

## 验证记录

- `vendor/rsa` 单测 61 通过（含 4 项新增：ct_lt_u16/u32 常数时间比较 2 万随机样本、
  KDF 确定性、有效/无效 padding 输出不可区分）。
- `cargo check --workspace` 通过（补丁版 rsa 全仓库编译）。
- `cargo audit --db /tmp/rustsec-advisory-db`：0 vulnerability，4 allowed warnings
  （unmaintained/unsound，另行跟踪）。
