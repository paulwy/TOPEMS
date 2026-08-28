# TOPEMS 服务级环境变量配置

## 目录结构

```
config/env/
├── _template.env.example      # 通用模板（所有服务共用，推荐使用）
└── .env.production.template   # 生产环境模板
```

## 通用模板使用方法

所有业务服务的环境变量结构相同，只有 `SEARCH_PATH` 和端口变量不同。

1. 复制通用模板：
   ```bash
   cp config/env/_template.env.example config/env/<service-name>.env
   ```

2. 修改【服务特定变量】部分：
   ```bash
   # 以 erp 服务为例
   SEARCH_PATH=erp,shared,public
   ERP_PORT=8010
   ```

3. 服务启动时加载：
   ```bash
   # 方式一：source
   source config/env/erp.env

   # 方式二：--env-file（如支持）
   ./target/release/topems-erp --env-file config/env/erp.env
   ```

## 服务变量对照表

完整的服务名、SEARCH_PATH、端口变量、默认端口对照表见 `_template.env.example` 文件头部注释，或从 `config/services.yaml` 读取。

## 与根目录 .env 文件的关系

- 根目录 `.env` / `.env.example`：**全栈统一配置**，包含所有服务的端口、数据库、Redis、AI 等全局变量，是本地开发的主配置文件
- `config/env/_template.env.example`：**单服务独立配置模板**，用于需要单独配置某个服务的场景（如生产环境多实例部署）
- `config/env/.env.production.template`：**生产环境模板**，用于生产部署

大多数情况下，本地开发只需使用根目录 `.env`，无需单独配置服务级 env。

## 历史说明

此前本目录下有 22 个服务级模板（ai.env.example、erp.env.example 等），每个仅 SEARCH_PATH 和端口不同，其余 27 行完全相同。为降低维护成本，已合并为单一通用模板 `_template.env.example`，服务特定变量在模板头部有完整对照表。
