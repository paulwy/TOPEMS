import React, { useState, useCallback } from 'react';
import type { ModuleStatus } from './StatusBadge';
import { StatusBadge } from './StatusBadge';

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

export interface ModuleItem {
  title: string;
  icon: IconComponent;
  description: string;
  path: string;
  color: string;
  status: ModuleStatus;
  permission?: string | null;
  module?: string | null;
  adminOnly?: boolean;
}

interface ModuleCardProps {
  item: ModuleItem;
  onClick: () => void;
  size?: 'large' | 'medium' | 'small';
}

const colorToGradient: Record<string, string> = {
  'bg-blue-500': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'bg-purple-500': 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'bg-green-500': 'linear-gradient(135deg, #22c55e, #16a34a)',
  'bg-emerald-500': 'linear-gradient(135deg, #10b981, #059669)',
  'bg-rose-500': 'linear-gradient(135deg, #f43f5e, #e11d48)',
  'bg-slate-600': 'linear-gradient(135deg, #64748b, #475569)',
  'bg-violet-500': 'linear-gradient(135deg, #a855f7, #9333ea)',
  'bg-amber-500': 'linear-gradient(135deg, #f59e0b, #ca8a04)',
  'bg-teal-500': 'linear-gradient(135deg, #14b8a6, #0d9488)',
  'bg-yellow-500': 'linear-gradient(135deg, #eab308, #ca8a04)',
  'bg-indigo-500': 'linear-gradient(135deg, #6366f1, #4f46e5)',
  'bg-cyan-500': 'linear-gradient(135deg, #06b6d4, #0891b2)',
  'bg-orange-500': 'linear-gradient(135deg, #f97316, #ea580c)',
  'bg-red-500': 'linear-gradient(135deg, #ef4444, #dc2626)',
  'bg-sky-500': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
  'bg-pink-500': 'linear-gradient(135deg, #ec4899, #db2777)',
};

const colorToBgLight: Record<string, string> = {
  'bg-blue-500': '#eff6ff',
  'bg-purple-500': '#faf5ff',
  'bg-green-500': '#f0fdf4',
  'bg-emerald-500': '#ecfdf5',
  'bg-rose-500': '#fff1f2',
  'bg-slate-600': '#f8fafc',
  'bg-violet-500': '#f5f3ff',
  'bg-amber-500': '#fffbeb',
  'bg-teal-500': '#f0fdfa',
  'bg-yellow-500': '#fefce8',
  'bg-indigo-500': '#eef2ff',
  'bg-cyan-500': '#ecfeff',
  'bg-orange-500': '#fff7ed',
  'bg-red-500': '#fef2f2',
  'bg-sky-500': '#f0f9ff',
  'bg-pink-500': '#fdf2f8',
};

export const ModuleCard: React.FC<ModuleCardProps> = ({ item, onClick, size = 'medium' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const Icon = item.icon;

  const sizeStyles = {
    large: { padding: '24px', iconSize: 60, titleSize: 18, descSize: 14 },
    medium: { padding: '20px', iconSize: 52, titleSize: 16, descSize: 13 },
    small: { padding: '16px', iconSize: 44, titleSize: 14, descSize: 12 },
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      onClick={() => {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 150);
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: currentSize.padding,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px)' : isClicked ? 'scale(0.98)' : 'translateY(0)',
        boxShadow: isHovered ? '0 20px 40px rgba(0, 0, 0, 0.12)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.08)'}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background:
            item.status === 'online'
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : item.status === 'beta'
                ? 'linear-gradient(90deg, #f59e0b, #ca8a04)'
                : 'linear-gradient(90deg, #94a3b8, #64748b)',
          transition: 'opacity 0.3s ease',
          opacity: isHovered ? 1 : 0.6,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div
          style={{
            width: currentSize.iconSize,
            height: currentSize.iconSize,
            borderRadius: '16px',
            background: colorToGradient[item.color] || colorToGradient['bg-blue-500'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
            boxShadow: isHovered
              ? `0 8px 24px ${colorToGradient[item.color] || '#3b82f6'}40`
              : '0 4px 12px rgba(0,0,0,0.15)',
            animation: item.status === 'online' ? 'glow 2s ease-in-out infinite' : 'none',
          }}
        >
          <Icon
            style={{
              width: currentSize.iconSize * 0.55,
              height: currentSize.iconSize * 0.55,
              color: '#ffffff',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <h3
              style={{
                fontSize: currentSize.titleSize,
                fontWeight: 600,
                color: isHovered ? '#1d4ed8' : '#1e293b',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.2s ease',
              }}
            >
              {item.title}
            </h3>
            <StatusBadge status={item.status} />
          </div>
          <p
            style={{
              fontSize: currentSize.descSize,
              color: isHovered ? '#475569' : '#64748b',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 0.2s ease',
            }}
          >
            {item.description}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 8px 24px ${colorToGradient[item.color] || '#3b82f6'}60; }
        }
      `}</style>
    </div>
  );
};
