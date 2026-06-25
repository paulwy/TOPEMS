import * as React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { styled } from '@mui/material/styles';

export interface IconWrapperProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: number;
  sx?: React.CSSProperties;
}

export const IconWrapper = styled(
  React.forwardRef<SVGSVGElement, IconWrapperProps>(
    ({ icon: IconComponent, size = 24, sx, style, ...props }, ref) => {
      return (
        <IconComponent
          ref={ref as any}
          size={size}
          style={{
            width: sx?.width || size,
            height: sx?.height || size,
            ...sx,
            ...style,
          }}
          {...props}
        />
      );
    }
  )
)<IconWrapperProps>``;
