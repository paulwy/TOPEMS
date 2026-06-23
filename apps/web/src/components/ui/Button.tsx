import React from "react";
import { Button as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material";

export type { MuiButtonProps as ButtonProps };

export const Button: React.FC<MuiButtonProps> = ({
  type = "button",
  ...props
}) => {
  return <MuiButton type={type} {...props} />;
};

export default Button;