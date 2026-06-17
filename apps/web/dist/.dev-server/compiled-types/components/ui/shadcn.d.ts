import React from "react";
import { SxProps, Theme } from "@mui/material";
declare const shadcnBase: {
    flexShrink: number;
};
export declare const CardTitle: React.FC<{
    children: React.ReactNode;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export declare const Label: React.FC<{
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export declare const Input: React.FC<{
    id?: string;
    type?: string;
    value?: string | number;
    defaultValue?: string | number;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style?: React.CSSProperties;
}>;
export declare const TabsList: React.FC<{
    children: React.ReactNode;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export declare const TabsTrigger: React.FC<{
    children: React.ReactNode;
    value: string;
    className?: string;
    active?: boolean;
    onClick?: () => void;
    sx?: SxProps<Theme>;
}>;
export declare const TabsContent: React.FC<{
    children: React.ReactNode;
    value: string;
    active?: boolean;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export declare const Progress: React.FC<{
    value?: number;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export declare const TableHeader: React.FC<{
    children: React.ReactNode;
    className?: string;
    sx?: SxProps<Theme>;
}>;
export { shadcnBase };
