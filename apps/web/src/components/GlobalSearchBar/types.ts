import type { SearchResult } from '@/api/search';

export interface GroupedResults {
  service: string;
  module: string;
  label: string;
  results: SearchResult[];
}

export interface SearchFilter {
  service?: string;
  type?: string;
}

export interface SearchFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchResultListProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  onShortcutSelect: (text: string) => void;
  searchHistory: string[];
  onHistorySelect: (text: string) => void;
  onHistoryRemove: (text: string) => void;
  onHistoryClear: () => void;
  maxHeight?: number | string;
}

export interface SearchInputProps {
  query: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  showShortcut?: boolean;
  autoFocus?: boolean;
  filter?: SearchFilter;
  onFilterChange?: (filter: SearchFilter) => void;
  availableServices?: SearchFilterOption[];
  availableTypes?: SearchFilterOption[];
}

export interface SearchHistoryProps {
  history: string[];
  onSelect: (text: string) => void;
  onRemove: (text: string) => void;
  onClear: () => void;
}
