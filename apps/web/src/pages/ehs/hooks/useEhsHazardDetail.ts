/**
 * @done V80 split
 * EHS Hazard detail page centralized state, queries, mutations, and handlers.
 *
 * Column definitions live in the consuming components (they need i18n + handlers).
 */
export interface ControlFormData {
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description: string;
  responsible: string;
  deadline: string;
}
