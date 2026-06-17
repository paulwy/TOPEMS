import type { TextOptimizeContext } from "@/types/ai";
export interface AITextOptimizerProps {
    isOpen: boolean;
    onClose: () => void;
    context: TextOptimizeContext;
    originalText: string;
    onOptimized: (_text: string) => void;
}
export declare function AITextOptimizer({ isOpen, onClose, context, originalText, onOptimized, }: AITextOptimizerProps): import("react").JSX.Element;
