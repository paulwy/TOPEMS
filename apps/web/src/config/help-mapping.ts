import i18n from '@/i18n';

export interface HelpMappingItem {
  guideId?: string;
  faqCategory?: string;
  title: string;
  description?: string;
}

export function findHelpByPath(path: string): HelpMappingItem | undefined {
  if (getHelpMapping()[path]) {
    return getHelpMapping()[path];
  }

  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const parentPath = `/${segments.join('/')}`;
    if (getHelpMapping()[parentPath]) {
      return getHelpMapping()[parentPath];
    }
    segments.pop();
  }

  return undefined;
}
