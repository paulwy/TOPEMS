import { useState, useCallback } from 'react';

export interface FormSectionLike {
  id: string;
  defaultExpanded?: boolean;
}

export interface UseFormSectionsOptions {
  sections: FormSectionLike[];
}

/**
 * FormPageTemplate 分组展开状态管理 hook
 */
export function useFormSections(options: UseFormSectionsOptions) {
  const { sections } = options;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(sections.filter((s) => s.defaultExpanded !== false).map((s) => s.id))
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(sections.map((s) => s.id)));
  }, [sections]);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  const isExpanded = useCallback(
    (sectionId: string) => expandedSections.has(sectionId),
    [expandedSections]
  );

  return {
    expandedSections,
    setExpandedSections,
    toggleSection,
    expandAll,
    collapseAll,
    isExpanded,
  };
}
