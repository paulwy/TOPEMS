import React from "react";
import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";

interface GridProps extends BoxProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  item?: boolean;
  container?: boolean;
  spacing?: number;
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
  sx,
  ...props
}) => {
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
    defaultVal: number = xs,
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
        width: item ? getWidth(xs) : undefined,
        "@media (min-width:600px)":
          sm !== undefined ? { width: getWidth(sm) } : undefined,
        "@media (min-width:900px)":
          md !== undefined ? { width: getWidth(md) } : undefined,
        "@media (min-width:1200px)":
          lg !== undefined ? { width: getWidth(lg) } : undefined,
        "@media (min-width:1536px)":
          xl !== undefined ? { width: getWidth(xl) } : undefined,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
