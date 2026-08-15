# GIS 模块技术文档

## 1. 概述

GIS（地理信息系统）模块是 TOPEMS 平台的地理信息服务核心，提供地图可视化、空间分析、设备追踪、地理围栏等功能，支持 WebSocket 实时数据推送。后端服务位于 `svc/gis/`，前端页面位于 `apps/web/src/pages/gis/`，API 客户端位于 `apps/web/src/api/gis/`。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 地图可视化 | 工厂地图、2D/3D 展示、图层管理、标记点渲染 |
| 空间分析 | 缓冲区、相交、合并、差异、包含、距离、最近邻、聚类（8 种） |
| 设备管理 | 设备点位管理、实时位置追踪、轨迹回放、状态监控 |
| 地理围栏 | 围栏创建、设备进出告警、停留超时检测 |
| 数据管理 | 管线、仓储位置、业务位置、地图标记的 CRUD |
| 数据导出 | GeoJSON 格式导出、数据导入 |
| WebSocket | 实时设备位置推送、地图协同 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      GIS 模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + Leaflet + Three.js)                        │
│  ├── pages/gis/                  # 4 条路由对应页面         │
│  └── modules/gis/config.ts                                   │
│      ├── source: plugin          # 插件模块                  │
│      ├── suite: platform         # 平台组                    │
│      └── order: 12                                           │
├─────────────────────────────────────────────────────────────┤
│  API 层 (TypeScript)                                        │
│  └── api/gis/index.ts            # 统一 API 客户端入口       │
│      ├── device / pipeline / storage / map / business       │
│      ├── 设备: listDevicePoints / getDeviceTrack            │
│      ├── 管线: listPipelines / CRUD                         │
│      ├── 仓储: listStorageLocations / CRUD                  │
│      ├── 地图: listFactoryMaps / CRUD                       │
│      └── 其他: search / exportGeoJSON / importData          │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL, svc/gis/)                    │
│  ├── main.rs                     # 端口 8071, api_prefix     │
│  │                               # /api/gis                  │
│  ├── cache.rs / monitoring.rs    # 缓存 / 健康监控           │
│  ├── db/schema.rs                # 数据库 Schema             │
│  ├── modules/                    # 19 个业务模块             │
│  │   ├── device / location / geofence / geodata              │
│  │   ├── map / marker / factory_map / pipeline               │
│  │   ├── warehouse / photo / business / spatial              │
│  │   ├── search / stats / sync / import_export               │
│  │   ├── websocket               # WebSocket 实时通信        │
│  │   └── openapi / gis_plugin                                │
│  ├── services/                                              │
│  │   ├── audit / tenant_service / track_stats               │
│  ├── middleware/tenant.rs        # 租户中间件                │
│  └── shared/permission.rs                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 服务配置

| 配置项 | 值 | 来源 |
|--------|-----|------|
| 服务端口 | 8071 | `architecture/ports.md` |
| API 前缀 | `/api/gis` | `svc/gis/src/main.rs` |
| 旧版前缀 | `/api/v1/gis`, `/api/core/gis/v1` | 兼容保留 |
| 环境变量 | `GIS_PORT` | `ports.md` |
| 最大数据库连接 | 20 | `main.rs` |
| 事件系统 | 禁用（唯一禁用事件的服务） | `main.rs` |
| RLS | 禁用 | `main.rs` |
| WebSocket | 启用（`/ws/gis`, `/ws/gis/map`, `/ws/gis/device/{code}`） | `main.rs` |
| 限流 | 200 请求/60 秒（按 IP） | `main.rs` |
| 插件类型 | business | `plugin.yaml` |
| SEARCH_PATH | `gis, public` | `main.rs` |

### 1.4 路由分层

GIS 模块的路由分为三层，安全级别递进：

| 层级 | 认证 | 路由示例 | 说明 |
|------|------|---------|------|
| system_routes | 无 | `/health`, `/metrics`, `/api-docs/openapi.json` | 系统监控 |
| public_business_routes | 无 | `GET /api/gis/statistics`, `GET /api/gis/geojson/export` | 公开查询 |
| protected_api | 认证 + 限流 | 所有 POST/PUT/DELETE + `POST /api/gis/spatial/*` | 写操作与空间分析 |

---

## 2. 核心功能详解

### 2.1 地图可视化

#### 2.1.1 2D地图视图

**功能说明**：基于Leaflet.js实现的交互式2D地图，支持缩放、平移、标记点点击等操作。

**使用示例**：

```tsx
import MapView from './components/gis/MapView';

const App = () => (
  <div style={{ height: '100vh' }}>
    <MapView
      devicePoints={devicePoints}
      pipelines={pipelines}
      storageLocations={storageLocations}
      onMarkerClick={(item) => console.log(item)}
    />
  </div>
);
```

**工具功能**：

| 工具 | 说明 | 快捷键 |
|------|------|--------|
| 选择工具 | 选择地图上的标记点 | - |
| 距离测量 | 多点连续测距 | ESC退出 |
| 面积测量 | 多边形面积计算 | ESC退出 |
| 绘点 | 在地图上标记单点 | ESC退出 |
| 绘线 | 绘制连续线段 | Enter完成 |
| 绘多边形 | 绘制封闭多边形 | Enter完成 |
| 热力图 | 密度/状态热力分布 | - |
| 3D视图 | 3D球体展示 | - |
| 轨迹追踪 | 设备历史轨迹播放 | - |

#### 2.1.2 3D地图视图

**功能说明**：基于React Three Fiber实现的3D球体展示，支持旋转、缩放、悬停查看详情。

**使用示例**：

```tsx
import Map3DView from './components/gis/Map3DView';

<Map3DView
  devicePoints={devicePoints}
  pipelines={pipelines}
  storageLocations={storageLocations}
  onClose={() => setShow3D(false)}
/>
```

**交互方式**：

| 操作 | 说明 |
|------|------|
| 左键拖拽 | 旋转视角 |
| 滚轮 | 缩放 |
| 悬停 | 查看设备详情 |
| 自动旋转 | 默认开启，可手动控制 |

### 2.2 空间分析

#### 2.2.1 热力图

**功能说明**：根据设备密度或状态生成热力分布图。

**两种模式**：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 密度模式 | 根据设备/仓储位置的密集程度显示热力 | 资源分布分析 |
| 状态模式 | 根据设备状态显示（正常/待处理/异常） | 设备健康监控 |

**热力图颜色映射**：

| 颜色 | 含义 | 强度 |
|------|------|------|
| 绿色 | 低密度/正常状态 | 0-30% |
| 黄色 | 中密度/待处理 | 30-50% |
| 橙色 | 较高密度 | 50-70% |
| 红色 | 高密度/异常状态 | 70-100% |

#### 2.2.2 空间分析API

**后端接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/gis/spatial/buffer` | POST | 缓冲区分析 |
| `/api/gis/spatial/intersect` | POST | 相交分析 |
| `/api/gis/spatial/union` | POST | 合并分析 |
| `/api/gis/spatial/difference` | POST | 差异分析 |
| `/api/gis/spatial/within` | POST | 包含分析 |
| `/api/gis/spatial/distance` | POST | 距离计算 |
| `/api/gis/spatial/nearest` | POST | 最近邻查询 |
| `/api/gis/spatial/cluster` | POST | 聚类分析 |

**缓冲区分析请求示例**：

```json
{
  "geometry": {
    "type": "Point",
    "coordinates": [121.4737, 31.2304]
  },
  "distance": 1000,
  "unit": "meters"
}
```

### 2.3 设备轨迹追踪

**功能说明**：追踪设备历史位置，支持轨迹播放、时间筛选、统计分析。

**使用示例**：

```tsx
import DeviceTrackPanel from './components/gis/DeviceTrackPanel';

<DeviceTrackPanel
  devicePoints={devicePoints}
  onClose={() => setShowTrack(false)}
/>
```

**轨迹统计指标**：

| 指标 | 说明 |
|------|------|
| 总距离 | 设备移动的总里程 |
| 平均速度 | 平均移动速度 |
| 最大速度 | 最大移动速度 |
| 轨迹点数 | 记录的位置点数量 |
| 时间范围 | 轨迹的起止时间 |

---

## 3. 数据模型

### 3.1 设备点位 (DevicePoint)

```typescript
interface DevicePoint {
  id: string;                    // 设备ID
  name: string;                  // 设备名称
  description?: string;          // 描述
  device_type: string;           // 设备类型
  latitude: number;              // 纬度 (-90 ~ 90)
  longitude: number;             // 经度 (-180 ~ 180)
  status: string;                // 状态 (active/pending/inactive)
  last_inspected?: string;       // 最后检查时间
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 3.2 管线 (Pipeline)

```typescript
interface Pipeline {
  id: string;                    // 管线ID
  name: string;                  // 管线名称
  code: string;                  // 管线编码
  pipeline_type: string;         // 管线类型
  start_point: [number, number]; // 起点坐标 [lat, lng]
  end_point: [number, number];   // 终点坐标 [lat, lng]
  status: string;                // 状态
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 3.3 仓储位置 (StorageLocation)

```typescript
interface StorageLocation {
  id: string;                    // 仓储ID
  name: string;                  // 仓储名称
  location_type: string;         // 位置类型
  latitude: number;              // 纬度
  longitude: number;             // 经度
  capacity?: number;             // 容量
  current_usage?: number;        // 当前用量
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 3.4 设备位置记录 (DeviceLocationRecord)

```typescript
interface DeviceLocationRecord {
  id: string;                    // 记录ID
  device_id: string;             // 设备ID
  device_name: string;           // 设备名称
  latitude: number;              // 纬度
  longitude: number;             // 经度
  timestamp: string;             // 时间戳
  accuracy?: number;             // 精度(米)
  speed?: number;                // 速度(km/h)
  heading?: number;              // 方向(度)
  battery_level?: number;        // 电量(%)
  created_at: string;            // 创建时间
}
```

---

## 4. API 接口文档

> 所有 API 路径前缀为 `/api/gis`（旧版 `/api/v1/gis` 兼容保留），服务端口 8071。

### 4.1 设备点位管理

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取设备列表 | GET | `/api/gis/device-locations` |
| 获取单个设备 | GET | `/api/gis/device-locations/:id` |
| 创建设备 | POST | `/api/gis/device-locations` |
| 更新设备 | PUT | `/api/gis/device-locations/:id` |
| 删除设备 | DELETE | `/api/gis/device-locations/:id` |
| 按地图筛选设备 | GET | `/api/gis/device-locations/map/:mapId` |

**GET /api/gis/device-locations**

请求参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码（可选） |
| page_size | number | 每页数量（可选） |
| status | string | 状态筛选（可选） |
| device_type | string | 设备类型筛选（可选） |

响应示例：

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "data": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

**POST /api/gis/device-locations**

请求体：

```json
{
  "name": "设备A",
  "device_type": "传感器",
  "latitude": 31.2304,
  "longitude": 121.4737,
  "status": "active",
  "description": "温度传感器"
}
```

### 4.2 管线管理

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取管线列表 | GET | `/api/gis/pipelines` |
| 获取单个管线 | GET | `/api/gis/pipelines/:id` |
| 创建管线 | POST | `/api/gis/pipelines` |
| 更新管线 | PUT | `/api/gis/pipelines/:id` |
| 删除管线 | DELETE | `/api/gis/pipelines/:id` |
| 按地图筛选管线 | GET | `/api/gis/pipelines/map/:mapId` |

### 4.3 仓储位置管理

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取仓储列表 | GET | `/api/gis/warehouse-locations` |
| 获取单个仓储 | GET | `/api/gis/warehouse-locations/:id` |
| 创建仓储 | POST | `/api/gis/warehouse-locations` |
| 更新仓储 | PUT | `/api/gis/warehouse-locations/:id` |
| 删除仓储 | DELETE | `/api/gis/warehouse-locations/:id` |

### 4.4 统计接口

**GET /api/gis/statistics**

响应示例：

```json
{
  "success": true,
  "message": "获取GIS统计数据成功",
  "data": {
    "device_points": 156,
    "pipelines": 23,
    "warehouse_locations": 12,
    "location_photos": 89,
    "business_locations": 45,
    "factory_maps": 5
  }
}
```

### 4.5 设备轨迹接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取设备轨迹 | GET | `/api/gis/device-tracks` |
| 获取轨迹统计 | GET | `/api/gis/device-tracks/:id/statistics` |
| 获取有轨迹的设备 | GET | `/api/gis/device-tracks/devices` |

**GET /api/gis/device-tracks**

请求参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| device_id | string | 设备ID（必填） |
| start_time | string | 开始时间（可选） |
| end_time | string | 结束时间（可选） |
| page | number | 页码（可选） |
| page_size | number | 每页数量（可选） |

---

## 5. 使用指南

### 5.1 前端集成

#### 5.1.1 安装依赖

```bash
cd apps/web
npm install leaflet react-leaflet @react-three/fiber @react-three/drei three --legacy-peer-deps
```

#### 5.1.2 引入样式

```tsx
import "leaflet/dist/leaflet.css";
```

#### 5.1.3 使用地图组件

```tsx
import React, { useState, useEffect } from 'react';
import MapView from './components/gis/MapView';
import { gisApi } from './api/gis';

const GisPage = () => {
  const [devicePoints, setDevicePoints] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [devices, pipes, storage] = await Promise.all([
      gisApi.listDevicePoints(),
      gisApi.listPipelines(),
      gisApi.listStorageLocations(),
    ]);
    setDevicePoints(devices.data?.data || []);
    setPipelines(pipes.data?.data || []);
    setStorageLocations(storage.data?.data || []);
  };

  return (
    <div className="min-h-screen">
      <MapView
        devicePoints={devicePoints}
        pipelines={pipelines}
        storageLocations={storageLocations}
      />
    </div>
  );
};

export default GisPage;
```

### 5.2 后端部署

#### 5.2.1 环境要求

| 依赖 | 版本 |
|------|------|
| Rust | >= 1.70 |
| PostgreSQL | >= 14 |
| PostGIS | >= 3.0 |

#### 5.2.2 数据库配置

```toml
# config/database.toml
[gis]
host = "localhost"
port = 5432
database = "topems_gis"
username = "postgres"
password = "password"
```

#### 5.2.3 启动服务

```bash
cd svc/gis
cargo run --release
```

---

## 6. 最佳实践

### 6.1 性能优化

**1. 数据缓存**：使用LocalStorage缓存GIS数据，设置5分钟TTL

```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_TTL) {
      return parsed.data;
    }
  }
  return null;
};
```

**2. 图层懒加载**：只加载当前视图范围内的数据

**3. 批量请求**：使用Promise.all并行获取多个数据

### 6.2 错误处理

**1. API错误处理**：

```typescript
try {
  const response = await gisApi.listDevicePoints();
  if (response.success) {
    setDevicePoints(response.data.data);
  } else {
    console.error('获取数据失败:', response.message);
  }
} catch (error) {
  console.error('网络错误:', error);
}
```

**2. 地图加载失败处理**：

```tsx
<MapContainer
  onError={(error) => {
    console.error('地图加载失败:', error);
    setMapError(true);
  }}
>
  {/* ... */}
</MapContainer>
```

### 6.3 安全注意事项

**1. 坐标验证**：确保经纬度在有效范围内

```typescript
const validateCoordinates = (lat: number, lng: number) => {
  if (lat < -90 || lat > 90) throw new Error('纬度必须在-90到90之间');
  if (lng < -180 || lng > 180) throw new Error('经度必须在-180到180之间');
};
```

**2. 权限控制**：验证用户是否有权限访问GIS数据

**3. SQL注入防护**：使用参数化查询，避免直接拼接SQL

---

## 7. 常见问题

### 7.1 地图不显示

**问题原因**：Leaflet CSS未正确引入

**解决方案**：

```tsx
import "leaflet/dist/leaflet.css";
```

### 7.2 热力图不更新

**问题原因**：地图移动时需要重新计算热力图

**解决方案**：监听地图move事件，重新渲染热力图

```typescript
map.on('move', () => {
  // 重新计算热力图
  updateHeatmap();
});
```

### 7.3 3D视图性能问题

**问题原因**：设备数量过多导致渲染压力

**解决方案**：
1. 限制同时显示的设备数量
2. 使用LOD（细节层次）技术
3. 启用WebGL硬件加速

### 7.4 跨域问题

**问题原因**：后端未配置CORS

**解决方案**：在后端配置CORS中间件

```rust
use axum::cors::CorsLayer;

let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any);
```

---

## 8. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-01-15 | 初始版本，基础地图功能 |
| 1.1.0 | 2024-02-20 | 添加空间分析API |
| 1.2.0 | 2024-03-10 | 添加热力图功能 |
| 1.3.0 | 2024-04-05 | 添加设备轨迹追踪 |
| 1.4.0 | 2024-05-20 | 添加3D视图功能 |
| 1.5.0 | 2024-06-11 | 完善测量工具、绘制功能 |

---

## 9. 开发维护

### 9.1 代码结构

```
apps/web/src/
├── api/gis/index.ts           # GIS API 客户端
├── modules/gis/config.ts      # 模块路由与导航配置
└── pages/gis/                 # GIS 页面组件

svc/gis/src/
├── main.rs                    # 服务入口（端口 8071）
├── cache.rs                   # 缓存
├── monitoring.rs              # 健康监控
├── db/schema.rs               # 数据库 Schema
├── modules/                   # 19 个业务模块
├── services/                  # 服务层
├── middleware/tenant.rs       # 租户中间件
└── shared/permission.rs       # 权限定义
```

### 9.2 开发流程

1. **需求分析**：明确功能需求和技术方案
2. **代码开发**：实现功能，遵循代码规范
3. **单元测试**：编写测试用例
4. **集成测试**：验证模块间集成
5. **代码审查**：提交PR进行审查
6. **部署上线**：部署到测试/生产环境

### 9.3 贡献指南

1. Fork项目仓库
2. 创建功能分支
3. 提交代码变更
4. 发起Pull Request
5. 等待代码审查
6. 合并到主分支

---

**文档版本**: v2.0 | **最后更新**: 2026-08-15 | **服务端口**: 8071 | **代码目录**: `svc/gis/`