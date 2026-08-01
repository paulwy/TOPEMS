# Rust Backend 测试覆盖率路线图

@coverage-roadmap V79+

## Tier 1（必须达到 60%+，优先落地）

| 模块 | 目标文件 | 核心测试点 |
|------|----------|------------|
| shared-auth encryption | `lib/shared-auth/src/security/encryption.rs` | AES-GCM 加解密 round-trip / 密钥派生 / 错误密钥解密失败 |
| shared-core validation | `lib/shared-core/src/validation.rs` | 输入校验规则 / 自定义校验器 / 嵌套结构体校验 |
| shared-db data_governance | `lib/shared-db/src/data_governance.rs` | 敏感字段脱敏 / 数据分类标签 / 审计日志触发 |

## Tier 2（中期 40%+）

- shared-auth permission / middleware
- shared-core crud / cache / error
- shared-db repository / migration

## Tier 3（长期 20%+）

- 各 svc/* handler 集成测试
- saga / event bus 端到端

@todo V79+ cargo tarpaulin 集成
- 安装 `cargo tarpaulin`
- 工作区根目录执行 `cargo tarpaulin --workspace --out Html --output-dir target/coverage`
- CI 门槛：Tier 1 行覆盖率 >= 60%
