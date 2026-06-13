# GIS模块模块化重构设计方案

**日期**: 2026-06-13
**版本**: v1.0
**状态**: 已实施
**选择方案**: B - 模块化重构

---

## 1. 背景与目标

### 1.1 现状问题

| 问题 | 描述 | 影响 |
|------|------|------|
| 代码臃肿 | MapView.tsx 约1400行，职责不清 | 维护困难，bug定位难 |
| 耦合严重 | 地图、轨迹、取证、热力图功能全部耦合 | 无法独立测试和部署 |
| 取证功能弱 | 仅支持照片，缺少录音录像取证能力 | 无法满足业务需求 |
| 离线支持差 | 仅支持在线地图 | 特殊场景无法使用 |
| 多租户缺失 | 硬编码租户ID | 无法支持多租户部署 |

### 1.2 重构目标

1. **前端模块化**: 拆分为地图模块、轨迹模块、取证模块
2. **后端服务化**: 按领域拆分微服务
3. **离线优先**: 支持离线地图和数据同步
4. **多租户支持**: 抽象租户隔离层
5. **全面取证**: 支持照片、录音、录像取证

### 1.3 约束条件

- 数据规模: <1000 设备/人员点位
- 部署方式: 私有化部署 + SaaS多租户
- 地图来源: OSM + 高德

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (React)                            │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  MapModule  │ TrackModule │ EvidenceModule│HeatmapModule│3DModule │
│  (地图)     │  (轨迹)     │   (取证)     │  (热力图)   │ (3D视图) │
├─────────────┴─────────────┴─────────────┴─────────────┴─────────┤
│                    GisContext (状态管理)                         │
├─────────────────────────────────────────────────────────────────┤
│                    API Client (统一入口)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端层 (Rust)                              │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│ device-svc  │  track-svc  │evidence-svc │  map-svc    │spatial-svc│
│  (设备)     │   (轨迹)    │   (取证)    │   (地图)    │ (空间分析)│
├─────────────┴─────────────┴─────────────┴─────────────┴─────────┤
│                    Tenant Middleware (多租户)                    │
├─────────────────────────────────────────────────────────────────┤
│                    PostgreSQL + PostGIS                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 前端模块划分

| 模块 | 职责 | 依赖 |
|------|------|------|
| `MapModule` | 地图渲染、图层管理、标记点显示 | 基础 |
| `TrackModule` | 轨迹展示、回放、统计分析 | MapModule |
| `EvidenceModule` | 取证采集（照片/录音/录像）、关联、查看 | MapModule |
| `HeatmapModule` | 热力图渲染、图例 | MapModule |
| `OfflineModule` | 离线地图瓦片、数据同步 | MapModule |

### 2.3 后端服务划分

| 服务 | 职责 | 数据库表 |
|------|------|----------|
| `device-svc` | 设备点位CRUD、状态管理 | device_locations |
| `track-svc` | 轨迹记录存储、统计 | device_location_records |
| `evidence-svc` | 取证文件管理、元数据 | evidence_records, evidence_files |
| `map-svc` | 地图配置、图层管理 | maps, map_layers |
| `spatial-svc` | 空间分析（缓冲区、相交等） | spatial_analysis |

---

## 3. 前端详细设计

### 3.1 目录结构

```
apps/web/src/components/gis/
├── modules/                      # 模块化组件
│   ├── MapModule/
│   │   ├── MapView.tsx          # 主地图组件（精简后约300行）
│   │   ├── LayerManager.tsx     # 图层管理器
│   │   ├── MapControls.tsx      # 地图控件（缩放、定位等）
│   │   ├── MapEvents.tsx        # 地图事件处理
│   │   ├── TileLayer.tsx        # 瓦片图层管理
│   │   └── OfflineManager.tsx   # 离线地图管理
│   ├── TrackModule/
│   │   ├── TrackPanel.tsx       # 轨迹面板
│   │   ├── TrackPlayer.tsx      # 轨迹播放器
│   │   ├── TrackStatistics.tsx  # 轨迹统计
│   │   └── TrackMarker.tsx      # 轨迹标记
│   ├── EvidenceModule/
│   │   ├── EvidencePanel.tsx    # 取证面板
│   │   ├── PhotoCapture.tsx     # 拍照取证
│   │   ├── AudioCapture.tsx     # 录音取证
│   │   ├── VideoCapture.tsx     # 录像取证
│   │   └── EvidenceList.tsx     # 取证记录列表
│   ├── HeatmapModule/
│   │   ├── HeatmapLayer.tsx      # 热力图组件
│   │   └── HeatmapLegend.tsx     # 热力图图例
│   └── shared/
│       ├── GisContext.tsx        # GIS上下文（重构）
│       ├── useGisControls.ts     # GIS控制hook
│       └── GisProvider.tsx       # GIS Provider
├── adapters/
│   ├── LeafletAdapter.tsx        # Leaflet适配器
│   ├── AmapAdapter.tsx           # 高德适配器
│   └── OfflineAdapter.tsx       # 离线适配器
├── GisPage.tsx                   # GIS主页面（协调器）
└── index.ts                      # 导出入口
```

### 3.2 核心组件设计

#### 3.2.1 MapModule (地图模块)

**职责**: 封装地图底层逻辑，提供统一接口

```typescript
// modules/MapModule/types.ts
export interface MapModuleConfig {
  center: [number, number];      // [lat, lng]
  zoom: number;
  tileSource: 'osm' | 'amap';
  offlineEnabled: boolean;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  type: 'device' | 'storage' | 'evidence';
  data: DevicePoint | StorageLocation | EvidenceRecord;
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  data: MapMarker[];
}
```

**MapView.tsx 职责（精简后）**:
- 初始化地图容器
- 协调子模块渲染
- 转发地图事件到子模块

#### 3.2.2 TrackModule (轨迹模块)

**职责**: 人员/设备轨迹追踪和回放

```typescript
// modules/TrackModule/types.ts
export interface TrackPoint {
  position: [number, number];
  timestamp: string;
  speed?: number;
  heading?: number;
  battery_level?: number;
}

export interface TrackRecord {
  id: string;
  device_id: string;
  device_name: string;
  points: TrackPoint[];
  start_time: string;
  end_time: string;
  total_distance: number;
}

export interface TrackStatistics {
  total_distance: number;     // 米
  avg_speed: number;           // km/h
  max_speed: number;           // km/h
  duration: number;            // 秒
  point_count: number;
}
```

**TrackPlayer.tsx 功能**:
- 播放/暂停/停止控制
- 播放速度调节（0.5x, 1x, 2x, 4x）
- 进度条拖拽
- 轨迹动画平滑处理

#### 3.2.3 EvidenceModule (取证模块)

**职责**: 照片、录音、录像取证功能

```typescript
// modules/EvidenceModule/types.ts
export type EvidenceType = 'photo' | 'audio' | 'video';

export interface EvidenceRecord {
  id: string;
  title: string;
  evidence_type: EvidenceType;
  position: [number, number];
  file_url: string;
  thumbnail_url?: string;
  duration?: number;              // 音视频时长，秒
  file_size?: number;              // 字节
  recorded_by: string;
  recorded_at: string;
  tags?: string[];
  description?: string;
}

export interface EvidenceCaptureConfig {
  maxDuration?: number;           // 最大录制时长，秒
  maxFileSize?: number;           // 最大文件大小，字节
  compressionQuality?: number;     // 压缩质量 0-1
  format?: 'mp4' | 'webm';        // 视频格式
}
```

**证据采集功能**:

| 功能 | 组件 | 说明 |
|------|------|------|
| 拍照取证 | PhotoCapture.tsx | 调用摄像头API，支持闪光灯、前后摄像头切换 |
| 录音取证 | AudioCapture.tsx | 录音API，支持暂停/恢复，显示录音时长 |
| 录像取证 | VideoCapture.tsx | 录像API，支持最长5分钟，实时预览 |
| 取证列表 | EvidenceList.tsx | 列表/网格视图，支持筛选、搜索 |
| 证据播放 | EvidencePlayer.tsx | 统一播放器，支持照片/音频/视频 |

#### 3.2.4 OfflineModule (离线模块)

**职责**: 离线地图和数据同步

```typescript
// modules/MapModule/OfflineManager.tsx
export interface OfflineConfig {
  tileBounds: [[number, number], [number, number]];  // 瓦片范围
  minZoom: number;
  maxZoom: number;
  tileSources: ('osm' | 'amap')[];
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingUploads: number;
  pendingDownloads: number;
}
```

**离线功能**:

1. **瓦片下载**: 按区域和级别下载地图瓦片
2. **离线数据**: 下载设备点位、轨迹等业务数据
3. **数据同步**: 网络恢复后自动上传离线期间采集的取证数据
4. **存储管理**: 定期清理过期离线数据

### 3.3 状态管理重构

**GisContext.tsx 精简后**:

```typescript
// modules/shared/GisContext.tsx
interface GisState {
  // 地图状态
  mapConfig: MapModuleConfig;
  visibleLayers: Set<string>;

  // 数据状态
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];

  // 轨迹状态
  activeTrack: TrackRecord | null;
  isPlaying: boolean;
  playbackSpeed: number;

  // 取证状态
  evidenceRecords: EvidenceRecord[];
  captureInProgress: boolean;

  // 离线状态
  offlineMode: boolean;
  syncStatus: SyncStatus;
}

type GisAction =
  | { type: 'SET_MAP_CONFIG'; payload: Partial<MapModuleConfig> }
  | { type: 'TOGGLE_LAYER'; payload: string }
  | { type: 'SET_ACTIVE_TRACK'; payload: TrackRecord | null }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'ADD_EVIDENCE'; payload: EvidenceRecord }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean };
```

---

## 4. 后端详细设计

### 4.1 目录结构

```
svc/gis/src/
├── api/                          # HTTP API
│   ├── mod.rs
│   ├── device.rs                 # 设备点位API
│   ├── track.rs                  # 轨迹API
│   ├── evidence.rs               # 取证API
│   ├── map.rs                    # 地图配置API
│   └── spatial.rs                # 空间分析API
├── services/                     # 业务逻辑
│   ├── device_service.rs
│   ├── track_service.rs
│   ├── evidence_service.rs
│   ├── map_service.rs
│   └── spatial_service.rs
├── models/                        # 数据模型
│   ├── mod.rs
│   ├── device.rs
│   ├── track.rs
│   ├── evidence.rs
│   ├── map.rs
│   └── spatial.rs
├── middleware/                    # 中间件
│   ├── tenant.rs                 # 多租户中间件
│   └── auth.rs                   # 认证中间件
├── db/                           # 数据库
│   ├── schema.rs
│   └── migrations/
└── lib.rs
```

### 4.2 多租户设计

**租户中间件**:

```rust
// middleware/tenant.rs
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

pub async fn tenant_middleware(
    claims: &Claims,
) -> Result<TenantContext, ApiResponse> {
    // 从JWT或header中提取租户ID
    let tenant_id = claims.tenant_id.ok_or_else(|| {
        ApiResponse::error(401, "Missing tenant_id")
    })?;

    Ok(TenantContext {
        tenant_id,
        user_id: claims.sub,
    })
}
```

**数据隔离策略**:

| 策略 | 适用场景 | 实现方式 |
|------|----------|----------|
| 行级隔离 | 小规模数据 | 每个表添加 tenant_id 列，查询时自动注入 |
| Schema隔离 | 中等规模 | 每个租户独立schema |
| 数据库隔离 | 大规模/高安全 | 每个租户独立数据库 |

**选择**: 私有化部署用行级隔离，SaaS部署用Schema隔离

### 4.3 取证服务设计

**Evidence表结构**:

```sql
CREATE TABLE gis.evidence_records (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(20) NOT NULL, -- 'photo', 'audio', 'video'
    position JSONB NOT NULL,
    file_url VARCHAR(1024),
    thumbnail_url VARCHAR(1024),
    duration INTEGER,           -- 音视频时长，秒
    file_size BIGINT,           -- 字节
    file_hash VARCHAR(64),      -- SHA256校验
    recorded_by UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    tags TEXT[],
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_tenant ON gis.evidence_records(tenant_id);
CREATE INDEX idx_evidence_position ON gis.evidence_records USING GIST(position);
CREATE INDEX idx_evidence_recorded_at ON gis.evidence_records(recorded_at);
```

**证据文件存储**:

```rust
// services/evidence_service.rs
pub enum StorageType {
    Local,      // 本地文件系统
    S3,         // AWS S3兼容对象存储
    Minio,      // MinIO私有对象存储
}

pub struct EvidenceFile {
    pub id: Uuid,
    pub evidence_id: Uuid,
    pub file_name: String,
    pub file_type: String,
    pub file_size: i64,
    pub file_hash: String,
    pub storage_type: StorageType,
    pub storage_path: String,
    pub created_at: DateTime<Utc>,
}
```

### 4.4 轨迹服务设计

**轨迹数据模型**:

```rust
// models/track.rs
pub struct TrackRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub device_id: Uuid,
    pub device_name: String,
    pub positions: Vec<TrackPosition>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_distance: f64,      // 米
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackPosition {
    pub position: Position,       // [lng, lat]
    pub altitude: Option<f64>,
    pub speed: Option<f64>,         // m/s
    pub heading: Option<f64>,       // 度
    pub accuracy: Option<f64>,      // 米
    pub battery_level: Option<i32>, // 百分比
    pub timestamp: DateTime<Utc>,
}
```

**轨迹统计计算**:

```rust
// services/track_service.rs
pub struct TrackStatistics {
    pub total_distance: f64,       // 米
    pub avg_speed: f64,            // km/h
    pub max_speed: f64,            // km/h
    pub min_speed: f64,            // km/h
    pub total_duration: i64,       // 秒
    pub point_count: i32,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

impl TrackService {
    pub async fn calculate_statistics(
        &self,
        track: &TrackRecord,
    ) -> TrackStatistics {
        // 计算总距离（使用Haversine公式）
        // 计算平均/最大/最小速度
        // 计算轨迹时长
        // ...
    }
}
```

---

## 5. API接口设计

### 5.1 设备点位API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 列表 | GET | `/api/v1/devices` | 分页列表，支持筛选 |
| 详情 | GET | `/api/v1/devices/{id}` | 获取单个设备 |
| 创建 | POST | `/api/v1/devices` | 创建设备 |
| 更新 | PUT | `/api/v1/devices/{id}` | 更新设备 |
| 删除 | DELETE | `/api/v1/devices/{id}` | 删除设备 |
| 位置更新 | POST | `/api/v1/devices/{id}/position` | 更新设备位置 |

### 5.2 轨迹API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取轨迹 | GET | `/api/v1/tracks/{device_id}` | 获取设备轨迹 |
| 轨迹统计 | GET | `/api/v1/tracks/{device_id}/statistics` | 轨迹统计 |
| 轨迹设备列表 | GET | `/api/v1/tracks/devices` | 有轨迹的设备 |
| 上报位置 | POST | `/api/v1/tracks/positions` | 批量上报位置 |

### 5.3 取证API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 列表 | GET | `/api/v1/evidence` | 取证记录列表 |
| 详情 | GET | `/api/v1/evidence/{id}` | 取证详情 |
| 创建 | POST | `/api/v1/evidence` | 创建取证记录 |
| 更新 | PUT | `/api/v1/evidence/{id}` | 更新取证 |
| 删除 | DELETE | `/api/v1/evidence/{id}` | 删除取证 |
| 上传文件 | POST | `/api/v1/evidence/{id}/upload` | 上传证据文件 |
| 下载文件 | GET | `/api/v1/evidence/{id}/download` | 下载证据文件 |

### 5.4 空间分析API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 缓冲区 | POST | `/api/v1/spatial/buffer` | 缓冲区分析 |
| 相交 | POST | `/api/v1/spatial/intersect` | 相交分析 |
| 包含 | POST | `/api/v1/spatial/within` | 包含分析 |
| 距离 | POST | `/api/v1/spatial/distance` | 距离计算 |
| 最近邻 | POST | `/api/v1/spatial/nearest` | 最近邻查询 |
| 聚类 | POST | `/api/v1/spatial/cluster` | 聚类分析 |

---

## 6. 数据流设计

### 6.1 人员轨迹追踪流程

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 设备GPS │───▶│ TrackModule │───▶│  track-svc  │───▶│  PostgreSQL │
│ 数据    │    │  (前端)     │    │  (后端)     │    │  (存储)     │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                      │
                      ▼
               ┌─────────────┐
               │  MapView    │  实时显示轨迹点
               │  (地图)     │
               └─────────────┘
```

### 6.2 取证流程

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│ PhotoCapture│───▶│ EvidenceModule   │───▶│ evidence-svc│
│ (拍照)      │    │ (前端)           │    │ (后端)      │
└─────────────┘    └──────────────────┘    └─────────────┘
                           │                       │
                           ▼                       ▼
                   ┌─────────────┐         ┌─────────────┐
                   │  预览/本地  │         │  文件存储   │
                   │  存储       │         │  (S3/Minio)│
                   └─────────────┘         └─────────────┘
```

---

## 7. 性能优化策略

### 7.1 前端优化

| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 懒加载 | 轨迹/取证模块按需加载 | 首屏加载减少30% |
| 虚拟列表 | 长轨迹点使用虚拟化 | 内存占用减少50% |
| Canvas渲染 | 热力图使用Canvas | 帧率提升至60fps |
| 瓦片缓存 | 离线瓦片本地缓存 | 离线可用 |

### 7.2 后端优化

| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 空间索引 | PostGIS GIST索引 | 查询加速100倍 |
| 批量插入 | 轨迹点批量写入 | 写入性能提升10倍 |
| 连接池 | PgBouncer连接池 | 并发能力提升5倍 |
| 轨迹压缩 | Douglas-Peucker算法 | 存储减少40% |

---

## 8. 实施计划

### 8.1 阶段划分

| 阶段 | 时间 | 内容 |
|------|------|------|
| Phase 1 | 第1-2周 | 前端模块化拆分（MapModule独立） |
| Phase 2 | 第3-4周 | 轨迹模块重构 |
| Phase 3 | 第5-6周 | 取证模块重构 |
| Phase 4 | 第7-8周 | 后端服务化 + 多租户 |
| Phase 5 | 第9-10周 | 离线支持 + 集成测试 |

### 8.2 里程碑

- [ ] M1: MapModule 独立，代码行数 < 400
- [ ] M2: TrackModule 功能完整
- [ ] M3: EvidenceModule 支持音视频取证
- [ ] M4: 多租户中间件完成
- [ ] M5: 离线模块支持
- [ ] M6: 全量集成测试通过

---

## 9. 风险与对策

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| 现有功能回归 | 高 | 中 | 自动化测试覆盖 |
| 离线同步冲突 | 中 | 低 | 冲突解决策略（时间戳/手动） |
| 大文件上传超时 | 中 | 中 | 分片上传、断点续传 |
| 多租户数据泄露 | 高 | 低 | 安全审查、隔离测试 |

---

## 10. 成功标准

1. **代码质量**: MapView.tsx 从 1400行 降至 400行以内
2. **功能完整性**: 所有现有功能正常工作
3. **性能指标**: 页面加载 < 2s，地图操作流畅
4. **测试覆盖**: 核心模块单元测试覆盖 > 80%
5. **文档完整**: API文档、部署文档、开发者文档齐全
