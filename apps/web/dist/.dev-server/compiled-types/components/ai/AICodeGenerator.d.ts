import React from "react";
import type { CodeGenerateContext } from "@/types/ai";
export interface AICodeGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    context: CodeGenerateContext;
    onSelect: (_code: string) => void;
    existingCodes?: string[];
}
export declare function AICodeGenerator({ isOpen, onClose, context, onSelect, existingCodes, }: AICodeGeneratorProps): React.JSX.Element;
