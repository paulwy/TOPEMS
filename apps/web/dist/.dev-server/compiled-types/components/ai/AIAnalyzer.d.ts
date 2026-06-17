export interface AIAnalyzerProps {
    isOpen: boolean;
    onClose: () => void;
    initialText?: string;
    onAnalysisComplete?: (_results: AnalysisResults) => void;
}
export interface AnalysisResults {
    sentiment?: SentimentResult;
    classification?: ClassificationResult;
    entities?: Entity[];
    keywords?: Keyword[];
}
export interface SentimentResult {
    sentiment: "positive" | "negative" | "neutral";
    confidence: number;
    details?: {
        positive_words?: string[];
        negative_words?: string[];
        emotional_intensity?: number;
    };
}
export interface ClassificationResult {
    category: string;
    confidence: number;
    all_categories?: Array<{
        category: string;
        score: number;
    }>;
}
export interface Entity {
    text: string;
    entity_type: string;
    start_pos?: number;
    end_pos?: number;
    confidence: number;
}
export interface Keyword {
    text: string;
    score: number;
    frequency: number;
}
export declare function AIAnalyzer({ isOpen, onClose, initialText, onAnalysisComplete, }: AIAnalyzerProps): import("react").JSX.Element;
