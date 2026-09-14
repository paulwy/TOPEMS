import React from 'react';

export interface TrendLineProps extends React.SVGProps<SVGSVGElement> {
  data: number[];
  color?: string;
  area?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export const TrendLine: React.FC<TrendLineProps> = ({
  data,
  color = 'var(--accent-primary)',
  area = false,
  width = 120,
  height = 32,
  strokeWidth = 2,
  ...rest
}) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      {...rest}
    >
      {area && (
        <path
          d={areaD}
          fill={color}
          fillOpacity={0.12}
        />
      )}
      <path
        d={pathD}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};
