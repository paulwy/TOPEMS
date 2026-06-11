import React, { useState } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getChartColor } from './chartTheme';
import { CustomTooltip, formatPercent } from './CustomTooltip';

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  showLegend?: boolean;
  showLabel?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  animate?: boolean;
  donut?: boolean;
  labelType?: 'percent' | 'value' | 'name' | 'none';
  onPieClick?: (data: any) => void;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  showLabel = true,
  innerRadius = 0,
  outerRadius = 80,
  animate = true,
  donut = false,
  labelType = 'percent',
  onPieClick,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const actualInnerRadius = donut ? 50 : innerRadius;

  const getLabel = (props: { name?: string; percent?: number }) => {
    const { name = '', percent = 0 } = props;
    if (!showLabel || labelType === 'none') return undefined;
    if (labelType === 'percent') return `${name} ${(percent * 100).toFixed(0)}%`;
    if (labelType === 'value') return name;
    return name;
  };

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  const handleClick = (data: any) => {
    onPieClick?.(data);
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx='50%'
            cy='50%'
            labelLine={showLabel && labelType !== 'none'}
            label={getLabel}
            innerRadius={actualInnerRadius}
            outerRadius={outerRadius}
            dataKey='value'
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            cursor={onPieClick ? 'pointer' : 'default'}
            animationDuration={animate ? 1000 : 0}
            animationBegin={0}
          >
            {data.map((entry, index) => {
              const color = entry.color || getChartColor(index);
              const isActive = activeIndex === index;
              const scale = isActive ? 1.05 : 1;

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  stroke='#fff'
                  strokeWidth={2}
                  style={{
                    filter: isActive ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : 'none',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    transition: 'all 0.2s ease-out',
                  }}
                />
              );
            })}
          </Pie>
          <Tooltip
            content={<CustomTooltip formatter={(value) => [formatPercent((Number(value) / total) * 100), '']} />}
          />
          {showLegend && (
            <Legend
              layout='vertical'
              align='right'
              verticalAlign='middle'
              iconType='circle'
              iconSize={8}
              formatter={(value) => (
                <span className='text-sm text-slate-600'>{value}</span>
              )}
              wrapperStyle={{ paddingLeft: '20px' }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;
