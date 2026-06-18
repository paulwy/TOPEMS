import React from "react";
import { Button as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material";

export interface ButtonProps extends MuiButtonProps {
  type?: "button" | "submit" | "reset";
}

export const Button: React.FC<ButtonProps> = ({
  type = "button",
  ...props
}) => {
  return <MuiButton type={type} {...props} />;
};

export default Button;