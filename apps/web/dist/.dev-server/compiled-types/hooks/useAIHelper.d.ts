import type { AIFeatureType, ValidateRequest, ValidateResponse, CompleteRequest, CompleteResponse, SummarizeRequest, SummarizeResponse } from "@/types/ai";
interface UseAIHelperOptions {
    featureType: AIFeatureType;
    onSuccess?: (result: any) => void;
    onError?: (error: Error) => void;
    maxRetries?: number;
    retryDelay?: number;
}
interface UseAIHelperReturn<T = any> {
    isLoading: boolean;
    error: Error | null;
    result: T | null;
    retryCount: number;
    generate: (prompt: string, options?: any) => Promise<string | null>;
    validate: (data: ValidateRequest) => Promise<ValidateResponse | null>;
    complete: (data: CompleteRequest) => Promise<CompleteResponse | null>;
    summarize: (data: SummarizeRequest) => Promise<SummarizeResponse | null>;
    chat: (query: string, conversationId?: string) => Promise<string | null>;
    clearError: () => void;
    reset: () => void;
    retry: () => Promise<void>;
}
export declare function useAIHelper<T = any>(options: UseAIHelperOptions): UseAIHelperReturn<T>;
export {};
