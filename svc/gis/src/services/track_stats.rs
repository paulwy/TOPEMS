#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 轨迹位置点 - 用于计算
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackPoint {
    pub position: serde_json::Value, // [lng, lat] 或 {"lat": f64, "lng": f64}
    pub altitude: Option<f64>,
    pub speed: Option<f64>,         // m/s
    pub heading: Option<f64>,       // 度
    pub accuracy: Option<f64>,      // 米
    pub battery_level: Option<i32>, // 百分比
    pub timestamp: DateTime<Utc>,
}

/// 位置坐标
#[derive(Debug, Clone)]
pub struct GeoPosition {
    pub lat: f64,
    pub lng: f64,
}

impl GeoPosition {
    /// 使用 Haversine 公式计算两点之间的距离（米）
    pub fn haversine_distance(&self, other: &GeoPosition) -> f64 {
        const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

        let lat1_rad = self.lat.to_radians();
        let lat2_rad = other.lat.to_radians();
        let delta_lat = (other.lat - self.lat).to_radians();
        let delta_lng = (other.lng - self.lng).to_radians();

        let a = (delta_lat / 2.0).sin().powi(2)
            + lat1_rad.cos() * lat2_rad.cos() * (delta_lng / 2.0).sin().powi(2);
        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

        EARTH_RADIUS_METERS * c
    }
}

/// 轨迹统计计算器
pub struct TrackStatisticsCalculator;

impl TrackStatisticsCalculator {
    /// 计算轨迹统计信息
    pub fn calculate(points: &[TrackPoint]) -> Option<TrackStatistics> {
        if points.is_empty() {
            return None;
        }

        let point_count = points.len() as i32;
        let start_time = points.first().map(|p| p.timestamp)?;
        let end_time = points.last().map(|p| p.timestamp)?;

        // 计算总距离
        let total_distance = Self::calculate_total_distance(points);

        // 计算速度统计
        let speeds: Vec<f64> = points
            .iter()
            .filter_map(|p| p.speed)
            .map(|s| s * 3.6)
            .collect(); // m/s -> km/h
        let avg_speed = if speeds.is_empty() {
            0.0
        } else {
            speeds.iter().sum::<f64>() / speeds.len() as f64
        };
        let max_speed = speeds.iter().cloned().fold(0.0, f64::max);
        let min_speed = speeds.iter().cloned().fold(f64::MAX, f64::min);

        // 计算时长
        let total_duration = (end_time - start_time).num_seconds();

        Some(TrackStatistics {
            total_distance,
            avg_speed,
            max_speed,
            min_speed: if min_speed == f64::MAX {
                0.0
            } else {
                min_speed
            },
            total_duration,
            point_count,
            start_time,
            end_time,
        })
    }

    /// 计算轨迹总距离
    pub fn calculate_total_distance(points: &[TrackPoint]) -> f64 {
        if points.len() < 2 {
            return 0.0;
        }

        let mut total = 0.0;
        for i in 1..points.len() {
            let prev = &points[i - 1];
            let curr = &points[i];

            let pos1 = Self::parse_position(&prev.position);
            let pos2 = Self::parse_position(&curr.position);

            if let (Some(p1), Some(p2)) = (pos1, pos2) {
                total += p1.haversine_distance(&p2);
            }
        }
        total
    }

    /// 解析位置信息
    fn parse_position(position: &serde_json::Value) -> Option<GeoPosition> {
        if let Some(obj) = position.as_object() {
            let lat = obj.get("lat").and_then(|v| v.as_f64())?;
            let lng = obj.get("lng").and_then(|v| v.as_f64())?;
            return Some(GeoPosition { lat, lng });
        }

        if let Some(arr) = position.as_array() {
            if arr.len() >= 2 {
                let lng = arr[0].as_f64()?;
                let lat = arr[1].as_f64()?;
                return Some(GeoPosition { lat, lng });
            }
        }

        None
    }

    /// 使用 Douglas-Peucker 算法压缩轨迹
    pub fn compress_track(points: &[TrackPoint], epsilon: f64) -> Vec<TrackPoint> {
        if points.len() < 3 {
            return points.to_vec();
        }

        // 找到最远点
        let first = &points[0];
        let last = &points[points.len() - 1];

        let mut max_distance = 0.0;
        let mut max_index = 0;

        for (i, point) in points.iter().enumerate().skip(1) {
            let d = Self::perpendicular_distance(point, first, last);
            if d > max_distance {
                max_distance = d;
                max_index = i;
            }
        }

        if max_distance > epsilon && max_index > 0 && max_index < points.len() - 1 {
            // 递归压缩两侧
            let left = Self::compress_track(&points[..=max_index], epsilon);
            let right = Self::compress_track(&points[max_index..], epsilon);
            left.iter().chain(right.iter().skip(1)).cloned().collect()
        } else {
            // 只保留端点
            vec![first.clone(), last.clone()]
        }
    }

    /// 计算点到线段的垂直距离
    fn perpendicular_distance(
        point: &TrackPoint,
        line_start: &TrackPoint,
        line_end: &TrackPoint,
    ) -> f64 {
        let pos = match Self::parse_position(&point.position) {
            Some(p) => p,
            None => return 0.0,
        };
        let start = match Self::parse_position(&line_start.position) {
            Some(p) => p,
            None => return 0.0,
        };
        let end = match Self::parse_position(&line_end.position) {
            Some(p) => p,
            None => return 0.0,
        };

        let line_length = start.haversine_distance(&end);
        if line_length == 0.0 {
            return start.haversine_distance(&pos);
        }

        // 计算投影比例
        let dx = end.lng - start.lng;
        let dy = end.lat - start.lat;
        let t =
            ((pos.lng - start.lng) * dx + (pos.lat - start.lat) * dy) / (line_length * line_length);

        let projection = if t < 0.0 {
            start.clone()
        } else if t > 1.0 {
            end.clone()
        } else {
            GeoPosition {
                lat: start.lat + t * dy,
                lng: start.lng + t * dx,
            }
        };

        pos.haversine_distance(&projection)
    }
}

/// 轨迹统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackStatistics {
    pub total_distance: f64, // 米
    pub avg_speed: f64,      // km/h
    pub max_speed: f64,      // km/h
    pub min_speed: f64,      // km/h
    pub total_duration: i64, // 秒
    pub point_count: i32,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_position(lat: f64, lng: f64) -> serde_json::Value {
        serde_json::json!({
            "lat": lat,
            "lng": lng
        })
    }

    fn create_test_track_points() -> Vec<TrackPoint> {
        let base_time = DateTime::parse_from_rfc3339("2024-01-01T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        vec![
            TrackPoint {
                position: create_test_position(31.2304, 121.4737),
                altitude: Some(10.0),
                speed: Some(2.0), // 2 m/s = 7.2 km/h
                heading: Some(90.0),
                accuracy: Some(5.0),
                battery_level: Some(100),
                timestamp: base_time,
            },
            TrackPoint {
                position: create_test_position(31.2305, 121.4738),
                altitude: Some(11.0),
                speed: Some(3.0), // 3 m/s = 10.8 km/h
                heading: Some(95.0),
                accuracy: Some(5.0),
                battery_level: Some(99),
                timestamp: base_time + chrono::Duration::seconds(10),
            },
            TrackPoint {
                position: create_test_position(31.2306, 121.4739),
                altitude: Some(12.0),
                speed: Some(2.5), // 2.5 m/s = 9 km/h
                heading: Some(100.0),
                accuracy: Some(5.0),
                battery_level: Some(98),
                timestamp: base_time + chrono::Duration::seconds(20),
            },
        ]
    }

    #[test]
    fn test_geo_position_haversine_distance() {
        let shanghai = GeoPosition {
            lat: 31.2304,
            lng: 121.4737,
        };
        let beijing = GeoPosition {
            lat: 39.9042,
            lng: 116.4074,
        };

        let distance = shanghai.haversine_distance(&beijing);

        // 上海到北京约1068公里，允许10%误差
        assert!(distance > 1_000_000.0 && distance < 1_200_000.0);
    }

    #[test]
    fn test_calculate_statistics() {
        let points = create_test_track_points();
        let stats = TrackStatisticsCalculator::calculate(&points);

        assert!(stats.is_some());
        let stats = stats.unwrap();

        assert_eq!(stats.point_count, 3);
        assert!(stats.total_distance > 0.0);
        assert!(stats.avg_speed > 0.0);
        assert!(stats.max_speed >= stats.avg_speed);
        assert_eq!(stats.total_duration, 20);
    }

    #[test]
    fn test_calculate_total_distance() {
        let points = create_test_track_points();
        let distance = TrackStatisticsCalculator::calculate_total_distance(&points);

        // 3个点约20秒，距离应该在几十米范围内
        assert!(distance > 0.0 && distance < 1000.0);
    }

    #[test]
    fn test_calculate_statistics_empty() {
        let points: Vec<TrackPoint> = vec![];
        let stats = TrackStatisticsCalculator::calculate(&points);

        assert!(stats.is_none());
    }

    #[test]
    fn test_calculate_statistics_single_point() {
        let base_time = DateTime::parse_from_rfc3339("2024-01-01T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc);

        let points = vec![TrackPoint {
            position: create_test_position(31.2304, 121.4737),
            altitude: Some(10.0),
            speed: Some(2.0),
            heading: Some(90.0),
            accuracy: Some(5.0),
            battery_level: Some(100),
            timestamp: base_time,
        }];

        let stats = TrackStatisticsCalculator::calculate(&points);

        assert!(stats.is_some());
        let stats = stats.unwrap();

        assert_eq!(stats.point_count, 1);
        assert_eq!(stats.total_distance, 0.0);
        assert_eq!(stats.total_duration, 0);
    }

    #[test]
    fn test_compress_track() {
        let points = create_test_track_points();
        // 使用较大的epsilon值避免栈溢出
        let compressed = TrackStatisticsCalculator::compress_track(&points, 0.1);

        // Douglas-Peucker 应该减少点数
        assert!(compressed.len() <= points.len());
    }

    #[test]
    fn test_compress_track_short() {
        let points: Vec<TrackPoint> = vec![
            create_test_track_points()[0].clone(),
            create_test_track_points()[1].clone(),
        ];

        let compressed = TrackStatisticsCalculator::compress_track(&points, 0.00001);

        // 少于3个点应该保持不变
        assert_eq!(compressed.len(), 2);
    }

    #[test]
    fn test_position_json_format() {
        // 测试 {lat, lng} 格式
        let pos1 = serde_json::json!({"lat": 31.2304, "lng": 121.4737});
        let parsed = TrackStatisticsCalculator::parse_position(&pos1);
        assert!(parsed.is_some());
        let p = parsed.unwrap();
        assert_eq!(p.lat, 31.2304);
        assert_eq!(p.lng, 121.4737);

        // 测试 [lng, lat] 格式
        let pos2 = serde_json::json!([121.4737, 31.2304]);
        let parsed2 = TrackStatisticsCalculator::parse_position(&pos2);
        assert!(parsed2.is_some());
        let p2 = parsed2.unwrap();
        assert_eq!(p2.lat, 31.2304);
        assert_eq!(p2.lng, 121.4737);
    }
}
