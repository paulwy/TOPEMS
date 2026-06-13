# GIS模块实现指南

**日期**: 2026-06-13
**版本**: v1.0
**状态**: 已实施

---

## 1. 资源需求

### 1.1 硬件资源

| 资源类型 | 最低配置 | 推荐配置 | 说明 |
|----------|----------|----------|------|
| CPU | 2核 | 4核 | Rust服务对CPU要求不高 |
| 内存 | 512MB | 1GB | 考虑空间分析需求 |
| 磁盘 | 20GB | 50GB | 离线瓦片存储 |
| 网络 | 100Mbps | 1Gbps | 地图瓦片传输 |

### 1.2 软件依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 15+ | 主数据库 |
| PostGIS | 3.0+ | 空间数据支持 |
| Redis | 7+ | 缓存（可选） |
| Rust | 1.78+ | 后端服务 |
| Node.js | 18+ | 前端构建 |

### 1.3 外部服务

| 服务 | 必需 | 说明 |
|------|------|------|
| OSM | 否 | 开源地图源 |
| 高德地图 | 否 | 国内地图源（二选一） |
| IAM服务 | 是 | 认证授权 |

---

## 2. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (React + TypeScript)                │
├─────────────────────────────────────────────────────────────┤
│  MapModule │ TrackModule │ EvidenceModule │ HeatmapModule    │
└─────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Rust + Axum)                       │
├─────────────────────────────────────────────────────────────┤
│  /api/v1/devices  │  /api/v1/tracks  │  /api/v1/evidence │
├─────────────────────────────────────────────────────────────┤
│              Tenant Middleware (多租户隔离)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS                           │
│  device_locations │ track_records │ evidence_records        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 前端实现

### 3.1 目录结构

```
apps/web/src/components/gis/
├── modules/
│   ├── MapModule/              # 地图模块
│   │   ├── MapView.tsx
│   │   ├── LayerManager.tsx
│   │   ├── OfflineManager.tsx  # 离线管理
│   │   └── index.ts
│   ├── TrackModule/            # 轨迹模块
│   │   ├── TrackPanel.tsx
│   │   ├── TrackPlayer.tsx
│   │   └── index.ts
│   ├── EvidenceModule/         # 取证模块
│   │   ├── EvidencePanel.tsx
│   │   ├── PhotoCapture.tsx
│   │   ├── AudioCapture.tsx
│   │   ├── VideoCapture.tsx
│   │   └── index.ts
│   ├── HeatmapModule/          # 热力图模块
│   │   ├── HeatmapLayer.tsx
│   │   └── index.ts
│   ├── Map3DModule/            # 3D地图模块
│   │   ├── Map3DView.tsx
│   │   └── index.ts
│   └── shared/
│       ├── GisContext.tsx
│       └── types.ts
├── adapters/
│   ├── LeafletAdapter.tsx
│   └── AmapAdapter.tsx
└── GisPage.tsx
```

### 3.2 核心模块

#### MapModule (地图模块)

**职责**:
- 封装Leaflet地图操作
- 图层管理（设备点、轨迹、热力图等）
- 瓦片加载和缓存
- 离线地图支持

**接口**:

```typescript
// MapModule/types.ts
export interface MapModuleConfig {
  center: [number, number];    // [lat, lng]
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

#### TrackModule (轨迹模块)

**职责**:
- 轨迹数据获取和展示
- 轨迹播放控制
- 轨迹统计计算

**接口**:

```typescript
// TrackModule/types.ts
export interface TrackPoint {
  position: [number, number];
  timestamp: string;
  speed?: number;       // m/s
  heading?: number;     // 度
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
  total_distance: number;  // 米
  avg_speed: number;       // km/h
  max_speed: number;       // km/h
  duration: number;        // 秒
  point_count: number;
}
```

#### EvidenceModule (取证模块)

**职责**:
- 照片取证（摄像头调用）
- 录音取证（MediaRecorder API）
- 录像取证（MediaRecorder API）
- 取证记录管理

**接口**:

```typescript
// EvidenceModule/types.ts
export type EvidenceType = 'photo' | 'audio' | 'video';

export interface EvidenceRecord {
  id: string;
  title: string;
  evidence_type: EvidenceType;
  position: [number, number];
  file_url: string;
  thumbnail_url?: string;
  duration?: number;     // 音视频时长，秒
  file_size?: number;    // 字节
  file_hash?: string;    // SHA256
  recorded_by: string;
  recorded_at: string;
  tags?: string[];
  description?: string;
}
```

### 3.3 状态管理

使用React Context进行状态管理:

```typescript
// shared/GisContext.tsx
interface GisState {
  mapConfig: MapModuleConfig;
  devicePoints: DevicePoint[];
  activeTrack: TrackRecord | null;
  evidenceRecords: EvidenceRecord[];
  offlineMode: boolean;
  syncStatus: SyncStatus;
}

const GisContext = createContext<GisState | null>(null);
```

---

## 4. 后端实现

### 4.1 目录结构

```
svc/gis/src/
├── api/
│   ├── mod.rs
│   ├── device.rs          # 设备点位API
│   ├── track.rs           # 轨迹API
│   ├── evidence.rs        # 取证API
│   ├── sync.rs            # 离线同步API
│   └── openapi.rs         # OpenAPI文档
├── services/
│   ├── mod.rs
│   ├── track_stats.rs     # 轨迹统计服务
│   └── spatial.rs         # 空间分析服务
├── middleware/
│   ├── mod.rs
│   └── tenant.rs          # 多租户中间件
├── models.rs              # 数据模型
├── db/
│   ├── mod.rs
│   └── schema.rs          # 数据库schema
├── lib.rs
└── main.rs
```

### 4.2 数据库Schema

主要表结构:

```sql
-- 设备点位表
CREATE TABLE device_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    position JSONB NOT NULL,        -- {"lat": 31.23, "lng": 121.47}
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 轨迹记录表
CREATE TABLE track_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    device_id UUID NOT NULL,
    device_name VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_distance DECIMAL(12,2),  -- 米
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 轨迹位置点表
CREATE TABLE track_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES track_records(id),
    position JSONB NOT NULL,
    altitude DECIMAL(8,2),
    speed DECIMAL(8,2),            -- m/s
    heading DECIMAL(5,2),           -- 度
    accuracy DECIMAL(8,2),
    battery_level INTEGER,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 取证记录表
CREATE TABLE evidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(20) NOT NULL,  -- 'photo', 'audio', 'video'
    position JSONB,
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    duration INTEGER,               -- 秒
    file_size BIGINT,
    file_hash VARCHAR(64),
    recorded_by UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    tags TEXT[],
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 空间索引
CREATE INDEX idx_device_locations_position_gist ON device_locations USING GIST (position);
CREATE INDEX idx_track_positions_track_id ON track_positions(track_id);
CREATE INDEX idx_evidence_records_tenant ON evidence_records(tenant_id);
```

### 4.3 API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/devices` | GET | 获取设备列表 |
| `/api/v1/devices` | POST | 创建设备 |
| `/api/v1/tracks` | GET | 获取轨迹列表 |
| `/api/v1/tracks/{id}` | GET | 获取轨迹详情 |
| `/api/v1/tracks/{id}/statistics` | GET | 获取轨迹统计 |
| `/api/v1/evidence` | GET | 获取取证列表 |
| `/api/v1/evidence` | POST | 创建取证记录 |
| `/api/v1/sync/batch-upload` | POST | 批量上传位置 |
| `/api/v1/sync/offline-data` | GET | 下载离线数据 |
| `/health` | GET | 健康检查 |

### 4.4 多租户实现

```rust
// middleware/tenant.rs
#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

// 从请求中提取租户上下文
pub struct TenantRequest {
    pub ctx: TenantContext,
}

impl<S> FromRequestParts<S> for TenantRequest
where
    S: Send + Sync,
{
    type Rejection = ApiResponse<()>;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let tenant_ctx = parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or_else(|| ApiResponse::error(401, "缺少租户上下文"))?;

        Ok(TenantRequest { ctx: tenant_ctx })
    }
}
```

### 4.5 轨迹统计服务

```rust
// services/track_stats.rs
pub struct TrackStatisticsCalculator;

impl TrackStatisticsCalculator {
    /// 计算轨迹统计
    pub fn calculate(points: &[TrackPoint]) -> Option<TrackStatistics> {
        // Haversine公式计算距离
        // 速度统计（m/s -> km/h）
        // 时长计算
    }

    /// Douglas-Peucker轨迹压缩
    pub fn compress_track(points: &[TrackPoint], epsilon: f64) -> Vec<TrackPoint>;
}
```

---

## 5. 离线支持

### 5.1 前端离线管理

```typescript
// OfflineManager.tsx
interface OfflineManager {
  // 瓦片下载
  downloadTiles(bounds: Bounds, zoom: number): Promise<void>;

  // 数据同步
  syncPositions(positions: Position[]): Promise<SyncResult>;
  syncEvidence(evidence: EvidenceRecord[]): Promise<SyncResult>;

  // 状态查询
  getSyncStatus(): SyncStatus;
}
```

### 5.2 后端同步API

```rust
// api/sync.rs
pub async fn batch_upload_positions(
    State(pool): State<PgPool>,
    TenantRequest { ctx }: TenantRequest,
    Json(payload): Json<BatchPositionUpload>,
) -> Json<ApiResponse<usize>> {
    // 使用QueryBuilder批量插入优化
}
```

### 5.3 瓦片预下载工具

提供独立的 Node.js 脚本用于预下载地图瓦片。

**位置**: `scripts/tile-downloader.js`

**使用方法**:

```bash
# 下载上海市 OSM 瓦片 (缩放级别 10-16)
node scripts/tile-downloader.js --city 上海 --zoom 10-16 --source osm

# 下载浙江省 高德卫星图 (缩放级别 8-14)
node scripts/tile-downloader.js --province 浙江 --zoom 8-14 --source amap_satellite

# 下载指定区域
node scripts/tile-downloader.js --bounds 30.7,120.8,31.8,122.0 --zoom 12-18
```

**支持的瓦片源**:

| 源 | 说明 | 瓦片URL |
|----|------|---------|
| `osm` | OpenStreetMap | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `amap` | 高德地图 | `https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}` |
| `amap_satellite` | 高德卫星图 | `https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}` |

**支持的城市/省份**: 北京、上海、广州、深圳、杭州、成都、武汉、西安、天津、河北、山西、内蒙古、辽宁、吉林、黑龙江、江苏、浙江、安徽、福建、江西、山东、河南、湖北、湖南、广东、广西、海南、重庆、四川、贵州、云南、西藏、陕西、甘肃、青海、宁夏、新疆、台湾、香港、澳门、全国

**存储估算**:

| 区域 | 缩放级别 | 瓦片数 | 预估大小 |
|------|----------|--------|----------|
| 上海 | 10-16 | ~50,000 | ~500 MB |
| 浙江 | 8-14 | ~200,000 | ~2 GB |
| 全国 | 6-12 | ~5,000,000 | ~50 GB |

详细说明见: `scripts/README-tile-downloader.md`

---

## 6. 部署

### 6.1 Docker

```dockerfile
# svc/gis/Dockerfile
FROM rust:1.78-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser
COPY --from=builder /app/target/release/topems-gis /usr/local/bin/topems-gis

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8057/health || exit 1

USER appuser
EXPOSE 8057
CMD ["topems-gis"]
```

### 6.2 Kubernetes

```yaml
# deploy/k8s/gis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: topems-gis
  namespace: topems
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: gis
          image: topems-gis:latest
          ports:
            - containerPort: 8057
          livenessProbe:
            httpGet:
              path: /health
              port: 8057
          readinessProbe:
            httpGet:
              path: /health
              port: 8057
```

### 6.3 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 是 | - | PostgreSQL连接字符串 |
| `JWT_SECRET` | 是 | - | JWT签名密钥 |
| `IAM_SERVICE_URL` | 是 | http://localhost:8000 | IAM服务地址 |
| `RUST_LOG` | 否 | info | 日志级别 |
| `RUST_BACKTRACE` | 否 | 1 | 堆栈跟踪 |

---

## 7. 性能优化

### 7.1 数据库优化

- PostGIS GIST空间索引
- 批量插入使用`QueryBuilder`
- 轨迹数据分页查询

### 7.2 前端优化

- 瓦片懒加载
- 轨迹点虚拟列表
- React.memo减少重渲染

### 7.3 缓存策略

| 数据类型 | 缓存时间 | 策略 |
|----------|----------|------|
| 设备列表 | 5分钟 | Stale-While-Revalidate |
| 轨迹数据 | 10分钟 | Cache-First |
| 瓦片 | 7天 | IndexedDB本地缓存 |

---

## 8. 测试

### 8.1 后端测试

```bash
cd svc/gis
cargo test              # 运行所有测试
cargo test track_stats  # 运行轨迹统计测试
cargo clippy            # 代码检查
```

### 8.2 前端构建

```bash
cd apps/web
npm run build          # 构建生产版本
```

---

## 9. 监控

### 9.1 健康检查

- `/health` - 基础健康检查
- `/api/v1/health/detailed` - 详细依赖检查

### 9.2 指标

- 请求延迟
- 数据库连接池状态
- 缓存命中率

---

## 10. 实施清单

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | 数据库迁移执行 | ✅ |
| 2 | 后端服务部署 | ⬜ |
| 3 | 前端构建部署 | ⬜ |
| 4 | IAM服务配置 | ⬜ |
| 5 | 离线地图下载 | ⬜ |
| 6 | 集成测试 | ⬜ |
| 7 | 性能压测 | ⬜ |

---

## 11. 联系方式

- 技术负责人: TOPEMS Team
- 文档版本: v1.0
- 最后更新: 2026-06-13
