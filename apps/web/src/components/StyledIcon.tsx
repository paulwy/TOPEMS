import * as React from "react";
import { styled } from "@mui/material/styles";
import type { LucideIcon, LucideProps } from "lucide-react";

export interface StyledIconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon;
  size?: number;
}

export const StyledIcon = styled(
  React.forwardRef<SVGSVGElement, StyledIconProps>(
    ({ icon: Icon, size = 24, ...props }, ref) => (
      <Icon ref={ref as React.Ref<SVGSVGElement>} size={size} {...props} />
    ),
  ),
)<StyledIconProps>``;
