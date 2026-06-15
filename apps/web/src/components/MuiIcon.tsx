import * as React from "react";
import { styled } from "@mui/material/styles";
import type { LucideIcon, LucideProps } from "lucide-react";

export interface MuiIconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon;
  size?: number;
}

export const MuiIcon = styled(
  React.forwardRef<SVGSVGElement, MuiIconProps>(
    ({ icon: Icon, size = 24, style, ...props }, ref) => (
      <Icon ref={ref as React.Ref<SVGSVGElement>} size={size} style={style} {...props} />
    )
  )
)<MuiIconProps>``;