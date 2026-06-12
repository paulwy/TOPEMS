import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Box, Line, Html } from "@react-three/drei";
import type * as THREE from "three";
import type { DevicePoint, Pipeline, StorageLocation } from "../../api/gis";
import { X, RotateCcw, Maximize2 } from "lucide-react";

interface Map3DViewProps {
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
  onClose: () => void;
}

const POINT_RADIUS = 0.01;
const STORAGE_SIZE = 0.015;

function latLngToWorld(
  lat: number,
  lng: number,
  scale: number = 1,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(scale * Math.sin(phi) * Math.cos(theta));
  const y = scale * Math.cos(phi);
  const z = scale * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

function DeviceMarker({
  position,
  name,
  status,
  color,
}: {
  position: [number, number, number];
  name: string;
  status: string;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[POINT_RADIUS, 16, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </Sphere>
      <Line
        points={[position, [position[0], position[1] + 0.05, position[2]]]}
        color="gray"
        lineWidth={1}
      />
      {hovered && (
        <Html
          position={[position[0], position[1] + 0.08, position[2]]}
          center
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-medium">{name}</div>
          <div className="text-xs opacity-75">{status}</div>
        </Html>
      )}
    </group>
  );
}

function StorageMarker({
  position,
  name,
  color,
}: {
  position: [number, number, number];
  name: string;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group>
      <Box ref={meshRef} args={[STORAGE_SIZE, STORAGE_SIZE, STORAGE_SIZE]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Box>
      {hovered && (
        <Html
          position={[position[0], position[1] + 0.05, position[2]]}
          center
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-medium">{name}</div>
          <div className="text-xs opacity-75">仓储位置</div>
        </Html>
      )}
    </group>
  );
}

function PipelineLine({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  return <Line points={[start, end]} color="#6366F1" lineWidth={3} />;
}

function Globe() {
  return (
    <group>
      <Sphere args={[0.99, 64, 64]}>
        <meshStandardMaterial
          color="#1e3a5f"
          transparent
          opacity={0.3}
          wireframe
        />
      </Sphere>
      <Sphere args={[0.98, 64, 64]}>
        <meshStandardMaterial color="#2d5a87" transparent opacity={0.1} />
      </Sphere>
    </group>
  );
}

function GridLines() {
  const lines = [];

  for (let lat = -80; lat <= 80; lat += 20) {
    const points: [number, number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      points.push(latLngToWorld(lat, lng, 1.01));
    }
    lines.push(
      <Line
        key={`lat-${lat}`}
        points={points}
        color="rgba(255, 255, 255, 0.1)"
        lineWidth={1}
      />,
    );
  }

  for (let lng = -180; lng <= 180; lng += 30) {
    const points: [number, number, number][] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      points.push(latLngToWorld(lat, lng, 1.01));
    }
    lines.push(
      <Line
        key={`lng-${lng}`}
        points={points}
        color="rgba(255, 255, 255, 0.1)"
        lineWidth={1}
      />,
    );
  }

  return <group>{lines}</group>;
}

function Scene({
  devicePoints,
  pipelines,
  storageLocations,
}: {
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
}) {
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("active") || s.includes("启用")) return "#00C897";
    if (s.includes("pending") || s.includes("待处理")) return "#F59E0B";
    if (s.includes("inactive") || s.includes("禁用")) return "#EF4444";
    return "#6b7280";
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <Globe />
      <GridLines />

      {pipelines.map((pipeline) => {
        if (pipeline.start_point && pipeline.end_point) {
          const start = latLngToWorld(
            pipeline.start_point[0],
            pipeline.start_point[1],
            1.02,
          );
          const end = latLngToWorld(
            pipeline.end_point[0],
            pipeline.end_point[1],
            1.02,
          );
          return <PipelineLine key={pipeline.id} start={start} end={end} />;
        }
        return null;
      })}

      {devicePoints.map((point) => (
        <DeviceMarker
          key={point.id}
          position={latLngToWorld(point.latitude, point.longitude, 1.02)}
          name={point.name}
          status={point.status}
          color={getStatusColor(point.status)}
        />
      ))}

      {storageLocations.map((location) => (
        <StorageMarker
          key={location.id}
          position={latLngToWorld(location.latitude, location.longitude, 1.02)}
          name={location.name}
          color="#F59E0B"
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={1.5}
        maxDistance={5}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

const Map3DView: React.FC<Map3DViewProps> = ({
  devicePoints,
  pipelines,
  storageLocations,
  onClose,
}) => {
  const [, setRotation] = useState([0, 0, 0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <Maximize2 className="w-5 h-5" />
          3D 视图
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation([0, 0, 0])}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="重置视角"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 2.5], fov: 60 }}
          style={{
            background: "linear-gradient(180deg, #0a1628 0%, #1a2a4a 100%)",
          }}
        >
          <Scene
            devicePoints={devicePoints}
            pipelines={pipelines}
            storageLocations={storageLocations}
          />
        </Canvas>

        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur rounded-lg p-4 text-white">
          <div className="text-xs space-y-2">
            <div className="font-medium mb-2">3D 视图操作</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>设备点位</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>仓储位置</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-indigo-500" />
              <span>管线</span>
            </div>
            <div className="border-t border-white/20 pt-2 mt-2 text-gray-300">
              <div>左键拖拽: 旋转视角</div>
              <div>滚轮: 缩放</div>
              <div>悬停: 查看详情</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur rounded-lg p-3 text-white">
          <div className="text-xs">
            <div className="font-medium mb-1">统计信息</div>
            <div>设备: {devicePoints.length}</div>
            <div>管线: {pipelines.length}</div>
            <div>仓储: {storageLocations.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map3DView;
