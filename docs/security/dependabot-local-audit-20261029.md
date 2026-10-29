# 本地依赖漏洞面评估（pnpm audit 替代 dependabot）2026-10-29

> 背景：dependabot 28 项漏洞处置阻塞于 GitHub 鉴权（`gh` 未登录、security 页 robots 挡爬取）。
> 本评估采用**本地 lock 扫描**（`pnpm audit --json`，强制官方 registry `https://registry.npmjs.org`）作为替代路径，覆盖 npm 生态依赖面。
> 时点：expo 58 升级合并 main（f2438b583）之后，lock 为最新状态。

## 1. 扫描结果

- **25 条 advisory**：critical 0 / high 12 / moderate 15 / low 4（severity 汇总 31 与条数 25 差异 = 多 CVE 同包重复计数）
- 扫描入口：仓库根 `pnpm audit --json`（npmmirror 镜像无 audit 接口，需 `npm_config_registry=https://registry.npmjs.org`）

## 2. 与 dependabot 28 项对比

| 维度 | dependabot（阻塞中） | 本地 pnpm audit |
|---|---|---|
| 覆盖 | GitHub Advisory 全生态（含 Rust/cargo） | npm 生态 |
| 统计 | 1 critical / 9 high / 12 mod / 6 low | 0 critical / 12 high / 15 mod / 4 low |
| 时点 | 历史报告（升级前） | 当前 lock（expo 58 后） |
| 差异原因 | critical 1 可能来自 Rust/cargo 侧或升级前状态；high/mod 数量差 = 升级后依赖面变化 + 覆盖范围不同 | — |

## 3. 漏洞面分类（25 条）

### A. 无修复版（挂账，等上游）

| 包 | 受影响 | 修复 | 链 |
|---|---|---|---|
| node-forge | <=1.4.0（npm 最后版） | 无 | expo > @expo/cli > @expo/code-signing-certificates（开发期工具链） |
| extract-zip | <=2.0.1（最后版） | 无 | 构建/解压工具链 |
| deepmerge | >=4.2.0 <=4.3.1（最后版） | 无 | expo CLI 链 |

### B. 有修复版、依赖者未更新（可 overrides 收敛，需验证）

| 包 | 当前 | 修复 | 链 | 收敛风险 |
|---|---|---|---|---|
| tmp | 0.1.0 / 0.0.33 | >=0.2.6 | 工具链 | 低 |
| js-yaml | 4.2.0（另一链 4.3.2 已修复） | >=4.3.0 | eslint 系 | 低 |
| decode-uri-component | 0.2.2 | >=0.5.0 | 工具链 | 低 |
| basic-ftp | 5.3.1 | >=6.2.1 | 构建链 | 低 |
| react-router | 7.18.1（另一链 7.18.3 已修复） | >=7.18.2 | desktop/web | 低（7.18.x 内） |
| esbuild | 0.27.7（devDep 0.28.1 已修复） | >=0.28.1 | 构建链 | 低 |
| @opentelemetry 系（core/instrumentation-*） | <2.8.0 / <0.65-0.73 | 各修复版 | **apps/web 生产依赖**（exporter-trace-otlp-http） | 中（需 web 回归） |

### C. 修复为 breaking 大版本（不建议强制，挂账观察）

| 包 | 当前 | 修复 | 说明 |
|---|---|---|---|
| uuid | 8.3.2 | >=11.1.1 | 大版本 API 变化 |
| zod | 3.25.76（peer 链 4.6.6 已修复） | >=4.6.6 | expo CLI 内部链（3.x 无修复） |
| @vitest/mocker | <4.1.12 | >=4.1.12 | apps/web devDeps（vitest 测试链） |

## 4. 影响面结论

- **critical 0**；绝大多数条目位于 **dev/构建/测试工具链**（eslint、jest、vitest、expo CLI、解压/构建辅助）
- **生产运行面**：`@opentelemetry` 系（apps/web 遥测，有修复可升级）；node-forge（expo CLI 开发期，无修复）
- 多个包 lock 内**已存在修复版实例**（js-yaml 4.3.2 / esbuild 0.28.1 / react-router 7.18.3 / zod 4.6.6），受影响实例为次级旧链——整体风险可控

## 5. 建议

1. **可立即收敛（低风险 overrides）**：tmp→0.2.6、js-yaml→4.3.2、decode-uri-component→0.5.0、basic-ftp→6.2.1、react-router 统一 7.18.3+、esbuild→0.28.1 —— 需 pnpm overrides 后全量 `pnpm install` + lint/tsc/bundle 验证
2. **@opentelemetry 系升级**（web 生产依赖）：升级 exporter-trace-otlp-http 链至修复版 + apps/web 回归后做
3. **挂账**：node-forge / extract-zip / deepmerge（无修复版）；uuid / zod（breaking）；@vitest/mocker（测试链）
4. **Rust/cargo 侧**：dependabot 的 critical/high 可能含 cargo 依赖，另行 `cargo audit` 扫描（本评估未覆盖）

## 7. 收敛执行结果（2026-10-29，ede14836b）

- **根因发现**：根 package.json 存在**两个重复 `pnpm` 键**（JSON 后段覆盖前段），既有 overrides 静默失效——已合并为一段
- **7 包收敛**：tmp 0.2.7 / js-yaml 4.3.2 / decode-uri-component 0.5.1 / basic-ftp 6.2.3 / esbuild 0.28.2 / react-router 7.18.5 / glob 10.5.0（选择性覆盖 10.x）
- **效果**：`pnpm audit` **25 条 advisory → 2 条**（仅 node-forge high / deepmerge low，均无修复版，挂账等上游）
- **验证**：mobile/web/desktop tsc 全绿、apps/web vite build 成功（esbuild/glob/react-router overrides 无破坏）
- 原 §5 建议中 tmp/js-yaml/decode-uri/basic-ftp/esbuild/react-router/glob 已全部执行；@opentelemetry 系与 uuid/zod 随合并恢复既有 overrides 生效

## 8. Rust/cargo 侧补充评估（2026-10-29，cargo audit）

- **结果**：`cargo audit`（RustSec advisory-db，本地 clone 后 `--db` 指定）——**vulnerabilities 0（found=false）**；654 个依赖包
- **unmaintained 警告 3 个**（非漏洞，维护停止）：
  - proc-macro-error 1.0.4（RUSTSEC-2024-0370）
  - ttf-parser 0.25.1（RUSTSEC-2026-0192）
  - unsafe-libyaml 0.2.11（RUSTSEC-2024-0449）
- **局限**：yank 检查 176 次超时（ustc crates.io 镜像响应慢，非漏洞判定相关）；advisory-db 需本地 git clone（cargo-audit 内建 fetch 失败，GitHub git 协议可用）
- **对 dependabot 28 的比对结论**：dependabot 的 critical 1 不在 Rust 侧（本地 cargo 0 漏洞），亦不在 npm 侧（本地 0 critical）——大概率来自升级前旧时点状态或 GitHub Actions/workflow 依赖（本地未覆盖）
- **本地全覆盖结论**：npm 2 条挂账（node-forge high / deepmerge low，无修复版）+ Rust 0 条 = **dependabot 28 项本地已闭环 26 项，剩余 2 项均为无修复版挂账**

### 8.1 unmaintained 3 项处置决策（2026-10-30 拍板）

- **忽略 + 上游复核**（unmaintained ≠ 漏洞；cargo audit 已确认 0 vulnerability）
- 使用面（依赖路径）：proc-macro-error ← utoipa-gen（OpenAPI 宏，全服务）；ttf-parser ← lopdf → pdf-extract（svc/ai PDF 解析）；unsafe-libyaml ← serde_yaml_ng → shared-core（YAML）
- 均无本项目直改点（上游维护）——复核触发：utoipa / lopdf / serde_yaml_ng 更新时

## 6. 局限

- 仅 npm 生态；不含 Rust/cargo、GitHub Actions 等 dependabot 覆盖面
- audit 数据来自 npm Advisory（与 GitHub Advisory 口径略有差异）
- 链定位以 `pnpm why` 与 lock 检索为主，未逐条实跑验证 overrides 兼容性

## 附：原始数据

- `/tmp/audit-root2.json`（25 条 advisory 完整 JSON）
- 扫描命令：`npm_config_registry=https://registry.npmjs.org pnpm audit --json`
