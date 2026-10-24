import type React from 'react';

export interface TrendLineProps extends React.SVGProps<SVGSVGElement> {
  data: number[];
  color?: string;
  area?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
}
