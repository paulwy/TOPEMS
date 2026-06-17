import React from "react";
import type { BoxProps } from "@mui/material";
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
export declare const Grid: React.FC<React.PropsWithChildren<GridProps>>;
export {};
