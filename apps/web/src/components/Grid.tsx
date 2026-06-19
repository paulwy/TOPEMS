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
  size?: number | GridSizeProps;
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
  // 支持 size 属性（MUI v7 风格）
  // size 可以是数字或对象
  let effectiveXs: number | undefined = xs;
  let effectiveSm: number | undefined = sm;
  let effectiveMd: number | undefined = md;
  let effectiveLg: number | undefined = lg;
  let effectiveXl: number | undefined = xl;

  if (size !== undefined) {
    if (typeof size === "number") {
      // size 是数字时，应用到 xs
      effectiveXs = size;
    } else {
      // size 是对象时，提取各个断点
      effectiveXs = size.xs ?? xs;
      effectiveSm = size.sm ?? sm;
      effectiveMd = size.md ?? md;
      effectiveLg = size.lg ?? lg;
      effectiveXl = size.xl ?? xl;
    }
  }

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

  const getWidth = (breakpoint: number | undefined) => {
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
