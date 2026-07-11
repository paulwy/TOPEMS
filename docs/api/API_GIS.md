# TOPEMS-GIS 地理信息服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8071`

---

> **API 路径**: `/api/gis/`

## 目录

1. [服务概述](#1-服务概述)
2. [地图管理 API](#2-地图管理-api)
3. [地理数据 API](#3-地理数据-api)
4. [位置管理 API](#4-位置管理-api)
5. [设备定位 API](#5-设备定位-api)
6. [仓库地图 API](#6-仓库地图-api)
7. [管线管理 API](#7-管线管理-api)
8. [统计分析 API](#8-统计分析-api)
9. [搜索 API](#9-搜索-api)
10. [健康检查 API](#10-健康检查-api)

---

## 1. 服务概述

TOPEMS-GIS 是地理信息服务系统，提供地图管理、地理数据管理、设备定位、仓库可视化、管线管理等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 地图管理 API

### 2.1 获取地图列表

```
GET /api/gis/maps?page=1&page_size=20
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "工厂地图",
        "type": "factory",
        "zoom_level": 16,
        "center": { "lat": 31.2304, "lng": 121.4737 },
        "created_at": "2026-08-14"
      }
    ],
    "total": 10
  }
}
```

### 2.2 创建地图

```
POST /api/gis/maps
```

**请求体**：

```json
{
  "name": "工厂地图",
  "type": "factory",
  "zoom_level": 16,
  "center": { "lat": 31.2304, "lng": 121.4737 }
}
```

### 2.3 获取地图详情

```
GET /api/gis/maps/{id}
```

---

## 3. 地理数据 API

### 3.1 获取地理数据

```
GET /api/gis/geodata?type=building
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 类型（building/road/zone/pipeline） |
| map_id | string | 否 | 地图ID |

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "type": "building",
      "name": "办公楼A",
      "coordinates": [[121.4737, 31.2304], [121.4738, 31.2305]],
      "properties": { "floor": 5 }
    }
  ]
}
```

### 3.2 导入地理数据

```
POST /api/gis/geodata/import
```

**请求体**：

```json
{
  "map_id": "uuid",
  "data": [
    {
      "type": "zone",
      "name": "生产区",
      "coordinates": [[121.4737, 31.2304], [121.4738, 31.2305]],
      "properties": { "zone_type": "production" }
    }
  ]
}
```

---

## 4. 位置管理 API

### 4.1 获取位置列表

```
GET /api/gis/locations?page=1&page_size=20&zone=production
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "工位A01",
        "code": "LOC-A01",
        "zone": "production",
        "coordinates": { "lat": 31.2304, "lng": 121.4737 },
        "status": "active"
      }
    ],
    "total": 100
  }
}
```

### 4.2 创建位置

```
POST /api/gis/locations
```

**请求体**：

```json
{
  "name": "工位A01",
  "code": "LOC-A01",
  "zone": "production",
  "coordinates": { "lat": 31.2304, "lng": 121.4737 }
}
```

---

## 5. 设备定位 API

### 5.1 获取设备位置

```
GET /api/gis/devices/locations?device_id=uuid
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "device_id": "uuid",
      "device_name": "AGV-001",
      "coordinates": { "lat": 31.2304, "lng": 121.4737 },
      "timestamp": "2026-08-14T10:30:00Z",
      "status": "moving"
    }
  ]
}
```

### 5.2 更新设备位置

```
POST /api/gis/devices/locations
```

**请求体**：

```json
{
  "device_id": "uuid",
  "coordinates": { "lat": 31.2304, "lng": 121.4737 },
  "status": "moving"
}
```

### 5.3 获取设备轨迹

```
GET /api/gis/devices/tracks?device_id=uuid&start_time=2026-08-14T08:00:00Z&end_time=2026-08-14T12:00:00Z
```

---

## 6. 仓库地图 API

### 6.1 获取仓库地图数据

```
GET /api/gis/warehouse/{warehouse_id}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "warehouse_id": "uuid",
    "warehouse_name": "主仓库",
    "zones": [
      { "name": "A区", "color": "#FF0000", "coordinates": [...] },
      { "name": "B区", "color": "#00FF00", "coordinates": [...] }
    ],
    "locations": [
      { "id": "uuid", "code": "A01-001", "coordinates": { "lat": 31.2304, "lng": 121.4737 } }
    ]
  }
}
```

---

## 7. 管线管理 API

### 7.1 获取管线列表

```
GET /api/gis/pipelines?page=1&page_size=20&type=water
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "水管线A",
        "type": "water",
        "coordinates": [[121.4737, 31.2304], [121.4738, 31.2305]],
        "status": "normal",
        "length": 100
      }
    ],
    "total": 50
  }
}
```

### 7.2 创建管线

```
POST /api/gis/pipelines
```

**请求体**：

```json
{
  "name": "水管线A",
  "type": "water",
  "coordinates": [[121.4737, 31.2304], [121.4738, 31.2305]],
  "diameter": 100
}
```

---

## 8. 统计分析 API

### 8.1 获取空间统计

```
GET /api/gis/stats/zone-distribution
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "zones": [
      { "name": "生产区", "count": 50, "area": 10000 },
      { "name": "仓储区", "count": 30, "area": 8000 },
      { "name": "办公区", "count": 20, "area": 5000 }
    ]
  }
}
```

---

## 9. 搜索 API

### 9.1 搜索位置

```
GET /api/gis/search?q=工位A01
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "name": "工位A01",
      "type": "location",
      "coordinates": { "lat": 31.2304, "lng": 121.4737 }
    }
  ]
}
```

---

## 10. 健康检查 API

### 10.1 基础健康检查

```
GET /health
```

---

**版本**: 2.0.0
**最后更新**: 2026-08-14