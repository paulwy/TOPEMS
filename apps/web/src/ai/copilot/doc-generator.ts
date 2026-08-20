
export interface DocTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  placeholders: string[];
}

export interface GenerateDocOptions {
  description?: string;
  params?: Array<{ name: string; type: string; description?: string }>;
  returns?: string;
  throws?: Array<{ type: string; description: string }>;
  deprecated?: boolean;
  seeAlso?: string[];
  examples?: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';
  description: string;
  author?: string;
}

export interface ReadmeSection {
  title: string;
  content: string;
}

type Formatter = (template: string, values: Record<string, string>) => string;

