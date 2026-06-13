// modules/TrackModule/types.ts
export interface TrackPoint {
  position: [number, number]; // [lat, lng]
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
  total_distance: number; // 米
  avg_speed: number; // km/h
  max_speed: number; // km/h
  duration: number; // 秒
  point_count: number;
  start_time: string;
  end_time: string;
}
