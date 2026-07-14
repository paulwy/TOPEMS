# TOPEMS 文档中心

内网文档中心，基于 Docsify 构建，支持离线访问。

## 快速开始

### 本地启动

```bash
# 方式一：使用启动脚本
./start.sh 8080

# 方式二：使用 docsify-cli
npm install docsify-cli -g
docsify serve . -p 8080

# 方式三：使用 Python（简单替代）
python3 -m http.server 8080
```

访问地址：http://localhost:8080

## 与前端系统集成

文档中心已集成到 TOPEMS 前端系统的"帮助中心"页面中：

1. 在前端 `.env.local` 中配置文档中心地址：
```bash
VITE_DOCS_CENTER_URL=http://localhost:8080
```

2. 用户可通过以下路径访问：
   - 帮助中心 → 使用文档
   - 帮助中心 → 内网文档中心

3. 文档中心以新窗口打开，支持内网完全离线访问。

## 目录结构

```
docs-center/
├── index.html          # Docsify 入口
├── _sidebar.md         # 侧边栏导航配置
├── README.md           # 首页内容
├── start.sh            # 启动脚本
├── Dockerfile          # Docker 部署文件
└── user-manuals/       # 用户手册目录（软链接）
```

## 功能特性

| 功能 | 说明 |
|------|------|
| 全文搜索 | 文档内搜索 |
| 侧边栏导航 | 可折叠分类导航 |
| 上下章切换 | 文档翻页 |
| 代码高亮 | 代码块复制 |
| Markdown | 支持 GFM 语法 |
| 响应式 | 适配移动端 |

## 内网部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -t topems-docs .

# 运行容器
docker run -d -p 80:80 --name topems-docs topems-docs

# 访问地址
# http://localhost
```

### Nginx 部署

```bash
# 构建静态文件
npm install docsify-cli -g
docsify init .

# 配置 Nginx
server {
    listen 80;
    server_name _;
    root /path/to/docs-center;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 添加新文档

### 方式一：软链接（推荐）

```bash
# 创建软链接到已有文档
ln -s ../docs/superpowers/user-manuals ./user-manuals
```

### 方式二：直接复制

```bash
# 将 Markdown 文件复制到对应目录
cp /path/to/new-doc.md ./user-manuals/
```

### 更新侧边栏

编辑 `_sidebar.md` 添加新文档链接：

```markdown
- **分类名称**
  - [文档标题](./path/to/doc.md)
```

## 文档同步

文档修改后直接提交到 Git，部署时自动同步：

```bash
git add .
git commit -m "docs: update user manual"
git push
```

## 常见问题

### Q: 文档更新后搜索不生效？

清除浏览器缓存，或等待 search index 重建（约 1 分钟）。

### Q: Docker 部署后页面空白？

检查是否正确挂载文件：

```bash
docker run -d -p 80:80 \
  -v /path/to/docs-center:/usr/share/nginx/html \
  --name topems-docs topems-docs
```

### Q: 如何自定义主题？

编辑 `index.html` 中的 `window.$docsify` 配置，或添加自定义 CSS。

## 技术栈

- [Docsify](https://docsify.js.org/) - 文档站点生成器
- [nginx](https://nginx.org/) - Web 服务器

---

*最后更新：2026-06-23*
