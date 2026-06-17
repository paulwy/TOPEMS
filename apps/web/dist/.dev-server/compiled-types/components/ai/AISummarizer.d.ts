import type { SummarizeRequest } from "@/types/ai";
export interface AISummarizerProps {
    isOpen: boolean;
    onClose: () => void;
    summarizeRequest: SummarizeRequest;
    onSummaryGenerated: (_summary: string) => void;
}
export declare function AISummarizer({ isOpen, onClose, summarizeRequest, onSummaryGenerated, }: AISummarizerProps): import("react").JSX.Element;
