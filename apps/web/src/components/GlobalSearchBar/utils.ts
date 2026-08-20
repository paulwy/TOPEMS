import type { SearchResult } from '@/api/search';
import type { GroupedResults, SearchFilter, SearchFilterOption } from './types';
import type { Theme } from '@mui/material/styles';
import i18n from '@/i18n';

const SEARCH_HISTORY_KEY = 'topems_search_history';
export const MAX_HISTORY_ITEMS = 10;

const serviceLabels: Record<string, string> = {
  erp: i18n.t('components.utils.erp_0'),
  crm: i18n.t('components.utils.k1'),
  bi: i18n.t('components.utils.k2'),
  notification: i18n.t('components.utils.k3'),
  doc: i18n.t('components.utils.k4'),
  hrm: i18n.t('components.utils.k5'),
  workflow: i18n.t('components.utils.k6'),
  mes: i18n.t('components.utils.k7'),
};

export const typeLabels: Record<string, string> = {
  user: i18n.t('components.utils.k8'),
  role: i18n.t('components.utils.k9'),
  permission: i18n.t('components.utils.k10'),
  customer: i18n.t('components.utils.k11'),
  contract: i18n.t('components.utils.k12'),
  order: i18n.t('components.utils.k13'),
  purchase: i18n.t('components.utils.k14'),
  product: i18n.t('components.utils.k15'),
  category: i18n.t('components.utils.k16'),
  inventory: i18n.t('components.utils.k17'),
  document: i18n.t('components.utils.k18'),
  report: i18n.t('components.utils.k19'),
  setting: i18n.t('components.utils.k20'),
  log: i18n.t('components.utils.k21'),
  task: i18n.t('components.utils.k22'),
  notification: i18n.t('components.utils.k23'),
};

const searchSuggestions = [
  i18n.t('components.utils.k24'),
  i18n.t('components.utils.k25'),
  i18n.t('components.utils.k26'),
  i18n.t('components.utils.k27'),
  i18n.t('components.utils.k28'),
  i18n.t('components.utils.k29'),
  i18n.t('components.utils.k30'),
  i18n.t('components.utils.k31'),
  i18n.t('components.utils.k32'),
  i18n.t('components.utils.k33'),
  i18n.t('components.utils.k34'),
  i18n.t('components.utils.k35'),
  i18n.t('components.utils.k36'),
  i18n.t('components.utils.k37'),
  i18n.t('components.utils.k38'),
  i18n.t('components.utils.k39'),
  i18n.t('components.utils.k40'),
  i18n.t('components.utils.k41'),
  i18n.t('components.utils.k42'),
  i18n.t('components.utils.k43'),
  i18n.t('components.utils.k44'),
  i18n.t('components.utils.k45'),
  i18n.t('components.utils.k46'),
  i18n.t('components.utils.k47'),
  i18n.t('components.utils.k48'),
  i18n.t('components.utils.k49'),
  i18n.t('components.utils.k50'),
  i18n.t('components.utils.k51'),
  i18n.t('components.utils.k52'),
  i18n.t('components.utils.k53'),
  i18n.t('components.utils.k54'),
  i18n.t('components.utils.k55'),
  i18n.t('components.utils.k56'),
  i18n.t('components.utils.k57'),
  i18n.t('components.utils.k58'),
  i18n.t('components.utils.k59'),
  i18n.t('components.utils.k60'),
  i18n.t('components.utils.k61'),
  i18n.t('components.utils.k62'),
];

const getServiceLabel = (service: string) => {
  return serviceLabels[service] || service;
};

const getServiceColor = (service: string, theme: Theme) => {
  const colors: Record<string, string> = {
    erp: theme.palette.primary.main,
    crm: theme.palette.success.main,
    bi: theme.palette.warning.main,
    doc: theme.palette.info.main,
    hrm: theme.palette.secondary.main,
    workflow: theme.palette.error.main,
    mes: theme.palette.primary.dark,
    notification: theme.palette.info.dark,
  };
  return colors[service] || theme.palette.text.secondary;
};

export const getModuleColor = (module: string, theme: Theme) => {
  return getServiceColor(module, theme);
};

const groupResultsByService = (results: SearchResult[]): GroupedResults[] => {
  const groups = new Map<string, SearchResult[]>();
  results.forEach((result) => {
    if (!groups.has(result.service)) {
      groups.set(result.service, []);
    }
    groups.get(result.service)!.push(result);
  });
  return Array.from(groups.entries()).map(([service, results]) => ({
    service,
    module: service,
    label: getServiceLabel(service),
    results,
  }));
};

export const groupResultsByModule = (results: SearchResult[]): GroupedResults[] => {
  return groupResultsByService(results);
};

export const loadSearchHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveSearchHistory = (history: string[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
};

export const getSearchSuggestions = (query: string, limit = 6): string[] => {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return searchSuggestions.filter((s) => s.toLowerCase().includes(lowerQuery)).slice(0, limit);
};

const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const queryChars = lowerQuery.split('');
  let currentIndex = 0;

  for (const char of lowerText) {
    if (currentIndex < queryChars.length && char === queryChars[currentIndex]) {
      currentIndex++;
    }
  }

  return currentIndex === queryChars.length;
};

export const fuzzySearch = (results: SearchResult[], query: string): SearchResult[] => {
  if (!query.trim()) return results;

  return results.filter((result) => {
    const searchText = `${result.title} ${result.summary || ''} ${result.result_type || ''}`;
    return fuzzyMatch(searchText, query);
  });
};

export const filterResults = (results: SearchResult[], filter: SearchFilter): SearchResult[] => {
  return results.filter((result) => {
    if (filter.service && result.service !== filter.service) return false;
    if (filter.type && result.result_type !== filter.type) return false;
    return true;
  });
};

export const getAvailableServices = (results: SearchResult[]): SearchFilterOption[] => {
  const serviceCounts = new Map<string, number>();
  results.forEach((result) => {
    serviceCounts.set(result.service, (serviceCounts.get(result.service) || 0) + 1);
  });
  return Array.from(serviceCounts.entries()).map(([value, count]) => ({
    value,
    label: getServiceLabel(value),
    count,
  }));
};

export const getAvailableTypes = (results: SearchResult[]): SearchFilterOption[] => {
  const typeCounts = new Map<string, number>();
  results.forEach((result) => {
    const type = result.result_type || result.service;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });
  return Array.from(typeCounts.entries()).map(([value, count]) => ({
    value,
    label: typeLabels[value] || value,
    count,
  }));
};
