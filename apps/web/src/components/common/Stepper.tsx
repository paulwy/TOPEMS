import React from "react";
import {
  Stepper as MuiStepper,
  Step,
  StepLabel,
  Box,
  Typography,
  styled,
  keyframes,
} from "@mui/material";
import type { StepIconProps } from "@mui/material";
import { Check, AlertCircle } from "lucide-react";

// 脉冲动画
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
`;

// 自定义步骤图标容器
const StepIconContainer = styled("div")<{
  status: StepItem["status"];
  variant: StepperProps["variant"];
  active: boolean;
}>(({ theme, status, variant, active }) => {
  const getBackgroundColor = () => {
    if (status === "completed") {
      return variant === "gradient"
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : theme.palette.success.main;
    }
    if (status === "error") {
      return theme.palette.error.main;
    }
    if (status === "active") {
      return variant === "gradient"
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : theme.palette.primary.main;
    }
    return variant === "outlined" ? "transparent" : theme.palette.grey[300];
  };

  const getBorderColor = () => {
    if (status === "completed") return theme.palette.success.main;
    if (status === "error") return theme.palette.error.main;
    if (status === "active") return theme.palette.primary.main;
    return theme.palette.grey[400];
  };

  return {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: getBackgroundColor(),
    border: variant === "outlined" ? `2px solid ${getBorderColor()}` : "none",
    color:
      status === "pending"
        ? theme.palette.text.disabled
        : theme.palette.common.white,
    transition: "all 0.3s ease",
    animation: status === "active" ? `${pulse} 2s infinite` : "none",
    "& svg": {
      width: 20,
      height: 20,
    },
  };
});

// 步骤项接口
export interface StepItem {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: "pending" | "active" | "completed" | "error";
}

// Stepper 组件属性接口
export interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "outlined" | "gradient";
  showLabels?: boolean;
  showDescriptions?: boolean;
  onStepClick?: (step: number) => void;
}

// 自定义步骤图标组件
const CustomStepIcon: React.FC<
  StepIconProps & {
    status: StepItem["status"];
    variant: StepperProps["variant"];
    customIcon?: React.ReactNode;
  }
> = ({ status, variant, customIcon, active }) => {
  const renderIcon = () => {
    if (customIcon && status !== "completed" && status !== "error") {
      return customIcon;
    }
    if (status === "completed") {
      return <Check />;
    }
    if (status === "error") {
      return <AlertCircle />;
    }
    return null;
  };

  return (
    <StepIconContainer status={status} variant={variant} active={active}>
      {renderIcon()}
    </StepIconContainer>
  );
};

// 主 Stepper 组件
const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep,
  orientation = "horizontal",
  variant = "default",
  showLabels = true,
  showDescriptions = true,
  onStepClick,
}) => {
  return (
    <MuiStepper
      activeStep={activeStep}
      orientation={orientation}
      alternativeLabel={orientation === "horizontal"}
    >
      {steps.map((step, index) => {
        const status =
          step.status ||
          (index < activeStep
            ? "completed"
            : index === activeStep
              ? "active"
              : "pending");

        return (
          <Step key={index} completed={status === "completed"}>
            <StepLabel
              StepIconComponent={(props) => (
                <CustomStepIcon
                  {...props}
                  status={status}
                  variant={variant}
                  customIcon={step.icon}
                  active={status === "active"}
                />
              )}
              onClick={() => onStepClick?.(index)}
              sx={{
                cursor: onStepClick ? "pointer" : "default",
                "& .MuiStepLabel-label": {
                  mt: orientation === "horizontal" ? 1 : 0,
                },
              }}
            >
              {showLabels && (
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={status === "active" ? 600 : 400}
                    color={
                      status === "active"
                        ? "primary"
                        : status === "completed"
                          ? "success.main"
                          : status === "error"
                            ? "error.main"
                            : "text.disabled"
                    }
                  >
                    {step.label}
                  </Typography>
                  {showDescriptions && step.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5 }}
                    >
                      {step.description}
                    </Typography>
                  )}
                </Box>
              )}
            </StepLabel>
          </Step>
        );
      })}
    </MuiStepper>
  );
};

export default Stepper;
