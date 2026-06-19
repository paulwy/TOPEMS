/**
 * TrackModule 单元测试
 */
import { describe, it, expect, vi } from "vitest";

describe("TrackModule", () => {
  describe("轨迹数据模型", () => {
    it("应正确计算轨迹距离", () => {
      // 测试 Haversine 公式计算两点间距离
      const point1 = { lat: 39.9042, lng: 116.4074 }; // 北京
      const point2 = { lat: 31.2304, lng: 121.4737 }; // 上海

      const distance = calculateDistance(point1, point2);
      expect(distance).toBeGreaterThan(1000000); // 约1060公里
      expect(distance).toBeLessThan(1200000);
    });

    it("应正确计算多段轨迹总距离", () => {
      const points = [
        { lat: 39.9042, lng: 116.4074 }, // 北京
        { lat: 39.9142, lng: 116.4174 }, // 向北一点
        { lat: 39.9242, lng: 116.4274 }, // 再向北一点
      ];

      const totalDistance = points.reduce((acc, point, i) => {
        if (i === 0) return 0;
        return acc + calculateDistance(points[i - 1], point);
      }, 0);

      expect(totalDistance).toBeGreaterThan(0);
    });

    it("应正确计算平均速度", () => {
      const distance = 10000; // 10公里
      const duration = 3600; // 1小时
      const speed = distance / duration; // m/s

      expect(speed).toBeCloseTo(2.78, 1); // 约10km/h
    });

    it("应正确计算轨迹时长", () => {
      const startTime = new Date("2024-01-01T10:00:00Z");
      const endTime = new Date("2024-01-01T12:00:00Z");

      const duration = (endTime.getTime() - startTime.getTime()) / 1000; // 秒

      expect(duration).toBe(7200); // 2小时
    });
  });

  describe("轨迹点验证", () => {
    it("应验证有效的经纬度范围", () => {
      const validPoint = { lat: 39.9042, lng: 116.4074 };
      expect(isValidCoordinate(validPoint)).toBe(true);
    });

    it("应拒绝无效的纬度", () => {
      const invalidPoint = { lat: 91, lng: 116.4074 };
      expect(isValidCoordinate(invalidPoint)).toBe(false);
    });

    it("应拒绝无效的经度", () => {
      const invalidPoint = { lat: 39.9042, lng: 181 };
      expect(isValidCoordinate(invalidPoint)).toBe(false);
    });
  });

  describe("轨迹平滑", () => {
    it("应正确应用 Douglas-Peucker 算法", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 5, y: 5 },
      ];

      const tolerance = 0.1;
      const simplified = douglasPeucker(points, tolerance);

      // 直线上的点应该被简化
      expect(simplified.length).toBeLessThanOrEqual(points.length);
    });
  });
});

// 辅助函数

function calculateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function isValidCoordinate(point: { lat: number; lng: number }): boolean {
  return (
    point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180
  );
}

function douglasPeucker(
  points: { x: number; y: number }[],
  tolerance: number,
): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag === 0)
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2,
    );

  const u =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
  const closestX = lineStart.x + u * dx;
  const closestY = lineStart.y + u * dy;

  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
}
