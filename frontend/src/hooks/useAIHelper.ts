import { useState, useCallback } from 'react';
import { aiApi } from '../api/ai';
import type {
  AIFeatureType,
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
} from '../types/ai';

interface UseAIHelperOptions {
  featureType: AIFeatureType;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface UseAIHelperReturn<T = any> {
  isLoading: boolean;
  error: Error | null;
  result: T | null;
  generate: (prompt: string, options?: any) => Promise<string | null>;
  validate: (data: ValidateRequest) => Promise<ValidateResponse | null>;
  complete: (data: CompleteRequest) => Promise<CompleteResponse | null>;
  summarize: (data: SummarizeRequest) => Promise<SummarizeResponse | null>;
  clearError: () => void;
}

export function useAIHelper<T = any>(options: UseAIHelperOptions): UseAIHelperReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const handleError = useCallback((err: any) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    options.onError?.(error);
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generate = useCallback(async (prompt: string, generateOptions?: any) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await aiApi.generate({
        variables: { prompt },
        output_format: 'text',
        ...generateOptions,
      });
      if (response.code === 200 && response.data) {
        setResult(response.data as T);
        options.onSuccess?.(response.data);
        return response.data.content;
      }
      throw new Error(response.message || '生成失败');
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options, handleError]);

  const validate = useCallback(async (data: ValidateRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await aiApi.validate(data);
      if (response.code === 200 && response.data) {
        setResult(response.data as T);
        options.onSuccess?.(response.data);
        return response.data;
      }
      throw new Error(response.message || '校验失败');
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options, handleError]);

  const complete = useCallback(async (data: CompleteRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await aiApi.complete(data);
      if (response.code === 200 && response.data) {
        setResult(response.data as T);
        options.onSuccess?.(response.data);
        return response.data;
      }
      throw new Error(response.message || '补全失败');
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options, handleError]);

  const summarize = useCallback(async (data: SummarizeRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await aiApi.summarize(data);
      if (response.code === 200 && response.data) {
        setResult(response.data as T);
        options.onSuccess?.(response.data);
        return response.data;
      }
      throw new Error(response.message || '摘要生成失败');
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options, handleError]);

  return {
    isLoading,
    error,
    result,
    generate,
    validate,
    complete,
    summarize,
    clearError,
  };
}
