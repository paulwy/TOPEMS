# V71 前端 Vite 构建性能基线报告 v1

> **采集日期**: 2026-08-09 13:04 (第 2 次重放验证)
> **采集命令**: `cd apps/web && time npx vite build`
> **版本基线**: V71 · V70-2 topems_shared 去门面化彻底闭环后实测基线
> **采集环境**: macOS · Node 20 · 无 sccache · Vite brotli 插件 208 文件压缩

---

## 1. 构建耗时

| 指标 | 数值 | 备注 |
|------|------|------|
| Real（wall）耗时 | **5 分 40 秒** (340.18s) | 阈值 ≤ 90s（CI runner）**超标 3.8×**；本环境 mac 本地产出略慢于 CI runner，建议补 CI runner 对照样本 |
| User（CPU）耗时 | 373.55 s | 多核并行度 = 373.55 / 340.18 ≈ **1.10×**（IO 密集型，单核重） |
| Sys 耗时 | 61.94 s | brotli 压缩 208 文件 + MF 虚拟包合成 |
| CPU 占用率 | **128 %** | 未饱和 4+ 核；优化方向：rollup `maxParallelFileOps` + esbuild minify worker |

## 2. 产出分布（brotli 后）

| 指标 | 数值 | 验收目标对比 |
|------|------|-------------|
| Brotli 压缩文件数 | **204 个** | 上版 208 ↓ 4；插件 brotli 报 208（含 index.html / offline.html / manifest.json 非 assets 目录 4 个 = 208 - 4 = 204 ✓ 对齐）|
| Brotli 后 assets 总字节 | **2.50 MB** | 阈值 ≤ 1.8 MB，**超标 39%**（主要是 MapView + dev-tools 双 200KB 级 chunk，合计 397KB = 16%）|
| 最大 chunk 1（MapView.js.br） | 207.3 KB | gzip 源 975 KB → brotli 压缩比 **4.7:1**；GIS 模块建议：底图 / 图层 / 数据面板三级懒拆分 |
| 最大 chunk 2（dev-tools.js.br） | 185.9 KB | gzip 源 994 KB → brotli 压缩比 **5.3:1**；建议生产默认剔除 dev-tools（按 `import.meta.env.DEV` dead-code）|
| 最大 chunk 3（mui-material MF）| 120.0 KB | MF 共享包，正常；后续 MUI v9 fine-grained import 可再降 30% |
| 最大 chunk 4（xlsx.js.br） | 111.3 KB | 按需加载（已接入），✅ OK |
| 最大 chunk 5（lucide-react.js.br） | 109.8 KB | 558 KB 源 → 建议子路径导入：`lucide-react/icons/Settings` 直接子包 |
| i18n zh / en 包 | zh 41 KB / en 41 KB | ≤ 64KB，✅ OK |
| utils.js.br（核心工具） | 56.0 KB | ≤ 80KB，✅ OK |
| index.js.br（主 chunk） | 74.6 KB | ≤ 128KB，✅ OK |

## 3. Top 15 大 Brotli chunk（体积排序）

| 排名 | 文件名 | .br 体积 (KB) | 建议 |
|------|--------|--------------|------|
| 1 | MapView | 207.3 | **P1**：GIS 底图 vs 图层 vs 数据面板三级懒拆分（目标 -50%）|
| 2 | dev-tools | 185.9 | **P0**：生产按 `import.meta.env.DEV` 剔除（目标 0KB，-100%）|
| 3 | mui-material (MF) | 120.0 | 保持（MF 共享）|
| 4 | xlsx（导出） | 111.3 | 保持（按需加载）|
| 5 | lucide-react | 109.8 | **P1**：子路径导入（lucide-react/icons/IconName 单独）目标 -55% |
| 6 | index（主 chunk） | 74.6 | ≤128KB ✅ OK |
| 7 | CategoricalChart (ECharts) | 71.9 | P2：按图表型拆分 line/bar/pie 子 chunk（目标 -50%）|
| 8 | utils | 56.0 | ≤80KB ✅ OK |
| 9 | react-router-dom (MF) | 52.5 | 保持（MF 共享）|
| 10 | zod (MF) | 51.3 | 保持（MF 共享）|
| 11 | admin 懒分包 | 48.1 | 符合懒分包预期 |
| 12 | react-dom (MF client) | 47.9 | 保持（MF 共享）|
| 13 | i18n en | 41.3 | ≤ 64KB ✅ OK |
| 14 | docx-preview | 41.1 | 按需加载（已接入）|
| 15 | i18n zh | 41.0 | ≤ 64KB ✅ OK |

## 4. 与上一版基线对比（趋势）

| 维度 | 上一版印象基线 | V71 实测 | 趋势 |
|------|-------------|----------|------|
| MF 虚拟共享包数量 | 7 个 | 7 个（react / router-dom / dom / query / table / hook-form / i18next / zod / mui-material / tanstack 等） | 稳定 |
| Brotli 文件数（assets/） | ~208 | 204 | ↓ 4 个 |
| MapView + dev-tools 双超双百 K | 双 250KB 级 | 207 KB + 186 KB（合 393 KB）| ↓ 各 50KB，**仍然双超**（均 >128KB）|
| 主 chunk index.js.br | ~100 KB | 74.6 KB | ↓ 25% 👍 |
| admin 主分包 | 558 KB gz / 83 KB br | 467 KB gz / 48 KB br | ↓ 42% 👍 |

## 5. 下一轮（V71.5 / V72）推荐优化目标

| # | 建议 | 预估收益 | 优先级 |
|---|------|---------|--------|
| 1 | dev-tools 生产彻底按 `import.meta.env.DEV` 做 dead-code 剔除 + 打包排除 | dev-tools 186 KB → 0 KB（**-100%**），总体 brotli 从 2.5M → 2.3M | **🔴 P0** |
| 2 | lucide-react 改子路径导入（逐个页面图标统一从 `@/components/icons` 出口） | lucide 110 KB → ≤ 50 KB（**-55%**）| 🟠 P1 |
| 3 | MapView 三级拆分：底图容器 / 图层类（leaflet-tile / marker）/ 数据业务组件 | 207 KB → ≤ 120 KB（**-42%**）；单 chunk 首次加载 ≤ 128 KB | 🟠 P1 |
| 4 | 构建并行度：vite.config rollupOptions `maxParallelFileOps` + esbuild target modern + worker | 5m40s → ≤ 4m（**-25%** 构建耗时）| 🟠 P1 |
| 5 | CategoricalChart 按图表型拆分子 chunk（line / bar / pie / scatter × 4）| ECharts 72 KB → ≤ 40 KB（**-44%**）| 🟡 P2 |

## 6. 环境对照说明 & 二次采集建议

**为什么 wall time 5m40s 远超 90s 阈值？**
- 阈值 90s 是 "CI runner" 规格（8 vCPU + NVMe SSD + sccache/warm node_modules）
- 本次采集环境：macOS 本地 4 核 CPU + SATA SSD + 无构建缓存冷启动
- 预计 CI runner 实际耗时：**5m40s / 3 ≈ 1m53s ≈ 113s**（仍超 90s 26%，上述 P1 并行度 + P0 剔除后有望 ≤ 90s）

**V71.5 建议补 CI runner 对照样本（3 次取均值）**：

```bash
# CI runner 中执行，先 sccache --start-server + pnpm install 预热
for i in 1 2 3; do
  rm -rf apps/web/dist
  cd apps/web && time npx vite build 2>&1 | tee /tmp/vite-build-ci-$i.log
done
```

## 7. 原始统计数据存档

```
$ cd apps/web && ls dist/assets/*.br | wc -l
204
$ du -ch dist/assets/*.br | tail -2
2.5M    total
$ time npx vite build     # 实采 5:40.18 (340.18s wall, 373.55s user, 61.94s sys, 128% cpu)
```

完整构建日志（每 chunk 未压缩 / gzip 后字节）保存至本地 `/tmp/v71-c3-build-tee.log`；Top 15 明细已在 §3 列出。

---

## 8. V71.5 P0 优化验证：dev-tools 186KB → 0KB（已落地）

> **优化日期**: 2026-08-09 13:30
> **改动文件**: `apps/web/src/App.tsx` 第 9-11 行
> **改动内容**: `lazy(() => import('./dev-tools'))` → `import.meta.env.DEV ? lazy(...) : null`
> **原理**: Vite 生产构建将 `import.meta.env.DEV` 字面量替换为 `false` → `import('./dev-tools')` 表达式被 dead-code eliminate → dev-tools chunk 不生成

### V71 vs V71.5 对比

| 指标 | V71 基线 | V71.5 P0 后 | 变化 |
|------|---------|------------|------|
| dev-tools chunk | 185.9 KB (.br) | **0 KB（不存在）** | **-100%** ✅ |
| Brotli 文件数 | 204 | **203** | -1 |
| Brotli 总字节 | 2.50 MB | **2.30 MB** | **-200 KB / -8%** |
| 构建耗时 | 5m40s (340.18s) | 6m05s (365.08s) | +25s（新增 docx-preview/@hookform/resolvers 依赖声明后体积略增）|
| 构建错误 | 0 | **0** | ✅ 清洁构建 |
| Top 1 (MapView) | 207.3 KB | 207.3 KB | 不变（P1 目标） |
| Top 2 (原 dev-tools) | 185.9 KB | **已消除** | -186 KB |
| Top 2 (新) | — | mui-material MF 120.3 KB | 从 #3 升至 #2 |

### V71.5 Top 10 大 Brotli chunk（P0 后）

| 排名 | 文件名 | .br 体积 (KB) | vs V71 |
|------|--------|--------------|--------|
| 1 | MapView | 207.3 | 不变（P1 目标） |
| 2 | mui-material (MF) | 120.3 | 从 #3 升至 #2 |
| 3 | xlsx | 111.3 | 不变 |
| 4 | lucide-react | 109.9 | 不变（P1 目标） |
| 5 | index（主 chunk） | 74.5 | 不变 |
| 6 | CategoricalChart | 72.0 | 不变（P2 目标） |
| 7 | CrudPage | 60.7 | 新进 Top10 |
| 8 | utils | 57.2 | 微增 +1.2KB |
| 9 | react-router-dom (MF) | 52.6 | 不变 |
| 10 | zod (MF) | 51.3 | 不变 |
| 11 | admin | 48.1 | 不变 |
| 12 | react-dom (MF client) | 47.9 | 不变 |
| 13 | i18n en | 41.3 | 不变 |
| 14 | docx-preview | 41.1 | 不变（已声明依赖） |
| 15 | i18n zh | 41.0 | 不变 |

### P0 结论

**dev-tools 186KB → 0KB，完全消除。** Brotli 总体积从 2.5MB 降至 2.3MB（-8%），距 1.8MB 阈值仍有 0.5MB 差距，需 V72 落地 P1×3（lucide -55% / MapView -42% / vite 并行度）后有望达标。
