import React from "react";
export interface HelpButtonProps {
    /** 帮助标题 */
    title?: string;
    /** 帮助内容 */
    content: React.ReactNode;
    /** 按钮大小 */
    size?: "small" | "medium" | "large";
    /** 按钮提示文字 */
    tooltip?: string;
    /** 对话框最大宽度 */
    maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
    /** 是否禁用 */
    disabled?: boolean;
    /** 自定义图标 */
    icon?: React.ReactNode;
}
export declare const HelpButton: React.FC<HelpButtonProps>;
export default HelpButton;
