# TOPEMS GIS 服务用户指南

## 概述

TOPEMS GIS 是一个厂区空间数字化系统，提供完整的地理信息管理能力，包括设备位置管理、管道管理、仓库管理、空间分析等功能。

### 主要特性

- ✅ 多租户架构支持
- ✅ 设备位置追踪与管理
- ✅ 管道网络管理
- ✅ 仓库位置管理
- ✅ 空间分析与GeoJSON导出
- ✅ 完整的权限控制系统
- ✅ Prometheus性能监控
- ✅ 完整的集成测试覆盖

## 快速开始

### 环境要求

- Rust 1.74+
- PostgreSQL 14+（需安装 PostGIS 扩展）
- Node.js 18+（前端）

### 服务启动

```bash
# 进入服务目录
cd svc/gis

# 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 启动服务（开发模式）
cargo run

# 或启动生产版本
cargo run --release
```

### 端口配置

服务支持通过环境变量配置端口：

```bash
# 使用 SERVER_PORT 环境变量
SERVER_PORT=8054 cargo run --release

# 或使用 PORT 环境变量
PORT=8054 cargo run --release
```

服务启动后默认监听 `http://localhost:8054`（可通过环境变量配置）

### 启动日志示例

```
2026-06-19T03:25:13.657274Z  INFO topems_shared::logging: ✅ topems-gis 日志系统初始化完成
2026-06-19T03:25:13.858516Z  INFO topems_gis: ✅ Prometheus 监控已初始化
2026-06-19T03:25:13.864628Z  INFO topems_gis: ✅ 连接到 PostgreSQL 数据库成功
2026-06-19T03:25:13.865096Z  INFO sqlx::postgres: notice: schema "gis" already exists, skipping
...
2026-06-19T03:25:13.875481Z  INFO topems_gis: ✅ 数据库表初始化成功
2026-06-19T03:25:13.877620Z  INFO topems_gis: 🚀 TOPEMS-GIS 厂区空间数字化系统启动中...
2026-06-19T03:25:13.877628Z  INFO topems_gis: 📦 端口: 8054
2026-06-19T03:25:13.877632Z  INFO topems_gis: 🔒 认证保护已启用
```

## API 端点

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/plugins/health` | 插件健康检查 |
| GET | `/api/gis/health/detailed` | 详细健康检查 |

### 厂区地图

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/factory-maps` | 获取厂区地图列表 |
| GET | `/api/gis/factory-maps/{id}` | 获取厂区地图详情 |
| POST | `/api/gis/factory-maps` | 创建厂区地图 |
| PUT | `/api/gis/factory-maps/{id}` | 更新厂区地图 |
| DELETE | `/api/gis/factory-maps/{id}` | 删除厂区地图 |

**创建厂区地图示例：**
```json
POST /api/gis/factory-maps
{
  "name": "第一厂区",
  "code": "FACTORY-001",
  "map_type": "2d",
  "file_url": "/maps/factory-001.png",
  "bounds": "[[116.0, 39.0], [116.5, 39.5]]",
  "description": "第一厂区平面图"
}
```

### 设备位置

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/device-locations` | 获取设备位置列表 |
| GET | `/api/gis/device-locations/{id}` | 获取设备位置详情 |
| GET | `/api/gis/device-locations/map/{map_id}` | 获取指定地图的设备位置 |
| POST | `/api/gis/device-locations` | 创建设备位置 |
| PUT | `/api/gis/device-locations/{id}` | 更新设备位置 |
| DELETE | `/api/gis/device-locations/{id}` | 删除设备位置 |

**创建设备位置示例：**
```json
POST /api/gis/device-locations
{
  "map_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "温度传感器-001",
  "device_code": "DEV-TEMP-001",
  "device_type": "sensor",
  "position": {"lat": 31.2304, "lng": 121.4737},
  "status": "active",
  "description": "仓库A区温度传感器"
}
```

### 管道管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/pipelines` | 获取管道列表 |
| GET | `/api/gis/pipelines/{id}` | 获取管道详情 |
| GET | `/api/gis/pipelines/map/{map_id}` | 获取指定地图的管道 |
| POST | `/api/gis/pipelines` | 创建管道 |
| PUT | `/api/gis/pipelines/{id}` | 更新管道 |
| DELETE | `/api/gis/pipelines/{id}` | 删除管道 |

**创建管道示例：**
```json
POST /api/gis/pipelines
{
  "map_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "供水管道A线",
  "code": "PIPE-WATER-A01",
  "pipeline_type": "water",
  "path": [
    {"lat": 31.2304, "lng": 121.4737},
    {"lat": 31.2310, "lng": 121.4740},
    {"lat": 31.2315, "lng": 121.4745}
  ],
  "status": "active"
}
```

### 仓库位置

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/warehouse-locations` | 获取仓库位置列表 |
| GET | `/api/gis/warehouse-locations/{id}` | 获取仓库位置详情 |
| GET | `/api/gis/warehouse-locations/map/{map_id}` | 获取指定地图的仓库位置 |
| POST | `/api/gis/warehouse-locations` | 创建仓库位置 |
| PUT | `/api/gis/warehouse-locations/{id}` | 更新仓库位置 |
| DELETE | `/api/gis/warehouse-locations/{id}` | 删除仓库位置 |

**创建仓库位置示例：**
```json
POST /api/gis/warehouse-locations
{
  "map_id": "550e8400-e29b-41d4-a716-446655440000",
  "warehouse_name": "成品仓库A",
  "zone": "A区",
  "position": {"lat": 31.2304, "lng": 121.4737},
  "capacity": 1000,
  "usage_rate": 75.5,
  "status": "active"
}
```

### 业务位置

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/business-locations` | 获取业务位置列表 |
| GET | `/api/gis/business-locations/{id}` | 获取业务位置详情 |
| GET | `/api/gis/business-locations/type/{business_type}` | 按类型获取业务位置 |
| POST | `/api/gis/business-locations` | 创建业务位置 |
| PUT | `/api/gis/business-locations/{id}` | 更新业务位置 |
| DELETE | `/api/gis/business-locations/{id}` | 删除业务位置 |

### 地图标记

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/map-markers` | 获取地图标记列表 |
| POST | `/api/gis/map-markers` | 创建地图标记 |
| DELETE | `/api/gis/map-markers/{id}` | 删除地图标记 |

### 位置照片

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/location-photos` | 获取位置照片列表 |
| GET | `/api/gis/location-photos/{id}` | 获取位置照片详情 |
| GET | `/api/gis/location-photos/map/{map_id}` | 获取指定地图的位置照片 |
| POST | `/api/gis/location-photos` | 创建位置照片 |
| DELETE | `/api/gis/location-photos/{id}` | 删除位置照片 |

### 地理数据

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/geodata` | 获取地理数据列表 |
| GET | `/api/gis/geodata/{id}` | 获取地理数据详情 |
| POST | `/api/gis/geodata/upload` | 上传地理数据 |
| PUT | `/api/gis/geodata/{id}` | 更新地理数据 |
| DELETE | `/api/gis/geodata/{id}` | 删除地理数据 |

### 空间分析

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/gis/spatial/buffer` | 缓冲区分析 |
| POST | `/api/gis/spatial/intersect` | 相交分析 |
| POST | `/api/gis/spatial/union` | 合并分析 |
| POST | `/api/gis/spatial/distance` | 距离计算 |
| POST | `/api/gis/spatial/point-in-polygon` | 点在多边形内判断 |

**缓冲区分析示例：**
```json
POST /api/gis/spatial/buffer
{
  "geometry": {"type": "Point", "coordinates": [121.4737, 31.2304]},
  "distance": 100,
  "unit": "meters"
}
```

### 统计与搜索

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/gis/statistics` | 获取GIS统计数据 |
| GET | `/api/gis/search?q={query}&type={type}` | 搜索位置 |
| GET | `/api/gis/export/geojson` | 导出GeoJSON数据 |

### 同步接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/gis/sync/device-locations` | 同步设备位置 |
| POST | `/api/gis/sync/batch-evidence` | 批量上传取证记录 |
| POST | `/api/gis/sync/download` | 下载数据 |
| GET | `/api/gis/sync/status` | 同步状态查询 |

## 数据模型

### DeviceLocation（设备位置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| map_id | UUID | 所属地图ID |
| device_name | String | 设备名称 |
| device_code | String | 设备编码 |
| device_type | String | 设备类型 |
| position | JSON | 位置坐标 {"lat": number, "lng": number} |
| status | String | 状态 (active/inactive) |
| description | String | 描述 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### Pipeline（管道）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| map_id | UUID | 所属地图ID |
| name | String | 管道名称 |
| code | String | 管道编码 |
| pipeline_type | String | 管道类型 |
| path | JSON | 路径坐标数组 |
| status | String | 状态 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

### WarehouseLocation（仓库位置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| map_id | UUID | 所属地图ID |
| warehouse_name | String | 仓库名称 |
| zone | String | 区域 |
| position | JSON | 位置坐标 |
| capacity | Integer | 容量 |
| usage_rate | Float | 使用率 |
| status | String | 状态 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

## 响应格式

所有API响应统一使用以下格式：

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "code": 404,
  "message": "资源未找到",
  "data": null
}
```

## 权限控制

系统使用 JWT token 进行身份验证，在请求头中携带：

```
Authorization: Bearer <token>
```

### 权限列表

| 权限 | 说明 |
|------|------|
| DeviceLocationRead | 设备位置读取 |
| DeviceLocationWrite | 设备位置写入 |
| PipelineRead | 管道读取 |
| PipelineWrite | 管道写入 |
| WarehouseLocationRead | 仓库位置读取 |
| WarehouseLocationWrite | 仓库位置写入 |
| FactoryMapRead | 厂区地图读取 |
| FactoryMapWrite | 厂区地图写入 |
| LocationPhotoWrite | 位置照片写入 |
| All | 所有权限 |

## 监控指标

服务提供 Prometheus 监控端点：

| 端点 | 描述 |
|------|------|
| GET | `/metrics` | Prometheus指标 |

### 监控指标列表

| 指标名 | 类型 | 说明 |
|--------|------|------|
| topems_gis_requests_total | Counter | 请求总数 |
| topems_gis_request_duration_seconds | Histogram | 请求时长 |
| topems_gis_db_queries_total | Counter | 数据库查询总数 |
| topems_gis_db_query_duration_seconds | Histogram | 数据库查询时长 |
| topems_gis_active_requests | Gauge | 活跃请求数 |
| topems_gis_memory_usage_bytes | Gauge | 内存使用量 |
| topems_gis_cache_hits_total | Counter | 缓存命中数 |
| topems_gis_cache_misses_total | Counter | 缓存未命中数 |

## 部署指南

### Docker 部署

```dockerfile
FROM rust:1.74-slim

WORKDIR /app

COPY . .

RUN cargo build --release

EXPOSE 3003

CMD ["./target/release/topems-gis"]
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接URL | postgres://topems:topems_secret@localhost:5432/topems |
| SERVER_PORT | 服务端口（优先） | 8054 |
| PORT | 服务端口（备选） | 8054 |
| JWT_SECRET | JWT密钥 | - |
| JWT_ALGORITHM | JWT算法 | HS256 |

## 故障排除

### 常见问题

**1. 数据库连接失败**
- 检查 DATABASE_URL 是否正确
- 确保 PostgreSQL 服务正在运行
- 确认数据库用户有权限访问

**2. PostGIS 扩展未安装**
```sql
-- 登录数据库执行
CREATE EXTENSION postgis;
```

**3. 权限验证失败**
- 检查 JWT token 是否有效
- 确认用户具有相应权限

**4. 性能问题**
- 检查 `/metrics` 端点查看性能指标
- 检查数据库查询耗时
- 考虑添加索引优化

## 测试

### 运行测试

```bash
# 运行所有测试
cargo test

# 运行单元测试
cargo test --lib

# 运行集成测试
cargo test --tests

# 运行特定测试
cargo test test_health_check
```

### 测试覆盖

集成测试覆盖以下功能模块：

- ✅ 数据库连接测试
- ✅ 厂区地图管理
- ✅ 设备位置管理
- ✅ 管道管理
- ✅ 仓库位置管理
- ✅ 业务位置管理
- ✅ 审计日志
- ✅ GeoJSON数据导出
- ✅ GIS统计查询
- ✅ 位置搜索
- ✅ 空间分析
- ✅ 地理数据管理
- ✅ 地图标记
- ✅ 位置照片

### 测试结果示例

```
running 9 tests
test middleware::tenant::tests::test_tenant_context_creation ... ok
test services::track_stats::tests::test_calculate_statistics ... ok
test services::track_stats::tests::test_calculate_statistics_empty ... ok
test services::track_stats::tests::test_calculate_statistics_single_point ... ok
test services::track_stats::tests::test_calculate_total_distance ... ok
test services::track_stats::tests::test_compress_track ... ok
test services::track_stats::tests::test_compress_track_short ... ok
test services::track_stats::tests::test_geo_position_haversine_distance ... ok
test services::track_stats::tests::test_position_json_format ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; filtered out; finished in 0.00s

running 14 tests
test tests::test_audit_log ... ok
test tests::test_create_business_location ... ok
test tests::test_create_device_location ... ok
test tests::test_create_factory_map ... ok
test tests::test_create_pipeline ... ok
test tests::test_create_warehouse_location ... ok
test tests::test_database_connection ... ok
test tests::test_geodata ... ok
test tests::test_geojson_export_query ... ok
test tests::test_gis_statistics ... ok
test tests::test_location_photos ... ok
test tests::test_map_markers ... ok
test tests::test_search_locations ... ok
test tests::test_spatial_analysis ... ok

test result: ok. 14 passed; 0 failed; 0 ignored; 0 measured; filtered out; finished in 0.06s
```

### API测试示例

使用 curl 测试服务：

```bash
# 健康检查
curl http://localhost:8054/health

# 获取GIS统计
curl http://localhost:8054/api/gis/statistics

# 获取Prometheus指标
curl http://localhost:8054/metrics

# 获取厂区地图列表（需要认证）
curl -H "Authorization: Bearer <token>" \
     http://localhost:8054/api/gis/factory-maps
```

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0.0 | 2024-01-01 | 初始版本 |
| v1.1.0 | 2026-06-19 | 完善GIS服务实现<br>- 修复数据库Schema引用问题（统一使用`gis.`前缀）<br>- 添加完整的集成测试（14个测试用例）<br>- 实现Prometheus性能监控<br>- 添加单元测试和集成测试文档<br>- 更新用户使用文档<br>- 优化API响应格式 |

## 数据库Schema说明

GIS服务使用独立的 `gis` schema，所有表都在该schema下：

### 主要表结构

- `gis.factory_maps` - 厂区地图
- `gis.device_locations` - 设备位置
- `gis.pipelines` - 管道
- `gis.warehouse_locations` - 仓库位置
- `gis.business_locations` - 业务位置
- `gis.map_markers` - 地图标记
- `gis.location_photos` - 位置照片
- `gis.geodata` - 地理数据
- `gis.geofeatures` - 地理要素
- `gis.spatial_analysis` - 空间分析记录
- `gis.locations` - 通用位置
- `gis.devices` - 设备注册
- `gis.device_location_records` - 设备位置记录
- `gis.audit_logs` - 审计日志

### 表关系

```
factory_maps (1) ─── (N) device_locations
                   ─── (N) pipelines
                   ─── (N) warehouse_locations
                   ─── (N) business_locations
                   ─── (N) map_markers
                   ─── (N) location_photos
```

## 联系支持

如有问题请联系开发团队。