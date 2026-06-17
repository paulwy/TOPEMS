import React from "react";
import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";

interface GridSizeProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

interface GridProps extends BoxProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  item?: boolean;
  container?: boolean;
  spacing?: number;
  size?: GridSizeProps;
}

export const Grid: React.FC<React.PropsWithChildren<GridProps>> = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  item = true,
  container = false,
  spacing = 0,
  size,
  sx,
  ...props
}) => {
  // 支持 size 属性（Grid2 风格）
  const effectiveXs = size?.xs ?? xs;
  const effectiveSm = size?.sm ?? sm;
  const effectiveMd = size?.md ?? md;
  const effectiveLg = size?.lg ?? lg;
  const effectiveXl = size?.xl ?? xl;

  if (container) {
    return (
      <Box
        {...props}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: spacing * 8,
          ...sx,
        }}
      >
        {children}
      </Box>
    );
  }

  const getWidth = (
    breakpoint: number | undefined,
    defaultVal: number = effectiveXs,
  ) => {
    if (breakpoint === undefined) return undefined;
    return `${(breakpoint / 12) * 100}%`;
  };

  return (
    <Box
      {...props}
      sx={{
        boxSizing: "border-box",
        flex: item ? `0 0 auto` : undefined,
        width: item ? getWidth(effectiveXs) : undefined,
        "@media (min-width:600px)":
          effectiveSm !== undefined
            ? { width: getWidth(effectiveSm) }
            : undefined,
        "@media (min-width:900px)":
          effectiveMd !== undefined
            ? { width: getWidth(effectiveMd) }
            : undefined,
        "@media (min-width:1200px)":
          effectiveLg !== undefined
            ? { width: getWidth(effectiveLg) }
            : undefined,
        "@media (min-width:1536px)":
          effectiveXl !== undefined
            ? { width: getWidth(effectiveXl) }
            : undefined,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
