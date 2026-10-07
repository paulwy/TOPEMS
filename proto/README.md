# proto/ 目录说明

本目录存放 TOPEMS 的 Protocol Buffers 接口定义。仓库历史上存在**两代布局并存**，本文件用于规范新域的写法。

## 两代布局

### 旧代（flat，根目录）—— 仅保留兼容，不再新增

```
proto/
├── auth.proto      # package topems.auth
├── core.proto      # package topems.core
└── health.proto    # package topems.health
```

特征：
- `.proto` 文件平铺在 `proto/` 根下；
- package 名为 `topems.<域>`（**无版本段**）；
- `go_package = "github.com/topems/proto/<域>"`；
- 跨文件 import 直接写 `import "core.proto"`（同目录相对引用）。

这是项目早期布局，仅为兼容现存生成代码而保留，**不要在根目录新增 .proto 文件**。

### 新风格（域/版本子目录）—— 新域一律走此布局

```
proto/topems/
├── erp/v1/erp.proto        # package topems.erp.v1
├── health/v1/health.proto   # package topems.health.v1
├── iam/v1/iam.proto         # package topems.iam.v1
└── wms/v1/wms.proto         # package topems.wms.v1
```

特征：
- 路径为 `proto/topems/<域>/v<版本>/<域>.proto`；
- package 名为 `topems.<域>.v<版本>`（**带版本段**）；
- `go_package = "topems/<域>/v<版本>;<域>v<版本>"`；
- 跨服务依赖统一 import 标准 well-known 类型（如 `google/protobuf/timestamp.proto`）。

## 新域规范

新增 gRPC 服务定义时：

1. **一律在 `proto/topems/<域>/v1/` 下新建**，禁止在 `proto/` 根目录平铺；
2. package 名格式 `topems.<域>.v1`；
3. `go_package` 格式 `topems/<域>/v1;<域>v1`；
4. 域命名与 `svc/<域>/` 服务目录、Cargo workspace 模块组保持一致；
5. 后续若需破坏性接口演进，新建 `v2/` 目录，**不要修改已发布的 v1**。

> 本文件为仓库卫生项 DIR-07 的交付物，仅补文档，未改动任何 .proto 文件。
