# Module Federation 开发工作流

## 服务状态

| 服务 | 端口 | 命令 | 状态 |
|------|------|------|------|
| **Host Shell** | 3000 | `cd apps/web && npm run dev` | ✅ 运行中 |
| **Core Remote** | 3001 | `cd apps/core && npm run preview` | ✅ 运行中 |

## 开发模式限制

### ⚠️ 重要限制

**@module-federation/vite** 对 Remote 模块的限制：

| 模式 | Host | Remote |
|------|------|--------|
| **dev** | ✅ 支持 | ❌ 不支持 |
| **preview** | ✅ 支持 | ✅ 支持 |
| **build** | ✅ 支持 | ✅ 支持 |

**原因**：Remote 模块在 dev 模式下使用 Vite 的 bundleless 特性，但 Module Federation 需要实际的文件（remoteEntry.js）来进行模块解析。

## 开发工作流

### 场景 1: 仅开发 Host Shell (apps/web)

```bash
# 终端 1: 启动 Host
cd apps/web && npm run dev
```

- 修改 Host 代码（如布局、路由、组件）：**热更新有效**
- 访问 http://localhost:3000

### 场景 2: 仅开发 Remote 模块 (apps/core)

```bash
# 终端 1: 构建并启动 Remote preview
cd apps/core && npm run build && npm run preview

# 终端 2: 启动 Host（如果需要测试集成）
cd apps/web && npm run dev
```

- 修改 Remote 代码后：**必须重新 `npm run build` 并重启 preview**
- 热更新对 Remote **不生效**

### 场景 3: 同时开发 Host 和 Remote

```bash
# 终端 1: 启动 Remote preview
cd apps/core && npm run build && npm run preview

# 终端 2: 启动 Host dev
cd apps/web && npm run dev
```

1. 开发 Host → 热更新有效
2. 开发 Remote → 重新构建并重启 preview

### 场景 4: 静态打包模式开发

适用于本地安装版本，不需要 Remote 服务：

```bash
cd apps/web
VITE_DEPLOYMENT_MODE=static npm run build
```

构建产物在 `apps/web/dist/`，包含所有模块的静态打包。

## 部署模式

### 1. Module Federation 模式 (SaaS)

```bash
# Host (动态加载 Remote)
VITE_DEPLOYMENT_MODE=module-federation npm run build

# Remote (独立部署)
cd apps/core && npm run build
```

### 2. 静态打包模式 (本地安装)

```bash
VITE_DEPLOYMENT_MODE=static npm run build
```

所有模块打包为单一部署单元，不需要 Remote 服务。

### 3. 混合模式 (私有化部署)

```bash
# 核心模块静态打包
VITE_DEPLOYMENT_MODE=static npm run build

# 插件动态加载（未来支持）
```

## 环境变量

创建 `apps/web/.env.local`：

```bash
# 部署模式: module-federation | static | hybrid
VITE_DEPLOYMENT_MODE=module-federation

# Remote 入口地址（仅 module-federation 模式使用）
VITE_CORE_REMOTE_ENTRY=http://localhost:3001/remoteEntry.js
```

## 调试技巧

### 1. 检查 Remote 是否可用

```bash
curl http://localhost:3001/remoteEntry.js
```

如果返回 JavaScript 代码则 Remote 正常；如果返回 HTML 说明 preview 未正确启动。

### 2. 检查 Module Federation 连接

在浏览器控制台执行：

```javascript
// 检查 remote 容器是否存在
window.topems_core

// 手动初始化共享模块
__webpack_init_sharing__('default')
```

### 3. Network 面板

在浏览器 DevTools 中查看：
- `remoteEntry.js` 请求是否成功
- 远程模块的 chunk 请求状态
- 共享模块的加载顺序

## 常见问题

### Q: Remote 修改后没有生效？

**A**: Remote 必须重新构建并重启 preview：

```bash
# 在 core 目录
npm run build && npm run preview
```

### Q: Host 访问 Remote 404？

**A**: 检查：
1. Remote preview 是否运行在端口 3001
2. `VITE_CORE_REMOTE_ENTRY` 环境变量是否正确
3. 防火墙是否允许 localhost 连接

### Q: 共享依赖版本冲突？

**A**: 确保 Host 和 Remote 的 `shared` 配置一致，特别是 `singleton: true` 的包。

### Q: DTS 类型下载失败？

**A**: 这是 preview 模式下的已知限制，不影响功能开发。类型定义仅用于 IDE 提示。

## 下一步

- [ ] 添加更多 Remote 模块（如 ERP、HRM）
- [ ] 实现插件动态发现机制
- [ ] 添加 Remote 模块健康检查
- [ ] 优化构建产物大小
