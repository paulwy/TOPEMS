# GitHub Actions 依赖审计（本地静态清单）— 2026-10-29

> 状态：**挂账**（等 dependabot 鉴权恢复后对照 security alerts 核销）。
> 本清单为本地静态盘点，供核销基线。非固定版本（@master）无法被 dependabot 审计，需人工关注。

## Workflow × Action 依赖表

| Workflow | Action | 版本 | 固定性 |
|---|---|---|---|
| ci / ai-tests / e2e | `./.github/actions/setup-rust`（复合） | — | 本地 |
| ci / ai-tests / e2e | actions/checkout | @v5 | 主版本 tag |
| ci / ai-tests / e2e | actions/setup-node | @v5 | 主版本 tag |
| ci / ai-tests / e2e | actions/cache | @v5 | 主版本 tag |
| ci / ai-tests / e2e | actions/upload-artifact / download-artifact | @v5 | 主版本 tag |
| ci | actions/setup-python | @v5 | 主版本 tag |
| ci | actions/github-script | @v7 | 主版本 tag |
| ci | dorny/paths-filter | @v4 | 主版本 tag |
| ci | taiki-e/install-action | @v2 | 主版本 tag |
| ci / ai-tests / e2e | pnpm/action-setup | @v4 | 主版本 tag |
| docker-build | docker/setup-buildx-action / build-push-action / metadata-action / login-action | @v3 / @v6 / @v5 / @v3 | 主版本 tag |
| docker-build | anchore/sbom-action | @v0 | 主版本 tag（0.x 系列） |
| deploy-k8s | azure/setup-kubectl | @v4 | 主版本 tag |
| secret-scan | gitleaks/gitleaks-action | @v2 | 主版本 tag |
| secret-scan | github/codeql-action/upload-sarif | @v3 | 主版本 tag |
| secret-scan | **aquasecurity/trivy-action** | **@master** | ⚠️ **非固定（移动标签）** |
| storybook-docs | actions/configure-pages / deploy-pages / upload-pages-artifact | @v5 / @v4 / @v3 | 主版本 tag |
| setup-rust | **dtolnay/rust-toolchain** | **@master** | ⚠️ **非固定（移动标签）** |
| setup-rust | mozilla-actions/sccache-action | @v0.0.9 | 固定（可考虑更新） |
| setup-rust | Swatinem/rust-cache | @v2 | 主版本 tag |

## 风险标注（本地静态判定，非漏洞结论）

1. **⚠️ 非固定版本 2 处**（供应链风险，dependabot 无法审计）：
   - `aquasecurity/trivy-action@master`（secret-scan）
   - `dtolnay/rust-toolchain@master`（setup-rust）
   - 建议：改 pin 具体版本 tag 或 commit SHA
2. **旧版本候选**（需 dependabot 核销时对照）：
   - `taiki-e/install-action@v2`（上游可能已 v3）
   - `Swatinem/rust-cache@v2`、`gitleaks/gitleaks-action@v2`、`azure/setup-kubectl@v4`、`mozilla-actions/sccache-action@v0.0.9`、`anchore/sbom-action@v0`
3. **官方 actions/ 系列（checkout/setup-node/cache 等）均为较新主版本**，无风险标注
4. dependabot 28 项中的 **critical 1 最可能落在 GitHub Actions 依赖**（Rust/npm 本地双栈均已确认 0 critical）——鉴权恢复后优先对照 security alerts 的 Actions 标签

## 核销流程（dependabot 鉴权恢复后）

1. 打开 Security → Dependabot → 按 Repository / Actions 筛选，对照本表逐一核销
2. 对 security alert 命中的 action：确认可升级版本，改 tag 后提交
3. 处理 @master 非固定版本（pin tag/SHA）——非 dependabot 范畴，人工项
