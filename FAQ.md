# TOPEMS 常见问题（FAQ）

## 概述

本文档收集了 TOPEMS 项目的常见问题和解答，帮助用户快速解决使用过程中遇到的问题。

## 目录

- [项目相关](#项目相关)
- [安装部署](#安装部署)
- [配置相关](#配置相关)
- [使用问题](#使用问题)
- [开发相关](#开发相关)
- [API 相关](#api-相关)
- [安全相关](#安全相关)
- [性能相关](#性能相关)
- [故障排查](#故障排查)
- [商业支持](#商业支持)

---

## 项目相关

### Q1: TOPEMS 是什么？

A: TOPEMS 是一个企业级数字化平台，集成了身份认证、文档管理、AI 协作、流程自动化、数据分析、质量管理、供应链管理等多种功能，为企业提供一站式数字化解决方案。

### Q2: TOPEMS 是开源的吗？

A: 是的，TOPEMS 采用 MIT 许可证开源。您可以免费使用、修改和分发。详见 [LICENSE](LICENSE) 文件。

### Q3: TOPEMS 支持哪些操作系统？

A: TOPEMS 支持主流操作系统：
- Linux（Ubuntu、CentOS、Debian、RHEL 等）
- macOS 12+
- Windows 10/11
- Docker 容器环境

### Q4: TOPEMS 的技术栈是什么？

A: TOPEMS 使用现代化技术栈：
- **后端**：Rust + Axum + SQLx
- **前端**：React + TypeScript + Vite + MUI
- **数据库**：PostgreSQL 16+（主）、MySQL 8.0+（可选）
- **缓存**：Redis 7+
- **AI**：Ollama 本地 LLM + 向量搜索
- **桌面端**：Tauri 2.0

### Q5: TOPEMS 有多少个服务？

A: TOPEMS 采用微服务架构，包含 28+ 个独立服务，涵盖核心服务、业务服务、制造服务、供应链服务、质量服务、分析服务等。详见 [端口配置规范](README.md#端口配置规范)。

### Q6: TOPEMS 的版本号如何命名？

A: TOPEMS 采用语义化版本号（Semantic Versioning）：`主版本号.次版本号.修订号`
- 主版本号：不兼容的 API 变更
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### Q7: 如何获取 TOPEMS 的最新动态？

A: 您可以通过以下方式获取最新动态：
- Watch 项目 GitHub 仓库
- 查看 [变更日志](CHANGELOG.md)
- 查看 [项目路线图](ROADMAP.md)
- 关注官方社交媒体
- 参加社区会议

---

## 安装部署

### Q8: 如何快速开始使用 TOPEMS？

A: 推荐使用一键启动方式：
```bash
# 1. 克隆项目
git clone <repository-url>
cd TOPEMS

# 2. 安装依赖
pnpm install

# 3. 编译项目
./scripts/topems.sh build-all --only-core

# 4. 启动所有服务
./scripts/topems.sh start-all
```
启动后访问 http://localhost:3000，默认账号 admin / admin123。

详见 [快速开始指南](README.md#快速开始)。

### Q9: 安装 TOPEMS 需要哪些系统要求？

A: 最低系统要求：
- **前端**：Node.js 20+, pnpm 8+
- **后端**：Rust 1.75+, Cargo
- **数据库**：PostgreSQL 16+
- **缓存**：Redis 7+（可选）
- **内存**：至少 4GB（推荐 8GB+）
- **磁盘**：至少 10GB 可用空间

### Q10: 必须使用 Docker 吗？

A: 不是必须的。TOPEMS 默认支持本地进程部署，Docker 仅作为可选的容器化打包方案。推荐本地安装 PostgreSQL 和 Redis 以获得更好的开发体验。

### Q11: 如何使用 Docker 部署？

A: 如果您希望使用 Docker：
```bash
cd docker
docker compose up -d
```
这会启动 PostgreSQL 和 Redis 容器。然后按照正常流程编译和启动 TOPEMS 服务。

### Q12: 支持哪些数据库？

A: TOPEMS 主要支持 PostgreSQL 16+，也支持 MySQL 8.0+。开发和测试环境可以使用 SQLite。生产环境推荐使用 PostgreSQL。

### Q13: 如何初始化数据库？

A: 使用 CLI 工具初始化数据库：
```bash
# 安装 CLI 工具
cd cli && pip3 install -e . && cd ..

# 初始化数据库
python3 -m topems_cli db init
python3 -m topems_cli db migrate
```

### Q14: 如何升级 TOPEMS？

A: 升级步骤：
1. 备份数据库和配置文件
2. 拉取最新代码：`git pull`
3. 更新依赖：`pnpm install`
4. 重新编译：`./scripts/topems.sh build-all`
5. 运行数据库迁移：`python3 -m topems_cli db migrate`
6. 重启服务：`./scripts/topems.sh restart-all`
7. 验证功能正常

详见 [发布策略](docs/deployment/release-strategies.md)。

---

## 配置相关

### Q15: 如何配置环境变量？

A: 复制环境变量示例文件并修改：
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，配置数据库连接、JWT 密钥等。`.env` 文件已添加到 `.gitignore`，不会被提交。

### Q16: JWT 密钥如何配置？

A: JWT 密钥必须配置，否则服务会启动失败。生成安全密钥：
```bash
# 使用 openssl 生成
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
然后在 `.env` 文件中配置：
```env
JWT_SECRET=<生成的密钥>
JWT_REFRESH_SECRET=<生成的另一个密钥>
```

**注意**：
- 密钥长度至少 32 个字符
- 不要使用默认值（如 `topems-secret`）
- 生产环境必须使用强密钥
- 两个密钥不要相同

### Q17: 如何修改服务端口？

A: 服务端口在 `lib/src/config/services.rs` 中配置。修改后需要重新编译后端。也可以通过环境变量覆盖端口配置。

详见 [端口配置规范](README.md#端口配置规范)。

### Q18: 如何配置 CORS？

A: 在 `.env` 文件中配置允许的源：
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```
多个源用逗号分隔。生产环境应配置为您的实际域名。

### Q19: 如何配置邮件服务？

A: 在 `.env` 文件中配置 SMTP 服务器：
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=TOPEMS <noreply@example.com>
```

### Q20: 如何配置 AI 模型？

A: TOPEMS 支持 Ollama 本地 LLM。安装并启动 Ollama：
```bash
# 安装 Ollama
brew install ollama

# 启动服务
ollama serve

# 拉取模型
ollama pull qwen2.5:7b-instruct
```
然后在 `.env` 文件中配置：
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
```

---

## 使用问题

### Q21: 默认管理员账号是什么？

A: 默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

**重要**：首次登录后请立即修改密码！

### Q22: 如何重置管理员密码？

A: 使用脚本重置密码：
```bash
./scripts/topems.sh reset-password admin 新密码
```
或使用开发脚本：
```bash
./scripts/dev/update-admin-password.sh admin 新密码
```

### Q23: 如何创建新用户？

A: 管理员可以通过以下方式创建用户：
1. 登录管理后台
2. 进入用户管理页面
3. 点击"新建用户"
4. 填写用户信息并分配角色
5. 保存

也可以通过 API 创建用户，详见 [API 文档](docs/api/README.md)。

### Q24: 支持哪些用户角色？

A: 系统预置了以下角色：
- `admin` - 超级管理员（拥有所有权限）
- `developer` - 开发人员
- `manager` - 部门经理
- `user` - 普通用户
- `guest` - 访客（只读权限）

管理员可以创建自定义角色并分配权限。

### Q25: 如何配置权限？

A: TOPEMS 使用基于角色的访问控制（RBAC）：
1. 创建角色并分配权限
2. 将角色分配给用户
3. 用户继承角色的所有权限

权限按模块分类，包括读取、写入、删除、管理等。详见 [权限管理系统](README.md#权限管理系统)。

### Q26: 如何使用 AI 功能？

A: 确保已配置并启动 AI 服务后：
1. 登录系统
2. 进入 AI 助手页面
3. 输入您的问题或请求
4. AI 会基于知识库和上下文给出回答

AI 支持智能问答、文档摘要、自动化建议等功能。

### Q27: 如何上传和管理文档？

A: 文档管理功能：
1. 进入文档管理页面
2. 点击"上传文档"
3. 选择文件并填写元数据
4. 文档会自动建立索引，支持 AI 检索

支持版本控制、协作编辑、权限管理等功能。

---

## 开发相关

### Q28: 如何搭建开发环境？

A: 开发环境搭建步骤：
1. 安装 Node.js 20+、Rust 1.75+、PostgreSQL 16+、Redis 7+
2. 克隆项目：`git clone <repository-url>`
3. 安装依赖：`pnpm install`
4. 配置环境变量：`cp .env.example .env` 并修改
5. 初始化数据库：`python3 -m topems_cli db init && migrate`
6. 启动开发服务：`./scripts/topems.sh start-all`

详见 [开发环境搭建](docs/development/backend/environment-setup.md)。

### Q29: 如何编译项目？

A: 使用统一脚本编译：
```bash
# 编译所有服务（推荐）
./scripts/topems.sh build-all

# 只编译核心服务
./scripts/topems.sh build-all --only-core

# 只编译后端
./scripts/topems.sh build-backend

# 只编译前端
./scripts/topems.sh build-frontend

# 编译单个服务
./scripts/topems.sh build erp
```

### Q30: 如何运行测试？

A: 运行测试：
```bash
# 运行所有测试
./scripts/topems.sh test-all

# 只运行后端测试
./scripts/topems.sh test-backend

# 只运行前端测试
./scripts/topems.sh test-frontend

# 运行后端单个测试
cargo test --package topems-erp

# 运行前端单个测试
cd apps/web && pnpm run test -- <test-name>
```

### Q31: 如何查看服务日志？

A: 查看服务日志：
```bash
# 查看所有服务状态
./scripts/topems.sh status

# 查看某个服务的日志
./scripts/topems.sh logs erp

# 查看最近 100 行日志
./scripts/topems.sh logs erp 100

# 实时跟踪日志
./scripts/topems.sh logs erp -f
```

### Q32: 如何添加新的业务服务？

A: 添加新服务的步骤：
1. 在 `svc/` 目录下创建新服务目录
2. 参考现有服务的结构创建代码
3. 在 `lib/src/config/services.rs` 中注册服务
4. 在 `Cargo.toml` 中添加工作区成员
5. 在端口配置规范中分配端口
6. 创建 API 文档
7. 编写测试

详见 [微服务开发指南](docs/development/backend/backend-services.md)。

### Q33: 代码规范是什么？

A: TOPEMS 有严格的代码规范：
- **Rust**：遵循 Rust 官方规范，使用 rustfmt 和 clippy
- **TypeScript/React**：遵循 ESLint 和 Prettier 配置
- **提交规范**：使用 Conventional Commits 格式

详见 [代码规范](docs/development/backend/code-standards.md) 和 [贡献指南](CONTRIBUTING.md)。

### Q34: 如何贡献代码？

A: 贡献代码流程：
1. Fork 项目到您的账户
2. 创建功能分支：`git checkout -b feat/功能描述`
3. 开发实现并编写测试
4. 提交代码（遵循提交规范）
5. 推送分支并创建 Pull Request
6. 响应代码审查意见
7. 审查通过后合并

详见 [贡献指南](CONTRIBUTING.md)。

---

## API 相关

### Q35: API 路径规范是什么？

A: 所有 API 路径统一为 `/api/core/{service}/v1` 格式：
```
GET /api/core/erp/v1/orders
POST /api/core/finance/v1/payments
GET /api/core/hrm/v1/employees
```

详见 [API 路径标准化规范](docs/architecture/api-path-standardization.md)。

### Q36: 如何进行 API 认证？

A: API 使用 JWT Bearer Token 认证：
1. 调用登录接口获取 Token：`POST /api/core/auth/v1/login`
2. 在后续请求的 Header 中携带 Token：
   ```
   Authorization: Bearer <your-token>
   ```
3. Token 过期后使用 Refresh Token 刷新

详见 [认证 API 文档](docs/api/API_AUTH.md)。

### Q37: 在哪里查看完整的 API 文档？

A: API 文档位置：
- [API 文档索引](docs/api/README.md) - 所有服务 API 文档入口
- [OpenAPI 规范](docs/api/openapi.yaml) - 完整 OpenAPI 3.0 规范
- 各服务 API 文档：`docs/api/API_*.md`

### Q38: API 支持哪些数据格式？

A: API 默认使用 JSON 格式：
- 请求：`Content-Type: application/json`
- 响应：`Content-Type: application/json`
- 字符编码：UTF-8

部分接口支持文件上传，使用 `multipart/form-data` 格式。

### Q39: API 错误码有哪些？

A: 常见 HTTP 状态码：
- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 无权限
- `404` - 资源不存在
- `409` - 冲突
- `422` - 验证失败
- `429` - 请求过于频繁
- `500` - 服务器内部错误

具体业务错误码详见各服务 API 文档。

### Q40: API 有速率限制吗？

A: 是的，API 有速率限制以防止滥用。默认限制：
- 认证接口：10 次/分钟/IP
- 普通接口：100 次/分钟/用户
- 批量接口：10 次/分钟/用户

超出限制会返回 `429 Too Many Requests`。

---

## 安全相关

### Q41: TOPEMS 有哪些安全特性？

A: TOPEMS 提供企业级安全保障：
- 身份认证（JWT + Refresh Token）
- 基于角色的访问控制（RBAC）
- 密码加密存储（bcrypt）
- SQL 注入防护
- XSS 防护
- CSRF 防护
- 输入验证和输出编码
- 操作审计日志
- 登录日志和异常检测
- 内容审核（AI 输入/输出）
- API 速率限制

详见 [安全最佳实践](docs/security/security-best-practices.md)。

### Q42: 如何报告安全漏洞？

A: 请不要在公开渠道报告安全漏洞，而是通过私密方式报告：
- 安全邮箱：[security@topems.example.com](mailto:security@topems.example.com)
- GitHub 安全通告：[提交安全通告](../../security/advisories/new)

我们会在 24-48 小时内响应，并尽快修复。

详见 [安全策略](SECURITY.md)。

### Q43: 密码是如何存储的？

A: 用户密码使用 bcrypt 算法加密存储，cost factor >= 12。数据库中只存储密码哈希，不存储明文密码。即使数据库泄露，攻击者也难以还原密码。

### Q44: 如何启用 HTTPS？

A: 生产环境必须启用 HTTPS：
1. 获取 SSL 证书（Let's Encrypt 或商业证书）
2. 配置反向代理（Nginx 或 Apache）
3. 在反向代理中配置 SSL 证书
4. 强制 HTTP 重定向到 HTTPS
5. 配置 HSTS 头

示例 Nginx 配置详见 [部署指南](docs/deployment/deployment-guide-overview.md)。

### Q45: 如何备份数据？

A: 定期备份数据库：
```bash
# PostgreSQL 备份
pg_dump -U topems topems > backup_$(date +%Y%m%d).sql

# 或使用脚本
./scripts/topems.sh db backup
```

建议：
- 每天自动备份
- 备份文件加密存储
- 异地备份
- 定期验证备份可恢复

---

## 性能相关

### Q46: TOPEMS 的性能如何？

A: TOPEMS 采用 Rust 后端，具有极高的性能：
- API 响应时间：通常 < 100ms
- 并发处理：支持数千并发连接
- 数据库查询：使用连接池和索引优化
- 缓存：Redis 缓存热点数据
- 静态资源：CDN 加速和浏览器缓存

具体性能数据详见 [性能基准报告](docs/benchmarks/)。

### Q47: 如何优化性能？

A: 性能优化建议：
1. **数据库**：
   - 为常用查询字段添加索引
   - 使用连接池
   - 优化慢查询
   - 读写分离（大规模部署）

2. **缓存**：
   - 启用 Redis 缓存
   - 缓存热点数据
   - 设置合理的缓存过期时间

3. **前端**：
   - 启用 Gzip/Brotli 压缩
   - 使用 CDN 加速静态资源
   - 启用浏览器缓存
   - 代码分割和懒加载

4. **服务器**：
   - 使用 SSD 存储
   - 增加内存
   - 负载均衡（多实例部署）

### Q48: 支持水平扩展吗？

A: 是的，TOPEMS 支持水平扩展：
- 无状态服务设计，支持多实例部署
- 使用 Redis 共享会话和缓存
- 使用消息队列解耦服务
- 支持负载均衡（Nginx、HAProxy 等）
- 数据库支持读写分离和主从复制

详见 [部署指南](docs/deployment/deployment-guide-overview.md)。

### Q49: 如何监控系统性能？

A: TOPEMS 提供完整的监控方案：
- **Prometheus**：指标采集和存储
- **Grafana**：可视化仪表盘
- **AlertManager**：告警管理
- **健康检查**：服务健康状态端点
- **日志管理**：结构化日志和集中收集

监控指标包括：CPU、内存、磁盘、网络、请求量、响应时间、错误率等。

---

## 故障排查

### Q50: 服务启动失败怎么办？

A: 服务启动失败常见原因和解决方法：

1. **JWT 密钥未配置或不合法**
   - 错误：`panicked at ... secret must NOT equal the built-in DEFAULT_JWT_SECRET`
   - 解决：生成新的随机密钥并配置到 `.env`

2. **数据库连接失败**
   - 错误：`Connection refused` 或 `password authentication failed`
   - 解决：检查数据库是否启动，确认连接配置正确

3. **端口被占用**
   - 错误：`Address already in use`
   - 解决：查找并停止占用端口的进程，或修改服务端口

4. **依赖缺失**
   - 错误：`cannot find crate` 或 `module not found`
   - 解决：运行 `pnpm install` 和 `cargo build` 安装依赖

5. **查看详细日志**
   ```bash
   ./scripts/topems.sh logs <service>
   ```

### Q51: 前端页面无法访问怎么办？

A: 排查步骤：
1. 确认前端服务已启动：`./scripts/topems.sh status`
2. 确认端口 3000 未被占用
3. 检查浏览器控制台是否有错误
4. 检查网络请求是否正常（F12 → Network）
5. 确认后端 API 服务正常运行
6. 清除浏览器缓存后重试

### Q52: 数据库连接失败怎么办？

A: 排查步骤：
1. 确认 PostgreSQL 服务已启动：`pg_isready` 或 `brew services list`
2. 确认数据库已创建：`createdb topems`
3. 检查 `.env` 中的数据库连接配置
4. 测试数据库连接：`psql -h localhost -U topems -d topems`
5. 检查防火墙是否阻止连接
6. 查看数据库日志

### Q53: AI 功能不工作怎么办？

A: 排查步骤：
1. 确认 Ollama 已安装并启动：`ollama serve`
2. 确认模型已拉取：`ollama list`
3. 测试 Ollama API：`curl http://localhost:11434/api/tags`
4. 检查 `.env` 中的 Ollama 配置
5. 查看 AI 服务日志：`./scripts/topems.sh logs ai`
6. 确认向量索引已初始化：`bash scripts/init-vector-index.sh`

### Q54: 忘记管理员密码怎么办？

A: 重置管理员密码：
```bash
./scripts/topems.sh reset-password admin 新密码
```
如果脚本不可用，可以直接修改数据库：
```sql
-- 生成新的密码哈希后更新数据库
UPDATE users SET password_hash = '新的哈希值' WHERE username = 'admin';
```

### Q55: 如何查看系统健康状态？

A: 查看系统健康状态：
```bash
# 查看所有服务状态
./scripts/topems.sh status

# 健康检查
./scripts/dev/health-check.sh

# 访问健康检查端点
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

健康检查端点返回：
- `/health` - 服务是否运行
- `/ready` - 服务是否准备好接收流量（包括数据库连接等）

---

## 商业支持

### Q56: 提供商业支持吗？

A: 是的，我们提供多种商业支持选项：
- **标准支持**：24 小时响应，邮件/工单支持
- **高级支持**：4 小时响应，7x24，电话支持
- **企业支持**：1 小时响应，7x24，专属顾问，现场支持

详见 [支持文档](SUPPORT.md#商业支持)。

### Q57: 提供定制开发服务吗？

A: 是的，我们提供定制开发服务：
- 功能定制开发
- 第三方系统集成
- UI/UX 定制
- 插件和扩展开发
- 数据迁移工具
- 性能优化

### Q58: 提供培训服务吗？

A: 是的，我们提供培训服务：
- 管理员培训
- 开发人员培训
- 最终用户培训
- 定制化培训课程
- 培训材料和认证

### Q59: 如何联系商业支持？

A: 联系商业支持：
- 商务邮箱：[business@topems.example.com](mailto:business@topems.example.com)
- 支持邮箱：[support@topems.example.com](mailto:support@topems.example.com)
- 官方网站：[https://topems.example.com](https://topems.example.com)

我们会在 1-2 个工作日内回复您的咨询。

---

## 其他

### Q60: 还有其他问题怎么办？

A: 如果本文档没有解答您的问题，可以：
1. 搜索 [GitHub Issues](../../issues) 查看是否有类似问题
2. 在 [GitHub Discussions](../../discussions) 提问
3. 查看 [完整文档](docs/)
4. 查看 [用户操作手册](docs/user-guide/UserManual.md)
5. 查看 [故障排查手册](docs/deployment/troubleshooting.md)
6. 联系 [商业支持](SUPPORT.md#商业支持)

---

## 反馈与贡献

本文档会持续更新。如果您发现错误或有补充建议，欢迎：
- 创建 [Issue](../../issues/new/choose) 反馈
- 提交 [Pull Request](../../pulls) 改进
- 在 [Discussions](../../discussions) 讨论

您的反馈对我们非常重要！

---

*本文档最后更新：2026-08-28*
*如有更新，请以最新版本为准。*
