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
export declare function AIHelperButton({ type, onClick, disabled, loading, label, size, variant, }: AIHelperButtonProps): import("react").JSX.Element;
