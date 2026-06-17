import React from "react";
export interface SearchSuggestion {
    id: string;
    label: string;
    description?: string;
    type?: "recent" | "suggestion" | "result";
    icon?: React.ReactNode;
}
export interface SearchInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    onClear?: () => void;
    placeholder?: string;
    suggestions?: SearchSuggestion[];
    recentSearches?: string[];
    showSuggestions?: boolean;
    onSuggestionClick?: (suggestion: SearchSuggestion) => void;
    loading?: boolean;
    debounceMs?: number;
    fullWidth?: boolean;
    size?: "small" | "medium";
}
export declare const SearchInput: React.FC<SearchInputProps>;
export default SearchInput;
