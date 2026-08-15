#![allow(dead_code)]

//! GIS 领域纯函数工具集
//!
//! 提供坐标校验、距离计算、GeoJSON/WKT 解析、瓦片坐标转换等纯函数，
//! 全部为同步无副作用函数，不依赖数据库或外部服务。

use std::f64::consts::PI;

/// GIS 错误类型
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum GisError {
    #[error("Invalid coordinates: lat {lat}, lng {lng}")]
    InvalidCoordinates { lat: f64, lng: f64 },

    #[error("Invalid radius: {0}")]
    InvalidRadius(f64),

    #[error("Invalid GeoJSON: {0}")]
    InvalidGeoJson(String),

    #[error("Invalid WKT: {0}")]
    InvalidWkt(String),

    #[error("Geometry error: {0}")]
    Geometry(String),

    #[error("Tile out of range: z={z}, x={x}, y={y}")]
    TileOutOfRange { z: u32, x: u32, y: u32 },

    #[error("Invalid tile zoom level: {0}")]
    InvalidTileZoom(u32),

    #[error("Empty input")]
    EmptyInput,

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Value out of range: {0}")]
    OutOfRange(String),
}

/// 地球半径（公里）
const EARTH_RADIUS_KM: f64 = 6_371.0;

/// 1 公里 = 0.621371192 英里
const KM_TO_MILES: f64 = 0.621_371_192;

/// 1 英里 = 1.609344 公里
const MILES_TO_KM: f64 = 1.609_344;

/// Web Mercator 最大纬度（约 85.0511°）
const MAX_WEB_MERCATOR_LAT: f64 = 85.051_128_78;

/// 最大瓦片缩放级别（防止 2^z 溢出 u64）
const MAX_TILE_ZOOM: u32 = 30;

/// 校验经纬度坐标范围
///
/// - 纬度范围: [-90, 90]
/// - 经度范围: [-180, 180]
pub fn validate_coordinates(lat: f64, lng: f64) -> Result<(), GisError> {
    if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lng) {
        return Err(GisError::InvalidCoordinates { lat, lng });
    }
    Ok(())
}

/// 使用 Haversine 公式计算两点之间的球面距离（公里）
pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lng = (lng2 - lng1).to_radians();

    let a = (delta_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (delta_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_KM * c
}

/// 校验缓冲区半径（必须大于 0）
pub fn validate_buffer_radius(radius: f64) -> Result<(), GisError> {
    if !radius.is_finite() || radius <= 0.0 {
        return Err(GisError::InvalidRadius(radius));
    }
    Ok(())
}

/// 校验 GeoJSON Point 坐标
///
/// GeoJSON Point 坐标数组应有 2（[lng, lat]）或 3（[lng, lat, elevation]）个元素
pub fn validate_geojson_point(coords: &[f64]) -> Result<(), GisError> {
    if coords.is_empty() {
        return Err(GisError::EmptyInput);
    }
    if coords.len() < 2 || coords.len() > 3 {
        return Err(GisError::InvalidGeoJson(format!(
            "Point coordinates must have 2 or 3 elements, got {}",
            coords.len()
        )));
    }
    // 校验经纬度范围
    let lng = coords[0];
    let lat = coords[1];
    validate_coordinates(lat, lng).map_err(|_| {
        GisError::InvalidGeoJson(format!(
            "Point coordinates out of range: lat={}, lng={}",
            lat, lng
        ))
    })
}

/// 解析 WKT POINT 格式字符串
///
/// 支持格式: "POINT(lng lat)" 或 "POINT (lng lat)"，大小写不敏感
///
/// 返回 (lng, lat)
pub fn wkt_parse_point(wkt: &str) -> Result<(f64, f64), GisError> {
    let trimmed = wkt.trim();
    if trimmed.is_empty() {
        return Err(GisError::EmptyInput);
    }

    let lower = trimmed.to_lowercase();
    if !lower.starts_with("point") {
        return Err(GisError::InvalidWkt(format!(
            "Expected 'POINT', got prefix '{}'",
            &trimmed[..trimmed.len().min(10)]
        )));
    }

    // 找到括号内容
    let open = trimmed.find('(');
    let close = trimmed.rfind(')');
    match (open, close) {
        (Some(o), Some(c)) if c > o => {
            let inner = trimmed[o + 1..c].trim();
            if inner.is_empty() {
                return Err(GisError::InvalidWkt("Empty parentheses".to_string()));
            }
            let parts: Vec<&str> = inner.split_whitespace().collect();
            if parts.len() < 2 {
                return Err(GisError::InvalidWkt(format!(
                    "Expected 2 coordinates, got {}",
                    parts.len()
                )));
            }
            let lng: f64 = parts[0]
                .parse()
                .map_err(|e| GisError::ParseError(format!("Failed to parse lng: {}", e)))?;
            let lat: f64 = parts[1]
                .parse()
                .map_err(|e| GisError::ParseError(format!("Failed to parse lat: {}", e)))?;
            validate_coordinates(lat, lng)?;
            Ok((lng, lat))
        }
        _ => Err(GisError::InvalidWkt("Missing parentheses".to_string())),
    }
}

/// 瓦片坐标转经纬度（Web Mercator / Slippy Map 标准）
///
/// 返回瓦片左上角对应的经纬度
pub fn tile_to_latlng(z: u32, x: u32, y: u32) -> Result<(f64, f64), GisError> {
    if z > MAX_TILE_ZOOM {
        return Err(GisError::InvalidTileZoom(z));
    }
    let n = 1u64 << z;
    if (x as u64) >= n || (y as u64) >= n {
        return Err(GisError::TileOutOfRange { z, x, y });
    }

    let n_f = n as f64;
    let lng = x as f64 / n_f * 360.0 - 180.0;
    let lat_rad = (PI * (1.0 - 2.0 * y as f64 / n_f)).sinh().atan();
    let lat = lat_rad.to_degrees();

    Ok((lat, lng))
}

/// 经纬度转瓦片坐标（Web Mercator / Slippy Map 标准）
pub fn latlng_to_tile(z: u32, lat: f64, lng: f64) -> Result<(u32, u32), GisError> {
    validate_coordinates(lat, lng)?;
    if z > MAX_TILE_ZOOM {
        return Err(GisError::InvalidTileZoom(z));
    }

    let n = 1u64 << z;
    let n_f = n as f64;

    let x = ((lng + 180.0) / 360.0 * n_f).floor() as u32;

    // 将纬度限制在 Web Mercator 有效范围内
    let lat_clamped = lat.clamp(-MAX_WEB_MERCATOR_LAT, MAX_WEB_MERCATOR_LAT);
    let lat_rad = lat_clamped.to_radians();
    // asinh(tan(θ)) = ln(tan(θ) + sec(θ))
    let y = ((1.0 - (lat_rad.tan() + lat_rad.cos().recip()).ln() / PI) / 2.0 * n_f).floor() as u32;

    let x = x.min(n as u32 - 1);
    let y = y.min(n as u32 - 1);

    Ok((x, y))
}

/// 公里转英里
pub fn convert_km_to_miles(km: f64) -> f64 {
    km * KM_TO_MILES
}

/// 英里转公里
pub fn convert_miles_to_km(miles: f64) -> f64 {
    miles * MILES_TO_KM
}

/// 判断点是否在边界框内（包含边界）
///
/// 边界框由最小和最大经纬度定义
pub fn point_in_bbox(
    lat: f64,
    lng: f64,
    min_lat: f64,
    min_lng: f64,
    max_lat: f64,
    max_lng: f64,
) -> bool {
    lat >= min_lat && lat <= max_lat && lng >= min_lng && lng <= max_lng
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== validate_coordinates 测试 ====================

    #[test]
    fn test_validate_coordinates_valid() {
        assert!(validate_coordinates(31.2304, 121.4737).is_ok());
        assert!(validate_coordinates(0.0, 0.0).is_ok());
        assert!(validate_coordinates(-45.0, -90.0).is_ok());
    }

    #[test]
    fn test_validate_coordinates_boundary() {
        assert!(validate_coordinates(90.0, 180.0).is_ok());
        assert!(validate_coordinates(-90.0, -180.0).is_ok());
        assert!(validate_coordinates(90.0, -180.0).is_ok());
        assert!(validate_coordinates(-90.0, 180.0).is_ok());
    }

    #[test]
    fn test_validate_coordinates_lat_out_of_range() {
        assert!(validate_coordinates(90.1, 0.0).is_err());
        assert!(validate_coordinates(-90.1, 0.0).is_err());
        assert!(validate_coordinates(100.0, 0.0).is_err());
    }

    #[test]
    fn test_validate_coordinates_lng_out_of_range() {
        assert!(validate_coordinates(0.0, 180.1).is_err());
        assert!(validate_coordinates(0.0, -180.1).is_err());
        assert!(validate_coordinates(0.0, 360.0).is_err());
    }

    #[test]
    fn test_validate_coordinates_error_type() {
        let err = validate_coordinates(95.0, 0.0).unwrap_err();
        match err {
            GisError::InvalidCoordinates { lat, lng } => {
                assert_eq!(lat, 95.0);
                assert_eq!(lng, 0.0);
            }
            _ => panic!("Expected InvalidCoordinates error"),
        }
    }

    // ==================== haversine_distance 测试 ====================

    #[test]
    fn test_haversine_same_point() {
        let d = haversine_distance(31.2304, 121.4737, 31.2304, 121.4737);
        assert!((d - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_haversine_shanghai_beijing() {
        // 上海 (31.2304, 121.4737) 到 北京 (39.9042, 116.4074) 约 1068 公里
        let d = haversine_distance(31.2304, 121.4737, 39.9042, 116.4074);
        assert!(d > 1000.0 && d < 1200.0, "Expected ~1068 km, got {}", d);
    }

    #[test]
    fn test_haversine_short_distance() {
        // 同一街道两点，约 10 米
        let d = haversine_distance(31.2304, 121.4737, 31.2305, 121.4737);
        assert!(
            d > 0.0 && d < 0.1,
            "Expected very small distance, got {}",
            d
        );
    }

    #[test]
    fn test_haversine_equator_quarter_earth() {
        // 赤道上经度相差 90°，距离约 1/4 地球周长 ≈ 10018.75 km
        let d = haversine_distance(0.0, 0.0, 0.0, 90.0);
        assert!(d > 9900.0 && d < 10200.0, "Expected ~10018 km, got {}", d);
    }

    #[test]
    fn test_haversine_symmetric() {
        // 距离应该是对称的
        let d1 = haversine_distance(31.0, 121.0, 39.0, 116.0);
        let d2 = haversine_distance(39.0, 116.0, 31.0, 121.0);
        assert!((d1 - d2).abs() < 1e-9);
    }

    // ==================== validate_buffer_radius 测试 ====================

    #[test]
    fn test_validate_buffer_radius_valid() {
        assert!(validate_buffer_radius(1.0).is_ok());
        assert!(validate_buffer_radius(100.0).is_ok());
        assert!(validate_buffer_radius(0.001).is_ok());
        assert!(validate_buffer_radius(50000.0).is_ok());
    }

    #[test]
    fn test_validate_buffer_radius_zero() {
        assert!(validate_buffer_radius(0.0).is_err());
    }

    #[test]
    fn test_validate_buffer_radius_negative() {
        assert!(validate_buffer_radius(-1.0).is_err());
        assert!(validate_buffer_radius(-0.001).is_err());
    }

    #[test]
    fn test_validate_buffer_radius_nan_or_inf() {
        assert!(validate_buffer_radius(f64::NAN).is_err());
        assert!(validate_buffer_radius(f64::INFINITY).is_err());
        assert!(validate_buffer_radius(f64::NEG_INFINITY).is_err());
    }

    // ==================== validate_geojson_point 测试 ====================

    #[test]
    fn test_validate_geojson_point_2d() {
        assert!(validate_geojson_point(&[121.47, 31.23]).is_ok());
        assert!(validate_geojson_point(&[0.0, 0.0]).is_ok());
        assert!(validate_geojson_point(&[-180.0, -90.0]).is_ok());
    }

    #[test]
    fn test_validate_geojson_point_3d() {
        assert!(validate_geojson_point(&[121.47, 31.23, 10.0]).is_ok());
        assert!(validate_geojson_point(&[0.0, 0.0, 100.0]).is_ok());
    }

    #[test]
    fn test_validate_geojson_point_empty() {
        assert!(validate_geojson_point(&[]).is_err());
        match validate_geojson_point(&[]) {
            Err(GisError::EmptyInput) => {}
            other => panic!("Expected EmptyInput, got {:?}", other),
        }
    }

    #[test]
    fn test_validate_geojson_point_wrong_length() {
        assert!(validate_geojson_point(&[121.0]).is_err());
        assert!(validate_geojson_point(&[121.0, 31.0, 10.0, 20.0]).is_err());
    }

    #[test]
    fn test_validate_geojson_point_out_of_range() {
        assert!(validate_geojson_point(&[200.0, 31.0]).is_err());
        assert!(validate_geojson_point(&[121.0, 95.0]).is_err());
    }

    // ==================== wkt_parse_point 测试 ====================

    #[test]
    fn test_wkt_parse_point_standard() {
        let (lng, lat) = wkt_parse_point("POINT(121.47 31.23)").unwrap();
        assert!((lng - 121.47).abs() < 1e-6);
        assert!((lat - 31.23).abs() < 1e-6);
    }

    #[test]
    fn test_wkt_parse_point_with_space() {
        let (lng, lat) = wkt_parse_point("POINT (121.47 31.23)").unwrap();
        assert!((lng - 121.47).abs() < 1e-6);
        assert!((lat - 31.23).abs() < 1e-6);
    }

    #[test]
    fn test_wkt_parse_point_case_insensitive() {
        let (lng, lat) = wkt_parse_point("point(121 31)").unwrap();
        assert!((lng - 121.0).abs() < 1e-6);
        assert!((lat - 31.0).abs() < 1e-6);
    }

    #[test]
    fn test_wkt_parse_point_extra_whitespace() {
        let (lng, lat) = wkt_parse_point("  POINT(   121.47   31.23   )  ").unwrap();
        assert!((lng - 121.47).abs() < 1e-6);
        assert!((lat - 31.23).abs() < 1e-6);
    }

    #[test]
    fn test_wkt_parse_point_invalid_format() {
        assert!(wkt_parse_point("").is_err());
        assert!(wkt_parse_point("LINESTRING(1 2, 3 4)").is_err());
        assert!(wkt_parse_point("POINT()").is_err());
        assert!(wkt_parse_point("POINT(121)").is_err());
        assert!(wkt_parse_point("NOTPOINT(1 2)").is_err());
    }

    #[test]
    fn test_wkt_parse_point_missing_parens() {
        assert!(wkt_parse_point("POINT 121 31").is_err());
        assert!(wkt_parse_point("POINT(121 31").is_err());
        assert!(wkt_parse_point("POINT121 31)").is_err());
    }

    #[test]
    fn test_wkt_parse_point_out_of_range() {
        assert!(wkt_parse_point("POINT(200 31)").is_err());
        assert!(wkt_parse_point("POINT(121 95)").is_err());
    }

    // ==================== tile_to_latlng 测试 ====================

    #[test]
    fn test_tile_to_latlng_origin() {
        // z=0, x=0, y=0 是世界地图左上角
        let (lat, lng) = tile_to_latlng(0, 0, 0).unwrap();
        assert!((lat - 85.05112878).abs() < 0.001, "lat = {}", lat);
        assert!((lng - (-180.0)).abs() < 0.001, "lng = {}", lng);
    }

    #[test]
    fn test_tile_to_latlng_z1() {
        // z=1 将世界分为 2x2
        let (lat, lng) = tile_to_latlng(1, 1, 1).unwrap();
        // 右下瓦片左上角
        assert!((lat - 0.0).abs() < 0.001, "lat = {}", lat);
        assert!((lng - 0.0).abs() < 0.001, "lng = {}", lng);
    }

    #[test]
    fn test_tile_to_latlng_z1_top_left() {
        let (lat, lng) = tile_to_latlng(1, 0, 0).unwrap();
        assert!((lat - 85.05112878).abs() < 0.001, "lat = {}", lat);
        assert!((lng - (-180.0)).abs() < 0.001, "lng = {}", lng);
    }

    #[test]
    fn test_tile_to_latlng_out_of_range() {
        assert!(tile_to_latlng(1, 2, 0).is_err()); // x >= 2^1
        assert!(tile_to_latlng(1, 0, 2).is_err()); // y >= 2^1
        assert!(tile_to_latlng(2, 4, 0).is_err()); // x >= 2^2
    }

    #[test]
    fn test_tile_to_latlng_zoom_too_large() {
        assert!(tile_to_latlng(31, 0, 0).is_err());
        match tile_to_latlng(31, 0, 0) {
            Err(GisError::InvalidTileZoom(z)) => assert_eq!(z, 31),
            other => panic!("Expected InvalidTileZoom, got {:?}", other),
        }
    }

    // ==================== latlng_to_tile 测试 ====================

    #[test]
    fn test_latlng_to_tile_origin() {
        // 原点 (0, 0) 在 z=1 时应映射到瓦片 (1, 1)
        let (x, y) = latlng_to_tile(1, 0.0, 0.0).unwrap();
        assert_eq!(x, 1);
        assert_eq!(y, 1);
    }

    #[test]
    fn test_latlng_to_tile_top_left() {
        // 接近左上角的点
        let (x, y) = latlng_to_tile(1, 85.0, -180.0).unwrap();
        assert_eq!(x, 0);
        assert_eq!(y, 0);
    }

    #[test]
    fn test_latlng_to_tile_z0() {
        let (x, y) = latlng_to_tile(0, 31.0, 121.0).unwrap();
        assert_eq!(x, 0);
        assert_eq!(y, 0);
    }

    #[test]
    fn test_latlng_to_tile_roundtrip() {
        // 从经纬度转瓦片，再从瓦片转回，经度应接近
        let z = 10;
        let (x, y) = latlng_to_tile(z, 31.2304, 121.4737).unwrap();
        let (lat_back, lng_back) = tile_to_latlng(z, x, y).unwrap();
        // 经度误差应小于一个瓦片的宽度 (360/1024 ≈ 0.35°)
        assert!(
            (lng_back - 121.4737).abs() < 0.5,
            "lng diff = {}",
            (lng_back - 121.4737).abs()
        );
        // 纬度也应在合理范围内
        assert!(
            (lat_back - 31.2304).abs() < 0.5,
            "lat diff = {}",
            (lat_back - 31.2304).abs()
        );
    }

    #[test]
    fn test_latlng_to_tile_invalid_coords() {
        assert!(latlng_to_tile(1, 95.0, 0.0).is_err());
        assert!(latlng_to_tile(1, 0.0, 200.0).is_err());
    }

    #[test]
    fn test_latlng_to_tile_zoom_too_large() {
        assert!(latlng_to_tile(31, 0.0, 0.0).is_err());
    }

    // ==================== convert_km_to_miles 测试 ====================

    #[test]
    fn test_convert_km_to_miles_zero() {
        assert!((convert_km_to_miles(0.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_convert_km_to_miles_one() {
        let result = convert_km_to_miles(1.0);
        assert!(
            (result - 0.621371).abs() < 0.001,
            "Expected ~0.6214, got {}",
            result
        );
    }

    #[test]
    fn test_convert_km_to_miles_hundred() {
        let result = convert_km_to_miles(100.0);
        assert!(
            (result - 62.1371).abs() < 0.01,
            "Expected ~62.14, got {}",
            result
        );
    }

    #[test]
    fn test_convert_km_to_miles_negative() {
        let result = convert_km_to_miles(-10.0);
        assert!(result < 0.0);
        assert!((result - (-6.21371)).abs() < 0.01);
    }

    // ==================== convert_miles_to_km 测试 ====================

    #[test]
    fn test_convert_miles_to_km_zero() {
        assert!((convert_miles_to_km(0.0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_convert_miles_to_km_one() {
        let result = convert_miles_to_km(1.0);
        assert!(
            (result - 1.609344).abs() < 0.001,
            "Expected ~1.6093, got {}",
            result
        );
    }

    #[test]
    fn test_convert_miles_to_km_hundred() {
        let result = convert_miles_to_km(100.0);
        assert!(
            (result - 160.9344).abs() < 0.01,
            "Expected ~160.93, got {}",
            result
        );
    }

    #[test]
    fn test_convert_miles_to_km_negative() {
        let result = convert_miles_to_km(-10.0);
        assert!(result < 0.0);
        assert!((result - (-16.09344)).abs() < 0.01);
    }

    // ==================== 单位转换往返测试 ====================

    #[test]
    fn test_convert_km_miles_roundtrip() {
        let original = 42.195; // 马拉松距离
        let roundtrip = convert_miles_to_km(convert_km_to_miles(original));
        assert!(
            (roundtrip - original).abs() < 0.001,
            "Roundtrip = {}",
            roundtrip
        );
    }

    #[test]
    fn test_convert_miles_km_roundtrip() {
        let original = 26.2; // 马拉松英里数
        let roundtrip = convert_km_to_miles(convert_miles_to_km(original));
        assert!(
            (roundtrip - original).abs() < 0.001,
            "Roundtrip = {}",
            roundtrip
        );
    }

    // ==================== point_in_bbox 测试 ====================

    #[test]
    fn test_point_in_bbox_inside() {
        assert!(point_in_bbox(31.0, 121.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(0.0, 0.0, -1.0, -1.0, 1.0, 1.0));
    }

    #[test]
    fn test_point_in_bbox_outside() {
        assert!(!point_in_bbox(40.0, 121.0, 30.0, 120.0, 32.0, 122.0));
        assert!(!point_in_bbox(31.0, 130.0, 30.0, 120.0, 32.0, 122.0));
    }

    #[test]
    fn test_point_in_bbox_on_corner() {
        // 四个角应该在框内（包含边界）
        assert!(point_in_bbox(30.0, 120.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(32.0, 122.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(30.0, 122.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(32.0, 120.0, 30.0, 120.0, 32.0, 122.0));
    }

    #[test]
    fn test_point_in_bbox_on_edge() {
        // 在边上也应该在框内
        assert!(point_in_bbox(31.0, 120.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(31.0, 122.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(30.0, 121.0, 30.0, 120.0, 32.0, 122.0));
        assert!(point_in_bbox(32.0, 121.0, 30.0, 120.0, 32.0, 122.0));
    }

    #[test]
    fn test_point_in_bbox_just_outside() {
        // 刚好在框外
        assert!(!point_in_bbox(29.9, 121.0, 30.0, 120.0, 32.0, 122.0));
        assert!(!point_in_bbox(32.1, 121.0, 30.0, 120.0, 32.0, 122.0));
        assert!(!point_in_bbox(31.0, 119.9, 30.0, 120.0, 32.0, 122.0));
        assert!(!point_in_bbox(31.0, 122.1, 30.0, 120.0, 32.0, 122.0));
    }

    #[test]
    fn test_point_in_bbox_degenerate() {
        // 退化的框（点框）
        assert!(point_in_bbox(31.0, 121.0, 31.0, 121.0, 31.0, 121.0));
        assert!(!point_in_bbox(31.1, 121.0, 31.0, 121.0, 31.0, 121.0));
    }
}
