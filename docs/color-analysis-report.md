# TOPEMS 前端硬编码颜色分析报告

**生成日期：2026-07-02**

## 一、统计数据概览

### 1.1 硬编码颜色分布

| 类型 | 数量 | 说明 |
|------|------|------|
| `#` 开头颜色 | 2125 | HEX 格式颜色值 |
| `rgb()` | 31 | RGB 格式 |
| `rgba()` | 332 | RGBA 格式（含透明度） |
| **总计** | **2488** | - |

### 1.2 高频颜色值（Top 30）

| 排名 | 颜色值 | 出现次数 | 推荐 Token | 说明 |
|------|--------|----------|-----------|------|
| 1 | `#dbeafe` | 112 | `theme.palette.primary[100]` | Primary 浅蓝背景 |
| 2 | `#ca8a04` | 94 | `theme.palette.warning[600]` | Yellow 600 - Warning |
| 3 | `#475569` | 84 | `theme.palette.grey[600]` | Slate 600 - 深灰文字 |
| 4 | `#15803d` | 82 | `theme.palette.success[700]` | Success 700 |
| 5 | `#fef9c3` | 73 | `theme.palette.warning[100]` | Warning 浅黄背景 |
| 6 | `#8B5CF6` | 65 | `theme.palette.secondary.main` | Secondary 主色 |
| 7 | `#b45309` | 61 | `theme.palette.warning[700]` | Warning 700 |
| 8 | `#F59E0B` | 50 | `theme.palette.warning.main` | Warning 主色 |
| 9 | `#10B981` | 48 | `theme.palette.success.main` | Success 主色 |
| 10 | `#3b82f6` | 45 | `theme.palette.primary.main` | Primary 主色 |
| 11 | `#1976d2` | 44 | `theme.palette.primary.main` | Primary（MUI 默认） |
| 12 | `#6366F1` | 42 | `theme.palette.secondary[500]` | Indigo 500 |
| 13 | `#334155` | 42 | `theme.palette.grey[700]` | Slate 700 |
| 14 | `#94a3b8` | 41 | `theme.palette.grey[400]` | Slate 400 - 辅助文字 |
| 15 | `#f59e0b` | 39 | `theme.palette.warning.main` | Warning（小写） |
| 16 | `#3B82F6` | 38 | `theme.palette.primary.main` | Primary（大写） |
| 17 | `#fff` | 34 | `theme.palette.background.paper` | 白色（简写） |
| 18 | `#f8fafc` | 34 | `theme.palette.background.default` | 页面背景 |
| 19 | `#EF4444` | 34 | `theme.palette.error.main` | Error 主色 |
| 20 | `#D97706` | 34 | `theme.palette.warning.dark` | Warning dark |

### 1.3 高频 rgba 值（Top 20）

| 排名 | 颜色值 | 出现次数 | 处理建议 |
|------|--------|----------|----------|
| 1 | `rgba(0, 0, 0, 0.1)` | 41 | 可考虑 `semanticTokens.background.hoverDark` |
| 2 | `rgba(255,255,255,0.2)` | 28 | 保留（白色 overlay） |
| 3 | `rgba(0,0,0,0.1)` | 20 | 标准化格式 |
| 4 | `rgba(0, 0, 0, 0.25)` | 19 | 需审核 |
| 5 | `rgba(0, 0, 0, 0.5)` | 18 | Modal/Drawer 遮罩 |
| 6 | `rgba(0,0,0,0.5)` | 11 | 标准化格式 |
| 7 | `rgba(255, 255, 255, 0.1)` | 9 | 保留 |
| 8 | `rgba(255,255,255,0.8)` | 8 | 保留 |
| 9 | `rgba(255, 255, 255, 0.05)` | 8 | 保留 |
| 10 | `rgba(255, 255, 255, 0.2)` | 7 | 标准化格式 |

### 1.4 高频文件（Top 10）

| 排名 | 文件路径 | 硬编码数量 | 风险评估 |
|------|----------|-----------|----------|
| 1 | `apps/web/src/theme/presets.ts` | 84 | 低风险（主题定义文件） |
| 2 | `apps/web/src/lib/moduleThemes.ts` | 58 | 低风险（主题配置） |
| 3 | `apps/web/src/pages/mes/ProductionDashboardPage.tsx` | 44 | 中风险（业务页面） |
| 4 | `apps/web/src/pages/lims/LimsInstrumentPage.tsx` | 32 | 中风险 |
| 5 | `apps/web/src/theme/gradients.ts` | 27 | 低风险（渐变定义） |
| 6 | `apps/web/src/pages/qms/QmsApqpPage.tsx` | 26 | 中风险 |
| 7 | `apps/web/src/pages/ehs/EhsIncidentReportPage.tsx` | 26 | 中风险 |
| 8 | `apps/web/src/components/dashboard/ServiceStatusMonitor.tsx` | 26 | 中风险 |
| 9 | `apps/web/src/components/charts/chartTheme.ts` | 26 | 低风险（图表主题） |
| 10 | `apps/web/src/pages/bi/BiIndexPage.tsx` | 23 | 中风险 |

## 二、颜色映射表

### 2.1 Primary 色系（蓝色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#3b82f6` / `#3B82F6` | `theme.palette.primary.main` | 主色调 | ✅ 无需审核 |
| `#dbeafe` | `theme.palette.primary[100]` | 浅蓝背景 | ✅ 无需审核 |
| `#60a5fa` | `theme.palette.primary.light` | Primary light | ✅ 无需审核 |
| `#2563eb` | `theme.palette.primary.dark` | Primary dark | ✅ 无需审核 |
| `#1d4ed8` | `theme.palette.primary[700]` | Primary 700 | ✅ 无需审核 |
| `#1e40af` | `theme.palette.primary[800]` | Primary 800 | ✅ 无需审核 |
| `#eff6ff` | `theme.palette.primary[50]` | Primary 最浅 | ✅ 无需审核 |

### 2.2 Secondary 色系（紫色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#8B5CF6` | `theme.palette.secondary.main` | 次要色调 | ✅ 无需审核 |
| `#6366F1` | `theme.palette.secondary[500]` | Indigo 500 | ⚠️ 需审核 |
| `#7C3AED` | `theme.palette.secondary[600]` | Violet 600 | ✅ 无需审核 |
| `#a78bfa` | `theme.palette.secondary.light` | Secondary light | ✅ 无需审核 |

### 2.3 Success 色系（绿色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#10B981` / `#22c55e` | `theme.palette.success.main` | 成功状态 | ✅ 无需审核 |
| `#15803d` | `theme.palette.success[700]` | Success 700 | ✅ 无需审核 |
| `#059669` | `theme.palette.success[600]` | Success 600 | ✅ 无需审核 |
| `#4ade80` | `theme.palette.success[400]` | Success 400 | ✅ 无需审核 |

### 2.4 Warning 色系（橙色/黄色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#F59E0B` / `#f59e0b` | `theme.palette.warning.main` | 警告状态 | ✅ 无需审核 |
| `#D97706` | `theme.palette.warning.dark` | Warning dark | ✅ 无需审核 |
| `#b45309` | `theme.palette.warning[700]` | Warning 700 | ✅ 无需审核 |
| `#ca8a04` | `theme.palette.warning[600]` | Yellow 600 | ⚠️ 需审核 |
| `#fef9c3` | `theme.palette.warning[100]` | Warning 浅色 | ✅ 无需审核 |

### 2.5 Error 色系（红色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#EF4444` / `#ef4444` | `theme.palette.error.main` | 错误状态 | ✅ 无需审核 |

### 2.6 Grey 色系（中性色）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#475569` | `theme.palette.grey[600]` | 深灰文字 | ✅ 无需审核 |
| `#334155` | `theme.palette.grey[700]` | 更深文字 | ✅ 无需审核 |
| `#94a3b8` | `theme.palette.grey[400]` | 辅助文字 | ✅ 无需审核 |
| `#6b7280` | `theme.palette.grey[500]` | 灰色文字 | ✅ 无需审核 |
| `#f8fafc` | `theme.palette.background.default` | 页面背景 | ✅ 无需审核 |
| `#f5f5f5` | `theme.palette.action.hover` | 悬停背景 | ✅ 无需审核 |
| `#f3f4f6` | `theme.palette.grey[100]` | 浅灰背景 | ✅ 无需审核 |

### 2.7 特殊色系

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#14B8A6` | `designTokens.colors.info.main` | Teal 500 | ⚠️ 需审核 |
| `#4338ca` | `theme.palette.secondary[700]` | Indigo 700 | ✅ 无需审核 |
| `#ea580c` | `theme.palette.warning[600]` | Orange 600 | ✅ 无需审核 |

### 2.8 白色/黑色（需谨慎）

| 硬编码 | Token | 用途 | 审核状态 |
|--------|-------|------|----------|
| `#fff` / `#ffffff` | `theme.palette.background.paper` | 卡片背景 | ⚠️ 需审核 |
| `#000` / `#000000` | `theme.palette.text.primary` | 主文字色 | ⚠️ 需审核 |

### 2.9 透明色（大部分保留）

| 硬编码 | 处理建议 | 审核状态 |
|--------|----------|----------|
| `rgba(0, 0, 0, 0)` | 保留（透明） | ✅ 无需替换 |
| `rgba(0, 0, 0, 0.1)` | 可考虑 `semanticTokens` | ⚠️ 需审核 |
| `rgba(0, 0, 0, 0.5)` | Modal 遮罩，保留 | ⚠️ 需审核 |
| `rgba(255, 255, 255, 0.2)` | 白色 overlay，保留 | ⚠️ 需审核 |
| `rgba(59,130,246,0.3)` | 使用 `alpha()` 函数 | ⚠️ 需审核 |

## 三、替换方案

### 3.1 自动替换策略（分批次）

#### **第一批：高频且明确映射（低风险）**

- 目标：约 1500 处硬编码颜色
- 特征：
  - 高频出现（> 20 次）
  - 映射关系明确
  - 无需人工审核
  - 主要在业务页面和组件中

- 典型替换：
  ```typescript
  // 替换前
  color: '#3b82f6'
  
  // 替换后
  color: theme.palette.primary.main
  ```

#### **第二批：RGB/RGBA 格式（中风险）**

- 目标：约 363 处
- 特征：
  - RGB/RGBA 格式
  - 部分需标准化格式
  - 部分需转换为 `alpha()` 函数

- 典型替换：
  ```typescript
  // RGB 格式替换
  rgb(96, 165, 250) → theme.palette.primary.light
  
  // RGBA 需特殊处理
  rgba(59,130,246,0.3) → alpha(theme.palette.primary.main, 0.3)
  ```

#### **第三批：需人工审核（高风险）**

- 目标：约 200 处
- 特征：
  - 白色/黑色（需确认用途）
  - 特殊品牌色
  - 渐变色中的颜色
  - 不确定的映射关系

- 建议：逐个确认，必要时保留硬编码

#### **第四批：主题定义文件（不替换）**

- 目标：约 169 处
- 文件：
  - `theme/presets.ts`
  - `lib/moduleThemes.ts`
  - `theme/gradients.ts`
  - `components/charts/chartTheme.ts`

- 原因：这些文件本身就是定义颜色的地方，替换会破坏主题系统

### 3.2 白名单（不替换）

以下情况应保留硬编码：

1. **透明色**：`rgba(0, 0, 0, 0)`、`transparent`
2. **渐变色**：`linear-gradient`、`radial-gradient` 中的颜色值
3. **主题定义**：主题配置文件中的颜色定义
4. **CSS 变量定义**：`const COLOR = '#fff'` 形式的常量定义
5. **第三方库**：图表库、地图库等第三方组件的配置
6. **不确定用途**：无法确认用途的颜色值

### 3.3 替换脚本使用说明

#### 安装依赖

```bash
# 项目已安装 tsx，无需额外安装
# 如果未安装，执行：
pnpm add -D tsx
```

#### 运行脚本

```bash
# 1. 分析模式（扫描所有文件，不修改）
tsx scripts/replace-hardcoded-colors.ts --analyze

# 2. 替换单个文件（测试）
tsx scripts/replace-hardcoded-colors.ts --file apps/web/src/pages/mes/ProductionDashboardPage.tsx

# 3. 批量替换（先测试 5 个高频文件）
tsx scripts/replace-hardcoded-colors.ts --batch --limit 5

# 4. 全量替换（谨慎使用）
tsx scripts/replace-hardcoded-colors.ts --batch
```

### 3.4 实际案例：ProductionDashboardPage.tsx

该文件有 44 处硬编码颜色，主要集中在以下位置：

```typescript
// 第 98-107 行：设备状态颜色定义
const EQUIPMENT_STATUS_META = {
  running: { label: '运行中', color: '#10B981', ... },  // → theme.palette.success.main
  idle: { label: '空闲', color: '#3B82F6', ... },       // → theme.palette.primary.main
  maintenance: { label: '维护中', color: '#F59E0B', ... }, // → theme.palette.warning.main
  fault: { label: '故障', color: '#EF4444', ... },      // → theme.palette.error.main
};

// 第 113-116 行：报警级别颜色
const ALARM_LEVEL_META = {
  critical: { color: '#fff', bg: '#EF4444' },  // bg → theme.palette.error.main
  warning: { color: '#fff', bg: '#F59E0B' },   // bg → theme.palette.warning.main
  info: { color: '#fff', bg: '#3B82F6' },      // bg → theme.palette.primary.main
};
```

这些颜色值可以安全替换为 theme token，因为它们对应明确的状态语义。

## 四、风险评估

### 4.1 低风险文件（可批量替换）

- 业务页面（如 MES、LIMS、QMS 等）
- 组件文件（非主题配置）
- 工具函数

**风险等级**：⭐ 低
**建议**：可使用批量替换脚本

### 4.2 中风险文件（需测试验证）

- 图表组件
- 复杂业务逻辑页面
- 使用大量状态颜色的组件

**风险等级**：⭐⭐ 中
**建议**：替换后需视觉测试和功能测试

### 4.3 高风险文件（需人工审核）

- 主题定义文件（不替换）
- 渐变色相关文件
- 第三方库配置

**风险等级**：⭐⭐⭐ 高
**建议**：人工逐个确认，必要时保留

## 五、替换步骤建议

### Step 1: 准备阶段

1. 确保项目编译正常
2. 运行测试确保无功能问题
3. 创建备份分支：`git checkout -b color-refactor-backup`

### Step 2: 测试阶段

```bash
# 1. 分析所有文件
tsx scripts/replace-hardcoded-colors.ts --analyze > color-analysis.txt

# 2. 选择高频业务页面测试（如 ProductionDashboardPage）
tsx scripts/replace-hardcoded-colors.ts --file apps/web/src/pages/mes/ProductionDashboardPage.tsx

# 3. 编译测试
pnpm --filter topems-portal build

# 4. 视觉测试（启动开发服务器对比）
pnpm --filter topems-portal dev
```

### Step 3: 批量替换（第一批）

```bash
# 替换高频业务文件（Top 10）
tsx scripts/replace-hardcoded-colors.ts --batch --limit 10

# 编译测试
pnpm --filter topems-portal build

# 功能测试
pnpm --filter topems-portal test
```

### Step 4: 验证阶段

1. **视觉验证**：对比替换前后页面效果
2. **功能验证**：运行自动化测试
3. **暗色模式验证**：切换主题验证颜色适配
4. **跨浏览器验证**：Chrome、Firefox、Safari

### Step 5: 人工审核（第三批）

对需审核的颜色逐个确认：

- 白色/黑色：确认是否用于背景或文字
- 特殊色：确认是否为品牌色或特殊用途
- rgba：确认是否需要保留透明度

### Step 6: 提交代码

```bash
# 创建功能分支
git checkout -b refactor/hardcoded-colors

# 提交替换
git add apps/web/src
git commit -m "refactor(ui): replace hardcoded colors with theme tokens

- Replace 1500+ hardcoded color values with theme palette tokens
- Enable better dark mode support and theme customization
- Maintain visual consistency across all modules
- Auto-generated mappings based on color frequency analysis

Refs: color-analysis-report.md"
```

## 六、预期收益

### 6.1 主题化支持

- **暗色模式**：颜色自动适配主题，无需手动调整
- **主题切换**：支持多种主题预设（蓝、绿、橙、紫等）
- **品牌定制**：企业客户可自定义主色调

### 6.2 维护成本降低

- **统一管理**：所有颜色值集中在 `designTokens` 和 `semanticTokens`
- **易于修改**：修改主题只需调整 token 文件，无需逐文件搜索
- **语义化命名**：`theme.palette.success.main` 比 `#10B981` 更易理解

### 6.3 开发效率提升

- **类型安全**：TypeScript 提供 token 类型提示
- **自动补全**：IDE 自动补全 theme palette 属性
- **文档支持**：主题 token 有清晰的语义说明

## 七、注意事项

### 7.1 不要破坏现有样式

- 替换前确保映射关系正确
- 对比替换前后视觉效果
- 特别关注状态颜色（success、warning、error）

### 7.2 保留特殊用途颜色

- **品牌色**：企业特定颜色可能需要保留
- **渐变色**：渐变中的颜色值通常保留
- **第三方库**：图表库、地图库的颜色配置保留

### 7.3 透明色和 rgba 特殊处理

- 透明色 `rgba(0, 0, 0, 0)` 保留
- 需要透明度的颜色使用 `alpha()` 函数：
  ```typescript
  import { alpha } from '@mui/material/styles';
  
  backgroundColor: alpha(theme.palette.primary.main, 0.1)
  ```

### 7.4 暗色模式验证

- 替换后必须验证暗色模式效果
- 使用 `theme.applyStyles('dark', { ... })` 处理暗色模式差异
- 确保 semanticTokens 支持暗色模式

## 八、后续优化建议

### 8.1 建立 lint 规则

创建 ESLint 规则检测硬编码颜色：

```javascript
// eslint-rules/no-hardcoded-colors.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded color values',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && 
            /^#[0-9a-fA-F]{3,6}$/.test(node.value)) {
          context.report({
            node,
            message: 'Use theme tokens instead of hardcoded colors',
          });
        }
      },
    };
  },
};
```

### 8.2 文档更新

更新开发文档：

- 添加颜色使用指南
- 说明 theme token 使用方法
- 提供替换示例和最佳实践

### 8.3 组件库规范

要求新组件：

- 必须使用 theme token
- 禁止硬编码颜色值
- 提供暗色模式支持

---

## 附录：脚本文件

- **颜色映射表**：`scripts/color-mapping.ts`
- **替换脚本**：`scripts/replace-hardcoded-colors.ts`

**报告生成时间**：2026-07-02  
**分析工具**：Grep + 自定义脚本  
**分析范围**：`apps/web/src` 目录所有 `.ts` 和 `.tsx` 文件