import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchApi, type SearchResult } from '@/api/search';
import {
  loadSearchHistory,
  saveSearchHistory,
  MAX_HISTORY_ITEMS,
  fuzzySearch,
  filterResults,
  getAvailableServices,
  getAvailableTypes,
} from '../components/GlobalSearchBar/utils';
import { type SearchFilter, type SearchFilterOption } from '../components/GlobalSearchBar/types';
import { SEARCH_SHORTCUTS, matchShortcut } from './shortcuts';

interface UseGlobalSearchOptions {
  debounceMs?: number;
  maxResults?: number;
}

interface UseGlobalSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: SearchResult[];
  loading: boolean;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  searchHistory: string[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchRef: React.RefObject<HTMLDivElement | null>;
  handleResultClick: (result: SearchResult) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleFocus: () => void;
  addToHistory: (text: string) => void;
  removeFromHistory: (text: string) => void;
  clearHistory: () => void;
  filter: SearchFilter;
  setFilter: React.Dispatch<React.SetStateAction<SearchFilter>>;
  availableServices: SearchFilterOption[];
  availableTypes: SearchFilterOption[];
}

function useSearchShortcuts({
  open,
  setOpen,
  setQuery,
  inputRef,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuery: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  useEffect(() => {
    const isInputFocused = () => {
      const activeElement = document.activeElement as HTMLElement | null;
      return (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable
      );
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (matchShortcut(e, SEARCH_SHORTCUTS.OPEN)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (matchShortcut(e, SEARCH_SHORTCUTS.CLOSE)) {
        if (open) {
          e.preventDefault();
          setOpen(false);
          setQuery('');
        }
      } else if (matchShortcut(e, SEARCH_SHORTCUTS.FOCUS_SEARCH) && !open && !isInputFocused()) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, setOpen, setQuery, inputRef]);
}

export function useGlobalSearch(
  navigate: (path: string) => void,
  options: UseGlobalSearchOptions = {}
): UseGlobalSearchReturn {
  const { debounceMs = 300, maxResults = 10 } = options;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState<SearchFilter>({ service: undefined, type: undefined });

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useSearchShortcuts({ open, setOpen, setQuery, inputRef });

  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const addToHistory = useCallback((text: string) => {
    if (!text.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== text);
      const updated = [text, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveSearchHistory(updated);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((text: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== text);
      saveSearchHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    saveSearchHistory([]);
  }, []);

  const executeSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setRawResults([]);
        setLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      try {
        const response = await searchApi.globalSearch(q, maxResults, controller.signal);
        if (response.success && response.data) {
          setRawResults(response.data.results);
        } else {
          setRawResults([]);
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }
        setRawResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [maxResults]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executeSearch(query), debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, executeSearch, debounceMs]);

  useEffect(() => {
    if (query) {
      setSelectedIndex(-1);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [filter]);

  const results = useMemo(() => {
    let filtered = filterResults(rawResults, filter);
    if (query.trim()) {
      filtered = fuzzySearch(filtered, query);
    }
    return filtered;
  }, [rawResults, filter, query]);

  const availableServices = useMemo<SearchFilterOption[]>(() => {
    return getAvailableServices(rawResults);
  }, [rawResults]);

  const availableTypes = useMemo<SearchFilterOption[]>(() => {
    const filteredByService = filter.service
      ? rawResults.filter((r) => r.service === filter.service)
      : rawResults;
    return getAvailableTypes(filteredByService);
  }, [rawResults, filter.service]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      addToHistory(query);
      navigate(result.url);
      setOpen(false);
      setQuery('');
    },
    [query, navigate, addToHistory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (matchShortcut(e, SEARCH_SHORTCUTS.NAVIGATE_DOWN)) {
        if (!open || results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev + 1;
          return next >= results.length ? 0 : next;
        });
      } else if (matchShortcut(e, SEARCH_SHORTCUTS.NAVIGATE_UP)) {
        if (!open || results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? results.length - 1 : next;
        });
      } else if (matchShortcut(e, SEARCH_SHORTCUTS.GO_TO_FIRST)) {
        if (!open || results.length === 0) return;
        e.preventDefault();
        setSelectedIndex(0);
      } else if (matchShortcut(e, SEARCH_SHORTCUTS.GO_TO_LAST)) {
        if (!open || results.length === 0) return;
        e.preventDefault();
        setSelectedIndex(results.length - 1);
      } else if (
        matchShortcut(e, SEARCH_SHORTCUTS.SELECT) &&
        selectedIndex >= 0 &&
        results[selectedIndex]
      ) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    },
    [open, results, selectedIndex, handleResultClick]
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    selectedIndex,
    setSelectedIndex,
    searchHistory,
    open,
    setOpen,
    inputRef,
    searchRef,
    handleResultClick,
    handleKeyDown,
    handleFocus,
    addToHistory,
    removeFromHistory,
    clearHistory,
    filter,
    setFilter,
    availableServices,
    availableTypes,
  };
}
