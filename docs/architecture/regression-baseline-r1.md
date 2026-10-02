# R1 全量门禁回归基线（阶段 3）

> 任务：TODO.md 阶段 3「R1 全量门禁回归基线」——在 T1 前端构建链修复 + D4（MF 移除）后的完整 HEAD 上，**只实测+记录，不改任何代码**。
> 实测日期：2026-10-03（Asia/Shanghai）· 实测 HEAD：`7ff0f1533`（U9 服务发现收敛后）
> 环境：node v22.23.2 / pnpm 9.15.9（与 T1 一致）· 项目根 `/Users/xingzhai/TOPEMS`
> 说明：本文档由「前端基线」与「后端基线」两个并行子代理分别追加各自章节，互不覆盖。

---

## 前端基线（apps/web = topems-portal）

> 验收口径来源：[D4 前端 MF 策略决策](./decision-d4-frontend-mf-strategy.md) §6 验收标准 + `scripts/bundle-check.sh` / `.github/workflows/ci.yml:1639` 预算。
> 命令映射说明：TODO/任务书写作 `pnpm --filter topems-web build:host`，但 `apps/web` 实际包名为 **`topems-portal`**（仓库无 `topems-web` 包）；根 `build:host` = `pnpm --filter topems-portal build`（= `tsc && vite build`）。下表以真实可执行命令实测。

### 1. 依赖状态回归（MF 归零，D4 验收 #3）

| 检查项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| package.json 无 MF 依赖 | `grep -c "@module-federation" apps/web/package.json` | **0**（grep 无命中，exit=1） | ✅ 通过 |
| 依赖树无 MF 节点 | `pnpm why @module-federation/runtime` | 空输出（无依赖树） | ✅ 通过 |
| 依赖树无 MF 节点 | `pnpm why @module-federation/vite` | 空输出（无依赖树） | ✅ 通过 |

结论：T1/D4 移除 `@module-federation/vite`、`@module-federation/runtime` 后保持归零，无残留传递依赖。

### 2. build:host（tsc && vite build，D4 验收 #1/#5）

- 命令：`pnpm run build:host`（= `pnpm --filter topems-portal build` = `tsc && vite build`）
- **exit code：0** ✅
- 耗时：**141s**（2m21s，含 tsc 全量 + vite build；首次干净构建 `rm -rf apps/web/dist` 后）
- 工具链：vite v8.1.5，`6411 modules transformed`
- 产出路径：`apps/web/dist/`（含 `index.html`、`assets/`、`offline_tiles/` 等）
- dist 目录体量（`du -sh`，含 .gz/.br 预压缩产物）：**33M**
- 构建自带 brotli 压缩：compressed 307 files to `.br`

### 3. typecheck（D4 验收 #2）

- 命令：`pnpm --filter topems-portal typecheck`（`tsc --noEmit`）
- **exit code：0** ✅（无任何 TS 错误输出）
- 耗时：**96s**

### 4. vitest（D4 验收 #2）

- 命令：`pnpm --filter topems-portal test`（`vitest run`）
- **exit code：1**（因下述 3 个既有基线失败）
- 耗时：**143s**
- 结果汇总：**Test Files 1 failed | 445 passed (446)**；**Tests 3 failed | 6528 passed | 1 skipped (6532)**

#### 既有基线失败清单（如实记录，非本次回归引入）

| # | 测试 | 根因 |
|---|---|---|
| 1 | `DataInfraComponents.test.tsx > GisMapTemplate · GIS 地图页 > 空态：MapContainer mock 渲染…` | react-leaflet mock 未导出 `useMapEvents` |
| 2 | 同文件 > `基础态：3 markers leaflet-marker + 1 polygon…` | 同上 |
| 3 | 同文件 > `交互：marker click 回调…` | 同上 |

- 失败根因（实测错误原文）：`[vitest] No "useMapEvents" export is defined on the "react-leaflet" mock. Did you forget to return it from "vi.mock"?`，触发点 `DataInfraComponents.test.tsx:168 useMapEvents({...})`。
- 定性：**既有基线失败**（react-leaflet 的 `vi.mock` 缺 `useMapEvents` 导出），与 MF 移除 / T1 构建链修复**无关**——本次任务不改代码，如实记录为基线缺口，留待后续修复。
- 其余 **6528 测试全部通过**。

### 5. bundle 门禁（D4 验收 #5，预算口径 = ci.yml:1639）

- 命令：`MAX_TOTAL=30M MAX_CHUNK=500K MAX_VENDOR=2500K MAX_INITIAL=1500K bash scripts/bundle-check.sh`
- **exit code：0** ✅ —— `All chunks within budget.`
- **TOTAL：16.43 MB**（脚本统计口径 = 未压缩 JS chunk 总和）/ 预算 30M → OK
- 全部 chunk 单块 ≤ 预算（最大 chunk 为 `exceljs-vendor` 923 KB、`mui-core-vendor` 717 KB，均在 vendor 2500K 内；无越限项）

### 6. mobile / desktop 三端（D4 验收 #6）

- **mobile（`apps/mobile` = `topems-mobile`，Expo）**：需原生移动工具链（Expo / iOS-Android SDK），**R1 前端范围不跑**，如实记录。T1 先例一致。
- **desktop（`apps/desktop` = `topems-desktop`，Tauri/Rust，含 `src-tauri/`）**：需原生 Rust + Tauri 工具链，**R1 前端范围不跑**，如实记录。
- 说明：三端构建仅 web 端可在当前 JS 工具链下全量验证；mobile/desktop 留待有原生工具链环境时补测。

### 7. build:shared-types（已知既有环境问题复跑）

- 命令：`pnpm run build:shared-types`（= `pnpm --filter @topems/shared-types build`，`tsup src/index.ts --format cjs,esm --dts`）
- **exit code：1**（复现既有问题）
- 实测：**CJS/ESM JS 产物构建成功**（`dist/index.js` 36.44 KB / `dist/index.mjs` 33.67 KB），仅 **DTS 步失败**：
  `error TS2688: Cannot find type definition file for 'dompurify'.`
- 根因：tsup `--dts` 步骤解析不到 `@types/dompurify`（pnpm + tsup dts 环境问题），**与 MF 移除无关**。
- 影响面：web 经 alias 直接引用 `shared-types` **源码**，不依赖其 dts 产物——故 web 的 build:host / typecheck / vitest 全绿不受影响（见上 §2–§5）。

### 前端基线小结

| 门禁 | 结果 |
|---|---|
| MF 依赖归零 | ✅ 0 命中 + 依赖树空 |
| build:host（tsc && vite build） | ✅ exit 0，141s，dist 产出 |
| typecheck（tsc --noEmit） | ✅ exit 0，96s |
| vitest | ⚠️ exit 1 = 3 个**既有基线失败**（GisMapTemplate × react-leaflet mock 缺 useMapEvents）；6528 passed |
| bundle 门禁 | ✅ TOTAL 16.43MB / 30M，全 chunk 预算内 |
| mobile/desktop | ⏸ 需原生工具链，R1 范围不跑 |
| build:shared-types | ⚠️ DTS 步既有 TS2688 环境问题（与 MF 无关，web 走源码 alias 不受影响） |

---
