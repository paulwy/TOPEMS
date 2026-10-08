# 前端/pnpm 组 9 个 CI job 本地等价复刻结果

- 日期：2026-10-08
- 环境：macOS（arm64），node v22.23.2（CI NODE_VERSION=22 ✅），pnpm 9.15.9（CI PNPM_VERSION=9 ✅），node_modules 已预装（未重装）
- 基线：HEAD = `e0bc4fa3e`（origin/main）；复刻过程中提交修复 `745310ae6`（未 push）
- 原始日志：`/tmp/local-ci-logs/*.log`
- 背景：GitHub Actions 因账户 Billing 阻塞无法跑，本报告为 CI 的本地等价复刻验证。

## 总览

| # | job | 本地等价命令 | exit code | 结果 | 关键证据 |
|---|-----|--------------|-----------|------|----------|
| 1 | frontend-lint | `pnpm --filter topems-portal lint`；`lint:a11y`；`node scripts/ci/check-dependency-audit.cjs`；`node scripts/ci/check-api-boundary.cjs` | 0 / 0 / 0 / 0 | **pass** | eslint 0 error；a11y 5 warning；audit gate「No critical」；boundary「violations 0」 |
| 2 | design-system-check | `pnpm --filter @topems/tokens build`；`node scripts/check-design-tokens.mjs`（修漂移后） | 0 / 0 | **pass** | 生成 dist/tokens.css；扫描 2322 文件、偏差 0 |
| 3 | frontend-typecheck | `pnpm --filter topems-portal typecheck` + 遍历 packages tsc --noEmit | 0 / 0 | **pass** | portal tsc 通过；8/8 packages 全 OK |
| 4 | frontend-test | patch + `test:unit` + `test:shard:1..5` | unit 0 / s1 0 / s2 0 / s3 0 / **s4 1** / s5 0 | **fail（1 分片）** | shard4：`permission-matrix-guard` R3=9 > baseline 8 |
| 5 | frontend-coverage | patch + `test:coverage` + 阈值校验 | 测试 1 / 阈值校验通过 | **fail（同 shard4 根因）** | 覆盖率 53.0/32.4/39.3/54.3%，四项基线（13/6/6/13%）全部达标 |
| 6 | frontend-build | patch + `pnpm --filter topems-portal build` + bundle-check.sh | 0 / 0 | **pass** | 构建成功；脚本测 JS 总量 16.44MB ≤30M；最大 chunk vendor 924KB ≤2500K；bundle-check「All chunks within budget」 |
| 7 | security-scan | `pnpm audit --prod --audit-level=high`（`\|\| true` 语义） | audit 本身 1 | **pass（CI 语义）** | 4 漏洞（3 high + 1 moderate），均在 react-native/mobile 树（braces@3.0.3，GHSA-vfj7-8cjw-p6xm），已被 check-dependency-audit 白名单覆盖 |
| 8 | lighthouse | serve dist:3000 + curl + `npx @lhci/cli autorun` | curl 200 / lhci 1 | **partial（环境差异）** | serve + HTTP 200 ✅；lhci 真实执行但 NO_FCP 运行时错误（2 次复现）；CI 该步本就 `\|\| true` 不阻断 |
| 9 | desktop-build | apps/desktop `pnpm run build`（=tauri build） | 未执行 | **skip（环境差异/边界）** | tauri build 内部走 cargo --release + 平台打包；按任务边界不跑 cargo；ubuntu/windows 行 macOS 不可复现；其 web 前置产物已由 job6 验证绿 |

## 逐 job 明细

### 1. frontend-lint — pass
- `pnpm --filter topems-portal lint`：首跑 exit 1（13 errors），全部错误来自本地生成目录 `apps/web/storybook-static/`（eslint 对 minified 产物报 "rule not found"）。该目录在 .gitignore、CI 干净检出不存在 → 根因是 eslint 未忽略产物目录。已修：`apps/web/eslint.config.js` 全局 ignores 增加 `'storybook-static/'`。重跑 exit 0。
- `pnpm --filter topems-portal lint:a11y`：exit 0（5 warning / 0 error）。
- `node scripts/ci/check-dependency-audit.cjs`：exit 0。`critical 0 / high 3 / moderate 1`，门禁输出「✅ Gate passed: no un-allowlisted critical advisories」。
- `node scripts/ci/check-api-boundary.cjs`：exit 0。前端调用点 2821，匹配后端 2785，违规 0，「[PASS]」。

### 2. design-system-check — pass（含 ci.yml 漂移修复）
- `pnpm --filter @topems/tokens build`：exit 0（`tsc && node scripts/generate-css.cjs` → Generated dist/tokens.css）。
- ci.yml 原命令 `node apps/web/scripts/check-token-deviation.cjs` 实测 exit 1 `MODULE_NOT_FOUND`：该脚本已于 2026-07（commit 5ccb05534）删除，同源后继为 `scripts/check-design-tokens.mjs`（V215，扫描硬编码设计值偏离 token）。已修 ci.yml 指向后继脚本；本地跑 exit 0（扫描 2322 文件，偏差 0）。

### 3. frontend-typecheck — pass
- portal：`NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter topems-portal typecheck` exit 0。
- 第二步遍历 `/packages/` 8 包（api-client / app-shell / business-tools-sdk / shared-components / shared-hooks / shared-types / shared-utils / tokens），逐个 `pnpm --filter $pkg exec tsc --noEmit`：**8/8 OK**。

### 4. frontend-test — fail（shard4；其余 5 分片全绿）
- 前置 `node scripts/patch-react-transition-group.cjs`：exit 0（patched 4 copies）。注：ci.yml 原写 `.js`，实际跟踪文件是 `.cjs`（漂移，已修 3 处）。
- `test:unit`：首跑 exit 1，根因 `tests/api-client.spec.ts` 的 `@/config/runtime` mock 缺 `getEnv` 导出，而 V64 `src/config/deployment.ts` 新增依赖 `getEnv('VITE_DEPLOY_ENV')` → 套件导入即崩。已修 mock（getEnv 返回空默认值 = on-premise 基线），重跑 exit 0：**130 文件 / 3009 测试全过**。
- shard 1：exit 0（61 文件 / 324 测试）
- shard 2：exit 0（61 文件 / 438 测试）
- shard 3：exit 0（61 文件 / 452 测试）
- **shard 4：exit 1**。唯一失败：`src/__tests__/permission-matrix-guard.test.ts` —「R3 frontend nav PERMISSIONS violations MUST ≤ baseline (8)」实测 R3=9。R3 命中 9 处全是后端 Rust handler 缺 `// gate: admin-only` 标注（communication mail.rs:456 / notification.rs×3、ehs accident.rs:288、master-data versioning_v54×2、portal announcements.rs×237/285）。该门禁属脚本门禁组/cargo 组领域，按任务边界**未修改 .rs 文件**，留待该组处置。其余 60 文件 / 1780 测试全过。
- shard 5：exit 0（61 文件 / 388 测试）。

### 5. frontend-coverage — fail（同一根因），阈值校验本身通过
- `test:coverage`：exit 1（444 个测试文件 443 过、6493 测试 6491 过），唯一失败仍是上述 R3 guard。
- 覆盖率阈值校验（ci.yml V65 基线 stmt≥13 / branch≥6 / func≥6 / line≥13）：
  - statements **53.02%** ✅　branches **32.38%** ✅　functions **39.28%** ✅　lines **54.28%** ✅
  - 即：若 R3 修复，本 job 阈值步骤直接通过。

### 6. frontend-build — pass
- `pnpm --filter topems-portal build`：exit 0。
- dist 磁盘总量 33M（含 sourcemap/.br）；脚本口径 JS 总量 16.44MB。
- chunk 阈值（内联步骤：vendor≤2500KB / 普通≤500KB）：最大 chunk = exceljs-vendor 924KB（vendor ✅）、mui-core-vendor 720KB ✅；普通最大 pages- 392KB ✅。
- `MAX_TOTAL=30M MAX_CHUNK=500K MAX_VENDOR=2500K MAX_INITIAL=1500K bash scripts/bundle-check.sh --json /tmp/bundle-report.json`：exit 0，「All chunks within budget」。

### 7. security-scan — pass（`|| true` 语义，如实记录发现）
- 本机默认 registry 为 npmmirror（不支持 audit 端点，直接报 ENDPOINT_NOT_EXISTS）；改用官方 registry 重跑。
- 结果：**4 vulnerabilities（3 high / 1 moderate）**，主链 `apps/mobile > react-native@0.73.4 > ... > micromatch@4.0.8 > braces@3.0.3`（GHSA-vfj7-8cjw-p6xm，247 条路径）。与 job1 check-dependency-audit.cjs 的白名单结论一致（high 3 已豁免）。CI 本步 `|| true`，永不因 audit 失败。

### 8. lighthouse — partial（环境差异，未假装通过）
- 前置：dist 已由 job6 产出。
- `npx serve dist -l 3000 --single` 启动成功，`curl http://localhost:3000/` = **HTTP 200** ✅（CI 该步硬门禁等价）。
- `npx @lhci/cli autorun --config lighthouserc.cjs`：真实执行（lhci 已在本地依赖中，Chrome 154 headless 可用），但运行时 `NO_FCP — The page did not paint any content`（30s 无首屏绘制），单 URL 复测仍复现 → exit 1。
- 判定：CI 该步骤本身带 `|| true`、全部 assertion 为 warn 级，设计上不阻断构建；本地 NO_FCP 归因于 headless 环境下 SPA 首屏无法绘制（无后端/外部资源受限）。标注**部分执行：serve+200 验证通过；lhci 运行但无有效报告（环境差异）**。

### 9. desktop-build — skip（环境差异/任务边界）
- CI：matrix [ubuntu, windows, macos]，working-directory `apps/desktop`，`pnpm run build` = `tauri build`。
- 本机：cargo 1.95.0 / tauri CLI / src-tauri 均在，但 `tauri build` = cargo `--release` 编译 + 打包 .app/.dmg；按任务边界（不跑 cargo 命令、不碰 cargo 组）**未执行**；ubuntu/windows 两个 matrix 行在 macOS 本机不可复现。
- 其 web 前置构建（build:web）已等价覆盖于 job6（frontend-build pass）。

## 本轮修复（commit `745310ae6`，未 push）
| 文件 | 修复 |
|------|------|
| `.github/workflows/ci.yml` | ① `apps/web/scripts/check-token-deviation.cjs`（2026-07 已删）→ `scripts/check-design-tokens.mjs`（同源后继）；② `scripts/patch-react-transition-group.js` → `.cjs`（实际跟踪文件名，3 处） |
| `apps/web/eslint.config.js` | 全局 ignores 增 `storybook-static/`（本地 storybook 产物误扫） |
| `apps/web/tests/api-client.spec.ts` | `@/config/runtime` mock 补 `getEnv` 导出（V64 deployment.ts 新依赖） |

pre-commit 25 个钩子全绿（含 frontend-lint / frontend-typecheck 复跑）。

## 遗留与移交
1. **唯一未绿项**：permission-matrix-guard R3=9 > baseline 8（shard4 + coverage job 的共同根因）。属后端门禁组：需给 9 个 admin-only Rust handler 补 `// gate: admin-only` 或在基线流程内处理。本任务组按边界未动 .rs。
2. 注意：执行期间工作树被并发修改（大量 svc/*.rs、deny.toml、scripts/check-migrations.mjs 等非本任务改动 + 新未跟踪文件），本报告只 add/commit 了上述 3 个自己的文件，未触碰他人改动。
3. lighthouse NO_FCP：CI 上同样 `|| true` 容忍；若未来要拿到真实性能分，需在有后端/外网字体可达的环境跑。
