import { useState, useCallback } from 'react';

export interface ValidationToast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface UseFormMiscOptions {
  storageKey?: string;
}

/**
 * FormPageTemplate 其他状态管理 hook
 * 管理验证提示、草稿、当前分组等状态
 */
export function useFormMisc(options: UseFormMiscOptions = {}) {
  const { storageKey = 'form-drafts' } = options;

  // ============ 验证提示 ============
  const [validationHint, setValidationHint] = useState<ValidationToast | null>(null);
  const [showHint, setShowHint] = useState(false);

  const showValidationHint = useCallback((toast: ValidationToast) => {
    setValidationHint(toast);
    setShowHint(true);
    setTimeout(() => {
      setShowHint(false);
    }, 3000);
  }, []);

  // ============ 草稿 ============
  const [drafts, setDrafts] = useState<Array<{ data: Record<string, unknown>; timestamp: number }>>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  const saveDraft = useCallback((key: string, data: Record<string, unknown>, maxDrafts?: number) => {
    setDrafts((prev) => {
      const next = [...prev, { data, timestamp: Date.now() }];
      // 限制最大草稿数
      const trimmed = maxDrafts ? next.slice(-maxDrafts) : next;
      try {
        localStorage.setItem(key, JSON.stringify(trimmed));
      } catch {
        // ignore
      }
      return trimmed;
    });
  }, []);

  const loadDraft = useCallback((index: number) => {
    const draft = drafts[index];
    return draft?.data;
  }, [drafts]);

  const deleteDraft = useCallback((index: number) => {
    setDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [storageKey]);

  // ============ 当前分组 ============
  const [currentGroup, setCurrentGroup] = useState<string>('all');

  return {
    // 验证提示
    validationHint,
    setValidationHint,
    showHint,
    setShowHint,
    showValidationHint,
    // 草稿
    drafts,
    setDrafts,
    showDraftDialog,
    setShowDraftDialog,
    saveDraft,
    loadDraft,
    deleteDraft,
    // 当前分组
    currentGroup,
    setCurrentGroup,
  };
}
