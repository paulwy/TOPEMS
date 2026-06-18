# TOPEMS UI 重构设计方案 - 混合模式

| 项目 | 内容 |
|------|------|
| **版本** | v1.0 |
| **日期** | 2026-06-18 |
| **状态** | 设计中 |
| **布局模式** | 混合模式（仪表盘 + 模块入口 + 服务监控） |
| **主色调** | 科技蓝 |

---

## 一、设计目标

1. **统一界面风格**：科技蓝企业级风格，扁平化设计
2. **混合布局模式**：首页以数据概览 + 模块入口 + 服务监控为主
3. **插件化适配**：支持插件动态注册导航和模块卡片
4. **服务监控突出**：实时显示服务健康状态
5. **用户体验优化**：登录即可看到关键信息和待办事项

---

## 二、设计原则

| 原则 | 说明 |
|------|------|
| **一致性** | 统一的视觉风格、交互模式、设计Token |
| **简洁性** | 清晰的信息层级，减少视觉噪音 |
| **可用性** | 直观的操作流程，降低学习成本 |
| **响应式** | 适配桌面端、平板端、移动端 |
| **性能优先** | 首屏加载快，按需加载插件 |

---

## 三、首页布局设计

### 3.1 整体布局结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPEMS 企业管理平台                            🔍 搜索  🔔 通知  🌙 主题 👤 │  ← 顶部栏
├─────────────────────────────────────────────────────────────────────────┤
│  👋 欢迎回来，管理员！上午好                                             │  ← 欢迎语
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │  📋     │ │  📝     │ │  👥     │ │  📁     │                   │
│  │ 待审批  │ │ 待处理  │ │ 在线用户 │ │ 文件数量 │                   │
│  │   12    │ │   8     │ │   23    │ │   456   │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │  ← 统计卡片区
├─────────────────────────────────────────────────────────────────────────┤
│  📊 服务状态监控                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🟢 健康度: 98.5%    📈 请求: 12,847    ⚠️ 异常: 1 (SRM)         │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ✅IAM ✅HRM ✅CRM ✅PM ✅ERP ✅Flow ✅AI ✅Doc ✅RS                  │  │
│  │ ✅LIMS ✅QMS ✅EHS ✅GIS ✅IM ✅Mail ✅BI ⚠️SRM ✅PDM               │  │
│  │ ✅MES ✅WMS ✅SCM ✅Portal                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │  ← 监控区
├─────────────────────────────────────────────────────────────────────────┤
│  🚀 模块导航                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    🏢      │ │    👥      │ │    📊      │ │    🔄      │           │
│  │   企业资源 │ │   人力资源 │ │   客户管理 │ │   工作流   │           │
│  │    ERP     │ │    HRM     │ │    CRM     │ │    Flow    │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    📁      │ │    💬      │ │    🤖      │ │    ⚙️      │           │
│  │   项目管理 │ │   即时通讯 │ │   AI助手   │ │   系统管理 │           │
│  │    PM      │ │    IM      │ │    AI      │ │    IAM     │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │  ← 模块入口区
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    🧪      │ │    🔧      │ │    🛡️      │ │    📍      │           │
│  │   研发管理 │ │   质量管理 │ │   供应链   │ │   地理信息 │           │
│  │    RS/LIMS │ │    QMS/EHS │ │    SCM/SRM │ │    GIS     │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   ⚠️异常   │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
├─────────────────────────────────────────────────────────────────────────┤
│  📋 待办事项                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🔄 审批任务: 员工转正审批 (张三)      截止: 今天 18:00              │  │
│  │ 🔄 审批任务: 采购订单审批 (李四)      截止: 今天 17:00              │  │
│  │ 🔄 审批任务: 合同续签审批 (王五)      截止: 明天 10:00              │  │
│  └───────────────────────────────────────────────────────────────────┘  │  ← 待办事项区
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 布局层次详解

#### 3.2.1 顶部栏

| 元素 | 功能 | 样式说明 |
|------|------|----------|
| Logo + 品牌名 | 点击返回首页 | 科技蓝主色，加粗字体 |
| 全局搜索 | 搜索全系统数据 | 放大镜图标，灰色输入框 |
| 通知铃铛 | 显示未读通知数量 | 红点提示 |
| 主题切换 | 浅色/深色模式 | 太阳/月亮图标 |
| 用户头像 | 用户信息下拉菜单 | 圆形头像 |

#### 3.2.2 欢迎语区

- 显示问候语（根据时间动态变化）
- 显示用户名
- 简洁的欢迎信息

#### 3.2.3 统计卡片区

四个关键指标卡片：

| 卡片 | 图标 | 数据来源 | 用途 |
|------|------|----------|------|
| 待审批 | ClipboardList | Flow服务 | 待处理的审批任务数 |
| 待处理 | CheckSquare | 各模块汇总 | 待处理的任务总数 |
| 在线用户 | Users | IAM服务 | 当前在线用户数 |
| 文件数量 | FolderOpen | File服务 | 系统文件总数 |

**卡片样式**：
- 圆角：12px
- 背景：白色 + 科技蓝渐变边框
- 悬停效果：轻微上移 + 阴影加深

#### 3.2.4 服务监控区

**状态指示**：
- ✅ 正常：绿色背景 + 白色文字
- ⚠️ 异常：橙色背景 + 白色文字，闪烁动画
- ❌ 离线：红色背景 + 白色文字

**监控信息**：
- 健康度百分比
- 今日请求数
- 异常服务数量

**交互功能**：
- 自动刷新（30秒间隔）
- 手动刷新按钮
- 点击服务查看详情

#### 3.2.5 模块入口区

模块卡片网格布局：

| 特性 | 说明 |
|------|------|
| 网格布局 | 4列（桌面端），响应式自适应 |
| 卡片尺寸 | 180px × 140px |
| 图标尺寸 | 48px |
| 状态指示 | 卡片底部显示服务状态 |
| 悬停效果 | 放大 + 阴影 + 边框高亮 |
| 动态显示 | 根据插件安装状态显示/隐藏 |

**模块卡片信息**：
- 图标（Lucide图标）
- 模块名称（中文）
- 模块代码（英文缩写）
- 服务状态（运行中/异常/离线）

#### 3.2.6 待办事项区

显示待处理的审批任务：

| 字段 | 说明 |
|------|------|
| 类型图标 | 审批、任务、提醒等 |
| 标题 | 任务描述 |
| 关联人 | 相关人员 |
| 截止时间 | 截止日期和时间 |

---

## 四、进入模块后的导航设计

### 4.1 模块内布局结构

```
┌──────────────────────────────────────────────────────────────┐
│  TOPEMS 企业管理平台              🔍 搜索  🔔 通知  🌙 主题 👤 │
├──────────────┬───────────────────────────────────────────────┤
│              │  首页 > 企业资源 > 资产台账                   │  ← 面包屑
│              ├───────────────────────────────────────────────┤
│              │  ← 返回    资产台账    🔍 搜索  ➕ 新增  ❓ 帮助 │  ← 页面头部
│              ├───────────────────────────────────────────────┤
│    侧边栏    │                                                │
│    导航      │                                                │
│              │                                                │
│  ┌────────┐  │                                                │
│  │ 🏠 概览│  │                                                │
│  ├────────┤  │                                                │
│  │📦 资产 │  │              页面内容区域                        │
│  ├────────┤  │                                                │
│  │💰 财务 │  │                                                │
│  ├────────┤  │                                                │
│  │📊 预算 │  │                                                │
│  ├────────┤  │                                                │
│  │⚙️ 设置 │  │                                                │
│  └────────┘  │                                                │
│              │                                                │
│              │                                                │
└──────────────┴───────────────────────────────────────────────┘
```

### 4.2 侧边栏导航

| 特性 | 说明 |
|------|------|
| 宽度 | 220px |
| 固定位置 | 左侧固定 |
| 激活状态 | 科技蓝背景 + 白色文字 |
| 折叠功能 | 支持收起为图标模式 |
| 动态生成 | 根据插件配置生成导航项 |

### 4.3 导航层次

| 级别 | 位置 | 功能 |
|------|------|------|
| L1 | 顶部栏 | 全局导航、搜索、通知 |
| L2 | 侧边栏 | 模块内页面切换 |
| L3 | 页面内部 | Tab标签、步骤器等 |

---

## 五、设计Token系统

### 5.1 颜色系统

#### 主色调

| Token | 色值 | 用途 |
|-------|------|------|
| `primary.main` | `#1e40af` | 品牌主色 |
| `primary.light` | `#3b82f6` | 按钮、链接 |
| `primary.dark` | `#1e3a8a` | 深色背景 |
| `primary.50` | `#eff6ff` | 背景色 |

#### 辅助色

| Token | 色值 | 用途 |
|-------|------|------|
| `secondary.main` | `#6366f1` | 次要操作 |
| `success.main` | `#22c55e` | 成功状态 |
| `warning.main` | `#f59e0b` | 警告状态 |
| `error.main` | `#ef4444` | 错误状态 |
| `info.main` | `#0ea5e9` | 信息状态 |

#### 灰色系统

| Token | 色值 | 用途 |
|-------|------|------|
| `grey.50` | `#f8fafc` | 页面背景 |
| `grey.100` | `#f1f5f9` | 卡片背景 |
| `grey.200` | `#e2e8f0` | 边框 |
| `grey.300` | `#cbd5e1` | 分隔线 |
| `grey.400` | `#94a3b8` | 占位符 |
| `grey.500` | `#64748b` | 次要文字 |
| `grey.600` | `#475569` | 图标颜色 |
| `grey.700` | `#334155` | 深色模式边框 |
| `grey.800` | `#1e293b` | 深色模式背景 |
| `grey.900` | `#0f172a` | 深色模式文字 |

### 5.2 间距系统

| Token | 值 | px值 | 用途 |
|-------|-----|------|------|
| `spacing.xs` | 0.5 | 4px | 元素内微小间距 |
| `spacing.sm` | 1 | 8px | 小间距 |
| `spacing.md` | 2 | 16px | 中等间距 |
| `spacing.lg` | 3 | 24px | 大间距 |
| `spacing.xl` | 4 | 32px | 超大间距 |
| `spacing.2xl` | 6 | 48px | 极大间距 |

### 5.3 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `borderRadius.none` | 0 | 无圆角 |
| `borderRadius.xs` | 4px | 微小圆角 |
| `borderRadius.sm` | 6px | 小圆角 |
| `borderRadius.md` | 8px | 中等圆角 |
| `borderRadius.lg` | 12px | 大圆角 |
| `borderRadius.xl` | 16px | 超大圆角 |
| `borderRadius.full` | 9999px | 圆形 |

### 5.4 阴影系统

| Token | 值 | 用途 |
|-------|-----|------|
| `shadows.none` | none | 无阴影 |
| `shadows.sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | 微小阴影 |
| `shadows.md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | 中等阴影 |
| `shadows.lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | 大阴影 |
| `shadows.xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | 超大阴影 |

---

## 六、组件设计规范

### 6.1 统计卡片组件

```tsx
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, trendValue }) => (
  <Card sx={{ borderRadius: 2, padding: 3, transition: 'transform 0.2s, boxShadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 } }}>
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Box>{icon}</Box>
      {trend && (
        <Chip 
          label={trendValue} 
          color={trend === 'up' ? 'success' : 'error'}
          size="small"
        />
      )}
    </Box>
    <Typography variant="h4" fontWeight={700} sx={{ mt: 2 }}>{value}</Typography>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
  </Card>
);
```

### 6.2 模块入口卡片

```tsx
interface ModuleCardProps {
  code: string;
  name: string;
  icon: React.ReactNode;
  status: 'running' | 'warning' | 'stopped';
  onClick: () => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ code, name, icon, status, onClick }) => {
  const statusColors = {
    running: { bg: 'success.main', label: '运行中' },
    warning: { bg: 'warning.main', label: '异常' },
    stopped: { bg: 'error.main', label: '离线' },
  };

  return (
    <Card 
      sx={{ 
        borderRadius: 2, 
        padding: 3, 
        cursor: 'pointer',
        transition: 'transform 0.2s, boxShadow 0.2s, borderColor 0.2s',
        border: 2,
        borderColor: 'grey.100',
        '&:hover': { 
          transform: 'translateY(-4px) scale(1.02)', 
          boxShadow: 3,
          borderColor: 'primary.main',
        }
      }}
      onClick={onClick}
    >
      <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          {icon}
        </Box>
        <Typography variant="h6" fontWeight={600}>{name}</Typography>
        <Typography variant="caption" color="text.secondary">{code.toUpperCase()}</Typography>
        <Chip 
          label={statusColors[status].label} 
          sx={{ mt: 2, bgcolor: statusColors[status].bg, color: 'white', fontSize: 10 }}
          size="small"
        />
      </Box>
    </Card>
  );
};
```

### 6.3 服务监控组件

```tsx
interface ServiceMonitorProps {
  health: number;
  requests: number;
  errors: number;
  services: Array<{ code: string; status: 'running' | 'warning' | 'stopped' }>;
  onRefresh: () => void;
}

export const ServiceMonitor: React.FC<ServiceMonitorProps> = ({ health, requests, errors, services, onRefresh }) => (
  <Card sx={{ borderRadius: 2, padding: 3 }}>
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <Activity sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={600}>服务状态监控</Typography>
      </Box>
      <IconButton onClick={onRefresh}><RefreshCw /></IconButton>
    </Box>
    
    <Box display="flex" gap={4} mb={3}>
      <Box>
        <Typography variant="body2" color="text.secondary">健康度</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: health >= 90 ? 'success.main' : health >= 70 ? 'warning.main' : 'error.main' }}>
          {health}%
        </Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">今日请求</Typography>
        <Typography variant="h5" fontWeight={700}>{requests.toLocaleString()}</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">异常服务</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: errors > 0 ? 'error.main' : 'success.main' }}>
          {errors}
        </Typography>
      </Box>
    </Box>
    
    <Box display="flex" flexWrap="wrap" gap={1}>
      {services.map(service => (
        <Chip 
          key={service.code}
          label={service.code.toUpperCase()}
          sx={{ 
            bgcolor: service.status === 'running' ? 'success.light' : service.status === 'warning' ? 'warning.light' : 'error.light',
            color: service.status === 'running' ? 'success.main' : service.status === 'warning' ? 'warning.main' : 'error.main',
            fontSize: 10,
            fontWeight: 500,
          }}
          size="small"
        />
      ))}
    </Box>
  </Card>
);
```

### 6.4 待办事项组件

```tsx
interface TodoItem {
  id: string;
  type: 'approval' | 'task' | 'reminder';
  title: string;
  assignee: string;
  deadline: string;
}

interface TodoListProps {
  items: TodoItem[];
  onItemClick: (id: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ items, onItemClick }) => (
  <Card sx={{ borderRadius: 2, padding: 3 }}>
    <Box display="flex" alignItems="center" gap={2} mb={3}>
      <ListTodo sx={{ color: 'primary.main' }} />
      <Typography variant="h6" fontWeight={600}>待办事项</Typography>
    </Box>
    
    <List>
      {items.map(item => (
        <ListItem button onClick={() => onItemClick(item.id)} key={item.id}>
          <ListItemIcon>
            {item.type === 'approval' && <GitBranch sx={{ color: 'primary.main' }} />}
            {item.type === 'task' && <CheckSquare sx={{ color: 'secondary.main' }} />}
            {item.type === 'reminder' && <Bell sx={{ color: 'warning.main' }} />}
          </ListItemIcon>
          <ListItemText 
            primary={item.title} 
            secondary={`${item.assignee} · 截止: ${item.deadline}`}
          />
        </ListItem>
      ))}
    </List>
  </Card>
);
```

---

## 七、响应式设计

### 7.1 断点配置

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| 桌面端 | ≥1200px | 4列模块卡片，完整布局 |
| 平板端 | 768-1199px | 3列模块卡片，监控区紧凑 |
| 移动端 | <768px | 2列模块卡片，顶部栏折叠 |

### 7.2 响应式适配策略

| 组件 | 桌面端 | 平板端 | 移动端 |
|------|--------|--------|--------|
| 顶部栏 | 完整显示 | 搜索框缩短 | 汉堡菜单折叠 |
| 统计卡片 | 4个并排 | 2行2列 | 2行2列 |
| 监控区 | 完整显示 | 紧凑模式 | 紧凑模式 |
| 模块卡片 | 4列 | 3列 | 2列 |
| 待办事项 | 完整显示 | 完整显示 | 折叠标题 |
| 侧边栏 | 固定显示 | 固定显示 | 抽屉式 |

---

## 八、动画与交互

### 8.1 页面加载动画

- 统计卡片：淡入 + 上滑
- 模块卡片：网格淡入
- 监控区：脉冲加载

### 8.2 悬停交互

- 统计卡片：上移 + 阴影
- 模块卡片：放大 + 边框高亮 + 阴影
- 服务状态：悬停显示详情

### 8.3 状态变化动画

- 服务状态变化：闪烁提示
- 待办事项更新：淡入
- 主题切换：平滑过渡

---

## 九、插件化适配

### 9.1 模块卡片动态生成

插件通过 `plugin.yaml` 声明模块信息：

```yaml
navigation:
  module_card:
    code: erp
    name: 企业资源
    icon: Building2
    path: /erp
    permission: erp:access
```

### 9.2 导航动态注册

```typescript
const registry = NavigationRegistry.getInstance();
registry.register('erp', {
  top_nav: [{ code: 'erp', label: '企业资源', path: '/erp' }],
  module_tabs: [...],
});
```

### 9.3 服务状态集成

插件启动时向核心平台注册，核心平台统一监控：

```typescript
await registerService('erp', {
  port: 8010,
  health_check: '/api/plugins/health',
});
```

---

## 十、实施计划

### 10.1 阶段规划

| 阶段 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| **阶段1** | 设计Token系统 | Week 1 | P0 |
| **阶段2** | 首页组件开发 | Week 2 | P0 |
| **阶段3** | 模块内导航开发 | Week 3 | P0 |
| **阶段4** | 响应式适配 | Week 4 | P1 |
| **阶段5** | 动画与交互优化 | Week 5 | P1 |
| **阶段6** | 插件化集成 | Week 6 | P1 |

### 10.2 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.0+ | UI框架 |
| TypeScript | 5.4+ | 类型系统 |
| MUI | v9.x | UI组件库 |
| Vite | 6.2+ | 构建工具 |
| @module-federation/vite | 1.0+ | 微前端 |
| Lucide React | 1.x | 图标库 |
| Zustand | 4.5+ | 状态管理 |

---

## 十一、验收标准

### 11.1 首页验收

- [ ] 顶部栏功能正常
- [ ] 统计卡片数据正确显示
- [ ] 服务监控实时更新
- [ ] 模块卡片动态生成
- [ ] 待办事项列表正常

### 11.2 模块内验收

- [ ] 侧边栏导航正常
- [ ] 面包屑导航正确
- [ ] 页面头部操作正常
- [ ] 返回功能正常

### 11.3 响应式验收

- [ ] 桌面端布局正常
- [ ] 平板端布局正常
- [ ] 移动端布局正常

### 11.4 插件化验收

- [ ] 插件模块卡片自动显示
- [ ] 插件导航动态注册
- [ ] 服务状态监控集成

---

**文档审批**

| 角色 | 签名 | 日期 |
|------|------|------|
|