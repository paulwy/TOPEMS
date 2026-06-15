import { Sparkles, Loader2 } from "lucide-react";
import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";

export interface AIHelperButtonProps {
  type: "generate" | "optimize" | "validate" | "complete";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

const typeLabels = {
  generate: "AI 生成",
  optimize: "AI 优化",
  validate: "AI 校验",
  complete: "AI 补全",
};

export function AIHelperButton({
  type,
  onClick,
  disabled = false,
  loading = false,
  label,
  size = "medium",
  variant = "contained",
}: AIHelperButtonProps) {
  const buttonLabel = label || typeLabels[type];

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      size={size}
      variant={variant}
    >
      {loading ? (
        <>
          <Loader2 style={{ width: 16, height: 16, marginRight: 8 }} className="animate-spin" />
          处理中...
        </>
      ) : (
        <>
          <Sparkles style={{ width: 16, height: 16, marginRight: 8 }} />
          {buttonLabel}
        </>
      )}
    </Button>
  );
}
