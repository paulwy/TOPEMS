# topems-migrate

TOPEMS 多租户多服务数据库迁移工具。

基于 PostgreSQL，为 TOPEMS 各微服务（HRM、CRM、QMS、SRM、MES、WMS、AI 等）统一生成并管理 schema、索引与审计触发器的 SQL 迁移。

## 特性

- 多服务 / 多 schema 迁移管理
- 支持 pgvector 扩展与向量索引
- 审计触发器自动生成
- 生成 / 应用 / 回滚 / 状态查询一站式 CLI
- HTTP 服务模式，可作为迁移运维面板后端
- 支持 `DATABASE_URL` 环境变量

## 安装

### 全局安装（发布到内部 npm registry 后）

```bash
npm install -g topems-migrate
topems-migrate --version
```

### 本地开发

```bash
cd tools/migration-generator
npm install
npm link          # 在本地注册 topems-migrate 命令

# 直接通过 ts-node 运行源码
npx ts-node src/index.ts --version
./bin/topems-migrate.js --version
```

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 | — |
| `MIGRATION_OUTPUT_DIR` | 生成的迁移文件目录 | `./migrations` |
| `MIGRATION_SERVER_PORT` | `serve` 命令监听端口 | `8787` |

## 命令一览

```
topems-migrate <command> [options]

Commands:
  list-services                        列出所有可迁移服务
  generate <service> [--type]          生成指定服务的迁移
  apply <service> [--type] [--db]      生成并应用迁移
  rollback <service> [--version]       回滚迁移
  status <service>                     查看迁移状态
  bootstrap [--db] [--apply]           为所有服务生成迁移并可选应用
  create-schema <service> [--db]       创建指定服务 schema
  probe [--db]                         探测数据库连通性
  serve [--port] [--db] [--output]     启动 HTTP 迁移管理服务
  version                              显示版本号
  help                                 帮助
```

### 全局选项

- `-d, --db <url>`：数据库连接 URL（默认读取 `DATABASE_URL`）
- `-o, --output <dir>`：迁移文件输出目录（默认 `./migrations`）

## 常用命令示例

### 1. 列出可迁移服务

```bash
topems-migrate list-services
```

### 2. 生成迁移文件

`--type` 可选 `schema | index | audit | all`（默认 `all`）。命令会返回生成的文件名数组（JSON）：

```bash
# 为 ai 服务生成全部迁移
topems-migrate generate ai

# 仅为 hrm 生成索引与审计
topems-migrate generate hrm --type index,audit   # 注意: type 目前单选; 若需组合多次调用

# 为所有服务生成
topems-migrate generate all -o ./migrations
```

### 3. 生成并应用迁移

```bash
topems-migrate apply ai --db "postgresql://user:pass@localhost:5432/topems"
topems-migrate apply all
```

### 4. 回滚迁移

回滚为"标记性"回滚（从 `schema_migrations` 表移除最近或指定版本）。实际反向 SQL 需手动补充。

```bash
topems-migrate rollback                     # 回滚最近一次
topems-migrate rollback --version 20250609120000
```

### 5. 查看迁移状态

```bash
topems-migrate status
topems-migrate status hrm
```

### 6. Bootstrap（一键生成 + 可选应用）

```bash
topems-migrate bootstrap            # 仅生成所有服务迁移
topems-migrate bootstrap --apply    # 生成 + 创建 schema + 应用
```

### 7. 创建指定服务 schema

```bash
topems-migrate create-schema ai
```

### 8. 探测数据库连通性

```bash
topems-migrate probe
```

### 9. 启动 HTTP 迁移管理服务

```bash
topems-migrate serve --port 8787
```

可用端点：

| 端点 | 说明 |
| --- | --- |
| `GET /` / `GET /health` | 健康检查 & 元数据 |
| `GET /services` | 可用服务列表 |
| `GET /files` | 迁移文件列表 |
| `GET /status` | 迁移状态（需配置 DB） |
| `GET /probe` | 数据库连通性探测（需配置 DB） |

## 版本

```bash
topems-migrate --version
# 0.1.0
```

## License

MIT © TOPEMS Team
