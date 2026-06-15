import * as React from "react";
import { styled } from "@mui/material/styles";
import type { LucideIcon, LucideProps } from "lucide-react";

export interface IconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon;
  size?: number;
  sx?: React.CSSProperties;
}

export const Icon = styled(
  React.forwardRef<SVGSVGElement, IconProps>(
    ({ icon: IconComponent, size = 24, sx, style, ...props }, ref) => {
      return (
        <IconComponent
          ref={ref as React.Ref<SVGSVGElement>}
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
    },
  ),
)<IconProps>``;
