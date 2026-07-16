import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Line, Html } from '@react-three/drei';
import type * as THREE from 'three';
import type { DevicePoint, Pipeline, StorageLocation } from '../../api/gis';
import { X, RotateCcw, Maximize2 } from 'lucide-react';
import { Box as MuiBox, Typography, IconButton, Paper } from '@mui/material';

interface Map3DViewProps {
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
  onClose: () => void;
}

const POINT_RADIUS = 0.01;
const STORAGE_SIZE = 0.015;

function latLngToWorld(lat: number, lng: number, scale: number = 1): [number, number, number] {
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
      <Sphere
        ref={meshRef}
        args={[POINT_RADIUS, 16, 16]}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </Sphere>
      <Line
        points={[position, [position[0], position[1] + 0.05, position[2]]]}
        color='gray'
        lineWidth={1}
      />
      {hovered && (
        <Html
          position={[position[0], position[1] + 0.08, position[2]]}
          center
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{status}</div>
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
      <Box
        ref={meshRef}
        args={[STORAGE_SIZE, STORAGE_SIZE, STORAGE_SIZE]}
      >
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
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>仓储位置</div>
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
  return (
    <Line
      points={[start, end]}
      color='#6366F1'
      lineWidth={3}
    />
  );
}

function Globe() {
  return (
    <group>
      <Sphere args={[0.99, 64, 64]}>
        <meshStandardMaterial
          color='#1e3a5f'
          transparent
          opacity={0.3}
          wireframe
        />
      </Sphere>
      <Sphere args={[0.98, 64, 64]}>
        <meshStandardMaterial
          color='#2d5a87'
          transparent
          opacity={0.1}
        />
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
        color='rgba(255, 255, 255, 0.1)'
        lineWidth={1}
      />
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
        color='rgba(255, 255, 255, 0.1)'
        lineWidth={1}
      />
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
    if (s.includes('active') || s.includes('启用')) return '#00C897';
    if (s.includes('pending') || s.includes('待处理')) return 'warning.main';
    if (s.includes('inactive') || s.includes('禁用')) return 'error.main';
    return 'text.secondary';
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight
        position={[10, 10, 10]}
        intensity={1}
      />
      <pointLight
        position={[-10, -10, -10]}
        intensity={0.5}
      />

      <Globe />
      <GridLines />

      {pipelines.map((pipeline) => {
        if (pipeline.start_point && pipeline.end_point) {
          const start = latLngToWorld(pipeline.start_point[0], pipeline.start_point[1], 1.02);
          const end = latLngToWorld(pipeline.end_point[0], pipeline.end_point[1], 1.02);
          return (
            <PipelineLine
              key={pipeline.id}
              start={start}
              end={end}
            />
          );
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
          color='warning.main'
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
    <MuiBox
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MuiBox
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
          py: 3,
          background: 'linear-gradient(to right, primary.light, #9333ea)',
          color: 'white',
        }}
      >
        <Typography
          variant='subtitle1'
          sx={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Maximize2 size={20} />
          3D 视图
        </Typography>
        <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => setRotation([0, 0, 0])}
            sx={{
              p: 1,
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
            title='重置视角'
          >
            <RotateCcw size={16} />
          </IconButton>
          <IconButton
            onClick={onClose}
            sx={{
              p: 1,
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <X size={20} />
          </IconButton>
        </MuiBox>
      </MuiBox>

      <MuiBox
        sx={{
          flex: 1,
          position: 'relative',
          background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 100%)',
        }}
      >
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0, 2.5], fov: 60 }}
        >
          <Scene
            devicePoints={devicePoints}
            pipelines={pipelines}
            storageLocations={storageLocations}
          />
        </Canvas>

        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: 3,
            p: 4,
            color: 'white',
          }}
        >
          <MuiBox sx={{ fontSize: '0.75rem' }}>
            <Typography sx={{ fontWeight: 500, mb: 2 }}>3D 视图操作</Typography>
            <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <MuiBox
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'success.dark',
                }}
              />
              <Typography variant='caption'>设备点位</Typography>
            </MuiBox>
            <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <MuiBox
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 1,
                  bgcolor: 'warning.main',
                }}
              />
              <Typography variant='caption'>仓储位置</Typography>
            </MuiBox>
            <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MuiBox sx={{ width: 24, height: 2, bgcolor: 'primary.light' }} />
              <Typography variant='caption'>管线</Typography>
            </MuiBox>
            <MuiBox
              sx={{
                borderTop: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                pt: 2,
                mt: 2,
                color: 'grey.300',
              }}
            >
              <Typography variant='caption'>左键拖拽: 旋转视角</Typography>
              <Typography variant='caption'>滚轮: 缩放</Typography>
              <Typography variant='caption'>悬停: 查看详情</Typography>
            </MuiBox>
          </MuiBox>
        </Paper>

        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            bgcolor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: 3,
            p: 3,
            color: 'white',
          }}
        >
          <MuiBox sx={{ fontSize: '0.75rem' }}>
            <Typography sx={{ fontWeight: 500, mb: 1 }}>统计信息</Typography>
            <Typography variant='caption'>设备: {devicePoints.length}</Typography>
            <Typography variant='caption'>管线: {pipelines.length}</Typography>
            <Typography variant='caption'>仓储: {storageLocations.length}</Typography>
          </MuiBox>
        </Paper>
      </MuiBox>
    </MuiBox>
  );
};

export default Map3DView;
