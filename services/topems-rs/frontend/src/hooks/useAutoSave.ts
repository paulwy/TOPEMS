import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutoSaveOptions {
  delay?: number;
  onSave: (value: string) => Promise<void>;
  onError?: (error: Error) => void;
  onSaveSuccess?: () => void;
}

export const useAutoSave = (initialValue: string, options: AutoSaveOptions) => {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { delay = 1000, onSave, onError, onSaveSuccess } = options;
  
  const debounceRef = useRef<number | null>(null);
  const previousValueRef = useRef(initialValue);

  const handleSave = useCallback(async () => {
    if (!hasChanges || value === previousValueRef.current) return;
    
    setIsSaving(true);
    try {
      await onSave(value);
      previousValueRef.current = value;
      setLastSavedAt(new Date());
      setHasChanges(false);
      onSaveSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [value, hasChanges, onSave, onError, onSaveSuccess]);

  useEffect(() => {
    if (value !== previousValueRef.current) {
      setHasChanges(true);
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = window.setTimeout(() => {
      handleSave();
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, delay, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const manualSave = useCallback(async () => {
    if (!hasChanges) return;
    await handleSave();
  }, [hasChanges, handleSave]);

  const resetChanges = useCallback(() => {
    previousValueRef.current = value;
    setHasChanges(false);
  }, [value]);

  return {
    value,
    setValue,
    isSaving,
    hasChanges,
    lastSavedAt,
    manualSave,
    resetChanges,
  };
};

export interface AutoSaveIndicatorProps {
  isSaving: boolean;
  hasChanges: boolean;
  lastSavedAt: Date | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  hasChanges,
  lastSavedAt,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isSaving) {
    return (
      <span className="inline-flex items-center text-sm text-blue-600">
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        保存中...
      </span>
    );
  }

  if (hasChanges) {
    return (
      <span className="inline-flex items-center text-sm text-amber-600">
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        未保存
      </span>
    );
  }

  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center text-sm text-green-600">
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        已保存 {formatTime(lastSavedAt)}
      </span>
    );
  }

  return null;
};

export default useAutoSave;
