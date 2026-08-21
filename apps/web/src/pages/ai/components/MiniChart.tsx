import React from 'react';

export const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  });

  return (
    <svg
      width='100%'
      height='40'
      viewBox='0 0 100 40'
    >
      <defs>
        <linearGradient
          id={`gradient-${color}`}
          x1='0%'
          y1='0%'
          x2='0%'
          y2='100%'
        >
          <stop
            offset='0%'
            stopColor={color}
            stopOpacity='0.3'
          />
          <stop
            offset='100%'
            stopColor={color}
            stopOpacity='0'
          />
        </linearGradient>
      </defs>
      <path
        d={`M ${points.join(' L ')} L 100,40 L 0,40 Z`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points.join(' ')}
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {data.map((_, index) => {
        const point = points[index].split(',');
        return (
          <circle
            key={index}
            cx={point[0]}
            cy={point[1]}
            r='3'
            fill='var(--color-primary-foreground)'
            stroke={color}
            strokeWidth='2'
          />
        );
      })}
    </svg>
  );
};
