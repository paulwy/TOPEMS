import { useState, useCallback, useRef } from 'react';
import { aiApi } from '../api/ai';
import type {
  AIFeatureType,
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
} from '@/types/ai';
import type { AIGenerateRequest } from '../api/ai';

interface UseAIHelperOptions<T = unknown> {
  featureType: AIFeatureType;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseAIHelperReturn<T = unknown> {
  isLoading: boolean;
  error: Error | null;
  result: T | null;
  retryCount: number;
  generate: (prompt: string, options?: Partial<Omit<AIGenerateRequest, 'variables'>>) => Promise<string | null>;
  validate: (data: ValidateRequest) => Promise<ValidateResponse | null>;
  complete: (data: CompleteRequest) => Promise<CompleteResponse | null>;
  summarize: (data: SummarizeRequest) => Promise<SummarizeResponse | null>;
  chat: (query: string, conversationId?: string) => Promise<string | null>;
  clearError: () => void;
  reset: () => void;
  retry: () => Promise<void>;
}

export function useAIHelper<T = unknown>(options: UseAIHelperOptions<T>): UseAIHelperReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const lastOperationRef = useRef<
    (() => Promise<{ code: number; success: boolean; data: unknown; message: string }>) | null
  >(null);
  const maxRetries = options.maxRetries ?? 2;
  const retryDelay = options.retryDelay ?? 1000;

  const handleError = useCallback(
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setRetryCount(0);
    setIsLoading(false);
    lastOperationRef.current = null;
  }, []);

  const executeWithRetry = useCallback(
    async <R>(
      operation: () => Promise<{
        code: number;
        success: boolean;
        data: R;
        message: string;
      }>,
      successHandler: (data: R) => void
    ): Promise<R | null> => {
      lastOperationRef.current = operation;
      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await operation();

          if (response && response.code === 200 && response.data) {
            const data = response.data;
            setResult(data as unknown as T);
            successHandler(data);
            setRetryCount(0);
            setIsLoading(false);
            return data;
          }

          throw new Error(response.message || '请求失败');
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          setRetryCount(attempt + 1);

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      handleError(lastError);
      setIsLoading(false);
      return null;
    },
    [maxRetries, retryDelay, handleError]
  );

  const retry = useCallback(async () => {
    if (lastOperationRef.current && retryCount <= maxRetries) {
      await executeWithRetry(lastOperationRef.current, () => {});
    }
  }, [executeWithRetry, retryCount, maxRetries]);

  const generate = useCallback(
    async (prompt: string, generateOptions?: Partial<Omit<AIGenerateRequest, 'variables'>>) => {
      const operation = () =>
        aiApi.generate({
          variables: { prompt },
          outputformat: 'text',
          ...generateOptions,
        });

      const result = await executeWithRetry(operation, (data) => {
        options.onSuccess?.(data);
      });

      return result?.content ?? null;
    },
    [executeWithRetry, options]
  );

  const validate = useCallback(
    async (data: ValidateRequest) => {
      const operation = () => aiApi.validate(data);

      const result = await executeWithRetry(operation, (data) => {
        options.onSuccess?.(data);
      });

      return result as ValidateResponse | null;
    },
    [executeWithRetry, options]
  );

  const complete = useCallback(
    async (data: CompleteRequest) => {
      const operation = () => aiApi.complete(data);

      const result = await executeWithRetry(operation, (data) => {
        options.onSuccess?.(data);
      });

      return result as CompleteResponse | null;
    },
    [executeWithRetry, options]
  );

  const summarize = useCallback(
    async (data: SummarizeRequest) => {
      const operation = () => aiApi.summarize(data);

      const result = await executeWithRetry(operation, (data) => {
        options.onSuccess?.(data);
      });

      return result as SummarizeResponse | null;
    },
    [executeWithRetry, options]
  );

  const chat = useCallback(
    async (query: string, conversationId?: string) => {
      const operation = () =>
        aiApi.chat({
          query,
          conversation_id: conversationId,
        });

      const result = await executeWithRetry(operation, (data) => {
        options.onSuccess?.(data);
      });

      return result?.answer ?? null;
    },
    [executeWithRetry, options]
  );

  return {
    isLoading,
    error,
    result,
    retryCount,
    generate,
    validate,
    complete,
    summarize,
    chat,
    clearError,
    reset,
    retry,
  };
}
