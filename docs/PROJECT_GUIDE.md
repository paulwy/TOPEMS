# TOPEMS 项目指南

## 目录

1. [项目概述](#项目概述)
2. [快速开始](#快速开始)
3. [项目结构](#项目结构)
4. [前端开发](#前端开发)
5. [后端开发](#后端开发)
6. [部署指南](#部署指南)
7. [贡献指南](#贡献指南)
8. [常见问题](#常见问题)

---

## 项目概述

TOPEMS 是一个企业级数字化平台，包含多个微服务，支持文档管理、AI 协作、流程自动化等功能。

### 技术栈

**前端:**
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS
- Zustand (状态管理)
- Lucide (图标)

**后端:**
- Rust + Axum
- PostgreSQL
- Redis (缓存)
- JWT (认证)

---

## 快速开始

### 前置要求

- Node.js 20.x
- Rust 1.70+
- PostgreSQL 14+
- Redis 7+

### 环境准备

```bash
# 克隆项目
git clone https://github.com/your-org/topems.git
cd topems

# 安装前端依赖
cd frontend
npm install

# 安装 Rust 工具链
cd ../
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 本地开发

```bash
# 启动数据库 (Docker)
docker-compose up -d postgres redis

# 启动前端开发服务器
cd frontend
npm run dev

# 启动后端服务 (在新终端)
cd services/topems-iam/backend
cargo run
```

---

## 项目结构

```
topems/
├── docs/                          # 文档
│   ├── OPTIMIZATION_REPORT.md    # 优化报告
│   └── CODE_REVIEW_REPORT.md     # 代码审查报告
├── scripts/                       # 脚本
│   ├── deploy-frontend.sh        # 前端部署脚本
│   └── deploy-backend.sh         # 后端部署脚本
├── frontend/                      # 前端代码
│   ├── src/
│   │   ├── components/           # 组件
│   │   ├── pages/               # 页面
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── api/                 # API 客户端
│   │   └── store/               # 状态管理
│   └── vite.config.ts           # Vite 配置
├── services/                      # 后端服务
│   └── topems-iam/              # IAM 服务
│       └── backend/
└── docker-compose.yml             # Docker 配置
```

---

## 前端开发

### 开发指南

#### 创建新页面

```bash
# 在 frontend/src/pages/ 下创建新页面
cat > frontend/src/pages/NewPage.tsx << 'EOF'
import React from 'react';

const NewPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Page</h1>
    </div>
  );
};

export default NewPage;
EOF
```

#### 路由配置

在 `App.tsx` 中添加路由:
```tsx
import React, { Suspense, lazy } from 'react';
const NewPage = lazy(() => import('./pages/NewPage'));

// 在 Routes 中添加
<Route path="/new" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
```

### 组件开发

#### 创建新组件

```tsx
// frontend/src/components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  title: string;
}

export const NewComponent: React.FC<NewComponentProps> = ({ title }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
};
```

### 性能优化建议

1. **使用 React.memo**
   - 当组件接收相同 props 时避免重渲染
   ```tsx
   export const ExpensiveComponent = React.memo(({ data }) => {
     return <div>{data}</div>;
   });
   ```

2. **使用 useMemo 和 useCallback**
   - 缓存计算结果和回调函数
   ```tsx
   const computedValue = useMemo(() => expensiveFn(data), [data]);
   const handleClick = useCallback(() => {}, []);
   ```

3. **代码分割**
   - 所有页面已使用 React.lazy 自动分割

### 样式指南

使用 Tailwind CSS:
```tsx
<div className="container mx-auto p-4">
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
    Click Me
  </button>
</div>
```

---

## 后端开发

### 开发指南

#### 创建新 API 端点

```rust
// services/topems-iam/backend/src/main.rs
async fn new_endpoint(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({"message": "ok"}), "Success"))
}

// 在路由中添加
Router::new()
    .route("/api/new", get(new_endpoint))
```

### 数据库操作

使用 SQLx:
```rust
// 查询
let user = sqlx::query_as!(
    User,
    "SELECT id, username, email FROM users WHERE id = $1",
    user_id
)
.fetch_one(&state.pool)
.await?;

// 更新
sqlx::query!(
    "UPDATE users SET email = $1 WHERE id = $2",
    new_email,
    user_id
)
.execute(&state.pool)
.await?;
```

### 性能最佳实践

1. **使用连接池**
   - 已配置，无需额外操作

2. **缓存热点数据**
   ```rust
   use crate::cache;
   
   async fn get_data(id: Uuid) -> Result<Data> {
       if let Some(data) = cache::cache_get(&id.to_string()).await {
           return Ok(data);
       }
       
       // 查询数据库...
       
       let data = db_query();
       cache::cache_set(&id.to_string(), data, Duration::minutes(10)).await;
       
       Ok(data)
   }
   ```

---

## 部署指南

### 前端部署

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 部署到 Nginx (示例)
sudo cp -r dist/* /var/www/topems/
sudo systemctl reload nginx
```

### 后端部署

```bash
# 1. 构建服务
cd services/topems-iam/backend
cargo build --release --features redis-cache

# 2. 部署
# 使用提供的 deploy-backend.sh 脚本
chmod +x ../../scripts/deploy-backend.sh
../../scripts/deploy-backend.sh
```

### 环境变量配置

创建 `.env` 文件:
```env
# Database
DATABASE_URL=postgres://user:password@localhost/topems_iam

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-super-secret-key-here

# Server
PORT=8002
HOST=0.0.0.0
```

---

## 贡献指南

### 开发流程

1. **Fork 仓库**
2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature
   ```
3. **开发和测试**
4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
5. **推送到远程**
   ```bash
   git push origin feature/your-feature
   ```
6. **创建 Pull Request**

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

| 类型 | 描述 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档更新 |
| style | 代码格式调整 |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具变动 |

### 代码审查清单

- [ ] 代码符合项目风格
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] TypeScript 类型完整
- [ ] 性能考虑周全

---

## 常见问题

### 前端

**Q: 如何解决 "Cannot find module" 错误?**

A: 确保路径正确，并重启开发服务器:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Q: 如何自定义 Tailwind 主题?**

A: 编辑 `frontend/tailwind.config.ts` 中的 `theme` 配置。

### 后端

**Q: 数据库迁移失败怎么办?**

A: 检查:
1. 数据库连接是否正常
2. 权限是否足够
3. 检查数据库中的现有表

**Q: 如何启用 Redis 缓存?**

A: 编译时添加 `--features redis-cache`:
```bash
cargo build --release --features redis-cache
```

---

## 附录

### 更多资源

- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [Axum 文档](https://docs.rs/axum/latest/axum/)
- [项目优化报告](./OPTIMIZATION_REPORT.md)
- [代码审查报告](./CODE_REVIEW_REPORT.md)

### 联系我们

- 问题反馈: GitHub Issues
- 讨论: GitHub Discussions
- 邮件: team@topems.example.com

---

**最后更新:** 2026-06-01
**版本:** v2.0
